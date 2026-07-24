# Same-Origin Enforcement

Phase 4 Browser Agent navigation is same-origin only.

The worker resolves proposed URLs against the validated audit target URL, rejects unsupported protocols, rejects external origins, and revalidates the final URL after click and navigation actions.

Blocked protocols include:

- `javascript:`
- `data:`
- `file:`
- `mailto:`
- `tel:`

Popup handling is intentionally minimal in Phase 4. The agent uses one active page; external popup behavior should be blocked or closed before a future real provider mode is added.
