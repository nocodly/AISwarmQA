import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AIProviderError, MockBrowserDecisionProvider, createBrowserDecisionProvider } from "@ai-swarm-qa/ai";
import type { BrowserAgentDecisionResult, BrowserDecisionProvider, MockBrowserAgentScenario } from "@ai-swarm-qa/ai";
import type { RuntimeConfig } from "@ai-swarm-qa/config";
import {
  completeBrowserAgentRun,
  persistBrowserAgentStep,
  upsertBrowserAgentRun,
  type PersistableFinding
} from "@ai-swarm-qa/database";
import {
  browserAgentActionSchema,
  browserAgentProgressFingerprint,
  browserAgentTools,
  classifyBrowserTargetRisk,
  createFindingFingerprint,
  resolveSameOriginBrowserUrl,
  sanitizeBrowserObservation,
  syntheticBrowserValue,
  truncateText,
  type BrowserAgentAction,
  type BrowserAgentBudgetConfig,
  type BrowserAgentDecisionInput,
  type BrowserAgentRunStatus,
  type BrowserAgentSafetyCode,
  type BrowserAgentTerminalReason,
  type BrowserPageObservation,
  type BrowserTarget,
  type MissionDefinition,
  type MissionType
} from "@ai-swarm-qa/shared";
import type { Browser, Page } from "playwright";

export type AutonomousMissionContext = {
  auditId: string;
  missionId: string;
  missionType: MissionType;
  targetUrl: string;
  definition: MissionDefinition;
  page: Page;
  browser: Browser;
  artifactDir: string;
};

export type AutonomousMissionResult = {
  runId?: string;
  summary: string;
  observations: number;
  findings: PersistableFinding[];
  metrics: Record<string, number>;
};

export type AutonomousBrowserRunOptions = {
  swarmAgentId?: string | null;
  objective?: string;
  mockScenario?: MockBrowserAgentScenario;
  maxSteps?: number;
};

type SafetyDecision =
  | { allowed: true; normalizedAction: BrowserAgentAction; warnings: string[] }
  | { allowed: false; code: BrowserAgentSafetyCode; reason: string };

type ToolExecutionResult = {
  status: "succeeded" | "failed" | "rejected";
  summary: string;
  urlBefore: string;
  urlAfter: string;
  stateChanged: boolean;
  evidenceIds: string[];
  metrics: Record<string, number>;
};

type TargetRecord = BrowserTarget & {
  selector: string;
};

type BrowserEvents = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  httpErrors: Array<{ url: string; status: number }>;
};

const targetAttribute = "data-ai-swarm-qa-target";

function budgetConfig(config: RuntimeConfig): BrowserAgentBudgetConfig {
  return {
    maxSteps: config.autonomousMaxSteps,
    maxProviderCalls: config.autonomousMaxProviderCalls,
    maxNavigations: config.autonomousMaxNavigations,
    maxClicks: config.autonomousMaxClicks,
    maxFormFills: config.autonomousMaxFormFills,
    maxScreenshots: config.autonomousMaxScreenshots,
    missionTimeoutMs: config.autonomousMissionTimeoutMs,
    stepTimeoutMs: config.autonomousStepTimeoutMs,
    idleWaitMs: config.autonomousIdleWaitMs,
    maxInputTokens: config.autonomousMaxInputTokens,
    maxOutputTokens: config.autonomousMaxOutputTokens,
    maxEstimatedCostUsd: config.autonomousMaxEstimatedCostUsd,
    maxDomElements: config.autonomousMaxDomElements,
    maxVisibleTextChars: config.autonomousMaxVisibleTextChars,
    maxHistoryStepsInContext: config.autonomousMaxHistoryStepsInContext,
    maxConsecutiveRejections: config.autonomousMaxConsecutiveRejections,
    maxNoProgressSteps: config.autonomousMaxNoProgressSteps,
    allowFormFill: config.autonomousAllowFormFill,
    allowSafeFormSubmit: config.autonomousAllowSafeFormSubmit,
    allowExternalNavigation: config.autonomousAllowExternalNavigation
  };
}

function providerRuntimeOptions(config: RuntimeConfig) {
  return {
    aiProvider: config.aiProvider,
    apiKey: config.anthropicApiKey,
    defaultModel: config.anthropicModel,
    maxAttempts: config.aiProviderMaxAttempts,
    initialBackoffMs: config.aiProviderInitialBackoffMs,
    timeoutMs: Math.min(config.aiProviderTimeoutMs, config.autonomousStepTimeoutMs),
    fallbackToMock: config.aiProviderFallbackToMock
  };
}

