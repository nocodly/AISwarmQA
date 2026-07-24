# Browser Agent Action Loop

The worker owns the action loop and remains authoritative over browser state.

1. Enforce mission, step, provider-call, cost, and interaction budgets.
2. Observe the page with bounded DOM metadata, recent browser errors, and optional screenshots.
3. Build a bounded decision input with recent history only.
4. Ask the mock decision provider for one action.
5. Validate the action with the discriminated union schema.
6. Evaluate the central safety policy.
7. Execute the allowlisted tool handler or persist the rejection.
8. Persist the ordered `BrowserAgentStep`.
9. Update counters, no-progress fingerprints, and rejection counters.
10. Stop on `finish` or a terminal budget/safety reason.

Rejected actions consume a provider call and a step. The rejection limit prevents unlimited retry loops.

Terminal reasons include `FINISHED_BY_AGENT`, `STEP_BUDGET_EXHAUSTED`, `PROVIDER_BUDGET_EXHAUSTED`, `TIME_BUDGET_EXHAUSTED`, `COST_BUDGET_EXHAUSTED`, `NO_PROGRESS`, `TOO_MANY_REJECTIONS`, `PROVIDER_FAILURE`, `BROWSER_FAILURE`, and `EXTERNAL_NAVIGATION_BLOCKED`.
