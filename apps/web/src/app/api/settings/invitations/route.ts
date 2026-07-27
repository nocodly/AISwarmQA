import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { createWorkspaceInvitation, prisma } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { invitationEmail, sendTransactionalEmail } from "@/lib/email";

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"])
});

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    assertRateLimit(request, "workspace-invitation", config.rateLimitInvitationMax);
    const actor = await requireAuth(request);
    const body = invitationSchema.parse(await request.json());
    const workspace = await prisma.organization.findUnique({ where: { id: actor.workspaceId } });
    const { invitation, token } = await createWorkspaceInvitation({ workspaceId: actor.workspaceId, invitedByUserId: actor.userId, email: body.email, role: body.role });
    const inviteUrl = `${config.appUrl.replace(/\/$/, "")}/settings/invitations/accept?token=${encodeURIComponent(token)}`;
    const email = invitationEmail({ inviteUrl, workspaceName: workspace?.name ?? "AISwarmQA workspace" });
    await sendTransactionalEmail({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      to: body.email,
      template: "workspace_invitation",
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `workspace-invitation:${invitation.id}`
    });
    return Response.json({ invitation: { id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status.toLowerCase(), expiresAt: invitation.expiresAt.toISOString() } }, { status: 201 });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return jsonErrorFromUnknown(error);
  }
}
