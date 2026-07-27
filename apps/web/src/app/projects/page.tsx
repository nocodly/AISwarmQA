import Link from "next/link";
import { ArrowRight, FileSearch, GitBranch, ShieldCheck } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { BrandIcon } from "@/components/BrandIcons";

export default function ProjectsPage() {
  return (
    <AppShell>
      <header className="page-header">
        <div>
          <div className="eyebrow">Audit Hub</div>
          <h1>Every target starts with a mission briefing.</h1>
          <p>Use this hub to start audits, connect GitHub, and understand what agents need before they inspect your app.</p>
        </div>
        <Link className="cta-button" href="/projects/new">
          <FileSearch aria-hidden="true" size={18} /> Start new audit
        </Link>
      </header>
      <section className="hub-grid">
        <article className="hub-card">
          <BrandIcon name="browser" tone="cyan" />
          <h2>Public audit</h2>
          <p>Inspect marketing pages, navigation, broken links, responsive states, and visible forms.</p>
          <Link className="ghost-button" href="/projects/new">Start public scan <ArrowRight aria-hidden="true" size={16} /></Link>
        </article>
        <article className="hub-card">
          <BrandIcon name="private" tone="lime" />
          <h2>Authenticated flow</h2>
          <p>Prepare a temporary test account so agents can check login, account pages, and gated workflows.</p>
          <Link className="ghost-button" href="/projects/new">Add test access <ShieldCheck aria-hidden="true" size={16} /></Link>
        </article>
        <article className="hub-card">
          <BrandIcon name="github" tone="magenta" />
          <h2>GitHub-ready reports</h2>
          <p>Completed findings can become structured GitHub issues with evidence and duplicate prevention.</p>
          <Link className="ghost-button" href="/settings">Workspace setup <GitBranch aria-hidden="true" size={16} /></Link>
        </article>
      </section>
    </AppShell>
  );
}
