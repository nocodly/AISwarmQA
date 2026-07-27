import { prisma, updateWorkspaceName } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";

const workspaceSettingsSchema = z.object({
  name: z.string().min(2).max(80)
});

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const workspace = await prisma.organization.findUnique({
      where: { id: actor.workspaceId },
      include: { members: { include: { user: true }, orderBy: { createdAt: "asc" } }, invitations: { orderBy: { createdAt: "desc" }, take: 20 } }
    });
    return Response.json({
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            members: workspace.members.map((member) => ({ id: member.id, role: member.role, email: member.user.email, name: member.user.name })),
            invitations: workspace.invitations.map((invitation) => ({
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              status: invitation.status.toLowerCase(),
              expiresAt: invitation.expiresAt.toISOString()
            }))
          }
        : null
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuth(request);
    const body = workspaceSettingsSchema.parse(await request.json());
    const workspace = await updateWorkspaceName({ workspaceId: actor.workspaceId, actorUserId: actor.userId, name: body.name });
    return Response.json({ workspace: { id: workspace.id, name: workspace.name } });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
