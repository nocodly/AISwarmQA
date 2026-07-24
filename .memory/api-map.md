# API Map

- `GET /api/health`: health response.
- `POST /api/audits`: validate URL, create audit, transition to planning, enqueue `plan-audit`.
- `GET /api/audits/:id`: return nested audit, missions, progress, report summary, planning summary, and safe Browser Agent run/replay summaries.
- `GET /api/audits/:id/findings`: return findings, evidence, occurrence count, and mission provenance.

All API errors return `{ "error": { "code": string, "message": string } }`.
