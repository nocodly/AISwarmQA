import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { assertWorkspacePermission } from "@ai-swarm-qa/database";
import { z } from "zod";
import { jsonError, jsonErrorFromUnknown } from "../../errors";
import { requireAuth } from "@/lib/auth";
import { assertRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createProCheckoutSession } from "@/lib/stripe";

const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"])
});

export async function POST(request: Request) {
  try {
    const config = readRuntimeConfig();
    await assertRateLimit(request, "stripe-checkout", config.rateLimitStripeCheckoutMax);
    const actor = await requireAuth(request);
    await assertWorkspacePermission({ workspaceId: actor.workspaceId, userId: actor.userId, permission: "billing:manage" });
    const body = checkoutSchema.parse(await request.json());
    const session = await createProCheckoutSession({ workspaceId: actor.workspaceId, userId: actor.userId, email: actor.email, interval: body.interval });
    return Response.json({ url: session.url });
  } catch (error) {
    const rate = rateLimitResponse(error);
    if (rate) return rate;
    if (error instanceof Error && error.message === "STRIPE_NOT_CONFIGURED") {
      return jsonError("STRIPE_NOT_CONFIGURED", "Stripe Checkout is not configured yet.", 503);
    }
    return jsonErrorFromUnknown(error);
  }
}
