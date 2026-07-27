# Phase 8 SaaS Launch Foundation

Status: SaaS foundation implemented. Stripe product, Pro prices, Billing Portal, and production webhook are configured; production deployment and full paid lifecycle smoke remain pending.

## Plan Model

The authoritative plan catalog lives in `packages/config/src/index.ts`.

Stable plan identifiers:

- `free`
- `pro`
- `business`

Limits can be overridden for tests with `PLAN_OVERRIDES_JSON`.

## Stripe Configuration

Stripe secrets belong on the Railway web service only.

Required for production billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `APP_URL`

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is not required by the current implementation because Checkout sessions are created server-side and the browser receives a Stripe-hosted Checkout URL.

Webhook URL:

`https://ai-swarm-qaweb-production.up.railway.app/api/billing/stripe/webhook`

Required Stripe webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The Checkout success URL does not activate a paid plan. Subscription state changes only through Stripe webhook-synchronized database state.

## Email Configuration

Email is prepared behind Resend-compatible environment variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`

If these are missing, transactional email events are recorded as skipped and no email is sent.

## Sentry Configuration

Sentry is optional and gated by:

- `SENTRY_DSN`

Missing Sentry credentials must not block deployment.

## Data Controls

Implemented foundations:

- workspace data export route;
- account data export route;
- recoverable workspace deletion request;
- evidence expiration metadata;
- evidence revocation behavior remains intact;
- Redis-backed distributed rate limiting with in-memory fallback;
- cooperative audit cancellation through `POST /api/audits/:auditId/cancel`;
- daily retention cleanup queue that revokes shared evidence before deleting expired Supabase Storage objects.

Legal pages are placeholders and require professional legal review before public launch.

## Operational Policies

Subscription access policy:

- `active` and `trialing` receive paid plan limits.
- `past_due` and `unpaid` keep the recorded plan for visibility but should be monitored as billing-risk states.
- `canceled`, `incomplete`, `incomplete_expired`, and absent subscriptions resolve to Free behavior unless the workspace plan has been explicitly set otherwise.
- Visiting a Checkout success URL never changes subscription state without webhook synchronization.

Retention cleanup:

- runs through BullMQ on the worker using Redis queue locking;
- claims bounded batches;
- disables public evidence sharing before storage deletion;
- retries failed deletions by clearing the queue marker and recording the last error.
