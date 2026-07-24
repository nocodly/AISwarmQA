# ADR 0002: Control Plane and Execution Plane Split

Status: Accepted

Date: 2026-07-22

## Context

Audit execution can be slow, expensive, and browser-heavy. UI requests need to remain fast and predictable.

## Decision

Split responsibilities into a Control Plane and an Execution Plane. The Control Plane creates audits and enqueues work. The Execution Plane consumes jobs and updates audit records.

## Consequences

The product can start as one monorepo while keeping future service extraction possible.

