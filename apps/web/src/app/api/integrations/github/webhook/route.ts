import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getDevelopmentActor, markGitHubInstallationRevoked, recordGitHubWebhookDelivery, syncGitHubRepositories, upsertGitHubInstallation } from "@ai-swarm-qa/database";
import { createGitHubProvider, verifyGitHubWebhookSignature } from "@ai-swarm-qa/github";
import { jsonError, jsonErrorFromUnknown } from "../../../errors";

type GitHubWebhookPayload = {
  action?: string;
  installation?: {
    id: number;
    account?: {
      id: number;
      login: string;
      type: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    if (!config.githubAppWebhookSecret) {
      return jsonError("GITHUB_WEBHOOK_NOT_CONFIGURED", "GitHub webhook secret is not configured.", 503);
    }

    const body = await request.text();
    const valid = verifyGitHubWebhookSignature({
      secret: config.githubAppWebhookSecret,
      body,
      signatureHeader: request.headers.get("x-hub-signature-256")
    });
    if (!valid) {
      return jsonError("GITHUB_WEBHOOK_SIGNATURE_INVALID", "GitHub webhook signature is invalid.", 401);
    }

    const deliveryId = request.headers.get("x-github-delivery");
    const event = request.headers.get("x-github-event");
    if (!deliveryId || !event) {
      return jsonError("GITHUB_WEBHOOK_INVALID", "GitHub webhook headers are incomplete.", 400);
    }

    const payload = JSON.parse(body) as GitHubWebhookPayload;
    const recorded = await recordGitHubWebhookDelivery({ deliveryId, event, action: payload.action ?? null });
    if (recorded.duplicate) {
      return Response.json({ ok: true, duplicate: true });
    }

    const installationId = payload.installation?.id ? String(payload.installation.id) : null;
    if (!installationId) {
      return Response.json({ ok: true, ignored: true });
    }

    if (event === "installation" && ["deleted", "suspend"].includes(payload.action ?? "")) {
      await markGitHubInstallationRevoked(installationId);
      return Response.json({ ok: true });
    }

    if (event === "installation" || event === "installation_repositories") {
      const provider = createGitHubProvider({
        appConfigured: Boolean(config.githubAppId && config.githubAppPrivateKey),
        appId: config.githubAppId,
        privateKey: config.githubAppPrivateKey
      });
      if (!provider.listRepositories) {
        return Response.json({ ok: true, ignored: "provider_unavailable" });
      }
      const repositories = await provider.listRepositories(installationId);
      const account = payload.installation?.account;
      const { user, organization } = await getDevelopmentActor();
      const connection = await upsertGitHubInstallation({
        workspaceId: organization.id,
        userId: user.id,
        installationId,
        githubAccountId: account?.id ? String(account.id) : installationId,
        githubLogin: account?.login ?? repositories[0]?.accountLogin ?? "unknown",
        accountType: account?.type === "Organization" ? "ORGANIZATION" : "USER"
      });
      await syncGitHubRepositories({ connectionId: connection.id, repositories });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
