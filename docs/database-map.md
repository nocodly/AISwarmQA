# Database Map

## Core Models

- `User`: local development owner record for this phase.
- `Organization`: local development organization.
- `Project`: target property, currently reused as `local-dev-project`.
- `Audit`: target URL, lifecycle status, timestamps, cost placeholders, browser duration, and execution summary.
- `Mission`: one deterministic specialist mission per planned Phase 2 audit, with retry counters, required flag, timeout, status timestamps, and result summary.
- `BrowserSession`: browser, viewport, timing, status, final URL, and browser duration.
- `Finding`: normalized user-facing issue with dedupe fingerprint, source mission provenance, and occurrence count.
- `FindingEvidence`: content, local paths, and metadata supporting findings.
- `Report`: deterministic audit report with score, severity/category counts, mission summary, warnings, top findings, and limitations.
- `AuditPlan`: Phase 3 planning metadata, sanitized snapshot, baseline plan, accepted/rejected AI proposals, website classification, important journeys, provider/model usage, estimated cost, prompt metadata, and fallback reason.

## Migration Workflow

Use:

```bash
pnpm db:migrate
pnpm db:generate
```

Do not use schema push as the documented workflow.
## Browser Agent Replay

Phase 4 adds:

- `BrowserAgentRun`: one run per autonomous mission, including provider, model, prompt ID/version, objective, start/final URLs, budgets, token/cost counters, terminal reason, and summary.
- `BrowserAgentStep`: ordered sanitized replay records with observation JSON, proposed action JSON, validation status, safety decision, execution result, URLs, state-change flag, and timing.
