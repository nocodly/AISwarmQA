# ADR 0003: Provider Abstractions

Status: Accepted

Date: 2026-07-22

## Context

The product will depend on AI, storage, and queue providers. Direct usage throughout the app would make changes risky and expensive.

## Decision

Create provider packages:

- `packages/ai`
- `packages/storage`
- `packages/queue`

Application code depends on package interfaces, not raw vendor SDKs.

## Consequences

Mock providers can support local development and tests without paid external calls.

