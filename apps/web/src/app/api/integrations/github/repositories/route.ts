import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { listGitHubRepositoriesForDevelopment, syncGitHubRepositories } from "@ai-swarm-qa/database";
import { createGitHubProvider } from "@ai-swarm-qa/github";
import { jsonErrorFromUnknown } from "../../../errors";

export async function GET() {
  try {
    const config = readRuntimeConfig();
    const provider = createGitHubProvider({
      appConfigured: Boolean(config.githubAppId && config.githubAppPrivateKey),
      mock: config.githubExportMock,
      appId: config.githubAppId,
      privateKey: config.githubAppPrivateKey
    });
    const repositories = await listGitHubRepositoriesForDevelopment({ includeMock: config.githubExportMock });
    if (!config.githubExportMock && provider.listRepositories) {
      for (const connectionId of [...new Set(repositories.map((repository) => repository.githubConnectionId))]) {
        const connection = repositories.find((repository) => repository.githubConnectionId === connectionId)?.githubConnection;
        if (!connection) continue;
        const fresh = await provider.listRepositories(connection.installationId);
        await syncGitHubRepositories({ connectionId, repositories: fresh });
      }
    }
    const latest = await listGitHubRepositoriesForDevelopment({ includeMock: config.githubExportMock });
    return Response.json({
      repositories: latest.map((repository) => ({
        id: repository.id,
        fullName: repository.fullName,
        owner: repository.owner,
        name: repository.name,
        private: repository.private,
        issuesEnabled: repository.issuesEnabled,
        archived: repository.archived,
        defaultBranch: repository.defaultBranch,
        accountLogin: repository.githubConnection.githubLogin,
        accountType: repository.githubConnection.accountType.toLowerCase(),
        connectionId: repository.githubConnectionId
      }))
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
