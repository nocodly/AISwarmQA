"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppSelect } from "./AppSelect";
import { LinearIcon } from "./BrandIcons";

type DashboardData = {
  summary: {
    usage: { audits: number; pages: number; githubIssuesExported?: number };
    limits: { githubExportEnabled?: boolean };
  };
  severityCounts: Record<string, number>;
  recentAudits: Array<{
    id: string;
    targetUrl: string;
    status: string;
    findingsCount: number;
    criticalHighCount: number;
    githubExportStatus: string;
    createdAt: string;
    completedAt?: string | null;
  }>;
  recentFindings: Array<{
    id: string;
    auditId: string;
    auditTargetUrl: string;
    category: string;
    severity: string;
    title: string;
    summary: string;
    affectedUrl: string;
    occurrenceCount: number;
    evidenceCount: number;
    githubExportStatus: string;
    createdAt: string;
  }>;
  recentGitHubExports: Array<{
    id: string;
    auditId: string;
    status: string;
    issueNumber?: number | null;
    issueUrl?: string | null;
    repositoryFullName?: string | null;
    findingTitle: string;
    createdAt: string;
  }>;
  recentEvidence: Array<{
    id: string;
    auditId: string;
    findingId: string;
    type: string;
    label: string;
    severity: string;
    publicEvidenceId?: string | null;
    externalSharingEnabled: boolean;
    createdAt: string;
  }>;
};

type GitHubStatus = {
  appConfigured: boolean;
  connected: boolean;
  repositories: number | GitHubRepository[];
  connectUrl: string | null;
  manualSetupRequired: boolean;
};

type GitHubRepository = {
  id: string;
  fullName: string;
  private: boolean;
  issuesEnabled: boolean;
  archived: boolean;
  defaultBranch: string;
  accountLogin: string;
};

type GitHubRepositoryMetadata = {
  assignees: string[];
};

type FindingExportTarget = {
  auditId: string;
  findingIds: string[];
  title: string;
} | null;

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Workspace data could not be loaded.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Workspace data could not be loaded because the server could not be reached.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return { data, error, loading, reload: load };
}

function WorkspaceState({ error, loading, onReload }: { error: string | null; loading: boolean; onReload: () => void }) {
  const requiresSignIn = error?.toLowerCase().includes("sign in") ?? false;
  if (loading) {
    return (
      <section className="dashboard-skeleton app-loading-skeleton" aria-label="Loading workspace data">
        {Array.from({ length: 6 }).map((_, index) => <span key={index} />)}
      </section>
    );
  }
  if (error) {
    return (
      <section className="command-panel">
        <p className="eyebrow">Action needed</p>
        <h2>{error}</h2>
        <div className="hero-actions">
          {requiresSignIn ? (
            <Link className="new-test-button" href="/auth">Sign in</Link>
          ) : (
            <button className="new-test-button" onClick={onReload} type="button">Try again</button>
          )}
          {!requiresSignIn ? <Link className="ghost-button compact" href="/auth">Sign in</Link> : null}
        </div>
      </section>
    );
  }
  return null;
}

