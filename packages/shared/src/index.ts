import { z } from "zod";

export const auditStatusSchema = z.enum([
  "created",
  "validating",
  "queued",
  "planning",
  "running",
  "analyzing",
  "generating_report",
  "completed",
  "failed",
  "cancelled"
]);

export type AuditStatus = z.infer<typeof auditStatusSchema>;

export const findingSeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

export const findingCategorySchema = z.enum([
  "functional",
  "accessibility",
  "performance",
  "ux",
  "security",
  "network",
  "console"
]);

export type FindingCategory = z.infer<typeof findingCategorySchema>;

export const findingSchema = z.object({
  category: findingCategorySchema,
  severity: findingSeveritySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  affectedUrls: z.array(z.string().url()),
  stepsToReproduce: z.array(z.string()),
  expectedBehavior: z.string(),
  actualBehavior: z.string(),
  evidenceIds: z.array(z.string()),
  browser: z.string(),
  viewport: z.string(),
  confidence: z.number().min(0).max(1),
  fingerprint: z.string().min(1),
  sourceMissions: z.array(z.string())
});

export type Finding = z.infer<typeof findingSchema>;

export const auditRequestSchema = z.object({
  url: z.string().min(1),
  auditMode: z.enum(["preview", "standard"]).default("standard"),
  metadata: z
    .object({
      projectName: z.string().max(120).optional(),
      environment: z.enum(["production", "staging", "preview"]).optional(),
      accessMode: z.enum(["public", "temporary-account", "guided-instructions", "credentials-later"]).optional(),
      auditScope: z.enum(["quick", "smoke", "full", "auth", "checkout", "accessibility", "mobile", "custom"]).optional(),
      loginUrl: z.string().url().optional(),
      testAccount: z.string().max(240).optional(),
      customInstructions: z.string().max(1600).optional(),
      safetyRules: z.array(z.string().max(120)).max(12).optional()
    })
    .strict()
    .optional()
});

export type AuditRequest = z.infer<typeof auditRequestSchema>;

export const auditAccessModeSchema = z.enum(["public", "temporary-account", "guided-instructions", "credentials-later"]);
export type AuditAccessMode = z.infer<typeof auditAccessModeSchema>;

export const auditScopeSchema = z.enum(["quick", "smoke", "full", "auth", "checkout", "accessibility", "mobile", "custom"]);
export type AuditScope = z.infer<typeof auditScopeSchema>;

export const auditMissionContextSchema = z
  .object({
    accessMode: auditAccessModeSchema.default("public"),
    auditScope: auditScopeSchema.default("full"),
    loginUrl: z.string().url().optional(),
    testAccount: z.string().max(240).optional(),
    customInstructions: z.string().max(1600).optional(),
    safetyRules: z.array(z.string().max(120)).max(12).default([])
  })
  .strict();

export type AuditMissionContext = z.infer<typeof auditMissionContextSchema>;

export const defaultAuditMissionContext = {
  accessMode: "public",
  auditScope: "full",
  safetyRules: []
} satisfies AuditMissionContext;

export const githubExportFindingSelectionSchema = z.object({
  findingIds: z.array(z.string().min(1)).min(1).max(100),
  excludeInformational: z.boolean().default(true)
});

export const githubExportPreviewRequestSchema = githubExportFindingSelectionSchema.extend({
  repositoryId: z.string().min(1).optional(),
  labelNames: z.array(z.string().min(1).max(80)).max(20).default([]),
  assignees: z.array(z.string().min(1).max(80)).max(10).default([]),
  milestoneNumber: z.number().int().positive().optional(),
  createMissingLabels: z.boolean().default(false),
  includeExternalEvidence: z.boolean().default(false)
});

export type GitHubExportPreviewRequest = z.infer<typeof githubExportPreviewRequestSchema>;

export const githubExportRequestSchema = githubExportPreviewRequestSchema.extend({
  repositoryId: z.string().min(1),
  confirmed: z.literal(true)
});

export type GitHubExportRequest = z.infer<typeof githubExportRequestSchema>;

export const githubExportRetryRequestSchema = z.object({
  confirmed: z.literal(true)
});

export type GitHubExportRetryRequest = z.infer<typeof githubExportRetryRequestSchema>;

export const githubExportJobSchema = z.object({
  batchId: z.string().min(1),
  workspaceId: z.string().min(1),
  userId: z.string().min(1)
});

export type GitHubExportJob = z.infer<typeof githubExportJobSchema>;

export const auditJobSchema = z.object({
  auditId: z.string().min(1),
  missionId: z.string().min(1),
  missionType: z.string().min(1).optional(),
  targetUrl: z.string().url(),
  correlationId: z.string().min(1),
  missionContext: auditMissionContextSchema.default(defaultAuditMissionContext)
});

export type AuditJob = z.infer<typeof auditJobSchema>;

export const missionTypeSchema = z.enum([
  "error-reviewer",
  "link-tester",
  "form-tester",
  "mobile-tester",
  "accessibility-reviewer",
  "interaction-tester",
  "autonomous-browser",
  "browser-swarm"
]);

export type MissionType = z.infer<typeof missionTypeSchema>;

export const missionStatusSchema = z.enum(["created", "queued", "running", "completed", "failed", "cancelled", "skipped"]);
export type MissionStatus = z.infer<typeof missionStatusSchema>;

export const missionDefinitionSchema = z.object({
  type: missionTypeSchema,
  role: z.string().min(1),
  objective: z.string().min(1),
  priority: z.number().int().positive(),
  required: z.boolean(),
  timeoutMs: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  limits: z.object({
    maxPages: z.number().int().positive(),
    maxLinks: z.number().int().nonnegative(),
    maxInteractions: z.number().int().nonnegative()
  })
});

export type MissionDefinition = z.infer<typeof missionDefinitionSchema>;

export const swarmModes = ["disabled", "mock"] as const;
export const swarmModeSchema = z.enum(swarmModes);
export type SwarmMode = z.infer<typeof swarmModeSchema>;

export const browserSwarmAgentRoles = [
  "explorer-agent",
  "form-agent",
  "interaction-agent",
  "navigation-agent",
  "mobile-agent",
  "error-investigator-agent"
] as const;
export const browserSwarmAgentRoleSchema = z.enum(browserSwarmAgentRoles);
export type BrowserSwarmAgentRole = z.infer<typeof browserSwarmAgentRoleSchema>;

export const browserSwarmRunStatusSchema = z.enum(["created", "running", "completed", "completed_with_limitations", "failed", "cancelled"]);
export type BrowserSwarmRunStatus = z.infer<typeof browserSwarmRunStatusSchema>;

export const browserSwarmAgentStatusSchema = z.enum(["created", "queued", "running", "completed", "completed_with_limitations", "failed", "cancelled", "skipped"]);
export type BrowserSwarmAgentStatus = z.infer<typeof browserSwarmAgentStatusSchema>;

export const browserSwarmTerminalReasonSchema = z.enum([
  "FINISHED",
  "AGENT_LIMIT_REACHED",
  "CONCURRENCY_LIMIT_REACHED",
  "STEP_BUDGET_EXHAUSTED",
  "PROVIDER_BUDGET_EXHAUSTED",
  "TIME_BUDGET_EXHAUSTED",
  "COST_BUDGET_EXHAUSTED",
  "NO_COVERAGE_REMAINING",
  "AGENT_FAILURE_LIMIT_REACHED",
  "CANCELLED",
  "ORCHESTRATOR_FAILURE"
]);
export type BrowserSwarmTerminalReason = z.infer<typeof browserSwarmTerminalReasonSchema>;

export const swarmSharedStateSchema = z
  .object({
    visitedRoutes: z.array(z.string().min(1).max(240)).max(40),
    testedTargetFingerprints: z.array(z.string().min(1).max(400)).max(80),
    discoveredForms: z.array(z.string().min(1).max(400)).max(40),
    knownFindingFingerprints: z.array(z.string().min(1).max(500)).max(80),
    coverageGaps: z.array(z.string().min(1).max(240)).max(20),
    completedAgentRoles: z.array(browserSwarmAgentRoleSchema).max(browserSwarmAgentRoles.length)
  })
  .strict();
export type SwarmSharedState = z.infer<typeof swarmSharedStateSchema>;

export type SwarmBudgetConfig = {
  maxAgents: number;
  maxConcurrentAgents: number;
  maxTotalSteps: number;
  maxProviderCalls: number;
  maxNavigations: number;
  maxScreenshots: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  timeoutMs: number;
};

