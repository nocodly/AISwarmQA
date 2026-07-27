import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { getPublicEvidence } from "@ai-swarm-qa/database";
import { SupabaseStorageProvider } from "@ai-swarm-qa/storage";
import { jsonErrorFromUnknown } from "../../api/errors";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request, { params }: { params: Promise<{ publicEvidenceId: string }> }) {
  try {
    const { publicEvidenceId } = await params;
    const config = readRuntimeConfig();
    await assertRateLimit(request, "evidence-public", config.rateLimitEvidenceMax);
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      return Response.json({ error: { code: "EVIDENCE_STORAGE_NOT_CONFIGURED", message: "Evidence storage is not configured." } }, { status: 503 });
    }
    const evidence = await getPublicEvidence(publicEvidenceId);
    const storage = new SupabaseStorageProvider({
      supabaseUrl: config.supabaseUrl,
      serviceKey: config.supabaseServiceRoleKey,
      bucket: evidence.storageBucket!,
      maxBytes: config.evidenceMaxBytes
    });
    const object = await storage.getObject(evidence.storagePath!);
    const responseBody = new ArrayBuffer(object.body.byteLength);
    new Uint8Array(responseBody).set(object.body);
    return new Response(responseBody, {
      headers: {
        "content-type": evidence.storageContentType ?? object.contentType,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    return jsonErrorFromUnknown(error);
  }
}
