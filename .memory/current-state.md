# AISwarmQA Current State

Last updated: 2026-07-28

AISwarmQA is a production-verified SaaS MVP for autonomous AI QA audits.

Completed work so far:

- Phase 1: first real audit pipeline.
- Phase 2: multi-agent execution foundation.
- Phase 3: Anthropic-powered planner agent.
- Phase 4: bounded autonomous browser agent.
- Phase 5: autonomous multi-agent swarm.
- Phase 6: real Anthropic integration, deterministic mock fallback, retries, timeouts, provider metrics, cost accounting, UI provider visibility, and verified CI tag `v0.6.0`.
- Railway production deployment was diagnosed and repaired.
- Supabase, PostgreSQL, Redis, worker, Playwright, Anthropic, and GitHub App production flows were verified.
- GitHub App export was verified with real test issues, duplicate prevention, webhook idempotency, and stable evidence routes.
- Phase 7 production security checks were completed, including cross-workspace access, repository edge cases, webhook delivery, evidence storage, and log leak checks.
- Phase 8 added SaaS launch foundation with Stripe billing direction and plan structure.
- Phase 9 focused on brand and landing design: neon dark grid, AISwarmQA wordmark, custom colorful icons, GitHub visual treatment, animated annotations, stronger FAQ, and app visual alignment.
- Phase 10 focused on dashboard/app functionality and production readiness of pages and buttons.

Important product direction:

- The owner communicates in Ukrainian, but all repository content, UI copy, docs, code comments, prompts, and commit messages must remain English.
- The app should prioritize simple, obvious product workflows over decorative design work.
- The dashboard should feel closer to Railway's clarity: simple sidebar, visible actions, fast project/audit creation, no confusing links back to the marketing site from core app actions.
- The most important user workflow is: sign up/sign in, create a new audit from a simple modal, provide target URL and optional temporary test access, watch audit progress, review findings, open a finding detail view, export safe findings to GitHub.
- Audit result pages should show top actions first, then findings as compact cards. Clicking a finding should open an issue-like detail view with severity, affected page, reproduction steps, expected vs actual behavior, suggested fix, acceptance criteria, and real evidence.
- Agents should eventually understand product structure, button destinations, expected flows, design rules, forbidden actions, and visual quality mismatches, not only inspect raw page appearance.

Current local working tree status:

- There are uncommitted fixes from a self-audit of the local site.
- Do not discard them.
- The changes are small and focused on functionality and local verification.

Current uncommitted fixes:

- `packages/database/src/client.ts`: database client now reads `DATABASE_URL` via the central `readRuntimeConfig()` loader instead of direct `process.env` fallback.
- `packages/database/prisma.config.ts`: Prisma config also uses `readRuntimeConfig().databaseUrl`.
- `apps/web/src/app/api/health/database/route.ts`: database health error response now includes a safe error code and redacted message tail.
- `apps/web/next.config.ts`: added local dev origins for `127.0.0.1` and `localhost`.
- `apps/web/src/app/dashboard/DashboardClient.tsx`: dashboard now reacts to `newAudit=1` through `useSearchParams()`.
- `apps/web/src/app/dashboard/page.tsx`: dashboard client is wrapped in `Suspense` so production build succeeds.
- `apps/web/src/components/AppDataPages.tsx`: agent links now use each finding's real `auditId` instead of rebuilding the URL from array index.

Verification from the latest self-audit:

- Internal marketing links returned HTTP 200.
- App pages returned HTTP 200: `/dashboard`, `/audits`, `/findings`, `/agents`, `/reports`, `/evidence`, `/github`.
- API routes returned HTTP 200: `/api/health`, `/api/health/database`, `/api/dashboard`, `/api/integrations/github/status`.
- Browser UI check passed: `/dashboard?newAudit=1` opens the new audit modal, skeleton disappears, and no console errors were detected.
- New audit modal workflow reached the launch review step: URL -> Access -> Mission -> Launch.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Known local development notes:

- Recursive pnpm commands can fail inside the managed sandbox on Windows with `spawn EPERM`; rerun with approved escalation when needed.
- Local Next dev server should be started with the app-local `next.cmd` if `pnpm --filter exec next` cannot find `next` on Windows.
- Do not expose secrets from `.env`, `.env.local`, Railway, Supabase, GitHub App, Anthropic, or Stripe.
