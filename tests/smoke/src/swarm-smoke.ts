const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const fixtureUrl = process.env.SMOKE_TARGET_URL ?? "http://localhost:4100";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 120000);
const mode = process.argv[2] ?? "success";

type SwarmSummary = {
  id: string;
  status: string;
  mode: string;
  maxAgents: number;
  maxConcurrency: number;
  agentsCreated: number;
  agentsCompleted: number;
  totalSteps: number;
  totalProviderCalls: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  estimatedCostUsd: number | null;
  terminalReason: string | null;
  coverageState: {
    visitedRoutes?: string[];
    testedTargetFingerprints?: string[];
    discoveredForms?: string[];
    knownFindingFingerprints?: string[];
    coverageGaps?: string[];
    completedAgentRoles?: string[];
  };
  agents: Array<{
    id: string;
    browserAgentRunId: string | null;
    role: string;
    status: string;
    routesVisited: string[];
    findingsCount: number;
    stepsUsed: number;
    terminalReason: string | null;
  }>;
};

type Summary = {
  audit: { status: string; findingCount: number; failureReason: string | null };
  missions: Array<{ id: string; type: string; status: string; findingCount: number }>;
  browserAgentRuns: Array<{
    id: string;
    steps: Array<{ proposedTool: string; safetyAllowed: boolean; rejectionCode: string | null; executionStatus: string }>;
  }>;
  browserSwarmRuns: SwarmSummary[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body as T;
}

async function main() {
  const created = await fetchJson<{ id: string; status: string }>(`${appUrl}/api/audits`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: fixtureUrl })
  });

  const deadline = Date.now() + timeoutMs;
  let summary: Summary | undefined;
  while (Date.now() < deadline) {
    summary = await fetchJson<Summary>(`${appUrl}/api/audits/${created.id}`);
    if (["completed", "failed", "cancelled"].includes(summary.audit.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!summary) throw new Error("Audit summary was never loaded.");
  if (summary.audit.status !== "completed") {
    throw new Error(`Audit did not complete. Status: ${summary.audit.status}. Reason: ${summary.audit.failureReason ?? "none"}`);
  }
  const swarmMission = summary.missions.find((mission) => mission.type === "browser-swarm");
  if (!swarmMission) throw new Error("Expected browser-swarm mission.");
  const swarm = summary.browserSwarmRuns[0];
  if (!swarm) throw new Error("Expected BrowserSwarmRun.");
  if (mode === "anthropic") {
    if (swarm.agentsCreated < 1) throw new Error(`Expected at least one swarm agent, received ${swarm.agentsCreated}.`);
  } else if (swarm.agentsCreated < 3) {
    throw new Error(`Expected at least three swarm agents, received ${swarm.agentsCreated}.`);
  }
  if (swarm.maxConcurrency > 2) throw new Error(`Expected configured concurrency no greater than 2, received ${swarm.maxConcurrency}.`);
  if (swarm.totalSteps <= 0) throw new Error("Expected aggregate swarm steps.");
  if ((swarm.coverageState.visitedRoutes ?? []).length < 1) throw new Error("Expected visited route coverage.");
  if (new Set(swarm.coverageState.visitedRoutes ?? []).size !== (swarm.coverageState.visitedRoutes ?? []).length) {
    throw new Error("Expected duplicate route coverage to be deduplicated.");
  }

  const runIds = new Set(summary.browserAgentRuns.map((run) => run.id));
  for (const agent of swarm.agents.filter((agent) => !["cancelled", "skipped"].includes(agent.status))) {
    if (!agent.browserAgentRunId || !runIds.has(agent.browserAgentRunId)) {
      throw new Error(`Expected replay history for ${agent.role}.`);
    }
  }

  if (mode === "success") {
    if (swarm.status !== "completed" && swarm.status !== "completed_with_limitations") {
      throw new Error(`Expected completed swarm, received ${swarm.status}.`);
    }
    if (swarm.agentsCompleted < 3) throw new Error(`Expected at least three completed agents, received ${swarm.agentsCompleted}.`);
    if (swarmMission.findingCount < 1) throw new Error("Expected swarm findings through central pipeline.");
  } else if (mode === "anthropic") {
    if (!["completed", "completed_with_limitations"].includes(swarm.status)) {
      throw new Error(`Expected completed Anthropic swarm, received ${swarm.status}.`);
    }
    if (!swarm.totalInputTokens || !swarm.totalOutputTokens) throw new Error("Expected Anthropic swarm token totals.");
    if (typeof swarm.estimatedCostUsd !== "number" || swarm.estimatedCostUsd <= 0) throw new Error("Expected Anthropic swarm cost total.");
    if (summary.browserAgentRuns.some((run) => run.steps.length === 0)) throw new Error("Expected replay steps for Anthropic swarm agents.");
  } else if (mode === "safety") {
    const rejectionCodes = summary.browserAgentRuns.flatMap((run) => run.steps.map((step) => step.rejectionCode).filter(Boolean));
    for (const expected of ["EXTERNAL_ORIGIN", "DESTRUCTIVE_ACTION", "PASSWORD_FIELD", "PAYMENT_ACTION"]) {
      if (!rejectionCodes.includes(expected)) throw new Error(`Expected safety rejection ${expected}. Saw ${rejectionCodes.join(", ")}`);
    }
    if (!swarm.agents.some((agent) => agent.status === "completed_with_limitations")) {
      throw new Error("Expected one limited unsafe agent.");
    }
    if (summary.audit.status !== "completed") throw new Error("Expected audit to complete despite unsafe agent.");
  } else {
    if (!["STEP_BUDGET_EXHAUSTED", "COST_BUDGET_EXHAUSTED", "CANCELLED"].includes(swarm.terminalReason ?? "")) {
      throw new Error(`Expected budget terminal reason, received ${swarm.terminalReason ?? "none"}.`);
    }
    if (swarm.status !== "completed_with_limitations") {
      throw new Error(`Expected completed_with_limitations budget swarm, received ${swarm.status}.`);
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode,
      auditId: created.id,
      missionId: swarmMission.id,
      swarmRunId: swarm.id,
      status: summary.audit.status,
      swarmStatus: swarm.status,
      terminalReason: swarm.terminalReason,
      agentsCreated: swarm.agentsCreated,
      agentsCompleted: swarm.agentsCompleted,
      totalSteps: swarm.totalSteps,
      totalProviderCalls: swarm.totalProviderCalls,
      totalInputTokens: swarm.totalInputTokens,
      totalOutputTokens: swarm.totalOutputTokens,
      estimatedCostUsd: swarm.estimatedCostUsd,
      findings: swarmMission.findingCount,
      visitedRoutes: swarm.coverageState.visitedRoutes ?? [],
      roles: swarm.agents.map((agent) => `${agent.role}:${agent.status}`)
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};
