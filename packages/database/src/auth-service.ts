import { prisma } from "./client";

export type AuthenticatedActor = {
  userId: string;
  workspaceId: string;
  email: string;
};

export async function getOrCreateSupabaseActor(input: { supabaseUserId: string; email: string; name?: string | null }): Promise<AuthenticatedActor> {
  const user = await prisma.user.upsert({
    where: { supabaseUserId: input.supabaseUserId },
    create: {
      supabaseUserId: input.supabaseUserId,
      email: input.email,
      name: input.name ?? null
    },
    update: {
      email: input.email,
      ...(input.name ? { name: input.name } : {})
    }
  });
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" }
  });
  if (membership) {
    return { userId: user.id, workspaceId: membership.organizationId, email: user.email };
  }
  const organization = await prisma.organization.create({
    data: {
      name: input.name ? `${input.name}'s Workspace` : "Personal Workspace",
      members: {
        create: {
          userId: user.id,
          role: "owner"
        }
      }
    }
  });
  return { userId: user.id, workspaceId: organization.id, email: user.email };
}
