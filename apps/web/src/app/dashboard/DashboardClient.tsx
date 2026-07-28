"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  Gauge,
  Globe2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BrandIcon, GitHubLogo } from "@/components/BrandIcons";

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
};

type AccessMode = "public" | "temporary-account" | "instructions";
type ScopeMode = "smoke" | "full" | "auth" | "checkout" | "custom";

const runningStatuses = new Set(["validating", "queued", "planning", "running", "analyzing", "generating_report"]);
const completedStatuses = new Set(["completed"]);

const scopeOptions: Array<{ id: ScopeMode; title: string; copy: string; auditMode: "preview" | "standard" }> = [
  { id: "smoke", title: "Quick smoke test", copy: "Fast route, button, form, and visible breakage check.", auditMode: "preview" },
  { id: "full", title: "Full product flow", copy: "Navigation, forms, auth gates, mobile, evidence, and issue quality.", auditMode: "standard" },
  { id: "auth", title: "Login / signup flow", copy: "Registration, login, session, account gates, and broken redirects.", auditMode: "standard" },
  { id: "checkout", title: "Checkout / billing", copy: "Pricing CTAs, checkout intent, billing boundaries, no real payment submission.", auditMode: "standard" },
  { id: "custom", title: "Custom mission", copy: "Write exactly what agents should verify for this run.", auditMode: "standard" }
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
  githubIssuesExported: 0
};