function logProviderRequest(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", event, ...fields }));
}

async function decideWithFallback(input: {
  provider: BrowserDecisionProvider;
  fallbackProvider: MockBrowserDecisionProvider;
  decisionInput: BrowserAgentDecisionInput;
  fallbackEnabled: boolean;
}): Promise<{ decision: BrowserAgentDecisionResult; usedFallback: boolean; primaryError?: AIProviderError }> {
  try {
    return { decision: await input.provider.decide(input.decisionInput), usedFallback: false };
  } catch (error) {
    const normalized =
      error instanceof AIProviderError ? error : new AIProviderError("INVALID_RESPONSE", error instanceof Error ? error.message : "Provider returned an invalid Browser Agent action.");
    if (!input.fallbackEnabled) {
      throw normalized;
    }
    return { decision: await input.fallbackProvider.decide(input.decisionInput), usedFallback: true, primaryError: normalized };
  }
}

function attachEventCollectors(page: Page): BrowserEvents {
  const events: BrowserEvents = { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") {
      events.consoleErrors.push(truncateText(message.text(), 260));
    }
  });
  page.on("pageerror", (error) => {
    events.pageErrors.push(truncateText(error.message, 260));
  });
  page.on("requestfailed", (request) => {
    events.failedRequests.push(truncateText(request.url(), 260));
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      events.httpErrors.push({ url: truncateText(response.url(), 500), status: response.status() });
    }
  });
  return events;
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function assertCurrentOrigin(pageUrl: string, targetUrl: string) {
  const current = new URL(pageUrl);
  const target = new URL(targetUrl);
  if (current.origin !== target.origin) {
    throw new Error("EXTERNAL_NAVIGATION_BLOCKED");
  }
}

