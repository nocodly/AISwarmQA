# Architecture Overview

AI Swarm QA uses a single monorepo with clear package boundaries.

## Control Plane

The web app owns account-level concerns: organizations, projects, audit creation, status, reports, and billing. It may enqueue work, but it must not execute browser automation directly.

## Execution Plane

Workers consume mission jobs, execute bounded deterministic missions, collect evidence, create findings, and ask the database finalizer to generate the report when all missions are terminal. They do not own subscription state or payment logic.

## Data Flow

```text
User creates audit
  -> control plane validates request
  -> audit record is created
  -> plan-audit job collects a sanitized planning snapshot
  -> deterministic or AI-assisted plan is persisted
  -> one queue job is enqueued per final mission
  -> workers execute isolated browser contexts
  -> evidence and deduplicated findings are stored
  -> report summary and score are generated
  -> user views report
```

## Foundation Decision

The MVP starts as a small monorepo instead of multiple services. This keeps local development simple while preserving boundaries through packages.
