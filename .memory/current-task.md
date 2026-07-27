# Current Task

Continue Phase 7C: Supabase Auth, durable evidence storage, and GitHub App activation gate.

Status: In progress on 2026-07-27; local typecheck passed after additive auth/storage implementation. Production deployment and GitHub App activation still require full validation and configured GitHub App variables.

## Phase 7C Progress

- Added Supabase Auth user mapping with `User.supabaseUserId`.
- Added server-side auth resolution for Next API routes with production fail-closed behavior and explicit non-production dev actor fallback.
- Added workspace-aware audit, finding, GitHub repository, export batch, and retry access checks.
- Added Supabase Storage evidence metadata fields and additive migration `202607270001_phase_7c_auth_evidence_storage`.
- Added private Supabase Storage provider using REST API, MIME validation, size limits, random object paths, and local-storage fallback behavior.
- Added worker-side screenshot promotion to Supabase Storage after finding persistence; upload failures are logged and do not crash audits.
- Added stable external evidence route `GET /evidence/:publicEvidenceId` that proxies private Supabase Storage through the server.
- Added GitHub export opt-in flag `includeExternalEvidence`, default unchecked in UI, stored in export options, and used by worker issue rendering.
- Updated `.env.example` with Supabase Auth/Storage placeholders only.
- Verified `pnpm typecheck` passes.

## Phase 7C Remaining Work

- Run `pnpm lint`, `pnpm test`, and `pnpm build`.
- Create or verify private Supabase Storage bucket `aiswarmqa-evidence`.
- Apply production Prisma migration only after local validation.
- Set Railway non-secret/secret variables for Supabase Auth/Storage if missing, without printing values.
- Deploy web and worker, verify health/database/worker/Redis/evidence behavior.
- GitHub App activation remains conditional until GitHub App variables are configured in Railway.

Implement Phase 7: Production Audit Flow and GitHub Issue Export.

Status: Conditionally implemented on 2026-07-26; production verification is blocked on explicit production migration approval and GitHub App credentials.

## Progress

- Read repository guidance, memory, database schema, queue package, audit APIs, worker entrypoint, and audit results UI.
- Confirmed Phase 1-6 baseline is clean on `main...origin/main`.
- Confirmed production Railway web, worker, and Redis are configured from the previous step.
- Added GitHub export Prisma models and additive migration.
- Added `@ai-swarm-qa/github` with issue rendering, idempotency, sanitization, retry classification, labels, mock provider, and unit tests.
- Added `github-export` BullMQ queue and worker processing.
- Added API routes for GitHub status, install/callback scaffolding, repositories, repository metadata, export preview, export creation, batch status, and retry.
- Added audit results page actions for JSON/CSV download, report sharing, finding selection, preview, confirmation, and export progress.
- Added `pnpm smoke:github-export` manual smoke scaffold with explicit env confirmation.
- Added `docs/PHASE_7_GITHUB_EXPORT.md`.
- Verified `corepack pnpm@10.0.0 -r typecheck`, `corepack pnpm@10.0.0 -r test`, `corepack pnpm@10.0.0 -r build`, and `corepack pnpm@10.0.0 -r lint`.
- Production `prisma migrate status` found six pending migrations. `migrate deploy` was not applied because explicit production schema-change approval is required.

## Objective

Verify the production audit pipeline and add a production-ready GitHub Issue export foundation that remains safe without GitHub App credentials.

## Scope

- Keep the existing audit pipeline, provider abstraction, worker architecture, and mock provider behavior intact.
- Add database models for GitHub connections, repositories, export batches, and per-finding exports.
- Add a GitHub export queue so issue creation is never performed synchronously in a web request.
- Add a mockable GitHub provider abstraction and issue body renderer.
- Add API routes for connection status, repository listing, export preview, export creation, export status, and retry.
- Add audit results UI actions for download, share, selection, preview, and GitHub export states.
- Add documentation and setup instructions for GitHub App credentials.

## Exclusions

- Do not invent GitHub App production secrets.
- Do not ask users to paste PATs into the application.
- Do not create real GitHub Issues during CI.
- Do not make audit reports public by default.
- Do not run destructive production database operations.

## Implementation Plan

