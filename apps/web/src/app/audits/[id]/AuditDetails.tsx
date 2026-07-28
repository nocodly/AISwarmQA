"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CameraOff, CheckCircle2, Download, ExternalLink, FileDown, Share2, UploadCloud } from "lucide-react";
import { GitHubLogo } from "@/components/BrandIcons";

type AuditSummary = {
  id: string;
  targetUrl: string;
  status: string;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  cancelRequestedAt: string | null;
  cancelReason: string | null;
  browserDurationMs: number | null;
  findingCount: number;
};

type MissionSummary = {
  id: string;
  type: string;
  role: string;
  objective: string;
  required: boolean;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  timeoutMs: number;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  resultSummary: string | null;
  planning: { planningSource?: string; aiReason?: string; targetRoutes?: string[] } | null;
  findingCount: number;
};

type ReportSummary = {
  overallScore: number;
  generatedAt: string;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  executionWarnings: string[];
};

type AuditResponse = {
  audit: AuditSummary;
  missions: MissionSummary[];
  progress: Record<string, number>;
  report: ReportSummary | null;
  planning: {
    mode: string;
    source: string;
    status: string;
    websiteType: string | null;
    confidence: number | null;
    provider: string | null;
    model: string | null;
    promptId: string | null;
    promptVersion: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
    durationMs: number | null;
    fallbackReason: string | null;
    warnings: string[];
    importantJourneys: Array<{ name: string; priority: string; routes?: string[] }>;
  } | null;
  browserAgentRuns: Array<{
    id: string;
    missionId: string;
    status: string;
    provider: string;
    model: string | null;
    promptId: string;
    promptVersion: string;
    objective: string;
    startUrl: string;
    finalUrl: string | null;
    maxSteps: number;
    stepsUsed: number;
    providerCalls: number;
    inputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
    terminalReason: string | null;
    summary: string | null;
    steps: Array<{
      id: string;
      sequence: number;
      proposedTool: string;
      targetId: string | null;
      reason: string | null;
      validationStatus: string;
      safetyAllowed: boolean;
      rejectionCode: string | null;
      rejectionReason: string | null;
      executionStatus: string;
      executionSummary: string | null;
      urlBefore: string | null;
      urlAfter: string | null;
      stateChanged: boolean;
      evidenceIds: string[];
      durationMs: number | null;
      inputTokens: number | null;
      outputTokens: number | null;
      estimatedCostUsd: number | null;
    }>;
  }>;
  browserSwarmRuns: Array<{
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
    coverageState: {
      visitedRoutes?: string[];
      testedTargetFingerprints?: string[];
      discoveredForms?: string[];
      knownFindingFingerprints?: string[];
      coverageGaps?: string[];
      completedAgentRoles?: string[];
    };
    terminalReason: string | null;
    summary: string | null;
    startedAt: string;
    completedAt: string | null;
    agents: Array<{
      id: string;
      missionId: string;
      browserAgentRunId: string | null;
      role: string;
      objective: string;
      status: string;
      priority: number;
      routesVisited: string[];
      findingsCount: number;
      stepsUsed: number;
      startedAt: string | null;
      completedAt: string | null;
      terminalReason: string | null;
    }>;
  }>;
};

type Finding = {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  description: string;
  affectedUrl: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  confidence: number;
  sourceMissionTypes: string[];
  occurrenceCount: number;
  evidence: Array<{
    id: string;
    type: string;
    content: string | null;
    localPath: string | null;
    metadata: unknown;
  }>;
};

type GitHubStatus = {
  appConfigured: boolean;
  mockMode: boolean;
  connected: boolean;
  manualSetupRequired: boolean;
  connectUrl: string | null;
  repositories: Array<{
    id: string;
    fullName: string;
    issuesEnabled: boolean;
    archived?: boolean;
    private?: boolean;
    defaultBranch?: string | null;
    accountLogin?: string;
    accountType?: string;
  }>;
};

type GitHubExportPreview = {
  repository: {
    id: string;
    fullName: string;
    issuesEnabled: boolean;
    archived?: boolean;
    defaultBranch?: string | null;
  };
  selectedCount: number;
  issuesToCreate: number;
  alreadyExportedCount: number;
  warnings: string[];
  missingLabels: string[];
  estimatedApiRequests: number;
  includeExternalEvidence: boolean;
  issues: Array<{
    findingId: string;
    title: string;
    labels: string[];
    evidenceAvailable: boolean;
    alreadyExported: boolean;
    existingIssueUrl: string | null;
  }>;
};

