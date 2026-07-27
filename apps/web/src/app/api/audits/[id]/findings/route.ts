import { getAuditFindings } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../../errors";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuth(request);
    const { id } = await params;
    return Response.json({ findings: await getAuditFindings(id, { workspaceId: actor.workspaceId }) });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