1. Add shared schemas for GitHub export requests and queue jobs.
2. Add Prisma models and migration for GitHub export state.
3. Add database service helpers with idempotency and export progress updates.
4. Add a GitHub provider package with mock provider, issue template generation, sanitization, retry classification, and label mapping tests.
5. Add a dedicated GitHub export queue.
6. Add API routes for status, repository metadata, preview, export, batch status, and retry.
7. Wire worker processing for GitHub export jobs.
8. Add audit results UI actions and export progress display.
9. Add docs, `.env.example` entries, and smoke-test scaffolding.
10. Run local validation and report production/manual setup status.

## Safety Risks

- GitHub credentials and installation tokens must never be exposed to the browser, Redis payloads, logs, or reports.
- Export jobs must contain references only: batch ID, workspace ID, and user ID.
- Idempotency must prevent duplicate GitHub Issues on retries, double-clicks, worker restarts, and provider timeouts.
- Evidence URLs must not expose credentials or cross-workspace artifacts.

## Progress

- Read repository guidance, memory, provider abstraction, mock provider, planner flow, Browser Agent loop, and swarm orchestrator.
- Removed a plaintext Anthropic API key from `.env.example`; repository samples now use empty placeholders only.
- Added runtime provider selection fields and real-provider fallback controls.
- Added `AnthropicProvider`, structured Browser Agent decision support, JSON recovery, retries, backoff, metrics, and health-check support in `packages/ai`.
- Wired planner and Browser Agent provider selection through provider factories; swarm inherits provider behavior through Browser Agent runs.
- Updated API/UI/docs/memory with provider/model/latency/token/cost metadata.
- Verified mock provider smoke flows and Anthropic missing-key mock fallback.

## Objective

Connect the real Anthropic API through the existing AI provider abstraction while preserving Phase 1-5 behavior, mock providers, deterministic fallback, replay history, and central finding normalization.

## Scope

- Add runtime provider selection with `AI_PROVIDER=mock|anthropic`.
- Keep the existing mock planner and mock Browser Agent providers.
- Promote the Anthropic adapter to a production `AnthropicProvider`.
- Reuse provider abstractions for planner, Browser Agent, and swarm agents.
- Add structured JSON output handling, malformed JSON recovery, validation, retries, exponential backoff, timeout handling, rate-limit handling, token accounting, cost estimation, provider metrics, health checks, and graceful fallback.
- Ensure provider request logging never includes API keys, Authorization headers, raw prompt secrets, credentials, cookies, or storage.
- Update UI/API/docs/memory to display provider, model, latency, token usage, and estimated cost.

## Exclusions

- Do not remove mock providers.
- Do not store plaintext provider credentials.
- Do not bypass `packages/ai`.
- Do not allow real provider failures to crash audits.
- Do not add authentication, billing, cloud browser providers, or unrestricted browser actions.

## Implementation Plan

1. Review the current provider abstractions, mock providers, planner flow, Browser Agent loop, and swarm orchestrator.
2. Extend runtime config for `AI_PROVIDER`, `ANTHROPIC_MODEL`, provider retry/backoff/timeout defaults, and mock fallback behavior.
3. Refactor `packages/ai` around `AnthropicProvider`, structured generation helpers, JSON recovery, provider metrics, retryable error handling, and Browser Agent decision support.
4. Wire provider selection into planner, Browser Agent, and swarm without changing mission architecture.
5. Persist and expose provider metrics already supported by `AuditPlan`, `BrowserAgentRun`, `BrowserAgentStep`, and `BrowserSwarmRun`.
6. Update UI labels and docs for mock vs Anthropic provider details.
7. Add focused tests for provider selection, retries, malformed JSON recovery, fallback, and Browser Agent structured decisions.
8. Run lint, typecheck, tests, build, and required smoke commands.

All implementation plan items are complete.

## Safety Risks

- Never log or persist `ANTHROPIC_API_KEY`.
- Real provider output must be treated as untrusted until schema validation and Browser Agent safety validation pass.
- Provider fallback must not hide unsafe actions; unsafe actions should still be persisted as rejected replay steps.

## Cost and Resource Risks

- Real provider execution can incur cost; defaults must remain mock/deterministic unless explicitly enabled.
- Token/cost budgets must stop Browser Agent and swarm execution before configured limits.
- Rate limits and timeouts should gracefully fall back rather than fail the audit.
