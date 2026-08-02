import Link from "next/link";
import { AppShell } from "../../components/AppShell";
import { LinearIcon } from "@/components/BrandIcons";

export default function ProjectsPage() {
  return (
    <AppShell>
      <header className="page-header app-page-header">
        <div>
          <div className="eyebrow">Projects</div>
          <h1>Start with a target.</h1>
          <p>Create an audit for a public site, staging app, or guided product flow.</p>
        </div>
        <Link className="new-test-button" href="/projects/new">
          <LinearIcon name="add" /> New audit
        </Link>
      </header>
      <section className="simple-stat-grid">
        <Link className="hub-card" href="/projects/new">
          <LinearIcon name="views" />
          <h2>Public site</h2>
          <p>Check navigation, visible forms, broken links, and responsive states.</p>
          <span className="panel-link">Start audit</span>
        </Link>
        <Link className="hub-card" href="/projects/new">
          <LinearIcon name="inbox" />
          <h2>Guided flow</h2>
          <p>Add safe instructions or a temporary test account for gated paths.</p>
          <span className="panel-link">Set access</span>
        </Link>
        <Link className="hub-card" href="/github">
          <LinearIcon name="github" />
          <h2>GitHub export</h2>
          <p>Connect repositories before turning findings into issues.</p>
          <span className="panel-link">Open GitHub</span>
        </Link>
      </section>
    </AppShell>
  );
}
