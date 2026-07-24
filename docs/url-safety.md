# URL Safety

The local phases support fixture testing without opening a broad SSRF bypass.

## Development

Development allows localhost targets only when the exact host and port are listed in `AUDIT_DEV_ALLOWED_HOSTS`.

Example:

```text
AUDIT_DEV_ALLOWED_HOSTS="localhost:4100,127.0.0.1:4100"
```

## Production

Production blocks:

- localhost
- loopback
- private IPv4 ranges
- link-local ranges
- cloud metadata hosts
- unsupported protocols

Only `http` and `https` URLs are accepted.

Planner snapshots preserve the same-origin policy. AI-proposed external routes are rejected during policy merge.
## Browser Agent Same-Origin Policy

Phase 4 Browser Agent navigation resolves candidate URLs against the validated target URL and enforces same-origin execution. External origins and unsafe protocols are rejected before action execution, and final URLs are revalidated after click and navigation actions.
