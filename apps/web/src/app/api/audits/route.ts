import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { assertCanCreateAudit, createAuditRecord, recordUsageEvent, transitionAuditStatus, updateOnboarding } from "@ai-swarm-qa/database";
import { createAuditQueue, enqueueAuditPlan } from "@ai-swarm-qa/queue";
import { auditRequestSchema, sanitizeAuditMissionContext } from "@ai-swarm-qa/shared";
import { jsonError, jsonErrorFromUnknown } from "../errors";
import { assertAuditTargetNetworkAllowed } from "@/lib/audit-target-safety";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const auditEnqueueTimeoutMs = 8000;

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let queue: ReturnType<typeof createAuditQueue> | undefined;

  try {
    const actor = await requireAuth(request);
    const body = auditRequestSchema.parse(await request.json());
    const config = readRuntimeConfig();
    await assertRateLimit(request, "audit-create", config.rateLimitAuditCreateMax);
    const targetUrl = await assertAuditTargetNetworkAllowed(body.url, {
      mode: process.env.NODE_ENV === "production" ? "production" : "development",
      devAllowedHosts: config.auditDevAllowedHosts
    });
    const missionContext = sanitizeAuditMissionContext({
      ...(body.metadata?.accessMode ? { accessMode: body.metadata.accessMode } : {}),
      ...(body.metadata?.auditScope ? { auditScope: body.metadata.auditScope } : {}),
      ...(body.metadata?.loginUrl ? { loginUrl: body.metadata.loginUrl } : {}),
      ...(body.metadata?.testAccount ? { testAccount: body.metadata.testAccount } : {}),
      ...(body.metadata?.customInstructions ? { customInstructions: body.metadata.customInstructions } : {}),
      safetyRules: body.metadata?.safetyRules ?? []
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

    await transitionAuditStatus(audit.id, "validating");
    await transitionAuditStatus(audit.id, "planning");

    queue = createAuditQueue(config.redisUrl);
    try {
      await withTimeout(
        enqueueAuditPlan(queue, {
          auditId: audit.id,
          targetUrl,
          correlationId,
          auditMode: body.auditMode,
          missionContext
        }),
        auditEnqueueTimeoutMs,
        "Audit planning queue did not accept the job in time."
      );
    } catch (enqueueError) {
      await transitionAuditStatus(audit.id, "failed", { failureReason: "Audit planning could not be queued." }).catch(() => undefined);
      await recordUsageEvent({
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        auditId: audit.id,
        type: "AUDIT_FAILED",
        idempotencyKey: `audit-enqueue-failed:${audit.id}`
      }).catch(() => undefined);
      console.error(
        JSON.stringify({
          level: "error",
          event: "audit_enqueue_failed",
          auditId: audit.id,
          error: enqueueError instanceof Error ? enqueueError.message : "Unknown error"
        })
      );
      throw new Error("AUDIT_QUEUE_UNAVAILABLE");
    }

    await recordUsageEvent({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      auditId: audit.id,
      type: "AUDIT_CREATED",
      idempotencyKey: `audit-created:${audit.id}`
    });
    await updateOnboarding({ workspaceId: actor.workspaceId, websiteUrl: targetUrl, firstAuditId: audit.id });

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
