# Lessons Learned

- Next.js 16 build-time API route analysis imports server modules, so database clients must not require secrets at module import time.
- BullMQ custom job IDs cannot contain `:`, so stable IDs use hyphens.
- Local Docker Compose should avoid common ports already used by other projects; AISwarmQA maps Postgres to `55432`.
- Playwright browser binaries must be installed before running worker smoke tests.
- Windows sandboxed pnpm workspace runs can fail with `spawn EPERM`; rerun important checks with approved escalation when this happens.
- Run heavy workspace checks separately when possible; parallel `typecheck` plus `build` can make Windows worker `tsc` crash transiently without TypeScript diagnostics.
- Keep mission finalization idempotent because concurrent mission completions can call it more than once.
- Avoid starting multiple pnpm-backed dev commands while pnpm is recreating `node_modules`; on Windows this can corrupt package materialization. Use `.npmrc` non-interactive settings and start smoke services sequentially.
- Playwright `page.evaluate` should avoid TSX/esbuild-transformed helper functions; raw browser JavaScript avoids injected helper references such as `__name`.
## Phase 4

- Keep browser `page.evaluate` code passed through TSX as raw strings when it must run in the page context; transformed helper code can reference Node-side symbols such as `__name`.
- Do not include internal locator or selector metadata in persisted Browser Agent observations; keep it only in the worker-local target map.
- Stop all stale worker process trees before mode-specific smoke tests because old workers can consume BullMQ jobs with old environment configuration.
