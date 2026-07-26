import { getGitHubExportBatch, toIssueFinding } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../errors";

export async function GET(_request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const { batchId } = await params;
    const batch = await getGitHubExportBatch(batchId);
    return Response.json({
      batch: {
        id: batch.id,
        auditId: batch.auditId,
        repository: batch.repository.fullName,
        requestedCount: batch.requestedCount,
        createdCount: batch.createdCount,
        failedCount: batch.failedCount,
        skippedCount: batch.skippedCount,
        status: batch.status.toLowerCase(),
        createdAt: batch.createdAt.toISOString(),
        completedAt: batch.completedAt?.toISOString() ?? null
      },
      exports: batch.exports.map((item) => ({
        id: item.id,
        findingId: item.findingId,
        findingTitle: toIssueFinding(item.finding).title,
        status: item.status.toLowerCase(),
        githubIssueNumber: item.githubIssueNumber,
        githubIssueUrl: item.githubIssueUrl,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt.toISOString()
      }))
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
