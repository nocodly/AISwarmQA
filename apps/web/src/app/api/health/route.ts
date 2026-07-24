import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@ai-swarm-qa/config";

export function GET() {
  const config = readRuntimeConfig();
  return NextResponse.json({
    ok: true,
    service: "ai-swarm-qa-web",
    ai: {
      provider: config.aiProvider,
      model: config.anthropicModel,
      hasAnthropicKey: Boolean(config.anthropicApiKey),
      fallbackToMock: config.aiProviderFallbackToMock
    }
  });
}