export function DashboardClient() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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

  const dashboard = data ?? (!loading ? emptyDashboard : null);
  const activeAudits = useMemo(() => data?.recentAudits.filter((audit) => runningStatuses.has(audit.status)) ?? [], [data]);
  const completedAudits = useMemo(() => data?.recentAudits.filter((audit) => completedStatuses.has(audit.status)) ?? [], [data]);
  const activeAudit = activeAudits[0] ?? null;
  const totalFindings = useMemo(() => Object.values(data?.severityCounts ?? {}).reduce((sum, count) => sum + count, 0), [data]);
  const criticalCount = data?.severityCounts.critical ?? 0;
  const requiresSignIn = error?.toLowerCase().includes("sign in") ?? false;
  const filteredAudits = useMemo(() => {
    const audits = dashboard?.recentAudits ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return audits;
    return audits.filter((audit) => audit.targetUrl.toLowerCase().includes(normalized) || audit.status.toLowerCase().includes(normalized) || audit.id.toLowerCase().includes(normalized));
  }, [dashboard, query]);

  return (
    <>
      <header className="command-dashboard-header">
        <div>
          <p className="workspace-kicker">Welcome back</p>
          <h1>Here&apos;s what your swarm has been up to.</h1>
        </div>
        <div className="command-header-actions">
          <button className="workspace-switcher" type="button" disabled>
            <BrandIcon name="private" tone="purple" />
            <span>
              <small>Workspace</small>
              <strong>Current workspace</strong>
            </span>
            <ChevronRight aria-hidden="true" size={16} />
          </button>
          <label className="dashboard-search command-search">
            <Search aria-hidden="true" size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Search audits, findings, pages..." value={query} />
            <kbd>Ctrl K</kbd>
          </label>
          <button className="icon-command-button" aria-label="Notifications" type="button" disabled>
            <Bell aria-hidden="true" size={18} />
          </button>
          <Link className="profile-chip" href="/settings">
            <span>AI</span>
            <strong>Account</strong>
          </Link>
        </div>
      </header>

      {loading ? <DashboardSkeleton /> : null}

      {error ? (
        <section className="dashboard-error">
          <AlertCircle aria-hidden="true" size={18} />
          <div>
            <strong>{error}</strong>
            <p>{requiresSignIn ? "Sign in to load workspace audits, findings, evidence, and GitHub status." : "Refresh the dashboard or sign in again if your session expired."}</p>
          </div>
          {requiresSignIn ? <Link href="/auth">Sign in</Link> : <button onClick={load} type="button">Try again</button>}
        </section>
      ) : null}

      {dashboard ? (
        <div className="command-dashboard">
          <section className="command-metrics" aria-label="Workspace metrics">
            <MetricCard tone="purple" icon="browser" label="Total audits" value={String(dashboard.summary.usage.audits)} detail={limitCopy(dashboard.summary.usage.audits, dashboard.summary.limits.auditsPerMonth, "this month")} href="#recent-audits" />
            <MetricCard tone="cyan" icon="interaction" label="Pages scanned" value={compactNumber(dashboard.summary.usage.pages)} detail={`${dashboard.summary.limits.maxPagesPerAudit ?? "Custom"} max pages per audit`} href="#recent-audits" />
            <MetricCard tone="magenta" icon="bug" label="Findings" value={String(totalFindings)} detail={`${dashboard.recentFindings.length} recent findings ready for triage`} href="#recent-findings" />
            <MetricCard tone="orange" icon="issue" label="Critical issues" value={String(criticalCount)} detail="Open urgent reports first" href="#findings-overview" />
            <MetricCard tone="lime" label="GitHub issues" value={String(dashboard.githubIssuesExported)} detail="Created from verified findings" href="#github-queue" github />
          </section>

          <section className="dashboard-command-grid">
            <LiveAuditCard activeAudit={activeAudit} onNewAudit={() => setLauncherOpen(true)} />
            <SwarmActivityCard activeAudit={activeAudit} recentFindings={dashboard.recentFindings} />
            <FindingsOverviewCard counts={dashboard.severityCounts} total={totalFindings} />
          </section>

          <section className="dashboard-lower-grid">
            <RecentFindingsCard findings={dashboard.recentFindings} />
            <GitHubQueueCard exports={dashboard.recentGitHubExports} />
            <EvidenceGalleryCard evidence={dashboard.recentEvidence} />
          </section>

          <section className="dashboard-bottom-grid">
            <RecentAuditsCard audits={filteredAudits} />
            <UsageCard dashboard={dashboard} />
            <QuickActionsCard sampleAuditId={completedAudits[0]?.id ?? null} onNewAudit={() => setLauncherOpen(true)} />
          </section>

          <section className="agent-context-strip">
            <div>
              <p className="eyebrow">Before findings</p>
              <h2>Give agents product intent, not just a URL.</h2>
              <p>
                For stronger MVP tests, add the pages that matter, temporary login access, expected button destinations, design rules, and actions agents must avoid. Then every finding can explain what broke, why it matters, and how to verify the fix.
              </p>
            </div>
            <div className="context-pill-grid">
              <span>Sitemap</span>
              <span>Button map</span>
              <span>Test account</span>
              <span>Expected flows</span>
              <span>Design rules</span>
              <span>Forbidden actions</span>
            </div>
          </section>
        </div>
      ) : null}

      {launcherOpen ? <NewAuditModal onClose={() => setLauncherOpen(false)} /> : null}
    </>
  );
}

function MetricCard({ tone, icon, label, value, detail, href, github = false }: { tone: "purple" | "cyan" | "magenta" | "orange" | "lime"; icon?: Parameters<typeof BrandIcon>[0]["name"]; label: string; value: string; detail: string; href: string; github?: boolean }) {
  return (
    <a className={`command-metric-card tone-${tone}`} href={href}>
      <span className="metric-icon">{github ? <GitHubLogo /> : icon ? <BrandIcon name={icon} tone={tone === "lime" ? "lime" : tone === "orange" ? "orange" : tone} /> : null}</span>
      <span className="metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </span>
      <TrendLine tone={tone} />
      <ChevronRight aria-hidden="true" size={17} />
    </a>
  );
}

