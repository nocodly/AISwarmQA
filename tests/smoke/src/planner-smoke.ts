const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const fixtureUrl = process.env.SMOKE_TARGET_URL ?? "http://localhost:4100";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 60000);
const mode = process.argv[2] ?? "success";

type PlannerSmokeSummary = {
  audit: { status: string; failureReason: string | null };
  missions: Array<{ type: string; status: string }>;
  planning: {
    mode: string;
    source: string;
    status: string;
    websiteType: string | null;
    confidence: number | null;
    provider: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    durationMs: number | null;
    estimatedCostUsd: number | null;
    fallbackReason: string | null;
    importantJourneys: Array<{ name: string; priority: string }>;
  } | null;
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
  let summary: PlannerSmokeSummary | undefined;

  while (Date.now() < deadline) {
    summary = await fetchJson<PlannerSmokeSummary>(`${appUrl}/api/audits/${created.id}`);
    if (["completed", "failed", "cancelled"].includes(summary.audit.status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!summary?.planning) {
    throw new Error("Expected planning metadata.");
  }
  if (summary.audit.status !== "completed") {
    throw new Error(`Audit did not complete. Status: ${summary.audit.status}. Reason: ${summary.audit.failureReason ?? "none"}`);
  }
  if (summary.missions.length !== 6) {
    throw new Error(`Expected 6 missions, received ${summary.missions.length}.`);
  }

  if (mode === "success") {
    if (summary.planning.source !== "mock") {
      throw new Error(`Expected mock planning source, received ${summary.planning.source}.`);
    }
    if (summary.planning.websiteType !== "ecommerce") {
      throw new Error(`Expected ecommerce classification, received ${summary.planning.websiteType ?? "none"}.`);
    }
    if (summary.planning.importantJourneys.length === 0) {
      throw new Error("Expected important journeys from mock planner.");
    }
  } else if (mode === "anthropic") {
    if (summary.planning.source !== "anthropic" || summary.planning.provider !== "anthropic") {
      throw new Error(`Expected anthropic planning source/provider, received ${summary.planning.source}/${summary.planning.provider ?? "none"}.`);
    }
    if (!summary.planning.model) {
      throw new Error("Expected Anthropic planner model.");
    }
    if (!summary.planning.inputTokens || !summary.planning.outputTokens) {
      throw new Error("Expected Anthropic planner token usage.");
    }
    if (typeof summary.planning.durationMs !== "number" || summary.planning.durationMs <= 0) {
      throw new Error("Expected Anthropic planner latency.");
    }
    if (typeof summary.planning.estimatedCostUsd !== "number" || summary.planning.estimatedCostUsd <= 0) {
      throw new Error("Expected Anthropic planner cost estimate.");
    }
    if (summary.planning.fallbackReason) {
      throw new Error(`Expected no planner fallback, received ${summary.planning.fallbackReason}.`);
    }
  } else {
    if (summary.planning.status !== "fallback" || !summary.planning.fallbackReason) {
      throw new Error("Expected deterministic fallback planning metadata.");
    }
    if (summary.planning.source !== "deterministic") {
      throw new Error(`Expected deterministic fallback source, received ${summary.planning.source}.`);
    }
  }

  console.log(
    JSON.stringify({
      ok: true,
      mode,
      auditId: created.id,
      status: summary.audit.status,
      planning: summary.planning
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};
