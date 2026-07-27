# Phase 8 SaaS Launch Foundation

Status: code foundation implemented, production billing/email activation pending manual provider configuration.

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
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `APP_URL`

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
- evidence revocation behavior remains intact.

Legal pages are placeholders and require professional legal review before public launch.