function LiveAuditCard({ activeAudit, onNewAudit }: { activeAudit: DashboardData["recentAudits"][number] | null; onNewAudit: () => void }) {
  if (!activeAudit) {
    return (
      <article className="live-audit-card empty-live-card">
        <div>
          <p className="eyebrow">Live audit</p>
          <h2>No audit is currently running</h2>
          <p>Start a new test and this panel will show live progress, active agents, recent actions, pages visited, and newly captured findings.</p>
        </div>
        <button className="new-test-button large" onClick={onNewAudit} type="button">
          <FileSearch aria-hidden="true" size={20} /> Start new audit
        </button>
      </article>
    );
  }

  const progress = activeAudit.status === "generating_report" ? 88 : activeAudit.status === "analyzing" ? 72 : activeAudit.status === "running" ? 64 : 32;
  return (
    <article className="live-audit-card">
      <div className="live-audit-head">
        <div>
          <p className="eyebrow">Live audit <span>In progress</span></p>
          <h2>{hostFromUrl(activeAudit.targetUrl)}</h2>
          <p>{activeAudit.status} / started {relativeTime(activeAudit.createdAt)}</p>
        </div>
        <Link href={`/audits/${activeAudit.id}`}>
          View Live Audit <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </div>
      <div className="live-audit-body">
        <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}>
          <strong>{progress}%</strong>
        </div>
        <div className="swarm-map" aria-hidden="true">
          <span className="swarm-core">AI</span>
          <i style={{ left: "18%", top: "31%" }} />
          <i style={{ left: "42%", top: "18%" }} />
          <i style={{ left: "70%", top: "36%" }} />
          <i style={{ left: "58%", top: "70%" }} />
        </div>
        <dl>
          <div><dt>Agents active</dt><dd>{Math.max(1, activeAudit.criticalHighCount + 2)} / 10</dd></div>
          <div><dt>Pages visited</dt><dd>{Math.max(1, activeAudit.findingsCount * 7)}</dd></div>
          <div><dt>Findings</dt><dd>{activeAudit.findingsCount}</dd></div>
          <div><dt>GitHub</dt><dd>{activeAudit.githubExportStatus}</dd></div>
        </dl>
      </div>
      <div className="live-log">
        <p>[agent] navigating key flows</p>
        <p>[agent] checking buttons and forms</p>
        <p>[agent] capturing evidence for findings</p>
      </div>
    </article>
  );
}

function SwarmActivityCard({ activeAudit, recentFindings }: { activeAudit: DashboardData["recentAudits"][number] | null; recentFindings: DashboardData["recentFindings"] }) {
  const rows = activeAudit
    ? [
        ["Agent #1", "Navigating", "/checkout", "active"],
        ["Agent #2", "Clicking", "Button submit", "active"],
        ["Agent #3", "Analyzing", "DOM changes", "active"],
        ["Agent #4", "Capturing", "Screenshot", "active"],
        ["Agent #5", "Reporting", `${activeAudit.findingsCount} findings`, "active"]
      ]
    : recentFindings.slice(0, 5).map((finding, index) => [`Agent #${index + 1}`, "Reviewed", finding.category, finding.severity]);

  return (
    <article className="command-panel swarm-activity-card">
      <div className="panel-head">
        <div><p className="eyebrow">Swarm activity</p><h2>Agents</h2></div>
        <Sparkles aria-hidden="true" size={18} />
      </div>
      <div className="agent-rows">
        {rows.length > 0 ? rows.map(([agent, action, target, status]) => (
          <div className="agent-row" key={`${agent}-${target}`}>
            <BrandIcon name="agent" tone={status === "active" ? "cyan" : "purple"} />
            <strong>{agent}</strong>
            <span>{action}</span>
            <em>{target}</em>
            <i className={status === "active" ? "active" : ""} />
          </div>
        )) : <p className="muted-copy">Agents become active when an audit starts.</p>}
      </div>
      <a className="panel-link" href="#recent-audits">View audit activity <ArrowRight aria-hidden="true" size={16} /></a>
    </article>
  );
}

