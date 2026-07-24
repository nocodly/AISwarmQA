# Autonomous Browser Agent

Phase 4 adds one optional `autonomous-browser` mission. It is disabled by default and runs only when `AUTONOMOUS_BROWSER_MODE=mock`.

The Browser Agent is a bounded exploratory QA tester. It receives sanitized observations, proposes exactly one structured action, and never receives Playwright objects, selectors, cookies, storage, headers, raw HTML, or credentials. The worker validates every proposal with schemas and the safety policy before executing any browser action.

## Flow

```text
plan-audit job
  -> optional autonomous-browser mission
  -> worker opens isolated Chromium context
  -> bounded page observation
  -> mock decision provider proposes one action
  -> schema validation
  -> safety validation
  -> allowlisted handler executes or rejects
  -> BrowserAgentStep is persisted
  -> loop stops by finish, budget, safety, or no-progress reason
  -> BrowserAgentRun is completed
  -> findings use the central finding pipeline
```

## Tool Allowlist

- `inspect`
- `click`
- `fill`
- `scroll`
- `navigate`
- `wait`
- `screenshot`
- `report_finding`
- `finish`

There are no generic `execute`, `evaluate`, `script`, `request`, `shell`, `fetch`, `upload`, or `download` tools.

## Prompt

Prompt ID: `ai-swarm-qa-browser-agent`

Prompt version: `v1`

Phase 4 uses `MockBrowserDecisionProvider`. A real Anthropic browser decision provider is intentionally deferred.

## Persistence

`BrowserAgentRun` stores run metadata, prompt identity, provider identity, budgets, token/cost counters, final URL, terminal reason, and summary.

`BrowserAgentStep` stores ordered sanitized observations, proposed action JSON, validation status, safety decision, execution status, execution result, URLs, state-change flag, and per-step timing.

## Limitations

- One autonomous agent only.
- Mock mode only.
- Same-origin only.
- No login, payments, destructive actions, file operations, custom prompts, or arbitrary browser APIs.
