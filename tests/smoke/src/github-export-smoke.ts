const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const auditId = process.env.GITHUB_EXPORT_AUDIT_ID;
const repositoryId = process.env.GITHUB_EXPORT_REPOSITORY_ID;
const confirmed = process.env.GITHUB_EXPORT_CONFIRM === "true";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body as T;
}

async function main() {
  if (!auditId) {
    throw new Error("GITHUB_EXPORT_AUDIT_ID is required for the manual GitHub export smoke test.");
  }
  if (!repositoryId) {
    throw new Error("GITHUB_EXPORT_REPOSITORY_ID is required for the manual GitHub export smoke test.");
  }
  if (!confirmed) {
    throw new Error("Set GITHUB_EXPORT_CONFIRM=true to run the manual GitHub export smoke test.");
  }

  const findings = await fetchJson<{ findings: Array<{ id: string; title: string }> }>(`${appUrl}/api/audits/${auditId}/findings`);
  const selected = findings.findings.slice(0, 1);
  if (selected.length === 0) {
    throw new Error("The audit has no findings to export.");
  }

  const preview = await fetchJson<{ selectedCount: number; issues: Array<{ title: string }> }>(`${appUrl}/api/audits/${auditId}/github-export/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      findingIds: selected.map((finding) => finding.id),
      repositoryId,
      excludeInformational: true
    })
  });
  if (preview.selectedCount !== selected.length) {
    throw new Error(`Preview selected ${preview.selectedCount}, expected ${selected.length}.`);
  }

  const exportResponse = await fetchJson<{ batchId: string; status: string }>(`${appUrl}/api/audits/${auditId}/github-export`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      findingIds: selected.map((finding) => finding.id),
      repositoryId,
      excludeInformational: true,
      confirmed: true
    })
  });

  console.log(
    JSON.stringify({
      ok: true,
      auditId,
      batchId: exportResponse.batchId,
      status: exportResponse.status,
      selectedCount: selected.length,
      previewTitles: preview.issues.map((issue) => issue.title)
    })
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

export {};
