import { prisma } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    const workspace = await prisma.organization.findUnique({
      where: { id: actor.workspaceId },
      include: {
        members: { include: { user: true } },
        projects: { include: { audits: { include: { findings: true, githubExportBatches: true } } } },
        githubConnections: { include: { repositories: true } },
        subscription: true
      }
    });
    return Response.json({
      exportedAt: new Date().toISOString(),
      workspace: workspace
        ? {
            id: workspace.id,
            name: workspace.name,
            plan: workspace.plan,
            members: workspace.members.map((member) => ({ email: member.user.email, role: member.role })),
            projects: workspace.projects.map((project) => ({
              name: project.name,
              targetUrl: project.targetUrl,
              audits: project.audits.map((audit) => ({
                id: audit.id,
                targetUrl: audit.targetUrl,
                status: audit.status.toLowerCase(),
                findingsCount: audit.findings.length,
                githubExportBatchCount: audit.githubExportBatches.length,
                createdAt: audit.createdAt.toISOString()
              }))
            })),
            githubRepositories: workspace.githubConnections.flatMap((connection) =>
              connection.repositories.map((repository) => ({ fullName: repository.fullName, issuesEnabled: repository.issuesEnabled, archived: repository.archived }))
            ),
            subscription: workspace.subscription
              ? { plan: workspace.subscription.plan.toLowerCase(), status: workspace.subscription.status.toLowerCase(), currentPeriodEnd: workspace.subscription.currentPeriodEnd?.toISOString() ?? null }
              : null
          }
        : null
    });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
