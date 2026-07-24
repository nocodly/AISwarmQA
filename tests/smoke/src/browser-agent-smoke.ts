const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const fixtureUrl = process.env.SMOKE_TARGET_URL ?? "http://localhost:4100";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 90000);
const mode = process.argv[2] ?? "success";

type BrowserAgentRun = {
  id: string;
  missionId: string;
  status: string;
  provider: string;
  model: string | null;
  terminalReason: string | null;
  stepsUsed: number;
  providerCalls: number;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  finalUrl: string | null;
  steps: Array<{
    sequence: number;
    proposedTool: string;
    executionStatus: string;
    safetyAllowed: boolean;
    rejectionCode: string | null;
    urlAfter: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
  }>;
};

type Summary = {
  audit: { status: string; findingCount: number; failureReason: string | null };
  missions: Array<{ id: string; type: string; status: string; findingCount: number }>;
  report: { overallScore: number } | null;
  browserAgentRuns: BrowserAgentRun[];
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
  const autonomousMission = summary.missions.find((mission) => mission.type === "autonomous-browser");
  if (!autonomousMission) throw new Error("Expected autonomous-browser mission.");
  const run = summary.browserAgentRuns[0];
  if (!run) throw new Error("Expected BrowserAgentRun.");
  if (run.steps.length === 0) throw new Error("Expected replay steps.");
  if (run.steps.some((step, index) => step.sequence !== index + 1)) throw new Error("Expected ordered replay steps.");

  if (mode === "success") {
    if (!run.steps.some((step) => step.proposedTool === "click" || step.proposedTool === "navigate")) {
      throw new Error("Expected at least one safe click or navigation.");
    }
    if (!run.steps.some((step) => step.proposedTool === "fill")) {
      throw new Error("Expected at least one safe form fill.");
    }
    if (!run.steps.some((step) => step.proposedTool === "report_finding")) {
      throw new Error("Expected an agent-reported finding.");
    }
    if (autonomousMission.findingCount < 1) {
      throw new Error("Expected autonomous finding provenance.");
    }
  } else if (mode === "anthropic") {
    if (run.provider !== "anthropic") {
      throw new Error(`Expected Anthropic Browser Agent provider, received ${run.provider}.`);
    }
    if (!run.model) throw new Error("Expected Anthropic Browser Agent model.");
    if (run.providerCalls <= 0) throw new Error("Expected Anthropic provider calls.");
    if (!run.inputTokens || !run.outputTokens) throw new Error("Expected Anthropic Browser Agent token totals.");
    if (typeof run.estimatedCostUsd !== "number" || run.estimatedCostUsd <= 0) throw new Error("Expected Anthropic Browser Agent cost estimate.");
    const finalOrigin = new URL(run.finalUrl ?? fixtureUrl).origin;
    if (finalOrigin !== new URL(fixtureUrl).origin) {
      throw new Error(`Expected final origin to remain ${new URL(fixtureUrl).origin}, received ${finalOrigin}.`);
    }
    if (run.steps.some((step) => step.safetyAllowed && step.executionStatus === "executed" && step.urlAfter && new URL(step.urlAfter).origin !== new URL(fixtureUrl).origin)) {
      throw new Error("Expected all executed Anthropic Browser Agent steps to remain same-origin.");
    }
  } else {
    const rejectionCodes = run.steps.map((step) => step.rejectionCode).filter(Boolean);
    for (const expected of ["EXTERNAL_ORIGIN", "DESTRUCTIVE_ACTION", "PASSWORD_FIELD", "PAYMENT_ACTION"]) {
      if (!rejectionCodes.includes(expected)) {
        throw new Error(`Expected rejection code ${expected}. Saw ${rejectionCodes.join(", ")}`);
      }
    }
    if (run.steps.some((step) => step.safetyAllowed && ["click", "fill", "navigate"].includes(step.proposedTool))) {
      throw new Error("Expected no unsafe click, fill, or navigation to execute.");
    }
    const finalOrigin = new URL(run.finalUrl ?? fixtureUrl).origin;
    if (finalOrigin !== new URL(fixtureUrl).origin) {
      throw new Error(`Expected final origin to remain ${new URL(fixtureUrl).origin}, received ${finalOrigin}.`);
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode,
      auditId: created.id,
      missionId: autonomousMission.id,
      runId: run.id,
      status: summary.audit.status,
      provider: run.provider,
      model: run.model,
      terminalReason: run.terminalReason,
      stepsUsed: run.stepsUsed,
      providerCalls: run.providerCalls,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      estimatedCostUsd: run.estimatedCostUsd,
      safeActionsExecuted: run.steps.filter((step) => step.safetyAllowed && step.executionStatus === "executed").length,
      rejectedActions: run.steps.filter((step) => !step.safetyAllowed).length,
      rejectionCodes: run.steps.map((step) => step.rejectionCode).filter(Boolean),
      findings: autonomousMission.findingCount,
      finalOrigin: new URL(run.finalUrl ?? fixtureUrl).origin
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};
