import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import axe from "axe-core";
import { Worker, type Job } from "bullmq";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import {
  AIProviderError,
  MockAiProvider,
  createAiProvider,
  getModelPricing,
  getPlannerModel,
  plannerPromptV1,
  runPlannerPrompt
} from "@ai-swarm-qa/ai";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import {
  completeBrowserSessionWithDuration,
  createBrowserSession,
  claimEvidenceDueForDeletion,
  finalizeAuditIfReady,
  finalizeCancelledAudit,
  getAuditWorkspaceId,
  getAuditCancellationState,
  finalizeGitHubExportBatch,
  getAuditSummary,
  getGitHubExportBatch,
  listUnstoredLocalEvidenceForAudit,
  markEvidenceStored,
  markEvidenceDeleted,
  markEvidenceDeletionFailed,
  markEvidenceRetentionForAudit,
  markFindingGitHubExportCreated,
  markFindingGitHubExportCreating,
  markFindingGitHubExportFailed,
  markFindingGitHubExportSkipped,
  markGitHubExportBatchRunning,
  markMissionCompleted,
  markMissionCancelled,
  markMissionFailed,
  markMissionQueued,
  markMissionRunning,
  persistFindings,
  persistMissionPlan,
  recordUsageEvent,
  transitionAuditStatus,
  toIssueFinding,
  upsertAuditPlan,
  type PersistableFinding
} from "@ai-swarm-qa/database";
import { buildIssueDraft, createGitHubProvider, extractFindingMarker, GitHubProviderError } from "@ai-swarm-qa/github";
import {
  createAuditQueue,
  createRetentionCleanupQueue,
  enqueueMission,
  GITHUB_EXPORT_QUEUE_NAME,
  RETENTION_CLEANUP_QUEUE_NAME,
  scheduleRetentionCleanup,
  type AuditQueueJob
} from "@ai-swarm-qa/queue";
import { buildEvidenceStorageKey, detectEvidenceContentType, extensionForContentType, SupabaseStorageProvider } from "@ai-swarm-qa/storage";
import {
  buildPlannerInput,
  calculateModelCost,
  createFindingFingerprint,
  dedupeByFingerprint,
  executeMissionJobSchema,
  estimateTokenCountFromText,
  getMissionDefinition,
  isSafeInteractionLabel,
  mergePlannerOutput,
  missionTypeSchema,
  planAuditJobSchema,
  planAuditMissions,
  sanitizeAuditMissionContext,
  sanitizePlanningSnapshot,
  type ExecuteMissionJob,
  githubExportJobSchema,
  type AuditMissionContext,
  type MissionDefinition,
  type MissionType,
  type PlannerFallbackReason,
  type PlannerOutput,
  type PlanningSnapshot
} from "@ai-swarm-qa/shared";
import { autonomousBrowserMission } from "./browser-agent";
import { browserSwarmMission } from "./browser-swarm";

declare global {
  interface Window {
    __aiSwarmQaEvents?: string[];
    axe: {
      run: (context: Document, options: { resultTypes: string[] }) => Promise<AxeRunResult>;
    };
  }
}

type AxeViolation = {
  id: string;
  impact?: string | null;
  help: string;
  description: string;
  tags: string[];
  nodes: Array<{ target: string[] }>;
};

type AxeRunResult = {
  violations: AxeViolation[];
};

type MissionResult = {
  summary: string;
  observations: number;
  findings: PersistableFinding[];
  metrics: Record<string, number>;
};

type MissionContext = {
  auditId: string;
  missionId: string;
  missionType: MissionType;
  targetUrl: string;
  missionContext: AuditMissionContext;
  definition: MissionDefinition;
  page: Page;
  browser: Browser;
  artifactDir: string;
  checkCancellation: () => Promise<void>;
};

const AUDIT_QUEUE_NAME = "audit-missions";
const config = readRuntimeConfig();

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", event, ...fields }));
}

function logError(event: string, fields: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", event, ...fields }));
}

function safeFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown worker failure.";
}

class AuditCancelledError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "AuditCancelledError";
  }
}

async function throwIfAuditCancelled(auditId: string) {
  const cancellation = await getAuditCancellationState(auditId);
  if (cancellation.requested) {
    throw new AuditCancelledError(cancellation.reason);
  }
}

function finding(
  context: MissionContext,
  input: Omit<PersistableFinding, "browser" | "viewport" | "sourceMissionId" | "sourceMissionType">
): PersistableFinding {
  return {
    ...input,
    browser: "chromium",
    viewport: `${context.definition.viewport.width}x${context.definition.viewport.height}`,
    sourceMissionId: context.missionId,
    sourceMissionType: context.missionType
  };
}

async function gotoTarget(context: MissionContext) {
  await context.checkCancellation();
  return context.page.goto(context.targetUrl, {
    waitUntil: "networkidle",
    timeout: Math.min(context.definition.timeoutMs, 20000)
  }).finally(() => context.checkCancellation());
}