type GitHubExportBatch = {
  batch: {
    id: string;
    status: string;
    repository: string;
    requestedCount: number;
    createdCount: number;
    failedCount: number;
    skippedCount: number;
  };
  exports: Array<{
    id: string;
    findingId: string;
    findingTitle: string;
    status: string;
    githubIssueNumber: number | null;
    githubIssueUrl: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  }>;
};

const terminalStatuses = new Set(["completed", "failed", "cancelled"]);

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function formatCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts);
  return entries.length > 0 ? entries.map(([key, value]) => `${key}: ${value}`).join(" / ") : "none";
}

function severityClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return "info";
}

function evidenceImageUrl(finding: Finding) {
  const evidence = finding.evidence.find((item) => {
    const value = item.content ?? item.localPath ?? "";
    return /^https?:\/\//.test(value) && (item.type.toLowerCase().includes("screenshot") || /\.(png|jpe?g|webp)$/i.test(value));
  });
  return evidence?.content ?? evidence?.localPath ?? null;
}

function shortUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return value;
  }
}

export function AuditDetails({ auditId }: { auditId: string }) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [excludeInformational, setExcludeInformational] = useState(true);
  const [githubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [githubPreview, setGitHubPreview] = useState<GitHubExportPreview | null>(null);
  const [githubBatch, setGitHubBatch] = useState<GitHubExportBatch | null>(null);
  const [githubMessage, setGitHubMessage] = useState<string | null>(null);
  const [includeExternalEvidence, setIncludeExternalEvidence] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [openedFindingId, setOpenedFindingId] = useState<string | null>(null);

  const audit = data?.audit ?? null;
  const isTerminal = useMemo(() => (audit ? terminalStatuses.has(audit.status) : false), [audit]);
  const openedFinding = useMemo(
    () => findings.find((finding) => finding.id === openedFindingId) ?? findings[0] ?? null,
    [findings, openedFindingId]
  );
  const openedEvidenceImage = useMemo(() => (openedFinding ? evidenceImageUrl(openedFinding) : null), [openedFinding]);
  const selectedRepository = githubStatus?.repositories.find((repository) => repository.id === selectedRepositoryId) ?? null;
  const agentActivity = useMemo(() => {
    const swarmAgents =
      data?.browserSwarmRuns.flatMap((swarm) =>
        swarm.agents.map((agent) => ({
          id: agent.id,
          eyebrow: agent.role,
          title: agent.objective,
          status: agent.status,
          detail: `${agent.stepsUsed} steps / ${agent.findingsCount} findings`,
          routes: agent.routesVisited.slice(0, 4),
          footer: swarm.summary ?? swarm.terminalReason ?? `${swarm.agentsCompleted}/${swarm.agentsCreated} swarm agents completed`
        }))
      ) ?? [];
    const browserAgents =
      data?.browserAgentRuns.map((run) => ({
        id: run.id,
        eyebrow: `${run.provider} browser agent`,
        title: run.objective,
        status: run.status,
        detail: `${run.stepsUsed}/${run.maxSteps} steps / ${run.providerCalls} provider calls`,
        routes: Array.from(new Set(run.steps.flatMap((step) => [step.urlBefore, step.urlAfter]).filter(Boolean) as string[])).slice(0, 4),
        footer: run.summary ?? run.terminalReason ?? "Replay captured for this mission."
      })) ?? [];
    const missions =
      data?.missions.map((mission) => ({
        id: mission.id,
        eyebrow: mission.role,
        title: mission.objective,
        status: mission.status,
        detail: `${mission.findingCount} findings / ${mission.attemptCount}/${mission.maxAttempts} attempts`,
        routes: mission.planning?.targetRoutes?.slice(0, 4) ?? [],
        footer: mission.resultSummary ?? mission.failureReason ?? mission.planning?.aiReason ?? "Mission state recorded."
      })) ?? [];
    return swarmAgents.length > 0 ? swarmAgents : browserAgents.length > 0 ? browserAgents : missions;
  }, [data]);

  useEffect(() => {
    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const [auditResponse, findingsResponse] = await Promise.all([
          fetch(`/api/audits/${auditId}`, { cache: "no-store" }),
          fetch(`/api/audits/${auditId}/findings`, { cache: "no-store" })
        ]);
        const auditBody = await auditResponse.json();

        if (!auditResponse.ok) {
          setError(auditBody.error?.message ?? "Audit could not be loaded.");
          return;
        }

        if (!isActive) {
          return;
        }

        const nextData = auditBody as AuditResponse;
        setData(nextData);

        if (findingsResponse.ok) {
          const findingsBody = await findingsResponse.json();
          if (isActive) {
            setFindings(findingsBody.findings);
          }
        }

        if (!terminalStatuses.has(nextData.audit.status)) {
          timer = setTimeout(load, 1500);
        }
      } catch {
        if (isActive) {
          setError("Audit status could not be loaded.");
        }
      }
    }

    void load();

    return () => {
      isActive = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [auditId]);

  useEffect(() => {
    if (findings.length > 0 && selectedFindingIds.length === 0) {
      setSelectedFindingIds(findings.map((finding) => finding.id));
    }
    if (findings.length > 0 && !openedFindingId) {
      setOpenedFindingId(findings[0]!.id);
    }
  }, [findings, openedFindingId, selectedFindingIds.length]);

  useEffect(() => {
    if (audit?.status !== "completed") {
      return;
    }
    let isActive = true;
    async function loadGitHubStatus() {
      try {
        const response = await fetch("/api/integrations/github/status", { cache: "no-store" });
        const body = (await response.json()) as GitHubStatus;
        if (response.ok && isActive) {
          setGitHubStatus(body);
          setSelectedRepositoryId((current) => current || body.repositories[0]?.id || "");
        }
      } catch {
        if (isActive) {
          setGitHubMessage("GitHub integration status could not be loaded.");
        }
      }
    }
    void loadGitHubStatus();
    return () => {
      isActive = false;
    };
  }, [audit?.status]);

  useEffect(() => {
    if (!githubBatch || ["completed", "partially_completed", "failed", "cancelled"].includes(githubBatch.batch.status)) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/github-export/${githubBatch.batch.id}`, { cache: "no-store" });
        const body = (await response.json()) as GitHubExportBatch;
        if (response.ok) {
          setGitHubBatch(body);
        }
      } catch {
        setGitHubMessage("GitHub export progress could not be refreshed.");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [githubBatch]);

  function downloadReport(format: "json" | "csv") {
    const rows = findings.map((finding) => ({
      id: finding.id,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      affectedUrl: finding.affectedUrl,
      summary: finding.summary
    }));
    const content =
      format === "json"
        ? JSON.stringify({ audit, report: data?.report, findings }, null, 2)
        : [
            "id,severity,category,title,affectedUrl,summary",
            ...rows.map((row) =>
              [row.id, row.severity, row.category, row.title, row.affectedUrl, row.summary]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(",")
            )
          ].join("\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aiswarmqa-audit-${auditId}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function shareReport() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "AISwarmQA audit report", url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setGitHubMessage("Report link copied.");
  }

  async function cancelAudit() {
    if (!window.confirm("Cancel this audit? Running missions will stop at the next safe checkpoint.")) {
      return;
    }
    setCanceling(true);
    setCancelMessage(null);
    try {
      const response = await fetch(`/api/audits/${auditId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled from audit details." })
      });
      const body = await response.json();
      if (!response.ok) {
        setCancelMessage(body.error?.message ?? "Audit cancellation could not be requested.");
        return;
      }
      setCancelMessage(body.terminal ? "Audit cancelled." : "Cancellation requested. Running work will stop shortly.");
      const auditResponse = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
      if (auditResponse.ok) {
        setData((await auditResponse.json()) as AuditResponse);
      }
    } catch {
      setCancelMessage("Audit cancellation could not be requested.");
    } finally {
      setCanceling(false);
    }
  }

  async function previewGitHubExport() {
    setGitHubMessage(null);
    setGitHubPreview(null);
    const response = await fetch(`/api/audits/${auditId}/github-export/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        findingIds: selectedFindingIds,
        repositoryId: selectedRepositoryId || undefined,
        excludeInformational,
        includeExternalEvidence,
        confirmed: false
      })
    });
    const body = await response.json();
    if (!response.ok) {
      setGitHubMessage(body.error?.message ?? "GitHub export preview failed.");
      return;
    }
    setGitHubPreview(body as GitHubExportPreview);
  }

  async function confirmGitHubExport() {
    if (!githubPreview) {
      return;
    }
    const response = await fetch(`/api/audits/${auditId}/github-export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        findingIds: selectedFindingIds,
        repositoryId: githubPreview.repository.id,
        excludeInformational,
        includeExternalEvidence,
        confirmed: true
      })
    });
    const body = await response.json();
    if (!response.ok) {
      setGitHubMessage(body.error?.message ?? "GitHub export could not be queued.");
      return;
    }
    const batchResponse = await fetch(`/api/github-export/${body.batchId}`, { cache: "no-store" });
    if (batchResponse.ok) {
      setGitHubBatch((await batchResponse.json()) as GitHubExportBatch);
    }
    setGitHubMessage("GitHub export queued.");
  }

  async function retryGitHubExport() {
    if (!githubBatch) return;
    const response = await fetch(`/api/github-export/${githubBatch.batch.id}/retry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true })
    });
    const body = await response.json();
    if (!response.ok) {
      setGitHubMessage(body.error?.message ?? "GitHub export retry could not be queued.");
      return;
    }
    setGitHubBatch({ ...githubBatch, batch: { ...githubBatch.batch, status: "queued" } });
    setGitHubMessage("GitHub export retry queued.");
  }

  function toggleFinding(findingId: string) {
    setSelectedFindingIds((current) => (current.includes(findingId) ? current.filter((id) => id !== findingId) : [...current, findingId]));
    setGitHubPreview(null);
  }

  if (error) {
    return (
      <section className="panel">
        <h2>Audit unavailable</h2>
        <p className="error-text">{error}</p>
      </section>
    );
  }

  if (!audit || !data) {
    return (
      <section className="panel">
        <h2>Loading audit</h2>
        <p>Fetching the latest mission state.</p>
      </section>
    );
  }

  return (
    <>
      <section className="audit-report-topbar">
        <div>
          <p className="eyebrow">Audit {audit.id}</p>
          <h1>Report ready</h1>
          <p>{shortUrl(audit.targetUrl)} · {audit.status} · {findings.length} finding{findings.length === 1 ? "" : "s"}</p>
        </div>
        <div className="audit-action-buttons">
          <button type="button" onClick={() => downloadReport("json")} disabled={findings.length === 0}>
            <Download aria-hidden="true" size={17} /> Download JSON
          </button>
          <button type="button" onClick={() => downloadReport("csv")} disabled={findings.length === 0}>
            <FileDown aria-hidden="true" size={17} /> Download CSV
          </button>
          <button type="button" onClick={() => void shareReport()}>
            <Share2 aria-hidden="true" size={17} /> Share
          </button>
          <button type="button" onClick={() => void cancelAudit()} disabled={isTerminal || canceling}>
            {canceling ? "Cancelling" : "Cancel"}
          </button>
          <button type="button" onClick={() => void previewGitHubExport()} disabled={selectedFindingIds.length === 0}>
            <GitHubLogo /> Preview export
          </button>
          <button className="primary-report-action" type="button" onClick={() => void confirmGitHubExport()} disabled={!githubPreview}>
            <UploadCloud aria-hidden="true" size={17} /> Create issues
          </button>
        </div>
      </section>

      <section className="audit-export-strip">
        <div className="export-target">
          <GitHubLogo />
          <div>
            <strong>{selectedRepository ? selectedRepository.fullName : githubStatus?.connected ? "Choose a GitHub repository" : "GitHub export"}</strong>
            <p>
              {githubPreview
                ? `${githubPreview.issuesToCreate} issue${githubPreview.issuesToCreate === 1 ? "" : "s"} ready. ${githubPreview.alreadyExportedCount} already exported.`
                : "Preview first, then create issues only after explicit confirmation."}
            </p>
          </div>
        </div>
        <div className="export-controls">
          <label>
            <input
              type="checkbox"
              checked={excludeInformational}
              onChange={(event) => setExcludeInformational(event.target.checked)}
            />{" "}
            Skip informational
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeExternalEvidence}
              onChange={(event) => {
                setIncludeExternalEvidence(event.target.checked);
                setGitHubPreview(null);
              }}
            />{" "}
            Public evidence route
          </label>
          {githubStatus?.repositories.length ? (
            <select value={selectedRepositoryId} onChange={(event) => setSelectedRepositoryId(event.target.value)}>
              {githubStatus.repositories.map((repository) => (
                <option value={repository.id} key={repository.id}>
                  {repository.fullName}
                  {repository.private ? " private" : " public"}
                  {repository.archived ? " archived" : ""}
                  {!repository.issuesEnabled ? " issues disabled" : ""}
                </option>
              ))}
            </select>
          ) : githubStatus?.connectUrl ? (
            <a className="internal-link" href={`${githubStatus.connectUrl}?returnUrl=${encodeURIComponent(`/audits/${auditId}`)}`}>
              Connect GitHub <ExternalLink aria-hidden="true" size={15} />
            </a>
          ) : null}
        </div>
        {githubMessage ? <p className="export-message">{githubMessage}</p> : null}
        {cancelMessage ? <p className="export-message">{cancelMessage}</p> : null}
        {githubPreview ? (
          <div className="export-preview-summary">
            <strong>Preview ready:</strong> {githubPreview.selectedCount} selected / {githubPreview.issuesToCreate} new issue
            {githubPreview.issuesToCreate === 1 ? "" : "s"} / {githubPreview.alreadyExportedCount} duplicate
            {githubPreview.alreadyExportedCount === 1 ? "" : "s"}.
            {githubPreview.warnings.length > 0 ? <span> {githubPreview.warnings.join(" ")}</span> : null}
          </div>
        ) : null}
        {githubBatch ? (
          <div className="export-preview-summary">
            <strong>Export {githubBatch.batch.status}:</strong> {githubBatch.batch.createdCount} created / {githubBatch.batch.failedCount} failed.
            {githubBatch.batch.failedCount > 0 ? (
              <button type="button" onClick={() => void retryGitHubExport()}>
                Retry failed
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="report-status-strip" aria-label="Audit summary">
        <div>
          <span className="status-kicker">Status</span>
          <strong>{audit.status}</strong>
        </div>
        <div>
          <span className="status-kicker">Findings</span>
          <strong>{audit.findingCount}</strong>
        </div>
        <div>
          <span className="status-kicker">Score</span>
          <strong>{data.report?.overallScore ?? "-"}</strong>
        </div>
        <div>
          <span className="status-kicker">Completed</span>
          <strong>{formatDate(audit.completedAt)}</strong>
        </div>
        <div className="mini-progress-rail">
          {["validating", "planning", "running", "analyzing", "completed"].map((status) => (
            <span className={audit.status === status || (status === "completed" && audit.status === "generating_report") ? "active" : ""} key={status}>
              {status}
            </span>
          ))}
        </div>
      </section>

      <section className="report-findings-layout">
        <div className="findings-feed-panel">
          <div className="report-section-heading">
            <div>
              <p className="eyebrow">Findings</p>
              <h2>Issues to review</h2>
            </div>
            <div className="selection-controls">
              <button type="button" onClick={() => setSelectedFindingIds(findings.map((finding) => finding.id))} disabled={findings.length === 0}>
                Select all
              </button>
              <button type="button" onClick={() => setSelectedFindingIds([])} disabled={selectedFindingIds.length === 0}>
                Clear
              </button>
            </div>
          </div>
          {audit.status === "completed" && findings.length === 0 ? (
            <div className="empty-report-state">
              <CheckCircle2 aria-hidden="true" size={24} />
              <strong>No findings were found in this run.</strong>
              <p>This does not mean the site is bug-free. Try a deeper authenticated or checkout-focused audit next.</p>
            </div>
          ) : null}
          <div className="finding-feed">
            {findings.map((finding) => (
              <article
                className={openedFinding?.id === finding.id ? "finding-feed-card active" : "finding-feed-card"}
                key={finding.id}
                onClick={() => setOpenedFindingId(finding.id)}
              >
                <label className="finding-select" onClick={(event) => event.stopPropagation()}>
                  <input type="checkbox" checked={selectedFindingIds.includes(finding.id)} onChange={() => toggleFinding(finding.id)} />
                </label>
                <div className={`severity-tag ${severityClass(finding.severity)}`}>{finding.severity}</div>
                <div className="finding-feed-body">
                  <h3>{finding.title}</h3>
                  <p>{finding.summary}</p>
                  <div className="finding-meta-row">
                    <span>{finding.category}</span>
                    <span>{shortUrl(finding.affectedUrl)}</span>
                    <span>{finding.occurrenceCount} occurrence{finding.occurrenceCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {openedFinding ? (
          <aside className="issue-preview-panel">
            <div className="issue-preview-header">
              <div>
                <div className={`severity-tag ${severityClass(openedFinding.severity)}`}>{openedFinding.severity}</div>
                <h2>{openedFinding.title}</h2>
                <p>{openedFinding.description || openedFinding.summary}</p>
              </div>
            </div>

            <div className="evidence-shot">
              {openedEvidenceImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={openedEvidenceImage} alt="Finding evidence screenshot" />
              ) : (
                <div className="real-evidence-unavailable">
                  <CameraOff aria-hidden="true" size={34} />
                  <span>{shortUrl(openedFinding.affectedUrl)}</span>
                  <strong>Real screenshot unavailable</strong>
                  <p>This finding still includes captured text evidence, affected URL, and replay metadata. Screenshot markup is shown only when a real evidence image is stored.</p>
                </div>
              )}
              {openedEvidenceImage ? (
                <>
                  <svg className="marker-circle" viewBox="0 0 420 220" aria-hidden="true">
                    <path d="M88 64 C145 22 286 34 338 88 C380 132 318 190 190 178 C75 167 34 113 88 64 Z" />
                    <path d="M294 156 L366 193 M352 160 L366 193 L330 188" />
                  </svg>
                  <span className="marker-note">look here</span>
                </>
              ) : null}
            </div>

            <div className="issue-body">
              <section>
                <h3>Affected page</h3>
                <p>{openedFinding.affectedUrl}</p>
              </section>
              <section>
                <h3>Actual behavior</h3>
                <p>{openedFinding.actualBehavior || "No actual behavior was recorded."}</p>
              </section>
              <section>
                <h3>Expected behavior</h3>
                <p>{openedFinding.expectedBehavior || "No expected behavior was recorded."}</p>
              </section>
              <section>
                <h3>Reproduction steps</h3>
                <ol>
                  {openedFinding.stepsToReproduce.length > 0 ? openedFinding.stepsToReproduce.map((step) => <li key={step}>{step}</li>) : <li>Open the affected page and follow the captured audit path.</li>}
                </ol>
              </section>
              <section>
                <h3>Evidence</h3>
                <p>{openedFinding.evidence.length} evidence item{openedFinding.evidence.length === 1 ? "" : "s"} captured.</p>
              </section>
            </div>
          </aside>
        ) : null}
      </section>

      <section className="agent-activity-panel">
        <div className="report-section-heading">
          <div>
            <p className="eyebrow">Agent activity</p>
            <h2>Who checked what</h2>
          </div>
          <p>
            {data.progress.completed} completed / {data.progress.failed} failed / {data.progress.running} running / {data.progress.queued} queued
          </p>
        </div>
        <div className="agent-activity-grid">
          {agentActivity.slice(0, 6).map((agent) => (
            <article className="agent-activity-card" key={agent.id}>
              <div className="agent-icon">
                <Bot aria-hidden="true" size={18} />
              </div>
              <div>
                <p className="eyebrow">{agent.eyebrow}</p>
                <h3>{agent.title}</h3>
                <p>{agent.footer}</p>
                <div className="finding-meta-row">
                  <span>{agent.status}</span>
                  <span>{agent.detail}</span>
                  {agent.routes.map((route) => (
                    <span key={`${agent.id}-${route}`}>{shortUrl(route)}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="product-context-panel">
        <div>
          <p className="eyebrow">Expected behavior context</p>
          <h2>Give agents the product map</h2>
          <p>
            Strong audits need more than visuals. Add a sitemap, button destination map, auth test account, forbidden actions, brand rules, and critical user journeys so agents compare the live site against the intended product behavior.
          </p>
        </div>
        <div className="context-pill-grid">
          <span>Sitemap</span>
          <span>Button map</span>
          <span>Auth flows</span>
          <span>Design rules</span>
          <span>Critical journeys</span>
          <span>Forbidden actions</span>
        </div>
      </section>

      <details className="technical-details">
        <summary>Technical run data</summary>

      <section className="panel technical-report-panel" style={{ marginTop: 16 }}>
        <h2>Summary</h2>
        <ul className="status-list">
          <li>
            <span>Audit ID</span>
            <span>{audit.id}</span>
          </li>
          <li>
            <span>Target</span>
            <span>{audit.targetUrl}</span>
          </li>
          <li>
            <span>Created</span>
            <span>{formatDate(audit.createdAt)}</span>
          </li>
          <li>
            <span>Queued</span>
            <span>{formatDate(audit.queuedAt)}</span>
          </li>
          <li>
            <span>Started</span>
            <span>{formatDate(audit.startedAt)}</span>
          </li>
          <li>
            <span>Completed</span>
            <span>{formatDate(audit.completedAt)}</span>
          </li>
        </ul>
        {!isTerminal ? <p>Refreshing until all required missions reach a terminal state.</p> : null}
        {audit.status === "failed" ? (
          <p className="error-text">{audit.failureReason ?? "The audit failed. Check worker logs and retry."}</p>
        ) : null}
        {audit.cancelRequestedAt ? <p>Cancellation requested: {formatDate(audit.cancelRequestedAt)}</p> : null}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Planning</h2>
        {data.planning ? (
          <>
            <ul className="status-list">
              <li>
                <span>Source</span>
                <span>{data.planning.fallbackReason ? "standard fallback" : data.planning.source}</span>
              </li>
              <li>
                <span>Mode</span>
                <span>{data.planning.mode}</span>
              </li>
              <li>
                <span>Status</span>
                <span>{data.planning.status}</span>
              </li>
              <li>
                <span>Website type</span>
                <span>
                  {data.planning.websiteType ?? "unknown"}
                  {typeof data.planning.confidence === "number" ? ` (${Math.round(data.planning.confidence * 100)}%)` : ""}
                </span>
              </li>
              <li>
                <span>Provider</span>
                <span>{data.planning.provider ?? data.planning.source}</span>
              </li>
              <li>
                <span>Model</span>
                <span>{data.planning.model ?? "none"}</span>
              </li>
              <li>
                <span>Latency</span>
                <span>{typeof data.planning.durationMs === "number" ? `${data.planning.durationMs}ms` : "none"}</span>
              </li>
              <li>
                <span>Tokens</span>
                <span>
                  {typeof data.planning.inputTokens === "number" || typeof data.planning.outputTokens === "number"
                    ? `${data.planning.inputTokens ?? 0} in / ${data.planning.outputTokens ?? 0} out`
                    : "none"}
                </span>
              </li>
              <li>
                <span>Planner cost</span>
                <span>{typeof data.planning.estimatedCostUsd === "number" ? `$${data.planning.estimatedCostUsd.toFixed(4)}` : "none"}</span>
              </li>
            </ul>
            {data.planning.fallbackReason ? (
              <p>AI planning was unavailable, so the audit used the standard deterministic plan. Reason: {data.planning.fallbackReason}.</p>
            ) : null}
            {data.planning.importantJourneys.length > 0 ? (
              <div className="mission-list">
                {data.planning.importantJourneys.map((journey) => (
                  <article className="mission-row" key={`${journey.name}-${journey.priority}`}>
                    <div>
                      <div className="badge">{journey.priority}</div>
                      <h3>{journey.name}</h3>
                      {journey.routes?.length ? <p>{journey.routes.join(", ")}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p>Waiting for the planning worker.</p>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Mission Progress</h2>
        <p>
          {data.progress.completed} completed / {data.progress.failed} failed / {data.progress.running} running / {data.progress.queued} queued
        </p>
        <div className="mission-list">
          {data.missions.map((mission) => (
            <article className="mission-row" key={mission.id}>
              <div>
                <div className="badge">{mission.status}</div>
                <h3>{mission.role}</h3>
                <p>{mission.objective}</p>
                {mission.planning?.planningSource ? <p>{mission.planning.planningSource}</p> : null}
                {mission.planning?.aiReason ? <p>{mission.planning.aiReason}</p> : null}
                {mission.resultSummary ? <p>{mission.resultSummary}</p> : null}
                {mission.failureReason ? <p className="error-text">{mission.failureReason}</p> : null}
              </div>
              <div className="mission-meta">
                <span>{mission.required ? "required" : "optional"}</span>
                <span>
                  attempts {mission.attemptCount}/{mission.maxAttempts}
                </span>
                <span>{mission.findingCount} findings</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Autonomous Browser Agent</h2>
        {data.browserAgentRuns.length === 0 ? (
          <p>Autonomous browsing is disabled for this audit.</p>
        ) : (
          <div className="mission-list">
            {data.browserAgentRuns.map((run) => (
              <article className="mission-row" key={run.id}>
                <div>
                  <div className="badge">{run.status}</div>
                  <h3>{run.provider} Browser Agent</h3>
                  <p>{run.summary ?? run.objective}</p>
                  <ul className="status-list">
                    <li>
                      <span>Run ID</span>
                      <span>{run.id}</span>
                    </li>
                    <li>
                      <span>Prompt</span>
                      <span>
                        {run.promptId} {run.promptVersion}
                      </span>
                    </li>
                    <li>
                      <span>Steps</span>
                      <span>
                        {run.stepsUsed}/{run.maxSteps}
                      </span>
                    </li>
                    <li>
                      <span>Provider calls</span>
                      <span>{run.providerCalls}</span>
                    </li>
                    <li>
                      <span>Tokens</span>
                      <span>
                        {typeof run.inputTokens === "number" || typeof run.outputTokens === "number"
                          ? `${run.inputTokens ?? 0} in / ${run.outputTokens ?? 0} out`
                          : "none"}
                      </span>
                    </li>
                    <li>
                      <span>Terminal reason</span>
                      <span>{run.terminalReason ?? "running"}</span>
                    </li>
                    <li>
                      <span>Cost</span>
                      <span>{typeof run.estimatedCostUsd === "number" ? `$${run.estimatedCostUsd.toFixed(4)}` : "none"}</span>
                    </li>
                  </ul>
                  <details>
                    <summary>Replay timeline</summary>
                    <div className="mission-list" style={{ marginTop: 12 }}>
                      {run.steps.map((step) => (
                        <article className="card" key={step.id} style={{ marginTop: 8 }}>
                          <div className="badge">
                            {step.sequence}. {step.proposedTool} / {step.executionStatus}
                          </div>
                          <p>{step.executionSummary ?? step.reason ?? "No step summary recorded."}</p>
                          {!step.safetyAllowed ? (
                            <p className="error-text">
                              {step.rejectionCode}: {step.rejectionReason}
                            </p>
                          ) : null}
                          <p>
                            <strong>URL:</strong> {step.urlBefore ?? "unknown"} {step.urlAfter && step.urlAfter !== step.urlBefore ? `-> ${step.urlAfter}` : ""}
                          </p>
                          <p>
                            <strong>State changed:</strong> {step.stateChanged ? "yes" : "no"}
                            {step.evidenceIds.length > 0 ? ` / evidence: ${step.evidenceIds.join(", ")}` : ""}
                          </p>
                          <p>
                            <strong>Provider:</strong>{" "}
                            {typeof step.durationMs === "number" ? `${step.durationMs}ms` : "no latency"} / {step.inputTokens ?? 0} in / {step.outputTokens ?? 0} out /{" "}
                            {typeof step.estimatedCostUsd === "number" ? `$${step.estimatedCostUsd.toFixed(4)}` : "no cost"}
                          </p>
                        </article>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="mission-meta">
                  <span>{run.model ?? "mock"}</span>
                  <span>{run.steps.length} replay steps</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Browser Agent Swarm</h2>
        {data.browserSwarmRuns.length === 0 ? (
          <p>Swarm orchestration is disabled for this audit.</p>
        ) : (
          <div className="mission-list">
            {data.browserSwarmRuns.map((swarm) => (
              <article className="mission-row" key={swarm.id}>
                <div>
                  <div className="badge">{swarm.status}</div>
                  <h3>{swarm.mode} swarm</h3>
                  <p>{swarm.summary ?? "Coordinating bounded role-specific Browser Agents."}</p>
                  <ul className="status-list">
                    <li>
                      <span>Swarm ID</span>
                      <span>{swarm.id}</span>
                    </li>
                    <li>
                      <span>Agents</span>
                      <span>
                        {swarm.agentsCompleted}/{swarm.agentsCreated} completed
                      </span>
                    </li>
                    <li>
                      <span>Concurrency</span>
                      <span>{swarm.maxConcurrency}</span>
                    </li>
                    <li>
                      <span>Steps</span>
                      <span>{swarm.totalSteps}</span>
                    </li>
                    <li>
                      <span>Provider calls</span>
                      <span>{swarm.totalProviderCalls}</span>
                    </li>
                    <li>
                      <span>Cost</span>
                      <span>{typeof swarm.estimatedCostUsd === "number" ? `$${swarm.estimatedCostUsd.toFixed(4)}` : "none"}</span>
                    </li>
                    <li>
                      <span>Terminal reason</span>
                      <span>{swarm.terminalReason ?? "running"}</span>
                    </li>
                  </ul>
                  <details>
                    <summary>Coverage</summary>
                    <pre className="evidence">
                      {JSON.stringify(
                        {
                          visitedRoutes: swarm.coverageState.visitedRoutes ?? [],
                          testedTargets: swarm.coverageState.testedTargetFingerprints?.length ?? 0,
                          discoveredForms: swarm.coverageState.discoveredForms?.length ?? 0,
                          knownFindings: swarm.coverageState.knownFindingFingerprints?.length ?? 0,
                          coverageGaps: swarm.coverageState.coverageGaps ?? [],
                          completedRoles: swarm.coverageState.completedAgentRoles ?? []
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                  <details>
                    <summary>Agent timeline</summary>
                    <div className="mission-list" style={{ marginTop: 12 }}>
                      {swarm.agents.map((agent) => (
                        <article className="card" key={agent.id} style={{ marginTop: 8 }}>
                          <div className="badge">
                            {agent.role} / {agent.status}
                          </div>
                          <p>{agent.objective}</p>
                          <p>
                            <strong>Steps:</strong> {agent.stepsUsed} / <strong>Findings:</strong> {agent.findingsCount}
                          </p>
                          <p>
                            <strong>Routes:</strong> {agent.routesVisited.join(", ") || "none"}
                          </p>
                          <p>
                            <strong>Replay:</strong> {agent.browserAgentRunId ?? "not created"}
                          </p>
                          {agent.terminalReason ? <p>{agent.terminalReason}</p> : null}
                        </article>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="mission-meta">
                  <span>{swarm.maxAgents} max agents</span>
                  <span>{swarm.agents.length} timeline rows</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {data.report ? (
        <section className="panel" style={{ marginTop: 16 }}>
          <h2>Report</h2>
          <ul className="status-list">
            <li>
              <span>Generated</span>
              <span>{formatDate(data.report.generatedAt)}</span>
            </li>
            <li>
              <span>Severity</span>
              <span>{formatCounts(data.report.severityCounts)}</span>
            </li>
            <li>
              <span>Categories</span>
              <span>{formatCounts(data.report.categoryCounts)}</span>
            </li>
          </ul>
          {data.report.executionWarnings.length > 0 ? <p>{data.report.executionWarnings.join(" ")}</p> : null}
        </section>
      ) : null}

      </details>
    </>
  );
}
