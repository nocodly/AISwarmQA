# Technical Debt

- Serve local screenshot artifacts through authenticated or signed URLs instead of exposing raw local paths.
- Add focused database service tests for finalizer idempotency and required vs optional mission failure behavior.
- Add web component tests for mission progress, planning display, and Browser Agent replay timeline.
- Add focused database service tests for `AuditPlan`, `BrowserAgentRun`, and `BrowserAgentStep` idempotency.
- Add deeper integration tests for Browser Agent retry idempotency and finding deduplication against deterministic findings.
- Replace local-only browser execution with a cloud browser provider abstraction before production use.
- Add cleanup tooling for old local smoke audit records and artifact directories.
- Add real-provider Browser Agent decision adapter only after the Phase 4 safety layer has more coverage.
- Add focused database, queue, and web tests for `BrowserSwarmRun`, `BrowserSwarmAgent`, partial swarm completion, and swarm replay display.
- Add cleanup tooling or documented process isolation helpers for mode-specific smoke tests.
