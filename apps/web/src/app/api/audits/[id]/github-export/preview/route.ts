import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getCompletedAuditForExport, getRepositoryForExport, listGitHubRepositoriesForDevelopment, toIssueFinding } from "@ai-swarm-qa/database";
import { buildIssueDraft, buildGitHubExportIdempotencyKey } from "@ai-swarm-qa/github";
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
    const evidenceBaseUrl = `${config.appUrl.replace(/\/$/, "")}/api/audits/${audit.id}/evidence`;
    const preview = selected.map((finding) => {
      const issueFinding = toIssueFinding(finding);
      const draft = buildIssueDraft({
        finding: issueFinding,
        auditDate: audit.completedAt?.toISOString() ?? audit.updatedAt.toISOString(),
        toolVersion: "0.1.0",
        labelNames: body.labelNames,
        assignees: body.assignees,
        evidenceBaseUrl,
        ...(typeof body.milestoneNumber === "number" ? { milestoneNumber: body.milestoneNumber } : {})
      });
      return {
        findingId: finding.id,
        idempotencyKey: buildGitHubExportIdempotencyKey({
          workspaceId: audit.project.organizationId,
          repositoryFullName: repository.fullName,
          auditId: audit.id,
          findingId: finding.id
        }),
        title: draft.title,
        labels: draft.labels,
        assignees: draft.assignees,
        milestone: draft.milestone ?? null
      };
    });
    return Response.json({
      repository: {
        id: repository.id,
        fullName: repository.fullName,
        issuesEnabled: repository.issuesEnabled
      },
      selectedCount: selected.length,
      estimatedApiRequests: selected.length,
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
