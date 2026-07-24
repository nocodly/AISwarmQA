# Testing Strategy

## Static and Unit Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Unit tests cover:

- URL normalization and safety
- audit status transitions
- mission planning and mission status transitions
- finding fingerprint generation
- finding deduplication
- queue job schema
- deterministic report scoring
- safe interaction label classification
- AI planner prompt and structured mock provider behavior
- mock AI provider

## Smoke Test

The Phase 2 smoke test is intentionally separate because it requires local services and running processes.

Start:

```bash
pnpm dev:infra
pnpm db:migrate
pnpm db:generate
pnpm dev:fixture
pnpm dev:web
pnpm dev:worker
```

Then run:

```bash
pnpm smoke:audit
pnpm smoke:planner
pnpm smoke:planner:fallback
```

The smoke test verifies that the audit completes, six missions are planned, all missions are terminal, a deterministic report is generated, and findings include source mission provenance.

Planner smoke uses `PLANNER_MOCK_SCENARIO` and does not require a real Anthropic API key. `smoke:planner:fallback` verifies deterministic fallback after a mock provider timeout.
## Browser Agent Smoke Tests

Phase 4 adds:

- `pnpm smoke:browser-agent`
- `pnpm smoke:browser-agent:safety`

Run them with the web app, worker, fixture site, PostgreSQL, and Redis running. The worker must use `AUTONOMOUS_BROWSER_MODE=mock`; the safety smoke uses `AUTONOMOUS_MOCK_SCENARIO=safety-sequence`.

## Browser Swarm Smoke Tests

Phase 5 adds:

- `pnpm smoke:swarm`
- `pnpm smoke:swarm:safety`
- `pnpm smoke:swarm:budget`

Run them with the web app, worker, fixture site, PostgreSQL, and Redis running. The worker must use `SWARM_MODE=mock`.

Recommended local worker modes:

```bash
SWARM_MODE=mock SWARM_MOCK_SCENARIO=success SWARM_MAX_AGENTS=4 SWARM_MAX_CONCURRENT_AGENTS=2 pnpm dev:worker
SWARM_MODE=mock SWARM_MOCK_SCENARIO=unsafe-agent SWARM_MAX_AGENTS=4 SWARM_MAX_CONCURRENT_AGENTS=2 pnpm dev:worker
SWARM_MODE=mock SWARM_MOCK_SCENARIO=step-budget SWARM_MAX_TOTAL_STEPS=4 SWARM_MAX_PROVIDER_CALLS=4 pnpm dev:worker
```

Only one worker with one swarm scenario should consume jobs during mode-specific smoke tests. Stale workers with old environment variables can legitimately pick up queue jobs and make the scenario assertion fail.