export function browserSwarmRoleObjective(role: BrowserSwarmAgentRole): string {
  const objectives = {
    "explorer-agent": "Explore safe same-origin journeys and identify visible functional defects without repeating covered routes.",
    "form-agent": "Inspect and safely fill non-sensitive forms with synthetic data while avoiding password, payment, file, and submit actions.",
    "interaction-agent": "Exercise safe interactive controls and report stalled or broken UI states with evidence.",
    "navigation-agent": "Explore safe same-origin navigation paths while avoiding external links and duplicate routes.",
    "mobile-agent": "Review the target through a mobile-oriented objective and prioritize layout or responsive workflow issues.",
    "error-investigator-agent": "Investigate visible errors, failed states, console-related symptoms, and network-facing user impact."
  } satisfies Record<BrowserSwarmAgentRole, string>;
  return objectives[role];
}

export function createRouteFingerprint(input: string, baseUrl: string): string {
  const sanitized = sanitizeUrlForPlanning(input, baseUrl) ?? input;
  try {
    const url = new URL(sanitized, baseUrl);
    return `${url.origin}${url.pathname}${url.search}`.toLowerCase();
  } catch {
    return normalizeWhitespace(sanitized).toLowerCase();
  }
}

export function createTargetFingerprint(input: {
  url: string;
  tagName?: string | null;
  role?: string | null;
  type?: string | null;
  text?: string | null;
  accessibleName?: string | null;
  href?: string | null;
}): string {
  return createFindingFingerprint({
    category: "functional",
    affectedUrl: createRouteFingerprint(input.url, input.url),
    selector: `${input.tagName ?? ""}:${input.role ?? ""}:${input.type ?? ""}`,
    message: `${input.text ?? ""}:${input.accessibleName ?? ""}:${input.href ?? ""}`
  });
}

export function createFormFingerprint(input: { url: string; method?: string | null; action?: string | null; targetIds?: string[] }): string {
  return createFindingFingerprint({
    category: "functional",
    affectedUrl: createRouteFingerprint(input.action ?? input.url, input.url),
    selector: `form:${input.method ?? ""}`,
    message: (input.targetIds ?? []).join(",")
  });
}

export function sanitizeSwarmSharedState(input: SwarmSharedState): SwarmSharedState {
  return swarmSharedStateSchema.parse({
    visitedRoutes: [...new Set(input.visitedRoutes.map((item) => truncateText(item, 240)))].slice(0, 40),
    testedTargetFingerprints: [...new Set(input.testedTargetFingerprints.map((item) => truncateText(item, 400)))].slice(0, 80),
    discoveredForms: [...new Set(input.discoveredForms.map((item) => truncateText(item, 400)))].slice(0, 40),
    knownFindingFingerprints: [...new Set(input.knownFindingFingerprints.map((item) => truncateText(item, 500)))].slice(0, 80),
    coverageGaps: [...new Set(input.coverageGaps.map((item) => truncateText(item, 240)))].slice(0, 20),
    completedAgentRoles: [...new Set(input.completedAgentRoles)].slice(0, browserSwarmAgentRoles.length)
  });
}

export function hasSwarmBudgetRemaining(input: {
  budgets: SwarmBudgetConfig;
  used: {
    agentsCreated: number;
    activeAgents: number;
    totalSteps: number;
    providerCalls: number;
    navigations: number;
    screenshots: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    elapsedMs: number;
  };
}): { allowed: true } | { allowed: false; reason: BrowserSwarmTerminalReason } {
  if (input.used.agentsCreated >= input.budgets.maxAgents) return { allowed: false, reason: "AGENT_LIMIT_REACHED" };
  if (input.used.activeAgents >= input.budgets.maxConcurrentAgents) return { allowed: false, reason: "CONCURRENCY_LIMIT_REACHED" };
  if (input.used.totalSteps >= input.budgets.maxTotalSteps) return { allowed: false, reason: "STEP_BUDGET_EXHAUSTED" };
  if (input.used.providerCalls >= input.budgets.maxProviderCalls) return { allowed: false, reason: "PROVIDER_BUDGET_EXHAUSTED" };
  if (input.used.navigations >= input.budgets.maxNavigations) return { allowed: false, reason: "STEP_BUDGET_EXHAUSTED" };
  if (input.used.screenshots >= input.budgets.maxScreenshots) return { allowed: false, reason: "STEP_BUDGET_EXHAUSTED" };
  if (input.used.inputTokens >= input.budgets.maxInputTokens) return { allowed: false, reason: "COST_BUDGET_EXHAUSTED" };
  if (input.used.outputTokens >= input.budgets.maxOutputTokens) return { allowed: false, reason: "COST_BUDGET_EXHAUSTED" };
  if (input.used.estimatedCostUsd >= input.budgets.maxEstimatedCostUsd) return { allowed: false, reason: "COST_BUDGET_EXHAUSTED" };
  if (input.used.elapsedMs >= input.budgets.timeoutMs) return { allowed: false, reason: "TIME_BUDGET_EXHAUSTED" };
  return { allowed: true };
}

const swarmAgentTransitions: Record<BrowserSwarmAgentStatus, BrowserSwarmAgentStatus[]> = {
  created: ["queued", "running", "skipped", "cancelled"],
  queued: ["running", "skipped", "cancelled"],
  running: ["completed", "completed_with_limitations", "failed", "cancelled"],
  completed: [],
  completed_with_limitations: [],
  failed: [],
  cancelled: [],
  skipped: []
};

export function assertValidSwarmAgentTransition(currentStatus: BrowserSwarmAgentStatus, nextStatus: BrowserSwarmAgentStatus): BrowserSwarmAgentStatus {
  if (!swarmAgentTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(`Cannot transition swarm agent from ${currentStatus} to ${nextStatus}.`);
  }
  return nextStatus;
}

const swarmRunTransitions: Record<BrowserSwarmRunStatus, BrowserSwarmRunStatus[]> = {
  created: ["running", "failed", "cancelled"],
  running: ["completed", "completed_with_limitations", "failed", "cancelled"],
  completed: [],
  completed_with_limitations: [],
  failed: [],
  cancelled: []
};

export function assertValidSwarmRunTransition(currentStatus: BrowserSwarmRunStatus, nextStatus: BrowserSwarmRunStatus): BrowserSwarmRunStatus {
  if (!swarmRunTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(`Cannot transition swarm run from ${currentStatus} to ${nextStatus}.`);
  }
  return nextStatus;
}

export const autonomousBrowserModes = ["disabled", "mock"] as const;
export const autonomousBrowserModeSchema = z.enum(autonomousBrowserModes);
export type AutonomousBrowserMode = z.infer<typeof autonomousBrowserModeSchema>;

export const browserAgentTools = [
  "inspect",
  "click",
  "fill",
  "scroll",
  "navigate",
  "wait",
  "screenshot",
  "report_finding",
  "finish"
] as const;
export const browserAgentToolSchema = z.enum(browserAgentTools);
export type BrowserAgentTool = z.infer<typeof browserAgentToolSchema>;

const actionReasonSchema = z.string().min(1).max(180);
const browserTargetIdSchema = z.string().regex(/^element-\d+$/);

export const browserAgentFindingProposalSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(600),
    category: findingCategorySchema,
    severity: z.enum(["low", "medium", "high"]),
    targetId: browserTargetIdSchema.optional(),
    evidenceStepIds: z.array(z.string().min(1).max(80)).min(1).max(8)
  })
  .strict();

export const browserAgentActionSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("inspect"), reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("click"), targetId: browserTargetIdSchema, reason: actionReasonSchema }).strict(),
  z
    .object({
      tool: z.literal("fill"),
      targetId: browserTargetIdSchema,
      valueKind: z.enum(["synthetic-name", "synthetic-email", "synthetic-phone", "synthetic-text", "synthetic-search"]),
      reason: actionReasonSchema
    })
    .strict(),
  z.object({ tool: z.literal("scroll"), direction: z.enum(["up", "down"]), amount: z.enum(["small", "medium", "large"]), reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("navigate"), targetUrl: z.string().min(1).max(500), reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("wait"), durationMs: z.number().int().min(1).max(10000), reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("screenshot"), scope: z.enum(["viewport", "full-page"]), reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("report_finding"), finding: browserAgentFindingProposalSchema, reason: actionReasonSchema }).strict(),
  z.object({ tool: z.literal("finish"), summary: z.string().min(1).max(360), reason: actionReasonSchema }).strict()
]);
export type BrowserAgentAction = z.infer<typeof browserAgentActionSchema>;

export const browserAgentRunStatusSchema = z.enum(["created", "running", "completed", "completed_with_limitations", "failed", "cancelled"]);
export type BrowserAgentRunStatus = z.infer<typeof browserAgentRunStatusSchema>;

export const browserAgentStepStatusSchema = z.enum(["proposed", "rejected", "executed", "failed"]);
export type BrowserAgentStepStatus = z.infer<typeof browserAgentStepStatusSchema>;

