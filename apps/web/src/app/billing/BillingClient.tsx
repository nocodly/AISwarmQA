"use client";

import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type BillingState = {
  plan: {
    name: string;
    evidenceRetentionDays: number;
    priorityQueue: boolean;
    emailReports: boolean;
    teamInvitationsEnabled: boolean;
  };
  subscription: {
    status: string;
    interval: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    audits: number;
    pages: number;
    concurrentAudits: number;
    workspaces: number;
    teamMembers: number;
  };
  limits: {
    auditsPerMonth: number | null;
    maxPagesPerAudit: number | null;
    concurrentAudits: number | null;
    workspaceLimit: number | null;
    teamMemberLimit: number | null;
    evidenceRetentionDays: number;
  };
};

export function BillingClient() {
  const [state, setState] = useState<BillingState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/billing/summary", { cache: "no-store" });
    const body = await response.json();
    setState(response.ok ? body : null);
    setMessage(response.ok ? null : body.error?.message ?? "Billing state could not be loaded.");
    setLoading(false);
  }

  async function startCheckout(interval: "monthly" | "yearly") {
    setMessage(null);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interval })
    });
    const body = await response.json();
    if (!response.ok || !body.url) {
      setMessage(body.error?.message ?? "Checkout could not be started.");
      return;
    }
    window.location.assign(body.url);
  }

  async function openPortal() {
    setMessage(null);
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const body = await response.json();
    if (!response.ok || !body.url) {
      setMessage(body.error?.message ?? "Billing portal could not be opened.");
      return;
    }
    window.location.assign(body.url);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Billing</div>
          <h1>Plan and usage</h1>
        </div>
        <button onClick={load} type="button">
          <RefreshCw aria-hidden="true" size={16} /> Refresh
        </button>
      </header>

      {loading ? <section className="panel">Loading billing state.</section> : null}
      {message ? <p className="error-text">{message}</p> : null}

      {state ? (
        <>
          <section className="grid">
            <article className="card">
              <h2>Current plan</h2>
              <div className="metric">{state.plan.name}</div>
              <p>{state.subscription.status} / {state.subscription.interval}</p>
              <p>{state.subscription.currentPeriodEnd ? `Renews ${new Date(state.subscription.currentPeriodEnd).toLocaleDateString()}` : "No renewal date"}</p>
            </article>
            <article className="card">
              <h2>Usage</h2>
              <div className="metric">
                {state.usage.audits}/{state.limits.auditsPerMonth ?? "Custom"}
              </div>
              <p>Audits this period</p>
            </article>
            <article className="card">
              <h2>Evidence</h2>
              <div className="metric">{state.limits.evidenceRetentionDays}d</div>
              <p>Retention policy</p>
            </article>
          </section>

          <section className="panel" style={{ marginTop: 16 }}>
            <h2>Limits</h2>
            <ul className="status-list">
              <li><span>Pages per audit</span><span>{state.limits.maxPagesPerAudit ?? "Custom"}</span></li>
              <li><span>Concurrent audits</span><span>{state.usage.concurrentAudits}/{state.limits.concurrentAudits ?? "Custom"}</span></li>
              <li><span>Workspaces</span><span>{state.usage.workspaces}/{state.limits.workspaceLimit ?? "Custom"}</span></li>
              <li><span>Team members</span><span>{state.usage.teamMembers}/{state.limits.teamMemberLimit ?? "Custom"}</span></li>
              <li><span>Email reports</span><span>{state.plan.emailReports ? "enabled" : "not included"}</span></li>
              <li><span>Team invitations</span><span>{state.plan.teamInvitationsEnabled ? "enabled" : "not included"}</span></li>
            </ul>
          </section>

          <section className="panel" style={{ marginTop: 16 }}>
            <h2>Actions</h2>
            <div className="toolbar">
              <button className="button" onClick={() => startCheckout("monthly")} type="button">
                <CreditCard aria-hidden="true" size={18} /> Upgrade monthly
              </button>
              <button className="button" onClick={() => startCheckout("yearly")} type="button">
                <CreditCard aria-hidden="true" size={18} /> Upgrade yearly
              </button>
              <button onClick={openPortal} type="button">
                <ExternalLink aria-hidden="true" size={16} /> Manage billing
              </button>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 16 }}>
            <h2>Business</h2>
            <p>Business plans are configured by sales and synchronized server-side before limits change.</p>
          </section>
        </>
      ) : null}
    </>
  );
}
