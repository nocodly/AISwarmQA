import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { assertWorkspacePermission } from "@ai-swarm-qa/database";
import { jsonError, jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    await assertRateLimit(request, "stripe-portal", config.rateLimitStripeCheckoutMax);
    const actor = await requireAuth(request);
    await assertWorkspacePermission({ workspaceId: actor.workspaceId, userId: actor.userId, permission: "billing:manage" });
    const session = await createBillingPortalSession({ workspaceId: actor.workspaceId });
    return Response.json({ url: session.url });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    if (error instanceof Error && error.message === "STRIPE_NOT_CONFIGURED") {
      return jsonError("STRIPE_NOT_CONFIGURED", "Stripe Billing Portal is not configured yet.", 503);
    }
    if (error instanceof Error && error.message === "STRIPE_CUSTOMER_NOT_FOUND") {
      return jsonError("STRIPE_CUSTOMER_NOT_FOUND", "No billing customer exists for this workspace yet.", 409);
    }
    return jsonErrorFromUnknown(error);
  }
}
