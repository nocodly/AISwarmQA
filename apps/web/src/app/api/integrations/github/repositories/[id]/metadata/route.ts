import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getRepositoryForExport } from "@ai-swarm-qa/database";
import { createGitHubProvider, defaultGitHubLabelNames, defaultLabelsForFinding } from "@ai-swarm-qa/github";
import { jsonErrorFromUnknown } from "../../../../../errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const config = readRuntimeConfig();
    const repository = await getRepositoryForExport(id);
    const provider = createGitHubProvider({
      appConfigured: Boolean(config.githubAppId && config.githubAppPrivateKey),
      mock: config.githubExportMock,
      appId: config.githubAppId,
      privateKey: config.githubAppPrivateKey
    });
    const [owner, repo] = repository.fullName.split("/");
    const labels =
      owner && repo && provider.listLabels
        ? await provider.listLabels(repository.githubConnection.installationId, owner, repo)
        : [...new Set([...defaultLabelsForFinding({ severity: "high", category: "functional" }), "accessibility", "broken-link"])];
    const assignees = owner && repo && provider.listAssignableUsers ? await provider.listAssignableUsers(repository.githubConnection.installationId, owner, repo) : [];
    const milestones = owner && repo && provider.listMilestones ? await provider.listMilestones(repository.githubConnection.installationId, owner, repo) : [];
    const requiredLabels = [...new Set(defaultGitHubLabelNames)];
    return Response.json({
      repository: {
        id: repository.id,
        fullName: repository.fullName,
        issuesEnabled: repository.issuesEnabled,
        archived: repository.archived,
        defaultBranch: repository.defaultBranch
      },
      labels,
      missingDefaultLabels: requiredLabels.filter((label) => !labels.includes(label)),
      assignees,
      milestones,
      createMissingLabelsSupported: true
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
