import Anthropic from "@anthropic-ai/sdk";
import {
  browserAgentActionSchema,
  type BrowserAgentAction,
  type BrowserAgentDecisionInput,
  type ModelPricing,
  type PlannerInput,
  type PlannerOutput,
  plannerOutputSchema
} from "@ai-swarm-qa/shared";
import { z } from "zod";
import { browserAgentPromptV1 } from "./prompts/browser-agent";
import { plannerPromptV1, type PromptDefinition } from "./prompts/planner";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type AIProviderErrorCode =
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "CONTEXT_TOO_LARGE"
  | "CONTENT_REJECTED"
  | "CONFIGURATION"
  | "UNKNOWN";

export class AIProviderError extends Error {
  constructor(
    readonly code: AIProviderErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export interface AiGenerationRequest {
  messages: AiMessage[];
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, string>;
}

export interface AiGenerationResult {
  text: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  requestId: string | null;
  durationMs: number;
}

export type StructuredGenerationResult<T> = AiGenerationResult & {
  value: T;
  estimatedCostUsd: number | null;
};

export interface AiProvider {
  readonly name: string;
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>;
  healthCheck?(): Promise<{ ok: boolean; provider: string; model: string | null; latencyMs: number | null; errorCode?: AIProviderErrorCode }>;
}

export type ProviderRuntimeOptions = {
  aiProvider: "mock" | "anthropic";
  apiKey?: string | undefined;
  defaultModel: string;
  maxAttempts: number;
  initialBackoffMs: number;
  timeoutMs: number;
  fallbackToMock: boolean;
};

export type MockPlannerScenario =
  | "success"
  | "timeout"
  | "malformed"
  | "unsupported-mission"
  | "over-budget"
  | "rate-limit"
  | "empty"
  | "unsafe-route";

export type MockBrowserAgentScenario =
  | "success"
  | "unsafe-click"
  | "external-navigation"
  | "stale-target"
  | "repeated-action"
  | "invalid-schema"
  | "provider-timeout"
  | "empty-response"
  | "invalid-evidence"
  | "endless-inspect"
  | "finish-immediately"
  | "safety-sequence";

export type BrowserAgentDecisionResult = {
  action: BrowserAgentAction;
  provider: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  durationMs: number;
  requestId: string | null;
  promptId: string;
  promptVersion: string;
};

export interface BrowserDecisionProvider {
  decide(input: BrowserAgentDecisionInput): Promise<BrowserAgentDecisionResult>;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) {
    return operation;
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => reject(new AIProviderError("TIMEOUT", `Provider timed out after ${timeoutMs}ms.`)), timeoutMs);
  });
  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function mockPlannerOutput(scenario: MockPlannerScenario): unknown {
  if (scenario === "malformed") {
    return "{not-json";
  }
  if (scenario === "empty") {
    return "";
  }
  if (scenario === "unsupported-mission") {
    return {
      websiteClassification: { primaryType: "ecommerce", confidence: 0.8, reasoningSummary: "Fixture has checkout signals." },
      importantJourneys: [],
      proposedMissions: [{ type: "payment-tester", priority: 1, reason: "Unsupported by policy.", targetRoutes: ["/"], suggestedLimits: {} }],
      planningWarnings: [],
      limitations: []
    };
  }
  if (scenario === "unsafe-route") {
    return {
      websiteClassification: { primaryType: "ecommerce", confidence: 0.8, reasoningSummary: "Fixture has checkout signals." },
      importantJourneys: [{ name: "External checkout", description: "Unsafe external route.", priority: "high", routes: ["https://evil.example/pay"] }],
      proposedMissions: [
        {
          type: "interaction-tester",
          priority: 1,
          reason: "Unsafe external route should be rejected.",
          targetRoutes: ["https://evil.example/pay"],
          suggestedLimits: { maxInteractions: 100 }
        }
      ],
      planningWarnings: ["External route was visible in mock output."],
      limitations: []
    };
  }
  return {
    websiteClassification: { primaryType: "ecommerce", confidence: 0.86, reasoningSummary: "Checkout, pricing, and newsletter signals are visible." },
    importantJourneys: [
      { name: "Start checkout", description: "Visitor clicks Checkout from the landing page.", priority: "high", routes: ["/"] },
      { name: "Join newsletter", description: "Visitor enters an email into the newsletter form.", priority: "medium", routes: ["/"] }
    ],
    proposedMissions: [
      {
        type: "interaction-tester",
        priority: 12,
        reason: "Checkout is a primary visible journey and should run earlier.",
        targetRoutes: ["/"],
        suggestedLimits: { maxInteractions: 5 }
      },
      {
        type: "form-tester",
        priority: 18,
        reason: "Newsletter form is visible and should be prioritized.",
        targetRoutes: ["/"],
        suggestedLimits: { maxPages: 1 }
      }
    ],
    planningWarnings: [],
    limitations: ["Only the sanitized planning snapshot was inspected."]
  };
}

