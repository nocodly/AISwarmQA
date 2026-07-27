import { requestWorkspaceDeletion } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

const deletionSchema = z.object({
  confirmation: z.string().min(6).max(120)
});

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
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
    return jsonErrorFromUnknown(error);
  }
}
