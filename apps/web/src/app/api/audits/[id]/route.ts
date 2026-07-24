import { getAuditSummary } from "@ai-swarm-qa/database";
import { jsonErrorFromUnknown } from "../../errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return Response.json(await getAuditSummary(id));
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}

