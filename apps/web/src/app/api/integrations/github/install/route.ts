import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { assertWorkspacePermission, createGitHubAuthState } from "@ai-swarm-qa/database";
import { hashState, newStateNonce, signGitHubState } from "@ai-swarm-qa/github";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

function safeReturnUrl(request: Request): string {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get("returnUrl") ?? "/";
  try {
    const parsed = new URL(requested, requestUrl.origin);
    if (parsed.origin !== requestUrl.origin) return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    await assertWorkspacePermission({ workspaceId: actor.workspaceId, userId: actor.userId, permission: "github:manage" });
    const config = readRuntimeConfig();
    const appConfigured = Boolean(config.githubAppId && config.githubAppClientId && config.githubAppClientSecret && config.githubAppPrivateKey);
    if (!appConfigured || !config.githubAppSetupUrl) {
      return Response.json(
        {
          error: {
            code: "GITHUB_APP_NOT_CONFIGURED",
            message: "GitHub App credentials and GITHUB_APP_SETUP_URL are required before installation."
          }
        },
        { status: 503 }
      );
    }

    const issuedAt = Date.now();
    const state = signGitHubState({
      secret: config.githubAppClientSecret!,
      payload: {
        nonce: newStateNonce(),
        iat: issuedAt,
        exp: issuedAt + 10 * 60 * 1000,
        returnUrl: safeReturnUrl(request)
      }
    });

    await createGitHubAuthState({
      stateHash: hashState(state),
      returnUrl: safeReturnUrl(request),
      expiresAt: new Date(issuedAt + 10 * 60 * 1000),
      userId: actor.userId,
      workspaceId: actor.workspaceId
    });

    const setupUrl = new URL(config.githubAppSetupUrl);
    setupUrl.searchParams.set("state", state);
    return Response.redirect(setupUrl, 302);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
