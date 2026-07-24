import Link from "next/link";
import { ArrowRight, Bot, FileSearch, Workflow } from "lucide-react";
import { AuditForm } from "./AuditForm";

const agentTypes = [
  "Planner",
  "Explorer",
  "Form tester",
  "Accessibility reviewer",
  "Performance reviewer",
  "Report writer"
];

export default function HomePage() {
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Control Plane Foundation</div>
          <h1>AI QA Team for every deployment</h1>
          <p>
            Start an audit, queue browser missions, collect evidence, and turn findings into a structured report.
          </p>
        </div>
        <Link className="button" href="/projects/new">
          Run free audit <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </header>

      <section className="grid" aria-label="Product foundation">
        <article className="card">
          <FileSearch aria-hidden="true" color="var(--accent)" size={24} />
          <h2>Audit intake</h2>
          <p>Projects capture the target URL and testing authorization before any browser work is queued.</p>
        </article>
        <article className="card">
          <Workflow aria-hidden="true" color="var(--accent)" size={24} />
          <h2>Execution plane</h2>
          <p>Workers consume audit jobs, run bounded missions, and write evidence back to the database.</p>
        </article>
        <article className="card">
          <Bot aria-hidden="true" color="var(--accent)" size={24} />
          <h2>Report preview</h2>
          <p>Findings include severity, reproduction steps, evidence links, confidence, and deterministic fingerprints.</p>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Run a local audit</h2>
        <p>Start the broken demo fixture first, then submit its URL to create a real queued audit.</p>
        <AuditForm />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Agent roles</h2>
        <div className="grid">
          {agentTypes.map((agentType) => (
            <div className="badge" key={agentType}>
              {agentType}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
