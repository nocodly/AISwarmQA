# Next Actions

## Phase 7

1. Get explicit approval to run `prisma migrate deploy` against the configured production database. `prisma migrate status` shows all six migrations pending.
2. Create and configure the GitHub App credentials in Railway:
   - `GITHUB_APP_ID`
   - `GITHUB_APP_CLIENT_ID`
   - `GITHUB_APP_CLIENT_SECRET`
   - `GITHUB_APP_PRIVATE_KEY`
   - `GITHUB_APP_WEBHOOK_SECRET`
   - `GITHUB_OAUTH_REDIRECT_URI`
3. Finish real GitHub App callback/token exchange and repository sync.
4. Add protected evidence routes or object-storage signed URLs before embedding screenshots in production GitHub Issues.
5. Run one production audit after migrations are applied.
6. Run `pnpm smoke:github-export` only with a dedicated test repository and `GITHUB_EXPORT_CONFIRM=true`.

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
