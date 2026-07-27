import { prisma } from "@ai-swarm-qa/database";
import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const config = readRuntimeConfig();
    await assertRateLimit(request, "data-export-account", config.rateLimitAuditCreateMax);
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
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return jsonErrorFromUnknown(error);
  }
}