export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  constructor(private readonly options: { scenario?: MockPlannerScenario | undefined } = {}) {}

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const startedAt = Date.now();
    const scenario = this.options.scenario ?? "success";
    if (scenario === "timeout") {
      throw new AIProviderError("TIMEOUT", "Mock planner timeout.");
    }
    if (scenario === "rate-limit") {
      throw new AIProviderError("RATE_LIMIT", "Mock planner rate limit.");
    }
    const value = mockPlannerOutput(scenario);
    const inputTokens = scenario === "over-budget" ? 500_000 : 800;
    const outputTokens = scenario === "over-budget" ? 500_000 : 350;
    return {
      text: typeof value === "string" ? value : JSON.stringify(value),
      provider: "mock",
      model: request.model ?? "mock-planner",
      inputTokens,
      outputTokens,
      finishReason: "end_turn",
      requestId: "mock-request",
      durationMs: Date.now() - startedAt
    };
  }

  async healthCheck() {
    return { ok: true, provider: this.name, model: "mock-planner", latencyMs: 0 };
  }
}

function findTarget(input: BrowserAgentDecisionInput, matcher: (text: string, target: BrowserAgentDecisionInput["currentObservation"]["targets"][number]) => boolean) {
  return input.currentObservation.targets.find((target) => {
    const text = `${target.text ?? ""} ${target.accessibleName ?? ""} ${target.href ?? ""}`.toLowerCase();
    return matcher(text, target);
  });
}

