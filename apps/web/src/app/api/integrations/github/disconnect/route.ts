import { assertWorkspacePermission, disconnectGitHubConnectionsForWorkspace } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request);
    await assertWorkspacePermission({ workspaceId: actor.workspaceId, userId: actor.userId, permission: "github:manage" });
    const result = await disconnectGitHubConnectionsForWorkspace(actor.workspaceId);
    return Response.json({ disconnected: result.count });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
