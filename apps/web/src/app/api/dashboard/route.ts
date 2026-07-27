import { getDashboardOverview } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../errors";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request);
    return Response.json(await getDashboardOverview({ workspaceId: actor.workspaceId }));
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
