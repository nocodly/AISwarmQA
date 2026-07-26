import { createHash, createHmac, createSign, randomBytes, timingSafeEqual } from "node:crypto";

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
  installationId?: string;
};

export type GitHubCreateIssueResult = {
  number: number;
  url: string;
  alreadyExists?: boolean;
};

export type GitHubRepositoryMetadata = {
  githubRepositoryId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string | null;
  private: boolean;
  issuesEnabled: boolean;
  archived: boolean;
  accountLogin: string;
  accountType: "USER" | "ORGANIZATION";
};

export type GitHubMilestoneMetadata = {
  number: number;
  title: string;
  state: string;
};

export type GitHubProvider = {
  listRepositories?(installationId: string): Promise<GitHubRepositoryMetadata[]>;
  getRepository?(installationId: string, owner: string, repo: string): Promise<GitHubRepositoryMetadata>;
  listLabels?(installationId: string, owner: string, repo: string): Promise<string[]>;
  listAssignableUsers?(installationId: string, owner: string, repo: string): Promise<string[]>;
  listMilestones?(installationId: string, owner: string, repo: string): Promise<GitHubMilestoneMetadata[]>;
  findIssueByMarker?(input: { owner: string; repo: string; marker: string; installationId?: string }): Promise<GitHubCreateIssueResult | null>;
  createIssue(input: GitHubCreateIssueInput): Promise<GitHubCreateIssueResult>;
};

export class GitHubProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
    readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "GitHubProviderError";
  }
}

export const defaultGitHubLabelNames = [
  "aiswarmqa",
  "severity:critical",
  "severity:high",
  "severity:medium",
  "severity:low",
  "accessibility",
  "broken-link",
  "form",
  "mobile",
  "performance",
  "interaction",
  "javascript",
  "security"
];

export class MockGitHubProvider implements GitHubProvider {
  async listRepositories(): Promise<GitHubRepositoryMetadata[]> {
    return [
      {
        githubRepositoryId: "mock-repo",
        owner: "mock-owner",
        name: "mock-repo",
        fullName: "mock-owner/mock-repo",
        defaultBranch: "main",
        private: true,
        issuesEnabled: true,
        archived: false,
        accountLogin: "mock-owner",
        accountType: "USER"
      }
    ];
  }

  async getRepository(): Promise<GitHubRepositoryMetadata> {
    return (await this.listRepositories())[0]!;
  }

  async listLabels(): Promise<string[]> {
    return defaultGitHubLabelNames;
  }

  async listAssignableUsers(): Promise<string[]> {
    return [];
  }

  async listMilestones(): Promise<GitHubMilestoneMetadata[]> {
    return [];
  }

