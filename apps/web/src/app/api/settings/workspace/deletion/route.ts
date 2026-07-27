import { requestWorkspaceDeletion } from "@ai-swarm-qa/database";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const deletionSchema = z.object({
  confirmation: z.string().min(6).max(120)
});

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    const config = readRuntimeConfig();
    await assertRateLimit(request, "workspace-deletion", config.rateLimitInvitationMax);
    const body = deletionSchema.parse(await request.json());
    const deletion = await requestWorkspaceDeletion({ workspaceId: actor.workspaceId, actorUserId: actor.userId, confirmation: body.confirmation });
    return Response.json({
      deletion: {
        id: deletion.id,
        status: deletion.status.toLowerCase(),
        blockedReason: deletion.blockedReason,
        scheduledFor: deletion.scheduledFor?.toISOString() ?? null
      }
    });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return jsonErrorFromUnknown(error);
  }
}
