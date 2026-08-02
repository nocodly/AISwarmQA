import { defaultAuditMissionContext, type BrowserAgentDecisionInput, type PlannerInput } from "@ai-swarm-qa/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AIProviderError,
  AnthropicBrowserDecisionProvider,
  MockAiProvider,
  MockBrowserDecisionProvider,
  browserAgentPromptV1,
  createAiProvider,
  createBrowserDecisionProvider,
  generateStructured,
  recoverJsonText,
  runPlannerPrompt,
  withProviderRetries,
  normalizeAnthropicError,
  type AiGenerationRequest,
  type AiGenerationResult,
  type AiProvider
} from "./index";

function plannerInput(): PlannerInput {
  return {
    auditId: "audit_1",
    targetUrl: "http://localhost:4100/",
    auditMode: "standard",
    missionContext: defaultAuditMissionContext,
    baselineMissions: [
      { type: "error-reviewer", priority: 10, required: true, limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 } },
      { type: "link-tester", priority: 20, required: true, limits: { maxPages: 1, maxLinks: 10, maxInteractions: 0 } },
      { type: "form-tester", priority: 30, required: true, limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 } },
      { type: "mobile-tester", priority: 40, required: true, limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 } },
      { type: "accessibility-reviewer", priority: 50, required: false, limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 } },
      { type: "interaction-tester", priority: 60, required: false, limits: { maxPages: 1, maxLinks: 0, maxInteractions: 5 } }
    ],
    snapshot: {
      targetUrl: "http://localhost:4100/",
      finalUrl: "http://localhost:4100/",
      pageTitle: "Broken Demo Shop",
      metaDescription: null,
      language: "en",
      headings: [{ level: 1, text: "Checkout flow fixture" }],
      navigationLinks: [{ text: "Pricing", url: "http://localhost:4100/missing" }],
      visibleButtons: [{ text: "Checkout", role: null, ariaLabel: null }],
      forms: [],
      detectedSignals: {
        hasLogin: false,
        hasSignup: true,
        hasCheckout: true,
        hasPricing: true,
        hasSearch: false,
        hasDashboard: false,
        hasContactForm: true,
        hasFileUpload: false
      },
      sameOriginRoutes: ["/"],
      consoleErrorCount: 1,
      failedRequestCount: 1
    },
    researchContext: {
      source: "public-target-snapshot",
      collectedFromUrl: "http://localhost:4100/",
      summary: "Target appears as \"Broken Demo Shop\" with checkout and pricing signals.",
      productSignals: ["Page title: Broken Demo Shop", "Checkout signal detected", "Pricing signal detected"],
      likelyUserJourneys: [
        {
          name: "Checkout or order flow",
          reason: "Checkout, cart, or order signals should be tested without executing payment.",
          routes: ["/"]
        }
      ],
      priorityRoutes: [{ path: "/", label: "Home", reason: "Same-origin route discovered on the target page." }],
      safetyNotes: [
        "Use only public target-page context and sanitized user setup notes.",
        "Do not infer private source-code, database, or server-file access.",
        "Keep all actions same-origin, non-destructive, and free of payment execution."
      ],
      collectionWarnings: ["1 console error(s) were observed during context collection.", "1 failed request(s) were observed during context collection."]
    },
    availableMissionTypes: [
      { type: "interaction-tester", purpose: "Safe interactions", capabilities: ["safe clicks"], restrictions: ["no payments"] },
      { type: "form-tester", purpose: "Forms", capabilities: ["inspect fields"], restrictions: ["no submit"] }
    ],
    constraints: {
      maxProposedMissions: 8,
      maxPriorityRoutes: 10,
      noDestructiveActions: true,
      sameOriginOnly: true,
      noPayments: true,
      noAccountCreation: true,
      noStoredPasswords: true
    }
  };
}

