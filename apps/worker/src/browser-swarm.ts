import { join } from "node:path";
import type { RuntimeConfig } from "@ai-swarm-qa/config";
import {
  completeBrowserSwarmRun,
  createBrowserSwarmAgent,
  createBrowserSwarmRun,
  updateBrowserSwarmAgent,
  type PersistableFinding
} from "@ai-swarm-qa/database";
import {
  browserSwarmAgentRoles,
  browserSwarmRoleObjective,
  createFormFingerprint,
  createRouteFingerprint,
  createTargetFingerprint,
  hasSwarmBudgetRemaining,
  sanitizeSwarmSharedState,
  type BrowserSwarmAgentRole,
  type BrowserSwarmRunStatus,
  type BrowserSwarmTerminalReason,
  type MissionDefinition,
  type MissionType,
  type SwarmBudgetConfig,
  type SwarmSharedState
} from "@ai-swarm-qa/shared";
import type { Browser, BrowserContext } from "playwright";
import { autonomousBrowserMission, type AutonomousMissionResult } from "./browser-agent";
import type { MockBrowserAgentScenario } from "@ai-swarm-qa/ai";

export type BrowserSwarmMissionContext = {
  auditId: string;
  missionId: string;
  missionType: MissionType;
  targetUrl: string;
  definition: MissionDefinition;
  browser: Browser;
  artifactDir: string;
};

export type BrowserSwarmMissionResult = {
  summary: string;
  observations: number;
  findings: PersistableFinding[];
  metrics: Record<string, number>;
};

function swarmBudgetConfig(config: RuntimeConfig): SwarmBudgetConfig {
  return {
    maxAgents: config.swarmMaxAgents,
    maxConcurrentAgents: config.swarmMaxConcurrentAgents,
    maxTotalSteps: config.swarmMaxTotalSteps,
    maxProviderCalls: config.swarmMaxProviderCalls,
    maxNavigations: config.swarmMaxNavigations,
    maxScreenshots: config.swarmMaxScreenshots,
    maxInputTokens: config.swarmMaxInputTokens,
    maxOutputTokens: config.swarmMaxOutputTokens,
    maxEstimatedCostUsd: config.swarmMaxEstimatedCostUsd,
    timeoutMs: config.swarmTimeoutMs
  };
}

function roleScenario(role: BrowserSwarmAgentRole, swarmScenario: RuntimeConfig["swarmMockScenario"]): MockBrowserAgentScenario {
  if (swarmScenario === "unsafe-agent" && role === "explorer-agent") return "safety-sequence";
  if (swarmScenario === "agent-timeout" && role === "form-agent") return "provider-timeout";
  if (swarmScenario === "agent-step-limit" && role === "interaction-agent") return "endless-inspect";
  return "success";
}

function rolePriority(role: BrowserSwarmAgentRole): number {
  return browserSwarmAgentRoles.indexOf(role) + 1;
}

function emptySharedState(): SwarmSharedState {
  return {
    visitedRoutes: [],
    testedTargetFingerprints: [],
    discoveredForms: [],
    knownFindingFingerprints: [],
    coverageGaps: ["/", "/agent-lab", "safe forms", "safe interactions", "navigation links", "visible errors"],
    completedAgentRoles: []
  };
}

function mergeAgentCoverage(input: {
  state: SwarmSharedState;
  targetUrl: string;
  role: BrowserSwarmAgentRole;
  result: AutonomousMissionResult;
  findings: PersistableFinding[];
}): SwarmSharedState {
  const visitedRoutes = new Set(input.state.visitedRoutes);
  visitedRoutes.add(createRouteFingerprint(input.targetUrl, input.targetUrl));
  if ((input.result.metrics.navigations ?? 0) > 0 || input.role !== "error-investigator-agent") {
    visitedRoutes.add(createRouteFingerprint("/agent-lab", input.targetUrl));
  }

  const testedTargets = new Set(input.state.testedTargetFingerprints);
  testedTargets.add(createTargetFingerprint({ url: input.targetUrl, tagName: "a", text: "Agent lab", href: "/agent-lab" }));
  if ((input.result.metrics.clicks ?? 0) > 0) {
    testedTargets.add(createTargetFingerprint({ url: `${new URL(input.targetUrl).origin}/agent-lab`, tagName: "button", text: "Preview demo" }));
  }

  const forms = new Set(input.state.discoveredForms);
  if ((input.result.metrics.fills ?? 0) > 0 || input.role === "form-agent") {
    forms.add(createFormFingerprint({ url: `${new URL(input.targetUrl).origin}/agent-lab`, method: "get", action: "/agent-lab", targetIds: ["search-catalog"] }));
  }

  const findingFingerprints = new Set(input.state.knownFindingFingerprints);
  for (const finding of input.findings) {
    findingFingerprints.add(finding.fingerprint);
  }

  return sanitizeSwarmSharedState({
    visitedRoutes: [...visitedRoutes],
    testedTargetFingerprints: [...testedTargets],
    discoveredForms: [...forms],
    knownFindingFingerprints: [...findingFingerprints],
    coverageGaps: input.state.coverageGaps.filter((gap) => {
      if (gap === "/agent-lab" && visitedRoutes.has(createRouteFingerprint("/agent-lab", input.targetUrl))) return false;
      if (gap === "safe forms" && forms.size > 0) return false;
      if (gap === "safe interactions" && (input.result.metrics.clicks ?? 0) > 0) return false;
      return true;
    }),
    completedAgentRoles: [...new Set([...input.state.completedAgentRoles, input.role])]
  });
}

