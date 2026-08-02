"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LinearIcon, type LinearIconName } from "@/components/BrandIcons";

type DashboardData = {
  summary: {
    plan: { name: string; evidenceRetentionDays: number };
    subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };
    usage: {
      audits: number;
      pages: number;
      concurrentAudits: number;
      teamMembers: number;
      screenshots?: number;
      storageBytes?: number;
      githubIssuesExported?: number;
    };
    limits: {
      auditsPerMonth: number | null;
      maxPagesPerAudit: number | null;
      concurrentAudits: number | null;
      teamMemberLimit: number | null;
      evidenceRetentionDays?: number;
      githubExportEnabled?: boolean;
      teamInvitationsEnabled?: boolean;
    };
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
    findingId: string;
    title: string;
    severity: string;
    affectedUrl: string;
    repository: string;
    status: string;
    issueNumber: number | null;
    issueUrl: string | null;
    updatedAt: string;
  }>;
  recentEvidence: Array<{
    id: string;
    findingId: string;
    auditId: string;
    findingTitle: string;
    severity: string;
    type: string;
    contentType: string | null;
    sizeBytes: number | null;
    publicEvidenceId: string | null;
    externalSharingEnabled: boolean;
    createdAt: string;
  }>;
  githubIssuesExported: number;
  githubConnection: {
    connected: boolean;
    accountLogin: string | null;
    selectedRepository: string | null;
    repositoriesCount: number;
    readyRepositoriesCount: number;
  };
};

type AccessMode = "public" | "temporary-account" | "instructions";
type ScopeMode = "smoke" | "full" | "auth" | "checkout" | "custom";

const runningStatuses = new Set(["validating", "queued", "planning", "running", "analyzing", "generating_report"]);

const scopeOptions: Array<{ id: ScopeMode; title: string; copy: string; auditMode: "preview" | "standard" }> = [
  { id: "smoke", title: "Quick smoke test", copy: "Fast route, button, form, and visible breakage check.", auditMode: "preview" },
  { id: "full", title: "Full product flow", copy: "Navigation, forms, auth gates, mobile, evidence, and issue quality.", auditMode: "standard" },
  { id: "auth", title: "Login / signup flow", copy: "Registration, login, session, account gates, and broken redirects.", auditMode: "standard" },
  { id: "checkout", title: "Checkout / billing", copy: "Pricing CTAs, checkout intent, billing boundaries, no real payment submission.", auditMode: "standard" },
  { id: "custom", title: "Custom mission", copy: "Write exactly what agents should verify for this run.", auditMode: "standard" }
];

const modalStepHelp = [
  {
    title: "What to enter",
    copy: "Paste only a site your workspace is authorized to test. Agents inspect the client-side website in a browser over an encrypted connection; AISwarmQA does not access server files, databases, or source code."
  },
  {
    title: "Access is limited",
    copy: "Use a temporary test account only. The connection is encrypted in transit, and agents inspect the client-side website in a browser; AISwarmQA does not access your server files, database, or source code."
  },
  {
    title: "Choose the mission",
    copy: "Pick the smallest scope that answers your question. Larger scopes take longer but collect broader evidence across forms, navigation, auth gates, and responsive behavior."
  },
  {
    title: "Before launch",
    copy: "Review the target and mission. Agents follow safety rules: no real payments, no destructive actions, and evidence captured for findings."
  }
];

const emptyDashboard: DashboardData = {
  summary: {
    plan: { name: "Free", evidenceRetentionDays: 7 },
    subscription: { status: "free", currentPeriodEnd: null, cancelAtPeriodEnd: false },
    usage: { audits: 0, pages: 0, concurrentAudits: 0, teamMembers: 1, screenshots: 0, storageBytes: 0, githubIssuesExported: 0 },
    limits: { auditsPerMonth: 2, maxPagesPerAudit: 25, concurrentAudits: 1, teamMemberLimit: 1, evidenceRetentionDays: 7, githubExportEnabled: true, teamInvitationsEnabled: false }
  },
  severityCounts: {},
  recentAudits: [],
  recentFindings: [],
  recentGitHubExports: [],
  recentEvidence: [],
  githubIssuesExported: 0,
  githubConnection: { connected: false, accountLogin: null, selectedRepository: null, repositoriesCount: 0, readyRepositoriesCount: 0 }
};

