export type ContentState =
  | "idea"
  | "brief"
  | "draft"
  | "technical_review"
  | "editorial_review"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "archived";

export type ContentCollection = "blog" | "docs" | "glossary" | "integrations" | "compare" | "use-cases" | "changelog";

export type ContentItem = {
  slug: string;
  collection: ContentCollection;
  state: ContentState;
  title: string;
  description: string;
  intent: string;
  cluster: string;
  tags: string[];
  author: string;
  generatedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  sourceReferences: string[];
  contentVersion: string;
  generationModel?: string;
  body: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
};

export const editorialStates: ContentState[] = [
  "idea",
  "brief",
  "draft",
  "technical_review",
  "editorial_review",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "archived"
];

export const contentClusters = [
  { name: "AI QA", terms: ["AI website testing", "autonomous QA agents", "AI QA tools", "AI testing for SaaS", "AI browser testing"] },
  { name: "Browser testing", terms: ["automated browser testing", "Playwright testing", "interaction testing", "browser console errors", "broken workflow detection"] },
  { name: "GitHub workflow", terms: ["GitHub Issue automation", "convert bugs into GitHub Issues", "automated bug reporting", "evidence-rich bug reports", "QA GitHub integration"] },
  { name: "Web quality", terms: ["accessibility testing", "broken link testing", "mobile QA", "form testing", "frontend runtime errors", "checkout flow testing"] },
  { name: "Teams", terms: ["QA for startups", "QA for SaaS teams", "QA for agencies", "QA without a QA team", "release testing for developers"] }
];

export const contentItems: ContentItem[] = [
  {
    slug: "autonomous-qa-agents",
    collection: "blog",
    state: "published",
    title: "What autonomous QA agents should actually do",
    description: "A practical definition of autonomous QA agents: explore browser flows, capture evidence, normalize findings, and keep humans in control.",
    intent: "educational",
    cluster: "AI QA",
    tags: ["AI QA", "Autonomous agents", "Product quality"],
    author: "AISwarmQA Editorial",
    generatedBy: "phase-9b-seo-strategist",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["AISwarmQA product architecture", "Phase 6-8 verification notes"],
    contentVersion: "1.0.0",
    generationModel: "codex-preview",
    body: [
      {
        heading: "Autonomy is useful only when the output is actionable",
        paragraphs: [
          "A QA agent is not valuable because it clicks around a website. It is valuable when it turns observable behavior into clear engineering work.",
          "AISwarmQA treats autonomous exploration as the beginning of the workflow, then validates, normalizes, stores evidence, and asks for confirmation before export."
        ],
        bullets: ["Browser exploration", "Structured findings", "Evidence capture", "Human-approved GitHub export"]
      },
      {
        heading: "The report should be easy to fix",
        paragraphs: ["Every finding should explain severity, category, affected page, reproduction steps, expected behavior, actual behavior, suggested fix, and acceptance criteria."]
      }
    ]
  },
  {
    slug: "getting-started",
    collection: "docs",
    state: "published",
    title: "Getting started with AISwarmQA",
    description: "Create a workspace, run a first audit, review findings, and export one confirmed GitHub Issue.",
    intent: "documentation",
    cluster: "AI QA",
    tags: ["Docs", "Audits", "GitHub"],
    author: "AISwarmQA Docs",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["AISwarmQA production flow"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "Run an audit",
        paragraphs: ["Start with a URL that your workspace is authorized to test. AISwarmQA queues the audit, runs bounded browser missions, and writes findings back to your workspace."]
      },
      {
        heading: "Review before export",
        paragraphs: ["GitHub export is explicit. Select a finding, preview the issue body, choose an authorized repository, and confirm export."]
      }
    ]
  },
  {
    slug: "github-export",
    collection: "docs",
    state: "published",
    title: "GitHub export",
    description: "How AISwarmQA converts a selected finding into a structured GitHub Issue.",
    intent: "documentation",
    cluster: "GitHub workflow",
    tags: ["GitHub", "Issues", "Evidence"],
    author: "AISwarmQA Docs",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["GitHub App integration implementation"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "What goes into an issue",
        paragraphs: ["An exported issue includes severity, category, affected page, reproduction steps, expected behavior, actual behavior, suggested fix, acceptance criteria, labels, and an AISwarmQA metadata marker."]
      },
      {
        heading: "Duplicate prevention",
        paragraphs: ["AISwarmQA stores export records and uses finding fingerprints so retrying the same finding does not create duplicate GitHub Issues."]
      }
    ]
  },
  {
    slug: "ai-qa-agent",
    collection: "glossary",
    state: "published",
    title: "AI QA agent",
    description: "An AI QA agent is a bounded software agent that explores an application, observes quality signals, and reports actionable findings.",
    intent: "definition",
    cluster: "AI QA",
    tags: ["Glossary", "AI QA"],
    author: "AISwarmQA Editorial",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["AISwarmQA terminology"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "Definition",
        paragraphs: ["An AI QA agent uses planning and browser automation to inspect user flows, capture evidence, and produce structured bug reports."]
      }
    ]
  },
  {
    slug: "github-issues",
    collection: "integrations",
    state: "published",
    title: "GitHub Issues integration",
    description: "Connect AISwarmQA to GitHub Issues so approved findings become ready-to-fix engineering work.",
    intent: "integration",
    cluster: "GitHub workflow",
    tags: ["GitHub", "Integrations"],
    author: "AISwarmQA Docs",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["GitHub App export flow"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "What the integration does",
        paragraphs: ["The GitHub App lets AISwarmQA list authorized repositories and create issues only after user confirmation."]
      }
    ]
  },
  {
    slug: "aiswarmqa-vs-manual-qa",
    collection: "compare",
    state: "published",
    title: "AISwarmQA versus manual QA",
    description: "Compare autonomous QA discovery with manual QA triage and see where each approach fits.",
    intent: "comparison",
    cluster: "Teams",
    tags: ["Compare", "Manual QA"],
    author: "AISwarmQA Editorial",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["AISwarmQA product positioning"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "Different jobs",
        paragraphs: ["Manual QA brings judgment, domain context, and exploratory creativity. AISwarmQA adds repeatable browser exploration, evidence capture, and structured export."]
      }
    ]
  },
  {
    slug: "qa-for-saas-startups",
    collection: "use-cases",
    state: "published",
    title: "QA for SaaS startups",
    description: "Run practical QA checks before users encounter broken onboarding, pricing, checkout, or dashboard flows.",
    intent: "use-case",
    cluster: "Teams",
    tags: ["SaaS", "Startups", "QA"],
    author: "AISwarmQA Editorial",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["AISwarmQA use-case map"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "Ship faster with better triage",
        paragraphs: ["AISwarmQA helps small teams find browser issues, preserve evidence, and export only the findings they want to fix."]
      }
    ]
  },
  {
    slug: "phase-9b-preview",
    collection: "changelog",
    state: "published",
    title: "Phase 9B preview",
    description: "AISwarmQA adds the brand landing preview, content platform foundation, and SEO operating system scaffolding.",
    intent: "release-notes",
    cluster: "AI QA",
    tags: ["Changelog", "Brand", "SEO"],
    author: "AISwarmQA Product",
    reviewedBy: "technical-review-required",
    approvedBy: "human-approved-preview",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    publishedAt: "2026-07-27",
    sourceReferences: ["Phase 9A approved design specification"],
    contentVersion: "1.0.0",
    body: [
      {
        heading: "What changed",
        paragraphs: ["The preview introduces the AISwarmQA public brand, Swarm Core visual system, deterministic demo, content metadata, and technical SEO routes."]
      }
    ]
  },
  {
    slug: "programmatic-landing-page-brief",
    collection: "blog",
    state: "draft",
    title: "How to avoid doorway pages in AI-generated SaaS SEO",
    description: "Draft brief for future editorial review. Not published and excluded from sitemap.",
    intent: "editorial-brief",
    cluster: "AI QA",
    tags: ["SEO", "Editorial"],
    author: "AISwarmQA Editorial",
    generatedBy: "phase-9b-seo-strategist",
    createdAt: "2026-07-27",
    updatedAt: "2026-07-27",
    sourceReferences: ["Phase 9B content safety requirements"],
    contentVersion: "0.1.0",
    generationModel: "codex-preview",
    body: [
      {
        heading: "Draft only",
        paragraphs: ["This item demonstrates the editorial workflow and must not be indexed or published without human approval."]
      }
    ]
  }
];

