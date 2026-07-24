# Autonomous Browser Swarm

Phase 5 adds one optional `browser-swarm` mission. It is disabled by default and runs only when `SWARM_MODE=mock`.

The swarm is a central orchestrator around multiple bounded Browser Agents. Agents do not communicate directly. Each agent receives a role objective, a fresh Playwright browser context, bounded Browser Agent budgets, and a per-agent replay record. The orchestrator owns scheduling, aggregate budget checks, sanitized coverage sharing, duplicate-work hints, cancellation, and final swarm completion.

## Roles

- `explorer-agent`: map the primary journey and broad visible states.
- `form-agent`: inspect safe forms and validation behavior.
- `interaction-agent`: test safe buttons, toggles, tabs, and UI state changes.
- `navigation-agent`: check same-origin navigation paths and broken journeys.
- `mobile-agent`: repeat high-value checks with a mobile viewport.
- `error-investigator-agent`: focus on console errors, failed requests, and visible error states.

## Shared State

The only shared state is a sanitized `SwarmSharedState`:

```ts
type SwarmSharedState = {
  visitedRoutes: string[];
  testedTargetFingerprints: string[];
  discoveredForms: string[];
  knownFindingFingerprints: string[];
  coverageGaps: string[];
  completedAgentRoles: string[];
};
```

It must never contain cookies, localStorage, raw DOM, raw prompts, hidden reasoning, credentials, Playwright objects, headers, screenshots, or internal selectors.

## Budget Controls

The orchestrator enforces aggregate limits from `SWARM_*` configuration:

- max agents
- max concurrent agents
- total steps
- provider calls
- navigations
- screenshots
- input and output tokens
- estimated cost
- total elapsed time

Budget exhaustion stops new work and completes the swarm with limitations rather than failing the whole audit when partial results are usable.

## Persistence

`BrowserSwarmRun` stores aggregate status, mode, budgets, token/cost counters, coverage state, terminal reason, and summary.

`BrowserSwarmAgent` stores role, objective, priority, status, terminal reason, routes visited, finding count, steps used, and the linked `BrowserAgentRun` replay ID.

`BrowserAgentRun` supports both the single Phase 4 `autonomous-browser` mission and Phase 5 per-agent swarm runs.
