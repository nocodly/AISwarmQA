import { describe, expect, it } from "vitest";
import {
  buildGitHubExportIdempotencyKey,
  buildIssueDraft,
  categoryLabel,
  classifyGitHubError,
  extractFindingMarker,
  hashState,
  sanitizeUrlForIssue,
  signGitHubState,
  verifyGitHubState,
  verifyGitHubWebhookSignature,
  severityLabel
} from "./index";
import { createHmac } from "node:crypto";

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
    expect(classifyGitHubError(429)).toMatchObject({ retryable: true, code: "RATE_LIMITED" });
    expect(classifyGitHubError(500)).toEqual({ retryable: true, code: "GITHUB_UNAVAILABLE" });
    expect(classifyGitHubError(403)).toEqual({ retryable: false, code: "ACCESS_DENIED" });
  });

  it("signs and validates GitHub callback state", () => {
    const state = signGitHubState({ secret: "state-secret", payload: { nonce: "abc", exp: Date.now() + 1000 } });
    expect(hashState(state)).toHaveLength(64);
    expect(verifyGitHubState({ secret: "state-secret", state })).toMatchObject({ nonce: "abc" });
    expect(() => verifyGitHubState({ secret: "wrong", state })).toThrow();
  });

  it("verifies webhook signatures", () => {
    const body = JSON.stringify({ action: "created" });
    const signature = `sha256=${createHmac("sha256", "webhook-secret").update(body).digest("hex")}`;
    expect(verifyGitHubWebhookSignature({ secret: "webhook-secret", body, signatureHeader: signature })).toBe(true);
    expect(verifyGitHubWebhookSignature({ secret: "webhook-secret", body, signatureHeader: "sha256=bad" })).toBe(false);
  });

  it("extracts duplicate markers", () => {
    const draft = buildIssueDraft({ finding, auditDate: "2026-07-26T00:00:00.000Z", toolVersion: "0.1.0" });
    expect(extractFindingMarker(draft.body)).toContain("aiswarmqa:finding");
  });
});
