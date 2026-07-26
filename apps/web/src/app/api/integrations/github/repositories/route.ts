import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { listGitHubRepositoriesForDevelopment } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../../errors";

export async function GET() {
  try {
    const config = readRuntimeConfig();
    const repositories = await listGitHubRepositoriesForDevelopment({ includeMock: config.githubExportMock });
    return Response.json({
      repositories: repositories.map((repository) => ({
        id: repository.id,
        fullName: repository.fullName,
        owner: repository.owner,
        name: repository.name,
        private: repository.private,
        issuesEnabled: repository.issuesEnabled,
        connectionId: repository.githubConnectionId
      }))
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
