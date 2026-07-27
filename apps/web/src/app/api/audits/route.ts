import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { assertCanCreateAudit, createAuditRecord, recordUsageEvent, transitionAuditStatus, updateOnboarding } from "@ai-swarm-qa/database";
import { createAuditQueue, enqueueAuditPlan } from "@ai-swarm-qa/queue";
import { assertAuditUrlAllowed, auditRequestSchema } from "@ai-swarm-qa/shared";
import { jsonError, jsonErrorFromUnknown } from "../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  let queue: ReturnType<typeof createAuditQueue> | undefined;

  try {
    const actor = await requireAuth(request);
    const body = auditRequestSchema.parse(await request.json());
    const config = readRuntimeConfig();
    await assertRateLimit(request, "audit-create", config.rateLimitAuditCreateMax);
    const targetUrl = assertAuditUrlAllowed(body.url, {
      mode: process.env.NODE_ENV === "production" ? "production" : "development",
      devAllowedHosts: config.auditDevAllowedHosts
    });

    const correlationId = randomUUID();
    const usageSummary = await assertCanCreateAudit({ workspaceId: actor.workspaceId, userId: actor.userId });
    const audit = await createAuditRecord({
      targetUrl,
      correlationId,
      maxSteps: Math.min(config.auditMaxSteps, usageSummary.limits.maxPagesPerAudit ?? config.auditMaxSteps),
      maxCostUsd: config.auditMaxCost,
      workspaceId: actor.workspaceId
    });
    await recordUsageEvent({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      auditId: audit.id,
      type: "AUDIT_CREATED",
      idempotencyKey: `audit-created:${audit.id}`
    });
    await updateOnboarding({ workspaceId: actor.workspaceId, websiteUrl: targetUrl, firstAuditId: audit.id });

    await transitionAuditStatus(audit.id, "validating");
    await transitionAuditStatus(audit.id, "planning");

    queue = createAuditQueue(config.redisUrl);
    await enqueueAuditPlan(queue, {
      auditId: audit.id,
      targetUrl,
      correlationId,
      auditMode: "standard"
    });

    console.log(JSON.stringify({ level: "info", event: "audit_planning_enqueued", auditId: audit.id }));

    return NextResponse.json({ id: audit.id, status: "planning" }, { status: 201 });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "The request body must be valid JSON.", 400);
    }

    console.error(
      JSON.stringify({
        level: "error",
        event: "audit_create_failed",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    return jsonErrorFromUnknown(error);
  } finally {
    await queue?.close();
  }
}
