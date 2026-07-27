import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { JsonLd, MarketingShell, appUrl } from "./MarketingShell";
import {
  type ContentCollection,
  type ContentItem,
  getContentByCollection,
  getContentBySlug,
  getContentClusters,
  getInternalLinkSuggestions,
  getRelatedContent,
  qualityGateSummary
} from "../lib/content";

const collectionLabels: Record<ContentCollection, string> = {
  blog: "Blog",
  docs: "Docs",
  glossary: "Glossary",
  integrations: "Integrations",
  compare: "Compare",
  "use-cases": "Use Cases",
  changelog: "Changelog"
};

export function ContentIndexPage({ collection }: { collection: ContentCollection }) {
  const items = getContentByCollection(collection);
  const clusters = getContentClusters();

  return (
    <MarketingShell>
      <main className="content-index">
        <div className="section-header">
          <p className="marketing-eyebrow">{collectionLabels[collection]}</p>
          <h1>{collectionLabels[collection]} for autonomous QA</h1>
          <p>Human-approved content, documentation, and definitions built from the AISwarmQA product model.</p>
        </div>
        <div className="content-grid">
          {items.map((item) => (
            <ContentCard item={item} key={item.slug} />
          ))}
        </div>
        <section className="cluster-panel">
          <h2>Editorial clusters</h2>
          <div className="cluster-grid">
            {clusters.map((cluster) => (
              <article key={cluster.name}>
                <h3>{cluster.name}</h3>
                <p>{cluster.terms.join(", ")}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}

export function ContentDetailPage({ collection, slug }: { collection: ContentCollection; slug: string }) {
  const item = getContentBySlug(collection, slug);
  if (!item || item.state !== "published") notFound();

  const related = getRelatedContent(item);
  const quality = qualityGateSummary(item);
  const links = getInternalLinkSuggestions(item);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": collection === "docs" ? "TechArticle" : "Article",
    headline: item.title,
    description: item.description,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt,
    author: { "@type": "Organization", name: item.author },
    publisher: { "@type": "Organization", name: "AISwarmQA", url: appUrl("/") },
    mainEntityOfPage: appUrl(`/${collection}/${item.slug}`)
  };

  return (
    <MarketingShell>
      <JsonLd data={articleSchema} />
      <main className="article-page">
        <article>
          <p className="marketing-eyebrow">{collectionLabels[item.collection]} / {item.cluster}</p>
          <h1>{item.title}</h1>
          <p className="article-dek">{item.description}</p>
          <div className="article-meta">
            <span>Updated {item.updatedAt}</span>
            <span>Version {item.contentVersion}</span>
            <span>Quality {quality.score}/100</span>
          </div>
          {item.body.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
        <aside className="article-aside">
          <h2>Editorial record</h2>
          <dl>
            <dt>State</dt>
            <dd>{item.state}</dd>
            <dt>Approved by</dt>
            <dd>{item.approvedBy || "Pending"}</dd>
            <dt>Sources</dt>
            <dd>{item.sourceReferences.join(", ")}</dd>
          </dl>
          <h2>Internal link suggestions</h2>
          <p>Cluster: {links.parentCluster}</p>
          {related.map((relatedItem) => (
            <Link href={`/${relatedItem.collection}/${relatedItem.slug}` as Route} key={relatedItem.slug}>
              {relatedItem.title}
            </Link>
          ))}
        </aside>
      </main>
    </MarketingShell>
  );
}

function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link className="content-card" href={`/${item.collection}/${item.slug}` as Route}>
      <span>{collectionLabels[item.collection]}</span>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <small>
        Read more <ArrowRight aria-hidden="true" size={14} />
      </small>
    </Link>
  );
}
