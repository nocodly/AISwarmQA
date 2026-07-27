import { revokeWorkspaceInvitation } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../../../errors";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;
    const invitation = await revokeWorkspaceInvitation({ workspaceId: actor.workspaceId, invitationId: id, actorUserId: actor.userId });
    return Response.json({ invitation: { id: invitation.id, status: invitation.status.toLowerCase() } });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
