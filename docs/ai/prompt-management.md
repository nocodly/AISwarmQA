# Prompt Management

Planner prompts live in `packages/ai/src/prompts/planner`.

Current prompt:

- ID: `ai-swarm-qa-planner`
- Version: `v1`
- Purpose: create a safe, bounded mission plan for deterministic QA workers.

The prompt instructs the model to act as a senior QA planning lead, use only supported mission types, preserve baseline required missions, avoid destructive actions, avoid payment execution, avoid account creation, avoid selectors and Playwright code, and return only structured JSON.

Prompts request brief planning rationale summaries only. They do not ask for private chain-of-thought.

Prompt ID and version are persisted in `AuditPlan` when AI planning succeeds.
## Browser Agent Prompt

Phase 4 prompt:

- ID: `ai-swarm-qa-browser-agent`
- Version: `v1`
- Purpose: select one safe server-authoritative browser action for a bounded QA exploration step
