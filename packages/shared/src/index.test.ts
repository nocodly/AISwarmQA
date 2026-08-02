import { describe, expect, it } from "vitest";
import {
  assertAuditUrlAllowed,
  assertValidAuditTransition,
  assertValidMissionTransition,
  auditJobSchema,
  auditMissionContextSchema,
  auditRequestSchema,
  browserAgentActionSchema,
  browserAgentProgressFingerprint,
  assertValidSwarmAgentTransition,
  assertValidSwarmRunTransition,
  buildAuditResearchContext,
  browserSwarmRoleObjective,
  calculateReportScore,
  buildPlannerInput,
  calculateModelCost,
  classifyBrowserTargetRisk,
  createFormFingerprint,
  createFindingFingerprint,
  createRouteFingerprint,
  createTargetFingerprint,
  dedupeByFingerprint,
  executeMissionJobSchema,
  hasSwarmBudgetRemaining,
  isForbiddenAuditHostname,
  mergePlannerOutput,
  plannerOutputSchema,
  isSafeInteractionLabel,
  planAuditMissions,
  planAuditJobSchema,
  redactSensitiveText,
  sanitizeAuditMissionContext,
  resolveSameOriginBrowserUrl,
  sanitizeBrowserObservation,
  sanitizeSwarmSharedState,
  sanitizePlanningSnapshot,
  sanitizeUrlForPlanning,
  syntheticBrowserValue
} from "./index";

