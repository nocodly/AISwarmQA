"use client";

import Link from "next/link";
import type { Route } from "next";
import { AlertCircle, FileSearch, GitBranch, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

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
  }>;
  githubIssuesExported: number;
};

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

  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Operational overview</h1>
        </div>
        <div className="toolbar">
          <button onClick={load} type="button">
            <RefreshCw aria-hidden="true" size={16} /> Refresh
          </button>
          <Link className="button" href="/projects/new">
            <FileSearch aria-hidden="true" size={18} /> New audit
          </Link>
        </div>
      </header>

      {loading ? <section className="panel">Loading dashboard.</section> : null}
      {error ? (
        <section className="panel auth-required-panel">
          <p className="error-text">
            <AlertCircle aria-hidden="true" size={16} /> {error}
          </p>
          {error.toLowerCase().includes("sign in") ? (
            <Link className="cta-button small" href={"/auth" as Route}>
              Create account or sign in
            </Link>
          ) : null}
        </section>
      ) : null}

      {data ? (
        <>
          <section className="grid">
            <article className="card">
              <div className="metric">
                {data.summary.usage.audits}/{data.summary.limits.auditsPerMonth ?? "Custom"}
              </div>
              <p>Audits this period</p>
            </article>
            <article className="card">
              <div className="metric">{data.summary.plan.name}</div>
              <p>
                {data.summary.subscription.status}
                {data.summary.subscription.cancelAtPeriodEnd ? " / canceling" : ""}
              </p>
            </article>
            <article className="card">
              <div className="metric">{data.githubIssuesExported}</div>
              <p>GitHub issues exported</p>
            </article>
          </section>

          <section className="panel" style={{ marginTop: 16 }}>
            <h2>Onboarding checklist</h2>
            <ul className="status-list">
              <li><span>Create workspace</span><span>ready</span></li>
              <li><span>Run first audit</span><span>{data.summary.usage.audits > 0 ? "done" : "open"}</span></li>
              <li><span>Review findings</span><span>{data.recentAudits.some((audit) => audit.findingsCount > 0) ? "done" : "open"}</span></li>
              <li><span>Connect GitHub</span><span>{data.githubIssuesExported > 0 ? "done" : "optional"}</span></li>
              <li><span>Export first issue</span><span>{data.githubIssuesExported > 0 ? "done" : "open"}</span></li>
            </ul>
          </section>

          <section className="panel" style={{ marginTop: 16 }}>
            <h2>Recent audits</h2>
            {data.recentAudits.length === 0 ? (
              <p>No audits yet.</p>
            ) : (
              <div className="mission-list">
                {data.recentAudits.map((audit) => (
                  <Link className="mission-row" href={`/audits/${audit.id}`} key={audit.id}>
                    <div>
                      <h3>{audit.targetUrl}</h3>
                      <p>
                        {audit.findingsCount} findings / {audit.criticalHighCount} critical or high
                      </p>
                    </div>
                    <div className="mission-meta">
                      <span>{audit.status}</span>
                      <span>
                        <GitBranch aria-hidden="true" size={14} /> {audit.githubExportStatus}
                      </span>
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