export const browserAgentTerminalReasonSchema = z.enum([
  "FINISHED_BY_AGENT",
  "STEP_BUDGET_EXHAUSTED",
  "PROVIDER_BUDGET_EXHAUSTED",
  "TIME_BUDGET_EXHAUSTED",
  "COST_BUDGET_EXHAUSTED",
  "NO_PROGRESS",
  "TOO_MANY_REJECTIONS",
  "SAFETY_VIOLATION",
  "PROVIDER_FAILURE",
  "BROWSER_FAILURE",
  "EXTERNAL_NAVIGATION_BLOCKED",
  "CANCELLED"
]);
export type BrowserAgentTerminalReason = z.infer<typeof browserAgentTerminalReasonSchema>;

export const browserAgentSafetyCodeSchema = z.enum([
  "UNKNOWN_TOOL",
  "INVALID_ACTION",
  "STALE_TARGET",
  "TARGET_NOT_VISIBLE",
  "TARGET_DISABLED",
  "EXTERNAL_ORIGIN",
  "UNSAFE_PROTOCOL",
  "DESTRUCTIVE_ACTION",
  "PAYMENT_ACTION",
  "PURCHASE_ACTION",
  "ACCOUNT_ACTION",
  "LOGOUT_ACTION",
  "FILE_UPLOAD",
  "DOWNLOAD_ACTION",
  "PASSWORD_FIELD",
  "PAYMENT_FIELD",
  "SENSITIVE_FIELD",
  "BUDGET_EXCEEDED",
  "STEP_LIMIT_REACHED",
  "TIME_LIMIT_REACHED",
  "REPEATED_ACTION",
  "NO_PROGRESS",
  "INVALID_EVIDENCE",
  "UNSUPPORTED_FORM_SUBMIT"
]);
export type BrowserAgentSafetyCode = z.infer<typeof browserAgentSafetyCodeSchema>;

export const browserTargetSchema = z
  .object({
    id: browserTargetIdSchema,
    tagName: z.string().min(1).max(30),
    role: z.string().max(80).nullable(),
    type: z.string().max(80).nullable(),
    text: z.string().max(180).nullable(),
    accessibleName: z.string().max(180).nullable(),
    href: z.string().max(500).nullable(),
    disabled: z.boolean(),
    visible: z.boolean(),
    inViewport: z.boolean(),
    destructiveRisk: z.boolean(),
    sensitiveRisk: z.boolean()
  })
  .strict();
export type BrowserTarget = z.infer<typeof browserTargetSchema>;

export const browserPageObservationSchema = z
  .object({
    stepNumber: z.number().int().min(1),
    url: z.string().url(),
    title: z.string().max(180).nullable(),
    pageState: z.object({
      loading: z.boolean(),
      hasDialog: z.boolean(),
      hasForm: z.boolean(),
      hasVisibleError: z.boolean(),
      horizontalOverflow: z.boolean()
    }),
    visibleText: z.string().max(12000),
    headings: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string().max(180) })).max(30),
    targets: z.array(browserTargetSchema).max(100),
    forms: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          targetIds: z.array(browserTargetIdSchema).max(30),
          method: z.string().max(20).nullable(),
          action: z.string().max(500).nullable()
        })
      )
      .max(20),
    recentEvents: z.object({
      consoleErrors: z.array(z.string().max(260)).max(10),
      pageErrors: z.array(z.string().max(260)).max(10),
      failedRequests: z.array(z.string().max(260)).max(10),
      httpErrors: z.array(z.object({ url: z.string().max(500), status: z.number().int().min(100).max(599) })).max(10)
    }),
    screenshot: z.object({ evidenceId: z.string().min(1).max(120), path: z.string().min(1).max(600) }).optional(),
    limitsRemaining: z.object({
      steps: z.number().int().nonnegative(),
      navigations: z.number().int().nonnegative(),
      clicks: z.number().int().nonnegative(),
      fills: z.number().int().nonnegative(),
      screenshots: z.number().int().nonnegative(),
      providerCalls: z.number().int().nonnegative()
    })
  })
  .strict();
export type BrowserPageObservation = z.infer<typeof browserPageObservationSchema>;

export const browserAgentDecisionInputSchema = z
  .object({
    auditId: z.string().min(1),
    missionId: z.string().min(1),
    runId: z.string().min(1),
    objective: z.string().min(1).max(500),
    constraints: z.object({
      sameOriginOnly: z.literal(true),
      noPayments: z.literal(true),
      noDestructiveActions: z.literal(true),
      noFileUploads: z.literal(true),
      noDownloads: z.literal(true),
      noAuthenticationBypass: z.literal(true),
      noArbitraryCode: z.literal(true)
    }),
    currentObservation: browserPageObservationSchema,
    recentHistory: z
      .array(
        z.object({
          stepNumber: z.number().int().min(1),
          proposedTool: browserAgentToolSchema,
          executed: z.boolean(),
          outcome: z.string().max(240),
          rejectionReason: z.string().max(240).nullable()
        })
      )
      .max(12),
    knownFindings: z.array(z.object({ title: z.string().max(160), category: findingCategorySchema, url: z.string().url() })).max(20),
    allowedTools: z.array(browserAgentToolSchema).min(1).max(browserAgentTools.length)
  })
  .strict();
export type BrowserAgentDecisionInput = z.infer<typeof browserAgentDecisionInputSchema>;

export type BrowserAgentBudgetConfig = {
  maxSteps: number;
  maxProviderCalls: number;
  maxNavigations: number;
  maxClicks: number;
  maxFormFills: number;
  maxScreenshots: number;
  missionTimeoutMs: number;
  stepTimeoutMs: number;
  idleWaitMs: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxDomElements: number;
  maxVisibleTextChars: number;
  maxHistoryStepsInContext: number;
  maxConsecutiveRejections: number;
  maxNoProgressSteps: number;
  allowFormFill: boolean;
  allowSafeFormSubmit: boolean;
  allowExternalNavigation: boolean;
};

export function sanitizeBrowserObservation(observation: BrowserPageObservation, limits: { maxDomElements: number; maxVisibleTextChars: number }): BrowserPageObservation {
  return browserPageObservationSchema.parse({
    ...observation,
    title: observation.title ? truncateText(observation.title, 180) : null,
    visibleText: truncateText(observation.visibleText, limits.maxVisibleTextChars),
    headings: observation.headings.slice(0, 30).map((heading) => ({ ...heading, text: truncateText(heading.text, 180) })),
    targets: observation.targets.slice(0, limits.maxDomElements).map((target) => ({
      ...target,
      text: target.text ? truncateText(target.text, 180) : null,
      accessibleName: target.accessibleName ? truncateText(target.accessibleName, 180) : null,
      href: target.href ? sanitizeUrlForPlanning(target.href, observation.url) : null
    })),
    forms: observation.forms.slice(0, 20),
    recentEvents: {
      consoleErrors: observation.recentEvents.consoleErrors.map((item) => truncateText(item, 260)).slice(0, 10),
      pageErrors: observation.recentEvents.pageErrors.map((item) => truncateText(item, 260)).slice(0, 10),
      failedRequests: observation.recentEvents.failedRequests.map((item) => truncateText(item, 260)).slice(0, 10),
      httpErrors: observation.recentEvents.httpErrors.slice(0, 10)
    }
  });
}

const destructiveActionWords = [
  "delete",
  "remove",
  "destroy",
  "factory reset",
  "publish",
  "post",
  "send",
  "invite",
  "approve",
  "reset"
];

const paymentActionWords = ["pay", "payment", "checkout", "cart", "card", "billing", "invoice", "subscribe", "upgrade", "downgrade"];
const purchaseActionWords = ["confirm order", "place order", "buy", "purchase", "order now"];
const accountActionWords = ["close account", "cancel subscription", "unsubscribe", "change password", "password reset", "transfer", "withdraw", "refund"];
const logoutActionWords = ["logout", "log out", "sign out"];
const fileActionWords = ["upload", "download", "export", "import"];

