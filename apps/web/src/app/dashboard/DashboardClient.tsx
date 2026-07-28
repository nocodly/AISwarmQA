"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Globe2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandIcon, GitHubLogo } from "@/components/BrandIcons";

type DashboardData = {
  summary: {
    plan: { name: string; evidenceRetentionDays: number };
    subscription: { status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };
    usage: { audits: number; pages: number; concurrentAudits: number; teamMembers: number };
    limits: { auditsPerMonth: number | null; maxPagesPerAudit: number | null; concurrentAudits: number | null; teamMemberLimit: number | null };
  };
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
  githubIssuesExported: number;
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

const emptyDashboard: DashboardData = {
  summary: {
    plan: { name: "Free", evidenceRetentionDays: 7 },
    subscription: { status: "inactive", currentPeriodEnd: null, cancelAtPeriodEnd: false },
    usage: { audits: 0, pages: 0, concurrentAudits: 0, teamMembers: 1 },
    limits: { auditsPerMonth: 2, maxPagesPerAudit: 25, concurrentAudits: 1, teamMemberLimit: 1 }
  },
  recentAudits: [],
  githubIssuesExported: 0
};

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [launcherOpen, setLauncherOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.code === "INTERNAL_ERROR" ? "Dashboard data could not be loaded." : body.error?.message ?? "Dashboard could not be loaded.");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const activeAudits = useMemo(() => data?.recentAudits.filter((audit) => runningStatuses.has(audit.status)) ?? [], [data]);
  const completedAudits = useMemo(() => data?.recentAudits.filter((audit) => audit.status === "completed") ?? [], [data]);
  const criticalHigh = useMemo(() => data?.recentAudits.reduce((sum, audit) => sum + audit.criticalHighCount, 0) ?? 0, [data]);
  const dashboard = data ?? (!loading ? emptyDashboard : null);
  const filteredAudits = useMemo(() => {
    const audits = dashboard?.recentAudits ?? [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return audits;
    return audits.filter((audit) => audit.targetUrl.toLowerCase().includes(normalized) || audit.status.toLowerCase().includes(normalized));
  }, [dashboard, query]);

  return (
    <>
      <header className="railway-topbar">
        <div>
          <p className="workspace-kicker">nocodly&apos;s workspace</p>
          <h1>QA Projects</h1>
        </div>
        <div className="dashboard-actions">
          <label className="dashboard-search">
            <Search aria-hidden="true" size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Search audits..." value={query} />
          </label>
          <button className="refresh-button" onClick={load} type="button">
            <RefreshCw aria-hidden="true" size={16} /> Refresh
          </button>
          <button className="new-test-button" onClick={() => setLauncherOpen(true)} type="button">
            <Plus aria-hidden="true" size={18} /> New test
          </button>
        </div>
      </header>

      {loading ? <section className="railway-empty">Loading your QA workspace.</section> : null}

      {error ? (
        <section className="dashboard-error">
          <AlertCircle aria-hidden="true" size={18} />
          <div>
            <strong>{error}</strong>
            <p>Refresh the dashboard or sign in again if your session expired.</p>
          </div>
          <button onClick={load} type="button">Try again</button>
          {error.toLowerCase().includes("sign in") ? <Link href={"/auth" as Route}>Sign in</Link> : null}
        </section>
      ) : null}

      {dashboard ? (
        <div className="railway-dashboard">
          <section className="project-overview">
            <DashboardProjectCard
              title="Current usage"
              icon={<BrandIcon name="browser" tone="lime" />}
              value={`${dashboard.summary.usage.audits}/${dashboard.summary.limits.auditsPerMonth ?? "Custom"}`}
              detail={`${dashboard.summary.usage.pages} pages inspected this period`}
              footer={`${dashboard.summary.plan.name} plan`}
              tone="lime"
            />
            <DashboardProjectCard
              title="Live agents"
              icon={<BrandIcon name="agent" tone="cyan" />}
              value={String(activeAudits.length)}
              detail={`${dashboard.summary.usage.concurrentAudits}/${dashboard.summary.limits.concurrentAudits ?? "Custom"} concurrent audits used`}
              footer={activeAudits.length ? "agents running now" : "ready to launch"}
              tone="cyan"
            />
            <DashboardProjectCard
              title="Findings"
              icon={<BrandIcon name="bug" tone="magenta" />}
              value={String(criticalHigh)}
              detail="critical or high priority findings in recent audits"
              footer={`${completedAudits.length} completed audits`}
              tone="magenta"
            />
            <DashboardProjectCard
              title="GitHub export"
              icon={<GitHubLogo />}
              value={String(dashboard.githubIssuesExported)}
              detail="issues created from verified findings"
              footer="evidence and repro included"
              tone="purple"
            />
          </section>

          <section className="launch-strip">
            <div>
              <span>Start here</span>
              <h2>Run a QA test without leaving the dashboard.</h2>
              <p>Enter a URL, add safe temporary access if needed, choose what agents should inspect, and watch the report appear here.</p>
            </div>
            <button className="new-test-button large" onClick={() => setLauncherOpen(true)} type="button">
              <FileSearch aria-hidden="true" size={20} /> New test
            </button>
          </section>

          <section className="dashboard-two-col" id="audits">
            <article className="workspace-panel">
              <div className="section-heading">
                <div>
                  <span>Projects</span>
                  <h2>{filteredAudits.length} audits</h2>
                </div>
                <button onClick={() => setLauncherOpen(true)} type="button">
                  <Plus aria-hidden="true" size={16} /> New
                </button>
              </div>

              {filteredAudits.length === 0 ? (
                <div className="railway-empty">
                  <BrandIcon name="browser" tone="cyan" />
                  <h3>No audits match this view.</h3>
                  <p>Start a new test or clear the search field.</p>
                </div>
              ) : (
                <div className="audit-project-grid">
                  {filteredAudits.map((audit) => (
                    <Link className="audit-project-card" href={`/audits/${audit.id}`} key={audit.id}>
                      <div className="audit-card-map">
                        <span className={`audit-node status-${audit.status}`}><BrandIcon name="browser" tone="cyan" /></span>
                        <span className="audit-node"><BrandIcon name="interaction" tone="purple" /></span>
                        <span className="audit-node"><BrandIcon name="bug" tone="magenta" /></span>
                        {audit.githubExportStatus !== "none" ? <span className="audit-node"><GitHubLogo /></span> : null}
                      </div>
                      <div className="audit-card-footer">
                        <strong>{hostFromUrl(audit.targetUrl)}</strong>
                        <span><i /> {audit.status} · {audit.findingsCount} findings</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <aside className="workspace-panel agent-brief">
              <div className="section-heading">
                <div>
                  <span>Agent strength</span>
                  <h2>What gets checked</h2>
                </div>
                <Sparkles aria-hidden="true" size={20} />
              </div>
              <div className="agent-check-list">
                <AgentCheck icon="interaction" title="Button intent" copy="Clicks are compared with what users expect to happen." />
                <AgentCheck icon="private" title="Auth gates" copy="Signup, login, sessions, protected pages, and redirects." />
                <AgentCheck icon="evidence" title="Evidence" copy="Screenshots, affected page, repro steps, expected and actual behavior." />
                <AgentCheck icon="github" title="GitHub-ready" copy="Findings become clear issues with labels, metadata, and duplicate checks." />
              </div>
            </aside>
          </section>

          <section className="dashboard-two-col" id="findings">
            <article className="workspace-panel findings-board">
              <div className="section-heading">
                <div>
                  <span>Findings</span>
                  <h2>Simple triage</h2>
                </div>
                <ShieldCheck aria-hidden="true" size={20} />
              </div>
              {completedAudits.slice(0, 4).map((audit) => (
                <Link className="finding-row" href={`/audits/${audit.id}`} key={audit.id}>
                  <div className="severity-pill">{audit.criticalHighCount > 0 ? "High signal" : "Ready"}</div>
                  <div>
                    <strong>{hostFromUrl(audit.targetUrl)}</strong>
                    <p>{audit.findingsCount} findings found. Open the report to review evidence, repro steps, and GitHub export state.</p>
                  </div>
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              ))}
              {completedAudits.length === 0 ? (
                <div className="railway-empty compact">
                  <p>Completed audits will appear here as clean finding cards, not spreadsheet rows.</p>
                </div>
              ) : null}
            </article>

            <article className="workspace-panel" id="github">
              <div className="section-heading">
                <div>
                  <span>GitHub</span>
                  <h2>Export pipeline</h2>
                </div>
                <GitHubLogo />
              </div>
              <div className="github-mini-flow">
                <span>Finding</span>
                <ChevronRight aria-hidden="true" size={16} />
                <span>Evidence</span>
                <ChevronRight aria-hidden="true" size={16} />
                <span>Issue</span>
              </div>
              <p>Export only after confirmation. Duplicate issues are detected before a new GitHub issue is created.</p>
              <Link className="internal-link" href="/settings">
                Manage workspace setup <ExternalLink aria-hidden="true" size={15} />
              </Link>
            </article>
          </section>
        </div>
      ) : null}

      {launcherOpen ? <NewAuditModal onClose={() => setLauncherOpen(false)} /> : null}
    </>
  );
}

function DashboardProjectCard({ title, icon, value, detail, footer, tone }: { title: string; icon: React.ReactNode; value: string; detail: string; footer: string; tone: string }) {
  return (
    <article className={`dashboard-project-card tone-${tone}`}>
      <div className="project-card-title">
        {icon}
        <strong>{title}</strong>
      </div>
      <div className="project-card-visual">
        <span>{value}</span>
      </div>
      <p>{detail}</p>
      <small><i /> {footer}</small>
    </article>
  );
}

function AgentCheck({ icon, title, copy }: { icon: Parameters<typeof BrandIcon>[0]["name"]; title: string; copy: string }) {
  return (
    <div className="agent-check">
      <BrandIcon name={icon} />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
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

function hostFromUrl(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}
