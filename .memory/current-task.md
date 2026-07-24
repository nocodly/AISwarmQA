# Current Task

Implement Phase 6: Real Anthropic Integration.

Status: Completed on 2026-07-24.

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