async function collectPlanningSnapshot(input: { targetUrl: string }): Promise<PlanningSnapshot> {
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let consoleErrorCount = 0;
  let failedRequestCount = 0;
  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrorCount += 1;
      }
    });
    page.on("requestfailed", () => {
      failedRequestCount += 1;
    });
    await page.goto(input.targetUrl, { waitUntil: "networkidle", timeout: Math.min(config.plannerTimeoutMs, 20000) });
    const raw = (await page.evaluate(String.raw`(() => {
      const text = (value) => (value || "").replace(/\s+/g, " ").trim();
      const labelFor = (element) => {
        const id = element.getAttribute("id");
        if (id) {
          const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
          if (label && label.textContent) {
            return text(label.textContent);
          }
        }
        const wrapping = element.closest("label");
        return text(wrapping && wrapping.textContent);
      };
      return {
        finalUrl: window.location.href,
        pageTitle: text(document.title) || null,
        metaDescription: text(document.querySelector('meta[name="description"]') && document.querySelector('meta[name="description"]').getAttribute("content")) || null,
        language: text(document.documentElement.lang) || null,
        headings: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: text(heading.textContent)
        })),
        navigationLinks: Array.from(document.querySelectorAll("nav a[href], header a[href], main a[href]")).map((anchor) => ({
          text: text(anchor.textContent),
          url: anchor.href
        })),
        visibleButtons: Array.from(document.querySelectorAll("button, [role='button']")).map((button) => ({
          text: text(button.textContent),
          role: button.getAttribute("role"),
          ariaLabel: button.getAttribute("aria-label")
        })),
        forms: Array.from(document.querySelectorAll("form, section, main")).slice(0, 20).map((form) => ({
          action: form instanceof HTMLFormElement ? form.action || null : null,
          method: form instanceof HTMLFormElement ? form.method || null : null,
          fields: Array.from(form.querySelectorAll("input, textarea, select")).map((field) => ({
            type: field.type || field.tagName.toLowerCase(),
            name: field.name || null,
            label: labelFor(field) || field.getAttribute("aria-label") || null,
            required: Boolean(field.required),
            autocomplete: field.autocomplete || null
          }))
        })),
        bodyText: text(document.body.innerText),
        sameOriginRoutes: Array.from(document.querySelectorAll("a[href]")).map((anchor) => anchor.href)
      };
    })()`)) as {
      finalUrl: string;
      pageTitle: string | null;
      metaDescription: string | null;
      language: string | null;
      headings: Array<{ level: number; text: string }>;
      navigationLinks: Array<{ text: string; url: string }>;
      visibleButtons: Array<{ text: string; role: string | null; ariaLabel: string | null }>;
      forms: Array<{
        action: string | null;
        method: string | null;
        fields: Array<{ type: string; name: string | null; label: string | null; required: boolean; autocomplete: string | null }>;
      }>;
      bodyText: string;
      sameOriginRoutes: string[];
    };
    const signalText = `${raw.pageTitle ?? ""} ${raw.metaDescription ?? ""} ${raw.bodyText}`.toLowerCase();
    return sanitizePlanningSnapshot(
      {
        targetUrl: input.targetUrl,
        finalUrl: raw.finalUrl,
        pageTitle: raw.pageTitle,
        metaDescription: raw.metaDescription,
        language: raw.language,
        headings: raw.headings,
        navigationLinks: raw.navigationLinks,
        visibleButtons: raw.visibleButtons,
        forms: raw.forms,
        detectedSignals: {
          hasLogin: /log in|login|sign in/.test(signalText),
          hasSignup: /sign up|signup|start trial|create account/.test(signalText),
          hasCheckout: /checkout|cart|order/.test(signalText),
          hasPricing: /pricing|price|plan/.test(signalText),
          hasSearch: /search/.test(signalText),
          hasDashboard: /dashboard|workspace/.test(signalText),
          hasContactForm: /contact|newsletter|subscribe/.test(signalText),
          hasFileUpload: /upload|file/.test(signalText)
        },
        sameOriginRoutes: raw.sameOriginRoutes,
        consoleErrorCount,
        failedRequestCount
      },
      {
        maxPageTextChars: config.plannerMaxPageTextChars,
        maxLinksInContext: config.plannerMaxLinksInContext,
        maxFormsInContext: config.plannerMaxFormsInContext,
        maxPriorityRoutes: config.plannerMaxPriorityRoutes
      }
    );
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

function fallbackFromProviderError(error: unknown): PlannerFallbackReason {
  if (error instanceof AIProviderError) {
    if (error.code === "TIMEOUT") {
      return "PROVIDER_TIMEOUT";
    }
    if (error.code === "RATE_LIMIT") {
      return "PROVIDER_RATE_LIMIT";
    }
    if (error.code === "UNAVAILABLE") {
      return "PROVIDER_UNAVAILABLE";
    }
    if (error.code === "INVALID_RESPONSE") {
      return "INVALID_PROVIDER_OUTPUT";
    }
    if (error.code === "CONTEXT_TOO_LARGE") {
      return "INPUT_TOO_LARGE";
    }
    if (error.code === "AUTHENTICATION" || error.code === "CONFIGURATION") {
      return "MISSING_API_KEY";
    }
  }
  return "UNKNOWN_PROVIDER_ERROR";
}

function providerRuntimeOptions(model: string) {
  return {
    aiProvider: config.aiProvider,
    apiKey: config.anthropicApiKey,
    defaultModel: model,
    maxAttempts: config.aiProviderMaxAttempts,
    initialBackoffMs: config.aiProviderInitialBackoffMs,
    timeoutMs: Math.min(config.aiProviderTimeoutMs, config.plannerTimeoutMs),
    fallbackToMock: config.aiProviderFallbackToMock
  };
}

