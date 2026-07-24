# ADR 0007: AI-Assisted Mission Planning

Status: Accepted

Date: 2026-07-23

## Context

Phase 2 can execute deterministic specialist missions, but every standard audit uses the same mission priorities and limits. The product needs a QA Lead style planner that can classify the target and prioritize visible journeys without controlling the browser.

## Decision

Add an AI-assisted planner that runs in the execution plane as a queued `plan-audit` job. The planner receives a bounded sanitized snapshot, returns structured JSON, and merges accepted proposals with the deterministic baseline.

The deterministic baseline remains authoritative and required missions cannot be removed.

## Alternatives

- Run AI planning directly in `POST /api/audits`: rejected because provider latency and failures would affect UI requests.
- Let Claude control Playwright immediately: rejected because Phase 3 is planning only.
- Replace deterministic planning entirely: rejected because fallback must be guaranteed.

## Consequences

Planning becomes explainable and extensible while preserving deterministic execution. Additional browser autonomy can be introduced later behind stricter tool policies.

## Security Implications

Only sanitized snapshots are sent to providers. Provider output is schema validated and policy filtered before persistence.

## Cost Implications

Planner calls are explicitly disabled by default and guarded by token, timeout, attempt, and estimated cost budgets.