function PageShell({ eyebrow, title, copy, action, children }: { eyebrow: string; title: string; copy: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="app-content-stack">
      <header className="page-header app-page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

function shortUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function severitySignal(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "danger";
  if (normalized === "medium") return "warning";
  return "weak";
}

function repositoryCount(status: GitHubStatus | null, repositories: GitHubRepository[]) {
  if (!status) return repositories.length;
  return typeof status.repositories === "number" ? status.repositories : status.repositories.length;
}

function repositoryReadiness(repository: GitHubRepository) {
  if (repository.archived) {
    return { label: "Archived", tone: "blocked", description: "Exports are disabled for archived repositories." };
  }
  if (!repository.issuesEnabled) {
    return { label: "Issues disabled", tone: "blocked", description: "Enable GitHub Issues before exporting findings." };
  }
  return { label: "Ready", tone: "ready", description: "Findings can be exported as GitHub issues." };
}

export function AuditsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  return (
    <PageShell
      eyebrow="Audits"
      title="All audits"
      copy="Start a new test or open the latest audit report."
      action={<Link className="new-test-button" href="/dashboard?newAudit=1"><LinearIcon name="add" /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">History</p><h2>{data.recentAudits.length} audits</h2></div></div>
          <div className="audit-table">
            {data.recentAudits.map((audit) => (
              <Link className="audit-table-row" href={`/audits/${audit.id}`} key={audit.id}>
                <span className="audit-row-title">
                  <strong>{shortUrl(audit.targetUrl)}</strong>
                  <em>Audit {audit.id.slice(0, 6)}</em>
                </span>
                <span className={`audit-status audit-status-${audit.status.toLowerCase()}`}>
                  <span className={`agent-state-dot ${audit.status === "completed" ? "active" : audit.status === "failed" ? "inactive" : ""}`} aria-hidden="true" />
                  {audit.status}
                </span>
                <span>{audit.findingsCount} findings</span>
                <span>{formatDate(audit.completedAt ?? audit.createdAt)}</span>
                <span className="audit-row-action">View audit</span>
              </Link>
            ))}
            {data.recentAudits.length === 0 ? <p>No audits yet. Start your first audit from the button above.</p> : null}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function FindingsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  const [query, setQuery] = useState("");
  const [exportTarget, setExportTarget] = useState<FindingExportTarget>(null);
  const [githubStatus, setGitHubStatus] = useState<GitHubStatus | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [repositoryMetadata, setRepositoryMetadata] = useState<GitHubRepositoryMetadata | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [includeExternalEvidence, setIncludeExternalEvidence] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const findings = data?.recentFindings ?? [];
  const openFindings = findings.filter((finding) => finding.githubExportStatus !== "completed");
  const exportedFindings = findings.length - openFindings.length;
  const filteredFindings = findings.filter((finding) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [finding.title, finding.summary, finding.category, finding.severity, finding.auditTargetUrl, finding.affectedUrl].some((value) => value.toLowerCase().includes(normalized));
  });
  const repositories = Array.isArray(githubStatus?.repositories) ? githubStatus.repositories : [];
  const auditById = useMemo(() => new Map((data?.recentAudits ?? []).map((audit) => [audit.id, audit])), [data?.recentAudits]);
  const selectedFinding = filteredFindings.find((finding) => finding.id === selectedFindingId) ?? filteredFindings[0] ?? null;
  const selectedAudit = selectedFinding ? auditById.get(selectedFinding.auditId) : null;
  const filteredFindingIds = filteredFindings.map((finding) => finding.id);
  const allFilteredSelected = filteredFindingIds.length > 0 && filteredFindingIds.every((id) => selectedFindingIds.includes(id));

  useEffect(() => {
    if (filteredFindings.length === 0) {
      if (selectedFindingId) {
        setSelectedFindingId(null);
      }
      return;
    }
    if (!selectedFindingId || !filteredFindings.some((finding) => finding.id === selectedFindingId)) {
      setSelectedFindingId(filteredFindings[0]?.id ?? null);
    }
  }, [filteredFindings, selectedFindingId]);

  function toggleFindingSelection(findingId: string) {
    setSelectedFindingIds((current) => (current.includes(findingId) ? current.filter((id) => id !== findingId) : [...current, findingId]));
  }

  function toggleAllFilteredFindings() {
    setSelectedFindingIds((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredFindingIds.includes(id));
      }
      return [...new Set([...current, ...filteredFindingIds])];
    });
  }

  async function openExportModal(finding: DashboardData["recentFindings"][number]) {
    setExportTarget({ auditId: finding.auditId, findingIds: [finding.id], title: finding.title });
    setExportMessage(null);
    try {
      const response = await fetch("/api/integrations/github/status", { cache: "no-store" });
      const body = (await response.json()) as GitHubStatus;
      if (!response.ok) {
        setExportMessage("Connect GitHub before exporting issues.");
        return;
      }
      setGitHubStatus(body);
      const nextRepositories = Array.isArray(body.repositories) ? body.repositories : [];
      setSelectedRepositoryId((current) => current || nextRepositories[0]?.id || "");
    } catch {
      setExportMessage("GitHub integration status could not be loaded.");
    }
  }

  useEffect(() => {
    if (!exportTarget || !selectedRepositoryId) {
      return;
    }
    let isActive = true;
    async function loadRepositoryMetadata() {
      try {
        const response = await fetch(`/api/integrations/github/repositories/${selectedRepositoryId}/metadata`, { cache: "no-store" });
        const body = await response.json();
        if (response.ok && isActive) {
          setRepositoryMetadata({ assignees: body.assignees ?? [] });
        }
      } catch {
        if (isActive) {
          setRepositoryMetadata({ assignees: [] });
        }
      }
    }
    void loadRepositoryMetadata();
    return () => {
      isActive = false;
    };
  }, [exportTarget, selectedRepositoryId]);

  async function exportFindingIssue() {
    if (!exportTarget || !selectedRepositoryId) return;
    setExporting(true);
    setExportMessage(null);
    try {
      const previewResponse = await fetch(`/api/audits/${exportTarget.auditId}/github-export/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          findingIds: exportTarget.findingIds,
          repositoryId: selectedRepositoryId,
          assignees: selectedAssignee ? [selectedAssignee] : [],
          includeExternalEvidence,
          excludeInformational: true,
          confirmed: false
        })
      });
      const previewBody = await previewResponse.json();
      if (!previewResponse.ok) {
        setExportMessage(previewBody.error?.message ?? "GitHub export preview failed.");
        return;
      }
      const exportResponse = await fetch(`/api/audits/${exportTarget.auditId}/github-export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          findingIds: exportTarget.findingIds,
          repositoryId: previewBody.repository.id,
          assignees: selectedAssignee ? [selectedAssignee] : [],
          includeExternalEvidence,
          excludeInformational: true,
          confirmed: true
        })
      });
      const exportBody = await exportResponse.json();
      if (!exportResponse.ok) {
        setExportMessage(exportBody.error?.message ?? "GitHub export could not be queued.");
        return;
      }
      setExportMessage("GitHub export queued.");
      setExportTarget(null);
    } catch {
      setExportMessage("GitHub export could not be started.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageShell
      eyebrow="Findings"
      title="All issues"
      copy="Select an issue, review the source test, then open the full audit report when you need deeper evidence."
      action={<Link className="new-test-button" href="/dashboard?newAudit=1"><LinearIcon name="add" /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="github-issues-shell">
          <div className="github-issues-toolbar">
            <label className="github-filter-input">
              <LinearIcon name="search" />
              <input aria-label="Filter findings" onChange={(event) => setQuery(event.target.value)} placeholder="is:open label:high" value={query} />
            </label>
          </div>

          <div className="findings-triage-layout">
            <div className="github-issues-list">
              <div className="github-issues-list-head">
                <label className="github-issue-check">
                  <input aria-label="Select all visible findings" checked={allFilteredSelected} onChange={toggleAllFilteredFindings} type="checkbox" />
                </label>
                <div className="github-issue-tabs">
                  <span className="active">Open <b>{openFindings.length}</b></span>
                  <span>Exported <b>{exportedFindings}</b></span>
                  {selectedFindingIds.length > 0 ? <span>Selected <b>{selectedFindingIds.length}</b></span> : null}
                </div>
                <div className="github-issue-filters" aria-label="Finding filters">
                  <button type="button">Severity</button>
                  <button type="button">Category</button>
                  <button type="button">Audit</button>
                  <button type="button">Newest</button>
                </div>
              </div>

              <div className="github-issue-rows">
                {filteredFindings.map((finding) => (
                  <article className={selectedFinding?.id === finding.id ? "github-issue-row selected" : "github-issue-row"} key={finding.id}>
                    <label className="github-issue-check">
                      <input
                        aria-label={`Select finding ${finding.title}`}
                        checked={selectedFindingIds.includes(finding.id)}
                        onChange={() => toggleFindingSelection(finding.id)}
                        type="checkbox"
                      />
                    </label>
                    <button className="github-issue-main" type="button" onClick={() => setSelectedFindingId(finding.id)}>
                      <span className="github-issue-title-line">
                        <span className={`signal-dot signal-${severitySignal(finding.severity)}`} aria-label={`${finding.severity} severity`} title={`${finding.severity} severity`} />
                        <strong>{finding.title}</strong>
                        <span className="github-label chip-purple">{finding.category}</span>
                        {finding.githubExportStatus === "completed" ? <span className="github-label chip-green">exported</span> : null}
                      </span>
                      <span className="github-issue-meta">
                        Test: {shortUrl(finding.auditTargetUrl)} · #{finding.id.slice(0, 6)} opened {formatDate(finding.createdAt)} by AISwarmQA
                      </span>
                      <span className="github-issue-summary">{finding.summary}</span>
                    </button>
                    <div className="github-issue-side">
                      <span>{shortUrl(finding.affectedUrl || finding.auditTargetUrl)}</span>
                      <span>{finding.evidenceCount} evidence</span>
                      <button className="github-export-button compact" type="button" onClick={() => void openExportModal(finding)}>
                        <LinearIcon name="github" /> Export issue
                      </button>
                    </div>
                  </article>
                ))}
                {filteredFindings.length === 0 ? <p className="github-empty-list">No findings match this filter.</p> : null}
              </div>
            </div>

            <aside className="finding-audit-preview" aria-label="Selected issue audit preview">
              {selectedFinding ? (
                <>
                  <header className="finding-audit-preview-head">
                    <div>
                      <p className="eyebrow">Source test</p>
                      <h2>{shortUrl(selectedFinding.auditTargetUrl)}</h2>
                    </div>
                    <span className="github-label chip-purple">Audit {selectedFinding.auditId.slice(0, 6)}</span>
                  </header>
                  <div className="finding-audit-preview-body">
                    <div className="selected-finding-summary">
                      <span className="selected-finding-title">
                        <span className={`signal-dot signal-${severitySignal(selectedFinding.severity)}`} aria-hidden="true" />
                        <strong>{selectedFinding.title}</strong>
                      </span>
                      <p>{selectedFinding.summary}</p>
                    </div>
                    <dl className="audit-preview-facts">
                      <div>
                        <dt>Status</dt>
                        <dd>{selectedAudit?.status ?? "unknown"}</dd>
                      </div>
                      <div>
                        <dt>Findings</dt>
                        <dd>{selectedAudit?.findingsCount ?? 1}</dd>
                      </div>
                      <div>
                        <dt>Priority</dt>
                        <dd>{selectedAudit?.criticalHighCount ?? (severitySignal(selectedFinding.severity) === "danger" ? 1 : 0)} critical or high</dd>
                      </div>
                      <div>
                        <dt>Affected page</dt>
                        <dd>{shortUrl(selectedFinding.affectedUrl || selectedFinding.auditTargetUrl)}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{selectedFinding.evidenceCount} item{selectedFinding.evidenceCount === 1 ? "" : "s"}</dd>
                      </div>
                      <div>
                        <dt>Completed</dt>
                        <dd>{formatDate(selectedAudit?.completedAt ?? selectedAudit?.createdAt ?? selectedFinding.createdAt)}</dd>
                      </div>
                    </dl>
                    <Link className="new-test-button audit-preview-link" href={`/audits/${selectedFinding.auditId}`}>
                      View full report
                    </Link>
                  </div>
                </>
              ) : (
                <div className="finding-audit-preview-empty">
                  <p className="eyebrow">Source test</p>
                  <h2>No issue selected</h2>
                  <p>Select an issue from the list to see the audit summary.</p>
                </div>
              )}
            </aside>
          </div>
        </section>
      ) : null}
      {exportTarget ? (
        <section className="modal-backdrop" role="presentation">
          <div aria-label="Export issue to GitHub" aria-modal="true" className="github-export-modal" role="dialog">
            <header>
              <div>
                <p className="eyebrow">GitHub export</p>
                <h2>Export issue</h2>
              </div>
              <button type="button" onClick={() => setExportTarget(null)}>Close</button>
            </header>
            <div className="github-export-form">
              <p>{exportTarget.title}</p>
              <AppSelect
                label="Repository"
                onChange={setSelectedRepositoryId}
                options={repositories.map((repository) => ({ label: repository.fullName, value: repository.id }))}
                value={selectedRepositoryId}
              />
              <AppSelect
                label="Assignee"
                onChange={setSelectedAssignee}
                options={[
                  { label: "Skip assignee", value: "" },
                  ...(repositoryMetadata?.assignees ?? []).map((assignee) => ({ label: assignee, value: assignee }))
                ]}
                value={selectedAssignee}
              />
              <label className="checkbox-line">
                <input checked={includeExternalEvidence} onChange={(event) => setIncludeExternalEvidence(event.target.checked)} type="checkbox" />
                Include public evidence link
              </label>
              {exportMessage ? <p className="export-message">{exportMessage}</p> : null}
            </div>
            <footer>
              <button className="ghost-button compact" type="button" onClick={() => setExportTarget(null)}>Cancel</button>
              <button className="github-export-button" type="button" onClick={() => void exportFindingIssue()} disabled={exporting || !selectedRepositoryId}>
                <LinearIcon name="github" /> {exporting ? "Exporting..." : "Export issue"}
              </button>
            </footer>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function EvidenceIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  return (
    <PageShell
      eyebrow="Evidence"
      title="Captured proof"
      copy="Open evidence from recent audits."
      action={<Link className="new-test-button" href={"/audits" as Route}><LinearIcon name="projects" /> View audits</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Evidence</p><h2>{data.recentEvidence.length} items</h2></div></div>
          <div className="compact-list">
          {data.recentEvidence.map((item) => {
            const href = item.publicEvidenceId && item.externalSharingEnabled ? `/evidence/${item.publicEvidenceId}` : `/audits/${item.auditId}`;
            return (
              <Link className="evidence-thumb" href={href as Route} key={item.id}>
                <LinearIcon name="views" />
                <strong>{item.label}</strong>
                <p>{item.type} evidence</p>
                <span className={`signal-dot signal-${severitySignal(item.severity)}`} aria-label={`${item.severity} severity`} title={`${item.severity} severity`} />
              </Link>
            );
          })}
          {data.recentEvidence.length === 0 ? <p>No evidence yet. Evidence appears after audits capture screenshots, logs, or replay artifacts.</p> : null}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function AgentsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  const agents = useMemo(() => data?.recentFindings.slice(0, 8).map((finding, index) => ({
    auditId: finding.auditId,
    id: index + 1,
    task: finding.category,
    status: finding.githubExportStatus === "completed" ? "Exported" : "Reviewed",
    target: shortUrl(finding.affectedUrl || finding.auditTargetUrl)
  })) ?? [], [data]);

  return (
    <PageShell
      eyebrow="Agents"
      title="Swarm activity"
      copy="Recent agent output from audit findings."
      action={<Link className="new-test-button" href="/dashboard?newAudit=1"><LinearIcon name="add" /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="agent-list">
            {agents.map((agent) => (
              <Link className="agent-row" href={`/audits/${agent.auditId}`} key={agent.id}>
                <LinearIcon name="teams" />
                <strong>Agent #{agent.id}</strong>
                <span className={`agent-state-dot ${agent.status === "Exported" ? "inactive" : "active"}`} aria-label={agent.status === "Exported" ? "Inactive" : "Active"} title={agent.status === "Exported" ? "Inactive" : "Active"} />
                <em>{agent.task}</em>
                <small>{agent.target}</small>
              </Link>
            ))}
            {agents.length === 0 ? <p>No agent activity yet. Start an audit to see the swarm work.</p> : null}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function ReportsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  return (
    <PageShell
      eyebrow="Reports"
      title="Audit reports"
      copy="Open an audit report to review findings, download data, or export issues."
      action={<Link className="new-test-button" href="/dashboard?newAudit=1"><LinearIcon name="add" /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="audit-table">
            {data.recentAudits.map((audit) => (
              <Link className="audit-table-row" href={`/audits/${audit.id}`} key={audit.id}>
                <strong>{shortUrl(audit.targetUrl)}</strong>
                <span>{audit.status}</span>
                <span>{audit.findingsCount} findings</span>
                <span>{audit.githubExportStatus}</span>
              </Link>
            ))}
            {data.recentAudits.length === 0 ? <p>No reports yet. Completed audits will appear here.</p> : null}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

export function GitHubAppClient() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const statusResponse = await fetch("/api/integrations/github/status", { cache: "no-store" });
      const statusBody = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(statusBody.error?.message ?? "GitHub status could not be loaded.");
      setStatus(statusBody);
      if (statusBody.connected) {
        const repositoriesResponse = await fetch("/api/integrations/github/repositories", { cache: "no-store" });
        const repositoriesBody = await repositoriesResponse.json();
        if (!repositoriesResponse.ok) throw new Error(repositoriesBody.error?.message ?? "GitHub repositories could not be loaded.");
        setRepositories(repositoriesBody.repositories ?? []);
      } else {
        setRepositories([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "GitHub data could not be loaded.");
      setStatus(null);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function disconnectGitHub() {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/github/disconnect", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "GitHub could not be disconnected.");
      }
      await load();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "GitHub could not be disconnected.");
    } finally {
      setDisconnecting(false);
    }
  }

  const githubAction = status?.connected ? (
    <button className="ghost-button github-disconnect-button" disabled={disconnecting} type="button" onClick={() => void disconnectGitHub()}>
      {disconnecting ? "Disconnecting..." : "Disconnect"}
    </button>
  ) : status?.connectUrl ? (
    <a className="new-test-button" href={`${status.connectUrl}?returnUrl=${encodeURIComponent("/github")}`}><LinearIcon name="github" /> Connect new</a>
  ) : undefined;

  return (
    <PageShell
      eyebrow="GitHub"
      title="Issue export"
      copy="Connect GitHub and export confirmed findings from audit reports."
      action={githubAction}
    >
      <WorkspaceState error={error} loading={loading} onReload={load} />
      {status ? (
        <section className="github-layout-grid">
          <article className={status.connected ? "command-panel github-connection-card connected" : "command-panel github-connection-card"}>
            <div className="github-connection-top">
              <span className="github-connection-icon"><LinearIcon name="github" /></span>
              <span className={status.connected ? "connection-badge connected" : "connection-badge"}>{status.connected ? "Connected" : "Not connected"}</span>
            </div>
            <h2>{status.connected ? "GitHub App is connected" : "Connect GitHub App"}</h2>
            <p>{status.connected ? `${repositoryCount(status, repositories)} repositories are authorized for this workspace. Export issues from audit reports after reviewing findings.` : "Install the GitHub App to choose repositories and export confirmed findings as issues."}</p>
            <div className="github-permission-note">
              <LinearIcon name="issues" />
              <p>AISwarmQA uses GitHub for repository selection and issue creation. The product workflow does not read repository files or source code.</p>
            </div>
            <div className="github-connection-actions">
              {status.connectUrl ? <a className="panel-link" href={`${status.connectUrl}?returnUrl=${encodeURIComponent("/github")}`}>{status.connected ? "Connect new" : "Open GitHub setup"}</a> : null}
              <Link className="panel-link" href={"/audits" as Route}>Open audits</Link>
            </div>
          </article>
          <article className="command-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Repositories</p>
                <h2>{repositories.length} available</h2>
              </div>
              <span className="repo-ready-count">{repositories.filter((repo) => !repo.archived && repo.issuesEnabled).length} ready</span>
            </div>
            <div className="repo-readiness-list">
              {repositories.slice(0, 8).map((repo) => {
                const readiness = repositoryReadiness(repo);
                return (
                  <div className="repo-readiness-row" key={repo.id}>
                    <div>
                      <strong>{repo.fullName}</strong>
                      <p>{readiness.description}</p>
                    </div>
                    <span className={`repo-readiness repo-readiness-${readiness.tone}`}>{readiness.label}</span>
                    <em>{repo.private ? "Private" : "Public"} / {repo.defaultBranch}</em>
                  </div>
                );
              })}
              {repositories.length === 0 ? <p>No repositories are available yet.</p> : null}
            </div>
          </article>
        </section>
      ) : null}
    </PageShell>
  );
}