function browserDecisionInput(): BrowserAgentDecisionInput {
  return {
    auditId: "audit_1",
    missionId: "mission_1",
    runId: "run_1",
    objective: "Explore safely.",
    constraints: {
      sameOriginOnly: true,
      noPayments: true,
      noDestructiveActions: true,
      noFileUploads: true,
      noDownloads: true,
      noAuthenticationBypass: true,
      noArbitraryCode: true
    },
    currentObservation: {
      stepNumber: 1,
      url: "http://localhost:4100/",
      title: "Broken Demo Shop",
      pageState: { loading: false, hasDialog: false, hasForm: true, hasVisibleError: false, horizontalOverflow: false },
      visibleText: "Broken Demo Shop Agent lab Delete account Checkout",
      headings: [{ level: 1, text: "Checkout flow fixture" }],
      targets: [
        {
          id: "element-1",
          tagName: "a",
          role: null,
          type: null,
          text: "Agent lab",
          accessibleName: "Agent lab",
          href: "http://localhost:4100/agent-lab",
          disabled: false,
          visible: true,
          inViewport: true,
          destructiveRisk: false,
          sensitiveRisk: false
        },
        {
          id: "element-2",
          tagName: "button",
          role: null,
          type: "button",
          text: "Delete account",
          accessibleName: "Delete account",
          href: null,
          disabled: false,
          visible: true,
          inViewport: true,
          destructiveRisk: true,
          sensitiveRisk: false
        }
      ],
      forms: [],
      recentEvents: { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [] },
      limitsRemaining: { steps: 12, navigations: 4, clicks: 6, fills: 4, screenshots: 8, providerCalls: 12 }
    },
    recentHistory: [],
    knownFindings: [],
    allowedTools: ["inspect", "click", "fill", "scroll", "navigate", "wait", "screenshot", "report_finding", "finish"]
  };
}