async function observePage(input: {
  context: AutonomousMissionContext;
  sequence: number;
  limits: BrowserAgentBudgetConfig;
  remaining: BrowserPageObservation["limitsRemaining"];
  events: BrowserEvents;
  runId: string;
  captureScreenshot: boolean;
}): Promise<{ observation: BrowserPageObservation; targetMap: Map<string, TargetRecord>; screenshotUsed: boolean }> {
  assertCurrentOrigin(input.context.page.url(), input.context.targetUrl);
  let screenshot: BrowserPageObservation["screenshot"] | undefined;
  if (input.captureScreenshot && input.remaining.screenshots > 0) {
    const evidenceId = `step-${input.sequence}-observation-screenshot`;
    const path = join(input.context.artifactDir, "agent-runs", input.runId, "steps", `${String(input.sequence).padStart(3, "0")}-observation.png`);
    await mkdir(join(input.context.artifactDir, "agent-runs", input.runId, "steps"), { recursive: true });
    await input.context.page.screenshot({ path, fullPage: false });
    screenshot = { evidenceId, path };
  }

  const raw = (await input.context.page.evaluate(String.raw`(() => {
    const attribute = "data-ai-swarm-qa-target";
    const text = (value) => (value || "").replace(/\s+/g, " ").trim();
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element) => {
      const aria = element.getAttribute("aria-label") || element.getAttribute("title");
      if (aria) return text(aria);
      const id = element.getAttribute("id");
      if (id) {
        const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (label && label.textContent) return text(label.textContent);
      }
      const wrapping = element.closest("label");
      return text((wrapping && wrapping.textContent) || element.textContent);
    };
    document.querySelectorAll("[" + attribute + "]").forEach((element) => element.removeAttribute(attribute));
    const interactive = Array.from(document.querySelectorAll("a[href],button,[role='button'],input,textarea,select"));
    const targets = interactive
      .filter(isVisible)
      .slice(0, 120)
      .map((element, index) => {
        const id = "element-" + (index + 1);
        element.setAttribute(attribute, id);
        const rect = element.getBoundingClientRect();
        return {
          id,
          tagName: element.tagName.toLowerCase(),
          role: element.getAttribute("role"),
          type: element.type || null,
          text: text(element.textContent || element.value || element.placeholder || null) || null,
          accessibleName: accessibleName(element) || null,
          href: element.href || null,
          disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true"),
          visible: true,
          inViewport: rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth
        };
      });
    const forms = Array.from(document.querySelectorAll("form")).slice(0, 20).map((form, index) => ({
      id: "form-" + (index + 1),
      targetIds: Array.from(form.querySelectorAll("[" + attribute + "]")).map((element) => element.getAttribute(attribute)).filter(Boolean),
      method: form.getAttribute("method"),
      action: form.action || null
    }));
    const visibleText = text(document.body && document.body.innerText);
    return {
      url: window.location.href,
      title: text(document.title) || null,
      loading: document.readyState !== "complete",
      hasDialog: Boolean(document.querySelector('[role="dialog"],dialog')),
      hasForm: Boolean(document.querySelector("form,input,textarea,select")),
      hasVisibleError: /error|failed|stalled|invalid|missing|broken/i.test(visibleText),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 4,
      visibleText,
      headings: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).slice(0, 30).map((heading) => ({
        level: Number(heading.tagName.slice(1)),
        text: text(heading.textContent)
      })),
    targets: targets.map((target) => {
      const { selector: _selector, ...safeTarget } = target;
      return safeTarget;
    }),
      forms,
      scrollY: window.scrollY
    };
  })()`)) as {
    url: string;
    title: string | null;
    loading: boolean;
    hasDialog: boolean;
    hasForm: boolean;
    hasVisibleError: boolean;
    horizontalOverflow: boolean;
    visibleText: string;
    headings: Array<{ level: number; text: string }>;
    targets: Array<Omit<BrowserTarget, "destructiveRisk" | "sensitiveRisk">>;
    forms: Array<{ id: string; targetIds: string[]; method: string | null; action: string | null }>;
    scrollY: number;
  };

  const targetMap = new Map<string, TargetRecord>();
  const targets = raw.targets.slice(0, input.limits.maxDomElements).map((target) => {
    const risk = classifyBrowserTargetRisk(target);
    const enriched: TargetRecord = {
      ...target,
      text: target.text ? truncateText(target.text, 180) : null,
      accessibleName: target.accessibleName ? truncateText(target.accessibleName, 180) : null,
      href: target.href ? truncateText(target.href, 500) : null,
      destructiveRisk: risk.destructiveRisk,
      sensitiveRisk: risk.sensitiveRisk,
      selector: `[${targetAttribute}="${target.id}"]`
    };
    targetMap.set(target.id, enriched);
    return enriched;
  });

  const observation = sanitizeBrowserObservation(
    {
      stepNumber: input.sequence,
      url: raw.url,
      title: raw.title,
      pageState: {
        loading: raw.loading,
        hasDialog: raw.hasDialog,
        hasForm: raw.hasForm,
        hasVisibleError: raw.hasVisibleError,
        horizontalOverflow: raw.horizontalOverflow
      },
      visibleText: raw.visibleText,
      headings: raw.headings,
      targets: targets.map((target) => {
        const { selector: _selector, ...safeTarget } = target;
        return safeTarget;
      }),
      forms: raw.forms,
      recentEvents: {
        consoleErrors: input.events.consoleErrors.slice(-10),
        pageErrors: input.events.pageErrors.slice(-10),
        failedRequests: input.events.failedRequests.slice(-10),
        httpErrors: input.events.httpErrors.slice(-10)
      },
      ...(screenshot ? { screenshot } : {}),
      limitsRemaining: input.remaining
    },
    { maxDomElements: input.limits.maxDomElements, maxVisibleTextChars: input.limits.maxVisibleTextChars }
  );
  return { observation, targetMap, screenshotUsed: Boolean(screenshot) };
}

