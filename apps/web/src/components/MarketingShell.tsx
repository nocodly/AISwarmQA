import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { BookOpen, GitPullRequestArrow, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";

const navGroups = [
  {
    label: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/github", label: "GitHub export" },
      { href: "/evidence", label: "Evidence" }
    ]
  },
  {
    label: "Solutions",
    links: [
      { href: "/browser-testing", label: "Browser testing" },
      { href: "/playwright-testing", label: "Playwright testing" },
      { href: "/accessibility-testing", label: "Accessibility" },
      { href: "/mobile-testing", label: "Mobile QA" }
    ]
  },
  {
    label: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Docs" },
      { href: "/compare", label: "Compare" },
      { href: "/glossary", label: "Glossary" }
    ]
  }
];

export function BrandWordmark() {
  return (
    <Link className="brand-wordmark" href="/" aria-label="AISwarmQA home">
      <span className="wordmark-ai">AI</span>
      <span className="wordmark-swarm">Swarm</span>
      <span className="wordmark-qa">QA</span>
      <span className="wordmark-spark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </Link>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-shell">
      <header className="site-header">
        <BrandWordmark />
        <nav className="site-nav" aria-label="Primary">
          {navGroups.map((group) => (
            <div className="nav-cluster" key={group.label}>
              <button type="button">{group.label}</button>
              <div className="nav-popover">
                {group.links.map((link) => (
                  <Link href={link.href as Route} key={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link href={"/docs" as Route}>Docs</Link>
          <Link href={"/pricing" as Route}>Pricing</Link>
        </nav>
        <div className="site-actions">
          <Link className="ghost-link" href="/dashboard">
            Sign in
          </Link>
          <Link className="cta-button small" href="/projects/new">
            Start free
          </Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">
            <Menu aria-hidden="true" size={22} />
          </summary>
          <div>
            {[...navGroups.flatMap((group) => group.links), { href: "/docs", label: "Docs" }, { href: "/pricing", label: "Pricing" }, { href: "/dashboard", label: "Sign in" }].map((link) => (
              <Link href={link.href as Route} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      </header>
      {children}
      <footer className="site-footer">
        <div>
          <BrandWordmark />
          <p>Autonomous AI QA agents that find real bugs before your users do.</p>
        </div>
        <div className="footer-grid">
          <FooterColumn title="Product" links={["Features", "How it works", "GitHub", "Evidence", "Pricing"]} />
          <FooterColumn title="Resources" links={["Docs", "Blog", "Compare", "Integrations", "Use cases", "Glossary"]} />
          <FooterColumn title="Company" links={["About", "Contact", "Status", "Privacy", "Terms", "Imprint"]} />
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  const hrefFor = (label: string) => {
    if (label === "GitHub") return "/github";
    if (label === "Use cases") return "/use-cases";
    return `/${label.toLowerCase().replace(/\s+/g, "-")}`;
  };

  return (
    <div className="footer-column">
      <strong>{title}</strong>
      {links.map((label) => (
        <Link href={hrefFor(label) as Route} key={label}>
          {label}
        </Link>
      ))}
    </div>
  );
}

export function SwarmCore({ state = "scanning" }: { state?: "idle" | "scanning" | "detected" | "evidence" | "exported" | "success" | "warning" | "sleeping" }) {
  return (
    <div className={`swarm-core ${state}`} aria-hidden="true">
      <div className="agent-orbit orbit-a" />
      <div className="agent-orbit orbit-b" />
      <div className="core-wing wing-left" />
      <div className="core-wing wing-right" />
      <div className="core-body">
        <div className="core-face">
          <span />
          <span />
        </div>
      </div>
      <div className="core-signal signal-a" />
      <div className="core-signal signal-b" />
      <div className="core-shadow" />
    </div>
  );
}

export function FeatureIcon({ type }: { type: "agents" | "evidence" | "github" | "security" | "docs" | "search" }) {
  const iconProps = { size: 20, "aria-hidden": true };
  if (type === "github") return <GitPullRequestArrow {...iconProps} />;
  if (type === "security") return <ShieldCheck {...iconProps} />;
  if (type === "docs") return <BookOpen {...iconProps} />;
  if (type === "search") return <Search {...iconProps} />;
  return <Sparkles {...iconProps} />;
}

export function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="section-header">
      <p className="marketing-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function appUrl(path = "") {
  const base = process.env.APP_URL || "https://ai-swarm-qaweb-production.up.railway.app";
  return `${base.replace(/\/$/, "")}${path}`;
}
