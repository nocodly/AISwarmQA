# Anthropic Provider Integration

Phase 6 connects real Anthropic requests through `packages/ai`.

The execution plane selects providers with:

```text
AI_PROVIDER=mock
AI_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=
```

`ANTHROPIC_API_KEY` must come from the process environment. It must not be committed, logged, returned from APIs, or persisted in the database.

## Provider Boundary

All real provider calls go through `AnthropicProvider` in `packages/ai`. Worker code uses provider factories and structured helpers; it does not instantiate SDK calls outside the provider package.

Supported provider paths:

- Planner: `runPlannerPrompt`
- Browser Agent: `createBrowserDecisionProvider`
- Swarm: uses the Browser Agent provider path for each role agent

## Reliability

Provider calls support:

- timeout
- retry for retryable provider failures
- exponential backoff
- rate-limit normalization
- malformed JSON recovery
- Zod structured output validation
- token accounting
- model-based cost estimation
- safe request logging
- mock fallback

## Fallback

If Anthropic fails and `AI_PROVIDER_FALLBACK_TO_MOCK=true`, the execution plane falls back to mock provider behavior. Planner fallback still preserves the deterministic baseline when no accepted AI plan is available.

## Logging

Allowed request log fields:

- provider
- model
- duration
- input tokens
- output tokens
- estimated cost
- fallback status

Forbidden log fields:

- API key
- Authorization header
- raw prompt body
- cookies, localStorage, credentials, or hidden reasoning
