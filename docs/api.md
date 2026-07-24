# API Overview

## `POST /api/audits`

Creates a local development project when needed, creates an audit, transitions it to `planning`, and enqueues a `plan-audit` BullMQ job. Mission jobs are enqueued after planning completes in the worker.

Request:

```json
{
  "url": "http://localhost:4100"
}
```

Response:

```json
{
  "id": "audit_id",
  "status": "queued"
}
```

## `GET /api/audits/:id`

Returns a nested audit summary:

- `audit`: lifecycle fields, target URL, failure reason, browser duration, and finding count
- `missions`: mission status, role, objective, attempts, timeout, result summary, and finding count
- `progress`: aggregate mission counters
- `report`: deterministic score, severity counts, category counts, mission summary, warnings, top findings, and limitations
- `planning`: safe planning mode, source, status, website type, confidence, prompt metadata, model, estimated cost, fallback reason, warnings, and important journeys

## `GET /api/audits/:id/findings`

Returns normalized findings with evidence metadata, source mission IDs/types, and occurrence count.

## Error Format

```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "The submitted URL is invalid."
  }
}
```
## Browser Agent Summary

Audit summary responses include `browserAgentRuns` when the optional `autonomous-browser` mission has run. Each run includes safe metadata and an ordered step timeline. The API does not return raw prompts, raw observation JSON, hidden reasoning, cookies, storage, headers, or secrets.
