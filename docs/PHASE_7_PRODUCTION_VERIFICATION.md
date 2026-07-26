# Phase 7 Production Verification

Date: 2026-07-26

Tested commit before Phase 7 commit: `cce9a05`

## Target Environment

- Railway project: `giving-smile`
- Railway environment: `production`
- Web service: `@ai-swarm-qa/web`
- Worker service: `@ai-swarm-qa/worker`
- Redis service: `Redis`
- Database provider: Supabase PostgreSQL
- Database host: `db.wpdcrrkxkuydcxnhvgpt.supabase.co`
- Database name: `postgres`
- Schema: `public`

No secret values were printed during verification.

## Database State Before Migration

The production database was fresh:

- `_prisma_migrations`: absent
- application tables: none
- application rows: none
- enums: none

Backup/PITR status was not independently verified. Because the database contained no application data and all reviewed migrations were schema-create/additive, migration deployment proceeded under explicit user authorization.

## Migration Review

| Migration | Risk | Destructive Statements | Notes |
| --- | --- | --- | --- |
| `202607230001_phase_1_audit_pipeline` | LOW | None | Creates base enums, users, organizations, projects, audits, missions, sessions, findings, evidence, indexes, and FKs. |
| `202607230002_multi_mission_execution` | LOW | None | Adds enum value, additive columns with defaults, report table, mission unique index. Fresh DB removes populated-table lock risk. |
| `202607230003_ai_planner_agent` | LOW | None | Creates `AuditPlan`, unique audit relation, FK. |
| `202607240001_bounded_browser_agent` | LOW | None | Creates browser agent run/step tables, indexes, FKs. |
| `202607240002_browser_agent_swarm` | LOW | `DROP INDEX IF EXISTS "BrowserAgentRun_missionId_key"` | Replaces an earlier uniqueness assumption with swarm-compatible indexes. Safe on fresh DB and compatible with ordered migration state. |
| `202607260001_github_export` | LOW | None | Creates GitHub connection/repository/batch/export models, enums, idempotency uniqueness, status indexes, workspace index, FKs. |

Special GitHub export review:

- Relations reference valid existing tables created by earlier migrations.
- Workspace relation uses `Organization` as current workspace model.
- User relation uses existing `User`.
- `idempotencyKey` is globally unique and derived from workspace, repository, audit, finding, and export version.
- `githubIssueNumber` uses integer; repository identifiers use text.
- Nullable issue/error fields support partial failures.
- Indexes exist for `auditId`, `findingId`, `workspaceId`, `repositoryId`, `status`, and `idempotencyKey`.

## Migration Deployment

Command:

```bash
prisma migrate deploy
```

Result:

- start: 2026-07-26
- duration: 8.85 seconds
- status: success
- applied migrations: 6

Post-deploy:

- `prisma migrate status`: database schema is up to date
- `_prisma_migrations`: 6 rows, none rolled back
- required tables, indexes, enums, and FKs exist
- rollback-only write test: passed

## Local Validation

Passed:

```bash
corepack pnpm@10.0.0 install --frozen-lockfile
corepack pnpm@10.0.0 -r lint
corepack pnpm@10.0.0 -r typecheck
corepack pnpm@10.0.0 -r test
corepack pnpm@10.0.0 -r build
```

## Queue And Worker Status

The worker code now subscribes to:

- `audit-missions`
- `github-export`

Railway redeployment must be completed after the Phase 7 commit is pushed.

## Full Audit Timeline

Pending after deployment:

- create a production audit from the Railway web endpoint
- verify BullMQ job creation and worker pickup
- verify planner/missions/browser execution
- verify Anthropic usage and cost metadata
- verify normalized findings and report persistence
- verify result UI after refresh

## GitHub Export Mock Verification

Implemented locally:

- mock provider
- issue payload generation
- URL sanitization
- label mapping
- stable idempotency
- retry classification
- preview/export/status/retry API routes
- result page selection and export actions
- manual `pnpm smoke:github-export` scaffold

Real GitHub issue creation remains disabled until GitHub App credentials and callback/token exchange are completed.

## Evidence Storage

Current evidence storage is local filesystem only. On Railway it is ephemeral. Durable private evidence storage or protected evidence routes are required before production GitHub Issues should rely on screenshot image links.

## Go/No-Go

Database migration: GO.

Full Phase 7 production: CONDITIONAL GO after:

- Phase 7 commit is pushed and CI passes
- Railway web/worker redeploy successfully
- production audit smoke passes
- GitHub App credentials are configured
- protected evidence storage is implemented