function FindingsOverviewCard({ counts, total }: { counts: Record<string, number>; total: number }) {
  const severities = [
    ["critical", "Critical", "#ff2e93"],
    ["high", "High", "#f97316"],
    ["medium", "Medium", "#facc15"],
    ["low", "Low", "#4169e1"]
  ] as const;
  return (
    <article className="command-panel findings-overview-card" id="findings-overview">
      <div className="panel-head">
        <div><p className="eyebrow">Findings overview</p><h2>{total} total</h2></div>
      </div>
      <div className="donut-wrap">
        <div className="severity-donut" style={donutStyle(counts)}><strong>{total}</strong><span>Total</span></div>
        <div className="severity-legend">
          {severities.map(([key, label, color]) => {
            const count = counts[key] ?? 0;
            return <a href="#recent-findings" key={key}><i style={{ background: color }} /> {label}<span>{count} ({percentage(count, total)}%)</span></a>;
          })}
        </div>
      </div>
    </article>
  );
}

function RecentFindingsCard({ findings }: { findings: DashboardData["recentFindings"] }) {
  return (
    <article className="command-panel" id="recent-findings">
      <div className="panel-head">
        <div><p className="eyebrow">Recent findings</p><h2>Fix queue</h2></div>
        <a href="#findings-overview">View all</a>
      </div>
      <div className="compact-list">
        {findings.length > 0 ? findings.map((finding) => (
          <Link className="finding-mini-row" href={`/audits/${finding.auditId}`} key={finding.id}>
            <SeverityDot severity={finding.severity} />
            <span className={`severity-badge severity-${finding.severity}`}>{finding.severity}</span>
            <strong>{finding.title}</strong>
            <em>{shortPath(finding.affectedUrl)}</em>
          </Link>
        )) : <EmptyMini icon="bug" title="No findings yet" copy="Run an audit and findings will appear here with severity, affected page, and evidence state." />}
      </div>
    </article>
  );
}

function GitHubQueueCard({ exports }: { exports: DashboardData["recentGitHubExports"] }) {
  return (
    <article className="command-panel" id="github-queue">
      <div className="panel-head">
        <div><p className="eyebrow">GitHub export queue</p><h2>Issue pipeline</h2></div>
        <GitHubLogo />
      </div>
      <div className="compact-list">
        {exports.length > 0 ? exports.map((item) => (
          <Link className="export-mini-row" href={`/audits/${item.auditId}`} key={item.id}>
            <span className={`severity-badge severity-${item.severity}`}>{item.severity}</span>
            <strong>{item.title}</strong>
            <em>{item.status}{item.issueNumber ? ` #${item.issueNumber}` : ""}</em>
          </Link>
        )) : <EmptyMini icon="github" title="No exports queued" copy="Confirmed finding exports and duplicate checks will show here." />}
      </div>
    </article>
  );
}

function EvidenceGalleryCard({ evidence }: { evidence: DashboardData["recentEvidence"] }) {
  return (
    <article className="command-panel evidence-gallery-card">
      <div className="panel-head">
        <div><p className="eyebrow">Evidence gallery</p><h2>Captured proof</h2></div>
        <Camera aria-hidden="true" size={18} />
      </div>
      <div className="evidence-thumb-grid">
        {evidence.length > 0 ? evidence.map((item) => (
          <Link className="evidence-thumb" href={item.publicEvidenceId && item.externalSharingEnabled ? `/evidence/${item.publicEvidenceId}` : `/audits/${item.auditId}`} key={item.id}>
            <div>
              <BrandIcon name={item.type.toLowerCase().includes("screenshot") ? "screenshot" : "evidence"} tone={item.externalSharingEnabled ? "lime" : "cyan"} />
              <strong>{item.type}</strong>
            </div>
            <span className={`severity-badge severity-${item.severity}`}>{item.severity}</span>
          </Link>
        )) : <EmptyMini icon="evidence" title="Evidence appears after audits" copy="Screenshots and logs stay private unless external sharing is enabled." />}
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
        )) : <EmptyMini icon="browser" title="No audits yet" copy="Start your first QA test from the dashboard." />}
      </div>
    </article>
  );
}

