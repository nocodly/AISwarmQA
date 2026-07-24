import Link from "next/link";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Projects</div>
          <h1>Tracked properties</h1>
          <p>No projects exist yet. Create the first target before starting an audit.</p>
        </div>
        <Link className="button" href="/projects/new">
          <Plus aria-hidden="true" size={18} /> New audit
        </Link>
      </header>
      <section className="panel">
        <h2>Empty state</h2>
        <p>The first implementation pass creates the shape of this screen. Database-backed project lists come next.</p>
      </section>
    </>
  );
}
