"use client";

import { useState } from "react";
import { Play } from "lucide-react";

export function AuditForm() {
  const [url, setUrl] = useState("http://localhost:4100");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitAudit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error?.message ?? "Audit creation failed.");
        return;
      }

      window.location.assign(`/audits/${body.id}`);
    } catch {
      setError("Audit creation failed because the server could not be reached.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={submitAudit}>
      <label>
        Target URL
        <input
          className="input"
          name="url"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="http://localhost:4100"
          type="url"
          value={url}
        />
      </label>
      {error ? <p className="error-text">{error}</p> : null}
      <button className="button" disabled={isSubmitting} type="submit">
        <Play aria-hidden="true" size={18} /> {isSubmitting ? "Queueing audit" : "Run audit"}
      </button>
    </form>
  );
}
