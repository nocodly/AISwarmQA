import { createHash } from "node:crypto";

export type GitHubIssueFinding = {
  id: string;
  auditId: string;
  title: string;
  summary: string;
  description: string;
  severity: string;
  category: string;
  affectedUrl: string;
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  confidence: number;
  sourceMissionTypes: string[];
  occurrenceCount: number;
  evidence: Array<{
    id: string;
    type: string;
    content: string | null;
    localPath: string | null;
    metadata: unknown;
  }>;
};

export type GitHubIssueDraft = {
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  milestone?: number;
};

export type GitHubCreateIssueInput = GitHubIssueDraft & {
  owner: string;
  repo: string;
  idempotencyKey: string;
};

export type GitHubCreateIssueResult = {
  number: number;
  url: string;
  alreadyExists?: boolean;
};

export type GitHubProvider = {
  createIssue(input: GitHubCreateIssueInput): Promise<GitHubCreateIssueResult>;
};

export class GitHubProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "GitHubProviderError";
  }
}

export class MockGitHubProvider implements GitHubProvider {
  async createIssue(input: GitHubCreateIssueInput): Promise<GitHubCreateIssueResult> {
    const hash = createHash("sha256").update(input.idempotencyKey).digest("hex");
    const issueNumber = Number.parseInt(hash.slice(0, 6), 16) % 9000 + 1000;
    return {
      number: issueNumber,
      url: `https://github.com/${input.owner}/${input.repo}/issues/${issueNumber}`
    };
  }
}

export class UnconfiguredGitHubProvider implements GitHubProvider {
  async createIssue(): Promise<GitHubCreateIssueResult> {
    throw new GitHubProviderError("GITHUB_APP_NOT_CONFIGURED", "GitHub App credentials are not configured.", false);
  }
}

export function classifyGitHubError(statusCode?: number): { retryable: boolean; code: string } {
  if (statusCode === 429) return { retryable: true, code: "RATE_LIMITED" };
  if (statusCode && statusCode >= 500) return { retryable: true, code: "GITHUB_UNAVAILABLE" };
  if (statusCode === 401 || statusCode === 403) return { retryable: false, code: "ACCESS_DENIED" };
  if (statusCode === 404) return { retryable: false, code: "REPOSITORY_NOT_FOUND" };
  if (statusCode === 410) return { retryable: false, code: "INSTALLATION_REVOKED" };
  if (statusCode && statusCode >= 400) return { retryable: false, code: "VALIDATION_FAILED" };
  return { retryable: true, code: "NETWORK_ERROR" };
}

export function sanitizeUrlForIssue(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret|password|auth|session|code/i.test(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    url.hash = "";
    return url.toString();
  } catch {
    return "Unavailable";
  }
}

export function markdownEscape(input: string): string {
  return input.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

export function severityLabel(severity: string): string {
  return `severity:${severity.toLowerCase()}`;
}

export function categoryLabel(category: string): string {
  const normalized = category.toLowerCase().replace(/_/g, "-");
  const map: Record<string, string> = {
    functional: "interaction",
    accessibility: "accessibility",
    performance: "performance",
    ux: "mobile",
    security: "security",
    network: "broken-link",
    console: "javascript"
  };
  return map[normalized] ?? "other";
}

export function defaultLabelsForFinding(finding: Pick<GitHubIssueFinding, "severity" | "category">): string[] {
  return ["aiswarmqa", severityLabel(finding.severity), categoryLabel(finding.category)];
}

export function safeExternalFindingId(findingId: string): string {
  return createHash("sha256").update(findingId).digest("hex").slice(0, 24);
}

export function buildGitHubExportIdempotencyKey(input: {
  workspaceId: string;
  repositoryFullName: string;
  auditId: string;
  findingId: string;
  exportVersion?: string;
}): string {
  return createHash("sha256")
    .update([input.workspaceId, input.repositoryFullName.toLowerCase(), input.auditId, input.findingId, input.exportVersion ?? "v1"].join(":"))
    .digest("hex");
}

export function buildIssueTitle(finding: Pick<GitHubIssueFinding, "severity" | "title">): string {
  const severity = finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1).toLowerCase();
  const title = finding.title.replace(/\s+/g, " ").trim();
  return `[${severity}] ${title}`.slice(0, 240);
}