describe("planner AI provider abstraction", () => {
  it("returns deterministic structured planner output from the mock provider", async () => {
    const result = await runPlannerPrompt({
      provider: new MockAiProvider({ scenario: "success" }),
      plannerInput: plannerInput(),
      model: "mock-planner",
      maxTokens: 2500,
      timeoutMs: 1000
    });
    expect(result.value.websiteClassification.primaryType).toBe("ecommerce");
    expect(result.provider).toBe("mock");
    expect(result.promptVersion).toBe("v1");
  });

  it("normalizes mock timeout and malformed output", async () => {
    await expect(
      runPlannerPrompt({
        provider: new MockAiProvider({ scenario: "timeout" }),
        plannerInput: plannerInput(),
        model: "mock-planner",
        maxTokens: 2500,
        timeoutMs: 1000
      })
    ).rejects.toMatchObject({ code: "TIMEOUT" });

    await expect(
      runPlannerPrompt({
        provider: new MockAiProvider({ scenario: "malformed" }),
        plannerInput: plannerInput(),
        model: "mock-planner",
        maxTokens: 2500,
        timeoutMs: 1000
      })
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps provider status errors to normalized codes", () => {
    expect(normalizeAnthropicError({ status: 429, message: "too many requests" })).toMatchObject({ code: "RATE_LIMIT" });
    expect(normalizeAnthropicError({ status: 401, message: "bad key" })).toMatchObject({ code: "AUTHENTICATION" });
    expect(normalizeAnthropicError({ status: 400, message: "retired model" })).toMatchObject({ code: "CONFIGURATION" });
    expect(normalizeAnthropicError({ status: 500, message: "temporary failure" })).toMatchObject({ code: "UNAVAILABLE" });
    expect(new AIProviderError("UNAVAILABLE", "down").code).toBe("UNAVAILABLE");
  });

  it("returns deterministic browser-agent actions from the mock provider", async () => {
    const result = await new MockBrowserDecisionProvider({ scenario: "success" }).decide(browserDecisionInput());
    expect(result.action).toEqual({ tool: "inspect", reason: "Start with a fresh bounded observation." });
    expect(result.provider).toBe("mock");
    expect(result.promptId).toBe(browserAgentPromptV1.id);
    expect(result.promptVersion).toBe("v1");
  });

  it("supports browser-agent safety scenarios through the same action schema", async () => {
    const external = await new MockBrowserDecisionProvider({ scenario: "external-navigation" }).decide(browserDecisionInput());
    expect(external.action).toMatchObject({ tool: "navigate", targetUrl: "https://example.com/outside" });
    const unsafe = await new MockBrowserDecisionProvider({ scenario: "unsafe-click" }).decide(browserDecisionInput());
    expect(unsafe.action).toMatchObject({ tool: "click", targetId: "element-2" });
  });

  it("normalizes invalid browser-agent mock output through schema validation", async () => {
    await expect(new MockBrowserDecisionProvider({ scenario: "invalid-schema" }).decide(browserDecisionInput())).rejects.toThrow();
  });

  it("recovers JSON from fenced or prefixed provider responses", () => {
    expect(recoverJsonText("```json\n{\"tool\":\"inspect\",\"reason\":\"Check.\"}\n```")).toBe("{\"tool\":\"inspect\",\"reason\":\"Check.\"}");
    expect(recoverJsonText("Here is JSON: {\"ok\":true}\nThanks")).toBe("{\"ok\":true}");
  });

  it("retries retryable provider failures with exponential backoff", async () => {
    let attempts = 0;
    const result = await withProviderRetries(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new AIProviderError("RATE_LIMIT", "Retry me.");
        return "ok";
      },
      { maxAttempts: 2, initialBackoffMs: 1 }
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("retries malformed structured output before accepting valid JSON", async () => {
    let attempts = 0;
    class FlakyStructuredProvider implements AiProvider {
      readonly name = "anthropic";

      async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
        attempts += 1;
        return {
          text: attempts === 1 ? "{not-json" : JSON.stringify({ status: "ok" }),
          provider: "anthropic",
          model: request.model ?? "claude-sonnet-4-6",
          inputTokens: 10,
          outputTokens: 5,
          finishReason: "end_turn",
          requestId: `req_${attempts}`,
          durationMs: 1
        };
      }
    }

    const result = await generateStructured({
      provider: new FlakyStructuredProvider(),
      schema: z.object({ status: z.literal("ok") }),
      messages: [{ role: "user", content: "Return status." }],
      model: "claude-sonnet-4-6",
      maxTokens: 64,
      timeoutMs: 1000,
      pricing: { inputUsdPerMillionTokens: 3, outputUsdPerMillionTokens: 15 },
      retry: { maxAttempts: 2, initialBackoffMs: 1 }
    });

    expect(result.value.status).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("falls back to the mock provider when Anthropic is selected without a key", () => {
    const provider = createAiProvider({
      aiProvider: "anthropic",
      apiKey: undefined,
      defaultModel: "claude-sonnet-4-6",
      maxAttempts: 1,
      initialBackoffMs: 1,
      timeoutMs: 1000,
      fallbackToMock: true
    });

    expect(provider.name).toBe("mock");
  });

  it("creates an Anthropic browser decision provider through the shared abstraction", async () => {
    class StaticProvider implements AiProvider {
      readonly name = "anthropic";

      async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
        return {
          text: `Here is the action:\n${JSON.stringify({ tool: "inspect", reason: "Inspect before acting." })}`,
          provider: "anthropic",
          model: request.model ?? "claude-sonnet-4-6",
          inputTokens: 100,
          outputTokens: 20,
          finishReason: "end_turn",
          requestId: "req_test",
          durationMs: 12
        };
      }
    }

    const provider = createBrowserDecisionProvider({
      aiProvider: "anthropic",
      apiKey: "test-key",
      defaultModel: "claude-sonnet-4-6",
      maxAttempts: 1,
      initialBackoffMs: 1,
      timeoutMs: 1000,
      fallbackToMock: true,
      maxTokens: 500
    });
    expect(provider).toBeTruthy();

    const direct = new AnthropicBrowserDecisionProvider({
      provider: new StaticProvider(),
      model: "claude-sonnet-4-6",
      maxTokens: 500,
      timeoutMs: 1000
    });
    const decision = await direct.decide(browserDecisionInput());
    expect(decision.provider).toBe("anthropic");
    expect(decision.action).toEqual({ tool: "inspect", reason: "Inspect before acting." });
    expect(decision.estimatedCostUsd).toBeGreaterThan(0);
  });
});
