export type MarketingPage = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  primaryCta: string;
  secondaryCta: string;
  sections: Array<{ title: string; body: string; bullets: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  related: Array<{ href: string; label: string }>;
  updatedAt: string;
};

export const marketingPages: MarketingPage[] = [
  {
    slug: "features",
    title: "Autonomous QA features built for shipping teams",
    eyebrow: "Product",
    summary: "AISwarmQA combines browser exploration, structured findings, durable evidence, and GitHub export in one workflow.",
    primaryCta: "Start free audit",
    secondaryCta: "View sample report",
    updatedAt: "2026-07-27",
    sections: [
      {
        title: "Autonomous browser agents",
        body: "Agents explore pages, click through workflows, observe runtime behavior, and keep every mission bounded by safety limits.",
        bullets: ["Multi-agent planning", "Bounded browser missions", "Console and network observations"]
      },
      {
        title: "Evidence-rich findings",
        body: "Every useful issue is normalized into severity, category, affected page, reproduction steps, expected behavior, actual behavior, and a suggested fix.",
        bullets: ["Screenshots and traces", "Stable evidence routes", "Duplicate fingerprints"]
      },
      {
        title: "Ready-to-fix GitHub Issues",
        body: "Approved findings can become GitHub Issues with labels, metadata markers, acceptance criteria, and duplicate prevention.",
        bullets: ["Repository selection controls", "Explicit export confirmation", "Issue history in AISwarmQA"]
      }
    ],
    faqs: [
      { question: "Does AISwarmQA replace human QA?", answer: "No. It reduces repetitive discovery work and gives humans better evidence for triage." },
      { question: "Can it test authenticated applications?", answer: "Authenticated testing is supported through controlled setup flows and workspace authorization." }
    ],
    related: [
      { href: "/github", label: "GitHub export" },
      { href: "/evidence", label: "Evidence" },
      { href: "/docs", label: "Documentation" }
    ]
  },
  {
    slug: "how-it-works",
    title: "From URL to actionable bug report",
    eyebrow: "Workflow",
    summary: "Enter a URL, let the agents explore, review normalized findings, then export the issues your team wants to fix.",
    primaryCta: "Start free audit",
    secondaryCta: "See the demo",
    updatedAt: "2026-07-27",
    sections: [
      { title: "1. Enter a URL", body: "AISwarmQA starts with an explicit audit target and authorization context.", bullets: ["Target URL", "Workspace ownership", "Plan limits"] },
      { title: "2. Agents explore", body: "Browser agents visit pages, interact with controls, and capture observable failures.", bullets: ["Navigation", "Forms", "Responsive states"] },
      { title: "3. Findings become work", body: "The platform normalizes, deduplicates, and exports findings when a user confirms them.", bullets: ["Evidence", "GitHub Issues", "Audit history"] }
    ],
    faqs: [
      { question: "Does AISwarmQA modify my site?", answer: "The public audit workflow is designed for safe exploration. Destructive actions should be excluded from authorized targets." },
      { question: "Can I cancel an audit?", answer: "Yes. Audits expose cancellation controls in the application workflow." }
    ],
    related: [
      { href: "/features", label: "Features" },
      { href: "/browser-testing", label: "Browser testing" },
      { href: "/pricing", label: "Pricing" }
    ]
  },
  {
    slug: "github",
    title: "Turn QA findings into ready-to-fix GitHub Issues",
    eyebrow: "Integration",
    summary: "AISwarmQA turns one selected finding into a structured issue with reproduction steps, evidence, acceptance criteria, and an AISwarmQA metadata marker.",
    primaryCta: "Connect GitHub",
    secondaryCta: "Read export docs",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Repository-aware export", body: "Only authorized repositories are shown, and repositories that cannot receive issues are blocked before a job is created.", bullets: ["GitHub App installation", "Repository metadata checks", "Workspace access enforcement"] },
      { title: "Duplicate prevention", body: "Findings carry deterministic fingerprints so retries do not create repeated GitHub Issues for the same problem.", bullets: ["Issue URL persistence", "Batch status", "Retry safety"] },
      { title: "Clear issue body", body: "Issue bodies include the engineering details needed to reproduce and fix the problem.", bullets: ["Severity and category", "Affected page", "Expected versus actual behavior"] }
    ],
    faqs: [
      { question: "Do exports require confirmation?", answer: "Yes. AISwarmQA requires explicit confirmation before creating a real issue." },
      { question: "Are GitHub tokens exposed?", answer: "No. Installation tokens are server-side only and never printed in public UI." }
    ],
    related: [
      { href: "/docs/github-export", label: "GitHub export docs" },
      { href: "/evidence", label: "Evidence" },
      { href: "/compare", label: "Compare" }
    ]
  },
  {
    slug: "evidence",
    title: "Private evidence your team can actually use",
    eyebrow: "Evidence",
    summary: "Screenshots, routes, metadata, and retention controls give every finding a clear chain from browser behavior to engineering work.",
    primaryCta: "Start free audit",
    secondaryCta: "View evidence model",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Stable evidence routes", body: "GitHub Issues link to stable AISwarmQA evidence routes instead of raw temporary storage URLs.", bullets: ["Public evidence IDs", "Workspace checks", "Generic invalid 404s"] },
      { title: "Private storage", body: "Evidence is stored in private Supabase Storage and served through application-controlled routes.", bullets: ["No raw storage credentials", "Revocation support", "Retention policies"] },
      { title: "Actionable context", body: "Evidence is attached to normalized findings so reviewers know what happened and where.", bullets: ["Screenshot context", "Affected page", "Reproduction steps"] }
    ],
    faqs: [
      { question: "What evidence is stored?", answer: "AISwarmQA can store screenshots, structured finding metadata, and route references needed for triage." },
      { question: "What happens after retention expires?", answer: "Evidence should be deleted or made unavailable according to the workspace plan and retention settings." }
    ],
    related: [
      { href: "/github", label: "GitHub export" },
      { href: "/features", label: "Features" },
      { href: "/privacy", label: "Privacy" }
    ]
  },
  {
    slug: "browser-testing",
    title: "Autonomous browser testing for real user flows",
    eyebrow: "Solution",
    summary: "Test the states users actually touch: navigation, forms, checkout, menus, links, runtime errors, and mobile layouts.",
    primaryCta: "Start browser audit",
    secondaryCta: "See how it works",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Explore like a user", body: "AISwarmQA agents interact with your application through a real browser instead of only checking static HTML.", bullets: ["Clicks and navigation", "Form paths", "Console errors"] },
      { title: "Bounded by design", body: "Missions use safety limits, budgets, and deterministic fallback so audits do not run forever.", bullets: ["Timeouts", "Budget checks", "Replay support"] },
      { title: "Report what matters", body: "Noise is reduced through normalization, severity, confidence, and duplicate fingerprints.", bullets: ["Critical paths", "Evidence", "Engineering-ready output"] }
    ],
    faqs: [
      { question: "Can it scan any public URL?", answer: "The production app should only scan targets the workspace is authorized to test." },
      { question: "Does it use Playwright?", answer: "AISwarmQA uses browser automation in its worker pipeline, including Playwright-based checks." }
    ],
    related: [
      { href: "/playwright-testing", label: "Playwright testing" },
      { href: "/mobile-testing", label: "Mobile QA" },
      { href: "/accessibility-testing", label: "Accessibility" }
    ]
  },
  {
    slug: "playwright-testing",
    title: "Playwright-powered QA with AI planning",
    eyebrow: "Solution",
    summary: "Use deterministic browser automation and AI planning together: scripts provide control, agents provide discovery.",
    primaryCta: "Start free audit",
    secondaryCta: "Read docs",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Beyond scripted happy paths", body: "AISwarmQA can inspect states that hand-written tests often miss, then present reproducible findings.", bullets: ["Exploration", "Runtime signals", "Evidence capture"] },
      { title: "Complements existing tests", body: "It helps your team discover gaps before investing in permanent test coverage.", bullets: ["Fast triage", "Regression clues", "GitHub-ready bugs"] },
      { title: "Designed for CI-minded teams", body: "Audit outputs are structured for repeatability, storage, and future automation.", bullets: ["Normalized schema", "Deterministic fingerprints", "Export history"] }
    ],
    faqs: [
      { question: "Should I replace my Playwright tests?", answer: "No. AISwarmQA helps find what to test and gives evidence for new regression coverage." },
      { question: "Can findings become tests?", answer: "The report provides reproduction steps and acceptance criteria that can guide future tests." }
    ],
    related: [
      { href: "/browser-testing", label: "Browser testing" },
      { href: "/docs", label: "Docs" },
      { href: "/github", label: "GitHub export" }
    ]
  },
  {
    slug: "accessibility-testing",
    title: "Accessibility signals inside every audit",
    eyebrow: "Solution",
    summary: "Catch keyboard, focus, mobile, and semantic issues before they turn into user frustration or release risk.",
    primaryCta: "Start accessibility audit",
    secondaryCta: "View sample report",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Practical accessibility findings", body: "AISwarmQA reports observable issues such as focus traps, missing affordances, and layout failures.", bullets: ["Keyboard path checks", "Mobile menus", "Semantic hints"] },
      { title: "Evidence for review", body: "Screenshots and reproduction steps help teams understand the user impact quickly.", bullets: ["Affected page", "Actual behavior", "Suggested fix"] },
      { title: "Built into QA flow", body: "Accessibility is treated as part of product quality, not a detached report.", bullets: ["Severity", "GitHub labels", "Workspace history"] }
    ],
    faqs: [
      { question: "Is this a full WCAG audit?", answer: "No. AISwarmQA provides automated signals and evidence, but expert human review remains important." },
      { question: "Can it find keyboard issues?", answer: "Yes, keyboard and focus issues are part of the intended browser-audit signal set." }
    ],
    related: [
      { href: "/mobile-testing", label: "Mobile QA" },
      { href: "/evidence", label: "Evidence" },
      { href: "/features", label: "Features" }
    ]
  },
  {
    slug: "mobile-testing",
    title: "Mobile QA checks for responsive product flows",
    eyebrow: "Solution",
    summary: "Audit compact layouts, touch targets, mobile navigation, and responsive breakpoints before your users report them.",
    primaryCta: "Start mobile audit",
    secondaryCta: "See workflow",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Responsive states", body: "Agents inspect important flows across mobile-like viewport states.", bullets: ["Navigation", "Forms", "Pricing and checkout"] },
      { title: "Evidence captured", body: "Findings keep the page and viewport context attached for faster triage.", bullets: ["Screenshots", "Affected route", "Reproduction steps"] },
      { title: "Actionable export", body: "Mobile findings can be exported into GitHub with labels and acceptance criteria.", bullets: ["Severity", "Labels", "Duplicate prevention"] }
    ],
    faqs: [
      { question: "Does mobile QA replace device testing?", answer: "No. It catches common responsive and interaction issues before manual device review." },
      { question: "Can it check checkout flows?", answer: "Yes, when the workspace provides a safe authorized test target." }
    ],
    related: [
      { href: "/browser-testing", label: "Browser testing" },
      { href: "/accessibility-testing", label: "Accessibility" },
      { href: "/github", label: "GitHub export" }
    ]
  },
  {
    slug: "pricing",
    title: "Pricing that starts free and scales with audit volume",
    eyebrow: "Pricing",
    summary: "Run early audits for free, then upgrade when your team needs more pages, more concurrency, longer retention, and priority execution.",
    primaryCta: "Start free audit",
    secondaryCta: "Contact sales",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Free", body: "$0 forever for small validation runs and first product checks.", bullets: ["2 audits/month", "25 pages/audit", "7-day evidence retention"] },
      { title: "Pro", body: "$79/month or $790/year. Yearly pricing equals 10 monthly payments, saving $158 versus twelve monthly payments.", bullets: ["50 audits/month", "500 pages/audit", "3 concurrent audits"] },
      { title: "Business", body: "Custom limits, retention, support, and team controls for larger organizations.", bullets: ["Configurable usage", "Extended retention", "Priority support"] }
    ],
    faqs: [
      { question: "Is the yearly saving accurate?", answer: "Yes. Twelve monthly Pro payments cost $948, while yearly Pro is $790, a $158 saving." },
      { question: "Do billing routes exist?", answer: "Yes. Pricing CTAs connect to the existing AISwarmQA audit and billing routes." }
    ],
    related: [
      { href: "/billing", label: "Billing dashboard" },
      { href: "/features", label: "Features" },
      { href: "/contact", label: "Contact" }
    ]
  },
  {
    slug: "about",
    title: "AISwarmQA is built for teams that ship fast",
    eyebrow: "Company",
    summary: "The product turns autonomous QA exploration into practical engineering work instead of vague bug reports.",
    primaryCta: "Start free audit",
    secondaryCta: "Read docs",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Why it exists", body: "Small teams ship quickly, but real browser bugs often appear after users touch the product.", bullets: ["Faster discovery", "Better evidence", "Less triage drag"] },
      { title: "What it values", body: "AISwarmQA favors safety, clarity, repeatability, and human approval over uncontrolled automation.", bullets: ["Bounded agents", "Explicit exports", "Workspace authorization"] },
      { title: "Who it helps", body: "Developers, founders, QA engineers, agencies, and SaaS teams can use it to find issues sooner.", bullets: ["Product teams", "Release owners", "Customer-facing apps"] }
    ],
    faqs: [
      { question: "Is AISwarmQA fully autonomous?", answer: "It automates discovery and reporting, while important actions such as GitHub export require user confirmation." },
      { question: "Is the brand final?", answer: "This Phase 9B implementation is a preview awaiting design approval before production launch." }
    ],
    related: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/contact", label: "Contact" }
    ]
  },
  {
    slug: "contact",
    title: "Contact AISwarmQA",
    eyebrow: "Contact",
    summary: "Talk to the team about audits, GitHub workflows, production QA, or Business plan requirements.",
    primaryCta: "Open dashboard",
    secondaryCta: "View pricing",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Product questions", body: "Use the app to start an audit or review billing. Business inquiries can use the contact path once the commercial inbox is configured.", bullets: ["Plans", "Retention", "Workspace needs"] },
      { title: "Technical questions", body: "Docs explain the audit model, GitHub export, evidence routes, and security posture.", bullets: ["Docs", "GitHub App", "Evidence"] },
      { title: "Launch status", body: "This page is part of the Phase 9B preview and should be wired to a formal contact channel before production approval.", bullets: ["No fake inbox", "No invented SLA", "No hidden form"] }
    ],
    faqs: [
      { question: "Is there a sales email?", answer: "A production sales contact should be configured before launch." },
      { question: "Can I start without talking to sales?", answer: "Yes. The Free and Pro flows are designed for self-serve usage." }
    ],
    related: [
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "Docs" },
      { href: "/status", label: "Status" }
    ]
  },
  {
    slug: "status",
    title: "AISwarmQA status",
    eyebrow: "Operations",
    summary: "Public health signals for the application, database, queue, worker, and integrations should be visible before production launch.",
    primaryCta: "Check app health",
    secondaryCta: "Read docs",
    updatedAt: "2026-07-27",
    sections: [
      { title: "Current preview status", body: "This Phase 9B page describes the status architecture without inventing uptime history.", bullets: ["App health", "Database health", "Worker health"] },
      { title: "Production checks", body: "AISwarmQA already exposes health routes that can be connected to a public status experience.", bullets: ["/api/health", "/api/health/database", "Worker logs"] },
      { title: "Next step", body: "Wire an operational status provider or a signed internal status summary before launch.", bullets: ["No fake incidents", "No fake uptime", "Clear operational language"] }
    ],
    faqs: [
      { question: "Is this a live incident page?", answer: "No. It is a preview status page and should not claim live uptime until wired to production monitoring." },
      { question: "Does AISwarmQA have health endpoints?", answer: "Yes. The app exposes health routes for production verification." }
    ],
    related: [
      { href: "/docs", label: "Docs" },
      { href: "/contact", label: "Contact" },
      { href: "/features", label: "Features" }
    ]
  }
];

export function getMarketingPage(slug: string) {
  return marketingPages.find((page) => page.slug === slug);
}

export const publishedMarketingRoutes = marketingPages.map((page) => `/${page.slug}`);
