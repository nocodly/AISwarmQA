import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getGitHubConnectionStatus } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../../errors";

export async function GET() {
  try {
    const config = readRuntimeConfig();
    const appConfigured = Boolean(config.githubAppId && config.githubAppClientId && config.githubAppPrivateKey);
    const status = await getGitHubConnectionStatus({ includeMock: config.githubExportMock });
    return Response.json({
      appConfigured,
      mockMode: config.githubExportMock,
      connected: status.connected,
      repositories: status.repositories,
      connectUrl: appConfigured || config.githubExportMock ? "/api/integrations/github/install" : null,
      manualSetupRequired: !appConfigured && !config.githubExportMock
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
