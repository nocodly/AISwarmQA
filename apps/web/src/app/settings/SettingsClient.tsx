"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LinearIcon } from "@/components/BrandIcons";

type WorkspaceSettings = {
  account: {
    id: string;
    email: string;
    name: string | null;
    login: string;
  };
  workspace: {
    id: string;
    name: string;
    members: Array<{ id: string; role: string; email: string; name: string | null }>;
    invitations: Array<{ id: string; email: string; role: string; status: string; expiresAt: string }>;
  } | null;
};

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
    teamMembers: number;
  };
  limits: {
    auditsPerMonth: number | null;
    maxPagesPerAudit: number | null;
    concurrentAudits: number | null;
    teamMemberLimit: number | null;
    evidenceRetentionDays: number;
    githubExportEnabled: boolean;
  };
};

const planComparison = [
  {
    name: "Free",
    price: "$0",
    cadence: "month",
    description: "For trying the audit workflow on small public targets.",
    limits: ["2 audits per month", "25 pages per audit", "1 concurrent audit", "1 team member", "7 day evidence retention"],
    features: ["GitHub export", "Basic missions"]
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "month",
    yearly: "$790/year",
    description: "For recurring product QA and team review before shipping.",
    limits: ["50 audits per month", "500 pages per audit", "3 concurrent audits", "10 team members", "90 day evidence retention"],
    features: ["GitHub export", "Priority queue", "Email reports", "Team invitations"]
  },
  {
    name: "Business",
    price: "Custom",
    cadence: "contract",
    description: "For larger workspaces, long retention, and API access.",
    limits: ["Custom audits", "Custom pages", "Custom concurrency", "Custom team size", "365 day evidence retention"],
    features: ["GitHub export", "Priority queue", "Email reports", "API access", "Business support"]
  }
];

function limitText(value: number | null | undefined, unit: string) {
  return value == null ? "Custom" : `${value} ${unit}`;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "Not scheduled";
}

