# AI Cost Controls

Planner costs are bounded by configuration:

- `PLANNER_MAX_INPUT_TOKENS`
- `PLANNER_MAX_OUTPUT_TOKENS`
- `PLANNER_MAX_ESTIMATED_COST_USD`
- `PLANNER_MAX_ATTEMPTS`
- `PLANNER_TIMEOUT_MS`

Input tokens are estimated before the provider call from prompt text length. Provider usage is stored when available. Estimated cost uses centralized model pricing:

```text
input tokens * input price / 1,000,000
output tokens * output price / 1,000,000
```

Estimated cost may differ from provider billing. If actual estimated usage exceeds budget, the planner falls back to the deterministic baseline.

Normal tests and smoke commands do not require a real paid provider.
## Browser Agent Cost Controls

The Phase 4 Browser Agent mock provider has zero estimated cost and requires no API key. The loop still tracks provider calls, input tokens, output tokens, and estimated cost so future real provider execution can use the same hard budgets.
# Cost Controls

Phase 6 tracks provider input tokens, output tokens, latency, and estimated cost for planner, Browser Agent, and swarm execution.

The current model pricing helper uses conservative per-million-token estimates and should be updated when production billing tables are finalized.

Relevant limits:

- `PLANNER_MAX_INPUT_TOKENS`
- `PLANNER_MAX_OUTPUT_TOKENS`
- `PLANNER_MAX_ESTIMATED_COST_USD`
- `AUTONOMOUS_MAX_INPUT_TOKENS`
- `AUTONOMOUS_MAX_OUTPUT_TOKENS`
- `AUTONOMOUS_MAX_ESTIMATED_COST_USD`
- `SWARM_MAX_INPUT_TOKENS`
- `SWARM_MAX_OUTPUT_TOKENS`
- `SWARM_MAX_ESTIMATED_COST_USD`

If Anthropic is unavailable and fallback is enabled, mock fallback produces zero-cost decisions.