function normalizedRiskText(parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyBrowserTargetRisk(input: {
  text?: string | null;
  accessibleName?: string | null;
  title?: string | null;
  href?: string | null;
  role?: string | null;
  tagName?: string | null;
  type?: string | null;
}): {
  destructiveRisk: boolean;
  sensitiveRisk: boolean;
  codes: BrowserAgentSafetyCode[];
} {
  const text = normalizedRiskText([input.text, input.accessibleName, input.title, input.href, input.role, input.tagName, input.type]);
  const type = (input.type ?? "").toLowerCase();
  const codes = new Set<BrowserAgentSafetyCode>();
  if (destructiveActionWords.some((word) => text.includes(word))) {
    codes.add("DESTRUCTIVE_ACTION");
  }
  if (paymentActionWords.some((word) => text.includes(word))) {
    codes.add("PAYMENT_ACTION");
  }
  if (purchaseActionWords.some((word) => text.includes(word))) {
    codes.add("PURCHASE_ACTION");
  }
  if (accountActionWords.some((word) => text.includes(word))) {
    codes.add("ACCOUNT_ACTION");
  }
  if (logoutActionWords.some((word) => text.includes(word))) {
    codes.add("LOGOUT_ACTION");
  }
  if (fileActionWords.some((word) => text.includes(word)) || type === "file") {
    codes.add(type === "file" ? "FILE_UPLOAD" : text.includes("download") ? "DOWNLOAD_ACTION" : "FILE_UPLOAD");
  }
  if (["password"].includes(type) || text.includes("password")) {
    codes.add("PASSWORD_FIELD");
  }
  if (["hidden", "file"].includes(type)) {
    codes.add(type === "file" ? "FILE_UPLOAD" : "SENSITIVE_FIELD");
  }
  if (["credit-card", "cc-number", "card", "cvc", "cvv"].some((word) => text.includes(word)) || /^(cc-|card|cvc|cvv)/.test(type)) {
    codes.add("PAYMENT_FIELD");
  }
  return {
    destructiveRisk: ["DESTRUCTIVE_ACTION", "PAYMENT_ACTION", "PURCHASE_ACTION", "ACCOUNT_ACTION", "LOGOUT_ACTION"].some((code) =>
      codes.has(code as BrowserAgentSafetyCode)
    ),
    sensitiveRisk: ["FILE_UPLOAD", "DOWNLOAD_ACTION", "PASSWORD_FIELD", "PAYMENT_FIELD", "SENSITIVE_FIELD"].some((code) =>
      codes.has(code as BrowserAgentSafetyCode)
    ),
    codes: [...codes]
  };
}

export function resolveSameOriginBrowserUrl(input: {
  targetUrl: string;
  candidateUrl: string;
  allowExternalNavigation: boolean;
}): { allowed: true; url: string } | { allowed: false; code: BrowserAgentSafetyCode; reason: string } {
  try {
    const base = new URL(input.targetUrl);
    const candidate = new URL(input.candidateUrl, base);
    if (!["http:", "https:"].includes(candidate.protocol)) {
      return { allowed: false, code: "UNSAFE_PROTOCOL", reason: `Blocked unsupported protocol ${candidate.protocol}.` };
    }
    if (!input.allowExternalNavigation && candidate.origin !== base.origin) {
      return { allowed: false, code: "EXTERNAL_ORIGIN", reason: "Blocked navigation outside the target origin." };
    }
    candidate.hash = "";
    return { allowed: true, url: candidate.toString() };
  } catch {
    return { allowed: false, code: "INVALID_ACTION", reason: "The proposed URL could not be parsed." };
  }
}

export function syntheticBrowserValue(valueKind: Extract<BrowserAgentAction, { tool: "fill" }>["valueKind"], runId: string): string {
  const suffix = runId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase() || "local";
  const values = {
    "synthetic-name": "AISwarmQA Test User",
    "synthetic-email": `aiswarmqa-test+${suffix}@example.com`,
    "synthetic-phone": "+15550000000",
    "synthetic-text": "Automated QA test input",
    "synthetic-search": "test"
  } satisfies Record<Extract<BrowserAgentAction, { tool: "fill" }>["valueKind"], string>;
  return values[valueKind];
}

export function browserAgentProgressFingerprint(input: {
  url: string;
  title: string | null;
  visibleText: string;
  targets: BrowserTarget[];
  tool: BrowserAgentTool;
  targetId?: string;
  scrollY?: number;
}): string {
  const targetSummary = input.targets
    .map((target) => `${target.id}:${target.tagName}:${target.text ?? target.accessibleName ?? ""}:${target.href ?? ""}`)
    .join("|");
  return createFindingFingerprint({
    category: "functional",
    affectedUrl: input.url,
    selector: `${input.tool}:${input.targetId ?? ""}:${input.scrollY ?? 0}`,
    message: `${input.title ?? ""}|${input.visibleText.slice(0, 500)}|${targetSummary}`
  });
}

export const planningModeSchema = z.enum(["deterministic", "ai-assisted"]);
export type PlanningMode = z.infer<typeof planningModeSchema>;

export const planningSourceSchema = z.enum(["deterministic", "anthropic", "mock"]);
export type PlanningSource = z.infer<typeof planningSourceSchema>;

export const planningStatusSchema = z.enum(["created", "snapshotting", "requesting_ai", "validating", "merging", "completed", "fallback", "failed"]);
export type PlanningStatus = z.infer<typeof planningStatusSchema>;

export const plannerFallbackReasonSchema = z.enum([
  "AI_DISABLED",
  "MISSING_API_KEY",
  "INPUT_TOO_LARGE",
  "BUDGET_EXCEEDED",
  "PROVIDER_TIMEOUT",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_UNAVAILABLE",
  "INVALID_PROVIDER_OUTPUT",
  "UNSUPPORTED_MISSION",
  "POLICY_REJECTION",
  "UNKNOWN_PROVIDER_ERROR"
]);
export type PlannerFallbackReason = z.infer<typeof plannerFallbackReasonSchema>;

export const websiteClassificationSchema = z.enum([
  "marketing-site",
  "saas",
  "ecommerce",
  "marketplace",
  "content-site",
  "dashboard",
  "documentation",
  "unknown"
]);
export type WebsiteClassification = z.infer<typeof websiteClassificationSchema>;

export const journeyPrioritySchema = z.enum(["high", "medium", "low"]);
export type JourneyPriority = z.infer<typeof journeyPrioritySchema>;

export const redactedValue = "[REDACTED]";

export const sensitiveQueryParamNames = [
  "token",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "key",
  "secret",
  "password",
  "code",
  "session",
  "signature",
  "sig"
];

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function redactSensitiveText(input: string): string {
  return normalizeWhitespace(input)
    .replace(/\b(password|passcode|secret|token|api[_ -]?key)\s*[:=]\s*\S+/gi, "$1: [REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, redactedValue)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, redactedValue)
    .replace(/\b(?:bearer\s+)?[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gi, redactedValue)
    .replace(/\b(?:sk|pk|ak|rk|api)[_-]?[A-Za-z0-9]{20,}\b/gi, redactedValue)
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, redactedValue);
}

export function truncateText(input: string, maxChars: number): string {
  const redacted = redactSensitiveText(input);
  return redacted.length > maxChars ? `${redacted.slice(0, Math.max(0, maxChars - 14))} [TRUNCATED]` : redacted;
}

export function sanitizeUrlForPlanning(input: string, baseUrl?: string): string | null {
  try {
    const url = new URL(input, baseUrl);
    for (const name of [...url.searchParams.keys()]) {
      if (sensitiveQueryParamNames.some((sensitive) => name.toLowerCase().includes(sensitive))) {
        url.searchParams.set(name, redactedValue);
      }
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeAuditMissionContext(input: Partial<AuditMissionContext> | null | undefined): AuditMissionContext {
  const parsed = auditMissionContextSchema.parse(input ?? {});
  return auditMissionContextSchema.parse({
    accessMode: parsed.accessMode,
    auditScope: parsed.auditScope,
    ...(parsed.loginUrl ? { loginUrl: sanitizeUrlForPlanning(parsed.loginUrl) ?? undefined } : {}),
    ...(parsed.testAccount ? { testAccount: truncateText(parsed.testAccount, 160) } : {}),
    ...(parsed.customInstructions ? { customInstructions: truncateText(parsed.customInstructions, 1200) } : {}),
    safetyRules: parsed.safetyRules.map((rule) => truncateText(rule, 120))
  });
}

export function isSameOriginOrRelativeRoute(route: string, targetUrl: string): boolean {
  try {
    const target = new URL(targetUrl);
    const routeUrl = new URL(route, target);
    return route.startsWith("/") || routeUrl.origin === target.origin;
  } catch {
    return false;
  }
}

function toRoutePath(route: string, targetUrl: string): string | null {
  try {
    const url = new URL(route, targetUrl);
    for (const name of [...url.searchParams.keys()]) {
      if (sensitiveQueryParamNames.some((sensitive) => name.toLowerCase().includes(sensitive))) {
        url.searchParams.delete(name);
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export const planningSnapshotSchema = z.object({
  targetUrl: z.string().url(),
  finalUrl: z.string().url(),
  pageTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  language: z.string().nullable(),
  headings: z.array(z.object({ level: z.number().int().min(1).max(6), text: z.string().max(240) })).max(40),
  navigationLinks: z.array(z.object({ text: z.string().max(160), url: z.string().url() })).max(50),
  visibleButtons: z.array(z.object({ text: z.string().max(160), role: z.string().nullable(), ariaLabel: z.string().nullable() })).max(40),
  forms: z
    .array(
      z.object({
        action: z.string().nullable(),
        method: z.string().nullable(),
        fields: z
          .array(
            z.object({
              type: z.string().max(40),
              name: z.string().nullable(),
              label: z.string().nullable(),
              required: z.boolean(),
              autocomplete: z.string().nullable()
            })
          )
          .max(20)
      })
    )
    .max(20),
  detectedSignals: z.object({
    hasLogin: z.boolean(),
    hasSignup: z.boolean(),
    hasCheckout: z.boolean(),
    hasPricing: z.boolean(),
    hasSearch: z.boolean(),
    hasDashboard: z.boolean(),
    hasContactForm: z.boolean(),
    hasFileUpload: z.boolean()
  }),
  sameOriginRoutes: z.array(z.string()).max(50),
  consoleErrorCount: z.number().int().nonnegative(),
  failedRequestCount: z.number().int().nonnegative()
});

export type PlanningSnapshot = z.infer<typeof planningSnapshotSchema>;

export const auditResearchJourneySchema = z.object({
  name: z.string().min(1).max(120),
  reason: z.string().min(1).max(240),
  routes: z.array(z.string().min(1).max(300)).max(8)
});

export const auditResearchRouteSchema = z.object({
  path: z.string().min(1).max(300),
  label: z.string().min(1).max(120),
  reason: z.string().min(1).max(180)
});

export const auditResearchContextSchema = z
  .object({
    source: z.literal("public-target-snapshot"),
    collectedFromUrl: z.string().url(),
    summary: z.string().max(700),
    productSignals: z.array(z.string().min(1).max(120)).max(12),
    likelyUserJourneys: z.array(auditResearchJourneySchema).max(10),
    priorityRoutes: z.array(auditResearchRouteSchema).max(20),
    safetyNotes: z.array(z.string().min(1).max(160)).max(8),
    collectionWarnings: z.array(z.string().min(1).max(160)).max(8)
  })
  .strict();

export type AuditResearchContext = z.infer<typeof auditResearchContextSchema>;

export type SnapshotLimits = {
  maxPageTextChars: number;
  maxLinksInContext: number;
  maxFormsInContext: number;
  maxPriorityRoutes: number;
};

export function sanitizePlanningSnapshot(snapshot: PlanningSnapshot, limits: SnapshotLimits): PlanningSnapshot {
  const targetUrl = snapshot.targetUrl;
  const uniqueUrls = new Set<string>();
  return planningSnapshotSchema.parse({
    ...snapshot,
    pageTitle: snapshot.pageTitle ? truncateText(snapshot.pageTitle, 160) : null,
    metaDescription: snapshot.metaDescription ? truncateText(snapshot.metaDescription, 320) : null,
    language: snapshot.language ? truncateText(snapshot.language, 40) : null,
    headings: snapshot.headings.slice(0, 40).map((heading) => ({ ...heading, text: truncateText(heading.text, 180) })),
    navigationLinks: snapshot.navigationLinks
      .map((link) => ({ text: truncateText(link.text, 120), url: sanitizeUrlForPlanning(link.url, targetUrl) }))
      .filter((link): link is { text: string; url: string } => Boolean(link.url))
      .filter((link) => {
        if (uniqueUrls.has(link.url)) {
          return false;
        }
        uniqueUrls.add(link.url);
        return true;
      })
      .slice(0, limits.maxLinksInContext),
    visibleButtons: snapshot.visibleButtons
      .slice(0, 40)
      .map((button) => ({
        text: truncateText(button.text, 120),
        role: button.role ? truncateText(button.role, 40) : null,
        ariaLabel: button.ariaLabel ? truncateText(button.ariaLabel, 120) : null
      })),
    forms: snapshot.forms.slice(0, limits.maxFormsInContext).map((form) => ({
      action: form.action ? sanitizeUrlForPlanning(form.action, targetUrl) : null,
      method: form.method ? truncateText(form.method.toLowerCase(), 20) : null,
      fields: form.fields
        .filter((field) => field.type.toLowerCase() !== "password")
        .slice(0, 20)
        .map((field) => ({
          type: truncateText(field.type, 40),
          name: field.name ? truncateText(field.name, 80) : null,
          label: field.label ? truncateText(field.label, 120) : null,
          required: field.required,
          autocomplete: field.autocomplete ? truncateText(field.autocomplete, 80) : null
        }))
    })),
    sameOriginRoutes: [
      ...new Set(
        snapshot.sameOriginRoutes
          .map((route) => (isSameOriginOrRelativeRoute(route, targetUrl) ? toRoutePath(route, targetUrl) : null))
          .filter((route): route is string => Boolean(route))
      )
    ].slice(0, limits.maxPriorityRoutes)
  });
}

function appendUnique<T>(items: T[], item: T, key: (value: T) => string, maxItems: number): void {
  const normalizedKey = key(item).toLowerCase();
  if (items.length >= maxItems || items.some((existing) => key(existing).toLowerCase() === normalizedKey)) {
    return;
  }
  items.push(item);
}

function routePathFromCandidate(candidate: string | undefined, targetUrl: string): string[] {
  if (!candidate || !isSameOriginOrRelativeRoute(candidate, targetUrl)) {
    return [];
  }
  const route = toRoutePath(candidate, targetUrl);
  return route ? [route] : [];
}

function findRoutesByKeyword(snapshot: PlanningSnapshot, keywords: RegExp[]): string[] {
  const candidates = [
    ...snapshot.navigationLinks.map((link) => ({ text: link.text, route: link.url })),
    ...snapshot.sameOriginRoutes.map((route) => ({ text: route, route }))
  ];
  const routes: string[] = [];
  for (const candidate of candidates) {
    const text = `${candidate.text} ${candidate.route}`;
    if (keywords.some((keyword) => keyword.test(text))) {
      for (const route of routePathFromCandidate(candidate.route, snapshot.targetUrl)) {
        appendUnique(routes, route, (value) => value, 8);
      }
    }
  }
  return routes;
}

function addResearchRoute(routes: AuditResearchContext["priorityRoutes"], snapshot: PlanningSnapshot, input: { route: string; label: string; reason: string }): void {
  for (const path of routePathFromCandidate(input.route, snapshot.targetUrl)) {
    appendUnique(
      routes,
      {
        path,
        label: truncateText(input.label || path, 120),
        reason: truncateText(input.reason, 180)
      },
      (route) => route.path,
      20
    );
  }
}

export function buildAuditResearchContext(input: {
  targetUrl: string;
  snapshot: PlanningSnapshot;
  missionContext?: AuditMissionContext;
  maxPriorityRoutes?: number;
}): AuditResearchContext {
  const missionContext = sanitizeAuditMissionContext(input.missionContext);
  const snapshot = sanitizePlanningSnapshot(input.snapshot, {
    maxPageTextChars: 1600,
    maxLinksInContext: 30,
    maxFormsInContext: 12,
    maxPriorityRoutes: input.maxPriorityRoutes ?? 20
  });
  const productSignals: string[] = [];
  const journeys: AuditResearchContext["likelyUserJourneys"] = [];
  const priorityRoutes: AuditResearchContext["priorityRoutes"] = [];
  const warnings: string[] = [];

  if (snapshot.pageTitle) {
    appendUnique(productSignals, `Page title: ${truncateText(snapshot.pageTitle, 100)}`, (value) => value, 12);
  }
  if (snapshot.metaDescription) {
    appendUnique(productSignals, `Meta description: ${truncateText(snapshot.metaDescription, 100)}`, (value) => value, 12);
  }
  const primaryHeading = snapshot.headings.find((heading) => heading.level <= 2 && heading.text);
  if (primaryHeading) {
    appendUnique(productSignals, `Primary heading: ${truncateText(primaryHeading.text, 100)}`, (value) => value, 12);
  }

  const signalLabels: Array<[keyof PlanningSnapshot["detectedSignals"], string]> = [
    ["hasLogin", "Authentication"],
    ["hasSignup", "Sign-up"],
    ["hasCheckout", "Checkout"],
    ["hasPricing", "Pricing"],
    ["hasSearch", "Search"],
    ["hasDashboard", "Dashboard or workspace"],
    ["hasContactForm", "Contact or lead form"],
    ["hasFileUpload", "File upload"]
  ];
  for (const [key, label] of signalLabels) {
    if (snapshot.detectedSignals[key]) {
      appendUnique(productSignals, `${label} signal detected`, (value) => value, 12);
    }
  }
  if (snapshot.forms.length > 0) {
    appendUnique(productSignals, `${snapshot.forms.length} form area(s) detected`, (value) => value, 12);
  }
  if (snapshot.visibleButtons.length > 0) {
    appendUnique(productSignals, `${snapshot.visibleButtons.length} interactive control(s) visible`, (value) => value, 12);
  }

  for (const link of snapshot.navigationLinks) {
    addResearchRoute(priorityRoutes, snapshot, {
      route: link.url,
      label: link.text || "Navigation route",
      reason: "Visible navigation route from the target page."
    });
  }
  for (const route of snapshot.sameOriginRoutes.slice(0, input.maxPriorityRoutes ?? 20)) {
    addResearchRoute(priorityRoutes, snapshot, {
      route,
      label: route,
      reason: "Same-origin route discovered on the target page."
    });
  }

  const addJourney = (journey: AuditResearchContext["likelyUserJourneys"][number]) =>
    appendUnique(journeys, journey, (value) => value.name, 10);
  const authRoutes = [
    ...routePathFromCandidate(missionContext.loginUrl, snapshot.targetUrl),
    ...findRoutesByKeyword(snapshot, [/log ?in/i, /sign ?in/i, /account/i, /auth/i])
  ];
  if (snapshot.detectedSignals.hasLogin || snapshot.detectedSignals.hasSignup || missionContext.accessMode !== "public") {
    addJourney({
      name: "Account access",
      reason: "The page or audit setup includes login, sign-up, or guided access signals.",
      routes: authRoutes.length > 0 ? authRoutes.slice(0, 8) : ["/"]
    });
  }
  if (snapshot.detectedSignals.hasCheckout || missionContext.auditScope === "checkout") {
    addJourney({
      name: "Checkout or order flow",
      reason: "Checkout, cart, or order signals should be tested without executing payment.",
      routes: findRoutesByKeyword(snapshot, [/checkout/i, /cart/i, /order/i, /pricing/i]).slice(0, 8)
    });
  }
  if (snapshot.detectedSignals.hasPricing) {
    addJourney({
      name: "Pricing and plan review",
      reason: "Pricing or plan content is a core conversion route.",
      routes: findRoutesByKeyword(snapshot, [/pricing/i, /price/i, /plan/i]).slice(0, 8)
    });
  }
  if (snapshot.detectedSignals.hasSearch) {
    addJourney({
      name: "Search workflow",
      reason: "Search controls are visible and should be checked for usable results or errors.",
      routes: findRoutesByKeyword(snapshot, [/search/i]).slice(0, 8)
    });
  }
  if (snapshot.detectedSignals.hasDashboard) {
    addJourney({
      name: "Dashboard or workspace workflow",
      reason: "Workspace/dashboard language suggests authenticated operational screens.",
      routes: findRoutesByKeyword(snapshot, [/dashboard/i, /workspace/i, /app/i]).slice(0, 8)
    });
  }
  if (snapshot.detectedSignals.hasContactForm || snapshot.forms.length > 0) {
    addJourney({
      name: "Form completion safety",
      reason: "Forms should be inspected for labels, validation, and non-destructive behavior.",
      routes: findRoutesByKeyword(snapshot, [/contact/i, /newsletter/i, /subscribe/i, /form/i]).slice(0, 8)
    });
  }
  if (missionContext.auditScope !== "full") {
    addJourney({
      name: `${missionContext.auditScope} audit focus`,
      reason: "The user selected a narrower audit scope in the setup flow.",
      routes: ["/"]
    });
  }

  if (snapshot.consoleErrorCount > 0) {
    warnings.push(`${snapshot.consoleErrorCount} console error(s) were observed during context collection.`);
  }
  if (snapshot.failedRequestCount > 0) {
    warnings.push(`${snapshot.failedRequestCount} failed request(s) were observed during context collection.`);
  }
  if (snapshot.navigationLinks.length === 0 && snapshot.sameOriginRoutes.length <= 1) {
    warnings.push("Few same-origin routes were visible, so route coverage may be limited.");
  }

  const summaryParts = [
    snapshot.pageTitle ? `Target appears as "${snapshot.pageTitle}".` : "Target page title was unavailable.",
    snapshot.metaDescription ? snapshot.metaDescription : null,
    productSignals.length > 0 ? `Signals: ${productSignals.slice(0, 6).join("; ")}.` : null
  ].filter((part): part is string => Boolean(part));

  return auditResearchContextSchema.parse({
    source: "public-target-snapshot",
    collectedFromUrl: sanitizeUrlForPlanning(snapshot.finalUrl, input.targetUrl) ?? sanitizeUrlForPlanning(input.targetUrl) ?? input.targetUrl,
    summary: truncateText(summaryParts.join(" "), 700),
    productSignals,
    likelyUserJourneys: journeys.map((journey) => ({
      ...journey,
      reason: truncateText(journey.reason, 240),
      routes: journey.routes.length > 0 ? journey.routes : ["/"]
    })),
    priorityRoutes: priorityRoutes.slice(0, input.maxPriorityRoutes ?? 20),
    safetyNotes: [
      "Use only public target-page context and sanitized user setup notes.",
      "Do not infer private source-code, database, or server-file access.",
      "Keep all actions same-origin, non-destructive, and free of payment execution."
    ],
    collectionWarnings: warnings.map((warning) => truncateText(warning, 160))
  });
}

export const missionDefinitions = [
  {
    type: "error-reviewer",
    role: "Error Reviewer",
    objective: "Capture navigation, console, JavaScript, failed request, and HTTP error observations.",
    priority: 10,
    required: true,
    timeoutMs: 45000,
    maxAttempts: 2,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 }
  },
  {
    type: "link-tester",
    role: "Link Tester",
    objective: "Check a bounded set of same-origin links for broken responses.",
    priority: 20,
    required: true,
    timeoutMs: 45000,
    maxAttempts: 2,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 1, maxLinks: 10, maxInteractions: 0 }
  },
  {
    type: "form-tester",
    role: "Form Tester",
    objective: "Inspect visible forms and inputs without submitting arbitrary data.",
    priority: 30,
    required: true,
    timeoutMs: 30000,
    maxAttempts: 1,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 }
  },
  {
    type: "mobile-tester",
    role: "Mobile Tester",
    objective: "Check mobile viewport overflow and hidden primary controls.",
    priority: 40,
    required: true,
    timeoutMs: 45000,
    maxAttempts: 2,
    viewport: { width: 390, height: 844 },
    limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 }
  },
  {
    type: "accessibility-reviewer",
    role: "Accessibility Reviewer",
    objective: "Run a bounded deterministic axe-core accessibility scan.",
    priority: 50,
    required: false,
    timeoutMs: 45000,
    maxAttempts: 1,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 1, maxLinks: 0, maxInteractions: 0 }
  },
  {
    type: "interaction-tester",
    role: "Interaction Tester",
    objective: "Try a small allowlisted set of safe interactions and detect stalled controls.",
    priority: 60,
    required: false,
    timeoutMs: 30000,
    maxAttempts: 1,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 1, maxLinks: 0, maxInteractions: 5 }
  },
  {
    type: "autonomous-browser",
    role: "Autonomous Browser Agent",
    objective: "Explore the target through server-authoritative browser tools and report evidence-backed findings.",
    priority: 70,
    required: false,
    timeoutMs: 120000,
    maxAttempts: 1,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 4, maxLinks: 8, maxInteractions: 12 }
  },
  {
    type: "browser-swarm",
    role: "Autonomous Browser Swarm",
    objective: "Coordinate multiple isolated bounded Browser Agents across role-specific QA objectives.",
    priority: 80,
    required: false,
    timeoutMs: 300000,
    maxAttempts: 1,
    viewport: { width: 1280, height: 900 },
    limits: { maxPages: 6, maxLinks: 16, maxInteractions: 40 }
  }
] satisfies MissionDefinition[];

export function getMissionDefinition(type: MissionType): MissionDefinition {
  const definition = missionDefinitions.find((mission) => mission.type === type);
  if (!definition) {
    throw new Error(`Unknown mission type: ${type}`);
  }
  return missionDefinitionSchema.parse(definition);
}

export type PlanAuditInput = {
  auditId: string;
  targetUrl: string;
  mode: "preview" | "standard";
  includeAutonomousBrowser?: boolean;
  includeBrowserSwarm?: boolean;
};

export function planAuditMissions(input: PlanAuditInput): MissionDefinition[] {
  const deterministicTypes: MissionType[] = [
    "error-reviewer",
    "link-tester",
    "form-tester",
    "mobile-tester",
    "accessibility-reviewer",
    "interaction-tester"
  ];
  const types: MissionType[] =
    input.mode === "preview"
      ? ["error-reviewer", "link-tester", "mobile-tester"]
      : input.includeBrowserSwarm
        ? [...deterministicTypes, "browser-swarm"]
      : input.includeAutonomousBrowser
        ? [...deterministicTypes, "autonomous-browser"]
        : deterministicTypes;
  const uniqueTypes = [...new Set(types)];
  return uniqueTypes.map((type) => getMissionDefinition(type));
}

export const plannerMissionInfoSchema = z.object({
  type: missionTypeSchema,
  purpose: z.string().min(1).max(240),
  capabilities: z.array(z.string().max(160)).max(8),
  restrictions: z.array(z.string().max(160)).max(8)
});

export const plannerInputSchema = z.object({
  auditId: z.string().min(1),
  targetUrl: z.string().url(),
  auditMode: z.enum(["preview", "standard"]),
  missionContext: auditMissionContextSchema,
  baselineMissions: z.array(
    z.object({
      type: missionTypeSchema,
      priority: z.number().int().min(1).max(100),
      required: z.boolean(),
      limits: z.object({
        maxPages: z.number().int().min(1).max(10),
        maxLinks: z.number().int().min(0).max(50),
        maxInteractions: z.number().int().min(0).max(10)
      })
    })
  ),
  snapshot: planningSnapshotSchema,
  researchContext: auditResearchContextSchema,
  availableMissionTypes: z.array(plannerMissionInfoSchema),
  constraints: z.object({
    maxProposedMissions: z.number().int().min(0).max(20),
    maxPriorityRoutes: z.number().int().min(0).max(50),
    noDestructiveActions: z.literal(true),
    sameOriginOnly: z.literal(true),
    noPayments: z.literal(true),
    noAccountCreation: z.literal(true),
    noStoredPasswords: z.literal(true)
  })
});

export type PlannerInput = z.infer<typeof plannerInputSchema>;

export const importantJourneySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(320),
  priority: journeyPrioritySchema,
  routes: z.array(z.string().min(1).max(300)).max(10)
});