function browserActionForScenario(input: BrowserAgentDecisionInput, scenario: MockBrowserAgentScenario): unknown {
  const history = input.recentHistory;
  const sequence = history.length + 1;

  if (scenario === "invalid-schema") {
    return { tool: "execute", script: "alert(1)", reason: "Invalid mock action." };
  }
  if (scenario === "empty-response") {
    return null;
  }
  if (scenario === "provider-timeout") {
    throw new AIProviderError("TIMEOUT", "Mock browser agent timeout.");
  }
  if (scenario === "finish-immediately") {
    return { tool: "finish", summary: "Mock agent finished immediately.", reason: "Scenario requested immediate finish." };
  }
  if (scenario === "external-navigation") {
    return { tool: "navigate", targetUrl: "https://example.com/outside", reason: "Exercise same-origin blocking." };
  }
  if (scenario === "stale-target") {
    return { tool: "click", targetId: "element-999", reason: "Exercise stale target rejection." };
  }
  if (scenario === "unsafe-click") {
    const target = findTarget(input, (text) => /delete|remove|checkout|pay|buy|purchase|logout|sign out/.test(text));
    return { tool: "click", targetId: target?.id ?? "element-999", reason: "Exercise unsafe click rejection." };
  }
  if (scenario === "invalid-evidence") {
    return {
      tool: "report_finding",
      reason: "Exercise invalid evidence rejection.",
      finding: {
        title: "Unsupported mock finding",
        description: "This finding references missing evidence.",
        category: "functional",
        severity: "medium",
        evidenceStepIds: ["missing-step"]
      }
    };
  }
  if (scenario === "endless-inspect") {
    return { tool: "inspect", reason: "Repeat inspection for no-progress testing." };
  }
  if (scenario === "repeated-action") {
    const target = findTarget(input, (text) => text.includes("agent lab"));
    return target
      ? { tool: "click", targetId: target.id, reason: "Repeat the same safe action." }
      : { tool: "inspect", reason: "No repeat target is available." };
  }
  if (scenario === "safety-sequence") {
    if (sequence === 1) {
      return { tool: "navigate", targetUrl: "https://example.com/outside", reason: "Exercise external navigation rejection." };
    }
    if (sequence === 2) {
      const target = findTarget(input, (text) => text.includes("delete"));
      return { tool: "click", targetId: target?.id ?? "element-999", reason: "Exercise destructive click rejection." };
    }
    if (sequence === 3) {
      const target = findTarget(input, (_text, target) => target.type === "password");
      return { tool: "fill", targetId: target?.id ?? "element-999", valueKind: "synthetic-text", reason: "Exercise password fill rejection." };
    }
    const target = findTarget(input, (text) => /checkout|buy|pay|purchase/.test(text));
    return { tool: "click", targetId: target?.id ?? "element-999", reason: "Exercise purchase click rejection." };
  }

  const url = new URL(input.currentObservation.url);
  const didTool = (tool: BrowserAgentAction["tool"]) => history.some((item) => item.proposedTool === tool);
  const didOutcome = (pattern: RegExp) => history.some((item) => pattern.test(item.outcome));
  if (!didTool("inspect")) {
    return { tool: "inspect", reason: "Start with a fresh bounded observation." };
  }
  if (!url.pathname.startsWith("/agent-lab")) {
    const target = findTarget(input, (text) => text.includes("agent lab"));
    return target
      ? { tool: "click", targetId: target.id, reason: "Open the safe same-origin autonomous test journey." }
      : { tool: "navigate", targetUrl: "/agent-lab", reason: "Navigate to the safe autonomous test journey." };
  }
  if (!didTool("fill")) {
    const target = findTarget(input, (_text, target) => ["text", "search", null].includes(target.type));
    if (target) {
      return { tool: "fill", targetId: target.id, valueKind: "synthetic-search", reason: "Fill a safe non-sensitive field with server-generated data." };
    }
  }
  if (!didOutcome(/preview demo/i)) {
    const target = findTarget(input, (text) => text.includes("preview demo"));
    if (target) {
      return { tool: "click", targetId: target.id, reason: "Exercise a safe demo control and observe whether it progresses." };
    }
  }
  if (!didTool("report_finding") && /demo preview failed|stalled/i.test(input.currentObservation.visibleText)) {
    const lastEvidenceStep = history.length > 0 ? `step-${history[history.length - 1]?.stepNumber}` : "step-1";
    return {
      tool: "report_finding",
      reason: "A visible stalled demo state is present after a safe interaction.",
      finding: {
        title: "Demo preview control does not progress",
        description: "Clicking the safe demo preview control leaves the journey in a visible stalled error state instead of progressing.",
        category: "functional",
        severity: "medium",
        evidenceStepIds: [lastEvidenceStep]
      }
    };
  }
  if (!didTool("screenshot")) {
    return { tool: "screenshot", scope: "viewport", reason: "Capture final visual evidence for replay." };
  }
  return { tool: "finish", summary: "Mock autonomous exploration completed within safety budgets.", reason: "The safe journey was explored and findings were reported." };
}

export class MockBrowserDecisionProvider implements BrowserDecisionProvider {
  constructor(private readonly options: { scenario?: MockBrowserAgentScenario | undefined } = {}) {}

  async decide(input: BrowserAgentDecisionInput): Promise<BrowserAgentDecisionResult> {
    const startedAt = Date.now();
    const scenario = this.options.scenario ?? "success";
    const rawAction = browserActionForScenario(input, scenario);
    const action = browserAgentActionSchema.parse(rawAction);
    const inputTokens = Math.ceil(JSON.stringify(input).length / 4);
    const outputTokens = Math.ceil(JSON.stringify(action).length / 4);
    return {
      action,
      provider: "mock",
      model: `mock-browser-agent:${scenario}`,
      inputTokens,
      outputTokens,
      estimatedCostUsd: 0,
      durationMs: Date.now() - startedAt,
      requestId: `mock-browser-agent-${input.runId}-${input.currentObservation.stepNumber}`,
      promptId: browserAgentPromptV1.id,
      promptVersion: browserAgentPromptV1.version
    };
  }
}

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly defaultModel: string;

  constructor(options: { apiKey: string; defaultModel: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.defaultModel = options.defaultModel;
  }

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const startedAt = Date.now();
    return withTimeout(this.generateWithoutTimeout(request, startedAt), request.timeoutMs);
  }

  private async generateWithoutTimeout(request: AiGenerationRequest, startedAt: number): Promise<AiGenerationResult> {
    try {
      const systemMessage = request.messages.find((message) => message.role === "system");
      const nonSystemMessages = request.messages.filter((message) => message.role !== "system");
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: request.model ?? this.defaultModel,
        max_tokens: request.maxTokens ?? 1000,
        messages: nonSystemMessages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content
        }))
      };

      if (systemMessage) {
        params.system = systemMessage.content;
      }

      const response = await this.client.messages.create(params);
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();

      return {
        text,
        provider: "anthropic",
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        finishReason: response.stop_reason,
        requestId: response.id,
        durationMs: Date.now() - startedAt
      };
    } catch (error) {
      throw normalizeAnthropicError(error);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; provider: string; model: string | null; latencyMs: number | null; errorCode?: AIProviderErrorCode }> {
    const startedAt = Date.now();
    try {
      await this.generate({
        model: this.defaultModel,
        maxTokens: 8,
        timeoutMs: 5000,
        messages: [
          { role: "system", content: "Return only JSON." },
          { role: "user", content: "{\"ok\":true}" }
        ]
      });
      return { ok: true, provider: this.name, model: this.defaultModel, latencyMs: Date.now() - startedAt };
    } catch (error) {
      const normalized = normalizeAnthropicError(error);
      return { ok: false, provider: this.name, model: this.defaultModel, latencyMs: Date.now() - startedAt, errorCode: normalized.code };
    }
  }
}