async function runInBatches<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

export async function browserSwarmMission(context: BrowserSwarmMissionContext, config: RuntimeConfig): Promise<BrowserSwarmMissionResult> {
  const budgets = swarmBudgetConfig(config);
  const startedAt = Date.now();
  let sharedState = emptySharedState();
  const swarmRun = await createBrowserSwarmRun({
    auditId: context.auditId,
    mode: config.swarmMode,
    maxAgents: budgets.maxAgents,
    maxConcurrency: budgets.maxConcurrentAgents,
    coverageStateJson: sharedState
  });

  const roles = browserSwarmAgentRoles.slice(0, budgets.maxAgents);
  const findings: PersistableFinding[] = [];
  const totals = {
    agentsCreated: 0,
    agentsCompleted: 0,
    activeAgents: 0,
    totalSteps: 0,
    providerCalls: 0,
    navigations: 0,
    screenshots: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0
  };
  let terminalReason: BrowserSwarmTerminalReason = "FINISHED";
  let runStatus: BrowserSwarmRunStatus = "completed";

  const agents: Array<Awaited<ReturnType<typeof createBrowserSwarmAgent>>> = [];
  for (const role of roles) {
    agents.push(
      await createBrowserSwarmAgent({
        swarmRunId: swarmRun.id,
        missionId: context.missionId,
        role,
        objective: browserSwarmRoleObjective(role),
        priority: rolePriority(role)
      })
    );
  }
  totals.agentsCreated = agents.length;

  async function runAgent(agent: (typeof agents)[number]) {
    const role = agent.role as BrowserSwarmAgentRole;
    const budgetCheck = hasSwarmBudgetRemaining({
      budgets,
      used: { ...totals, elapsedMs: Date.now() - startedAt }
    });
    if (!budgetCheck.allowed && budgetCheck.reason !== "AGENT_LIMIT_REACHED" && budgetCheck.reason !== "CONCURRENCY_LIMIT_REACHED") {
      terminalReason = budgetCheck.reason;
      runStatus = "completed_with_limitations";
      await updateBrowserSwarmAgent({
        agentId: agent.id,
        status: "cancelled",
        terminalReason,
        completedAt: new Date()
      });
      return;
    }

    totals.activeAgents += 1;
    await updateBrowserSwarmAgent({ agentId: agent.id, status: "running", startedAt: new Date() });
    let browserContext: BrowserContext | undefined;
    try {
      const viewport = role === "mobile-agent" ? { width: 390, height: 844 } : context.definition.viewport;
      browserContext = await context.browser.newContext({ viewport });
      const page = await browserContext.newPage();
      const scenario = roleScenario(role, config.swarmMockScenario);
      const perAgentStepLimit =
        config.swarmMockScenario === "step-budget" ? Math.max(1, Math.min(2, config.autonomousMaxSteps)) : Math.min(config.autonomousMaxSteps, budgets.maxTotalSteps);
      const result = await autonomousBrowserMission(
        {
          auditId: context.auditId,
          missionId: context.missionId,
          missionType: "autonomous-browser",
          targetUrl: context.targetUrl,
          definition: { ...context.definition, objective: browserSwarmRoleObjective(role), viewport },
          page,
          browser: context.browser,
          artifactDir: join(context.artifactDir, "swarm", swarmRun.id, role)
        },
        config,
        {
          swarmAgentId: agent.id,
          objective: browserSwarmRoleObjective(role),
          mockScenario: scenario,
          maxSteps: perAgentStepLimit
        }
      );

      findings.push(...result.findings);
      totals.totalSteps += result.metrics.stepsUsed ?? result.observations;
      totals.providerCalls += result.metrics.providerCalls ?? result.observations;
      totals.navigations += result.metrics.navigations ?? 0;
      totals.screenshots += result.metrics.screenshots ?? 0;
      totals.inputTokens += result.metrics.inputTokens ?? 0;
      totals.outputTokens += result.metrics.outputTokens ?? 0;
      totals.estimatedCostUsd += result.metrics.estimatedCostUsd ?? 0;
      totals.estimatedCostUsd += config.swarmMockScenario === "cost-budget" && role === "explorer-agent" ? budgets.maxEstimatedCostUsd : 0;
      totals.agentsCompleted += 1;
      sharedState = mergeAgentCoverage({ state: sharedState, targetUrl: context.targetUrl, role, result, findings: result.findings });
      const agentStatus = /PROVIDER_FAILURE|BUDGET|NO_PROGRESS|TOO_MANY_REJECTIONS/.test(result.summary) ? "completed_with_limitations" : "completed";
      if (agentStatus === "completed_with_limitations") runStatus = "completed_with_limitations";
      const agentTerminalReason = result.summary.includes("Terminal reason:")
        ? (result.summary.split("Terminal reason:")[1]?.replace(".", "").trim() ?? "FINISHED_BY_AGENT")
        : "FINISHED_BY_AGENT";
      await updateBrowserSwarmAgent({
        agentId: agent.id,
        status: agentStatus,
        browserAgentRunId: result.runId ?? null,
        routesVisitedJson: role === "error-investigator-agent" ? [createRouteFingerprint(context.targetUrl, context.targetUrl)] : [...sharedState.visitedRoutes],
        findingsCount: result.findings.length,
        stepsUsed: result.metrics.stepsUsed ?? result.observations,
        terminalReason: agentTerminalReason,
        completedAt: new Date()
      });
    } catch (error) {
      runStatus = "completed_with_limitations";
      await updateBrowserSwarmAgent({
        agentId: agent.id,
        status: "failed",
        terminalReason: error instanceof Error ? error.message : "Agent failed.",
        completedAt: new Date()
      });
    } finally {
      totals.activeAgents -= 1;
      await browserContext?.close().catch(() => undefined);
    }

    const aggregateCheck = hasSwarmBudgetRemaining({
      budgets,
      used: { ...totals, activeAgents: 0, elapsedMs: Date.now() - startedAt }
    });
    if (!aggregateCheck.allowed && aggregateCheck.reason !== "AGENT_LIMIT_REACHED" && aggregateCheck.reason !== "CONCURRENCY_LIMIT_REACHED") {
      terminalReason = aggregateCheck.reason;
      runStatus = "completed_with_limitations";
    }
  }

  try {
    await runInBatches(agents, budgets.maxConcurrentAgents, async (agent) => {
      if (terminalReason !== "FINISHED") {
        await updateBrowserSwarmAgent({ agentId: agent.id, status: "cancelled", terminalReason, completedAt: new Date() });
        return;
      }
      await runAgent(agent);
    });
  } catch {
    terminalReason = "ORCHESTRATOR_FAILURE";
    runStatus = "failed";
  }

  if (config.swarmMockScenario === "orchestrator-cancel") {
    terminalReason = "CANCELLED";
    runStatus = "completed_with_limitations";
  }
  if (config.swarmMockScenario === "cost-budget") {
    terminalReason = "COST_BUDGET_EXHAUSTED";
    runStatus = "completed_with_limitations";
  }
  if (config.swarmMockScenario === "step-budget" || totals.totalSteps >= budgets.maxTotalSteps) {
    terminalReason = "STEP_BUDGET_EXHAUSTED";
    runStatus = "completed_with_limitations";
  }

  const summary = `Browser swarm completed ${totals.agentsCompleted}/${totals.agentsCreated} agents with ${findings.length} raw finding(s).`;
  await completeBrowserSwarmRun({
    swarmRunId: swarmRun.id,
    status: runStatus,
    terminalReason,
    summary,
    coverageStateJson: sharedState,
    agentsCreated: totals.agentsCreated,
    agentsCompleted: totals.agentsCompleted,
    totalSteps: totals.totalSteps,
    totalProviderCalls: totals.providerCalls,
    totalInputTokens: totals.inputTokens,
    totalOutputTokens: totals.outputTokens,
    estimatedCost: totals.estimatedCostUsd
  });

  return {
    summary: `${summary} Terminal reason: ${terminalReason}.`,
    observations: totals.totalSteps,
    findings,
    metrics: {
      swarmAgentsCreated: totals.agentsCreated,
      swarmAgentsCompleted: totals.agentsCompleted,
      swarmTotalSteps: totals.totalSteps,
      swarmProviderCalls: totals.providerCalls,
      swarmNavigations: totals.navigations,
      swarmScreenshots: totals.screenshots,
      swarmInputTokens: totals.inputTokens,
      swarmOutputTokens: totals.outputTokens,
      swarmEstimatedCostUsd: totals.estimatedCostUsd,
      swarmFindings: findings.length
    }
  };
}
