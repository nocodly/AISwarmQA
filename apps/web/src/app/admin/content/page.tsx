import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editorialStates, contentItems, qualityGateSummary } from "../../../lib/content";

export const metadata: Metadata = {
  title: "Content Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function ContentAdminPage() {
  if (process.env.CONTENT_ADMIN_ENABLED !== "true") {
    notFound();
  }

  return (
    <main className="admin-content">
      <section className="admin-card">
        <p className="marketing-eyebrow">Admin only</p>
        <h1>Content operating system</h1>
        <p>Server-side disabled by default. Enable only for trusted admins after wiring identity checks.</p>
      </section>
      <section className="admin-card">
        <h2>Editorial states</h2>
        <p>{editorialStates.join(" -> ")}</p>
      </section>
      <section className="content-grid">
        {contentItems.map((item) => {
          const quality = qualityGateSummary(item);
          return (
            <article className="admin-card" key={`${item.collection}-${item.slug}`}>
              <span className="marketing-eyebrow">{item.collection} / {item.state}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <p>Quality score: {quality.score}/100. Human approval required: {quality.requiresHumanApproval ? "yes" : "no"}.</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