function evaluateSafety(input: {
  action: BrowserAgentAction;
  targetUrl: string;
  currentUrl: string;
  targetMap: Map<string, TargetRecord>;
  budgets: {
    steps: number;
    providerCalls: number;
    navigations: number;
    clicks: number;
    fills: number;
    screenshots: number;
  };
  limits: BrowserAgentBudgetConfig;
  historyKeys: string[];
  evidenceStepIds: Set<string>;
}): SafetyDecision {
  const action = browserAgentActionSchema.parse(input.action);
  if (input.budgets.steps >= input.limits.maxSteps) {
    return { allowed: false, code: "STEP_LIMIT_REACHED", reason: "The autonomous step budget is exhausted." };
  }
  if (input.budgets.providerCalls > input.limits.maxProviderCalls) {
    return { allowed: false, code: "BUDGET_EXCEEDED", reason: "The provider call budget is exhausted." };
  }
  const key = `${action.tool}:${"targetId" in action ? action.targetId : ""}:${"targetUrl" in action ? action.targetUrl : ""}`;
  const recentActionKeys = input.historyKeys.slice(-2);
  if (recentActionKeys.length === 2 && recentActionKeys.every((item) => item === key)) {
    return { allowed: false, code: "REPEATED_ACTION", reason: "The proposed action repeats without progress." };
  }

  if (action.tool === "navigate") {
    if (input.budgets.navigations >= input.limits.maxNavigations) {
      return { allowed: false, code: "BUDGET_EXCEEDED", reason: "The navigation budget is exhausted." };
    }
    const resolved = resolveSameOriginBrowserUrl({
      targetUrl: input.targetUrl,
      candidateUrl: action.targetUrl,
      allowExternalNavigation: input.limits.allowExternalNavigation
    });
    if (!resolved.allowed) return resolved;
    return { allowed: true, normalizedAction: { ...action, targetUrl: resolved.url }, warnings: [] };
  }

  if (action.tool === "click" || action.tool === "fill") {
    const target = input.targetMap.get(action.targetId);
    if (!target) return { allowed: false, code: "STALE_TARGET", reason: "The target ID is not present in the latest observation." };
    if (!target.visible || !target.inViewport) return { allowed: false, code: "TARGET_NOT_VISIBLE", reason: "The target is not visible and in viewport." };
    if (target.disabled) return { allowed: false, code: "TARGET_DISABLED", reason: "The target is disabled." };
    const risk = classifyBrowserTargetRisk(target);
    const firstRisk = risk.codes[0];
    if (firstRisk) return { allowed: false, code: firstRisk, reason: "The target appears destructive, sensitive, account-related, payment-related, or file-related." };
    if (target.href) {
      const resolved = resolveSameOriginBrowserUrl({
        targetUrl: input.targetUrl,
        candidateUrl: target.href,
        allowExternalNavigation: input.limits.allowExternalNavigation
      });
      if (!resolved.allowed) return resolved;
    }
    if (action.tool === "click") {
      if (input.budgets.clicks >= input.limits.maxClicks) {
        return { allowed: false, code: "BUDGET_EXCEEDED", reason: "The click budget is exhausted." };
      }
      return { allowed: true, normalizedAction: action, warnings: [] };
    }
    if (!input.limits.allowFormFill) {
      return { allowed: false, code: "UNSUPPORTED_FORM_SUBMIT", reason: "Form filling is disabled by configuration." };
    }
    if (input.budgets.fills >= input.limits.maxFormFills) {
      return { allowed: false, code: "BUDGET_EXCEEDED", reason: "The fill budget is exhausted." };
    }
    if (!["input", "textarea"].includes(target.tagName) || !["text", "search", "email", "tel", null].includes(target.type)) {
      return { allowed: false, code: "SENSITIVE_FIELD", reason: "Only safe text-like fields may be filled." };
    }
    return { allowed: true, normalizedAction: action, warnings: [] };
  }

  if (action.tool === "screenshot" && input.budgets.screenshots >= input.limits.maxScreenshots) {
    return { allowed: false, code: "BUDGET_EXCEEDED", reason: "The screenshot budget is exhausted." };
  }

  if (action.tool === "report_finding") {
    const missingEvidence = action.finding.evidenceStepIds.filter((stepId) => !input.evidenceStepIds.has(stepId));
    if (missingEvidence.length > 0) {
      return { allowed: false, code: "INVALID_EVIDENCE", reason: "The finding references missing step evidence." };
    }
  }

  if (action.tool === "wait") {
    return { allowed: true, normalizedAction: { ...action, durationMs: Math.max(250, Math.min(2000, action.durationMs)) }, warnings: [] };
  }

  return { allowed: true, normalizedAction: action, warnings: [] };
}

