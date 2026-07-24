# Browser Agent Replay

Replay data is stored in `BrowserAgentRun` and ordered `BrowserAgentStep` records.

The audit detail UI displays:

- run status
- provider and model
- prompt ID and version
- step budget and steps used
- provider calls
- terminal reason
- final summary
- replay timeline
- proposed tool
- safety result
- execution status
- URL before and after
- evidence IDs when present

Raw observations, raw prompts, hidden reasoning, cookies, storage, headers, and secrets are not shown by default.
