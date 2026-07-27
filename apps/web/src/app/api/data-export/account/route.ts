import { prisma } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      include: { memberships: { include: { organization: true } } }
    });
    return Response.json({
      exportedAt: new Date().toISOString(),
      account: user
        ? {
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
            workspaces: user.memberships.map((membership) => ({ id: membership.organizationId, name: membership.organization.name, role: membership.role }))
          }
        : null
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
