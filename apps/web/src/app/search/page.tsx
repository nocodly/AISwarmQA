import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { MarketingShell, SectionHeader } from "../../components/MarketingShell";
import { searchContent } from "../../lib/content";

export const metadata: Metadata = {
  title: "Search",
  description: "Search public AISwarmQA docs, blog posts, glossary entries, integrations, comparisons, use cases, and changelog notes."
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = searchContent(q);

  return (
    <MarketingShell>
      <main className="content-index">
        <SectionHeader eyebrow="Search" title="Search AISwarmQA public content" copy="Search covers only public docs, blog, glossary, integrations, comparisons, use cases, and changelog entries." />
        <form className="form" action="/search">
          <label htmlFor="q">Search query</label>
          <input className="input" id="q" name="q" defaultValue={q} placeholder="Try GitHub export or evidence" />
          <button className="cta-button small" type="submit">
            <Search aria-hidden="true" size={16} />
            Search
          </button>
        </form>
        <div className="content-grid" style={{ marginTop: 28 }}>
          {results.map((item) => (
            <Link className="content-card" href={`/${item.collection}/${item.slug}` as Route} key={`${item.collection}-${item.slug}`}>
              <span>{item.collection}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </MarketingShell>
  );
}
