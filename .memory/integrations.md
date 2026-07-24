# Integrations

## Anthropic

Status: Real provider adapter exists behind `packages/ai`.

Phase 6 routes planner, Browser Agent, and swarm provider decisions through `AnthropicProvider` when:

- `AI_PROVIDER=anthropic`
- `ANTHROPIC_API_KEY` is configured
- the relevant feature flag is enabled, such as planner AI, autonomous Browser Agent, or swarm mode

Prompts:

- Planner: `ai-swarm-qa-planner` v1
- Browser Agent: `ai-swarm-qa-browser-agent` v1

Normal CI and smoke tests use mock providers and do not require a paid API key. If Anthropic fails and fallback is enabled, execution falls back to mock behavior and then to deterministic planning where applicable.

## Browser Agent

Status: Mock and Anthropic decision providers exist behind `packages/ai`.

Phase 6 added `AnthropicBrowserDecisionProvider` through the shared provider abstraction. Browser Agent output is still validated by schema and safety policy before any browser action executes.

Prompt:

- ID: `ai-swarm-qa-browser-agent`
- Version: `v1`

Normal CI and smoke tests use mock scenarios and zero estimated provider cost.
