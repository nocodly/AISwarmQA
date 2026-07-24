# ADR 0009: Bounded Autonomous Browser Agent

## Status

Accepted.

## Context

Phase 3 can plan missions but cannot control browser actions. Phase 4 needs exploratory behavior without giving AI unrestricted browser access.

## Decision

Add one optional `autonomous-browser` mission. The worker owns browser execution. The decision provider returns exactly one structured action from a fixed allowlist. Every action is schema-validated, safety-validated, budgeted, persisted, and then executed or rejected by server-owned handlers.

Phase 4 supports `disabled` and `mock` modes only.

## Consequences

- Existing deterministic audits remain the default.
- Replay history is available for debugging and UI display.
- Conservative safety blocking may skip useful actions.
- A future Anthropic decision provider can reuse the same schemas and loop.
- Multi-agent swarm orchestration remains a future phase.