export function DashboardClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [launcherOpen, setLauncherOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.code === "INTERNAL_ERROR" ? "Dashboard data could not be loaded." : body.error?.message ?? "Dashboard could not be loaded.");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setError("Dashboard could not be reached.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (searchParams.get("newAudit") === "1") {
      setLauncherOpen(true);
    }
  }, [searchParams]);

  const dashboard = data ?? emptyDashboard;
  const activeAudits = useMemo(() => data?.recentAudits.filter((audit) => runningStatuses.has(audit.status)) ?? [], [data]);
  const activeAudit = activeAudits[0] ?? null;
  const totalFindings = useMemo(() => Object.values(data?.severityCounts ?? {}).reduce((sum, count) => sum + count, 0), [data]);
  const criticalCount = data?.severityCounts.critical ?? 0;
  const requiresSignIn = error?.toLowerCase().includes("sign in") ?? false;

  return (
    <>
      <header className="simple-dashboard-header">
        <div>
          <p className="workspace-kicker">Workspace dashboard</p>
          <h1>Run audits, review findings, and ship fixes.</h1>
          <p>Start a QA audit, watch active work, and move verified issues into GitHub from one clean workspace.</p>
        </div>
        <div className="simple-header-actions">
          <button className="new-test-button" onClick={() => setLauncherOpen(true)} type="button">
            <LinearIcon name="add" /> New audit
          </button>
        </div>
      </header>

      {error ? (
        <section className="dashboard-error">
          <LinearIcon name="issues" />
          <div>
            <strong>{error}</strong>
            <p>{requiresSignIn ? "Sign in to load workspace audits, findings, evidence, and GitHub status." : "Refresh the dashboard or sign in again if your session expired."}</p>
          </div>
          {requiresSignIn ? <Link href="/auth">Sign in</Link> : <button onClick={load} type="button">Try again</button>}
        </section>
      ) : null}

      <div className={loading ? "simple-dashboard is-loading" : "simple-dashboard"}>
        <section className="dashboard-top-grid">
          <LiveAuditCard activeAudit={activeAudit} onNewAudit={() => setLauncherOpen(true)} />
          <GitHubDashboardCard connection={dashboard.githubConnection} loading={loading} />
        </section>

        <section className="simple-stat-grid" aria-label="Workspace metrics">
          <MetricCard tone="purple" icon="projects" label="Audits" value={String(dashboard.summary.usage.audits)} detail={limitCopy(dashboard.summary.usage.audits, dashboard.summary.limits.auditsPerMonth, "this month")} href="#recent-audits" />
          <MetricCard tone="magenta" icon="issues" label="Findings" value={String(totalFindings)} detail={`${dashboard.recentFindings.length} ready for triage`} href="#recent-findings" />
          <MetricCard tone="orange" icon="issues" label="Critical" value={String(criticalCount)} detail="Review these first" href="#recent-findings" />
        </section>

        <section className="dashboard-work-grid">
          <RecentAuditsCard audits={dashboard.recentAudits} />
          <DashboardAgentsCard activeAudit={activeAudit} findings={dashboard.recentFindings} />
          <RecentFindingsCard findings={dashboard.recentFindings} />
        </section>
      </div>

      {launcherOpen ? <NewAuditModal onClose={() => setLauncherOpen(false)} /> : null}
    </>
  );
}

function GitHubDashboardCard({ connection, loading }: { connection: DashboardData["githubConnection"]; loading: boolean }) {
  if (connection.connected) {
    return (
      <article className="github-dashboard-card connected">
        <div className="github-dashboard-card-head">
          <span><LinearIcon name="github" /></span>
          <strong>GitHub connected</strong>
        </div>
        <p>{connection.selectedRepository ? `Selected repository: ${connection.selectedRepository}` : "Choose a repository from the GitHub page before exporting issues."}</p>
        <small>{connection.readyRepositoriesCount} ready / {connection.repositoriesCount} authorized</small>
        <Link className="panel-link" href="/github">Manage GitHub</Link>
      </article>
    );
  }

  return (
    <article className={loading ? "github-dashboard-card loading" : "github-dashboard-card"}>
      <div className="github-dashboard-card-head">
        <span><LinearIcon name="github" /></span>
        <strong>{loading ? "Checking GitHub" : "GitHub not connected"}</strong>
      </div>
      <p>{loading ? "Loading connection status." : "Connect GitHub to export verified findings into your repository."}</p>
      <Link className="new-test-button" href="/github">
        <LinearIcon name="github" /> Connect GitHub
      </Link>
    </article>
  );
}

