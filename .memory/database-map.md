# Database Map

- `User`: local development owner.
- `Organization`: local development organization.
- `OrganizationMember`: owner membership.
- `Project`: reused local target project.
- `Audit`: lifecycle status, target URL, timestamps, cost placeholders, browser duration, and execution summary.
- `Mission`: deterministic specialist mission with type, required flag, retry counters, timeout, status timestamps, and result summary.
- `BrowserSession`: Playwright session metadata and duration.
- `Finding`: normalized issue with mission provenance and occurrence count.
- `FindingEvidence`: content, local path, and metadata for findings.
- `Report`: deterministic score, severity/category counts, mission summary, warnings, top findings, and limitations.
- `AuditPlan`: planning mode/source/status, sanitized snapshot, baseline plan, proposed/accepted/rejected AI proposals, important journeys, website classification, prompt metadata, provider/model, token usage, estimated cost, warnings, and fallback reason.
- `BrowserAgentRun`: one optional autonomous mission run or one swarm-agent replay run with provider/model, prompt ID/version, objective, budgets, step/call/token/cost counters, terminal reason, final URL, optional swarm agent link, and summary.
- `BrowserAgentStep`: ordered sanitized replay records with observation JSON, proposed action JSON, safety decision, execution result, URLs, state-change flag, timing, and per-step usage placeholders.
- `BrowserSwarmRun`: aggregate swarm status, mode, max agents/concurrency, aggregate counters, sanitized coverage state, terminal reason, and summary.
- `BrowserSwarmAgent`: role-specific swarm agent status, objective, priority, linked mission/run IDs, route coverage, finding count, step count, terminal reason, and timestamps.

Current local database URL default: `postgresql://postgres:postgres@localhost:55432/ai_swarm_qa`.