  async findIssueByMarker(): Promise<GitHubCreateIssueResult | null> {
    return null;
  }

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

export function classifyGitHubError(statusCode?: number, headers?: Headers): { retryable: boolean; code: string; retryAfterMs?: number } {
  const retryAfter = headers?.get("retry-after");
  const reset = headers?.get("x-ratelimit-reset");
  const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : reset ? Math.max(0, Number(reset) * 1000 - Date.now()) : undefined;
  if (statusCode === 429) return { retryable: true, code: "RATE_LIMITED", ...(typeof retryAfterMs === "number" ? { retryAfterMs } : {}) };
  if (statusCode === 403 && headers?.get("x-ratelimit-remaining") === "0") {
    return { retryable: true, code: "RATE_LIMITED", ...(typeof retryAfterMs === "number" ? { retryAfterMs } : {}) };
  }
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

export function findingMarker(findingId: string): string {
  return `<!-- aiswarmqa:finding:${safeExternalFindingId(findingId)} -->`;
}

export function extractFindingMarker(body: string): string | null {
  return body.match(/<!--\s*aiswarmqa:finding:[a-f0-9]{24}\s*-->/i)?.[0] ?? null;
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
      } else if (item.type === "screenshot") {
        lines.push("   Screenshot evidence exists but external evidence sharing is not configured.");
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
  const steps = finding.stepsToReproduce.length > 0 ? finding.stepsToReproduce : [`Open ${sanitizeUrlForIssue(finding.affectedUrl)}.`];
  return `${findingMarker(finding.id)}

## Summary

${markdownEscape(finding.summary)}

## Severity

${markdownEscape(finding.severity)}

## Category

${markdownEscape(finding.category)}

## Affected page

${sanitizeUrlForIssue(finding.affectedUrl)}

## Affected element

${markdownEscape(finding.description || "AISwarmQA did not record a specific selector for this finding.")}

## Steps to reproduce

${steps.map((step, index) => `${index + 1}. ${markdownEscape(step)}`).join("\n")}

## Expected behavior

${markdownEscape(finding.expectedBehavior)}

## Actual behavior

${markdownEscape(finding.actualBehavior)}

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
- Occurrences: ${finding.occurrenceCount}
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

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function normalizeGitHubPrivateKey(input: string): string {
  return input.includes("\\n") ? input.replace(/\\n/g, "\n") : input;
}

export function createGitHubAppJwt(input: { appId: string; privateKey: string; nowMs?: number }): string {
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: nowSeconds - 60, exp: nowSeconds + 9 * 60, iss: input.appId };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(normalizeGitHubPrivateKey(input.privateKey), "base64url")}`;
}

async function parseGitHubResponse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  const classified = classifyGitHubError(response.status, response.headers);
  let message = `GitHub API request failed with HTTP ${response.status}.`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    // Keep the generic safe message.
  }
  throw new GitHubProviderError(classified.code, message, classified.retryable, classified.retryAfterMs);
}

export class GitHubAppProvider implements GitHubProvider {
  constructor(
    private readonly config: {
      appId: string;
      privateKey: string;
      apiBaseUrl?: string;
      requestTimeoutMs?: number;
    }
  ) {}

  private get apiBaseUrl(): string {
    return this.config.apiBaseUrl ?? "https://api.github.com";
  }

  private async request<T>(path: string, options: RequestInit & { token: string }): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs ?? 20000);
    try {
      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          authorization: `Bearer ${options.token}`,
          ...(options.headers ?? {})
        }
      });
      return await parseGitHubResponse<T>(response);
    } catch (error) {
      if (error instanceof GitHubProviderError) throw error;
      throw new GitHubProviderError("NETWORK_ERROR", error instanceof Error ? error.message : "GitHub network error.", true);
    } finally {
      clearTimeout(timer);
    }
  }

  async getInstallationToken(installationId: string): Promise<string> {
    const jwt = createGitHubAppJwt({ appId: this.config.appId, privateKey: this.config.privateKey });
    const response = await this.request<{ token: string }>(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
      method: "POST",
      token: jwt
    });
    return response.token;
  }

  private async installationRequest<T>(installationId: string, path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getInstallationToken(installationId);
    return this.request<T>(path, { ...options, token });
  }

  async listRepositories(installationId: string): Promise<GitHubRepositoryMetadata[]> {
    const response = await this.installationRequest<{ repositories: GitHubRepositoryApi[] }>(installationId, "/installation/repositories?per_page=100");
    return response.repositories.map(toRepositoryMetadata);
  }

  async getRepository(installationId: string, owner: string, repo: string): Promise<GitHubRepositoryMetadata> {
    const response = await this.installationRequest<GitHubRepositoryApi>(installationId, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    return toRepositoryMetadata(response);
  }

  async listLabels(installationId: string, owner: string, repo: string): Promise<string[]> {
    const labels = await this.installationRequest<Array<{ name: string }>>(
      installationId,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/labels?per_page=100`
    );
    return labels.map((label) => label.name);
  }

  async listAssignableUsers(installationId: string, owner: string, repo: string): Promise<string[]> {
    const users = await this.installationRequest<Array<{ login: string }>>(
      installationId,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/assignees?per_page=100`
    );
    return users.map((user) => user.login);
  }

  async listMilestones(installationId: string, owner: string, repo: string): Promise<GitHubMilestoneMetadata[]> {
    const milestones = await this.installationRequest<Array<{ number: number; title: string; state: string }>>(
      installationId,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/milestones?state=open&per_page=100`
    );
    return milestones.map((milestone) => ({ number: milestone.number, title: milestone.title, state: milestone.state }));
  }

  async findIssueByMarker(input: { owner: string; repo: string; marker: string; installationId?: string }): Promise<GitHubCreateIssueResult | null> {
    if (!input.installationId) return null;
    const query = encodeURIComponent(`repo:${input.owner}/${input.repo} is:issue "${input.marker}"`);
    const response = await this.installationRequest<{ items: Array<{ number: number; html_url: string }> }>(input.installationId, `/search/issues?q=${query}&per_page=1`);
    const issue = response.items[0];
    return issue ? { number: issue.number, url: issue.html_url, alreadyExists: true } : null;
  }

  async createIssue(input: GitHubCreateIssueInput): Promise<GitHubCreateIssueResult> {
    if (!input.installationId) {
      throw new GitHubProviderError("INSTALLATION_ID_REQUIRED", "GitHub installation ID is required.", false);
    }
    const marker = extractFindingMarker(input.body);
    if (marker) {
      const existing = await this.findIssueByMarker({ owner: input.owner, repo: input.repo, marker, installationId: input.installationId });
      if (existing) return existing;
    }
    const issue = await this.installationRequest<{ number: number; html_url: string }>(
      input.installationId,
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/issues`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          body: input.body,
          labels: input.labels,
          assignees: input.assignees,
          milestone: input.milestone
        })
      }
    );
    return { number: issue.number, url: issue.html_url };
  }
}