export function getPublishedContent() {
  return contentItems.filter((item) => item.state === "published");
}

export function getContentBySlug(collection: ContentCollection, slug: string) {
  return contentItems.find((item) => item.collection === collection && item.slug === slug);
}

export function getContentByCollection(collection: ContentCollection, includeDrafts = false) {
  return contentItems.filter((item) => item.collection === collection && (includeDrafts || item.state === "published"));
}

export function getContentClusters() {
  return contentClusters;
}

export function getRelatedContent(item: ContentItem) {
  return getPublishedContent()
    .filter((candidate) => candidate.slug !== item.slug && (candidate.cluster === item.cluster || candidate.tags.some((tag) => item.tags.includes(tag))))
    .slice(0, 4);
}

export function searchContent(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getPublishedContent();
  return getPublishedContent().filter((item) =>
    [item.title, item.description, item.cluster, item.intent, ...item.tags].join(" ").toLowerCase().includes(normalized)
  );
}

export function getInternalLinkSuggestions(item: ContentItem) {
  const parentCluster = contentClusters.find((cluster) => cluster.name === item.cluster);
  return {
    parentCluster: parentCluster?.name,
    productLinks: ["/features", "/how-it-works", "/github", "/evidence"].filter((href) =>
      item.description.toLowerCase().includes(href.replace("/", "").replace("-", " "))
    ),
    related: getRelatedContent(item).map((related) => `/${related.collection}/${related.slug}`),
    maxSuggestedLinks: 6
  };
}

export function qualityGateSummary(item: ContentItem) {
  const checks = [
    item.state === "published" ? Boolean(item.approvedBy) : true,
    item.description.length >= 80,
    item.body.length > 0,
    item.sourceReferences.length > 0,
    !item.description.toLowerCase().includes("guaranteed rankings"),
    !item.body.some((section) => section.paragraphs.join(" ").toLowerCase().includes("fake customer"))
  ];

  return {
    score: Math.round((checks.filter(Boolean).length / checks.length) * 100),
    requiresHumanApproval: item.state !== "published" || !item.approvedBy,
    checksPassed: checks.filter(Boolean).length,
    checksTotal: checks.length
  };
}
