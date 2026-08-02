"use client";

import { useState } from "react";
import { LinearIcon } from "@/components/BrandIcons";

export function OnboardingClient() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function startAudit() {
    setMessage(null);
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ websiteUrl })
    });
    const response = await fetch("/api/audits", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: websiteUrl })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error?.message ?? "Audit could not be started.");
      return;
    }
    window.location.assign(`/audits/${body.id}`);
  }

  async function skipGitHub() {
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skipGitHub: true })
    });
    setMessage("GitHub setup skipped.");
  }

  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Onboarding</div>
          <h1>Launch checklist</h1>
        </div>
      </header>

      <section className="panel">
        <ul className="status-list">
          <li><span>Welcome</span><span>ready</span></li>
          <li><span>Create or confirm workspace</span><span>automatic</span></li>
          <li><span>Enter website URL</span><span>required</span></li>
          <li><span>Validate URL safely</span><span>server-side</span></li>
          <li><span>Start first audit</span><span>available</span></li>
          <li><span>Review findings</span><span>after audit</span></li>
          <li><span>Connect GitHub</span><span>optional</span></li>
        </ul>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>First audit</h2>
        <div className="form">
          <label>
            Website URL
            <input className="input" onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" type="url" value={websiteUrl} />
          </label>
          {message ? <p>{message}</p> : null}
          <div className="toolbar">
            <button className="button" onClick={startAudit} type="button">
              <LinearIcon name="add" /> Start audit
            </button>
            <button onClick={skipGitHub} type="button">
              Skip GitHub
            </button>
            <a className="button" href="/billing">
              Upgrade when needed
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
