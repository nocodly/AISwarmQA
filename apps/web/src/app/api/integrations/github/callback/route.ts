import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { consumeGitHubAuthState, syncGitHubRepositories, upsertGitHubInstallation } from "@ai-swarm-qa/database";
import { createGitHubProvider, hashState, verifyGitHubState } from "@ai-swarm-qa/github";
import { jsonError, jsonErrorFromUnknown } from "../../../errors";

export async function GET(request: Request) {
  try {
    const config = readRuntimeConfig();
    if (!config.githubAppId || !config.githubAppClientSecret || !config.githubAppPrivateKey) {
      return jsonError("GITHUB_APP_NOT_CONFIGURED", "GitHub App credentials are not configured.", 503);
    }

    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const installationId = url.searchParams.get("installation_id");
    if (!state || !installationId) {
      return jsonError("GITHUB_CALLBACK_INVALID", "GitHub callback is missing required state or installation.", 400);
    }

    const payload = verifyGitHubState({ secret: config.githubAppClientSecret, state });
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return jsonError("GITHUB_STATE_EXPIRED", "GitHub connection state expired.", 400);
    }

    const consumed = await consumeGitHubAuthState({ stateHash: hashState(state) });
    const provider = createGitHubProvider({
      appConfigured: true,
      appId: config.githubAppId,
      privateKey: config.githubAppPrivateKey
    });

    if (!provider.listRepositories) {
      return jsonError("GITHUB_PROVIDER_UNAVAILABLE", "GitHub provider cannot list repositories.", 503);
    }

    const repositories = await provider.listRepositories(installationId);
    const first = repositories[0];
    const connection = await upsertGitHubInstallation({
      workspaceId: consumed.workspaceId,
      userId: consumed.userId,
      installationId,
      githubAccountId: first?.accountLogin ?? installationId,
      githubLogin: first?.accountLogin ?? "unknown",
      accountType: first?.accountType ?? "USER"
    });
    await syncGitHubRepositories({ connectionId: connection.id, repositories });

    const returnUrl = typeof payload.returnUrl === "string" ? payload.returnUrl : consumed.returnUrl;
    return Response.redirect(new URL(returnUrl, url.origin), 302);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