export class AnthropicAiProvider extends AnthropicProvider {}

export function normalizeAnthropicError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) {
    return error;
  }
  const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: number }).status) : undefined;
  const message = error instanceof Error ? error.message : "Unknown Anthropic provider error.";
  if (status === 401 || status === 403) {
    return new AIProviderError("AUTHENTICATION", "Anthropic authentication failed.");
  }
  if (status === 429) {
    return new AIProviderError("RATE_LIMIT", "Anthropic rate limit reached.");
  }
  if (status === 400 && /context|token/i.test(message)) {
    return new AIProviderError("CONTEXT_TOO_LARGE", "Anthropic rejected the context size.");
  }
  if (status === 400 || status === 404) {
    return new AIProviderError("CONFIGURATION", `Anthropic request was rejected by configuration${status ? ` with status ${status}` : ""}.`);
  }
  if (status && status >= 500) {
    return new AIProviderError("UNAVAILABLE", "Anthropic is temporarily unavailable.");
  }
  return new AIProviderError("UNKNOWN", `Anthropic request failed${status ? ` with status ${status}` : ""}.`);
}

function isRetryableProviderError(error: unknown): boolean {
  return error instanceof AIProviderError && ["RATE_LIMIT", "TIMEOUT", "UNAVAILABLE", "UNKNOWN", "INVALID_RESPONSE"].includes(error.code);
}

export async function withProviderRetries<T>(
  operation: (attempt: number) => Promise<T>,
  options: { maxAttempts: number; initialBackoffMs: number; shouldRetry?: (error: unknown) => boolean }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retryable = options.shouldRetry ? options.shouldRetry(error) : isRetryableProviderError(error);
      if (!retryable || attempt >= options.maxAttempts) {
        break;
      }
      const backoffMs = options.initialBackoffMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

export function recoverJsonText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  if (candidate.startsWith("{") || candidate.startsWith("[")) {
    const lastObject = candidate.lastIndexOf("}");
    const lastArray = candidate.lastIndexOf("]");
    const end = Math.max(lastObject, lastArray);
    return end >= 0 ? candidate.slice(0, end + 1) : candidate;
  }
  const objectStart = candidate.indexOf("{");
  const arrayStart = candidate.indexOf("[");
  const starts = [objectStart, arrayStart].filter((index) => index >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  if (start < 0) return candidate;
  const lastObject = candidate.lastIndexOf("}");
  const lastArray = candidate.lastIndexOf("]");
  const end = Math.max(lastObject, lastArray);
  return end >= start ? candidate.slice(start, end + 1) : candidate.slice(start);
}

export async function generateStructured<T>(input: {
  provider: AiProvider;
  schema: z.ZodType<T>;
  messages: AiMessage[];
  model: string;
  maxTokens: number;
  timeoutMs: number;
  pricing: ModelPricing;
  retry?: { maxAttempts: number; initialBackoffMs: number } | undefined;
}): Promise<StructuredGenerationResult<T>> {
  return withProviderRetries(
    async () => {
      const result = await input.provider.generate({
        messages: input.messages,
        model: input.model,
        maxTokens: input.maxTokens,
        timeoutMs: input.timeoutMs
      });
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(recoverJsonText(result.text));
      } catch {
        throw new AIProviderError("INVALID_RESPONSE", "Provider returned invalid JSON.");
      }
      const parsed = input.schema.safeParse(parsedJson);
      if (!parsed.success) {
        throw new AIProviderError("INVALID_RESPONSE", "Provider returned JSON that did not match the expected schema.");
      }
      const estimatedCostUsd =
        result.inputTokens === null || result.outputTokens === null
          ? null
          : (result.inputTokens * input.pricing.inputUsdPerMillionTokens + result.outputTokens * input.pricing.outputUsdPerMillionTokens) / 1_000_000;
      return { ...result, value: parsed.data, estimatedCostUsd };
    },
    input.retry ?? { maxAttempts: 1, initialBackoffMs: 250 }
  );
}

