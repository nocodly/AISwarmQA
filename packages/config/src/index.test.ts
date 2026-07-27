import { describe, expect, it } from "vitest";
import { getCommercialPlan, readCommercialPlans, readRuntimeConfig } from "./index";

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

  it("provides the commercial SaaS plan catalog", () => {
    const plans = readCommercialPlans({});

    expect(plans.free.id).toBe("free");
    expect(plans.free.auditsPerMonth).toBe(2);
    expect(plans.free.maxPagesPerAudit).toBe(25);
    expect(plans.pro.auditsPerMonth).toBe(50);
    expect(plans.pro.teamInvitationsEnabled).toBe(true);
    expect(plans.business.workspaceLimit).toBeNull();
    expect(plans.business.apiAccess).toBe(true);
  });

  it("allows environment based plan overrides for tests", () => {
    const plan = getCommercialPlan("free", {
      PLAN_OVERRIDES_JSON: JSON.stringify({
        free: { auditsPerMonth: 9, maxPagesPerAudit: 99, evidenceRetentionDays: 3 }
      })
    });

    expect(plan.auditsPerMonth).toBe(9);
    expect(plan.maxPagesPerAudit).toBe(99);
    expect(plan.evidenceRetentionDays).toBe(3);
  });
});
