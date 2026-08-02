"use client";

import { useMemo, useState } from "react";
import { LinearIcon, type LinearIconName } from "@/components/BrandIcons";

type Environment = "production" | "staging" | "preview";
type AccessMode = "public" | "temporary-account" | "guided-instructions" | "credentials-later";
type AuditScope = "quick" | "full" | "auth" | "checkout" | "accessibility" | "mobile" | "custom";

const steps = ["Target", "Access", "Scope", "Safety", "Review"] as const;

const accessModes: Array<{ id: AccessMode; title: string; copy: string; icon: LinearIconName }> = [
  { id: "public", title: "Public website", copy: "Agents inspect pages that do not require sign in.", icon: "views" },
  { id: "temporary-account", title: "Temporary test account", copy: "Use a disposable test login so agents can inspect authenticated flows.", icon: "inbox" },
  { id: "guided-instructions", title: "Guided access instructions", copy: "Tell agents how to enter a safe flow without storing credentials yet.", icon: "issues" },
  { id: "credentials-later", title: "No credentials yet", copy: "Save the setup intent and run a public audit first.", icon: "projects" }
];

const scopes: Array<{ id: AuditScope; title: string; copy: string; auditMode: "preview" | "standard" }> = [
  { id: "quick", title: "Quick scan", copy: "Fast smoke test for visible breakage, links, and mobile layout.", auditMode: "preview" },
  { id: "full", title: "Full flow audit", copy: "Broad agent run across navigation, forms, interactions, and evidence.", auditMode: "standard" },
  { id: "auth", title: "Auth flow audit", copy: "Focus on sign in, sign up, password states, and account gates.", auditMode: "standard" },
  { id: "checkout", title: "Checkout / billing audit", copy: "Inspect pricing, checkout intent, billing CTAs, and safe payment boundaries.", auditMode: "standard" },
  { id: "accessibility", title: "Accessibility audit", copy: "Prioritize keyboard, semantic, contrast, and assistive technology issues.", auditMode: "standard" },
  { id: "mobile", title: "Mobile responsive audit", copy: "Prioritize small-screen navigation, text fit, and touch behavior.", auditMode: "standard" },
  { id: "custom", title: "Custom instructions", copy: "Use your own test intent and acceptance criteria.", auditMode: "standard" }
];

const safetyOptions = [
  "Do not submit real payments",
  "Do not send emails or notifications",
  "Do not delete data",
  "Do not change account settings",
  "Stop before destructive actions",
  "Capture evidence for every finding"
];

