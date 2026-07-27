import { acceptWorkspaceInvitation } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

const acceptSchema = z.object({
  token: z.string().min(20)
});

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    const body = acceptSchema.parse(await request.json());
    const invitation = await acceptWorkspaceInvitation({ token: body.token, userId: actor.userId, email: actor.email });
    return Response.json({ invitation: { id: invitation.id, status: invitation.status.toLowerCase() } });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