describe("shared contracts", () => {
  it("parses audit creation input", () => {
    expect(auditRequestSchema.parse({ url: "http://localhost:4100" })).toEqual({
      auditMode: "standard",
      url: "http://localhost:4100"
    });
  });

  it("accepts mission context metadata without accepting plaintext passwords", () => {
    expect(
      auditRequestSchema.parse({
        url: "http://localhost:4100",
        metadata: {
          accessMode: "temporary-account",
          auditScope: "auth",
          loginUrl: "https://example.com/login",
          testAccount: "qa-test@example.com",
          customInstructions: "Focus on sign in and account gates.",
          safetyRules: ["Do not delete data"]
        }
      }).metadata
    ).toMatchObject({ accessMode: "temporary-account", auditScope: "auth" });

    expect(() =>
      auditRequestSchema.parse({
        url: "http://localhost:4100",
        metadata: {
          accessMode: "temporary-account",
          testPassword: "never-store-this"
        }
      })
    ).toThrow();
  });

  it("sanitizes audit mission context before queueing or planning", () => {
    const context = sanitizeAuditMissionContext({
      accessMode: "guided-instructions",
      auditScope: "checkout",
      loginUrl: "https://example.com/login?token=secret",
      testAccount: "qa-test@example.com",
      customInstructions: "Password: hunter2. Use token=abc123 and inspect checkout.",
      safetyRules: ["API key = sk_test_12345678901234567890 should not appear"]
    });
    expect(auditMissionContextSchema.parse(context)).toMatchObject({
      accessMode: "guided-instructions",
      auditScope: "checkout",
      loginUrl: "https://example.com/login?token=%5BREDACTED%5D"
    });
    expect(JSON.stringify(context)).not.toContain("hunter2");
    expect(JSON.stringify(context)).not.toContain("qa-test@example.com");
  });

  it("creates deterministic finding fingerprints", () => {
    expect(
      createFindingFingerprint({
        category: "functional",
        message: "Checkout Button Does Not Respond",
        affectedUrl: "https://example.com/cart",
        statusCode: 500
      })
    ).toBe("functional|500||https://example.com/cart|checkout button does not respond");
  });

  it("allows only configured localhost targets in development", () => {
    expect(
      assertAuditUrlAllowed("http://localhost:4100#ignored", {
        mode: "development",
        devAllowedHosts: ["localhost:4100"]
      })
    ).toBe("http://localhost:4100/");
  });

  it("blocks private targets in production", () => {
    expect(() =>
      assertAuditUrlAllowed("http://127.0.0.1:4100", {
        mode: "production",
        devAllowedHosts: ["127.0.0.1:4100"]
      })
    ).toThrow("FORBIDDEN_TARGET");
  });

  it("classifies private and reserved hostnames for audit network checks", () => {
    expect(isForbiddenAuditHostname("localhost")).toBe(true);
    expect(isForbiddenAuditHostname("10.1.2.3")).toBe(true);
    expect(isForbiddenAuditHostname("172.20.0.10")).toBe(true);
    expect(isForbiddenAuditHostname("192.168.1.5")).toBe(true);
    expect(isForbiddenAuditHostname("169.254.169.254")).toBe(true);
    expect(isForbiddenAuditHostname("metadata.google.internal")).toBe(true);
    expect(isForbiddenAuditHostname("::1")).toBe(true);
    expect(isForbiddenAuditHostname("fc00::1")).toBe(true);
    expect(isForbiddenAuditHostname("example.com")).toBe(false);
    expect(isForbiddenAuditHostname("8.8.8.8")).toBe(false);
  });

  it("prevents invalid audit status transitions", () => {
    expect(() => assertValidAuditTransition("completed", "running")).toThrow();
    expect(assertValidAuditTransition("queued", "running")).toMatchObject({
      status: "running",
      timestampField: "startedAt"
    });
  });

  it("validates queue job payload shape", () => {
    expect(
      auditJobSchema.parse({
        auditId: "audit_1",
        missionId: "mission_1",
        targetUrl: "http://localhost:4100",
        correlationId: "correlation_1"
      })
    ).toMatchObject({ auditId: "audit_1", missionId: "mission_1" });
  });

  it("carries mission context in planning queue payloads", () => {
    expect(
      planAuditJobSchema.parse({
        auditId: "audit_1",
        targetUrl: "http://localhost:4100",
        correlationId: "correlation_1",
        auditMode: "standard",
        missionContext: { accessMode: "guided-instructions", auditScope: "mobile", customInstructions: "Check mobile nav." }
      })
    ).toMatchObject({
      missionContext: { accessMode: "guided-instructions", auditScope: "mobile", customInstructions: "Check mobile nav." }
    });
  });

  it("plans the deterministic standard mission set in priority order", () => {
    expect(planAuditMissions({ auditId: "audit_1", targetUrl: "http://localhost:4100", mode: "standard" }).map((mission) => mission.type)).toEqual([
      "error-reviewer",
      "link-tester",
      "form-tester",
      "mobile-tester",
      "accessibility-reviewer",
      "interaction-tester"
    ]);
  });

  it("keeps the autonomous browser mission optional", () => {
    expect(planAuditMissions({ auditId: "audit_1", targetUrl: "http://localhost:4100", mode: "standard" }).map((mission) => mission.type)).toHaveLength(6);
    expect(
      planAuditMissions({
        auditId: "audit_1",
        targetUrl: "http://localhost:4100",
        mode: "standard",
        includeAutonomousBrowser: true
      }).map((mission) => mission.type)
    ).toContain("autonomous-browser");
  });

  it("keeps the browser swarm mission optional", () => {
    expect(planAuditMissions({ auditId: "audit_1", targetUrl: "http://localhost:4100", mode: "standard" }).map((mission) => mission.type)).not.toContain(
      "browser-swarm"
    );
    expect(
      planAuditMissions({
        auditId: "audit_1",
        targetUrl: "http://localhost:4100",
        mode: "standard",
        includeBrowserSwarm: true
      }).map((mission) => mission.type)
    ).toContain("browser-swarm");
  });

  it("validates mission job payloads with explicit mission type", () => {
    expect(
      executeMissionJobSchema.parse({
        auditId: "audit_1",
        missionId: "mission_1",
        missionType: "link-tester",
        targetUrl: "http://localhost:4100",
        correlationId: "correlation_1"
      })
    ).toMatchObject({ missionType: "link-tester" });
  });

  it("prevents invalid mission status transitions", () => {
    expect(() => assertValidMissionTransition("completed", "running")).toThrow();
    expect(assertValidMissionTransition("failed", "queued")).toMatchObject({ status: "queued" });
  });

  it("calculates deterministic report scores from severity counts", () => {
    expect(calculateReportScore({ critical: 1, high: 1, medium: 2, low: 3 })).toBe(37);
    expect(calculateReportScore({})).toBe(100);
  });

  it("classifies destructive interaction labels as unsafe", () => {
    expect(isSafeInteractionLabel("Learn more")).toBe(true);
    expect(isSafeInteractionLabel("Delete account")).toBe(false);
    expect(isSafeInteractionLabel("Pay now")).toBe(false);
  });

  it("validates browser agent actions through a discriminated union", () => {
    expect(browserAgentActionSchema.parse({ tool: "inspect", reason: "Look around." })).toMatchObject({ tool: "inspect" });
    expect(() => browserAgentActionSchema.parse({ tool: "execute", script: "alert(1)", reason: "bad" })).toThrow();
    expect(() => browserAgentActionSchema.parse({ tool: "click", targetId: "#raw-selector", reason: "bad" })).toThrow();
  });

  it("classifies browser targets conservatively", () => {
    expect(classifyBrowserTargetRisk({ text: "Delete account", type: "button" }).codes).toContain("DESTRUCTIVE_ACTION");
    expect(classifyBrowserTargetRisk({ text: "Pay now", type: "button" }).codes).toContain("PAYMENT_ACTION");
    expect(classifyBrowserTargetRisk({ text: "Sign out", type: "button" }).codes).toContain("LOGOUT_ACTION");
    expect(classifyBrowserTargetRisk({ text: "Password", type: "password" }).codes).toContain("PASSWORD_FIELD");
    expect(classifyBrowserTargetRisk({ text: "Search catalog", type: "search" }).codes).toEqual([]);
  });

  it("enforces same-origin browser navigation policy", () => {
    expect(resolveSameOriginBrowserUrl({ targetUrl: "http://localhost:4100", candidateUrl: "/agent-lab", allowExternalNavigation: false })).toMatchObject({
      allowed: true,
      url: "http://localhost:4100/agent-lab"
    });
    expect(resolveSameOriginBrowserUrl({ targetUrl: "http://localhost:4100", candidateUrl: "https://example.com", allowExternalNavigation: false })).toMatchObject({
      allowed: false,
      code: "EXTERNAL_ORIGIN"
    });
    expect(resolveSameOriginBrowserUrl({ targetUrl: "http://localhost:4100", candidateUrl: "javascript:alert(1)", allowExternalNavigation: false })).toMatchObject({
      allowed: false,
      code: "UNSAFE_PROTOCOL"
    });
  });

  it("generates only server-controlled synthetic browser values", () => {
    expect(syntheticBrowserValue("synthetic-name", "run_123")).toBe("AISwarmQA Test User");
    expect(syntheticBrowserValue("synthetic-email", "run_abcdef123456")).toBe("aiswarmqa-test+ef123456@example.com");
  });

  it("sanitizes and bounds browser observations", () => {
    const observation = sanitizeBrowserObservation(
      {
        stepNumber: 1,
        url: "http://localhost:4100/?token=secret",
        title: "Contact test@example.com",
        pageState: { loading: false, hasDialog: false, hasForm: true, hasVisibleError: false, horizontalOverflow: false },
        visibleText: `Email test@example.com ${"x".repeat(100)}`,
        headings: [{ level: 1, text: "Checkout" }],
        targets: [
          {
            id: "element-1",
            tagName: "input",
            role: null,
            type: "search",
            text: null,
            accessibleName: "Search",
            href: null,
            disabled: false,
            visible: true,
            inViewport: true,
            destructiveRisk: false,
            sensitiveRisk: false
          }
        ],
        forms: [{ id: "form-1", targetIds: ["element-1"], method: "get", action: "http://localhost:4100/search?token=secret" }],
        recentEvents: { consoleErrors: [], pageErrors: [], failedRequests: [], httpErrors: [] },
        limitsRemaining: { steps: 1, navigations: 1, clicks: 1, fills: 1, screenshots: 1, providerCalls: 1 }
      },
      { maxDomElements: 10, maxVisibleTextChars: 40 }
    );
    expect(observation.title).toBe("Contact [REDACTED]");
    expect(observation.visibleText.length).toBeLessThanOrEqual(40);
    expect(observation.targets).toHaveLength(1);
  });

  it("creates stable no-progress fingerprints", () => {
    expect(
      browserAgentProgressFingerprint({
        url: "http://localhost:4100/",
        title: "Demo",
        visibleText: "Same text",
        targets: [],
        tool: "inspect"
      })
    ).toBe(
      browserAgentProgressFingerprint({
        url: "http://localhost:4100/",
        title: "Demo",
        visibleText: "Same text",
        targets: [],
        tool: "inspect"
      })
    );
  });

  it("validates swarm transitions", () => {
    expect(assertValidSwarmRunTransition("created", "running")).toBe("running");
    expect(assertValidSwarmAgentTransition("running", "completed_with_limitations")).toBe("completed_with_limitations");
    expect(() => assertValidSwarmRunTransition("completed", "running")).toThrow();
    expect(() => assertValidSwarmAgentTransition("completed", "running")).toThrow();
  });

  it("creates deterministic swarm coverage fingerprints", () => {
    expect(createRouteFingerprint("/agent-lab?token=secret", "http://localhost:4100")).toBe("http://localhost:4100/agent-lab?token=%5bredacted%5d");
    expect(createTargetFingerprint({ url: "http://localhost:4100/", tagName: "button", text: "Preview demo" })).toContain("preview demo");
    expect(createFormFingerprint({ url: "http://localhost:4100/", method: "get", action: "/search", targetIds: ["element-1"] })).toContain("element-1");
  });

  it("sanitizes bounded swarm shared state", () => {
    const state = sanitizeSwarmSharedState({
      visitedRoutes: ["/agent-lab", "/agent-lab"],
      testedTargetFingerprints: ["target", "target"],
      discoveredForms: ["form"],
      knownFindingFingerprints: ["finding"],
      coverageGaps: ["safe forms"],
      completedAgentRoles: ["explorer-agent", "explorer-agent"]
    });
    expect(state.visitedRoutes).toEqual(["/agent-lab"]);
    expect(state.completedAgentRoles).toEqual(["explorer-agent"]);
  });

  it("enforces aggregate swarm budgets", () => {
    const budgets = {
      maxAgents: 4,
      maxConcurrentAgents: 2,
      maxTotalSteps: 10,
      maxProviderCalls: 10,
      maxNavigations: 4,
      maxScreenshots: 4,
      maxInputTokens: 1000,
      maxOutputTokens: 1000,
      maxEstimatedCostUsd: 1,
      timeoutMs: 10000
    };
    expect(
      hasSwarmBudgetRemaining({
        budgets,
        used: {
          agentsCreated: 1,
          activeAgents: 1,
          totalSteps: 2,
          providerCalls: 2,
          navigations: 0,
          screenshots: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          elapsedMs: 100
        }
      })
    ).toEqual({ allowed: true });
    expect(
      hasSwarmBudgetRemaining({
        budgets,
        used: {
          agentsCreated: 1,
          activeAgents: 1,
          totalSteps: 10,
          providerCalls: 2,
          navigations: 0,
          screenshots: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          elapsedMs: 100
        }
      })
    ).toEqual({ allowed: false, reason: "STEP_BUDGET_EXHAUSTED" });
  });

  it("returns role-specific swarm objectives", () => {
    expect(browserSwarmRoleObjective("form-agent")).toContain("forms");
    expect(browserSwarmRoleObjective("navigation-agent")).toContain("navigation");
  });

  it("redacts sensitive planning text and query parameters", () => {
    expect(redactSensitiveText("email test@example.com token sk_test_123456789012345678901234567890")).toContain("[REDACTED]");
    expect(sanitizeUrlForPlanning("https://example.com/path?token=secret&safe=1")).toBe("https://example.com/path?token=%5BREDACTED%5D&safe=1");
  });

  it("sanitizes bounded planning snapshots", () => {
    const snapshot = sanitizePlanningSnapshot(
      {
        targetUrl: "http://localhost:4100/",
        finalUrl: "http://localhost:4100/?token=secret",
        pageTitle: "Contact test@example.com",
        metaDescription: null,
        language: "en",
        headings: [{ level: 1, text: "Checkout" }],
        navigationLinks: [{ text: "Pricing", url: "http://localhost:4100/pricing?api_key=secret" }],
        visibleButtons: [{ text: "Pay now", role: null, ariaLabel: null }],
        forms: [
          {
            action: "http://localhost:4100/newsletter",
            method: "post",
            fields: [{ type: "password", name: "password", label: "Password", required: true, autocomplete: null }]
          }
        ],
        detectedSignals: {
          hasLogin: false,
          hasSignup: false,
          hasCheckout: true,
          hasPricing: true,
          hasSearch: false,
          hasDashboard: false,
          hasContactForm: true,
          hasFileUpload: false
        },
        sameOriginRoutes: ["http://localhost:4100/pricing?token=secret"],
        consoleErrorCount: 0,
        failedRequestCount: 0
      },
      { maxPageTextChars: 1000, maxLinksInContext: 10, maxFormsInContext: 10, maxPriorityRoutes: 10 }
    );
    expect(snapshot.pageTitle).toBe("Contact [REDACTED]");
    expect(snapshot.forms[0]?.fields).toEqual([]);
    expect(snapshot.sameOriginRoutes).toEqual(["/pricing"]);
  });

  it("builds sanitized public research context for planner workflows", () => {
    const snapshot = sanitizePlanningSnapshot(
      {
        targetUrl: "https://example.com/",
        finalUrl: "https://example.com/?token=secret",
        pageTitle: "Demo SaaS for qa@example.com",
        metaDescription: "Manage projects, pricing, and checkout from one workspace.",
        language: "en",
        headings: [{ level: 1, text: "Run audits and ship fixes" }],
        navigationLinks: [
          { text: "Pricing", url: "https://example.com/pricing?api_key=secret" },
          { text: "Sign in", url: "https://example.com/login" },
          { text: "External docs", url: "https://docs.example.net/private" }
        ],
        visibleButtons: [{ text: "Start checkout", role: null, ariaLabel: null }],
        forms: [
          {
            action: "https://example.com/login",
            method: "post",
            fields: [
              { type: "email", name: "email", label: "Email", required: true, autocomplete: "email" },
              { type: "password", name: "password", label: "Password", required: true, autocomplete: null }
            ]
          }
        ],
        detectedSignals: {
          hasLogin: true,
          hasSignup: false,
          hasCheckout: true,
          hasPricing: true,
          hasSearch: false,
          hasDashboard: true,
          hasContactForm: false,
          hasFileUpload: false
        },
        sameOriginRoutes: ["https://example.com/pricing?token=secret", "https://example.com/app"],
        consoleErrorCount: 1,
        failedRequestCount: 1
      },
      { maxPageTextChars: 1000, maxLinksInContext: 10, maxFormsInContext: 10, maxPriorityRoutes: 10 }
    );
    const context = buildAuditResearchContext({
      targetUrl: "https://example.com/",
      snapshot,
      missionContext: { accessMode: "guided-instructions", auditScope: "checkout", customInstructions: "Use temp access only.", safetyRules: [] }
    });

    expect(context.source).toBe("public-target-snapshot");
    expect(context.likelyUserJourneys.map((journey) => journey.name)).toContain("Checkout or order flow");
    expect(context.likelyUserJourneys.map((journey) => journey.name)).toContain("Account access");
    expect(context.priorityRoutes.map((route) => route.path)).toContain("/pricing");
    expect(context.priorityRoutes.map((route) => route.path)).not.toContain("https://docs.example.net/private");
    expect(context.collectionWarnings).toHaveLength(2);
    expect(JSON.stringify(context)).not.toContain("qa@example.com");
    expect(JSON.stringify(context)).not.toContain("secret");
    expect(JSON.stringify(context)).not.toContain("Password");
  });

  it("validates planner input and output contracts", () => {
    const baseline = planAuditMissions({ auditId: "audit_1", targetUrl: "http://localhost:4100", mode: "standard" });
    const snapshot = sanitizePlanningSnapshot(
      {
        targetUrl: "http://localhost:4100/",
        finalUrl: "http://localhost:4100/",
        pageTitle: "Broken Demo Shop",
        metaDescription: null,
        language: "en",
        headings: [],
        navigationLinks: [],
        visibleButtons: [],
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
        consoleErrorCount: 0,
        failedRequestCount: 0
      },
      { maxPageTextChars: 1000, maxLinksInContext: 10, maxFormsInContext: 10, maxPriorityRoutes: 10 }
    );
    const input = buildPlannerInput({
      auditId: "audit_1",
      targetUrl: "http://localhost:4100/",
      auditMode: "standard",
      missionContext: { accessMode: "guided-instructions", auditScope: "auth", customInstructions: "Inspect account gates.", safetyRules: [] },
      baselineMissions: baseline,
      snapshot,
      maxProposedMissions: 8,
      maxPriorityRoutes: 10
    });
    expect(input.availableMissionTypes).toHaveLength(8);
    expect(input.missionContext).toMatchObject({ accessMode: "guided-instructions", auditScope: "auth" });
    expect(input.researchContext.source).toBe("public-target-snapshot");
    expect(input.researchContext.productSignals).toContain("Checkout signal detected");
    expect(input.constraints.noStoredPasswords).toBe(true);
    expect(input.baselineMissions.map((mission) => mission.type)).not.toContain("autonomous-browser");
    expect(input.baselineMissions.map((mission) => mission.type)).not.toContain("browser-swarm");
    expect(
      plannerOutputSchema.parse({
        websiteClassification: { primaryType: "ecommerce", confidence: 0.8, reasoningSummary: "Checkout signals." },
        importantJourneys: [{ name: "Checkout", description: "Try checkout.", priority: "high", routes: ["/"] }],
        proposedMissions: [{ type: "interaction-tester", priority: 1, reason: "Visible checkout.", targetRoutes: ["/"], suggestedLimits: {} }],
        planningWarnings: [],
        limitations: []
      })
    ).toMatchObject({ websiteClassification: { primaryType: "ecommerce" } });
  });

  it("merges planner output without removing baseline missions", () => {
    const baseline = planAuditMissions({ auditId: "audit_1", targetUrl: "http://localhost:4100", mode: "standard" });
    const merged = mergePlannerOutput({
      targetUrl: "http://localhost:4100/",
      baselineMissions: baseline,
      plannerOutput: {
        websiteClassification: { primaryType: "ecommerce", confidence: 0.9, reasoningSummary: "Checkout signals." },
        importantJourneys: [{ name: "External", description: "Bad route.", priority: "high", routes: ["https://example.com"] }],
        proposedMissions: [
          {
            type: "interaction-tester",
            priority: 999,
            reason: "Prioritize checkout.",
            targetRoutes: ["/"],
            suggestedLimits: { maxInteractions: 999 }
          }
        ],
        planningWarnings: [],
        limitations: []
      },
      limits: { maxProposedMissions: 8, maxPriorityRoutes: 10, maxPages: 3, maxLinks: 10, maxInteractions: 5 }
    });
    expect(merged.finalMissions).toHaveLength(6);
    expect(merged.finalMissions.find((mission) => mission.type === "interaction-tester")).toMatchObject({
      priority: 100,
      limits: { maxInteractions: 5 }
    });
  });

  it("calculates model cost from token usage", () => {
    expect(
      calculateModelCost({
        inputTokens: 1000,
        outputTokens: 500,
        pricing: { inputUsdPerMillionTokens: 3, outputUsdPerMillionTokens: 15 }
      }).totalCostUsd
    ).toBeCloseTo(0.0105);
  });

  it("deduplicates repeated findings by fingerprint", () => {
    expect(
      dedupeByFingerprint([
        { fingerprint: "console|error", title: "first" },
        { fingerprint: "console|error", title: "duplicate" },
        { fingerprint: "network|500", title: "second" }
      ])
    ).toEqual([
      { fingerprint: "console|error", title: "first" },
      { fingerprint: "network|500", title: "second" }
    ]);
  });
});