function MetricCard({ tone, icon, label, value, detail, href }: { tone: "purple" | "cyan" | "magenta" | "orange" | "lime"; icon?: LinearIconName; label: string; value: string; detail: string; href: string }) {
  return (
    <a className={`command-metric-card tone-${tone}`} href={href}>
      <span className="metric-icon">{icon ? <LinearIcon name={icon} /> : null}</span>
      <span className="metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
    </a>
  );
}

function LiveAuditCard({ activeAudit, onNewAudit }: { activeAudit: DashboardData["recentAudits"][number] | null; onNewAudit: () => void }) {
  if (!activeAudit) {
    return (
      <article className="live-audit-card empty-live-card">
        <div>
          <p className="eyebrow">Next audit</p>
          <h2>No audit is running.</h2>
          <p>Start with a URL. AISwarmQA will plan the run, execute safe checks in the worker, collect evidence, and prepare findings for review.</p>
        </div>
        <button className="new-test-button large" onClick={onNewAudit} type="button">
          <LinearIcon name="add" /> Start audit
        </button>
      </article>
    );
  }

  const progress = activeAudit.status === "generating_report" ? 88 : activeAudit.status === "analyzing" ? 72 : activeAudit.status === "running" ? 64 : 32;
  return (
    <article className="live-audit-card">
      <div className="live-audit-head">
        <div>
          <p className="eyebrow">Live audit <span>{activeAudit.status}</span></p>
          <h2>{hostFromUrl(activeAudit.targetUrl)}</h2>
          <p>{activeAudit.status} / started {relativeTime(activeAudit.createdAt)}</p>
        </div>
        <Link href={`/audits/${activeAudit.id}`}>
          Open audit
        </Link>
      </div>
      <div className="simple-progress-row">
        <span><b style={{ width: `${progress}%` }} /></span>
        <strong>{progress}%</strong>
      </div>
      <dl className="simple-audit-facts">
        <div><dt>Findings</dt><dd>{activeAudit.findingsCount}</dd></div>
        <div><dt>Priority</dt><dd>{activeAudit.criticalHighCount}</dd></div>
        <div><dt>GitHub</dt><dd>{activeAudit.githubExportStatus}</dd></div>
      </dl>
    </article>
  );
}

function RecentFindingsCard({ findings }: { findings: DashboardData["recentFindings"] }) {
  return (
    <article className="command-panel" id="recent-findings">
      <div className="panel-head">
        <div><p className="eyebrow">Recent findings</p><h2>Fix queue</h2></div>
        <Link href="/findings">View all</Link>
      </div>
        <div className="compact-list">
          {findings.length > 0 ? findings.map((finding) => (
            <Link className="finding-mini-row" href={`/audits/${finding.auditId}`} key={finding.id}>
            <span className={`signal-dot signal-${severitySignal(finding.severity)}`} aria-label={`${finding.severity} severity`} title={`${finding.severity} severity`} />
            <span className="finding-row-main">
              <strong>{finding.title}</strong>
              <span>{shortPath(finding.affectedUrl)}</span>
            </span>
            <em>{shortPath(finding.affectedUrl)}</em>
          </Link>
        )) : <EmptyMini icon="issues" title="No findings yet" copy="Run an audit and findings will appear here with severity, affected page, and evidence state." />}
      </div>
    </article>
  );
}

