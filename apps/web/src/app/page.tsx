import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties } from "react";
import { BrandIcon, GitHubLogo } from "../components/BrandIcons";
import { InteractiveDemo } from "../components/InteractiveDemo";
import { JsonLd, MarketingShell, SectionHeader, SwarmCore, appUrl } from "../components/MarketingShell";
import { AnimatedCheckmark, BugTrail, ScribbleLabel, SketchBracket, SketchCircle, SketchPath, SketchUnderline } from "../components/Sketch";

const trustSignals = ["Developers", "SaaS teams", "Startup founders", "QA engineers", "GitHub Issues", "Playwright workers"];

const features = [
  ["agent", "Autonomous browser agents", "Explore flows, click controls, inspect runtime signals, and stay inside safety bounds."],
  ["evidence", "Evidence capture", "Attach screenshots, affected routes, state, and durable evidence links to findings."],
  ["github", "GitHub Issue export", "Turn selected findings into structured, ready-to-fix GitHub Issues after confirmation."],
  ["private", "Workspace controls", "Keep audits, repositories, export batches, and evidence scoped to authorized workspaces."],
  ["duplicate", "Audit history", "Track normalized findings, severity, confidence, duplicate state, and export status."],
  ["browser", "Content clarity", "Public docs, glossary, and SEO architecture explain the product without hidden crawler tricks."]
] as const;

const pipelineIcons = ["browser", "agent", "interaction", "bug", "evidence", "github"] as const;
const pipelineTones = ["cyan", "purple", "lime", "orange", "magenta", "lime"] as const;
const transformStages = [
  ["bug", "Finding", "Critical bug normalized"],
  ["screenshot", "Evidence", "Screenshot and trace"],
  ["interaction", "Repro steps", "Repeatable path"],
  ["console", "Expected vs actual", "Behavior delta"],
  ["issue", "Suggested fix", "Repair direction"],
  ["complete", "Acceptance criteria", "Done definition"],
  ["github", "Issue", "Ready to assign"]
] as const;
const personaIcons = ["agent", "browser", "accessibility", "complete"] as const;
const personaTones = ["lime", "cyan", "magenta", "orange"] as const;
const faqIcons = ["browser", "agent", "private", "issue", "github", "evidence", "complete", "screenshot", "interaction", "agent", "private"] as const;
const faqTones = ["cyan", "lime", "purple", "orange", "lime", "cyan", "magenta", "orange", "purple", "lime", "cyan"] as const;

const pricing = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    cta: "Start free audit",
    href: "/projects/new",
    features: ["2 audits/month", "25 pages/audit", "1 concurrent audit", "GitHub export", "7-day evidence retention"]
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "month",
    badge: "Most popular",
    cta: "Start Pro",
    href: "/billing",
    features: ["50 audits/month", "500 pages/audit", "3 concurrent audits", "90-day retention", "Email reports", "Priority queue", "$790/year saves $158"]
  },
  {
    name: "Business",
    price: "Custom",
    cadence: "year",
    cta: "Contact sales",
    href: "/contact",
    features: ["Configurable usage", "Extended retention", "Team and role controls", "Priority support", "Future API access"]
  }
];

const faqs = [
  ["What does AISwarmQA test?", "AISwarmQA tests authorized web application flows through browser exploration, interaction checks, runtime observations, mobile states, accessibility signals, links, and forms."],
  ["Does it replace human QA?", "No. It reduces repetitive discovery and evidence gathering so humans can review, prioritize, and decide what to fix."],
  ["Does it work with authenticated applications?", "Authenticated testing is supported through controlled setup flows and workspace authorization, not uncontrolled public URL submission."],
  ["Does it modify my site?", "Audits are designed for safe browser exploration. Workspaces should only authorize targets where the tested paths are safe to exercise."],
  ["How does GitHub export work?", "A user selects a finding, previews the issue, chooses an authorized repository, confirms export, and AISwarmQA stores the export record."],
  ["What evidence is stored?", "Evidence can include screenshots, affected pages, route metadata, and stable evidence IDs served through AISwarmQA routes."],
  ["Is the audit safe?", "The pipeline uses bounded missions, timeouts, budget checks, workspace authorization, and deterministic fallback."],
  ["How many pages are scanned?", "Free includes 25 pages per audit. Pro includes 500 pages per audit. Business usage is configurable."],
  ["Can I cancel an audit?", "Yes. Audit cancellation is part of the application workflow."],
  ["Can my team use one workspace?", "Yes. Team workspace controls and invitations are part of the SaaS foundation."],
  ["What happens to evidence after retention expires?", "Evidence should be removed or made unavailable according to plan retention settings."]
];

