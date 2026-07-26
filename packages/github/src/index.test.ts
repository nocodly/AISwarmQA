import { describe, expect, it } from "vitest";
import {
  buildGitHubExportIdempotencyKey,
  buildIssueDraft,
  categoryLabel,
  classifyGitHubError,
  sanitizeUrlForIssue,
  severityLabel
} from "./index";

const finding = {
  id: "finding-1",
  auditId: "audit-1",
  title: "Checkout button does not continue",
  summary: "Clicking checkout stalls the flow.",
  description: "The checkout button emitted a stalled interaction event.",
  severity: "high",
  category: "functional",
  affectedUrl: "https://example.com/checkout?token=secret&plan=pro#section",
  stepsToReproduce: ["Open the checkout page.", "Click Checkout."],
  expectedBehavior: "Checkout should continue.",
  actualBehavior: "The flow stalls.",
  confidence: 0.91,
  sourceMissionTypes: ["interaction-tester"],
  occurrenceCount: 1,
  evidence: [{ id: "evidence-1", type: "screenshot", content: null, localPath: "artifact.png", metadata: {} }]
};

describe("GitHub issue export helpers", () => {
  it("redacts sensitive URL parameters", () => {
    expect(sanitizeUrlForIssue(finding.affectedUrl)).toBe("https://example.com/checkout?token=%5Bredacted%5D&plan=pro");
  });

  it("maps severity and category labels", () => {
    expect(severityLabel("high")).toBe("severity:high");
    expect(categoryLabel("functional")).toBe("interaction");
  });

  it("builds stable idempotency keys", () => {
    const first = buildGitHubExportIdempotencyKey({
      workspaceId: "workspace-1",
      repositoryFullName: "Owner/Repo",
      auditId: "audit-1",
      findingId: "finding-1"
    });
    const second = buildGitHubExportIdempotencyKey({
      workspaceId: "workspace-1",
      repositoryFullName: "owner/repo",
      auditId: "audit-1",
      findingId: "finding-1"
    });
    expect(first).toBe(second);
  });

  it("builds issue content with metadata marker and evidence link", () => {
    const draft = buildIssueDraft({
      finding,
      auditDate: "2026-07-26T00:00:00.000Z",
      toolVersion: "0.1.0",
      evidenceBaseUrl: "https://app.example.com/api/evidence"
    });
    expect(draft.title).toBe("[High] Checkout button does not continue");
    expect(draft.labels).toContain("aiswarmqa");
    expect(draft.body).toContain("<!-- aiswarmqa:finding:");
    expect(draft.body).toContain("https://app.example.com/api/evidence/evidence-1");
    expect(draft.body).not.toContain("secret");
  });

  it("classifies retryable and non-retryable errors", () => {
    expect(classifyGitHubError(429)).toEqual({ retryable: true, code: "RATE_LIMITED" });
    expect(classifyGitHubError(500)).toEqual({ retryable: true, code: "GITHUB_UNAVAILABLE" });
    expect(classifyGitHubError(403)).toEqual({ retryable: false, code: "ACCESS_DENIED" });
  });
});
