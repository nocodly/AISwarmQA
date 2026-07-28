# Architecture Summary

AISwarmQA is a monorepo with a clear separation between the Control Plane and Execution Plane.

Control Plane:

- Authentication.
- Users.
- Organizations and workspaces.
- Projects.
- Subscriptions and usage limits.
- Audit creation and audit status.
- Reports.
- Billing.
- Dashboard.
- GitHub App connection and export UI.
- Evidence access routes.

Execution Plane:

- Audit planning.
- Browser workers.
- Mission execution.
- Autonomous browser agent.
- Multi-agent swarm.
- Evidence collection.
- Raw finding collection.
- Finding normalization, deduplication, severity assignment.
- Report generation.
- GitHub issue export jobs.

Important boundaries:

- UI/API requests must not run long browser automation directly.
- Long-running work belongs in queues and workers.
- AI provider calls must go through provider abstractions.
- Mock provider must remain available for deterministic fallback.
- Anthropic provider must never expose API keys or prompt secrets in logs.
- Secrets must only come from secure environment variables or platform secret stores.
- No plaintext credentials should be stored.
- Private network targets must not be auditable.

Core integrations:

- Next.js web app in `apps/web`.
- Worker app in `apps/worker`.
- Shared packages in `packages/*`.
- Prisma database package in `packages/database`.
- Runtime config package in `packages/config`.
- GitHub integration package in `packages/github`.
- Queue package in `packages/queue`.
- Storage package in `packages/storage`.
- AI provider package in `packages/ai`.

Production services:

- Railway web service.
- Railway worker service.
- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage for evidence.
- Redis for queues.
- Anthropic for real AI provider mode.
- GitHub App for installation, repository sync, webhook handling, and issue export.
- Stripe for SaaS billing.

Design and UX direction:

- Keep app workflows simple and direct.
- Prefer fast, clear dashboard actions over decorative blocks.
- Avoid app links that unexpectedly send users back to the marketing site.
- The dashboard should make it obvious how to start a new audit, see active work, review findings, view evidence, and export to GitHub.
- Audit detail should be compact, action-first, and findings-first.
- Finding detail should feel like a GitHub issue preview with real evidence and clear reproduction data.
