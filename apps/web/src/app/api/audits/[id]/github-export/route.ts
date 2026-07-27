import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { createGitHubExportBatch, enableExternalEvidenceForFindings, getCompletedAuditForExport, getRepositoryForExport } from "@ai-swarm-qa/database";
import { buildGitHubExportIdempotencyKey } from "@ai-swarm-qa/github";
import { createGitHubExportQueue, enqueueGitHubExport } from "@ai-swarm-qa/queue";
import { githubExportRequestSchema } from "@ai-swarm-qa/shared";
import { jsonError, jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let queue: ReturnType<typeof createGitHubExportQueue> | undefined;
  try {
    const { id: auditId } = await params;
    const actor = await requireAuth(request);
    const body = githubExportRequestSchema.parse(await request.json());
    const config = readRuntimeConfig();
    const audit = await getCompletedAuditForExport(auditId, { workspaceId: actor.workspaceId });
    const repository = await getRepositoryForExport(body.repositoryId, { workspaceId: actor.workspaceId });
    const idempotencyKeys = new Map(
      body.findingIds.map((findingId) => [
        findingId,
        buildGitHubExportIdempotencyKey({
          workspaceId: audit.project.organizationId,
          repositoryFullName: repository.fullName,
          auditId: audit.id,
          findingId
        })
      ])
    );
    const batch = await createGitHubExportBatch({
      auditId: audit.id,
      repositoryId: repository.id,
      findingIds: body.findingIds,
      idempotencyKeys,
      exportOptions: {
        labelNames: body.labelNames,
        assignees: body.assignees,
        createMissingLabels: body.createMissingLabels,
        includeExternalEvidence: body.includeExternalEvidence,
        ...(typeof body.milestoneNumber === "number" ? { milestoneNumber: body.milestoneNumber } : {})
      },
      actor
    });
    if (body.includeExternalEvidence) {
      await enableExternalEvidenceForFindings({ auditId: audit.id, findingIds: body.findingIds, workspaceId: actor.workspaceId });
    }
    queue = createGitHubExportQueue(config.redisUrl);
    await enqueueGitHubExport(queue, {
      batchId: batch.id,
      workspaceId: audit.project.organizationId,
      userId: batch.createdByUserId
    });
    console.log(JSON.stringify({ level: "info", event: "github.export.requested", batchId: batch.id, auditId: audit.id, repository: repository.fullName }));
    return Response.json(
      {
        batchId: batch.id,
        status: batch.status.toLowerCase(),
        requestedCount: batch.requestedCount
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "The request body must be valid JSON.", 400);
    }
    return jsonErrorFromUnknown(error);
  } finally {
    await queue?.close();
  }
}
