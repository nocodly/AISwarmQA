"use client";

import { useEffect, useState } from "react";
import { LinearIcon } from "@/components/BrandIcons";

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
    try {
      const response = await fetch("/api/billing/summary", { cache: "no-store" });
      const body = await response.json();
      setState(response.ok ? body : null);
      setMessage(response.ok ? null : body.error?.message ?? "Billing state could not be loaded.");
    } catch {
      setState(null);
      setMessage("Billing state could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
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
    <div className="app-content-stack">
      <header className="page-header app-page-header">
        <div>
          <div className="eyebrow">Billing</div>
          <h1>Plan and usage</h1>
          <p>Review the current plan, usage, and billing actions.</p>
        </div>
        <button className="ghost-button compact" onClick={load} type="button">
          Refresh
        </button>
      </header>

      {loading ? <section className="command-panel">Loading billing state.</section> : null}
      {message ? <p className="error-text">{message}</p> : null}

      {state ? (
        <>
          <section className="simple-stat-grid">
            <article className="command-metric-card tone-purple">
              <h2>Current plan</h2>
              <div className="metric">{state.plan.name}</div>
              <p>{state.subscription.status} / {state.subscription.interval}</p>
            </article>
            <article className="command-metric-card tone-cyan">
              <h2>Usage</h2>
              <div className="metric">
                {state.usage.audits}/{state.limits.auditsPerMonth ?? "Custom"}
              </div>
              <p>Audits this period</p>
            </article>
            <article className="command-metric-card tone-lime">
              <h2>Evidence</h2>
              <div className="metric">{state.limits.evidenceRetentionDays}d</div>
              <p>Retention policy</p>
            </article>
          </section>

          <section className="command-panel app-section-gap">
            <div className="panel-head"><div><p className="eyebrow">Billing actions</p><h2>Manage plan</h2></div></div>
            <div className="toolbar">
              <button className="new-test-button" onClick={() => startCheckout("monthly")} type="button">
                <LinearIcon name="add" /> Upgrade monthly
              </button>
              <button className="ghost-button compact" onClick={() => startCheckout("yearly")} type="button">
                Upgrade yearly
              </button>
              <button className="ghost-button compact" onClick={openPortal} type="button">
                Manage billing
              </button>
            </div>
          </section>

          <section className="command-panel app-section-gap">
            <div className="panel-head"><div><p className="eyebrow">Limits</p><h2>Included usage</h2></div></div>
            <ul className="status-list">
              <li><span>Pages per audit</span><span>{state.limits.maxPagesPerAudit ?? "Custom"}</span></li>
              <li><span>Concurrent audits</span><span>{state.usage.concurrentAudits}/{state.limits.concurrentAudits ?? "Custom"}</span></li>
              <li><span>Team members</span><span>{state.usage.teamMembers}/{state.limits.teamMemberLimit ?? "Custom"}</span></li>
              <li><span>Email reports</span><span>{state.plan.emailReports ? "Enabled" : "Not included"}</span></li>
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
