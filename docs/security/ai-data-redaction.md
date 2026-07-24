# AI Data Redaction

The Planner Agent receives only a sanitized planning snapshot, never cookies, localStorage, authorization headers, form values, passwords, or raw browser storage.

Snapshot collection is bounded:

- headings
- navigation links
- visible buttons
- form field metadata, excluding password fields and values
- same-origin routes
- page title and meta description
- high-level detected product signals
- console and failed-request counts

Redaction removes or masks:

- email addresses
- token-like strings
- API keys
- bearer/JWT-like values
- credit-card-like values
- sensitive query parameters such as `token`, `access_token`, `refresh_token`, `api_key`, `secret`, `password`, `session`, `signature`, and `sig`

The raw sensitive page state is not persisted. `AuditPlan.snapshotJson` stores the sanitized snapshot only.
## Browser Agent Observations

Browser Agent observations reuse shared redaction helpers and store only bounded safe metadata. Observations exclude cookies, localStorage, authorization headers, password values, hidden input values, raw HTML, and unbounded accessibility trees.
