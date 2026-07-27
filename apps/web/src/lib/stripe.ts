import Stripe from "stripe";
import { readRuntimeConfig, type BillingInterval, type CommercialPlanId } from "@ai-swarm-qa/config";
import {
  findWorkspaceIdForStripeCustomer,
  getOrCreateBillingCustomerRecord,
  prisma,
  recordBillingWebhookEvent,
  syncWorkspaceSubscription
} from "@ai-swarm-qa/database";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const config = readRuntimeConfig();
  if (!config.stripeSecretKey) return null;
  stripeClient ??= new Stripe(config.stripeSecretKey, {
    appInfo: { name: "AISwarmQA", version: "0.1.0" }
  });
  return stripeClient;
}

export function getStripePriceId(interval: Exclude<BillingInterval, "contact">) {
  const config = readRuntimeConfig();
  return interval === "monthly" ? config.stripeProMonthlyPriceId : config.stripeProYearlyPriceId;
}

export async function createProCheckoutSession(input: {
  workspaceId: string;
  userId: string;
  email: string;
  interval: Exclude<BillingInterval, "contact">;
}) {
  const config = readRuntimeConfig();
  const stripe = getStripeClient();
  const priceId = getStripePriceId(input.interval);
  if (!stripe || !priceId) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  const existingCustomer = await prisma.billingCustomer.findUnique({ where: { workspaceId: input.workspaceId } });
  let customerId = existingCustomer?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: { workspaceId: input.workspaceId, userId: input.userId }
    });
    customerId = customer.id;
    await getOrCreateBillingCustomerRecord({ workspaceId: input.workspaceId, stripeCustomerId: customer.id });
  }
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${config.appUrl.replace(/\/$/, "")}/billing?checkout=success`,
    cancel_url: `${config.appUrl.replace(/\/$/, "")}/billing?checkout=cancelled`,
    subscription_data: {
      metadata: { workspaceId: input.workspaceId, plan: "pro", interval: input.interval },
      ...(config.stripeTrialDays > 0 ? { trial_period_days: config.stripeTrialDays } : {})
    },
    metadata: { workspaceId: input.workspaceId, userId: input.userId, plan: "pro", interval: input.interval }
  });
}

export async function createBillingPortalSession(input: { workspaceId: string }) {
  const config = readRuntimeConfig();
  const stripe = getStripeClient();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");
  const customerId = (await prisma.billingCustomer.findUnique({ where: { workspaceId: input.workspaceId } }))?.stripeCustomerId;
  if (!customerId) throw new Error("STRIPE_CUSTOMER_NOT_FOUND");
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${config.appUrl.replace(/\/$/, "")}/billing`
  });
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  const config = readRuntimeConfig();
  const stripe = getStripeClient();
  if (!stripe || !config.stripeWebhookSecret) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!signature) throw new Error("STRIPE_SIGNATURE_MISSING");
  const event = stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  const recorded = await recordBillingWebhookEvent({ provider: "stripe", eventId: event.id, eventType: event.type });
  if (recorded.duplicate) return { duplicate: true, eventType: event.type };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const workspaceId = session.metadata?.workspaceId;
    if (workspaceId && typeof session.customer === "string") {
      await getOrCreateBillingCustomerRecord({ workspaceId, stripeCustomerId: session.customer });
    }
    return { duplicate: false, eventType: event.type };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
    const workspaceId = customerId ? await findWorkspaceIdForStripeCustomer(customerId) : null;
    if (workspaceId) {
      await syncWorkspaceSubscription({
        workspaceId,
        plan: "pro",
        interval: "monthly",
        status: event.type === "invoice.paid" ? "active" : "past_due",
        stripeCustomerId: customerId,
        latestPaymentStatus: event.type === "invoice.paid" ? "paid" : "payment_failed"
      });
    }
  }

  return { duplicate: false, eventType: event.type };
}

async function syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata.workspaceId || (typeof subscription.customer === "string" ? await findWorkspaceIdForStripeCustomer(subscription.customer) : null);
  if (!workspaceId) return;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const config = readRuntimeConfig();
  const interval = priceId === config.stripeProYearlyPriceId ? "yearly" : "monthly";
  await syncWorkspaceSubscription({
    workspaceId,
    plan: (subscription.metadata.plan as CommercialPlanId | undefined) ?? "pro",
    interval,
    status: mapStripeSubscriptionStatus(subscription.status),
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    latestPaymentStatus: subscription.status,
    currentPeriodStart: secondsToDate((subscription as unknown as { current_period_start?: number | null }).current_period_start),
    currentPeriodEnd: secondsToDate((subscription as unknown as { current_period_end?: number | null }).current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: secondsToDate(subscription.trial_end),
    canceledAt: secondsToDate(subscription.canceled_at)
  });
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "unpaid";
  if (status === "canceled") return "canceled";
  if (status === "incomplete") return "incomplete";
  if (status === "incomplete_expired") return "incomplete_expired";
  return "past_due";
}

function secondsToDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}
