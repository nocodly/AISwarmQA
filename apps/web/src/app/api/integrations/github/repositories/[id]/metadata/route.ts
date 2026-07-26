import { getRepositoryForExport } from "@ai-swarm-qa/database";
import { defaultLabelsForFinding } from "@ai-swarm-qa/github";
import { jsonErrorFromUnknown } from "../../../../../errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const repository = await getRepositoryForExport(id);
    return Response.json({
      repository: {
        id: repository.id,
        fullName: repository.fullName,
        issuesEnabled: repository.issuesEnabled
      },
      labels: [...new Set([...defaultLabelsForFinding({ severity: "high", category: "functional" }), "accessibility", "broken-link"])],
      assignees: [],
      milestones: [],
      createMissingLabelsSupported: true
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