export const proposedMissionSchema = z.object({
  type: missionTypeSchema,
  priority: z.number().int().min(1).max(100),
  reason: z.string().min(1).max(320),
  targetRoutes: z.array(z.string().min(1).max(300)).max(10),
  suggestedLimits: z
    .object({
      maxPages: z.number().int().optional(),
      maxLinks: z.number().int().optional(),
      maxInteractions: z.number().int().optional()
    })
    .strict()
});

export const plannerOutputSchema = z
  .object({
    websiteClassification: z.object({
      primaryType: websiteClassificationSchema,
      confidence: z.number().min(0).max(1),
      reasoningSummary: z.string().min(1).max(500)
    }),
    importantJourneys: z.array(importantJourneySchema).max(10),
    proposedMissions: z.array(proposedMissionSchema).max(20),
    planningWarnings: z.array(z.string().max(240)).max(10),
    limitations: z.array(z.string().max(240)).max(10)
  })
  .strict();

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

export const planAuditJobSchema = z.object({
  auditId: z.string().min(1),
  targetUrl: z.string().url(),
  correlationId: z.string().min(1),
  auditMode: z.enum(["preview", "standard"]).default("standard"),
  missionContext: auditMissionContextSchema.default(defaultAuditMissionContext)
});

export type PlanAuditJob = z.infer<typeof planAuditJobSchema>;

