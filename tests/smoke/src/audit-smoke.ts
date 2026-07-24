const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const fixtureUrl = process.env.SMOKE_TARGET_URL ?? "http://localhost:4100";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 60000);

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
  let summary:
    | {
        audit: { status: string; findingCount: number; failureReason: string | null };
        missions: Array<{ type: string; status: string; findingCount: number }>;
        report: { overallScore: number } | null;
        planning: { status: string; source: string; mode: string } | null;
      }
    | undefined;

  while (Date.now() < deadline) {
    summary = await fetchJson<{
      audit: { status: string; findingCount: number; failureReason: string | null };
      missions: Array<{ type: string; status: string; findingCount: number }>;
      report: { overallScore: number } | null;
      planning: { status: string; source: string; mode: string } | null;
    }>(`${appUrl}/api/audits/${created.id}`);

    if (["completed", "failed", "cancelled"].includes(summary.audit.status)) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!summary) {
    throw new Error("Audit summary was never loaded.");
  }

  if (summary.audit.status !== "completed") {
    throw new Error(`Audit did not complete. Status: ${summary.audit.status}. Reason: ${summary.audit.failureReason ?? "none"}`);
  }

  if (summary.missions.length !== 6) {
    throw new Error(`Expected 6 planned missions, received ${summary.missions.length}.`);
  }

  const unfinishedMissions = summary.missions.filter((mission) => !["completed", "skipped"].includes(mission.status));
  if (unfinishedMissions.length > 0) {
    throw new Error(`Expected all missions to complete or skip. Remaining: ${unfinishedMissions.map((mission) => mission.type).join(", ")}`);
  }

  if (!summary.report) {
    throw new Error("Expected a generated deterministic report.");
  }

  if (!summary.planning) {
    throw new Error("Expected planning metadata.");
  }

  const findings = await fetchJson<{ findings: Array<{ title: string; sourceMissionTypes: string[] }> }>(
    `${appUrl}/api/audits/${created.id}/findings`
  );

  if (findings.findings.length < 4) {
    throw new Error(`Expected at least 4 findings, received ${findings.findings.length}.`);
  }

  if (findings.findings.some((finding) => finding.sourceMissionTypes.length === 0)) {
    throw new Error("Expected every finding to include source mission provenance.");
  }

  console.log(
    JSON.stringify({
      ok: true,
      auditId: created.id,
      status: summary.audit.status,
      missionCount: summary.missions.length,
      planningSource: summary.planning.source,
      score: summary.report.overallScore,
      findingCount: findings.findings.length,
      titles: findings.findings.map((finding) => finding.title)
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};