function DashboardAgentsCard({ activeAudit, findings }: { activeAudit: DashboardData["recentAudits"][number] | null; findings: DashboardData["recentFindings"] }) {
    const agents = findings.slice(0, 5).map((finding, index) => ({
    auditId: finding.auditId,
    id: index + 1,
    active: Boolean(activeAudit) && finding.githubExportStatus !== "completed",
    task: finding.category,
    target: shortPath(finding.affectedUrl || finding.auditTargetUrl)
  }));

  return (
    <article className="command-panel dashboard-agents-card">
      <div className="panel-head">
        <div><p className="eyebrow">Agents</p><h2>Swarm activity</h2></div>
        <Link href="/agents">View all</Link>
      </div>
      <div className="agent-compact-list">
        {agents.length > 0 ? agents.map((agent) => (
          <Link className="agent-compact-row" href={`/audits/${agent.auditId}`} key={agent.id}>
            <LinearIcon name="teams" />
            <span>
              <strong>Agent #{agent.id}</strong>
              <em>{agent.task} / {agent.target}</em>
            </span>
            <small className={`agent-state-dot ${agent.active ? "active" : "inactive"}`} aria-label={agent.active ? "Active" : "Inactive"} title={agent.active ? "Active" : "Inactive"} />
          </Link>
        )) : <EmptyMini icon="teams" title="No agent activity yet" copy="Start an audit to see active checks, reviewed pages, and produced findings." />}
      </div>
    </article>
  );
}

function RecentAuditsCard({ audits }: { audits: DashboardData["recentAudits"] }) {
  return (
    <article className="command-panel recent-audits-card" id="recent-audits">
      <div className="panel-head">
        <div><p className="eyebrow">Recent audits</p><h2>Audit history</h2></div>
      </div>
      <div className="audit-table">
        {audits.length > 0 ? audits.slice(0, 6).map((audit) => (
          <Link className="audit-table-row" href={`/audits/${audit.id}`} key={audit.id}>
            <strong>{hostFromUrl(audit.targetUrl)}</strong>
            <span>{audit.status}</span>
            <span>{audit.findingsCount} findings</span>
            <span>{relativeTime(audit.createdAt)}</span>
            <em>{runningStatuses.has(audit.status) ? "Live" : audit.status === "failed" ? "Review" : "View"}</em>
          </Link>
        )) : <EmptyMini icon="projects" title="No audits yet" copy="Start your first QA test from the dashboard." />}
      </div>
    </article>
  );
}

function NewAuditModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [loginUrl, setLoginUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<ScopeMode>("full");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedScope = scopeOptions.find((item) => item.id === scope) ?? scopeOptions[1]!;
  const currentHelp = modalStepHelp[step] ?? modalStepHelp[0]!;
  const canContinue = useMemo(() => {
    if (step === 0) return url.trim().length > 0;
    if (step === 1 && accessMode === "temporary-account") return loginUrl.trim().length > 0 && testEmail.trim().length > 0;
    if (step === 2 && scope === "custom") return customInstructions.trim().length > 0;
    return true;
  }, [accessMode, customInstructions, loginUrl, scope, step, testEmail, url]);

  async function startAudit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          auditMode: selectedScope.auditMode,
          metadata: {
            accessMode: accessMode === "instructions" ? "guided-instructions" : accessMode,
            auditScope: scope,
            loginUrl: loginUrl || undefined,
            testAccount: testEmail || undefined,
            customInstructions: [
              selectedScope.title,
              accessMode === "temporary-account" ? "Temporary test access was noted. Passwords are not collected or stored by AISwarmQA." : null,
              notes ? `Client notes: ${notes}` : null,
              customInstructions || null
            ].filter(Boolean).join("\n"),
            safetyRules: ["Do not submit real payments", "Do not delete data", "Stop before destructive actions", "Capture evidence for every finding"]
          }
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Audit could not be started.");
        return;
      }
      window.location.assign(`/audits/${body.id}`);
    } catch {
      setError("Audit could not be started because the server could not be reached.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="New QA test" aria-modal="true" className="new-audit-modal" role="dialog">
        <header>
          <div>
            <span>New test</span>
            <h2>{["Website", "Access", "Mission", "Launch"][step]}</h2>
          </div>
          <button aria-label="Close" onClick={onClose} type="button">Close</button>
        </header>

        <div className="modal-steps" aria-label="Setup progress">
          {["URL", "Login", "Scope", "Start"].map((label, index) => (
            <span className={index === step ? "active" : index < step ? "done" : ""} key={label}>
              <b>{index + 1}</b>
              {label}
            </span>
          ))}
        </div>

        <div className="modal-help-card">
          <LinearIcon name={step === 1 ? "inbox" : step === 2 ? "issues" : step === 3 ? "projects" : "views"} />
          <div>
            <strong>{currentHelp.title}</strong>
            <p>{currentHelp.copy}</p>
          </div>
        </div>

        {step === 0 ? (
          <div className="modal-step">
            <label className="big-input">
              <LinearIcon name="search" />
              <input autoFocus onChange={(event) => setUrl(event.target.value)} placeholder="https://your-product.com" type="url" value={url} />
            </label>
            <p className="modal-field-help">The URL must be a site your workspace is authorized to test. Avoid private networks and personal accounts.</p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="modal-step">
            <div className="modal-choice-grid">
              <button className={accessMode === "public" ? "selected" : ""} onClick={() => setAccessMode("public")} type="button">
                <LinearIcon name="views" />
                <strong>No login</strong>
                <span>Public pages only.</span>
              </button>
              <button className={accessMode === "temporary-account" ? "selected" : ""} onClick={() => setAccessMode("temporary-account")} type="button">
                <LinearIcon name="inbox" />
                <strong>Temporary access</strong>
                <span>Use disposable test credentials.</span>
              </button>
              <button className={accessMode === "instructions" ? "selected" : ""} onClick={() => setAccessMode("instructions")} type="button">
                <LinearIcon name="issues" />
                <strong>Instructions</strong>
                <span>Tell agents where to go.</span>
              </button>
            </div>
            {accessMode === "temporary-account" ? (
              <div className="temporary-access-box">
                <p>Temporary test account only. No admin, personal, or customer credentials.</p>
                <p>AISwarmQA does not collect or store passwords in this flow. Add safe access notes now; authenticated browser execution will require a secure credential handoff before it can use a test account.</p>
                <input onChange={(event) => setLoginUrl(event.target.value)} placeholder="Login URL" type="url" value={loginUrl} />
                <input onChange={(event) => setTestEmail(event.target.value)} placeholder="Test account email or username" value={testEmail} />
              </div>
            ) : null}
            <textarea onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes: pages to check, pages to avoid, test data rules..." value={notes} />
            <p className="modal-field-help">For guided access, describe only safe steps and test data. Do not include admin secrets or real customer information.</p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="modal-step">
            <div className="scope-list">
              {scopeOptions.map((item) => (
                <button className={scope === item.id ? "selected" : ""} onClick={() => setScope(item.id)} type="button" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.copy}</span>
                </button>
              ))}
            </div>
            {scope === "custom" ? (
              <textarea onChange={(event) => setCustomInstructions(event.target.value)} placeholder="Describe exactly what agents should verify." value={customInstructions} />
            ) : null}
            <p className="modal-field-help">The selected scope becomes the worker briefing. Keep it specific so findings come back clear and actionable.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="modal-step launch-review">
            <LinearIcon name="issues" />
            <h3>Ready to start</h3>
            <dl>
              <div><dt>Target</dt><dd>{url}</dd></div>
              <div><dt>Access</dt><dd>{accessMode}</dd></div>
              <div><dt>Mission</dt><dd>{selectedScope.title}</dd></div>
              <div><dt>Safety</dt><dd>No payments, no deletes, evidence required.</dd></div>
            </dl>
            <p className="modal-field-help">GitHub export happens later from reviewed findings. Connecting GitHub does not give AISwarmQA file access; the export flow is for repository metadata and creating new issues.</p>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        ) : null}

        <footer>
          <button className="modal-back" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">
            Back
          </button>
          {step < 3 ? (
            <button className="new-test-button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)} type="button">
              Continue
            </button>
          ) : (
            <button className="new-test-button" disabled={!canContinue || isSubmitting} onClick={() => void startAudit()} type="button">
              {isSubmitting ? "Starting..." : "Start test"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading dashboard">
      {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
    </div>
  );
}

function EmptyMini({ icon, title, copy }: { icon: LinearIconName; title: string; copy: string }) {
  return (
    <div className="empty-mini">
      <LinearIcon name={icon} />
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function limitCopy(value: number, limit: number | null | undefined, suffix: string) {
  return limit ? `${value}/${limit} ${suffix}` : `${value} / custom limit`;
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

function shortPath(value: string) {
  try {
    const url = new URL(value);
    return url.pathname === "/" ? url.host : url.pathname;
  } catch {
    return value;
  }
}

function severitySignal(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "danger";
  if (normalized === "medium") return "warning";
  return "weak";
}

function relativeTime(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