export type MissionPlanningMetadata = {
  planningSource: "baseline" | "ai-prioritized" | "ai-suggested";
  targetRoutes: string[];
  aiReason?: string;
};

export type MergedMissionDefinition = MissionDefinition & {
  planning: MissionPlanningMetadata;
  missionContext: AuditMissionContext;
};

export type RejectedPlannerProposal = {
  type?: string;
  reason: string;
  route?: string;
};

export type PlannerPolicyLimits = {
  maxProposedMissions: number;
  maxPriorityRoutes: number;
  maxPages: number;
  maxLinks: number;
  maxInteractions: number;
};

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function buildPlannerInput(input: {
  auditId: string;
  targetUrl: string;
  auditMode: "preview" | "standard";
  missionContext?: AuditMissionContext;
  baselineMissions: MissionDefinition[];
  snapshot: PlanningSnapshot;
  researchContext?: AuditResearchContext;
  maxProposedMissions: number;
  maxPriorityRoutes: number;
}): PlannerInput {
  const missionContext = sanitizeAuditMissionContext(input.missionContext);
  const researchContext =
    input.researchContext ??
    buildAuditResearchContext({
      targetUrl: input.targetUrl,
      snapshot: input.snapshot,
      missionContext,
      maxPriorityRoutes: input.maxPriorityRoutes
    });
  return plannerInputSchema.parse({
    auditId: input.auditId,
    targetUrl: input.targetUrl,
    auditMode: input.auditMode,
    missionContext,
    baselineMissions: input.baselineMissions.map((mission) => ({
      type: mission.type,
      priority: mission.priority,
      required: mission.required,
      limits: mission.limits
    })),
    snapshot: input.snapshot,
    researchContext,
    availableMissionTypes: missionDefinitions.map((mission) => ({
      type: mission.type,
      purpose: mission.objective,
      capabilities: [
        mission.limits.maxLinks > 0 ? "bounded link checks" : "single page inspection",
        mission.limits.maxInteractions > 0 ? "safe allowlisted interactions" : "no interactive actions",
        `${mission.viewport.width}x${mission.viewport.height} viewport`
      ],
      restrictions: [
        "same-origin only",
        missionContext.accessMode === "public" ? "no login" : "no stored passwords or secret handling",
        "no payment execution",
        "no account creation",
        "no generated selectors or code"
      ]
    })),
    constraints: {
      maxProposedMissions: input.maxProposedMissions,
      maxPriorityRoutes: input.maxPriorityRoutes,
      noDestructiveActions: true,
      sameOriginOnly: true,
      noPayments: true,
      noAccountCreation: true,
      noStoredPasswords: true
    }
  });
}

