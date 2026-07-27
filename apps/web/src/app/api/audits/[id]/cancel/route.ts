import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { requestAuditCancellation } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const cancelSchema = z.object({
  reason: z.string().max(500).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth(request);
    const config = readRuntimeConfig();
    await assertRateLimit(request, "audit-cancel", config.rateLimitAuditCreateMax);
    const { id } = await params;
    const body = cancelSchema.parse(await request.json().catch(() => ({})));
    const result = await requestAuditCancellation({
      auditId: id,
      workspaceId: actor.workspaceId,
      actorUserId: actor.userId,
      ...(body.reason ? { reason: body.reason } : {})
    });
    return Response.json({
      audit: {
        id: result.audit.id,
        status: result.status,
        cancelRequestedAt: result.audit.cancelRequestedAt?.toISOString() ?? null,
        cancelReason: result.audit.cancelReason ?? null
      },
      terminal: result.terminal,
      cancellationRequested: result.cancellationRequested
    });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return jsonErrorFromUnknown(error);
  }
}
