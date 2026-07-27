import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { JsonLd, MarketingShell, SectionHeader, SwarmCore, appUrl } from "./MarketingShell";
import type { MarketingPage } from "../lib/marketing-pages";

export function MarketingTopicPage({ page }: { page: MarketingPage }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl("/") },
      { "@type": "ListItem", position: 2, name: page.title, item: appUrl(`/${page.slug}`) }
    ]
  };

  return (
    <MarketingShell>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <main className="topic-page">
        <section className="topic-hero">
          <div>
            <p className="marketing-eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p>{page.summary}</p>
            <div className="hero-actions">
              <Link className="cta-button" href="/projects/new">
                {page.primaryCta}
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link className="ghost-button" href="#details">
                {page.secondaryCta}
              </Link>
            </div>
          </div>
          <div className="topic-orbital">
            <SwarmCore state="idle" />
          </div>
        </section>

        <section className="topic-section-grid" id="details">
          {page.sections.map((section) => (
            <article className="topic-card" key={section.title}>
              <CheckCircle2 aria-hidden="true" size={20} />
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="faq-section">
          <SectionHeader eyebrow="FAQ" title="Straight answers" copy="Visible answers for visitors and valid FAQ structured data for crawlers." />
          <div className="faq-grid">
            {page.faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="related-strip">
          <strong>Related paths</strong>
          {page.related.map((item) => (
            <Link href={item.href as Route} key={item.href}>
              {item.label}
            </Link>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
