import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";

export const runtimeConfigSchema = z.object({
  databaseUrl: z.string().min(1),
  redisUrl: z.string().min(1),
  appUrl: z.string().url(),
  anthropicApiKey: z.string().optional(),
  aiProvider: z.enum(["mock", "anthropic"]),
  anthropicModel: z.string().min(1),
  aiDefaultModel: z.string().min(1),
  aiFastModel: z.string().min(1),
  aiProviderMaxAttempts: z.number().int().min(1).max(5),
  aiProviderInitialBackoffMs: z.number().int().min(50).max(10000),
  aiProviderTimeoutMs: z.number().int().min(1000).max(120000),
  aiProviderFallbackToMock: z.boolean(),
  auditPlanningMode: z.enum(["deterministic", "ai-assisted"]),
  anthropicPlannerModel: z.string().min(1),
  plannerAiEnabled: z.boolean(),
  plannerTimeoutMs: z.number().int().min(1000).max(60000),
  plannerMaxAttempts: z.number().int().min(1).max(3),
  plannerMaxInputTokens: z.number().int().min(1000).max(100000),
  plannerMaxOutputTokens: z.number().int().min(256).max(10000),
  plannerMaxEstimatedCostUsd: z.number().positive().max(10),
  plannerMaxProposedMissions: z.number().int().min(0).max(20),
  plannerMaxPriorityRoutes: z.number().int().min(0).max(50),
  plannerMaxPageTextChars: z.number().int().min(1000).max(100000),
  plannerMaxLinksInContext: z.number().int().min(1).max(200),
  plannerMaxFormsInContext: z.number().int().min(0).max(100),
  plannerMockScenario: z
    .enum(["success", "timeout", "malformed", "unsupported-mission", "over-budget", "rate-limit", "empty", "unsafe-route"])
    .optional(),
  workerConcurrency: z.number().int().positive(),
  missionWorkerConcurrency: z.number().int().min(1).max(8),
  auditMaxParallelMissions: z.number().int().min(1).max(8),
  auditMaxSteps: z.number().int().positive(),
  auditMaxCost: z.number().positive(),
  auditDevAllowedHosts: z.array(z.string().min(1)),
  auditArtifactsDir: z.string().min(1),
  missionDefaultTimeoutMs: z.number().int().min(5000).max(120000),
  missionMaxLinks: z.number().int().min(1).max(100),
  missionMaxInteractions: z.number().int().min(0).max(25),
  missionMaxPages: z.number().int().min(1).max(20),
  accessibilityScanEnabled: z.boolean(),
  interactionTestingEnabled: z.boolean(),
  storageLocalPath: z.string().min(1)
,
  autonomousBrowserMode: z.enum(["disabled", "mock", "enabled"]),
  autonomousMockScenario: z
    .enum([
      "success",
      "unsafe-click",
      "external-navigation",
      "stale-target",
      "repeated-action",
      "invalid-schema",
      "provider-timeout",
      "empty-response",
      "invalid-evidence",
      "endless-inspect",
      "finish-immediately",
      "safety-sequence"
    ])
    .optional(),
  autonomousMaxSteps: z.number().int().min(1).max(40),
  autonomousMaxProviderCalls: z.number().int().min(1).max(40),
  autonomousMaxNavigations: z.number().int().min(0).max(10),
  autonomousMaxClicks: z.number().int().min(0).max(20),
  autonomousMaxFormFills: z.number().int().min(0).max(20),
  autonomousMaxScreenshots: z.number().int().min(0).max(20),
  autonomousMissionTimeoutMs: z.number().int().min(5000).max(300000),
  autonomousStepTimeoutMs: z.number().int().min(1000).max(60000),
  autonomousIdleWaitMs: z.number().int().min(100).max(5000),
  autonomousMaxInputTokens: z.number().int().min(1000).max(100000),
  autonomousMaxOutputTokens: z.number().int().min(100).max(20000),
  autonomousMaxEstimatedCostUsd: z.number().positive().max(10),
  autonomousMaxDomElements: z.number().int().min(10).max(300),
  autonomousMaxVisibleTextChars: z.number().int().min(1000).max(50000),
  autonomousMaxHistoryStepsInContext: z.number().int().min(1).max(20),
  autonomousMaxConsecutiveRejections: z.number().int().min(1).max(10),
  autonomousMaxNoProgressSteps: z.number().int().min(1).max(10),
  autonomousAllowFormFill: z.boolean(),
  autonomousAllowSafeFormSubmit: z.boolean(),
  autonomousAllowExternalNavigation: z.boolean(),
  swarmMode: z.enum(["disabled", "mock", "enabled"]),
  swarmMockScenario: z.enum(["success", "duplicate-route", "duplicate-form", "duplicate-finding", "agent-timeout", "agent-step-limit", "unsafe-agent", "cost-budget", "step-budget", "orchestrator-cancel"]).optional(),
  swarmMaxAgents: z.number().int().min(1).max(6),
  swarmMaxConcurrentAgents: z.number().int().min(1).max(6),
  swarmMaxTotalSteps: z.number().int().min(1).max(200),
  swarmMaxProviderCalls: z.number().int().min(1).max(200),
  swarmMaxNavigations: z.number().int().min(0).max(80),
  swarmMaxScreenshots: z.number().int().min(0).max(80),
  swarmMaxInputTokens: z.number().int().min(1000).max(500000),
  swarmMaxOutputTokens: z.number().int().min(100).max(100000),
  swarmMaxEstimatedCostUsd: z.number().positive().max(25),
  swarmTimeoutMs: z.number().int().min(5000).max(600000),
  githubAppId: z.string().optional(),
  githubAppClientId: z.string().optional(),
  githubAppClientSecret: z.string().optional(),
  githubAppPrivateKey: z.string().optional(),
  githubAppWebhookSecret: z.string().optional(),
  githubOAuthRedirectUri: z.string().url().optional(),
  githubAppSetupUrl: z.string().url().optional(),
  githubExportMock: z.boolean()
}).superRefine((config, context) => {
  if (config.autonomousMaxProviderCalls > config.autonomousMaxSteps) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["autonomousMaxProviderCalls"],
      message: "AUTONOMOUS_MAX_PROVIDER_CALLS must not exceed AUTONOMOUS_MAX_STEPS."
    });
  }
  if (config.autonomousStepTimeoutMs >= config.autonomousMissionTimeoutMs) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["autonomousStepTimeoutMs"],
      message: "AUTONOMOUS_STEP_TIMEOUT_MS must be lower than AUTONOMOUS_MISSION_TIMEOUT_MS."
    });
  }
  if (config.autonomousAllowExternalNavigation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["autonomousAllowExternalNavigation"],
      message: "AUTONOMOUS_ALLOW_EXTERNAL_NAVIGATION must remain false."
    });
  }
  if (config.swarmMaxConcurrentAgents > config.swarmMaxAgents) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["swarmMaxConcurrentAgents"],
      message: "SWARM_MAX_CONCURRENT_AGENTS must not exceed SWARM_MAX_AGENTS."
    });
  }
  if (config.swarmMaxProviderCalls < config.swarmMaxTotalSteps) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["swarmMaxProviderCalls"],
      message: "SWARM_MAX_PROVIDER_CALLS must be at least SWARM_MAX_TOTAL_STEPS."
    });
  }
  if (config.aiProvider === "anthropic" && !config.anthropicApiKey && !config.aiProviderFallbackToMock) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["anthropicApiKey"],
      message: "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic."
    });
  }
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const output: Record<string, string> = {};
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (!key) continue;
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    output[key] = value;
  }
  return output;
}

