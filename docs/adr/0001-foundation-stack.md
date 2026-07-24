# ADR 0001: Foundation Stack

Status: Accepted

Date: 2026-07-22

## Context

AI Swarm QA needs a maintainable MVP foundation for a B2B SaaS control plane and browser-worker execution plane.

## Decision

Use:

- Next.js 16.2.11 and React 19.2.8 for the web app
- TypeScript 5.9.3 across the monorepo
- PostgreSQL with Prisma 7.9.0 and `@prisma/adapter-pg` 7.9.0
- Redis with BullMQ 5.80.10
- Playwright 1.61.1 for browser automation
- Anthropic SDK 0.113.0 behind an AI provider abstraction
- Vitest 4.1.10 for unit tests
- Lucide React 1.25.0 for interface icons
- tsx 4.23.1 for local TypeScript worker and fixture execution

These versions were checked against the npm registry on 2026-07-22. TypeScript 7.0.2 was also checked as the latest release, but TypeScript 5.9.3 was selected because Next.js 16.2.11 did not complete production builds with TypeScript 7.0.2 in this workspace.

## Consequences

The stack is familiar, modular, and sufficient for an MVP. The project avoids Kubernetes, Kafka, and unnecessary microservices during the Foundation Phase.
