# AI Planner Agent

Phase 3 adds an AI-assisted Planner Agent that creates mission plans only. It does not control Playwright, click buttons, submit forms, log in, pay, or generate executable browser actions.

## Flow

```text
POST /api/audits
  -> create audit
  -> enqueue plan-audit job
  -> worker collects sanitized planning snapshot
  -> deterministic baseline plan is generated
  -> optional AI planner proposes mission priorities and journeys
  -> schemas and policy validate output
  -> accepted proposals merge with baseline
  -> AuditPlan and Mission records are persisted
  -> mission jobs are enqueued
```

## Modes

- `deterministic`: default. Uses the Phase 2 deterministic planner only.
- `ai-assisted`: uses baseline plus sanitized snapshot plus provider output, with deterministic fallback on any failure.

AI-assisted mode requires explicit environment configuration. Normal CI and local smoke tests use the mock provider.

## Persistence

Planning metadata is stored in `AuditPlan`, including mode, source, status, prompt ID/version, provider/model, token usage, estimated cost, website classification, important journeys, warnings, accepted proposals, rejected proposals, and fallback reason.

## Fallback

Provider failure is not an audit failure. Timeout, rate limit, missing key, invalid JSON, over-budget usage, oversized input, unsafe routes, and rejected proposals all fall back to the deterministic baseline plan.
