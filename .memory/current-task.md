# Current Task

The current task is to finish the self-audit fixes and prepare the repository for the next production-ready pass.

Latest user request:

- The owner asked to "go through the site and find errors."
- A self-audit was performed against the local app.

Confirmed findings fixed in the working tree:

1. Local API/database failure
   - `/api/health/database`, `/api/dashboard`, and `/api/integrations/github/status` initially returned 500.
   - Root cause: the database package bypassed centralized runtime config and could fall back to `localhost:55432`.
   - Fix: use `readRuntimeConfig().databaseUrl` in the Prisma client and Prisma config.

2. Dashboard New Audit deep link
   - Clicking or opening `/dashboard?newAudit=1` needed to reliably open the new audit modal.
   - Fix: `DashboardClient` now reads `useSearchParams()`.
   - `DashboardPage` wraps the client in `Suspense` to satisfy Next production build requirements.

3. Local Next dev origin issue
   - Next dev blocked requests from `127.0.0.1`, which could leave the dashboard stuck on loading in browser checks.
   - Fix: `allowedDevOrigins` includes `127.0.0.1` and `localhost`.

4. Potential broken agent detail link
   - Agent rows used an index-based lookup for `auditId`.
   - Fix: include `auditId` directly in the mapped agent object.

Verification already completed:

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
- API probe: PASS
- Browser UI probe: PASS

CI follow-up:

- Commit `557febf` was pushed to `main`.
- GitHub Actions run `30397267559` failed during `pnpm db:generate`.
- Root cause: `packages/database/prisma.config.ts` imports `@ai-swarm-qa/config`, but a fresh CI checkout had not built `packages/config`, so Prisma could not resolve `@ai-swarm-qa/config/dist/index.js`.
- Commit `c109dfa` fixed the root `db:generate` and `db:migrate` scripts so they build `@ai-swarm-qa/config` before invoking database Prisma commands.
- GitHub Actions run `30397773717` passed: Prisma generation, typecheck, tests, and build all succeeded.

Production verification:

- `GET /api/health`: PASS, returned 200.
- `GET /api/health/database`: PASS, returned 200.
- `GET /api/dashboard` and `GET /api/integrations/github/status`: returned 401 for unauthenticated probes, which is expected in production.
- Browser check: `/dashboard?newAudit=1` opened the New Audit modal in production and had no console errors.
- Browser check: public header menu buttons opened the expected link groups and had no console errors.

New QA finding fixed locally:

- Unauthenticated app data pages showed a primary `Try again` action for 401 sign-in-required states, even though retry cannot succeed without auth.
- Fix in progress: dashboard and shared app data pages now show a primary `Sign in` action for sign-in-required errors and keep `Try again` for non-auth load failures.

Next recommended actions:

1. Commit and push the sign-in-required UI fix.
2. Let CI run again.
3. Verify production once Railway auto-deploys the latest commit, or authenticate Railway CLI before manually triggering deployments.
4. Continue the full app workflow pass with an authenticated production session or approved test account: auth, dashboard navigation, new audit creation, audit detail page, findings detail, GitHub export, billing, settings, and evidence.

Do not restart design work unless the owner asks for it. The immediate priority is functional completeness: every button and page should work correctly.
