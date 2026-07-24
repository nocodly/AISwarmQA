# AI Swarm QA

AI Swarm QA is a B2B SaaS and API platform for autonomous website and web application testing by coordinated AI-assisted browser agents.

The repository currently implements Phase 5: a local multi-mission audit pipeline with deterministic planning by default, optional mock AI-assisted planning, one optional bounded Browser Agent, and an optional mock autonomous Browser Agent swarm.

## Product Direction

The product promise is: **AI QA Team for every deployment**.

Users provide a URL, confirm they have the right to test it, and start an audit. The system plans missions, runs browser workers, collects evidence, normalizes findings, deduplicates issues, assigns severity, and generates a structured report.

## Foundation Stack

- Next.js 16.2.11, React 19.2.8, TypeScript 5.9.3
- PostgreSQL with Prisma 7.9.0
- Redis with BullMQ 5.80.10
- Playwright 1.61.1
- Anthropic SDK 0.113.0 behind a provider abstraction
- Vitest 4.1.10

## Repository Layout

```text
apps/
  web/       Control-plane UI and API surface skeleton
  worker/    Execution-plane worker skeleton
packages/
  ai/
  browser-actions/
  config/
  database/
  queue/
  shared/
  storage/
tests/fixtures/sites/broken-demo/
docs/
.agents/
.memory/
```

## Local Flow

```bash
pnpm install
cp .env.example .env
pnpm dev:infra
pnpm db:migrate
pnpm db:generate
```

Start the three local processes in separate terminals:

```bash
pnpm dev:fixture
pnpm dev:web
pnpm dev:worker
```

Open `http://localhost:3000`, submit `http://localhost:4100`, and watch `/audits/{auditId}` until the audit reaches a terminal status.

The standard local audit plans six deterministic missions:

- `error-reviewer`
- `link-tester`
- `form-tester`
- `mobile-tester`
- `accessibility-reviewer`
- `interaction-tester`

No Anthropic calls, billing flows, authentication, or production deployment flows are enabled by default.

AI-assisted planning can be enabled explicitly with `AUDIT_PLANNING_MODE=ai-assisted` and `PLANNER_AI_ENABLED=true`. Use `PLANNER_MOCK_SCENARIO=success` for local mock planner smoke tests without a paid API key.

Phase 4 adds an optional bounded autonomous Browser Agent.

Default audits still run the six deterministic missions. Enable the Phase 4 mission locally with:

```text
AUTONOMOUS_BROWSER_MODE=mock
AUTONOMOUS_MOCK_SCENARIO=success
```

The Browser Agent uses a strict tool allowlist, same-origin enforcement, server-generated synthetic form values, step and cost budgets, persisted replay history, and the existing finding pipeline. It does not require a real Anthropic API key.

New smoke commands:

```text
pnpm smoke:browser-agent
pnpm smoke:browser-agent:safety
```

Phase 5 adds an optional autonomous Browser Agent swarm. Enable it locally with:

```text
SWARM_MODE=mock
SWARM_MOCK_SCENARIO=success
SWARM_MAX_AGENTS=4
SWARM_MAX_CONCURRENT_AGENTS=2
```

The swarm creates role-specific agents with isolated browser contexts, sanitized shared coverage state, aggregate budgets, and per-agent replay history. It remains mock-only and uses the same Browser Agent safety policy and central finding pipeline.

New swarm smoke commands:

```text
pnpm smoke:swarm
pnpm smoke:swarm:safety
pnpm smoke:swarm:budget
```
