# Audit Workflow

Each audit moves through explicit states:

- `created`
- `validating`
- `planning`
- `queued`
- `running`
- `analyzing`
- `generating_report`
- `completed`
- `failed`
- `cancelled`

Every long-running stage must include:

- status
- timestamps
- retry policy
- error message when failed
- structured logs
- correlation ID
- cost tracking

Phase 3 implements the local path:

```text
created -> validating -> planning -> queued -> running -> analyzing -> generating_report -> completed
```

Planning is performed by a queued execution-plane job. `AuditPlan.status` tracks planner lifecycle as `completed`, `fallback`, or `failed`; fallback does not fail the audit.

Mission states are tracked independently:

```text
created -> queued -> running -> completed
created -> queued -> running -> failed -> queued
created -> skipped
```

Required mission failure fails the audit during finalization. Optional mission failure is recorded as a report warning. Terminal states cannot transition.
