import { describe, expect, it } from "vitest";
import { readRuntimeConfig } from "./index";

describe("runtime config", () => {
  it("normalizes retired Anthropic Sonnet 4 model aliases", () => {
    const config = readRuntimeConfig({
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "test-key",
      ANTHROPIC_MODEL: "claude-sonnet-4",
      ANTHROPIC_PLANNER_MODEL: "claude-sonnet-4-20250514"
    });

    expect(config.anthropicModel).toBe("claude-sonnet-4-6");
    expect(config.aiDefaultModel).toBe("claude-sonnet-4-6");
    expect(config.anthropicPlannerModel).toBe("claude-sonnet-4-6");
  });
});