export function SettingsClient() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [settingsResponse, billingResponse] = await Promise.all([
      fetch("/api/settings/workspace", { cache: "no-store" }),
      fetch("/api/billing/summary", { cache: "no-store" })
    ]);
    const settingsBody = await settingsResponse.json();
    const billingBody = await billingResponse.json();
    setSettings(settingsResponse.ok ? settingsBody : null);
    setBilling(billingResponse.ok ? billingBody : null);
    if (!settingsResponse.ok) {
      setMessage(settingsBody.error?.message ?? "Settings could not be loaded.");
    } else if (!billingResponse.ok) {
      setMessage(billingBody.error?.message ?? "Billing state could not be loaded.");
    } else {
      setMessage(null);
    }
    setLoading(false);
  }

  async function invite() {
    setMessage(null);
    const response = await fetch("/api/settings/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: "member" })
    });
    const body = await response.json();
    setMessage(response.ok ? "Invitation queued." : body.error?.message ?? "Invitation failed.");
    await load();
  }

  async function requestDeletion() {
    const response = await fetch("/api/settings/workspace/deletion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation: settings?.workspace?.name ?? "delete workspace" })
    });
    const body = await response.json();
    setMessage(response.ok ? `Deletion ${body.deletion.status}.` : body.error?.message ?? "Deletion request failed.");
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="app-content-stack">
      <header className="page-header app-page-header">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>{settings?.workspace?.name ?? "Workspace settings"}</h1>
          <p>Review your account, security, current plan, workspace members, and plan options.</p>
        </div>
        <button className="ghost-button compact" onClick={load} type="button">
          Refresh
        </button>
      </header>

      {loading ? <section className="command-panel">Loading settings.</section> : null}
      {message ? <p>{message}</p> : null}

      <section className="settings-account-grid">
        <article className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Account</p><h2>Profile</h2></div></div>
          <dl className="settings-detail-list">
            <div><dt>Name</dt><dd>{settings?.account.name ?? "Not set"}</dd></div>
            <div><dt>Login</dt><dd>{settings?.account.login ?? "Not available"}</dd></div>
            <div><dt>Email</dt><dd>{settings?.account.email ?? "Not available"}</dd></div>
            <div><dt>User ID</dt><dd>{settings?.account.id ?? "Not available"}</dd></div>
          </dl>
        </article>

        <article className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Security</p><h2>Password</h2></div></div>
          <dl className="settings-detail-list">
            <div><dt>Status</dt><dd>Protected</dd></div>
            <div><dt>Password</dt><dd>Hidden by design</dd></div>
            <div><dt>Provider</dt><dd>Supabase Auth</dd></div>
          </dl>
          <p className="settings-note">Current passwords are never stored or displayed by AISwarmQA. Use the auth provider flow to change or reset credentials.</p>
          <Link className="ghost-button compact" href="/auth">Open auth</Link>
        </article>

        <article className="command-panel">
          <div className="panel-head"><div><p className="eyebrow">Current plan</p><h2>{billing?.plan.name ?? "Plan unavailable"}</h2></div></div>
          <dl className="settings-detail-list">
            <div><dt>Status</dt><dd>{billing?.subscription.status ?? "Unknown"}</dd></div>
            <div><dt>Billing interval</dt><dd>{billing?.subscription.interval ?? "Unknown"}</dd></div>
            <div><dt>Period end</dt><dd>{formatDate(billing?.subscription.currentPeriodEnd ?? null)}</dd></div>
            <div><dt>Audits used</dt><dd>{billing ? `${billing.usage.audits}/${billing.limits.auditsPerMonth ?? "Custom"}` : "Unknown"}</dd></div>
          </dl>
          <Link className="new-test-button" href="/billing">
            <LinearIcon name="add" /> Manage billing
          </Link>
        </article>
      </section>

      {billing ? (
        <section className="command-panel app-section-gap">
          <div className="panel-head"><div><p className="eyebrow">Included now</p><h2>Plan limits</h2></div></div>
          <ul className="status-list">
            <li><span>Audits per month</span><span>{limitText(billing.limits.auditsPerMonth, "audits")}</span></li>
            <li><span>Pages per audit</span><span>{limitText(billing.limits.maxPagesPerAudit, "pages")}</span></li>
            <li><span>Concurrent audits</span><span>{limitText(billing.limits.concurrentAudits, "audits")}</span></li>
            <li><span>Team members</span><span>{limitText(billing.limits.teamMemberLimit, "members")}</span></li>
            <li><span>Evidence retention</span><span>{billing.limits.evidenceRetentionDays} days</span></li>
            <li><span>GitHub export</span><span>{billing.limits.githubExportEnabled ? "Included" : "Not included"}</span></li>
            <li><span>Email reports</span><span>{billing.plan.emailReports ? "Included" : "Not included"}</span></li>
            <li><span>Priority queue</span><span>{billing.plan.priorityQueue ? "Included" : "Not included"}</span></li>
          </ul>
        </section>
      ) : null}

      <section className="command-panel">
        <div className="panel-head"><div><p className="eyebrow">Team</p><h2>Members</h2></div></div>
        <ul className="status-list">
          {settings?.workspace?.members.map((member) => (
            <li key={member.id}><span>{member.name ? `${member.name} · ${member.email}` : member.email}</span><span>{member.role}</span></li>
          ))}
        </ul>
      </section>

      <section className="command-panel app-section-gap">
        <div className="panel-head"><div><p className="eyebrow">Invite</p><h2>Add teammate</h2></div></div>
        <div className="toolbar">
          <input className="input" onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" type="email" value={email} />
          <button className="new-test-button" onClick={invite} type="button">
            <LinearIcon name="add" /> Invite
          </button>
        </div>
      </section>

      <section className="command-panel app-section-gap">
        <div className="panel-head"><div><p className="eyebrow">Plans</p><h2>Compare plans</h2></div></div>
        <div className="settings-plan-grid">
          {planComparison.map((plan) => (
            <article className={billing?.plan.name === plan.name ? "settings-plan-card current" : "settings-plan-card"} key={plan.name}>
              <div className="settings-plan-card-head">
                <div>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                {billing?.plan.name === plan.name ? <span>Current</span> : null}
              </div>
              <div className="settings-plan-price">
                {plan.price}<span>/{plan.cadence}</span>
              </div>
              {plan.yearly ? <p className="settings-note">{plan.yearly} saves compared with monthly billing.</p> : null}
              <ul>
                {[...plan.limits, ...plan.features].map((item) => (
                  <li key={item}><LinearIcon name="issues" /> {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="command-panel app-section-gap">
        <div className="panel-head"><div><p className="eyebrow">Danger zone</p><h2>Delete workspace</h2></div></div>
        <button className="ghost-button compact" onClick={requestDeletion} type="button">
          Request deletion
        </button>
      </section>
    </div>
  );
}
