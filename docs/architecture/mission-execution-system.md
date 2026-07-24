# Mission Execution System

Phase 2 replaces the single deterministic worker path with a bounded multi-mission execution system.

## Mission Registry

Mission definitions live in `packages/shared` and are the source of truth for:

- mission type
- role and objective
- priority
- required vs optional behavior
- timeout
- max attempts
- viewport
- per-mission limits

The standard local plan includes:

- `error-reviewer`
- `link-tester`
- `form-tester`
- `mobile-tester`
- `accessibility-reviewer`
- `interaction-tester`

`preview` mode intentionally plans a smaller deterministic set for future faster workflows.

## Planning

`POST /api/audits` creates the audit, transitions it through validation and planning, and enqueues one `plan-audit` BullMQ job.

The planning worker creates mission rows after deterministic or AI-assisted planning. AI-assisted planning is disabled by default and always falls back to deterministic missions.

## Execution

The worker validates `ExecuteMissionJob`, marks the mission running, launches a mission-scoped Chromium context, runs the registered executor, stores browser session metadata, persists deduplicated findings, and completes or fails the mission.

Retry behavior is mission-specific. Failed missions can return to `queued` until attempts are exhausted.

## Finalization

After each mission finishes, the worker calls `finalizeAuditIfReady`.

The finalizer waits until every mission is terminal. Required mission failure fails the audit. Optional mission failure becomes a report warning.

When the audit can complete, the finalizer writes a `Report` with:

- overall deterministic score
- severity counts
- category counts
- mission summary
- execution warnings
- top findings
- limitations

## Safety Boundaries

Interaction testing only clicks labels that pass the deterministic safe interaction classifier. Destructive or purchase-oriented labels are skipped in Phase 2.

The system remains local-development only. Production target safety, authentication, billing, and Anthropic-powered planning are deferred.

## Phase 4 Autonomous Mission

When `AUTONOMOUS_BROWSER_MODE=mock`, the planner also adds one optional mission:

- `autonomous-browser`

The optional mission runs through the same mission worker path. It uses a mock Browser Agent decision provider, validates every proposed action with shared schemas and the central safety policy, persists ordered `BrowserAgentRun` and `BrowserAgentStep` replay records, and returns findings through the existing finding normalization and deduplication pipeline.
