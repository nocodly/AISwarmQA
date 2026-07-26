import { readRuntimeConfig } from "@ai-swarm-qa/config";

export async function GET() {
  const config = readRuntimeConfig();
  const appConfigured = Boolean(config.githubAppId && config.githubAppClientId && config.githubAppPrivateKey);
  if (!appConfigured) {
    return Response.json(
      {
        error: {
          code: "GITHUB_APP_NOT_CONFIGURED",
          message: "GitHub App credentials are not configured. Follow docs/PHASE_7_GITHUB_EXPORT.md before enabling installation."
        }
      },
      { status: 503 }
    );
  }
  return Response.json(
    {
      error: {
        code: "GITHUB_APP_FLOW_PENDING",
        message: "GitHub App installation callback handling is scaffolded but requires production credentials before it can be enabled."
      }
    },
    { status: 501 }
  );
}