async function requestPlanner(input: { plannerInput: ReturnType<typeof buildPlannerInput>; model: string }) {
  const provider = createAiProvider({
    ...providerRuntimeOptions(input.model),
    mockScenario: config.plannerMockScenario
  });
  let lastError: unknown;
  for (let attempt = 1; attempt <= config.plannerMaxAttempts; attempt += 1) {
    try {
      return await runPlannerPrompt({
        provider,
        plannerInput: input.plannerInput,
        model: input.model,
        maxTokens: config.plannerMaxOutputTokens,
        timeoutMs: Math.min(config.aiProviderTimeoutMs, config.plannerTimeoutMs),
        retry: { maxAttempts: config.aiProviderMaxAttempts, initialBackoffMs: config.aiProviderInitialBackoffMs }
      });
    } catch (error) {
      lastError = error;
      const reason = fallbackFromProviderError(error);
      if (!["PROVIDER_TIMEOUT", "PROVIDER_RATE_LIMIT", "INVALID_PROVIDER_OUTPUT", "UNKNOWN_PROVIDER_ERROR"].includes(reason)) {
        break;
      }
      if (attempt < config.plannerMaxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }
  if (config.aiProvider === "anthropic" && config.aiProviderFallbackToMock) {
    log("planning_ai_provider_fallback", {
      provider: "anthropic",
      fallbackProvider: "mock",
      fallbackReason: fallbackFromProviderError(lastError)
    });
    return runPlannerPrompt({
      provider: new MockAiProvider({ scenario: config.plannerMockScenario ?? "success" }),
      plannerInput: input.plannerInput,
      model: "mock-planner:fallback",
      maxTokens: config.plannerMaxOutputTokens,
      timeoutMs: config.plannerTimeoutMs
    });
  }
  throw lastError;
}

async function errorReviewer(context: MissionContext): Promise<MissionResult> {
  const consoleErrors = new Map<string, number>();
  const pageErrors = new Map<string, number>();
  const failedRequests = new Map<string, { count: number; failure?: string }>();
  const httpErrors = new Map<string, { status: number; count: number }>();

  context.page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.set(message.text(), (consoleErrors.get(message.text()) ?? 0) + 1);
    }
  });
  context.page.on("pageerror", (error) => {
    pageErrors.set(error.message, (pageErrors.get(error.message) ?? 0) + 1);
  });
  context.page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText;
    const existing = failedRequests.get(request.url());
    failedRequests.set(request.url(), { count: (existing?.count ?? 0) + 1, ...(failure ? { failure } : {}) });
  });
  context.page.on("response", (response) => {
    if (response.status() >= 400) {
      const existing = httpErrors.get(response.url());
      httpErrors.set(response.url(), { status: response.status(), count: (existing?.count ?? 0) + 1 });
    }
  });

  const response = await gotoTarget(context);
  const finalUrl = context.page.url();
  const findings: PersistableFinding[] = [];

  if (!response || response.status() >= 400) {
    const status = response?.status();
    findings.push(
      finding(context, {
        category: "functional",
        severity: !status || status >= 500 ? "high" : "medium",
        title: status ? `Initial navigation returned HTTP ${status}` : "Navigation did not return a response",
        summary: status ? `The audited page returned HTTP ${status}.` : "The browser navigation completed without a response.",
        description: "The target page should load successfully before deeper checks run.",
        affectedUrl: context.targetUrl,
        stepsToReproduce: [`Open ${context.targetUrl}.`],
        expectedBehavior: "The target should return a successful HTTP response.",
        actualBehavior: status ? `HTTP ${status}` : "No navigation response was available.",
        confidence: 0.96,
        fingerprint: createFindingFingerprint({
          category: "functional",
          affectedUrl: context.targetUrl,
          ...(status ? { statusCode: status } : {}),
          message: "initial-navigation"
        }),
        evidence: [{ type: "navigation", content: status ? `HTTP ${status}` : "No response", metadata: { finalUrl, status } }]
      })
    );
  }

  for (const [message, count] of consoleErrors) {
    findings.push(
      finding(context, {
        category: "console",
        severity: "medium",
        title: "Browser console error",
        summary: message,
        description: "The page emitted a browser console error during audit execution.",
        affectedUrl: finalUrl,
        stepsToReproduce: [`Open ${context.targetUrl}.`, "Observe browser console output."],
        expectedBehavior: "The page should not emit console errors during the primary load path.",
        actualBehavior: message,
        confidence: 0.95,
        fingerprint: createFindingFingerprint({ category: "console", affectedUrl: finalUrl, message }),
        occurrenceCount: count,
        evidence: [{ type: "console_error", content: message, metadata: { count } }]
      })
    );
  }

  for (const [message, count] of pageErrors) {
    findings.push(
      finding(context, {
        category: "console",
        severity: "high",
        title: "Uncaught page error",
        summary: message,
        description: "The page threw an uncaught JavaScript error.",
        affectedUrl: finalUrl,
        stepsToReproduce: [`Open ${context.targetUrl}.`],
        expectedBehavior: "The page should not throw uncaught JavaScript errors.",
        actualBehavior: message,
        confidence: 0.96,
        fingerprint: createFindingFingerprint({ category: "console", affectedUrl: finalUrl, message }),
        occurrenceCount: count,
        evidence: [{ type: "page_error", content: message, metadata: { count } }]
      })
    );
  }

  for (const [url, record] of failedRequests) {
    findings.push(
      finding(context, {
        category: "network",
        severity: "medium",
        title: "Network request failed",
        summary: `A request to ${url} failed.`,
        description: "A browser request failed during audit execution.",
        affectedUrl: url,
        stepsToReproduce: [`Open ${context.targetUrl}.`, `Observe the request to ${url}.`],
        expectedBehavior: "Required page requests should complete successfully.",
        actualBehavior: record.failure ?? "The request failed.",
        confidence: 0.92,
        fingerprint: createFindingFingerprint({ category: "network", affectedUrl: url, message: record.failure ?? "request-failed" }),
        occurrenceCount: record.count,
        evidence: [
          {
            type: "request_failure",
            ...(record.failure ? { content: record.failure } : {}),
            metadata: { url, count: record.count }
          }
        ]
      })
    );
  }

  for (const [url, record] of httpErrors) {
    findings.push(
      finding(context, {
        category: "network",
        severity: record.status >= 500 ? "high" : "medium",
        title: `Request returned HTTP ${record.status}`,
        summary: `A request to ${url} returned HTTP ${record.status}.`,
        description: "The page loaded a resource or endpoint that returned an error status.",
        affectedUrl: url,
        stepsToReproduce: [`Open ${context.targetUrl}.`, `Observe the request to ${url}.`],
        expectedBehavior: "Page requests should return successful responses.",
        actualBehavior: `HTTP ${record.status}`,
        confidence: 0.94,
        fingerprint: createFindingFingerprint({ category: "network", affectedUrl: url, statusCode: record.status }),
        occurrenceCount: record.count,
        evidence: [{ type: "http_error", content: `HTTP ${record.status}`, metadata: { url, status: record.status, count: record.count } }]
      })
    );
  }

  return {
    summary: `Captured ${consoleErrors.size} console errors and ${httpErrors.size} HTTP errors.`,
    observations: consoleErrors.size + pageErrors.size + failedRequests.size + httpErrors.size + 1,
    findings,
    metrics: { consoleErrors: consoleErrors.size, httpErrors: httpErrors.size, failedRequests: failedRequests.size }
  };
}

async function linkTester(context: MissionContext): Promise<MissionResult> {
  await gotoTarget(context);
  const origin = new URL(context.targetUrl).origin;
  const links = await context.page.$$eval("a[href]", (anchors) =>
    anchors.map((anchor) => ({
      href: (anchor as HTMLAnchorElement).href,
      text: anchor.textContent?.trim() ?? "",
      download: (anchor as HTMLAnchorElement).download
    }))
  );
  const safeLinks = [...new Map(links
    .filter((link) => {
      const url = new URL(link.href);
      const destructive = /logout|delete|remove|reset/i.test(link.href);
      return url.origin === origin && !link.download && !["mailto:", "tel:", "javascript:"].includes(url.protocol) && !destructive;
    })
    .map((link) => [link.href, link])).values()].slice(0, context.definition.limits.maxLinks);

  const findings: PersistableFinding[] = [];
  for (const link of safeLinks) {
    const response = await context.page.request.get(link.href, { maxRedirects: 0, timeout: 5000 });
    if (response.status() >= 400) {
      findings.push(
        finding(context, {
          category: "functional",
          severity: response.status() >= 500 ? "high" : "medium",
          title: `Broken link returns HTTP ${response.status()}`,
          summary: `The link "${link.text || link.href}" returns HTTP ${response.status()}.`,
          description: "A same-origin navigation link points to an unavailable page.",
          affectedUrl: link.href,
          stepsToReproduce: [`Open ${context.targetUrl}.`, `Follow the link "${link.text || link.href}".`],
          expectedBehavior: "Navigation links should resolve successfully.",
          actualBehavior: `The link returned HTTP ${response.status()}.`,
          confidence: 0.96,
          fingerprint: createFindingFingerprint({
            category: "functional",
            affectedUrl: link.href,
            statusCode: response.status(),
            message: "broken-link"
          }),
          evidence: [{ type: "http_response", content: `HTTP ${response.status()}`, metadata: { href: link.href, status: response.status() } }]
        })
      );
    }
  }
  return { summary: `Checked ${safeLinks.length} same-origin links.`, observations: safeLinks.length, findings, metrics: { linksChecked: safeLinks.length } };
}

