"use client";

import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, ArrowRight, FileSearch, GitBranch, Gauge, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandIcon } from "@/components/BrandIcons";

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

const runningStatuses = new Set(["validating", "queued", "planning", "running", "analyzing", "generating_report"]);

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.message ?? "Dashboard could not be loaded.");
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
  const latestCompleted = useMemo(() => data?.recentAudits.find((audit) => audit.status === "completed") ?? null, [data]);
  const criticalHigh = useMemo(() => data?.recentAudits.reduce((sum, audit) => sum + audit.criticalHighCount, 0) ?? 0, [data]);
  const usageLabel = data ? `${data.summary.usage.audits}/${data.summary.limits.auditsPerMonth ?? "Custom"}` : "-";
  const nextAction = useMemo(() => {
    if (!data) return null;
    if (data.recentAudits.length === 0) {
      return {
        title: "Start your first audit",
        copy: "Enter a URL, choose access mode, set safety rules, and let agents inspect the product.",
        href: "/projects/new",
        cta: "Start new audit"
      };
    }
    if (activeAudits[0]) {
      return {
        title: "Watch the running audit",
        copy: "Agents are still planning, browsing, or generating the report. Follow progress live.",
        href: `/audits/${activeAudits[0].id}`,
        cta: "Open live audit"
      };
    }
    if (latestCompleted && latestCompleted.findingsCount > 0 && latestCompleted.githubExportStatus === "none") {
      return {
        title: "Export findings to GitHub",
        copy: "Turn actionable findings into ready-to-fix GitHub issues with evidence and reproduction steps.",
        href: `/audits/${latestCompleted.id}`,
        cta: "Review findings"
      };
    }
    return {
      title: "Run the next focused audit",
      copy: "Try an auth, checkout, accessibility, or mobile-focused mission to improve coverage.",
      href: "/projects/new",
      cta: "Start another audit"
    };
  }, [activeAudits, data, latestCompleted]);

  return (
    <>
      <header className="page-header dashboard-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Mission control for autonomous QA.</h1>
          <p>Start audits, watch agents test real flows, review findings, and export clean GitHub issues.</p>
        </div>
        <div className="toolbar">
          <button onClick={load} type="button">
            <RefreshCw aria-hidden="true" size={16} /> Refresh
          </button>
          <Link className="cta-button" href="/projects/new">
            <FileSearch aria-hidden="true" size={18} /> Start new audit
          </Link>
        </div>
      </header>

      {loading ? <section className="panel loading-panel">Loading dashboard command center.</section> : null}
      {error ? (
        <section className="panel auth-required-panel">
          <p className="error-text">
            <AlertCircle aria-hidden="true" size={16} /> {error}
          </p>
          <p>Refresh the dashboard, start a new audit, or sign in again if the session expired.</p>
          <div className="toolbar">
            <button onClick={load} type="button">
              <RefreshCw aria-hidden="true" size={16} /> Try loading again
            </button>
            <Link className="ghost-button" href="/projects/new">
              Start audit manually
            </Link>
          </div>
          {error.toLowerCase().includes("sign in") ? (
            <Link className="cta-button small" href={"/auth" as Route}>
              Create account or sign in
            </Link>
          ) : null}
        </section>
      ) : null}

      {data && nextAction ? (
        <>
          <section className="command-hero">
            <div>
              <span className="qa-note marker-lime">next move</span>
              <p className="eyebrow">Recommended action</p>
              <h2>{nextAction.title}</h2>
              <p>{nextAction.copy}</p>
              <Link className="cta-button" href={nextAction.href as Route}>
                {nextAction.cta} <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
            <div className="agent-stack" aria-hidden="true">
              <div><BrandIcon name="agent" tone="lime" /><span>Planner</span><strong>maps intent</strong></div>
              <div><BrandIcon name="interaction" tone="cyan" /><span>Browser agent</span><strong>clicks flows</strong></div>
              <div><BrandIcon name="github" tone="magenta" /><span>Exporter</span><strong>writes issues</strong></div>
            </div>
          </section>

          <section className="metric-grid">
            <MetricCard icon={<Gauge aria-hidden="true" size={20} />} label="Audits this period" value={usageLabel} copy={`${data.summary.usage.pages} pages inspected`} tone="lime" />
            <MetricCard icon={<Sparkles aria-hidden="true" size={20} />} label="Active audits" value={String(activeAudits.length)} copy={`${data.summary.usage.concurrentAudits}/${data.summary.limits.concurrentAudits ?? "Custom"} concurrent`} tone="cyan" />
            <MetricCard icon={<AlertCircle aria-hidden="true" size={20} />} label="Critical / high" value={String(criticalHigh)} copy="from recent audits" tone="magenta" />
            <MetricCard icon={<GitBranch aria-hidden="true" size={20} />} label="GitHub issues" value={String(data.githubIssuesExported)} copy="created from findings" tone="orange" />
            <MetricCard icon={<ShieldCheck aria-hidden="true" size={20} />} label="Evidence retention" value={`${data.summary.plan.evidenceRetentionDays}d`} copy={data.summary.plan.name} tone="purple" />
          </section>

          <section className="workflow-grid">
            <article className="panel workflow-card">
              <div className="panel-heading">
                <BrandIcon name="complete" tone="lime" />
                <div>
                  <h2>Launch checklist</h2>
                  <p>Everything a new workspace needs before findings become GitHub issues.</p>
                </div>
              </div>
              <ul className="status-list">
                <StatusRow label="Workspace created" status="ready" done />
                <StatusRow label="First audit started" status={data.summary.usage.audits > 0 ? "done" : "open"} done={data.summary.usage.audits > 0} />
                <StatusRow label="Findings reviewed" status={data.recentAudits.some((audit) => audit.findingsCount > 0) ? "ready" : "waiting"} done={data.recentAudits.some((audit) => audit.findingsCount > 0)} />
                <StatusRow label="GitHub issues exported" status={data.githubIssuesExported > 0 ? "done" : "optional"} done={data.githubIssuesExported > 0} />
              </ul>
            </article>

            <article className="panel workflow-card">
              <div className="panel-heading">
                <BrandIcon name="bug" tone="cyan" />
                <div>
                  <h2>What agents verify</h2>
                  <p>Not just screenshots. The swarm checks whether product actions match user intent.</p>
                </div>
              </div>
              <div className="capability-cloud">
                {["Button destinations", "CTA intent", "Forms", "Login gates", "Broken links", "Mobile layout", "Evidence", "GitHub issue quality"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          </section>

          <section className="panel recent-audits-panel">
            <div className="panel-heading spread">
              <div>
                <h2>Recent audits</h2>
                <p>Open a report to inspect evidence, agent replay, and GitHub export state.</p>
              </div>
              <Link className="ghost-button" href="/projects/new">Start new audit</Link>
            </div>
            {data.recentAudits.length === 0 ? (
              <div className="empty-state">
                <BrandIcon name="browser" tone="cyan" />
                <h3>No audits yet.</h3>
                <p>Start your first audit by entering a URL. AISwarmQA will inspect pages, click through flows, capture evidence, and prepare GitHub-ready findings.</p>
                <Link className="cta-button small" href="/projects/new">Start first audit</Link>
              </div>
            ) : (
              <div className="mission-list">
                {data.recentAudits.map((audit) => (
                  <Link className="mission-row audit-row" href={`/audits/${audit.id}`} key={audit.id}>
                    <div>
                      <div className={`badge status-${audit.status}`}>{audit.status}</div>
                      <h3>{audit.targetUrl}</h3>
                      <p>{audit.findingsCount} findings / {audit.criticalHighCount} critical or high</p>
                    </div>
                    <div className="mission-meta">
                      <span>{new Date(audit.createdAt).toLocaleDateString()}</span>
                      <span><GitBranch aria-hidden="true" size={14} /> {audit.githubExportStatus}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

function MetricCard({ icon, label, value, copy, tone }: { icon: React.ReactNode; label: string; value: string; copy: string; tone: string }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span>{icon}</span>
      <div className="metric">{value}</div>
      <strong>{label}</strong>
      <p>{copy}</p>
    </article>
  );
}

function StatusRow({ label, status, done }: { label: string; status: string; done: boolean }) {
  return (
    <li>
      <span>{label}</span>
      <span className={done ? "status-done" : ""}>{status}</span>
    </li>
  );
}
