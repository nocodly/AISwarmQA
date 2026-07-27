import { readRuntimeConfig } from "@ai-swarm-qa/config";

export const dynamic = "force-dynamic";

export function GET() {
  const config = readRuntimeConfig();
  return Response.json({
    configured: Boolean(config.supabaseUrl && config.supabasePublishableKey),
    supabaseUrl: config.supabaseUrl ?? null,
    supabasePublishableKey: config.supabasePublishableKey ?? null
  });
}