async function formTester(context: MissionContext): Promise<MissionResult> {
  await gotoTarget(context);
  const unlabeledInputs = await context.page.$$eval("input, textarea, select", (controls) =>
    controls
      .filter((control) => {
        const element = control as HTMLInputElement;
        const id = element.id;
        const hasAria = Boolean(element.getAttribute("aria-label") || element.getAttribute("aria-labelledby"));
        const hasWrappingLabel = Boolean(element.closest("label"));
        const hasForLabel = id ? Boolean(document.querySelector(`label[for="${CSS.escape(id)}"]`)) : false;
        const isHidden = element.type === "hidden" || element.offsetParent === null;
        return !isHidden && !hasAria && !hasWrappingLabel && !hasForLabel;
      })
      .map((control) => ({
        selector: control.id ? `#${control.id}` : control.tagName.toLowerCase(),
        placeholder: (control as HTMLInputElement).placeholder ?? "",
        required: (control as HTMLInputElement).required
      }))
  );
  const findings = unlabeledInputs.map((input) =>
    finding(context, {
      category: "accessibility",
      severity: "medium",
      title: "Form input is missing an accessible label",
      summary: `A visible form control (${input.selector}) does not have an associated label.`,
      description: "Visible inputs should have an associated label or accessible name for assistive technology.",
      affectedUrl: context.targetUrl,
      stepsToReproduce: [`Open ${context.targetUrl}.`, `Inspect the form control ${input.selector}.`],
      expectedBehavior: "Every visible form control should have an accessible name.",
      actualBehavior: "The control has no label, aria-label, or aria-labelledby attribute.",
      confidence: 0.94,
      fingerprint: createFindingFingerprint({ category: "accessibility", affectedUrl: context.targetUrl, selector: input.selector, message: "missing-label" }),
      evidence: [{ type: "dom_selector", content: input.selector, metadata: input }]
    })
  );
  return { summary: `Inspected ${unlabeledInputs.length} unlabeled controls.`, observations: unlabeledInputs.length, findings, metrics: { unlabeledInputs: unlabeledInputs.length } };
}

async function mobileTester(context: MissionContext): Promise<MissionResult> {
  await gotoTarget(context);
  const overflow = await context.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  const screenshotPath = join(context.artifactDir, `${context.missionType}.png`);
  const findings: PersistableFinding[] = [];
  if (overflow.scrollWidth > overflow.clientWidth + 4) {
    await context.page.screenshot({ fullPage: true, path: screenshotPath });
    findings.push(
      finding(context, {
        category: "ux",
        severity: "medium",
        title: "Page has horizontal overflow on mobile",
        summary: "The page width exceeds the mobile viewport width.",
        description: "Horizontal overflow can hide content and create poor mobile usability.",
        affectedUrl: context.targetUrl,
        stepsToReproduce: [`Open ${context.targetUrl} with a ${context.definition.viewport.width}x${context.definition.viewport.height} viewport.`],
        expectedBehavior: "The document width should fit within the viewport.",
        actualBehavior: `Document scroll width is ${overflow.scrollWidth}px while viewport width is ${overflow.clientWidth}px.`,
        confidence: 0.9,
        fingerprint: createFindingFingerprint({ category: "ux", affectedUrl: context.targetUrl, message: "mobile-horizontal-overflow" }),
        evidence: [{ type: "screenshot", localPath: screenshotPath, metadata: { viewport: context.definition.viewport, ...overflow } }]
      })
    );
  }
  return { summary: `Measured mobile width ${overflow.scrollWidth}/${overflow.clientWidth}.`, observations: 1, findings, metrics: overflow };
}

async function accessibilityReviewer(context: MissionContext): Promise<MissionResult> {
  await gotoTarget(context);
  await context.page.addScriptTag({ content: axe.source });
  const result = await context.page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
  const findings = result.violations.slice(0, 10).map((violation) => {
    const severity = violation.impact === "critical" || violation.impact === "serious" ? "high" : violation.impact === "moderate" ? "medium" : "low";
    const selectors = violation.nodes.flatMap((node) => node.target).slice(0, 10);
    return finding(context, {
      category: "accessibility",
      severity,
      title: `Accessibility violation: ${violation.id}`,
      summary: violation.help,
      description: violation.description,
      affectedUrl: context.targetUrl,
      stepsToReproduce: [`Open ${context.targetUrl}.`, `Run axe-core rule ${violation.id}.`],
      expectedBehavior: "The page should avoid deterministic accessibility violations for this rule.",
      actualBehavior: `${violation.nodes.length} nodes violated ${violation.id}.`,
      confidence: 0.9,
      fingerprint: createFindingFingerprint({ category: "accessibility", affectedUrl: context.targetUrl, selector: violation.id, message: violation.help }),
      occurrenceCount: violation.nodes.length,
      evidence: [{ type: "axe_violation", content: violation.help, metadata: { ruleId: violation.id, impact: violation.impact, tags: violation.tags, selectors } }]
    });
  });
  return { summary: `Axe found ${result.violations.length} rule violations.`, observations: result.violations.length, findings, metrics: { violations: result.violations.length } };
}

