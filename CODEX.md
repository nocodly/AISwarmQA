# Codex Project Notes

## Current Phase

Foundation Phase.

The goal is not to build the complete product yet. The goal is to create a professional, understandable, extensible base for AI Swarm QA.

## Language Policy

All repository content must be written in English:

- source code
- comments
- documentation
- UI copy
- test names
- agent configuration
- commit messages

The owner may communicate in Ukrainian during development.

## Architecture Boundaries

Control Plane:

- authentication
- users
- organizations
- projects
- subscriptions
- usage limits
- audit creation
- audit status
- reports
- billing
- dashboard

Execution Plane:

- audit planning
- browser workers
- mission execution
- evidence collection
- raw findings
- deduplication
- severity assignment
- report generation

The Control Plane must not run browser automation inside a UI request. The Execution Plane must not directly manage billing.