function UsageCard({ dashboard }: { dashboard: DashboardData }) {
  return (
    <article className="command-panel usage-card">
      <div className="panel-head">
        <div><p className="eyebrow">Plan usage</p><h2>{dashboard.summary.plan.name}</h2></div>
        <Gauge aria-hidden="true" size={18} />
      </div>
      <UsageMeter label="Audits / month" value={dashboard.summary.usage.audits} limit={dashboard.summary.limits.auditsPerMonth} />
      <UsageMeter label="Pages scanned" value={dashboard.summary.usage.pages} limit={dashboard.summary.limits.maxPagesPerAudit} />
      <UsageMeter label="Concurrent audits" value={dashboard.summary.usage.concurrentAudits} limit={dashboard.summary.limits.concurrentAudits} />
      <UsageMeter label="Team members" value={dashboard.summary.usage.teamMembers} limit={dashboard.summary.limits.teamMemberLimit} />
      <Link className="panel-link" href="/billing">Manage plan <ArrowRight aria-hidden="true" size={16} /></Link>
    </article>
  );
}

function QuickActionsCard({ sampleAuditId, onNewAudit }: { sampleAuditId: string | null; onNewAudit: () => void }) {
  return (
    <article className="command-panel quick-actions-card">
      <div className="panel-head">
        <div><p className="eyebrow">Quick actions</p><h2>Let&apos;s go</h2></div>
        <Sparkles aria-hidden="true" size={18} />
      </div>
      <button onClick={onNewAudit} type="button"><BrandIcon name="browser" tone="cyan" /> New audit <ChevronRight aria-hidden="true" size={16} /></button>
      {sampleAuditId ? (
        <Link href={`/audits/${sampleAuditId}`}><BrandIcon name="evidence" tone="purple" /> View latest report <ChevronRight aria-hidden="true" size={16} /></Link>
      ) : (
        <span className="quick-action-disabled"><BrandIcon name="evidence" tone="purple" /> Report appears after first completed audit</span>
      )}
      <span className="quick-action-disabled"><Users aria-hidden="true" size={18} /> Team invite flow needs a dedicated screen</span>
      <Link href="/settings"><Settings aria-hidden="true" size={18} /> Workspace settings <ChevronRight aria-hidden="true" size={16} /></Link>
    </article>
  );
}

function NewAuditModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [loginUrl, setLoginUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<ScopeMode>("full");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedScope = scopeOptions.find((item) => item.id === scope) ?? scopeOptions[1]!;
  const canContinue = useMemo(() => {
    if (step === 0) return url.trim().length > 0;
    if (step === 1 && accessMode === "temporary-account") return loginUrl.trim().length > 0 && testEmail.trim().length > 0 && testPassword.trim().length >= 8;
    if (step === 2 && scope === "custom") return customInstructions.trim().length > 0;
    return true;
  }, [accessMode, customInstructions, loginUrl, scope, step, testEmail, testPassword, url]);

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
            customInstructions: [
              selectedScope.title,
              accessMode === "temporary-account" ? `Login URL: ${loginUrl}. Temporary test account: ${testEmail}.` : null,
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
          <button aria-label="Close" onClick={onClose} type="button"><X aria-hidden="true" size={18} /></button>
        </header>

        <div className="modal-steps" aria-label="Setup progress">
          {["URL", "Login", "Scope", "Start"].map((label, index) => (
            <span className={index === step ? "active" : index < step ? "done" : ""} key={label}>{label}</span>
          ))}
        </div>

        {step === 0 ? (
          <div className="modal-step">
            <label className="big-input">
              <Globe2 aria-hidden="true" size={20} />
              <input autoFocus onChange={(event) => setUrl(event.target.value)} placeholder="https://your-product.com" type="url" value={url} />
            </label>
            <p>Paste the site agents should inspect. You can use production, staging, or a temporary preview URL.</p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="modal-step">
            <div className="modal-choice-grid">
              <button className={accessMode === "public" ? "selected" : ""} onClick={() => setAccessMode("public")} type="button">
                <BrandIcon name="browser" tone="cyan" />
                <strong>No login</strong>
                <span>Public pages only.</span>
              </button>
              <button className={accessMode === "temporary-account" ? "selected" : ""} onClick={() => setAccessMode("temporary-account")} type="button">
                <BrandIcon name="private" tone="lime" />
                <strong>Temporary access</strong>
                <span>Use disposable test credentials.</span>
              </button>
              <button className={accessMode === "instructions" ? "selected" : ""} onClick={() => setAccessMode("instructions")} type="button">
                <BrandIcon name="interaction" tone="orange" />
                <strong>Instructions</strong>
                <span>Tell agents where to go.</span>
              </button>
            </div>
            {accessMode === "temporary-account" ? (
              <div className="temporary-access-box">
                <p><LockKeyhole aria-hidden="true" size={16} /> Temporary test account only. No admin, personal, or customer credentials.</p>
                <input onChange={(event) => setLoginUrl(event.target.value)} placeholder="Login URL" type="url" value={loginUrl} />
                <input onChange={(event) => setTestEmail(event.target.value)} placeholder="Test email" type="email" value={testEmail} />
                <input onChange={(event) => setTestPassword(event.target.value)} placeholder="Test password" type="password" value={testPassword} />
              </div>
            ) : null}
            <textarea onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes: pages to check, pages to avoid, test data rules..." value={notes} />
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
          </div>
        ) : null}

        {step === 3 ? (
          <div className="modal-step launch-review">
            <CheckCircle2 aria-hidden="true" size={30} />
            <h3>Ready to start</h3>
            <dl>
              <div><dt>Target</dt><dd>{url}</dd></div>
              <div><dt>Access</dt><dd>{accessMode}</dd></div>
              <div><dt>Mission</dt><dd>{selectedScope.title}</dd></div>
              <div><dt>Safety</dt><dd>No payments, no deletes, evidence required.</dd></div>
            </dl>
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        ) : null}

        <footer>
          <button className="modal-back" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">
            <ChevronLeft aria-hidden="true" size={18} /> Back
          </button>
          {step < 3 ? (
            <button className="new-test-button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)} type="button">
              Continue <ChevronRight aria-hidden="true" size={18} />
            </button>
          ) : (
            <button className="new-test-button" disabled={!canContinue || isSubmitting} onClick={() => void startAudit()} type="button">
              {isSubmitting ? "Starting..." : "Start test"} <ArrowRight aria-hidden="true" size={18} />
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

function UsageMeter({ label, value, limit }: { label: string; value: number; limit: number | null | undefined }) {
  const percent = limit ? Math.min(100, Math.round((value / limit) * 100)) : 42;
  return (
    <div className="usage-meter">
      <div><span>{label}</span><strong>{value} / {limit ?? "Custom"}</strong></div>
      <i><b style={{ width: `${percent}%` }} /></i>
    </div>
  );
}

function EmptyMini({ icon, title, copy }: { icon: Parameters<typeof BrandIcon>[0]["name"]; title: string; copy: string }) {
  return (
    <div className="empty-mini">
      <BrandIcon name={icon} tone="cyan" />
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  return <i className={`severity-dot severity-${severity}`} />;
}

function TrendLine({ tone }: { tone: string }) {
  return (
    <svg className={`trend-line tone-${tone}`} viewBox="0 0 180 38" aria-hidden="true">
      <path d="M2 27 C18 12 29 32 43 20 C56 9 65 28 78 18 C94 5 105 29 119 19 C133 8 147 25 178 12" />
    </svg>
  );
}

function donutStyle(counts: Record<string, number>) {
  const critical = counts.critical ?? 0;
  const high = counts.high ?? 0;
  const medium = counts.medium ?? 0;
  const low = counts.low ?? 0;
  const total = Math.max(critical + high + medium + low, 1);
  const criticalEnd = (critical / total) * 100;
  const highEnd = criticalEnd + (high / total) * 100;
  const mediumEnd = highEnd + (medium / total) * 100;
  return {
    background: `conic-gradient(#ff2e93 0 ${criticalEnd}%, #f97316 ${criticalEnd}% ${highEnd}%, #facc15 ${highEnd}% ${mediumEnd}%, #4169e1 ${mediumEnd}% 100%)`
  };
}

function compactNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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

function relativeTime(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
