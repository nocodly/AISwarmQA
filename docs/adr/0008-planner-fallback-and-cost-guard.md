# ADR 0008: Planner Fallback and Cost Guard

Status: Accepted

Date: 2026-07-23

## Context

AI providers can be unavailable, slow, over budget, rate-limited, misconfigured, or return invalid output. Audits should still complete when planning AI fails.

## Decision

Treat AI planning as optional enhancement. Persist fallback reason in `AuditPlan`, use deterministic missions, and continue the audit.

Provider errors are normalized before planner policy sees them. Cost estimates are centralized and checked before and after provider calls.

## Alternatives

- Fail the audit on planner failure: rejected because deterministic QA remains useful.
- Retry indefinitely: rejected because costs and latency must be bounded.
- Store raw provider responses for debugging: rejected because responses may contain sensitive derived data.

## Consequences

Users receive useful deterministic results even when AI planning is unavailable. Debugging relies on structured safe metadata rather than raw prompts or responses.

## Security Implications

Fallback prevents pressure to weaken redaction or validation just to make AI succeed.

## Cost Implications

Budget overruns stop AI planning and do not trigger further retries.
