# History

## 2026-07-22

- Cloned `nocodly/AISwarmQA`.
- Confirmed the remote repository was empty.
- Started Foundation Phase.
- Added English-only documentation, memory files, agent guidance, ADRs, monorepo package skeletons, database schema, provider abstractions, web UI shell, worker shell, fixture site, Docker Compose, and CI.
- Verified the foundation with `pnpm db:generate`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 2026-07-23

- Implemented Phase 1 first real audit pipeline.
- Added audit creation APIs, local URL safety, audit status polling, deterministic Playwright worker execution, browser session records, finding evidence, migration, docs, and smoke test.
- Verified local end-to-end flow with `pnpm smoke:audit`; fixture audit completed with 7 findings.
- Implemented Phase 2 multi-agent deterministic mission execution system.
- Added mission registry, six specialist mission executors, mission queue payloads, mission-scoped browser contexts, idempotent finalizer, report model, scoring, provenance, UI mission progress, docs, and smoke assertions.
- Verified local end-to-end flow with `pnpm smoke:audit`; fixture audit completed with 6 missions, score 40, and 7 findings.
- Implemented Phase 3 Anthropic-powered Planner Agent.
- Added queued planning jobs, sanitized snapshots, planner prompt `ai-swarm-qa-planner` v1, mock provider scenarios, provider error normalization, cost controls, `AuditPlan`, fallback policy, UI planning summary, docs, ADRs, and planner smoke tests.
- Verified deterministic, mock planner, and fallback smoke flows.

## 2026-07-24

- Implemented Phase 4 bounded autonomous Browser Agent.
- Added optional `autonomous-browser` mission, strict action schemas, bounded observations, step-scoped target IDs, same-origin enforcement, safety policy, synthetic form data, mock Browser Agent provider, prompt `ai-swarm-qa-browser-agent` v1, `BrowserAgentRun` and `BrowserAgentStep` replay persistence, UI replay timeline, fixture autonomous journey, docs, ADR, and smoke tests.
- Verified deterministic audit, planner success/fallback, Browser Agent success, and Browser Agent safety smoke flows.
- Implemented Phase 5 autonomous multi-agent swarm.
- Added optional `browser-swarm` mission, role-specific Browser Agents, isolated browser contexts, sanitized shared coverage state, aggregate budgets, `BrowserSwarmRun`/`BrowserSwarmAgent`, swarm UI, docs, ADR, and swarm smoke tests.
- Implemented Phase 6 real Anthropic integration through `packages/ai`.
- Added `AnthropicProvider`, provider selection, retries/backoff, timeout/rate-limit handling, malformed JSON recovery, Browser Agent structured real-provider support, mock fallback, provider metrics, UI/API display, docs, and safety cleanup for `.env.example`.
