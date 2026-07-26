# Phase 7: GitHub Finding Export

Phase 7 adds the product foundation for exporting completed audit findings to GitHub Issues.

## Architecture

AISwarmQA keeps the existing Control Plane and Execution Plane split.

- The web app creates audit records, renders completed results, prepares export previews, and enqueues export batches.
- The worker processes the `github-export` queue and creates one GitHub Issue per selected finding.
- PostgreSQL stores GitHub connection metadata, repository metadata, export batches, and per-finding export records.
- Redis/BullMQ stores only job references: `batchId`, `workspaceId`, and `userId`.
- GitHub provider calls go through `@ai-swarm-qa/github`.

## User Flow

1. User opens a completed audit.
2. User downloads JSON or CSV, shares the report URL, or selects findings for GitHub.
3. User selects one or more findings.
4. User selects an authorized repository.
5. User previews issue titles, labels, and request count.
6. User explicitly confirms export.
7. Web creates a `GitHubExportBatch` and enqueues `github-export`.
8. Worker creates one issue per selected finding.
9. UI polls the batch and shows created, failed, or skipped results.

## GitHub App Permissions

Recommended GitHub App permissions:

- Repository metadata: read
- Issues: read and write
- Contents: read only if evidence links later require repository context
- Pull requests: no access
- Administration: no access
- Secrets: no access

Subscribed events for the MVP:

- installation
- installation_repositories

## Database Model

Phase 7 adds:

- `GitHubConnection`
- `GitHubRepository`
- `GitHubExportBatch`
- `FindingGitHubExport`

The schema stores installation metadata and export audit trails. It does not store installation access tokens.

## Queue Model

Queue name:

`github-export`

Job payload:

```json
{
  "batchId": "batch-reference",
  "workspaceId": "workspace-reference",
  "userId": "user-reference"
}
```

The job payload must never contain GitHub tokens, screenshots, raw DOM, or prompt content.

## Issue Template

Each selected finding produces a separate GitHub Issue with:

- summary
- severity
- category
- affected page
- affected element or context
- steps to reproduce
- expected and actual behavior
- evidence references
- suggested fix
- acceptance criteria
- AISwarmQA metadata
- hidden idempotency marker

## Evidence Strategy

The current MVP can link evidence through a controlled application route shape:

`/api/audits/:auditId/evidence/:evidenceId`

Permanent private evidence serving is not fully implemented yet. Until object storage or signed evidence routes are finished, issue bodies must avoid silently embedding broken public image links in production.

Recommended production strategy:

- Store screenshots in controlled object storage.
- Generate signed URLs or protected evidence routes.
- Strip storage credentials from URLs.
- Enforce workspace authorization before serving evidence.
- Use expiration or refreshable controlled links.

## Idempotency

Each finding export uses a stable idempotency key based on:

- workspace
- repository full name
- audit
- finding
- export version

`FindingGitHubExport.idempotencyKey` is unique. Worker retries skip already-created exports and reuse existing export records.

GitHub issue bodies include a hidden marker:

```html
<!-- aiswarmqa:finding:<safe-external-finding-id> -->
```

## Retries And Rate Limits

Retryable classes:

- 429
- transient 5xx
- network timeout
- temporary GitHub outage

Non-retryable classes:

- access denied
- repository not found
- Issues disabled
- installation revoked
- invalid assignee
- invalid milestone
- validation error

BullMQ retries are bounded with exponential backoff.

## Security Model

Server-side checks must enforce:

- authenticated user
- workspace membership
- audit access
- GitHub connection ownership
- repository installation access
- Issues enabled
- explicit confirmation before export
- no cross-workspace evidence access

Never log:

- GitHub private key
- client secret
- installation token
- OAuth token
- webhook secret
- authorization headers
- signed evidence URL query strings

## Production Variables

Add these to the web and worker services when enabling the real GitHub App:

```env
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_OAUTH_REDIRECT_URI=
GITHUB_EXPORT_MOCK=false
```

For local mock-only development:

```env
GITHUB_EXPORT_MOCK=true
```

## Manual GitHub App Setup

Suggested app name:

`AISwarmQA Export`

Homepage URL:

`https://ai-swarm-qaweb-production.up.railway.app`

Callback URL:

`https://ai-swarm-qaweb-production.up.railway.app/api/integrations/github/callback`

Webhook URL:

`https://ai-swarm-qaweb-production.up.railway.app/api/integrations/github/webhook`

After creating the app:

1. Generate a private key.
2. Copy the app ID, client ID, client secret, private key, and webhook secret into Railway service variables.
3. Install the app on a dedicated test repository.
4. Sync repositories into `GitHubRepository`.
5. Run the manual smoke test.

## Manual Smoke Test

Use a dedicated GitHub test repository.

Required variables:

```env
APP_URL=https://ai-swarm-qaweb-production.up.railway.app
GITHUB_EXPORT_AUDIT_ID=<completed-audit-id>
GITHUB_EXPORT_REPOSITORY_ID=<authorized-repository-id>
GITHUB_EXPORT_CONFIRM=true
```

Command:

```bash
pnpm smoke:github-export
```

Normal CI must not set `GITHUB_EXPORT_CONFIRM=true`.

## Known Limitations

- Real GitHub App OAuth callback and installation token exchange are scaffolded but not enabled until production credentials are provided.
- Repository metadata currently supports empty assignee and milestone lists in the scaffold.
- Evidence links require the protected evidence route/object storage work before production issue images are permanent.
- Authentication is still the local development owner model from earlier phases.

## Production Migration Result

On 2026-07-26, the production database was verified as a fresh Supabase PostgreSQL database before migration:

- host: `db.wpdcrrkxkuydcxnhvgpt.supabase.co`
- database: `postgres`
- schema: `public`
- application tables before migration: none
- `_prisma_migrations` before migration: absent

After safety review, `prisma migrate deploy` applied six migrations successfully:

- `202607230001_phase_1_audit_pipeline`
- `202607230002_multi_mission_execution`
- `202607230003_ai_planner_agent`
- `202607240001_bounded_browser_agent`
- `202607240002_browser_agent_swarm`
- `202607260001_github_export`

Post-migration status: database schema is up to date.

## Railway Service Status

Production Railway project:

- project: `giving-smile`
- environment: `production`
- web service: `@ai-swarm-qa/web`
- worker service: `@ai-swarm-qa/worker`
- Redis service: `Redis`

## Screenshot Storage Limitation

Current screenshots and browser artifacts are written to local filesystem paths under `AUDIT_ARTIFACTS_DIR`. On Railway, that filesystem is ephemeral and must not be treated as durable evidence storage.

Before real GitHub issue evidence images are enabled, implement one of:

- Supabase Storage with signed URLs and workspace authorization.
- S3-compatible object storage with signed URLs.
- A protected AISwarmQA evidence route backed by durable private storage.

Required controls:

- workspace-scoped access
- no public bucket by default
- no storage credentials in URLs
- image MIME validation
- file size limits
- screenshot count limits
- expiry or refresh strategy
- authorization check for every evidence request

## Recovery Procedure

If production schema deployment causes an unexpected issue:

1. Stop worker deployments to prevent new jobs.
2. Keep web health available if possible.
3. Inspect `_prisma_migrations` and application logs.
4. Restore through the database provider backup/PITR mechanism if available.
5. Do not run `migrate reset`, `db push --force-reset`, `DROP DATABASE`, or destructive SQL.