export function AuditForm() {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [environment, setEnvironment] = useState<Environment>("production");
  const [accessMode, setAccessMode] = useState<AccessMode>("public");
  const [loginUrl, setLoginUrl] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [scope, setScope] = useState<AuditScope>("full");
  const [customInstructions, setCustomInstructions] = useState("");
  const [safetyRules, setSafetyRules] = useState<string[]>(["Do not submit real payments", "Stop before destructive actions", "Capture evidence for every finding"]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedScope = scopes.find((item) => item.id === scope) ?? scopes[0]!;
  const selectedAccess = accessModes.find((item) => item.id === accessMode) ?? accessModes[0]!;
  const canContinue = useMemo(() => {
    if (step === 0) return url.trim().length > 0;
    if (step === 1 && accessMode === "temporary-account") return loginUrl.trim().length > 0 && testEmail.trim().length > 0;
    if (step === 2 && scope === "custom") return customInstructions.trim().length > 0;
    return true;
  }, [accessMode, customInstructions, loginUrl, scope, step, testEmail, url]);

  function toggleSafety(rule: string) {
    setSafetyRules((current) => (current.includes(rule) ? current.filter((item) => item !== rule) : [...current, rule]));
  }

  async function submitAudit() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          auditMode: selectedScope.auditMode,
          metadata: {
            projectName: projectName || undefined,
            environment,
            accessMode,
            auditScope: scope,
            loginUrl: loginUrl || undefined,
            testAccount: testEmail || undefined,
            customInstructions: buildInstructionSummary(),
            safetyRules
          }
        })
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

  function buildInstructionSummary() {
    const parts = [
      selectedScope.title,
      selectedAccess.title,
      accessMode === "temporary-account" ? "Temporary test access was noted. Passwords are not collected or stored by AISwarmQA." : null,
      accessNotes ? `Access notes: ${accessNotes}` : null,
      customInstructions ? `Custom instructions: ${customInstructions}` : null
    ].filter(Boolean);
    return parts.join("\n");
  }

  return (
    <section className="audit-wizard">
      <div className="wizard-progress" aria-label="Audit setup steps">
        {steps.map((label, index) => (
          <button className={index === step ? "active" : index < step ? "done" : ""} key={label} onClick={() => setStep(index)} type="button">
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="wizard-shell">
        <aside className="wizard-guide">
          <div className="badge">Agent briefing</div>
          <h2>Tell the swarm what a real user would try.</h2>
          <p>AISwarmQA checks routes, button intent, forms, auth gates, mobile behavior, evidence, and GitHub-ready reproduction steps.</p>
          <ul>
            <li>Use test credentials only.</li>
            <li>Keep destructive actions forbidden.</li>
            <li>Review the mission before launch.</li>
          </ul>
        </aside>

        <div className="wizard-panel">
          {step === 0 ? (
            <div className="wizard-step">
              <StepHeader icon="views" title="Target" copy="Start with the site and environment agents should inspect." />
              <label>
                Website URL
                <input className="input" name="url" onChange={(event) => setUrl(event.target.value)} placeholder="https://your-app.com" type="url" value={url} />
              </label>
              <label>
                Project name
                <input className="input" onChange={(event) => setProjectName(event.target.value)} placeholder="Customer portal, marketing site, checkout..." value={projectName} />
              </label>
              <div className="choice-grid three">
                {(["production", "staging", "preview"] as Environment[]).map((item) => (
                  <button className={environment === item ? "choice-card selected" : "choice-card"} key={item} onClick={() => setEnvironment(item)} type="button">
                    <strong>{item === "preview" ? "Preview / local" : item}</strong>
                    <span>{item === "production" ? "Live user-facing site" : item === "staging" ? "Safe pre-production app" : "Temporary deploy or local tunnel"}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="wizard-step">
              <StepHeader icon="inbox" title="Access mode" copy="Choose how agents should enter the product. Never use a personal account." />
              <div className="choice-grid two">
                {accessModes.map((item) => (
                  <button className={accessMode === item.id ? "choice-card selected" : "choice-card"} key={item.id} onClick={() => setAccessMode(item.id)} type="button">
                    <LinearIcon name={item.icon} />
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </button>
                ))}
              </div>
              {accessMode === "temporary-account" ? (
                <div className="credential-panel">
                  <p className="safe-note">
                    AISwarmQA does not collect or store passwords in this flow. Use safe access notes only.
                  </p>
                  <label>
                    Login URL
                    <input className="input" onChange={(event) => setLoginUrl(event.target.value)} placeholder="https://your-app.com/login" type="url" value={loginUrl} />
                  </label>
                  <div className="split-fields">
                    <label>
                      Test account email or username
                      <input className="input" onChange={(event) => setTestEmail(event.target.value)} placeholder="qa-test@yourcompany.com" value={testEmail} />
                    </label>
                  </div>
                </div>
              ) : null}
              <label>
                Access notes
                <textarea className="input text-area" onChange={(event) => setAccessNotes(event.target.value)} placeholder="Allowed pages, MFA notes, forbidden areas, test data rules..." value={accessNotes} />
              </label>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="wizard-step">
              <StepHeader icon="issues" title="Audit scope" copy="Pick the mission type that best matches what users need to trust." />
              <div className="choice-grid two">
                {scopes.map((item) => (
                  <button className={scope === item.id ? "choice-card selected" : "choice-card"} key={item.id} onClick={() => setScope(item.id)} type="button">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </button>
                ))}
              </div>
              {scope === "custom" ? (
                <label>
                  Custom instructions
                  <textarea className="input text-area" onChange={(event) => setCustomInstructions(event.target.value)} placeholder="Example: log in, open billing, try checkout, verify the issue export flow, but do not submit payment." value={customInstructions} />
                </label>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="wizard-step">
              <StepHeader icon="inbox" title="Safety rules" copy="Set explicit boundaries before agents interact with the site." />
              <div className="safety-list">
                {safetyOptions.map((rule) => (
                  <label className={safetyRules.includes(rule) ? "safety-item selected" : "safety-item"} key={rule}>
                    <input checked={safetyRules.includes(rule)} onChange={() => toggleSafety(rule)} type="checkbox" />
                    {rule}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="wizard-step">
              <StepHeader icon="issues" title="Review and start" copy="This is the mission briefing your QA swarm will use." />
              <div className="review-grid">
                <ReviewItem label="Target" value={url || "Missing"} />
                <ReviewItem label="Project" value={projectName || "Auto-created from URL"} />
                <ReviewItem label="Environment" value={environment} />
                <ReviewItem label="Access" value={selectedAccess.title} />
                <ReviewItem label="Scope" value={selectedScope.title} />
                <ReviewItem label="Audit mode" value={selectedScope.auditMode} />
                <ReviewItem label="Safety" value={`${safetyRules.length} rules enabled`} />
                <ReviewItem label="Estimated time" value={selectedScope.auditMode === "preview" ? "2-5 minutes" : "5-12 minutes"} />
              </div>
              <div className="agent-capability-strip">
                {["Button intent", "Routes", "Forms", "Auth gates", "Evidence", "GitHub issues"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              {error ? <p className="error-text">{error}</p> : null}
            </div>
          ) : null}

          <div className="wizard-actions">
            <button className="ghost-button" disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button">
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="cta-button" disabled={!canContinue} onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} type="button">
                Continue
              </button>
            ) : (
              <button className="cta-button" disabled={!canContinue || isSubmitting} onClick={() => void submitAudit()} type="button">
                {isSubmitting ? "Starting audit" : "Start audit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepHeader({ icon, title, copy }: { icon: LinearIconName; title: string; copy: string }) {
  return (
    <div className="wizard-step-header">
      <LinearIcon name={icon} />
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