export function getPlannerModel(input: { anthropicPlannerModel: string; aiFastModel: string }): string {
  return input.anthropicPlannerModel || input.aiFastModel;
}

export function getModelPricing(_model: string): ModelPricing {
  return {
    inputUsdPerMillionTokens: 3,
    outputUsdPerMillionTokens: 15
  };
}

export function createAiProvider(options: ProviderRuntimeOptions & { mockScenario?: MockPlannerScenario | undefined }): AiProvider {
  if (options.aiProvider === "anthropic" && options.apiKey) {
    return new AnthropicProvider({ apiKey: options.apiKey, defaultModel: options.defaultModel });
  }
  return new MockAiProvider({ scenario: options.mockScenario });
}

export async function runPlannerPrompt(input: {
  provider: AiProvider;
  plannerInput: PlannerInput;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  prompt?: PromptDefinition;
  retry?: { maxAttempts: number; initialBackoffMs: number } | undefined;
}): Promise<StructuredGenerationResult<PlannerOutput> & { promptId: string; promptVersion: string }> {
  const prompt = input.prompt ?? plannerPromptV1;
  const pricing = getModelPricing(input.model);
  const result = await generateStructured({
    provider: input.provider,
    schema: plannerOutputSchema,
    messages: [
      { role: "system", content: prompt.buildSystemPrompt() },
      { role: "user", content: prompt.buildUserPrompt(input.plannerInput) }
    ],
    model: input.model,
    maxTokens: input.maxTokens,
    timeoutMs: input.timeoutMs,
    pricing,
    retry: input.retry
  });
  return { ...result, promptId: prompt.id, promptVersion: prompt.version };
}

export class AnthropicBrowserDecisionProvider implements BrowserDecisionProvider {
  constructor(private readonly options: { provider: AiProvider; model: string; maxTokens: number; timeoutMs: number; retry?: { maxAttempts: number; initialBackoffMs: number } | undefined }) {}

  async decide(input: BrowserAgentDecisionInput): Promise<BrowserAgentDecisionResult> {
    const pricing = getModelPricing(this.options.model);
    const result = await generateStructured({
      provider: this.options.provider,
      schema: browserAgentActionSchema,
      messages: [
        { role: "system", content: browserAgentPromptV1.buildSystemPrompt() },
        { role: "user", content: browserAgentPromptV1.buildUserPrompt(input) }
      ],
      model: this.options.model,
      maxTokens: this.options.maxTokens,
      timeoutMs: this.options.timeoutMs,
      pricing,
      retry: this.options.retry
    });
    return {
      action: result.value,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      durationMs: result.durationMs,
      requestId: result.requestId,
      promptId: browserAgentPromptV1.id,
      promptVersion: browserAgentPromptV1.version
    };
  }
}

export function createBrowserDecisionProvider(
  options: ProviderRuntimeOptions & { mockScenario?: MockBrowserAgentScenario | undefined; maxTokens: number }
): BrowserDecisionProvider {
  if (options.aiProvider === "anthropic" && options.apiKey) {
    return new AnthropicBrowserDecisionProvider({
      provider: new AnthropicProvider({ apiKey: options.apiKey, defaultModel: options.defaultModel }),
      model: options.defaultModel,
      maxTokens: options.maxTokens,
      timeoutMs: options.timeoutMs,
      retry: { maxAttempts: options.maxAttempts, initialBackoffMs: options.initialBackoffMs }
    });
  }
  return new MockBrowserDecisionProvider({ scenario: options.mockScenario });
}

export { browserAgentPromptV1, plannerPromptV1 };
