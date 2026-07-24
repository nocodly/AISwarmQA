# Architecture Summary

AI Swarm QA is split into two planes.

The Control Plane owns users, organizations, projects, audits, subscriptions, usage limits, reports, billing, dashboard UI, and public API surfaces. It creates audits and enqueues planning jobs; it does not call AI providers or run browser automation in HTTP requests.

The Execution Plane owns planning, mission execution, browser workers, evidence collection, finding generation, deduplication, severity assignment, report generation, and autonomous Browser Agent execution. Planning jobs collect sanitized snapshots, optionally call the AI planner through `packages/ai`, persist `AuditPlan`, and enqueue mission jobs.

Long-running operations move through Redis and BullMQ. PostgreSQL is the source of truth. Prisma owns the database schema. AI providers are accessed only through `packages/ai`. Mission contracts, registry, planner schemas, Browser Agent schemas, redaction helpers, merge policy, status transitions, scoring, and safe interaction labels live in `packages/shared`.

Phase 4 adds one optional `autonomous-browser` mission. The worker remains server-authoritative: the mock decision provider proposes one structured action, the worker validates schema and safety policy, executes only allowlisted tools, persists `BrowserAgentRun` and ordered `BrowserAgentStep` replay history, and sends findings through the central finding pipeline.

Phase 5 adds one optional `browser-swarm` mission. The worker creates role-specific bounded Browser Agents, gives each agent an isolated Playwright context, shares only sanitized coverage fingerprints through `SwarmSharedState`, tracks aggregate steps/provider calls/navigation/screenshot/token/cost budgets, persists `BrowserSwarmRun` and `BrowserSwarmAgent`, links each agent to a replayable `BrowserAgentRun`, and still merges findings through the central pipeline.

Phase 6 connects real Anthropic requests through `packages/ai` with `AnthropicProvider`. Runtime provider selection uses `AI_PROVIDER=mock|anthropic`; mock remains the default. Planner, Browser Agent, and swarm all use provider factories, structured JSON validation, retry/backoff, timeout handling, rate-limit normalization, token/cost accounting, safe request logging, and mock fallback.
