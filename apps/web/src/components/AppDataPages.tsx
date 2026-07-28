"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Download, ExternalLink, FileSearch, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BrandIcon, GitHubLogo } from "./BrandIcons";

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
  repositories: number;
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
  if (loading) {
    return <section className="command-panel"><p className="eyebrow">Loading</p><h2>Loading workspace data...</h2></section>;
  }
  if (error) {
    return (
      <section className="command-panel">
        <p className="eyebrow">Action needed</p>
        <h2>{error}</h2>
        <div className="hero-actions">
          <button className="new-test-button" onClick={onReload} type="button"><RefreshCw aria-hidden="true" size={16} /> Try again</button>
          <Link className="ghost-button compact" href="/auth">Sign in</Link>
        </div>
      </section>
    );
  }
  return null;
}

function PageShell({ eyebrow, title, copy, action, children }: { eyebrow: string; title: string; copy: string; action?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        {action}
      </header>
      {children}
    </>
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

function severityTone(severity: string) {
  return severity.toLowerCase() === "critical" ? "critical" : severity.toLowerCase() === "high" ? "high" : severity.toLowerCase() === "medium" ? "medium" : "low";
}

export function AuditsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  return (
    <PageShell
      eyebrow="Audits"
      title="All audits"
      copy="Start a new website test, open previous reports, and check whether GitHub export is waiting or completed."
      action={<Link className="cta-button" href="/dashboard?newAudit=1"><FileSearch aria-hidden="true" size={18} /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Audit history</p><h2>{data.recentAudits.length} recent audits</h2></div></div>
          <div className="audit-table">
            {data.recentAudits.map((audit) => (
              <Link className="audit-table-row" href={`/audits/${audit.id}`} key={audit.id}>
                <strong>{shortUrl(audit.targetUrl)}</strong>
                <span>{audit.status}</span>
                <span>{audit.findingsCount} findings</span>
                <span>{formatDate(audit.completedAt ?? audit.createdAt)}</span>
                <ArrowRight aria-hidden="true" size={16} />
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
  return (
    <PageShell
      eyebrow="Findings"
      title="Fix queue"
      copy="Every row opens the real audit report where the finding can be reviewed, downloaded, shared, or exported to GitHub."
      action={<Link className="cta-button" href={"/reports" as Route}><Download aria-hidden="true" size={18} /> Reports</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Open findings</p><h2>{data.recentFindings.length} recent findings</h2></div></div>
          <div className="finding-list">
            {data.recentFindings.map((finding) => (
              <Link className="finding-mini-row" href={`/audits/${finding.auditId}`} key={finding.id}>
                <span className={`severity-pill ${severityTone(finding.severity)}`}>{finding.severity}</span>
                <strong>{finding.title}</strong>
                <span>{finding.summary}</span>
                <em>{shortUrl(finding.auditTargetUrl)}</em>
              </Link>
            ))}
            {data.recentFindings.length === 0 ? <p>No findings yet. Run an audit to build the fix queue.</p> : null}
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
      copy="Open durable evidence links when external sharing is enabled, or jump back to the source audit when evidence is private."
      action={<Link className="cta-button" href={"/audits" as Route}><FileSearch aria-hidden="true" size={18} /> View audits</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="hub-grid">
          {data.recentEvidence.map((item) => {
            const href = item.publicEvidenceId && item.externalSharingEnabled ? `/evidence/${item.publicEvidenceId}` : `/audits/${item.auditId}`;
            return (
              <Link className="hub-card" href={href as Route} key={item.id}>
                <BrandIcon name="screenshot" tone="cyan" />
                <h2>{item.label}</h2>
                <p>{item.type} evidence from a real audit finding.</p>
                <span className={`severity-pill ${severityTone(item.severity)}`}>{item.severity}</span>
              </Link>
            );
          })}
          {data.recentEvidence.length === 0 ? <article className="hub-card"><BrandIcon name="screenshot" tone="cyan" /><h2>No evidence yet</h2><p>Evidence appears here after audits capture screenshots, logs, or replay artifacts.</p></article> : null}
        </section>
      ) : null}
    </PageShell>
  );
}

export function AgentsIndexClient() {
  const { data, error, loading, reload } = useDashboardData();
  const agents = useMemo(() => data?.recentFindings.slice(0, 8).map((finding, index) => ({
    id: index + 1,
    task: finding.category,
    status: finding.githubExportStatus === "completed" ? "Exported" : "Reviewed",
    target: shortUrl(finding.affectedUrl || finding.auditTargetUrl)
  })) ?? [], [data]);

  return (
    <PageShell
      eyebrow="Agents"
      title="Swarm activity"
      copy="A working view of the agent output currently available from recent audits. Detailed live agent traces will be expanded from this page."
      action={<Link className="cta-button" href="/dashboard?newAudit=1"><FileSearch aria-hidden="true" size={18} /> New audit</Link>}
    >
      <WorkspaceState error={error} loading={loading} onReload={reload} />
      {data ? (
        <section className="command-panel">
          <div className="agent-list">
            {agents.map((agent) => (
              <Link className="agent-row" href={`/audits/${data.recentFindings[agent.id - 1]?.auditId ?? ""}`} key={agent.id}>
                <BrandIcon name="agent" tone={agent.id % 2 ? "purple" : "cyan"} />
                <strong>Agent #{agent.id}</strong>
                <span>{agent.status}</span>
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
      copy="Open completed reports to download JSON/CSV, review findings, share the report, or export selected findings to GitHub."
      action={<Link className="cta-button" href="/dashboard?newAudit=1"><FileSearch aria-hidden="true" size={18} /> New audit</Link>}
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
                <ArrowRight aria-hidden="true" size={16} />
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

  return (
    <PageShell
      eyebrow="GitHub"
      title="Issue export"
      copy="Connect the GitHub App, verify selectable repositories, and open exported issues from recent audit findings."
      action={status?.connectUrl ? <a className="cta-button" href={`${status.connectUrl}?returnUrl=${encodeURIComponent("/github")}`}><GitHubLogo /> Connect GitHub</a> : undefined}
    >
      <WorkspaceState error={error} loading={loading} onReload={load} />
      {status ? (
        <section className="dashboard-lower-grid">
          <article className="command-panel">
            <GitHubLogo />
            <h2>{status.connected ? "GitHub connected" : "GitHub not connected"}</h2>
            <p>{status.connected ? `${status.repositories} repositories are authorized for this workspace.` : "Install the GitHub App before exporting findings."}</p>
            {status.connectUrl ? <a className="panel-link" href={`${status.connectUrl}?returnUrl=${encodeURIComponent("/github")}`}>Open GitHub setup <ExternalLink aria-hidden="true" size={16} /></a> : null}
          </article>
          <article className="command-panel">
            <p className="eyebrow">Repositories</p>
            <h2>{repositories.length} available</h2>
            <div className="finding-list">
              {repositories.slice(0, 8).map((repo) => (
                <div className="export-mini-row" key={repo.id}>
                  <strong>{repo.fullName}</strong>
                  <span>{repo.archived ? "Archived" : repo.issuesEnabled ? "Issues enabled" : "Issues disabled"}</span>
                  <em>{repo.private ? "Private" : "Public"} - {repo.defaultBranch}</em>
                </div>
              ))}
              {repositories.length === 0 ? <p>No repositories are available yet.</p> : null}
            </div>
          </article>
          <article className="command-panel">
            <p className="eyebrow">Next action</p>
            <h2>Export from reports</h2>
            <p>Open an audit report, select findings, preview the issue body, then confirm GitHub export.</p>
            <Link className="panel-link" href={"/reports" as Route}>Open reports <ArrowRight aria-hidden="true" size={16} /></Link>
          </article>
        </section>
      ) : null}
    </PageShell>
  );
}
