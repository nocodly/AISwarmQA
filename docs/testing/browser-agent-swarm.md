# Browser Agent Swarm Testing

The Phase 5 swarm tests are mock-only and do not require an Anthropic API key.

## Success Smoke

```bash
SWARM_MODE=mock SWARM_MOCK_SCENARIO=success SWARM_MAX_AGENTS=4 SWARM_MAX_CONCURRENT_AGENTS=2 pnpm dev:worker
pnpm smoke:swarm
```

Expected result: a completed audit, one `browser-swarm` mission, four created agents, aggregate steps, deduplicated visited routes, per-agent replay IDs, and at least one finding flowing through the central finding pipeline.

## Safety Smoke

```bash
SWARM_MODE=mock SWARM_MOCK_SCENARIO=unsafe-agent SWARM_MAX_AGENTS=4 SWARM_MAX_CONCURRENT_AGENTS=2 pnpm dev:worker
pnpm smoke:swarm:safety
```

Expected result: the unsafe agent is completed with limitations, safety rejection codes are persisted in Browser Agent replay steps, and the overall audit still completes.

## Budget Smoke

```bash
SWARM_MODE=mock SWARM_MOCK_SCENARIO=step-budget SWARM_MAX_TOTAL_STEPS=4 SWARM_MAX_PROVIDER_CALLS=4 pnpm dev:worker
pnpm smoke:swarm:budget
```

Expected result: the swarm completes with limitations and a budget terminal reason such as `STEP_BUDGET_EXHAUSTED`.

Use a single worker process for each scenario. BullMQ jobs can be consumed by any active worker, so stale workers with different `SWARM_MOCK_SCENARIO` values can invalidate scenario-specific smoke assertions.
