import { readRuntimeConfig } from "@ai-swarm-qa/config";
import {
  getCompletedAuditForExport,
  getRepositoryForExport,
  listExistingGitHubExportsByIdempotencyKeys,
  listGitHubRepositoriesForDevelopment,
  toIssueFinding
} from "@ai-swarm-qa/database";
import { buildIssueDraft, buildGitHubExportIdempotencyKey, createGitHubProvider, defaultGitHubLabelNames } from "@ai-swarm-qa/github";
import { githubExportPreviewRequestSchema } from "@ai-swarm-qa/shared";
import { jsonError, jsonErrorFromUnknown } from "../../../../errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auditId } = await params;
    const body = githubExportPreviewRequestSchema.parse(await request.json());
    const config = readRuntimeConfig();
    const audit = await getCompletedAuditForExport(auditId);
    const repositories = await listGitHubRepositoriesForDevelopment({ includeMock: config.githubExportMock });
    const repository = body.repositoryId ? await getRepositoryForExport(body.repositoryId) : repositories[0];
    if (!repository) {
      return jsonError("GITHUB_NOT_CONNECTED", "Connect GitHub before exporting findings.", 409);
    }
    const selected = audit.findings.filter((finding) => body.findingIds.includes(finding.id));
    if (selected.length !== body.findingIds.length) {
      return jsonError("FINDING_ACCESS_DENIED", "One or more findings are not available for this audit.", 403);
    }
    const provider = createGitHubProvider({
      appConfigured: Boolean(config.githubAppId && config.githubAppPrivateKey),
      mock: config.githubExportMock,
      appId: config.githubAppId,
      privateKey: config.githubAppPrivateKey
    });
    const [owner, repo] = repository.fullName.split("/");
    const labels = owner && repo && provider.listLabels ? await provider.listLabels(repository.githubConnection.installationId, owner, repo) : [];
    const assignees = owner && repo && provider.listAssignableUsers ? await provider.listAssignableUsers(repository.githubConnection.installationId, owner, repo) : [];
    const milestones = owner && repo && provider.listMilestones ? await provider.listMilestones(repository.githubConnection.installationId, owner, repo) : [];
    const warnings: string[] = [];
    const invalidAssignees = body.assignees.filter((assignee) => !assignees.includes(assignee));
    if (invalidAssignees.length > 0) warnings.push(`Invalid assignees will be ignored: ${invalidAssignees.join(", ")}`);
    const milestoneValid = typeof body.milestoneNumber !== "number" || milestones.some((milestone) => milestone.number === body.milestoneNumber);
    if (!milestoneValid) warnings.push("Selected milestone is not available and will be ignored.");
    const missingLabels = [...new Set([...defaultGitHubLabelNames, ...body.labelNames])].filter((label) => labels.length > 0 && !labels.includes(label));
    if (missingLabels.length > 0 && !body.createMissingLabels) warnings.push(`Missing labels will be omitted unless approved: ${missingLabels.join(", ")}`);
    const evidenceBaseUrl = `${config.appUrl.replace(/\/$/, "")}/api/audits/${audit.id}/evidence`;
    const idempotencyKeys = selected.map((finding) =>
      buildGitHubExportIdempotencyKey({
        workspaceId: audit.project.organizationId,
        repositoryFullName: repository.fullName,
        auditId: audit.id,
        findingId: finding.id
      })
    );
    const existing = await listExistingGitHubExportsByIdempotencyKeys(idempotencyKeys);
    const existingByFinding = new Map(existing.map((item) => [item.findingId, item]));
    const preview = selected.map((finding) => {
      const issueFinding = toIssueFinding(finding);
      const key = buildGitHubExportIdempotencyKey({
        workspaceId: audit.project.organizationId,
        repositoryFullName: repository.fullName,
        auditId: audit.id,
        findingId: finding.id
      });
      const draft = buildIssueDraft({
        finding: issueFinding,
        auditDate: audit.completedAt?.toISOString() ?? audit.updatedAt.toISOString(),
        toolVersion: "0.1.0",
        labelNames: body.createMissingLabels ? body.labelNames : body.labelNames.filter((label) => labels.length === 0 || labels.includes(label)),
        assignees: body.assignees.filter((assignee) => assignees.includes(assignee)),
        evidenceBaseUrl,
        ...(typeof body.milestoneNumber === "number" && milestoneValid ? { milestoneNumber: body.milestoneNumber } : {})
      });
      const existingExport = existingByFinding.get(finding.id);
      return {
        findingId: finding.id,
        idempotencyKey: key,
        title: draft.title,
        labels: draft.labels,
        assignees: draft.assignees,
        milestone: draft.milestone ?? null,
        evidenceAvailable: issueFinding.evidence.length > 0,
        alreadyExported: existingExport?.status === "CREATED",
        existingIssueUrl: existingExport?.githubIssueUrl ?? null
      };
    });
    const issuesToCreate = preview.filter((issue) => !issue.alreadyExported).length;
    return Response.json({
      repository: {
        id: repository.id,
        fullName: repository.fullName,
        issuesEnabled: repository.issuesEnabled,
        archived: repository.archived,
        defaultBranch: repository.defaultBranch
      },
      selectedCount: selected.length,
      issuesToCreate,
      alreadyExportedCount: preview.length - issuesToCreate,
      warnings,
      missingLabels,
      estimatedApiRequests: issuesToCreate + 3,
      createMissingLabels: body.createMissingLabels,
      issues: preview
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "The request body must be valid JSON.", 400);
    }
    return jsonErrorFromUnknown(error);
  }
}