function findUpwards(fileName: string, startDir = process.cwd()): string {
  let current = resolve(startDir);
  const root = parse(current).root;
  while (true) {
    const candidate = join(current, fileName);
    if (existsSync(candidate)) return candidate;
    if (current === root) return candidate;
    current = dirname(current);
  }
}

export function loadRuntimeEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const envFile = parseEnvFile(findUpwards(".env"));
  const envLocalFile = parseEnvFile(findUpwards(".env.local"));
  return {
    ...envFile,
    ...envLocalFile,
    ...env
  };
}

function normalizeAnthropicModel(model: string | undefined): string | undefined {
  if (!model) return undefined;
  const retiredAliases: Record<string, string> = {
    "claude-sonnet-4": "claude-sonnet-4-6",
    "claude-sonnet-4-20250514": "claude-sonnet-4-6"
  };
  return retiredAliases[model] ?? model;
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const loadedEnv = loadRuntimeEnv(env);
  const anthropicModel = normalizeAnthropicModel(loadedEnv.ANTHROPIC_MODEL ?? loadedEnv.AI_DEFAULT_MODEL) ?? "claude-sonnet-4-6";
  const aiDefaultModel = normalizeAnthropicModel(loadedEnv.AI_DEFAULT_MODEL ?? loadedEnv.ANTHROPIC_MODEL) ?? "claude-sonnet-4-6";
  const anthropicPlannerModel =
    normalizeAnthropicModel(loadedEnv.ANTHROPIC_PLANNER_MODEL || loadedEnv.ANTHROPIC_MODEL || loadedEnv.AI_FAST_MODEL) ??
    "claude-sonnet-4-6";
  const parsed = runtimeConfigSchema.parse({
    databaseUrl: loadedEnv.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/ai_swarm_qa",
    redisUrl: loadedEnv.REDIS_URL ?? "redis://localhost:6379",
    appUrl: loadedEnv.APP_URL ?? "http://localhost:3000",
    anthropicApiKey: loadedEnv.ANTHROPIC_API_KEY,
    aiProvider: loadedEnv.AI_PROVIDER ?? "mock",
    anthropicModel,
    aiDefaultModel,
    aiFastModel: loadedEnv.AI_FAST_MODEL ?? "claude-haiku-4-5",
    aiProviderMaxAttempts: Number(loadedEnv.AI_PROVIDER_MAX_ATTEMPTS ?? 2),
    aiProviderInitialBackoffMs: Number(loadedEnv.AI_PROVIDER_INITIAL_BACKOFF_MS ?? 250),
    aiProviderTimeoutMs: Number(loadedEnv.AI_PROVIDER_TIMEOUT_MS ?? 20000),
    aiProviderFallbackToMock: (loadedEnv.AI_PROVIDER_FALLBACK_TO_MOCK ?? "true") === "true",
    auditPlanningMode: loadedEnv.AUDIT_PLANNING_MODE ?? "deterministic",
    anthropicPlannerModel,
    plannerAiEnabled: (loadedEnv.PLANNER_AI_ENABLED ?? "false") === "true",
    plannerTimeoutMs: Number(loadedEnv.PLANNER_TIMEOUT_MS ?? 20000),
    plannerMaxAttempts: Number(loadedEnv.PLANNER_MAX_ATTEMPTS ?? 2),
    plannerMaxInputTokens: Number(loadedEnv.PLANNER_MAX_INPUT_TOKENS ?? 12000),
    plannerMaxOutputTokens: Number(loadedEnv.PLANNER_MAX_OUTPUT_TOKENS ?? 2500),
    plannerMaxEstimatedCostUsd: Number(loadedEnv.PLANNER_MAX_ESTIMATED_COST_USD ?? 0.15),
    plannerMaxProposedMissions: Number(loadedEnv.PLANNER_MAX_PROPOSED_MISSIONS ?? 8),
    plannerMaxPriorityRoutes: Number(loadedEnv.PLANNER_MAX_PRIORITY_ROUTES ?? 10),
    plannerMaxPageTextChars: Number(loadedEnv.PLANNER_MAX_PAGE_TEXT_CHARS ?? 20000),
    plannerMaxLinksInContext: Number(loadedEnv.PLANNER_MAX_LINKS_IN_CONTEXT ?? 50),
    plannerMaxFormsInContext: Number(loadedEnv.PLANNER_MAX_FORMS_IN_CONTEXT ?? 20),
    plannerMockScenario: loadedEnv.PLANNER_MOCK_SCENARIO as RuntimeConfig["plannerMockScenario"],
    workerConcurrency: Number(loadedEnv.WORKER_CONCURRENCY ?? 2),
    missionWorkerConcurrency: Number(loadedEnv.MISSION_WORKER_CONCURRENCY ?? 3),
    auditMaxParallelMissions: Number(loadedEnv.AUDIT_MAX_PARALLEL_MISSIONS ?? 3),
    auditMaxSteps: Number(loadedEnv.AUDIT_MAX_STEPS ?? 80),
    auditMaxCost: Number(loadedEnv.AUDIT_MAX_COST ?? 3),
    auditDevAllowedHosts: (loadedEnv.AUDIT_DEV_ALLOWED_HOSTS ?? "localhost:4100,127.0.0.1:4100")
      .split(",")
      .map((host) => host.trim())
      .filter(Boolean),
    auditArtifactsDir: loadedEnv.AUDIT_ARTIFACTS_DIR ?? "./artifacts",
    missionDefaultTimeoutMs: Number(loadedEnv.MISSION_DEFAULT_TIMEOUT_MS ?? 45000),
    missionMaxLinks: Number(loadedEnv.MISSION_MAX_LINKS ?? 10),
    missionMaxInteractions: Number(loadedEnv.MISSION_MAX_INTERACTIONS ?? 5),
    missionMaxPages: Number(loadedEnv.MISSION_MAX_PAGES ?? 3),
    accessibilityScanEnabled: (loadedEnv.ACCESSIBILITY_SCAN_ENABLED ?? "true") === "true",
    interactionTestingEnabled: (loadedEnv.INTERACTION_TESTING_ENABLED ?? "true") === "true",
    storageLocalPath: loadedEnv.STORAGE_LOCAL_PATH ?? "./storage/dev",
    autonomousBrowserMode: loadedEnv.AUTONOMOUS_BROWSER_MODE ?? "disabled",
    autonomousMockScenario: loadedEnv.AUTONOMOUS_MOCK_SCENARIO as RuntimeConfig["autonomousMockScenario"],
    autonomousMaxSteps: Number(loadedEnv.AUTONOMOUS_MAX_STEPS ?? 12),
    autonomousMaxProviderCalls: Number(loadedEnv.AUTONOMOUS_MAX_PROVIDER_CALLS ?? 12),
    autonomousMaxNavigations: Number(loadedEnv.AUTONOMOUS_MAX_NAVIGATIONS ?? 4),
    autonomousMaxClicks: Number(loadedEnv.AUTONOMOUS_MAX_CLICKS ?? 6),
    autonomousMaxFormFills: Number(loadedEnv.AUTONOMOUS_MAX_FORM_FILLS ?? 4),
    autonomousMaxScreenshots: Number(loadedEnv.AUTONOMOUS_MAX_SCREENSHOTS ?? 8),
    autonomousMissionTimeoutMs: Number(loadedEnv.AUTONOMOUS_MISSION_TIMEOUT_MS ?? 120000),
    autonomousStepTimeoutMs: Number(loadedEnv.AUTONOMOUS_STEP_TIMEOUT_MS ?? 15000),
    autonomousIdleWaitMs: Number(loadedEnv.AUTONOMOUS_IDLE_WAIT_MS ?? 750),
    autonomousMaxInputTokens: Number(loadedEnv.AUTONOMOUS_MAX_INPUT_TOKENS ?? 30000),
    autonomousMaxOutputTokens: Number(loadedEnv.AUTONOMOUS_MAX_OUTPUT_TOKENS ?? 5000),
    autonomousMaxEstimatedCostUsd: Number(loadedEnv.AUTONOMOUS_MAX_ESTIMATED_COST_USD ?? 0.3),
    autonomousMaxDomElements: Number(loadedEnv.AUTONOMOUS_MAX_DOM_ELEMENTS ?? 80),
    autonomousMaxVisibleTextChars: Number(loadedEnv.AUTONOMOUS_MAX_VISIBLE_TEXT_CHARS ?? 12000),
    autonomousMaxHistoryStepsInContext: Number(loadedEnv.AUTONOMOUS_MAX_HISTORY_STEPS_IN_CONTEXT ?? 8),
    autonomousMaxConsecutiveRejections: Number(loadedEnv.AUTONOMOUS_MAX_CONSECUTIVE_REJECTIONS ?? 4),
    autonomousMaxNoProgressSteps: Number(loadedEnv.AUTONOMOUS_MAX_NO_PROGRESS_STEPS ?? 3),
    autonomousAllowFormFill: (loadedEnv.AUTONOMOUS_ALLOW_FORM_FILL ?? "true") === "true",
    autonomousAllowSafeFormSubmit: (loadedEnv.AUTONOMOUS_ALLOW_SAFE_FORM_SUBMIT ?? "false") === "true",
    autonomousAllowExternalNavigation: (loadedEnv.AUTONOMOUS_ALLOW_EXTERNAL_NAVIGATION ?? "false") === "true",
    swarmMode: loadedEnv.SWARM_MODE ?? "disabled",
    swarmMockScenario: loadedEnv.SWARM_MOCK_SCENARIO as RuntimeConfig["swarmMockScenario"],
    swarmMaxAgents: Number(loadedEnv.SWARM_MAX_AGENTS ?? 4),
    swarmMaxConcurrentAgents: Number(loadedEnv.SWARM_MAX_CONCURRENT_AGENTS ?? 2),
    swarmMaxTotalSteps: Number(loadedEnv.SWARM_MAX_TOTAL_STEPS ?? 40),
    swarmMaxProviderCalls: Number(loadedEnv.SWARM_MAX_PROVIDER_CALLS ?? 40),
    swarmMaxNavigations: Number(loadedEnv.SWARM_MAX_NAVIGATIONS ?? 16),
    swarmMaxScreenshots: Number(loadedEnv.SWARM_MAX_SCREENSHOTS ?? 24),
    swarmMaxInputTokens: Number(loadedEnv.SWARM_MAX_INPUT_TOKENS ?? 100000),
    swarmMaxOutputTokens: Number(loadedEnv.SWARM_MAX_OUTPUT_TOKENS ?? 15000),
    swarmMaxEstimatedCostUsd: Number(loadedEnv.SWARM_MAX_ESTIMATED_COST_USD ?? 1),
    swarmTimeoutMs: Number(loadedEnv.SWARM_TIMEOUT_MS ?? 300000),
    githubAppId: loadedEnv.GITHUB_APP_ID || undefined,
    githubAppClientId: loadedEnv.GITHUB_APP_CLIENT_ID || undefined,
    githubAppClientSecret: loadedEnv.GITHUB_APP_CLIENT_SECRET || undefined,
    githubAppPrivateKey: loadedEnv.GITHUB_APP_PRIVATE_KEY || undefined,
    githubAppWebhookSecret: loadedEnv.GITHUB_APP_WEBHOOK_SECRET || undefined,
    githubOAuthRedirectUri: loadedEnv.GITHUB_APP_CALLBACK_URL || loadedEnv.GITHUB_OAUTH_REDIRECT_URI || undefined,
    githubAppSetupUrl: loadedEnv.GITHUB_APP_SETUP_URL || undefined,
    githubExportMock: (loadedEnv.GITHUB_EXPORT_MOCK ?? "false") === "true"
  });

  return parsed;
}