type GitHubRepositoryApi = {
  id: number;
  name: string;
  full_name: string;
  default_branch?: string | null;
  private: boolean;
  has_issues: boolean;
  archived: boolean;
  owner: { login: string; type: string };
};

function toRepositoryMetadata(repository: GitHubRepositoryApi): GitHubRepositoryMetadata {
  const [owner, name] = repository.full_name.split("/");
  return {
    githubRepositoryId: String(repository.id),
    owner: owner ?? repository.owner.login,
    name: name ?? repository.name,
    fullName: repository.full_name,
    defaultBranch: repository.default_branch ?? null,
    private: repository.private,
    issuesEnabled: repository.has_issues,
    archived: repository.archived,
    accountLogin: repository.owner.login,
    accountType: repository.owner.type === "Organization" ? "ORGANIZATION" : "USER"
  };
}

export function signGitHubState(input: { secret: string; payload: Record<string, unknown> }): string {
  const body = base64Url(JSON.stringify(input.payload));
  const signature = createHmac("sha256", input.secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyGitHubState(input: { secret: string; state: string }): Record<string, unknown> {
  const [body, signature] = input.state.split(".");
  if (!body || !signature) throw new GitHubProviderError("INVALID_GITHUB_STATE", "GitHub state is malformed.", false);
  const expected = createHmac("sha256", input.secret).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new GitHubProviderError("INVALID_GITHUB_STATE", "GitHub state signature is invalid.", false);
  }
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
}

export function newStateNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

export function verifyGitHubWebhookSignature(input: { secret: string; body: string; signatureHeader: string | null }): boolean {
  if (!input.signatureHeader?.startsWith("sha256=")) return false;
  const actual = input.signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", input.secret).update(input.body).digest("hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createGitHubProvider(config: { appConfigured: boolean; mock?: boolean; appId?: string | undefined; privateKey?: string | undefined }): GitHubProvider {
  if (config.mock) return new MockGitHubProvider();
  if (!config.appConfigured || !config.appId || !config.privateKey) return new UnconfiguredGitHubProvider();
  return new GitHubAppProvider({ appId: config.appId, privateKey: config.privateKey });
}