async function interactionTester(context: MissionContext): Promise<MissionResult> {
  await gotoTarget(context);
  const candidates = await context.page.$$eval("button, [role='button']", (elements) =>
    elements.map((element, index) => ({
      index,
      text: element.textContent?.trim() ?? element.getAttribute("aria-label") ?? "",
      disabled: Boolean((element as HTMLButtonElement).disabled)
    }))
  );
  const safeCandidates = candidates.filter((candidate) => !candidate.disabled && isSafeInteractionLabel(candidate.text)).slice(0, context.definition.limits.maxInteractions);
  const findings: PersistableFinding[] = [];
  for (const candidate of safeCandidates) {
    if (!/checkout/i.test(candidate.text)) {
      continue;
    }
    await context.page.evaluate(() => {
      window.__aiSwarmQaEvents = [];
      window.addEventListener("checkout-stalled", () => window.__aiSwarmQaEvents?.push("checkout-stalled"));
    });
    await context.page.locator("button", { hasText: candidate.text }).first().click({ timeout: 5000 });
    await context.page.waitForTimeout(300);
    const events = await context.page.evaluate(() => window.__aiSwarmQaEvents ?? []);
    if (events.includes("checkout-stalled")) {
      findings.push(
        finding(context, {
          category: "functional",
          severity: "high",
          title: "Checkout button does not continue the workflow",
          summary: "Clicking the checkout button triggers a stalled interaction instead of continuing.",
          description: "The controlled fixture emits a stalled interaction event after the checkout button is clicked.",
          affectedUrl: context.targetUrl,
          stepsToReproduce: [`Open ${context.targetUrl}.`, "Click the Checkout button."],
          expectedBehavior: "The checkout action should navigate, update the UI, or start a checkout request.",
          actualBehavior: "The click emitted a stalled event and no user-visible progress occurred.",
          confidence: 0.91,
          fingerprint: createFindingFingerprint({
            category: "functional",
            affectedUrl: context.targetUrl,
            selector: "button:has-text('Checkout')",
            message: "checkout-stalled"
          }),
          evidence: [{ type: "browser_event", content: "checkout-stalled", metadata: { events, label: candidate.text } }]
        })
      );
    }
  }
  return { summary: `Attempted ${safeCandidates.length} safe interactions.`, observations: safeCandidates.length, findings, metrics: { interactionsAttempted: safeCandidates.length } };
}

const executors = {
  "error-reviewer": errorReviewer,
  "link-tester": linkTester,
  "form-tester": formTester,
  "mobile-tester": mobileTester,
  "accessibility-reviewer": accessibilityReviewer,
  "interaction-tester": interactionTester,
  "autonomous-browser": (context: MissionContext) => autonomousBrowserMission(context, config),
  "browser-swarm": (context: MissionContext) => browserSwarmMission(context, config)
} satisfies Record<MissionType, (context: MissionContext) => Promise<MissionResult>>;

async function runPlanningJob(job: Job<AuditQueueJob>) {
  const payload = planAuditJobSchema.parse(job.data);
  const missionContext = sanitizeAuditMissionContext(payload.missionContext);
  const startedAt = Date.now();
  const baseline = planAuditMissions({
    auditId: payload.auditId,
    targetUrl: payload.targetUrl,
    mode: payload.auditMode,
    includeAutonomousBrowser: config.autonomousBrowserMode !== "disabled" && config.swarmMode === "disabled",
    includeBrowserSwarm: config.swarmMode !== "disabled"
  });
  let snapshot: PlanningSnapshot | null = null;
  let plannerOutput: PlannerOutput | null = null;
  let fallbackReason: PlannerFallbackReason | null = null;
  let provider: string | null = null;
  let model: string | null = null;
  let promptId: string | null = null;
  let promptVersion: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let estimatedCost: number | null = null;
  let estimatedInputCost: number | null = null;
  let estimatedOutputCost: number | null = null;
  const warnings: string[] = [];

  log("planning_started", { auditId: payload.auditId, mode: config.auditPlanningMode });
  await throwIfAuditCancelled(payload.auditId);

  try {
    snapshot = await collectPlanningSnapshot({ targetUrl: payload.targetUrl });
    await throwIfAuditCancelled(payload.auditId);
    log("planning_snapshot_completed", {
      auditId: payload.auditId,
      links: snapshot.navigationLinks.length,
      forms: snapshot.forms.length
    });
  } catch (error) {
    warnings.push("Planning snapshot could not be collected; deterministic baseline was used.");
    fallbackReason = "UNKNOWN_PROVIDER_ERROR";
    logError("planning_snapshot_failed", { auditId: payload.auditId, error: safeFailureMessage(error) });
  }

  const shouldRequestAi = config.auditPlanningMode === "ai-assisted" && config.plannerAiEnabled && snapshot !== null;
  if (config.auditPlanningMode === "ai-assisted" && !config.plannerAiEnabled) {
    fallbackReason = "AI_DISABLED";
  }
  if (shouldRequestAi && !fallbackReason) {
    try {
      const aiSnapshot = snapshot;
      if (!aiSnapshot) {
        throw new AIProviderError("INVALID_RESPONSE", "Planner snapshot was unavailable.");
      }
      const plannerInput = buildPlannerInput({
        auditId: payload.auditId,
        targetUrl: payload.targetUrl,
        auditMode: payload.auditMode,
        missionContext,
        baselineMissions: baseline,
        snapshot: aiSnapshot,
        maxProposedMissions: config.plannerMaxProposedMissions,
        maxPriorityRoutes: config.plannerMaxPriorityRoutes
      });
      const promptText = `${plannerPromptV1.buildSystemPrompt()}\n${plannerPromptV1.buildUserPrompt(plannerInput)}`;
      const estimatedInputTokens = estimateTokenCountFromText(promptText);
      if (estimatedInputTokens > config.plannerMaxInputTokens) {
        throw new AIProviderError("CONTEXT_TOO_LARGE", "Planner input is too large.");
      }
      model =
        config.aiProvider === "anthropic"
          ? getPlannerModel({ anthropicPlannerModel: config.anthropicPlannerModel || config.anthropicModel, aiFastModel: config.aiFastModel })
          : "mock-planner";
      log("planning_ai_request_started", { auditId: payload.auditId, model, promptVersion: plannerPromptV1.version });
      const result = await requestPlanner({ plannerInput, model });
      provider = result.provider;
      model = result.model;
      promptId = result.promptId;
      promptVersion = result.promptVersion;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      estimatedCost = result.estimatedCostUsd;
      const costs = calculateModelCost({ inputTokens, outputTokens, pricing: getModelPricing(model) });
      estimatedInputCost = costs.inputCostUsd;
      estimatedOutputCost = costs.outputCostUsd;
      if (estimatedCost !== null && estimatedCost > config.plannerMaxEstimatedCostUsd) {
        fallbackReason = "BUDGET_EXCEEDED";
        warnings.push("AI planning estimate exceeded the configured planning budget; deterministic baseline was used.");
      } else {
        plannerOutput = result.value;
      }
      log("planning_ai_request_completed", {
        auditId: payload.auditId,
        provider,
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimatedCost,
        durationMs: result.durationMs
      });
    } catch (error) {
      fallbackReason = fallbackFromProviderError(error);
      warnings.push("AI planning was unavailable, so the standard deterministic plan was used.");
      logError("planning_ai_request_failed", { auditId: payload.auditId, fallbackReason, error: safeFailureMessage(error) });
    }
  }

  const merged = mergePlannerOutput({
    targetUrl: payload.targetUrl,
    baselineMissions: baseline,
    missionContext,
    plannerOutput,
    limits: {
      maxProposedMissions: config.plannerMaxProposedMissions,
      maxPriorityRoutes: config.plannerMaxPriorityRoutes,
      maxPages: config.missionMaxPages,
      maxLinks: config.missionMaxLinks,
      maxInteractions: config.missionMaxInteractions
    },
    allowedMissionTypes: baseline.map((mission) => mission.type)
  });
  if (merged.rejectedProposals.length > 0) {
    warnings.push(`${merged.rejectedProposals.length} AI planner proposal(s) were rejected by policy.`);
  }

  const source = plannerOutput ? (provider === "mock" ? "mock" : "anthropic") : "deterministic";
  const status = fallbackReason ? "fallback" : "completed";
  await upsertAuditPlan({
    auditId: payload.auditId,
    mode: config.auditPlanningMode,
    source,
    status,
    provider,
    model,
    promptId,
    promptVersion,
    baselinePlanJson: baseline,
    snapshotJson: snapshot,
    proposedPlanJson: plannerOutput,
    acceptedPlanJson: merged.acceptedProposals,
    rejectedProposalsJson: merged.rejectedProposals,
    importantJourneysJson: merged.importantJourneys,
    websiteClassification: plannerOutput?.websiteClassification.primaryType ?? null,
    classificationConfidence: plannerOutput?.websiteClassification.confidence ?? null,
    inputTokens,
    outputTokens,
    estimatedInputCost,
    estimatedOutputCost,
    estimatedCost,
    durationMs: Date.now() - startedAt,
    fallbackReason,
    warningsJson: [...warnings, ...merged.warnings]
  });

  const missions = await persistMissionPlan({ auditId: payload.auditId, missions: merged.finalMissions });
  await throwIfAuditCancelled(payload.auditId);
  await transitionAuditStatus(payload.auditId, "queued");
  const queue = createAuditQueue(config.redisUrl);
  try {
    for (const mission of missions) {
      await markMissionQueued(mission.id);
      await enqueueMission(queue, {
        auditId: payload.auditId,
        missionId: mission.id,
        missionType: missionTypeSchema.parse(mission.type),
        targetUrl: payload.targetUrl,
        correlationId: payload.correlationId,
        missionContext
      });
    }
  } finally {
    await queue.close();
  }
  log("planning_completed", {
    auditId: payload.auditId,
    mode: config.auditPlanningMode,
    source,
    status,
    acceptedMissionCount: merged.finalMissions.length,
    rejectedProposalCount: merged.rejectedProposals.length,
    fallbackReason
  });
  return { auditId: payload.auditId, status, missionCount: missions.length };
}

