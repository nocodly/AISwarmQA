"use client";

import { useEffect, useMemo, useState } from "react";

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

  const audit = data?.audit ?? null;
  const isTerminal = useMemo(() => (audit ? terminalStatuses.has(audit.status) : false), [audit]);

  useEffect(() => {
    let isActive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const auditResponse = await fetch(`/api/audits/${auditId}`, { cache: "no-store" });
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

        if (nextData.audit.status === "completed") {
          const findingsResponse = await fetch(`/api/audits/${auditId}/findings`, { cache: "no-store" });
          const findingsBody = await findingsResponse.json();
          if (findingsResponse.ok && isActive) {
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
  }, [findings, selectedFindingIds.length]);

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
      <section className="grid">
        <article className="card">
          <div className="metric">{audit.findingCount}</div>
          <p>Findings</p>
        </article>
        <article className="card">
          <div className="metric">{audit.status}</div>
          <p>Status</p>
        </article>
        <article className="card">
          <div className="metric">{data.report?.overallScore ?? "-"}</div>
          <p>Score</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
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

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Actions</h2>
        <div className="toolbar">
          <button type="button" onClick={() => downloadReport("json")} disabled={findings.length === 0}>
            Download JSON
          </button>
          <button type="button" onClick={() => downloadReport("csv")} disabled={findings.length === 0}>
            Download CSV
          </button>
          <button type="button" onClick={() => void shareReport()}>
            Share report
          </button>
        </div>
        <div className="mission-list" style={{ marginTop: 12 }}>
          <article className="mission-row">
            <div>
              <div className="badge">GitHub</div>
              <h3>Send findings to GitHub</h3>
              {githubStatus?.manualSetupRequired ? (
                <p>GitHub App credentials are not configured yet. Use the Phase 7 setup guide before enabling production issue creation.</p>
              ) : null}
              {!githubStatus?.connected && githubStatus?.connectUrl ? (
                <p>
                  <a href={`${githubStatus.connectUrl}?returnUrl=${encodeURIComponent(`/audits/${auditId}`)}`}>Connect GitHub</a>
                </p>
              ) : null}
              <p>
                Selected: {selectedFindingIds.length} finding{selectedFindingIds.length === 1 ? "" : "s"}
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={excludeInformational}
                  onChange={(event) => setExcludeInformational(event.target.checked)}
                />{" "}
                Exclude informational findings
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
              ) : null}
              {githubMessage ? <p>{githubMessage}</p> : null}
              {githubPreview ? (
                <details open>
                  <summary>
                    Preview {githubPreview.selectedCount} issue{githubPreview.selectedCount === 1 ? "" : "s"} for {githubPreview.repository.fullName}
                  </summary>
                  <ul>
                    {githubPreview.issues.map((issue) => (
                      <li key={issue.findingId}>
                        {issue.title} ({issue.labels.join(", ")})
                        {issue.alreadyExported ? " - already exported" : ""}
                        {!issue.evidenceAvailable ? " - no external evidence" : ""}
                      </li>
                    ))}
                  </ul>
                  {githubPreview.warnings.length > 0 ? <p>{githubPreview.warnings.join(" ")}</p> : null}
                  <p>
                    Issues to create: {githubPreview.issuesToCreate}. Already exported: {githubPreview.alreadyExportedCount}.
                  </p>
                  <p>Estimated GitHub API requests: {githubPreview.estimatedApiRequests}</p>
                </details>
              ) : null}
              {githubBatch ? (
                <details open>
                  <summary>
                    Export {githubBatch.batch.status}: {githubBatch.batch.createdCount} created / {githubBatch.batch.failedCount} failed
                  </summary>
                  <div className="mission-list" style={{ marginTop: 8 }}>
                    {githubBatch.exports.map((item) => (
                      <article className="card" key={item.id}>
                        <div className="badge">{item.status}</div>
                        <p>{item.findingTitle}</p>
                        {item.githubIssueUrl ? (
                          <p>
                            <a href={item.githubIssueUrl} target="_blank" rel="noreferrer">
                              Open GitHub Issue #{item.githubIssueNumber}
                            </a>
                          </p>
                        ) : null}
                        {item.errorMessage ? <p className="error-text">{item.errorMessage}</p> : null}
                      </article>
                    ))}
                  </div>
                  {githubBatch.batch.failedCount > 0 ? (
                    <button type="button" onClick={() => void retryGitHubExport()}>
                      Retry failed exports
                    </button>
                  ) : null}
                </details>
              ) : null}
            </div>
            <div className="mission-meta">
              <button type="button" onClick={() => setSelectedFindingIds(findings.map((finding) => finding.id))} disabled={findings.length === 0}>
                Select all
              </button>
              <button type="button" onClick={() => setSelectedFindingIds([])} disabled={selectedFindingIds.length === 0}>
                Clear
              </button>
              <button type="button" onClick={() => void previewGitHubExport()} disabled={selectedFindingIds.length === 0}>
                Preview GitHub export
              </button>
              <button type="button" onClick={() => void confirmGitHubExport()} disabled={!githubPreview}>
                Create {githubPreview?.issuesToCreate ?? selectedFindingIds.length} GitHub Issues
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Findings</h2>
        {audit.status === "completed" && findings.length === 0 ? (
          <p>No issues were found by this limited deterministic scan. This does not mean the site is bug-free.</p>
        ) : null}
        {findings.map((finding) => (
          <article className="card" key={finding.id} style={{ marginTop: 12 }}>
            <div className="badge">
              {finding.severity} / {finding.category}
            </div>
            <label>
              <input type="checkbox" checked={selectedFindingIds.includes(finding.id)} onChange={() => toggleFinding(finding.id)} /> Select for GitHub export
            </label>
            <h2 style={{ marginTop: 12 }}>{finding.title}</h2>
            <p>{finding.summary}</p>
            <p>
              <strong>Affected URL:</strong> {finding.affectedUrl}
            </p>
            <p>
              <strong>Source missions:</strong> {finding.sourceMissionTypes.join(", ") || "unknown"} ({finding.occurrenceCount} occurrence
              {finding.occurrenceCount === 1 ? "" : "s"})
            </p>
            <p>
              <strong>Actual:</strong> {finding.actualBehavior}
            </p>
            <p>
              <strong>Expected:</strong> {finding.expectedBehavior}
            </p>
            <ol>
              {finding.stepsToReproduce.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <details>
              <summary>Evidence</summary>
              {finding.evidence.map((evidence) => (
                <pre className="evidence" key={evidence.id}>
                  {JSON.stringify(
                    {
                      type: evidence.type,
                      content: evidence.content,
                      localPath: evidence.localPath,
                      metadata: evidence.metadata
                    },
                    null,
                    2
                  )}
                </pre>
              ))}
            </details>
          </article>
        ))}
      </section>
    </>
  );
}
