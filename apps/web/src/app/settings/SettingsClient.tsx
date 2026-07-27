"use client";

import { Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type WorkspaceSettings = {
  workspace: {
    id: string;
    name: string;
    members: Array<{ id: string; role: string; email: string; name: string | null }>;
    invitations: Array<{ id: string; email: string; role: string; status: string; expiresAt: string }>;
  } | null;
};

export function SettingsClient() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/settings/workspace", { cache: "no-store" });
    const body = await response.json();
    setSettings(response.ok ? body : null);
    if (!response.ok) setMessage(body.error?.message ?? "Settings could not be loaded.");
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
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>{settings?.workspace?.name ?? "Workspace settings"}</h1>
        </div>
      </header>
      {message ? <p>{message}</p> : null}
      <section className="grid">
        <article className="card">
          <h2>User</h2>
          <p>Email is managed by Supabase Auth. Password reset and session revocation use Supabase Auth controls.</p>
        </article>
        <article className="card">
          <h2>GitHub</h2>
          <p>GitHub App connections are managed from audit export screens and scoped to this workspace.</p>
        </article>
        <article className="card">
          <h2>Evidence</h2>
          <p>Evidence retention follows the current billing plan and external links can be revoked.</p>
        </article>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Members</h2>
        <ul className="status-list">
          {settings?.workspace?.members.map((member) => (
            <li key={member.id}><span>{member.email}</span><span>{member.role}</span></li>
          ))}
        </ul>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Invitations</h2>
        <div className="toolbar">
          <input className="input" onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" type="email" value={email} />
          <button className="button" onClick={invite} type="button">
            <Send aria-hidden="true" size={18} /> Invite
          </button>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Delete workspace</h2>
        <button onClick={requestDeletion} type="button">
          <Trash2 aria-hidden="true" size={16} /> Request deletion
        </button>
      </section>
    </>
  );
}
