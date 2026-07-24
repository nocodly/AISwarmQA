# Known Issues

- Authentication is not implemented; the app uses local development owner, organization, and project records.
- Reports are not locked by plan and billing is not implemented.
- Screenshot evidence is stored as local paths and is not served through authenticated URLs yet.
- AI-assisted planning exists but is disabled by default and normal tests use the mock provider.
- Real Anthropic provider support exists, but production use still needs stronger integration tests, rate-limit observability, and secure deployment secret management.
- Browser Swarm is local-only and should be treated as a bounded prototype until deeper database, queue, UI, and safety regression coverage exists.
- Interaction testing and Browser Agent safety policy intentionally block destructive, payment, account, file, logout, password, and subscription actions.
- The worker launches local Chromium contexts only; no cloud browser provider exists yet.
- A failed smoke attempt can leave old local audit records in the development database.
- Stale local worker processes with different `SWARM_MOCK_SCENARIO` values can consume queue jobs and invalidate mode-specific smoke tests.
