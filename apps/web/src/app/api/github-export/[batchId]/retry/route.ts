import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { resetFailedGitHubExportsForRetry } from "@ai-swarm-qa/database";
import { createGitHubExportQueue, enqueueGitHubExport } from "@ai-swarm-qa/queue";
import { githubExportRetryRequestSchema } from "@ai-swarm-qa/shared";
import { jsonError, jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  let queue: ReturnType<typeof createGitHubExportQueue> | undefined;
  try {
    const actor = await requireAuth(request);
    githubExportRetryRequestSchema.parse(await request.json());
    const { batchId } = await params;
    const config = readRuntimeConfig();
    const batch = await resetFailedGitHubExportsForRetry(batchId, { workspaceId: actor.workspaceId });
    queue = createGitHubExportQueue(config.redisUrl);
    await enqueueGitHubExport(queue, {
      batchId: batch.id,
      workspaceId: batch.githubConnection.workspaceId,
      userId: batch.createdByUserId
    });
    console.log(JSON.stringify({ level: "info", event: "github.export.requested", batchId: batch.id, retry: true }));
    return Response.json({ batchId: batch.id, status: "queued" }, { status: 202 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "The request body must be valid JSON.", 400);
    }
    return jsonErrorFromUnknown(error);
  } finally {
    await queue?.close();
  }
}
