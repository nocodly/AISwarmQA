# Development

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:generate
pnpm dev
```

## Worker

```bash
pnpm worker:dev
```

The worker consumes `audit-missions` jobs. Each job targets one planned deterministic mission and runs in its own Playwright browser context.

The same queue also carries `plan-audit` jobs. Planning jobs collect sanitized snapshots, optionally call the AI planner, persist `AuditPlan`, create mission rows, and enqueue mission jobs.

## Fixture Site

```bash
pnpm --filter @ai-swarm-qa/broken-demo-site dev
```

The fixture site runs on `http://localhost:4100` and intentionally includes controlled defects for deterministic browser testing.

## Phase 2 Local Flow

Run these in separate terminals after Docker services and migrations are ready:

```bash
pnpm dev:fixture
pnpm dev:web
pnpm dev:worker
```

Then open `http://localhost:3000`, submit `http://localhost:4100`, and wait on the audit detail page. Polling stops when the audit is `completed`, `failed`, or `cancelled`.

## Smoke Test

With Postgres, Redis, fixture, web, and worker already running:

```bash
pnpm smoke:audit
pnpm smoke:planner
pnpm smoke:planner:fallback
```

The smoke test submits the fixture URL through the web API, polls for completion, expects six terminal missions, checks for a generated report, and expects persisted findings with source mission provenance.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## URL Safety

Development only allows local audit targets listed in `AUDIT_DEV_ALLOWED_HOSTS`, such as `localhost:4100` and `127.0.0.1:4100`. Production blocks localhost, loopback, private IPv4 ranges, link-local metadata addresses, and unsupported protocols.
## Autonomous Browser Agent

Default behavior remains disabled:

```text
AUTONOMOUS_BROWSER_MODE=disabled
```

Local Phase 4 testing uses mock mode:

```text
AUTONOMOUS_BROWSER_MODE=mock
AUTONOMOUS_MOCK_SCENARIO=success
```