async function executeTool(input: {
  context: AutonomousMissionContext;
  action: BrowserAgentAction;
  targetMap: Map<string, TargetRecord>;
  limits: BrowserAgentBudgetConfig;
  runId: string;
  sequence: number;
}): Promise<ToolExecutionResult> {
  const page = input.context.page;
  const urlBefore = page.url();
  const screenshotDir = join(input.context.artifactDir, "agent-runs", input.runId, "steps");
  const evidenceIds: string[] = [];
  let summary = "Action completed.";

  if (input.action.tool === "inspect") {
    summary = "Inspected the current page state.";
  } else if (input.action.tool === "click") {
    const target = input.targetMap.get(input.action.targetId);
    if (!target) {
      return { status: "rejected", summary: "Target was not available.", urlBefore, urlAfter: page.url(), stateChanged: false, evidenceIds, metrics: {} };
    }
    await page.locator(target.selector).first().click({ timeout: input.limits.stepTimeoutMs });
    await page.waitForTimeout(input.limits.idleWaitMs);
    summary = `Clicked ${target.text ?? target.accessibleName ?? input.action.targetId}.`;
  } else if (input.action.tool === "fill") {
    const target = input.targetMap.get(input.action.targetId);
    if (!target) {
      return { status: "rejected", summary: "Target was not available.", urlBefore, urlAfter: page.url(), stateChanged: false, evidenceIds, metrics: {} };
    }
    await page.locator(target.selector).first().fill(syntheticBrowserValue(input.action.valueKind, input.runId), { timeout: input.limits.stepTimeoutMs });
    await page.waitForTimeout(input.limits.idleWaitMs);
    summary = `Filled ${target.accessibleName ?? target.text ?? input.action.targetId} with ${input.action.valueKind}.`;
  } else if (input.action.tool === "scroll") {
    const distance = input.action.amount === "small" ? 320 : input.action.amount === "medium" ? 720 : 1200;
    const direction = input.action.direction === "down" ? 1 : -1;
    await page.evaluate(`window.scrollBy({ top: ${distance * direction}, behavior: "instant" })`);
    await page.waitForTimeout(150);
    summary = `Scrolled ${input.action.direction} by a ${input.action.amount} amount.`;
  } else if (input.action.tool === "navigate") {
    await page.goto(input.action.targetUrl, { waitUntil: "networkidle", timeout: input.limits.stepTimeoutMs });
    summary = `Navigated to ${input.action.targetUrl}.`;
  } else if (input.action.tool === "wait") {
    await page.waitForTimeout(input.action.durationMs);
    summary = `Waited ${input.action.durationMs}ms.`;
  } else if (input.action.tool === "screenshot") {
    await mkdir(screenshotDir, { recursive: true });
    const evidenceId = `step-${input.sequence}-screenshot`;
    const path = join(screenshotDir, `${String(input.sequence).padStart(3, "0")}-${input.action.scope}.png`);
    await page.screenshot({ path, fullPage: input.action.scope === "full-page" });
    evidenceIds.push(evidenceId);
    summary = `Captured a ${input.action.scope} screenshot.`;
  } else if (input.action.tool === "report_finding") {
    summary = `Reported finding: ${input.action.finding.title}.`;
  } else if (input.action.tool === "finish") {
    summary = input.action.summary;
  }

  const urlAfter = page.url();
  assertCurrentOrigin(urlAfter, input.context.targetUrl);
  return {
    status: "succeeded",
    summary,
    urlBefore,
    urlAfter,
    stateChanged: urlBefore !== urlAfter || !["inspect", "wait"].includes(input.action.tool),
    evidenceIds,
    metrics: {}
  };
}

function findingFromAction(context: AutonomousMissionContext, action: Extract<BrowserAgentAction, { tool: "report_finding" }>, runId: string): PersistableFinding {
  return {
    category: action.finding.category,
    severity: action.finding.severity,
    title: action.finding.title,
    summary: action.finding.description,
    description: action.finding.description,
    affectedUrl: context.page.url(),
    stepsToReproduce: [`Open ${context.targetUrl}.`, "Replay the autonomous Browser Agent action history for the referenced evidence steps."],
    expectedBehavior: "The journey should progress without a visible stalled or broken state.",
    actualBehavior: action.finding.description,
    browser: "chromium",
    viewport: `${context.definition.viewport.width}x${context.definition.viewport.height}`,
    confidence: 0.82,
    fingerprint: createFindingFingerprint({
      category: action.finding.category,
      affectedUrl: context.page.url(),
      selector: action.finding.targetId ?? "autonomous-browser",
      message: action.finding.title
    }),
    sourceMissionId: context.missionId,
    sourceMissionType: context.missionType,
    evidence: [
      {
        type: "browser_agent_replay",
        content: action.finding.description,
        metadata: { runId, evidenceStepIds: action.finding.evidenceStepIds, targetId: action.finding.targetId ?? null }
      }
    ]
  };
}