function formatEvidence(finding: GitHubIssueFinding, evidenceBaseUrl?: string): string {
  if (finding.evidence.length === 0) {
    return "No external evidence artifact is available for this finding yet.";
  }
  return finding.evidence
    .slice(0, 5)
    .map((item, index) => {
      const lines = [`${index + 1}. Type: ${markdownEscape(item.type)}`];
      if (item.content) lines.push(`   Content: ${markdownEscape(item.content.slice(0, 500))}`);
      if (item.localPath && evidenceBaseUrl) {
        const evidenceUrl = `${evidenceBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(item.id)}`;
        lines.push(`   Evidence link: ${evidenceUrl}`);
        if (item.type === "screenshot") lines.push(`   ![AISwarmQA evidence](${evidenceUrl})`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function buildIssueBody(input: {
  finding: GitHubIssueFinding;
  auditDate: string;
  toolVersion: string;
  evidenceBaseUrl?: string;
}): string {
  const finding = input.finding;
  const marker = `<!-- aiswarmqa:finding:${safeExternalFindingId(finding.id)} -->`;
  const steps = finding.stepsToReproduce.length > 0 ? finding.stepsToReproduce : [`Open ${sanitizeUrlForIssue(finding.affectedUrl)}.`];
  return `${marker}

## Summary

${finding.summary}

## Severity

${finding.severity}

## Category

${finding.category}

## Affected page

${sanitizeUrlForIssue(finding.affectedUrl)}

## Affected element

${finding.description || "AISwarmQA did not record a specific selector for this finding."}

## Steps to reproduce

${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Expected behavior

${finding.expectedBehavior}

## Actual behavior

${finding.actualBehavior}

## Evidence

${formatEvidence(finding, input.evidenceBaseUrl)}

## Suggested fix

Review the affected page and fix the behavior described above. The recommendation is based on audit evidence and should be verified in the application code before release.

## Acceptance criteria

- [ ] The issue can no longer be reproduced.
- [ ] Relevant automated test is added or updated.
- [ ] The fix works on the affected page.
- [ ] No related regression is introduced.

## AISwarmQA metadata

- Audit ID: ${finding.auditId}
- Finding marker: ${safeExternalFindingId(finding.id)}
- Audit date: ${input.auditDate}
- Agent or mission: ${finding.sourceMissionTypes.join(", ") || "unknown"}
- Confidence score: ${Math.round(finding.confidence * 100)}%
- Tool version: ${input.toolVersion}

Created from an AISwarmQA audit.`;
}

export function buildIssueDraft(input: {
  finding: GitHubIssueFinding;
  auditDate: string;
  toolVersion: string;
  labelNames?: string[];
  assignees?: string[];
  milestoneNumber?: number;
  evidenceBaseUrl?: string;
}): GitHubIssueDraft {
  return {
    title: buildIssueTitle(input.finding),
    body: buildIssueBody({
      finding: input.finding,
      auditDate: input.auditDate,
      toolVersion: input.toolVersion,
      ...(input.evidenceBaseUrl ? { evidenceBaseUrl: input.evidenceBaseUrl } : {})
    }),
    labels: [...new Set([...defaultLabelsForFinding(input.finding), ...(input.labelNames ?? [])])],
    assignees: input.assignees ?? [],
    ...(typeof input.milestoneNumber === "number" ? { milestone: input.milestoneNumber } : {})
  };
}

export function createGitHubProvider(config: { appConfigured: boolean; mock?: boolean }): GitHubProvider {
  if (config.mock) return new MockGitHubProvider();
  if (!config.appConfigured) return new UnconfiguredGitHubProvider();
  return new UnconfiguredGitHubProvider();
}