export function mergePlannerOutput(input: {
  targetUrl: string;
  baselineMissions: MissionDefinition[];
  missionContext?: AuditMissionContext;
  plannerOutput?: PlannerOutput | null;
  limits: PlannerPolicyLimits;
  allowedMissionTypes?: MissionType[];
}): {
  finalMissions: MergedMissionDefinition[];
  acceptedProposals: PlannerOutput["proposedMissions"];
  rejectedProposals: RejectedPlannerProposal[];
  importantJourneys: PlannerOutput["importantJourneys"];
  warnings: string[];
} {
  const missionContext = sanitizeAuditMissionContext(input.missionContext);
  const missionMap = new Map<MissionType, MergedMissionDefinition>();
  for (const mission of input.baselineMissions) {
    missionMap.set(mission.type, {
      ...mission,
      planning: { planningSource: "baseline", targetRoutes: ["/"] },
      missionContext
    });
  }

  const rejectedProposals: RejectedPlannerProposal[] = [];
  const acceptedProposals: PlannerOutput["proposedMissions"] = [];
  const output = input.plannerOutput;
  if (!output) {
    return {
      finalMissions: [...missionMap.values()].sort((a, b) => a.priority - b.priority),
      acceptedProposals,
      rejectedProposals,
      importantJourneys: [],
      warnings: []
    };
  }

  const allowedMissionTypes = new Set(input.allowedMissionTypes ?? input.baselineMissions.map((mission) => mission.type));
  for (const proposal of output.proposedMissions.slice(0, input.limits.maxProposedMissions)) {
    if (!missionTypeSchema.safeParse(proposal.type).success) {
      rejectedProposals.push({ type: proposal.type, reason: "UNSUPPORTED_MISSION" });
      continue;
    }
    if (!allowedMissionTypes.has(proposal.type)) {
      rejectedProposals.push({ type: proposal.type, reason: "MISSION_DISABLED" });
      continue;
    }

    const targetRoutes = [
      ...new Set(
        proposal.targetRoutes
          .filter((route) => isSameOriginOrRelativeRoute(route, input.targetUrl))
          .map((route) => toRoutePath(route, input.targetUrl))
          .filter((route): route is string => Boolean(route))
      )
    ].slice(0, input.limits.maxPriorityRoutes);

    if (proposal.targetRoutes.length > 0 && targetRoutes.length === 0) {
      rejectedProposals.push({
        type: proposal.type,
        reason: "UNSAFE_ROUTE",
        ...(proposal.targetRoutes[0] ? { route: proposal.targetRoutes[0] } : {})
      });
      continue;
    }

    const definition = missionMap.get(proposal.type) ?? getMissionDefinition(proposal.type);
    const merged: MergedMissionDefinition = {
      ...definition,
      priority: clampInt(proposal.priority, definition.priority, 1, 100),
      required: definition.required,
      timeoutMs: definition.timeoutMs,
      maxAttempts: definition.maxAttempts,
      limits: {
        maxPages: clampInt(proposal.suggestedLimits.maxPages, definition.limits.maxPages, 1, input.limits.maxPages),
        maxLinks: clampInt(proposal.suggestedLimits.maxLinks, definition.limits.maxLinks, 0, input.limits.maxLinks),
        maxInteractions: clampInt(proposal.suggestedLimits.maxInteractions, definition.limits.maxInteractions, 0, input.limits.maxInteractions)
      },
      planning: {
        planningSource: missionMap.has(proposal.type) ? "ai-prioritized" : "ai-suggested",
        targetRoutes: targetRoutes.length > 0 ? targetRoutes : ["/"],
        aiReason: truncateText(proposal.reason, 300)
      },
      missionContext
    };
    missionMap.set(proposal.type, missionDefinitionSchema.extend({ planning: z.any(), missionContext: auditMissionContextSchema }).parse(merged));
    acceptedProposals.push({
      ...proposal,
      targetRoutes: merged.planning.targetRoutes,
      priority: merged.priority,
      suggestedLimits: merged.limits
    });
  }

  const importantJourneys = output.importantJourneys
    .map((journey) => ({
      ...journey,
      name: truncateText(journey.name, 120),
      description: truncateText(journey.description, 320),
      routes: [
        ...new Set(
          journey.routes
            .filter((route) => isSameOriginOrRelativeRoute(route, input.targetUrl))
            .map((route) => toRoutePath(route, input.targetUrl))
            .filter((route): route is string => Boolean(route))
        )
      ].slice(0, input.limits.maxPriorityRoutes)
    }))
    .slice(0, input.limits.maxPriorityRoutes);

  return {
    finalMissions: [...missionMap.values()].sort((a, b) => a.priority - b.priority),
    acceptedProposals,
    rejectedProposals,
    importantJourneys,
    warnings: output.planningWarnings.map((warning) => truncateText(warning, 240))
  };
}

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export function estimateTokenCountFromText(text: string): number {
  return Math.ceil(text.length / 4);
}

