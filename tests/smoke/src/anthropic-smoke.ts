import { AIProviderError, AnthropicProvider, generateStructured, getModelPricing } from "@ai-swarm-qa/ai";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { z } from "zod";

const schema = z.object({ status: z.literal("ok") }).strict();

function existsUpwards(fileName: string) {
  let current = resolve(process.cwd());
  const root = parse(current).root;
  while (true) {
    if (existsSync(join(current, fileName))) return true;
    if (current === root) return false;
    current = dirname(current);
  }
}

async function main() {
  const config = readRuntimeConfig();
  const envLocalFound = existsUpwards(".env.local");
  const envFound = existsUpwards(".env");
  const keyPresent = Boolean(config.anthropicApiKey);
  const providerSelected = config.aiProvider === "anthropic" && keyPresent ? "anthropic" : "none";

  console.log(
    JSON.stringify({
      diagnostic: true,
      envLocalFound,
      envFound,
      aiProvider: config.aiProvider,
      anthropicApiKeyPresent: keyPresent,
      configuredModel: config.anthropicModel,
      providerSelected
    })
  );

  if (config.aiProvider !== "anthropic") {
    throw new Error("smoke:anthropic requires AI_PROVIDER=anthropic.");
  }
  if (!config.anthropicApiKey) {
    throw new Error("smoke:anthropic requires ANTHROPIC_API_KEY in .env.local, .env, or process environment.");
  }

  const provider = new AnthropicProvider({ apiKey: config.anthropicApiKey, defaultModel: config.anthropicModel });
  const result = await generateStructured({
    provider,
    schema,
    messages: [
      { role: "system", content: "Return only JSON matching the requested schema. No prose." },
      { role: "user", content: "{\"status\":\"ok\"}" }
    ],
    model: config.anthropicModel,
    maxTokens: 32,
    timeoutMs: Math.min(config.aiProviderTimeoutMs, 20000),
    pricing: getModelPricing(config.anthropicModel),
    retry: { maxAttempts: 1, initialBackoffMs: config.aiProviderInitialBackoffMs }
  });

  console.log(
    JSON.stringify({
      ok: true,
      provider: result.provider,
      model: result.model,
      requestIdPresent: Boolean(result.requestId),
      durationMs: result.durationMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: result.estimatedCostUsd,
      finishReason: result.finishReason,
      value: result.value
    })
  );
}

main().catch((error: unknown) => {
  if (error instanceof AIProviderError) {
    console.error(JSON.stringify({ ok: false, providerErrorCode: error.code, message: error.message }));
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
});

export {};
