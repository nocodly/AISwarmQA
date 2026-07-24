# Queue and Worker

Queue name: `audit-missions`.

Planning job payload:

```ts
{
  auditId: string;
  targetUrl: string;
  correlationId: string;
  auditMode: "preview" | "standard";
}
```

Mission job payload:

```ts
{
  auditId: string;
  missionId: string;
  missionType:
    | "error-reviewer"
    | "link-tester"
    | "form-tester"
    | "mobile-tester"
    | "accessibility-reviewer"
    | "interaction-tester";
  targetUrl: string;
  correlationId: string;
}
```

Jobs use a stable ID of `mission-{missionId}`. Attempts, timeout, priority, viewport, and mission limits come from the central shared mission registry. Completed and failed BullMQ jobs use bounded retention.

The worker:

1. Validates the job payload.
2. Loads audit state.
3. Marks mission and audit as running.
4. Launches a mission-scoped Playwright Chromium browser context.
5. Runs the registered deterministic mission executor.
6. Writes screenshot evidence to `AUDIT_ARTIFACTS_DIR` when needed.
7. Persists deduplicated findings with mission provenance.
8. Completes or fails the mission.
9. Calls the database finalizer, which completes the audit after every mission is terminal.

AI provider calls, when enabled, happen only inside the `plan-audit` worker path through `packages/ai`. Mission executors remain deterministic.

## Phase 4 Browser Agent Jobs

`autonomous-browser` is an optional mission type created only in mock mode. It is queued as the same `run-audit` job shape and does not introduce a separate microservice.

The worker creates one `BrowserAgentRun` for the mission attempt, persists every `BrowserAgentStep`, closes the browser context in `finally`, and lets audit finalization treat optional autonomous failure as a report warning rather than a required audit failure.