export function calculateModelCost(input: {
  inputTokens: number | null;
  outputTokens: number | null;
  pricing: ModelPricing;
}): {
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  totalCostUsd: number | null;
} {
  const inputCostUsd =
    typeof input.inputTokens === "number" ? (input.inputTokens * input.pricing.inputUsdPerMillionTokens) / 1_000_000 : null;
  const outputCostUsd =
    typeof input.outputTokens === "number" ? (input.outputTokens * input.pricing.outputUsdPerMillionTokens) / 1_000_000 : null;
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd === null || outputCostUsd === null ? null : inputCostUsd + outputCostUsd
  };
}

export type MissionTransitionResult = {
  status: MissionStatus;
  timestampField?: "startedAt" | "completedAt" | "failedAt";
};

const missionTransitions: Record<MissionStatus, MissionStatus[]> = {
  created: ["queued", "skipped", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
  skipped: []
};

export class InvalidMissionStatusTransitionError extends Error {
  constructor(
    readonly currentStatus: MissionStatus,
    readonly nextStatus: MissionStatus
  ) {
    super(`Cannot transition mission from ${currentStatus} to ${nextStatus}.`);
    this.name = "InvalidMissionStatusTransitionError";
  }
}

export function assertValidMissionTransition(currentStatus: MissionStatus, nextStatus: MissionStatus): MissionTransitionResult {
  if (!missionTransitions[currentStatus].includes(nextStatus)) {
    throw new InvalidMissionStatusTransitionError(currentStatus, nextStatus);
  }
  const timestampField =
    nextStatus === "running" ? "startedAt" : nextStatus === "completed" ? "completedAt" : nextStatus === "failed" ? "failedAt" : undefined;
  return timestampField ? { status: nextStatus, timestampField } : { status: nextStatus };
}

export const executeMissionJobSchema = z.object({
  auditId: z.string().min(1),
  missionId: z.string().min(1),
  missionType: missionTypeSchema,
  targetUrl: z.string().url(),
  correlationId: z.string().min(1),
  missionContext: auditMissionContextSchema.default(defaultAuditMissionContext)
});

export type ExecuteMissionJob = z.infer<typeof executeMissionJobSchema>;

export type StatusTransitionResult = {
  status: AuditStatus;
  timestampField?: "queuedAt" | "startedAt" | "completedAt" | "failedAt";
};

const auditTransitions: Record<AuditStatus, AuditStatus[]> = {
  created: ["validating", "failed", "cancelled"],
  validating: ["planning", "queued", "failed", "cancelled"],
  planning: ["queued", "failed", "cancelled"],
  queued: ["running", "failed", "cancelled"],
  running: ["analyzing", "failed", "cancelled"],
  analyzing: ["generating_report", "completed", "failed", "cancelled"],
  generating_report: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: []
};

export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly currentStatus: AuditStatus,
    readonly nextStatus: AuditStatus
  ) {
    super(`Cannot transition audit from ${currentStatus} to ${nextStatus}.`);
    this.name = "InvalidStatusTransitionError";
  }
}

export function assertValidAuditTransition(currentStatus: AuditStatus, nextStatus: AuditStatus): StatusTransitionResult {
  if (!auditTransitions[currentStatus].includes(nextStatus)) {
    throw new InvalidStatusTransitionError(currentStatus, nextStatus);
  }

  const timestampField =
    nextStatus === "queued"
      ? "queuedAt"
      : nextStatus === "running"
        ? "startedAt"
        : nextStatus === "completed"
          ? "completedAt"
          : nextStatus === "failed"
            ? "failedAt"
            : undefined;

  return timestampField ? { status: nextStatus, timestampField } : { status: nextStatus };
}

export function normalizeAuditUrl(input: string): string {
  const url = new URL(input.trim());
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  return url.toString();
}

export type UrlSafetyMode = "development" | "production";

function normalizeAuditHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.$/, "");
}

function ipv4ToNumber(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    result = result * 256 + octet;
  }
  return result >>> 0;
}

function isIpv4InRange(address: string, base: string, prefix: number): boolean {
  const value = ipv4ToNumber(address);
  const rangeBase = ipv4ToNumber(base);
  if (value === null || rangeBase === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (rangeBase & mask);
}

export function isForbiddenAuditHostname(hostname: string): boolean {
  const host = normalizeAuditHostname(hostname);
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") return true;

  const ipv4 = ipv4ToNumber(host);
  if (ipv4 !== null) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4]
    ].some(([base, prefix]) => isIpv4InRange(host, base as string, prefix as number));
  }

  if (!host.includes(":")) return false;

  const compactIpv6 = host.replace(/^0:0:0:0:0:0:0:1$/, "::1");
  return (
    compactIpv6 === "::" ||
    compactIpv6 === "::1" ||
    compactIpv6.startsWith("::ffff:127.") ||
    compactIpv6.startsWith("::ffff:10.") ||
    compactIpv6.startsWith("::ffff:172.16.") ||
    compactIpv6.startsWith("::ffff:172.17.") ||
    compactIpv6.startsWith("::ffff:172.18.") ||
    compactIpv6.startsWith("::ffff:172.19.") ||
    compactIpv6.startsWith("::ffff:172.2") ||
    compactIpv6.startsWith("::ffff:172.30.") ||
    compactIpv6.startsWith("::ffff:172.31.") ||
    compactIpv6.startsWith("::ffff:192.168.") ||
    compactIpv6.startsWith("fc") ||
    compactIpv6.startsWith("fd") ||
    compactIpv6.startsWith("fe80:")
  );
}

export function assertAuditUrlAllowed(input: string, options: { mode: UrlSafetyMode; devAllowedHosts: string[] }): string {
  let normalized: string;

  try {
    normalized = normalizeAuditUrl(input);
  } catch {
    throw new Error("INVALID_URL");
  }

  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_URL");
  }

  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(normalizeAuditHostname(url.hostname));

  if (options.mode === "development" && isLocalhost && options.devAllowedHosts.includes(host)) {
    return normalized;
  }

  if (isForbiddenAuditHostname(url.hostname)) {
    throw new Error("FORBIDDEN_TARGET");
  }

  return normalized;
}

export function createFindingFingerprint(input: {
  category: FindingCategory;
  title?: string;
  message?: string;
  affectedUrl?: string;
  statusCode?: number;
  selector?: string;
}): string {
  const parts = [
    input.category,
    input.statusCode?.toString() ?? "",
    input.selector ?? "",
    input.affectedUrl ?? "",
    input.message ?? input.title ?? ""
  ];
  return parts
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
}

export function dedupeByFingerprint<T extends { fingerprint: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item.fingerprint)) {
      continue;
    }
    seen.add(item.fingerprint);
    deduped.push(item);
  }

  return deduped;
}

export function calculateReportScore(counts: { critical?: number; high?: number; medium?: number; low?: number }): number {
  const raw =
    100 -
    (counts.critical ?? 0) * 30 -
    (counts.high ?? 0) * 15 -
    (counts.medium ?? 0) * 6 -
    (counts.low ?? 0) * 2;
  return Math.max(0, Math.min(100, raw));
}

export const destructiveInteractionWords = [
  "delete",
  "remove",
  "purchase",
  "pay",
  "send",
  "publish",
  "invite",
  "cancel subscription",
  "logout",
  "reset",
  "confirm order"
];

export function isSafeInteractionLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return !destructiveInteractionWords.some((word) => normalized.includes(word));
}