export default function HomePage() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AISwarmQA",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description: "Autonomous AI QA agents that find real bugs before your users do.",
    url: appUrl("/"),
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro monthly", price: "79", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro yearly", price: "790", priceCurrency: "USD" }
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AISwarmQA",
    url: appUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };

  return (
    <MarketingShell>
      <JsonLd data={softwareSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={faqSchema} />
      <main>
        <section className="hero">
          <div className="ambient-grid" aria-hidden="true" />
          <div className="particle-field" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="marketing-eyebrow">Autonomous AI QA agents</p>
              <h1 className="kinetic-headline">
                <span className="headline-line line-one">Autonomous</span>
                <span className="headline-line line-two">AI QA swarm</span>
                <span className="headline-line line-three">
                  finds <span className="kinetic-word">real bugs</span>
                  <SketchCircle className="hero-bug-circle" />
                </span>
                <span className="headline-line line-four">before users do.</span>
                <SketchUnderline className="hero-underline" />
              </h1>
              <p>
                AISwarmQA explores authorized browser flows, normalizes findings, captures evidence, and turns confirmed bugs into ready-to-fix GitHub Issues.
              </p>
              <div className="hero-actions">
                <Link className="cta-button" href="/projects/new">
                  Start free audit
                  <BrandIcon name="agent" tone="lime" />
                </Link>
                <Link className="ghost-button" href="#demo">
                  View sample report
                </Link>
              </div>
              <SketchPath className="cta-sketch-arrow" label="start here" variant="hook" />
              <div className="code-pill">
                <span>const bugs = await AISwarmQA.scan("your-app.com");</span>
              </div>
            </div>
            <div className="hero-visual creative-lab" aria-label="AISwarmQA scanning preview">
              <BugTrail className="hero-bug-trail" />
              <SketchBracket className="agent-bracket" />
              <SwarmCore state="scanning" />
              <div className="floating-card finding-card depth-front tilt-left">
                <BrandIcon name="bug" />
                <span>Finding</span>
                <strong>Checkout button does not complete</strong>
                <small>/checkout - Critical</small>
              </div>
              <div className="floating-card swarm-card depth-mid">
                <BrandIcon name="agent" />
                <strong>Swarm activity</strong>
                <small>Agent #1 scanning</small>
                <small>Agent #3 analyzing</small>
                <small>Agent #7 reporting</small>
              </div>
              <div className="floating-card audit-card depth-back">
                <BrandIcon name="browser" />
                <strong>Live audit</strong>
                <small>64% complete - 28 pages visited</small>
                <i />
              </div>
              <div className="floating-card issue-card depth-front tilt-right">
                <GitHubLogo />
                <strong>GitHub Issue Preview</strong>
                <small>Repro steps, evidence, labels, acceptance criteria</small>
                <AnimatedCheckmark className="issue-check" />
              </div>
              <div className="floating-card evidence-card depth-mid">
                <BrandIcon name="screenshot" />
                <strong>Evidence locked</strong>
                <small>Private storage - stable route</small>
              </div>
              <ScribbleLabel className="caught-label">caught!</ScribbleLabel>
              <SketchPath className="issue-connector" variant="sweep" color="var(--cyan)" />
              <div className="scan-line" />
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Built for">
          {trustSignals.map((signal) => (
            <span className={signal.includes("GitHub") ? "with-github-mark" : ""} key={signal}>
              {signal.includes("GitHub") ? <GitHubLogo /> : null}
              {signal}
            </span>
          ))}
        </section>

        <section className="problem-band sketch-section">
          <div className="qa-annotations problem-notes" aria-hidden="true">
            <span className="qa-note marker-red">cards fell here</span>
            <span className="qa-note marker-lime">align this</span>
            <span className="tiny-bug bug-one">wrong color</span>
          </div>
          <SectionHeader
            eyebrow="Why it matters"
            title="Your users should not be your first QA signal."
            copy="Manual QA is slow, browser bugs are hard to reproduce, and thin bug reports rarely become actionable engineering work."
          />
          <div className="crossed-manual" aria-hidden="true">
            <span>manual QA whack-a-mole</span>
            <SketchPath variant="strike" color="var(--orange)" />
          </div>
          <div className="problem-grid">
            {["Users find broken flows first", "Manual checks miss edge states", "Evidence disappears during triage", "Findings stall before GitHub"].map((item, index) => (
              <article key={item}>
                <BrandIcon name={item.includes("Evidence") ? "evidence" : item.includes("GitHub") ? "github" : "issue"} />
                <h3>{item}</h3>
                <span className="card-bug-note" aria-hidden="true">{["too late", "move this", "proof gone", "blocked"][index]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="pipeline-section">
          <div className="qa-annotations pipeline-notes" aria-hidden="true">
            <span className="qa-note marker-cyan">flow jumps</span>
            <span className="tiny-bug bug-two">button feels off</span>
          </div>
          <SectionHeader
            eyebrow="How it works"
            title="A clear path from URL to issue."
            copy="Every step is bounded, visible, and structured for engineering review."
          />
          <div className="pipeline signature-pipeline">
            <SketchPath className="pipeline-path path-one" variant="arc" color="var(--cyan)" />
            <SketchPath className="pipeline-path path-two" variant="zigzag" color="var(--lime)" delay="0.35s" />
            {["Enter a URL", "Swarm agents", "Browser actions", "Finding", "Evidence", "GitHub Issue"].map((step, index) => (
              <article key={step}>
                <span>{index + 1}</span>
                <h3>{step}</h3>
                {step.includes("GitHub") ? <GitHubLogo /> : null}
                <BrandIcon name={pipelineIcons[index] || "agent"} tone={pipelineTones[index] || "cyan"} />
              </article>
            ))}
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div className="qa-annotations demo-notes" aria-hidden="true">
            <span className="qa-note marker-red">client says fix</span>
            <span className="qa-note marker-lime">needs proof</span>
          </div>
          <SectionHeader
            eyebrow="Interactive demo"
            title="Watch a finding become engineering work."
            copy="A deterministic public simulation. It does not submit visitor URLs to the production audit queue."
          />
          <InteractiveDemo />
        </section>

        <section className="feature-mosaic">
          <div className="qa-annotations feature-notes" aria-hidden="true">
            <span className="qa-note marker-orange">check edge case</span>
            <span className="tiny-bug bug-three">too slow</span>
          </div>
          <SectionHeader
            eyebrow="Product power"
            title="The useful parts of QA automation, wired together."
            copy="Discovery, evidence, workspace safety, billing limits, and export history live in one product flow."
          />
          <div className="feature-grid">
            {features.map(([type, title, copy]) => (
              <article key={title}>
                <BrandIcon name={type} />
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="github-transform">
          <div className="qa-annotations transform-notes" aria-hidden="true">
            <span className="qa-note marker-red">red marker: uneven</span>
            <span className="qa-note marker-cyan">send to GitHub</span>
          </div>
          <div>
            <p className="marketing-eyebrow eyebrow-with-logo">
              <GitHubLogo />
              GitHub transformation
            </p>
            <h2>Finding {"->"} evidence {"->"} reproduction {"->"} suggested fix {"->"} acceptance criteria {"->"} GitHub Issue.</h2>
            <SketchUnderline className="transform-underline" color="var(--magenta)" />
            <p>
              The strongest bug report is not a complaint. It is a compact packet of context that gives engineering enough signal to reproduce, prioritize, fix, and verify.
            </p>
          </div>
          <div className="transform-chain">
            <SketchPath className="transform-arrow arrow-one" variant="sweep" color="var(--cyan)" />
            <SketchPath className="transform-arrow arrow-two" variant="elbow" color="var(--lime)" delay="0.2s" />
            <SketchPath className="transform-arrow arrow-three" variant="hook" color="var(--magenta)" delay="0.35s" />
            {transformStages.map(([icon, title, detail], index) => (
              <span className={`stage-card stage-${index + 1}`} key={title} style={{ "--stage": index } as CSSProperties}>
                {title === "Issue" ? <GitHubLogo /> : <BrandIcon name={icon} tone={pipelineTones[index] || "cyan"} />}
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            ))}
          </div>
        </section>

        <section className="evidence-grid">
          <div className="qa-annotations evidence-notes" aria-hidden="true">
            <span className="qa-note marker-lime">lock evidence</span>
            <span className="tiny-bug bug-four">missing screenshot</span>
          </div>
          <article>
            <BrandIcon name="private" tone="cyan" />
            <h2>Evidence stays private and durable.</h2>
            <SketchPath className="evidence-lock-path" variant="loop" color="var(--cyan)" />
            <p>Stable evidence routes, private storage, revocation, workspace authorization, and retention policies keep bug context useful without exposing raw storage URLs.</p>
          </article>
          <article>
            <BrandIcon name="complete" tone="purple" />
            <h2>Dashboard signals stay realistic.</h2>
            <p>Recent audits, severity summary, scan progress, GitHub exports, duplicate state, and plan usage match the actual AISwarmQA data model.</p>
          </article>
        </section>

        <section className="dashboard-preview">
          <div className="qa-annotations dashboard-notes" aria-hidden="true">
            <span className="qa-note marker-orange">status looks off</span>
          </div>
          <SectionHeader eyebrow="Product UI" title="Built around the audit lifecycle." copy="Preview data mirrors real objects: audits, findings, evidence, exports, plans, and workspaces." />
          <div className="dashboard-frame">
            <div>
              <strong>Live audit</strong>
              <span>Scanning checkout flow</span>
              <i />
            </div>
            <div>
              <strong>Severity</strong>
              <span>1 Critical / 2 High / 4 Medium</span>
              <i />
            </div>
            <div>
              <strong>Exports</strong>
              <span>3 GitHub Issues, 0 duplicates</span>
              <i />
            </div>
          </div>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="qa-annotations pricing-notes" aria-hidden="true">
            <span className="qa-note marker-red">make CTA louder</span>
            <span className="qa-note marker-lime">best value</span>
          </div>
          <SectionHeader
            eyebrow="Pricing"
            title="Start free. Upgrade when QA becomes a release habit."
            copy="The Pro yearly price is exactly 10 monthly payments: $790/year saves $158 compared with twelve $79 monthly payments."
          />
          <div className="pricing-grid">
            {pricing.map((plan) => (
              <article className={plan.badge ? "pricing-card featured" : "pricing-card"} key={plan.name}>
                {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  {plan.price}
                  <span>/{plan.cadence}</span>
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <BrandIcon name="complete" tone={plan.name === "Pro" ? "magenta" : plan.name === "Business" ? "cyan" : "lime"} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link className="cta-button small" href={plan.href as Route}>
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="built-for-section">
          <div className="qa-annotations persona-notes" aria-hidden="true">
            <span className="qa-note marker-cyan">team fits here</span>
            <span className="tiny-bug bug-five">needs contrast</span>
          </div>
          <SectionHeader
            eyebrow="Built for"
            title="No fake logos. Just the teams this is made for."
            copy="Developers, founders, QA engineers, agencies, and SaaS teams that need bug reports with proof."
          />
          <div className="persona-grid">
            {["Solo founders validating launches", "Developers preparing releases", "QA engineers improving triage", "Agencies checking client sites"].map((persona, index) => (
              <article key={persona}>
                <BrandIcon name={personaIcons[index] || "agent"} tone={personaTones[index] || "lime"} />
                {persona}
              </article>
            ))}
          </div>
        </section>

        <section className="faq-section">
          <div className="qa-annotations faq-notes" aria-hidden="true">
            <span className="qa-note marker-orange">answer this first</span>
          </div>
          <SectionHeader eyebrow="FAQ" title="Answers before your first audit." copy="Visible content only. The FAQ schema mirrors these exact questions." />
          <div className="faq-grid">
            {faqs.map(([question, answer], index) => (
              <details key={question}>
                <summary>
                  <BrandIcon name={faqIcons[index] || "issue"} tone={faqTones[index] || "cyan"} />
                  <span>{question}</span>
                  <i aria-hidden="true" />
                </summary>
                <div className="faq-answer">
                  <p>{answer}</p>
                  <span aria-hidden="true">{["clear scope", "human approved", "auth safe", "read-only guard", "GitHub ready", "private proof", "bounded run", "plan limit", "cancel path", "team safe", "retention rule"][index]}</span>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div className="qa-annotations final-notes" aria-hidden="true">
            <span className="qa-note marker-red">ship after fix</span>
            <span className="tiny-bug bug-six">ready to merge</span>
          </div>
          <SwarmCore state="success" />
          <h2>Run your first autonomous QA audit.</h2>
          <p>Find the bug, keep the proof, and turn it into work your team can fix.</p>
          <SketchPath className="final-arrow" label="release the swarm" variant="curl" color="var(--lime)" />
          <div className="hero-actions">
            <Link className="cta-button" href="/projects/new">
              Start free audit
              <BrandIcon name="agent" tone="lime" />
            </Link>
            <Link className="ghost-button" href="#demo">
              View sample report
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