async function runWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new Error(`Mission timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function runMissionJob(job: Job<ExecuteMissionJob>) {
  const payload = executeMissionJobSchema.parse(job.data);
  const definition = getMissionDefinition(payload.missionType);
  const startedAt = Date.now();
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let browserSessionId: string | undefined;
  let finalUrl: string | undefined;

  log("worker_job_started", { jobId: job.id, auditId: payload.auditId, missionId: payload.missionId, missionType: payload.missionType });

  try {
    await getAuditSummary(payload.auditId);
    await throwIfAuditCancelled(payload.auditId);
    await transitionAuditStatus(payload.auditId, "running");
    await markMissionRunning(payload.missionId);
    await throwIfAuditCancelled(payload.auditId);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: definition.viewport });
    const page = await context.newPage();
    const artifactDir = join(config.auditArtifactsDir, payload.auditId, payload.missionId);
    await mkdir(artifactDir, { recursive: true });
    browserSessionId = (
      await createBrowserSession({
        missionId: payload.missionId,
        browser: "chromium",
        viewportWidth: definition.viewport.width,
        viewportHeight: definition.viewport.height
      })
    ).id;

    const result = await runWithTimeout(
      executors[payload.missionType]({
        auditId: payload.auditId,
        missionId: payload.missionId,
        missionType: payload.missionType,
        targetUrl: payload.targetUrl,
        missionContext: sanitizeAuditMissionContext(payload.missionContext),
        definition,
        page,
        browser,
        artifactDir,
        checkCancellation: () => throwIfAuditCancelled(payload.auditId)
      }),
      definition.timeoutMs
    );
    await throwIfAuditCancelled(payload.auditId);
    finalUrl = page.url();
    await persistFindings(payload.auditId, dedupeByFingerprint(result.findings));
    await uploadAuditEvidence(payload.auditId);
    await completeBrowserSessionWithDuration({ browserSessionId, finalUrl, browserDurationMs: Date.now() - startedAt });
    await markMissionCompleted(payload.missionId, {
      resultSummary: `${result.summary} Findings: ${result.findings.length}. Observations: ${result.observations}.`
    });
    const finalization = await finalizeAuditIfReady(payload.auditId);
    log("mission_completed", {
      auditId: payload.auditId,
      missionId: payload.missionId,
      missionType: payload.missionType,
      findings: result.findings.length,
      finalized: finalization.finalized
    });
    if (finalization.finalized && (finalization.status === "completed" || finalization.status === "failed" || finalization.status === "cancelled")) {
      const workspaceId = await getAuditWorkspaceId(payload.auditId).catch(() => null);
      if (workspaceId) {
        await recordUsageEvent({
          workspaceId,
          auditId: payload.auditId,
          type: finalization.status === "completed" ? "AUDIT_COMPLETED" : finalization.status === "failed" ? "AUDIT_FAILED" : "AUDIT_CANCELLED",
          idempotencyKey: `audit-terminal:${payload.auditId}:${finalization.status}`
        }).catch((error) => logError("usage.audit_terminal_failed", { auditId: payload.auditId, error: safeFailureMessage(error) }));
      }
    }
    return { auditId: payload.auditId, missionId: payload.missionId, status: "completed", findings: result.findings.length };
  } catch (error) {
    if (error instanceof AuditCancelledError) {
      const reason = error.reason;
      log("mission_cancelled", { auditId: payload.auditId, missionId: payload.missionId, missionType: payload.missionType });
      if (browserSessionId) {
        await completeBrowserSessionWithDuration({
          browserSessionId,
          browserDurationMs: Date.now() - startedAt,
          failed: true,
          ...(finalUrl ? { finalUrl } : {})
        }).catch(() => undefined);
      }
      await markMissionCancelled(payload.missionId, reason).catch(() => undefined);
      const finalization = await finalizeCancelledAudit(payload.auditId, reason).catch(() => ({ finalized: false, status: "cancelled" as const }));
      if (finalization.finalized && finalization.status === "cancelled") {
        const workspaceId = await getAuditWorkspaceId(payload.auditId).catch(() => null);
        if (workspaceId) {
          await recordUsageEvent({
            workspaceId,
            auditId: payload.auditId,
            type: "AUDIT_CANCELLED",
            idempotencyKey: `audit-terminal:${payload.auditId}:cancelled`
          }).catch((usageError) => logError("usage.audit_cancelled_failed", { auditId: payload.auditId, error: safeFailureMessage(usageError) }));
        }
      }
      return { auditId: payload.auditId, missionId: payload.missionId, status: "cancelled" };
    }
    const failureReason = safeFailureMessage(error);
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? definition.maxAttempts);
    logError("mission_failed", {
      auditId: payload.auditId,
      missionId: payload.missionId,
      missionType: payload.missionType,
      finalAttempt,
      error: failureReason
    });
    if (browserSessionId) {
      await completeBrowserSessionWithDuration({
        browserSessionId,
        browserDurationMs: Date.now() - startedAt,
        failed: true,
        ...(finalUrl ? { finalUrl } : {})
      }).catch(() => undefined);
    }
    await markMissionFailed(payload.missionId, failureReason).catch(() => undefined);
    if (!finalAttempt) {
      await markMissionQueued(payload.missionId).catch(() => undefined);
    } else {
      await finalizeAuditIfReady(payload.auditId).catch(() => undefined);
    }
    throw error;
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}

async function uploadAuditEvidence(auditId: string) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    log("evidence.storage.skipped", { auditId, reason: "supabase_storage_not_configured" });
    return;
  }
  const storage = new SupabaseStorageProvider({
    supabaseUrl: config.supabaseUrl,
    serviceKey: config.supabaseServiceRoleKey,
    bucket: config.supabaseStorageBucket,
    maxBytes: config.evidenceMaxBytes
  });
  const evidence = await listUnstoredLocalEvidenceForAudit(auditId);
  for (const item of evidence) {
    if (!item.localPath || item.type !== "screenshot") continue;
    try {
      const body = new Uint8Array(await readFile(item.localPath));
      const contentType = detectEvidenceContentType(item.localPath, body);
      const key = buildEvidenceStorageKey({
        workspaceId: item.finding.audit.project.organizationId,
        auditId,
        findingId: item.findingId,
        evidenceId: item.id,
        extension: extensionForContentType(contentType)
      });
      const stored = await storage.putObject(key, body, contentType);
      await markEvidenceStored({
        evidenceId: item.id,
        storageProvider: "supabase",
        storageBucket: stored.bucket ?? config.supabaseStorageBucket,
        storagePath: stored.key,
        storageContentType: stored.contentType ?? contentType,
        storageSizeBytes: stored.sizeBytes ?? body.byteLength
      });
      log("evidence.storage.uploaded", { auditId, evidenceId: item.id, storageProvider: "supabase" });
    } catch (error) {
      logError("evidence.storage.failed", {
        auditId,
        evidenceId: item.id,
        error: safeFailureMessage(error)
      });
    }
  }
  const workspaceId = evidence[0]?.finding.audit.project.organizationId;
  if (workspaceId) {
    await markEvidenceRetentionForAudit({ auditId, workspaceId }).catch((error) => {
      logError("evidence.retention.mark_failed", { auditId, error: safeFailureMessage(error) });
    });
  }
}

async function runRetentionCleanupJob(job: Job<unknown>) {
  const startedAt = Date.now();
  if (!config.evidenceRetentionCleanupEnabled) {
    log("retention.cleanup.skipped", { jobId: job.id, reason: "disabled" });
    return { deletedCount: 0, failedCount: 0, skipped: true };
  }
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    log("retention.cleanup.skipped", { jobId: job.id, reason: "supabase_storage_not_configured" });
    return { deletedCount: 0, failedCount: 0, skipped: true };
  }
  const claimed = await claimEvidenceDueForDeletion({ batchSize: config.evidenceRetentionCleanupBatchSize });
  let deletedCount = 0;
  let failedCount = 0;
  const providers = new Map<string, SupabaseStorageProvider>();

  for (const evidence of claimed) {
    if (evidence.storageProvider !== "supabase" || !evidence.storageBucket || !evidence.storagePath) {
      await markEvidenceDeleted(evidence.id);
      deletedCount += 1;
      continue;
    }
    const providerKey = evidence.storageBucket;
    const storage =
      providers.get(providerKey) ??
      new SupabaseStorageProvider({
        supabaseUrl: config.supabaseUrl,
        serviceKey: config.supabaseServiceRoleKey,
        bucket: evidence.storageBucket,
        maxBytes: config.evidenceMaxBytes
      });
    providers.set(providerKey, storage);
    try {
      await storage.deleteObject(evidence.storagePath);
      await markEvidenceDeleted(evidence.id);
      deletedCount += 1;
    } catch (error) {
      failedCount += 1;
      await markEvidenceDeletionFailed({ evidenceId: evidence.id, errorMessage: safeFailureMessage(error) }).catch(() => undefined);
      logError("retention.cleanup.evidence_failed", { evidenceId: evidence.id, error: safeFailureMessage(error) });
    }
  }

  log("retention.cleanup.completed", {
    jobId: job.id,
    claimedCount: claimed.length,
    deletedCount,
    failedCount,
    durationMs: Date.now() - startedAt
  });
  return { deletedCount, failedCount, claimedCount: claimed.length };
}

async function runQueueJob(job: Job<AuditQueueJob>) {
  try {
    if (job.name === "plan-audit") {
      return runPlanningJob(job);
    }
    return runMissionJob(job as Job<ExecuteMissionJob>);
  } catch (error) {
    if (error instanceof AuditCancelledError) {
      const auditId = job.data.auditId;
      await finalizeCancelledAudit(auditId, error.reason).catch(() => undefined);
      return { auditId, status: "cancelled" };
    }
    throw error;
  }
}

const worker = new Worker<AuditQueueJob>(AUDIT_QUEUE_NAME, runQueueJob, {
  connection: { url: config.redisUrl },
  concurrency: config.missionWorkerConcurrency
});

async function runGitHubExportJob(job: Job<unknown>) {
  const payload = githubExportJobSchema.parse(job.data);
  const startedAt = Date.now();
  const appConfigured = Boolean(config.githubAppId && config.githubAppClientId && config.githubAppPrivateKey);
  const provider = createGitHubProvider({ appConfigured, mock: config.githubExportMock, appId: config.githubAppId, privateKey: config.githubAppPrivateKey });
  log("github.export.started", { batchId: payload.batchId, workspaceId: payload.workspaceId });
  await markGitHubExportBatchRunning(payload.batchId);
  const batch = await getGitHubExportBatch(payload.batchId, { workspaceId: payload.workspaceId });
  const [owner, repo] = batch.repository.fullName.split("/");
  if (!owner || !repo) {
    throw new Error("GitHub repository full name is invalid.");
  }

  for (const item of batch.exports) {
    if (item.status === "CREATED" && item.githubIssueUrl) {
      log("github.issue.skipped", { batchId: batch.id, findingId: item.findingId, reason: "already_created" });
      continue;
    }
    await markFindingGitHubExportCreating(item.id);
    const finding = toIssueFinding(item.finding);
    const exportOptions = (batch.exportOptionsJson && typeof batch.exportOptionsJson === "object" ? batch.exportOptionsJson : {}) as {
      labelNames?: string[];
      assignees?: string[];
      milestoneNumber?: number;
      includeExternalEvidence?: boolean;
    };
    const draft = buildIssueDraft({
      finding,
      auditDate: batch.createdAt.toISOString(),
      toolVersion: "0.1.0",
      ...(exportOptions.labelNames ? { labelNames: exportOptions.labelNames } : {}),
      ...(exportOptions.assignees ? { assignees: exportOptions.assignees } : {}),
      ...(typeof exportOptions.milestoneNumber === "number" ? { milestoneNumber: exportOptions.milestoneNumber } : {}),
      ...(exportOptions.includeExternalEvidence ? { evidenceBaseUrl: `${config.appUrl.replace(/\/$/, "")}/evidence` } : {})
    });
    try {
      const marker = extractFindingMarker(draft.body);
      if (marker && provider.findIssueByMarker) {
        const existing = await provider.findIssueByMarker({
          owner,
          repo,
          marker,
          installationId: batch.githubConnection.installationId
        });
        if (existing) {
          await markFindingGitHubExportSkipped({
            exportId: item.id,
            issueNumber: existing.number,
            issueUrl: existing.url,
            reason: "Existing GitHub issue with AISwarmQA finding marker was reused."
          });
          continue;
        }
      }
      const issue = await provider.createIssue({
        owner,
        repo,
        idempotencyKey: item.idempotencyKey,
        installationId: batch.githubConnection.installationId,
        ...draft
      });
      await markFindingGitHubExportCreated({ exportId: item.id, issueNumber: issue.number, issueUrl: issue.url });
      await recordUsageEvent({
        workspaceId: batch.githubConnection.workspaceId,
        userId: batch.createdByUserId,
        auditId: batch.auditId,
        type: "GITHUB_ISSUE_EXPORTED",
        idempotencyKey: `github-issue-created:${item.id}`
      }).catch((error) => logError("usage.github_issue_failed", { batchId: batch.id, exportId: item.id, error: safeFailureMessage(error) }));
      log("github.issue.created", {
        batchId: batch.id,
        auditId: batch.auditId,
        findingId: item.findingId,
        repository: batch.repository.fullName,
        githubIssueNumber: issue.number
      });
    } catch (error) {
      const code = error instanceof GitHubProviderError ? error.code : "GITHUB_EXPORT_FAILED";
      const retryable = error instanceof GitHubProviderError ? error.retryable : false;
      await markFindingGitHubExportFailed({
        exportId: item.id,
        errorCode: code,
        errorMessage: safeFailureMessage(error)
      });
      logError("github.issue.failed", {
        batchId: batch.id,
        auditId: batch.auditId,
        findingId: item.findingId,
        repository: batch.repository.fullName,
        errorCategory: code,
        retryable
      });
      if (retryable) {
        throw error;
      }
    }
  }

  const finalized = await finalizeGitHubExportBatch(batch.id);
  log("github.export.completed", {
    batchId: batch.id,
    status: finalized.status.toLowerCase(),
    createdCount: finalized.createdCount,
    failedCount: finalized.failedCount,
    skippedCount: finalized.skippedCount,
    durationMs: Date.now() - startedAt
  });
  return { batchId: batch.id, status: finalized.status.toLowerCase() };
}

const githubExportWorker = new Worker(GITHUB_EXPORT_QUEUE_NAME, runGitHubExportJob, {
  connection: { url: config.redisUrl },
  concurrency: 1
});

const retentionCleanupWorker = new Worker(RETENTION_CLEANUP_QUEUE_NAME, runRetentionCleanupJob, {
  connection: { url: config.redisUrl },
  concurrency: 1
});

async function ensureScheduledJobs() {
  if (!config.evidenceRetentionCleanupEnabled) return;
  const queue = createRetentionCleanupQueue(config.redisUrl);
  try {
    await scheduleRetentionCleanup(queue);
    log("retention.cleanup.scheduled", { queue: RETENTION_CLEANUP_QUEUE_NAME });
  } catch (error) {
    logError("retention.cleanup.schedule_failed", { error: safeFailureMessage(error) });
  } finally {
    await queue.close().catch(() => undefined);
  }
}

void ensureScheduledJobs();

worker.on("completed", (job) => {
  log("worker_job_completed", {
    jobId: job.id,
    name: job.name,
    auditId: job.data.auditId,
    missionId: "missionId" in job.data ? job.data.missionId : undefined,
    missionType: "missionType" in job.data ? job.data.missionType : undefined
  });
});

worker.on("failed", (job, error) => {
  logError("worker_job_failed", {
    jobId: job?.id,
    name: job?.name,
    auditId: job?.data.auditId,
    missionId: job?.data && "missionId" in job.data ? job.data.missionId : undefined,
    missionType: job?.data && "missionType" in job.data ? job.data.missionType : undefined,
    error: error.message
  });
});

log("worker_started", { queue: AUDIT_QUEUE_NAME, concurrency: config.missionWorkerConcurrency });
log("github_export_worker_started", { queue: GITHUB_EXPORT_QUEUE_NAME, concurrency: 1 });
log("retention_cleanup_worker_started", { queue: RETENTION_CLEANUP_QUEUE_NAME, concurrency: 1 });
