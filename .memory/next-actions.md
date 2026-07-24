# Next Actions

Recommended next main phase: harden real-provider execution and prepare production controls.

Start with:

- focused database service tests for `BrowserSwarmRun` and `BrowserSwarmAgent`
- queue/idempotency tests for partial swarm completion
- web component tests for the swarm summary and agent timeline
- deeper duplicate-work and finding fingerprint tests
- cleanup tooling for old smoke audits and artifacts
- production rate-limit dashboards and alerting
- secure hosted secret management
- real-provider canary smoke tests with low budgets
- provider usage export for billing and audit trails

Keep real provider Browser Agent execution behind explicit environment flags and low budgets until the safety layer has broader test coverage.
