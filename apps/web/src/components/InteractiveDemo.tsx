"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, FileSearch, GitPullRequestArrow, Pause, Play, RotateCcw, ShieldAlert } from "lucide-react";
import { BrandIcon } from "./BrandIcons";
import { AnimatedCheckmark, SketchPath } from "./Sketch";

const phases = [
  { label: "Ready to scan", progress: 0 },
  { label: "URL accepted", progress: 12 },
  { label: "Agents deployed", progress: 28 },
  { label: "Browser navigating", progress: 46 },
  { label: "Critical finding highlighted", progress: 64 },
  { label: "Evidence captured", progress: 82 },
  { label: "GitHub issue assembled", progress: 94 },
  { label: "Export complete", progress: 100 }
];

const sampleFindings = [
  {
    severity: "critical",
    title: "Checkout button does not complete",
    path: "/checkout",
    evidence: "Screenshot and console trace captured"
  },
  {
    severity: "high",
    title: "Mobile menu traps keyboard focus",
    path: "/pricing",
    evidence: "Focus path and viewport snapshot captured"
  },
  {
    severity: "medium",
    title: "Docs link returns HTTP 404",
    path: "/docs/getting-started",
    evidence: "Network request and link source captured"
  }
];

export function InteractiveDemo() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [inspected, setInspected] = useState(false);
  const phase = phases[step] ?? phases[0]!;
  const visibleFindings = useMemo(() => sampleFindings.slice(0, Math.max(0, step - 3)), [step]);

  useEffect(() => {
    if (!running) return;
    if (step >= phases.length - 1) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((current) => current + 1), 950);
    return () => window.clearTimeout(timer);
  }, [running, step]);

  function start() {
    if (step >= phases.length - 1) setStep(0);
    setRunning(true);
  }

  function restart() {
    setInspected(false);
    setStep(0);
    setRunning(false);
  }

  return (
    <div className={`demo-console story-step-${step}`} aria-label="Interactive simulated audit demo">
      <div className="demo-toolbar">
        <div>
          <span className="demo-label">Interactive demo target</span>
          <strong>demo.saas-checkout.local</strong>
        </div>
        <div className="demo-actions">
          <button type="button" className="cta-button small" onClick={start}>
            <Play aria-hidden="true" size={16} />
            {step === 0 ? "Start demo audit" : step >= phases.length - 1 ? "Run again" : "Resume"}
          </button>
          <button type="button" className="ghost-button compact" onClick={() => setRunning(false)}>
            <Pause aria-hidden="true" size={15} />
            Pause
          </button>
          <button type="button" className="ghost-button compact" onClick={restart}>
            <RotateCcw aria-hidden="true" size={15} />
            Restart
          </button>
        </div>
      </div>
      <div className="demo-progress">
        <span>{phase.label}</span>
        <strong>{phase.progress}%</strong>
        <div>
          <i style={{ width: `${phase.progress}%` }} />
        </div>
      </div>
      <div className="story-board">
        <div className="browser-stage">
          <div className="browser-chrome">
            <span />
            <span />
            <span />
            <strong>/checkout</strong>
          </div>
          <div className="checkout-wire">
            <span className={step >= 3 ? "hot" : ""} />
            <span />
            <button type="button" aria-label="Demo checkout button">Checkout</button>
            <SketchPath className="checkout-alert" variant="drop" color="var(--orange)" />
          </div>
        </div>
        <div className="agent-feed">
          {["Agent #1 scanning checkout", "Agent #3 analyzing mobile state", "Agent #7 reporting evidence"].map((item, index) => (
            <div className={index + 2 <= step ? "active" : ""} key={item}>
              <span />
              {item}
            </div>
          ))}
        </div>
        <div className="finding-stack">
          {visibleFindings.length === 0 ? (
            <div className="empty-demo">
              <FileSearch aria-hidden="true" size={28} />
              Findings assemble here.
            </div>
          ) : (
            visibleFindings.map((finding, index) => (
              <article className={`demo-finding ${finding.severity} ${index === 0 ? "selected" : ""}`} key={finding.title}>
                <BrandIcon name={finding.severity === "critical" ? "bug" : "issue"} />
                <span>{finding.severity}</span>
                <h3>{finding.title}</h3>
                <p>{finding.path}</p>
                <small>{finding.evidence}</small>
                {index === 0 ? (
                  <button type="button" className="ghost-button compact" onClick={() => setInspected(true)}>
                    <Eye aria-hidden="true" size={15} />
                    Inspect evidence
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
        <div className={`evidence-preview ${inspected || step >= 5 ? "visible" : ""}`}>
          <BrandIcon name="screenshot" />
          <strong>Evidence frame</strong>
          <span>Private storage</span>
          <span>Stable route ready</span>
          <span>Revocation controlled</span>
        </div>
        <div className={`issue-preview ${step >= 6 ? "ready" : ""}`}>
          <div className="issue-head">
            <GitPullRequestArrow aria-hidden="true" size={18} />
            <span>GitHub Issue Preview</span>
          </div>
          <h3>Checkout button does not complete</h3>
          <p>Includes severity, reproduction steps, expected and actual behavior, suggested fix, acceptance criteria, and AISwarmQA metadata.</p>
          <div className="issue-lines">
            <span />
            <span />
            <span />
          </div>
          <div className="issue-status">
            {step >= 7 ? <CheckCircle2 aria-hidden="true" size={18} /> : <ShieldAlert aria-hidden="true" size={18} />}
            {step >= 7 ? "Export complete" : "Waiting for explicit confirmation"}
          </div>
          {step >= 7 ? <AnimatedCheckmark className="demo-export-check" /> : null}
        </div>
      </div>
      <p className="demo-note">This is a deterministic public demo. It does not submit visitor URLs to the production audit queue.</p>
    </div>
  );
}
