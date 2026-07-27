import { jsonError } from "../../../errors";
import { handleStripeWebhook } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await handleStripeWebhook(rawBody, request.headers.get("stripe-signature"));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "STRIPE_NOT_CONFIGURED") {
      return jsonError("STRIPE_NOT_CONFIGURED", "Stripe webhook is not configured.", 503);
    }
    if (error instanceof Error && error.message === "STRIPE_SIGNATURE_MISSING") {
      return jsonError("STRIPE_SIGNATURE_MISSING", "Stripe signature is required.", 400);
    }
    return jsonError("STRIPE_WEBHOOK_REJECTED", "Stripe webhook could not be verified.", 400);
  }
}
