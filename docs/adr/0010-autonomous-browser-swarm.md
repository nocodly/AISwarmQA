# ADR 0010: Autonomous Browser Swarm

Date: 2026-07-24

## Status

Accepted.

## Context

Phase 4 proved a single bounded Browser Agent with strict schemas, same-origin safety enforcement, replay history, and central finding persistence. Phase 5 needs broader exploratory coverage without giving agents unrestricted browser or system access.

## Decision

Implement the swarm as one optional `browser-swarm` mission controlled by a server-side orchestrator.

The orchestrator creates role-specific agents, schedules them under aggregate concurrency and budget limits, runs each agent in an isolated Playwright browser context, shares only sanitized coverage state, and persists per-agent replay histories. Agents do not communicate directly and do not receive raw DOM, cookies, storage, credentials, Playwright objects, or hidden reasoning.

The Phase 5 implementation remains mock-only. Real provider-driven Browser Agent decisions are deferred until the safety layer has broader coverage and production rate-limit controls.

## Consequences

- The existing Phase 1-4 pipeline remains intact.
- Swarm findings still use the central normalization, deduplication, and report finalization pipeline.
- One failed or limited agent can produce a completed-with-limitations swarm instead of failing the whole audit.
- Smoke tests must isolate worker processes per scenario because queue jobs can be consumed by any active worker.
