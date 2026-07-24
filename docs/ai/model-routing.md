# Model Routing

Phase 3 implements planner model routing only.

Configuration:

- `ANTHROPIC_PLANNER_MODEL`
- fallback to `AI_FAST_MODEL`

The planner domain asks `packages/ai` for the configured planner model. Web routes and database services do not import the Anthropic SDK or call providers directly.

Future model purposes may include browser agent, reviewer, and report writer, but they are not implemented yet.
# Model Routing

Phase 6 provider selection is controlled by `AI_PROVIDER`.

```text
AI_PROVIDER=mock
AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Planner, Browser Agent, and Browser Swarm all route through `packages/ai`. The mock provider remains the default and is used by local smoke tests.

`ANTHROPIC_PLANNER_MODEL` can override the planner model. If it is not set, the planner uses `ANTHROPIC_MODEL`.

Browser Agent and swarm role agents use `ANTHROPIC_MODEL` when `AI_PROVIDER=anthropic`.