export async function autonomousBrowserMission(
  context: AutonomousMissionContext,
  config: RuntimeConfig,
  options: AutonomousBrowserRunOptions = {}
): Promise<AutonomousMissionResult> {
  const limits = { ...budgetConfig(config), ...(options.maxSteps ? { maxSteps: options.maxSteps, maxProviderCalls: options.maxSteps } : {}) };
  const scenario = options.mockScenario ?? config.autonomousMockScenario ?? "success";
  const provider = createBrowserDecisionProvider({
    ...providerRuntimeOptions(config),
    mockScenario: scenario,
    maxTokens: config.autonomousMaxOutputTokens
  });
  const fallbackProvider = new MockBrowserDecisionProvider({ scenario });
  const requestedProvider = config.aiProvider === "anthropic" && config.anthropicApiKey ? "anthropic" : "mock";
  const requestedModel = requestedProvider === "anthropic" ? config.anthropicModel : `mock-browser-agent:${scenario}`;
  const run = await upsertBrowserAgentRun({
    auditId: context.auditId,
    missionId: context.missionId,
    swarmAgentId: options.swarmAgentId ?? null,
    status: "running",
    provider: requestedProvider,
    model: requestedModel,
    promptId: "ai-swarm-qa-browser-agent",
    promptVersion: "v1",
    objective: options.objective ?? context.definition.objective,
    startUrl: context.targetUrl,
    maxSteps: limits.maxSteps
  });

  const startedAt = Date.now();
  const events = attachEventCollectors(context.page);
  const findings: PersistableFinding[] = [];
  const history: BrowserAgentDecisionInput["recentHistory"] = [];
  const historyKeys: string[] = [];
  const evidenceStepIds = new Set<string>();
  const progressFingerprints: string[] = [];
  let terminalReason: BrowserAgentTerminalReason | null = null;
  let runStatus: BrowserAgentRunStatus = "completed";
  let summary = "Autonomous Browser Agent completed.";
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCost = 0;
  const counts = {
    steps: 0,
    providerCalls: 0,
    navigations: 0,
    clicks: 0,
    fills: 0,
    scrolls: 0,
    waits: 0,
    screenshots: 0,
    findingsReported: 0,
    rejections: 0,
    noProgress: 0
  };

  await context.page.goto(context.targetUrl, { waitUntil: "networkidle", timeout: Math.min(limits.stepTimeoutMs, 20000) });

  try {
    while (!terminalReason) {
      if (Date.now() - startedAt > limits.missionTimeoutMs) {
        terminalReason = "TIME_BUDGET_EXHAUSTED";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after reaching the mission time budget.";
        break;
      }
      if (counts.steps >= limits.maxSteps) {
        terminalReason = "STEP_BUDGET_EXHAUSTED";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after reaching the step budget.";
        break;
      }
      if (counts.providerCalls >= limits.maxProviderCalls) {
        terminalReason = "PROVIDER_BUDGET_EXHAUSTED";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after reaching the provider-call budget.";
        break;
      }

      const sequence = counts.steps + 1;
      const remaining = {
        steps: Math.max(0, limits.maxSteps - counts.steps),
        navigations: Math.max(0, limits.maxNavigations - counts.navigations),
        clicks: Math.max(0, limits.maxClicks - counts.clicks),
        fills: Math.max(0, limits.maxFormFills - counts.fills),
        screenshots: Math.max(0, limits.maxScreenshots - counts.screenshots),
        providerCalls: Math.max(0, limits.maxProviderCalls - counts.providerCalls)
      };
      const observed = await observePage({
        context,
        sequence,
        limits,
        remaining,
        events,
        runId: run.id,
        captureScreenshot: sequence === 1
      });
      if (observed.screenshotUsed) {
        counts.screenshots += 1;
      }

      const decisionInput: BrowserAgentDecisionInput = {
        auditId: context.auditId,
        missionId: context.missionId,
        runId: run.id,
        objective: options.objective ?? context.definition.objective,
        constraints: {
          sameOriginOnly: true,
          noPayments: true,
          noDestructiveActions: true,
          noFileUploads: true,
          noDownloads: true,
          noAuthenticationBypass: true,
          noArbitraryCode: true
        },
        currentObservation: observed.observation,
        recentHistory: history.slice(-limits.maxHistoryStepsInContext),
        knownFindings: findings.map((finding) => ({ title: finding.title, category: finding.category, url: finding.affectedUrl })).slice(-20),
        allowedTools: [...browserAgentTools]
      };

      const stepStartedAt = new Date();
      let action: BrowserAgentAction;
      let safetyDecision: SafetyDecision;
      let result: ToolExecutionResult;
      let validationStatus = "valid";
      let decisionMetrics: BrowserAgentDecisionResult | null = null;

      try {
        counts.providerCalls += 1;
        const { decision, usedFallback, primaryError } = await withTimeout(
          decideWithFallback({
            provider,
            fallbackProvider,
            decisionInput,
            fallbackEnabled: config.aiProviderFallbackToMock
          }),
          limits.stepTimeoutMs,
          "Browser Agent provider decision"
        );
        if (usedFallback) {
          validationStatus = `provider_fallback:${primaryError?.code ?? "UNKNOWN"}`;
        }
        decisionMetrics = decision;
        action = decision.action;
        inputTokens += decision.inputTokens ?? 0;
        outputTokens += decision.outputTokens ?? 0;
        estimatedCost += decision.estimatedCostUsd ?? 0;
        logProviderRequest("browser_agent_provider_request_completed", {
          auditId: context.auditId,
          missionId: context.missionId,
          runId: run.id,
          provider: decision.provider,
          model: decision.model,
          durationMs: decision.durationMs,
          inputTokens: decision.inputTokens,
          outputTokens: decision.outputTokens,
          estimatedCostUsd: decision.estimatedCostUsd,
          fallbackUsed: usedFallback
        });
        if (inputTokens > limits.maxInputTokens || outputTokens > limits.maxOutputTokens || estimatedCost > limits.maxEstimatedCostUsd) {
          terminalReason = "COST_BUDGET_EXHAUSTED";
          runStatus = "completed_with_limitations";
          summary = "Autonomous Browser Agent stopped after reaching token or cost budgets.";
        }
      } catch (error) {
        action = { tool: "finish", summary: "Provider failed before returning a valid action.", reason: "Provider failure." };
        validationStatus = "provider_failed";
        safetyDecision = { allowed: false, code: "INVALID_ACTION", reason: error instanceof Error ? truncateText(error.message, 180) : "Provider failed." };
        result = {
          status: "failed",
          summary: safetyDecision.reason,
          urlBefore: context.page.url(),
          urlAfter: context.page.url(),
          stateChanged: false,
          evidenceIds: [],
          metrics: {}
        };
        terminalReason = "PROVIDER_FAILURE";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after provider failure.";
        await persistBrowserAgentStep({
          runId: run.id,
          sequence,
          observationJson: observed.observation,
          proposedActionJson: action,
          validationStatus,
          safetyDecisionJson: safetyDecision,
          executionStatus: "failed",
          executionResultJson: result,
          urlBefore: result.urlBefore,
          urlAfter: result.urlAfter,
          stateChanged: false,
          inputTokens: null,
          outputTokens: null,
          estimatedCost: null,
          durationMs: Date.now() - stepStartedAt.getTime(),
          startedAt: stepStartedAt,
          completedAt: new Date()
        });
        counts.steps += 1;
        break;
      }

      safetyDecision = evaluateSafety({
        action,
        targetUrl: context.targetUrl,
        currentUrl: context.page.url(),
        targetMap: observed.targetMap,
        budgets: counts,
        limits,
        historyKeys,
        evidenceStepIds
      });

      if (!safetyDecision.allowed) {
        counts.rejections += 1;
        result = {
          status: "rejected",
          summary: safetyDecision.reason,
          urlBefore: context.page.url(),
          urlAfter: context.page.url(),
          stateChanged: false,
          evidenceIds: [],
          metrics: {}
        };
      } else {
        result = await withTimeout(
          executeTool({ context, action: safetyDecision.normalizedAction, targetMap: observed.targetMap, limits, runId: run.id, sequence }),
          limits.stepTimeoutMs,
          `Browser Agent ${safetyDecision.normalizedAction.tool}`
        );
        action = safetyDecision.normalizedAction;
        counts.rejections = 0;
        if (action.tool === "navigate") counts.navigations += 1;
        if (action.tool === "click") counts.clicks += 1;
        if (action.tool === "fill") counts.fills += 1;
        if (action.tool === "scroll") counts.scrolls += 1;
        if (action.tool === "wait") counts.waits += 1;
        if (action.tool === "screenshot") counts.screenshots += 1;
        if (action.tool === "report_finding") {
          findings.push(findingFromAction(context, action, run.id));
          counts.findingsReported += 1;
        }
        if (action.tool === "finish") {
          terminalReason = "FINISHED_BY_AGENT";
          summary = action.summary;
        }
      }

      const stepId = `step-${sequence}`;
      evidenceStepIds.add(stepId);
      counts.steps += 1;
      history.push({
        stepNumber: sequence,
        proposedTool: action.tool,
        executed: safetyDecision.allowed && result.status === "succeeded",
        outcome: result.summary,
        rejectionReason: safetyDecision.allowed ? null : safetyDecision.reason
      });
      historyKeys.push(`${action.tool}:${"targetId" in action ? action.targetId : ""}:${"targetUrl" in action ? action.targetUrl : ""}`);
      const progressFingerprint = browserAgentProgressFingerprint({
        url: observed.observation.url,
        title: observed.observation.title,
        visibleText: observed.observation.visibleText,
        targets: observed.observation.targets,
        tool: action.tool,
        ...("targetId" in action ? { targetId: action.targetId } : {})
      });
      if (progressFingerprints.slice(-1)[0] === progressFingerprint && !result.stateChanged) {
        counts.noProgress += 1;
      } else {
        counts.noProgress = 0;
      }
      progressFingerprints.push(progressFingerprint);

      await persistBrowserAgentStep({
        runId: run.id,
        sequence,
        observationJson: observed.observation,
        proposedActionJson: action,
        validationStatus,
        safetyDecisionJson: safetyDecision.allowed
          ? { allowed: true, warnings: safetyDecision.warnings }
          : { allowed: false, code: safetyDecision.code, reason: safetyDecision.reason },
        executionStatus: result.status === "succeeded" && safetyDecision.allowed ? "executed" : result.status,
        executionResultJson: result,
        urlBefore: result.urlBefore,
        urlAfter: result.urlAfter,
          stateChanged: result.stateChanged,
          inputTokens: decisionMetrics?.inputTokens ?? null,
          outputTokens: decisionMetrics?.outputTokens ?? null,
          estimatedCost: decisionMetrics?.estimatedCostUsd ?? null,
          durationMs: Date.now() - stepStartedAt.getTime(),
        startedAt: stepStartedAt,
        completedAt: new Date()
      });

      if (counts.rejections >= limits.maxConsecutiveRejections) {
        terminalReason = "TOO_MANY_REJECTIONS";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after too many rejected actions.";
      }
      if (counts.noProgress >= limits.maxNoProgressSteps) {
        terminalReason = "NO_PROGRESS";
        runStatus = "completed_with_limitations";
        summary = "Autonomous Browser Agent stopped after repeated no-progress actions.";
      }
    }
  } catch (error) {
    terminalReason = error instanceof Error && error.message === "EXTERNAL_NAVIGATION_BLOCKED" ? "EXTERNAL_NAVIGATION_BLOCKED" : "BROWSER_FAILURE";
    runStatus = "completed_with_limitations";
    summary = error instanceof Error ? truncateText(error.message, 240) : "Autonomous Browser Agent stopped after browser failure.";
  }

  const finalReason = terminalReason ?? "FINISHED_BY_AGENT";
  await completeBrowserAgentRun({
    runId: run.id,
    status: runStatus,
    terminalReason: finalReason,
    summary,
    finalUrl: context.page.url(),
    stepsUsed: counts.steps,
    providerCalls: counts.providerCalls,
    inputTokens,
    outputTokens,
    estimatedCost
  });

  return {
    runId: run.id,
    summary: `${summary} Terminal reason: ${finalReason}.`,
    observations: counts.steps,
    findings,
    metrics: {
      stepsUsed: counts.steps,
      providerCalls: counts.providerCalls,
      navigations: counts.navigations,
      clicks: counts.clicks,
      fills: counts.fills,
      screenshots: counts.screenshots,
      rejectedActions: history.filter((item) => item.rejectionReason).length,
      findingsReported: counts.findingsReported,
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimatedCost
    }
  };
}
