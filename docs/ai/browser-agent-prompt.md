# Browser Agent Prompt

Prompt ID: `ai-swarm-qa-browser-agent`

Prompt version: `v1`

The prompt instructs the decision provider to act as a cautious exploratory QA browser agent and return exactly one structured action. It forbids selectors, XPath, JavaScript, shell commands, arbitrary HTTP requests, external navigation, payments, destructive actions, account actions, uploads, downloads, password fills, payment fields, hidden reasoning, and unsupported findings.

Phase 4 uses the deterministic mock provider. The real Anthropic implementation is intentionally deferred until the server-authoritative safety layer is stable.
