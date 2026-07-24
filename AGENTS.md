# Agent Operating Guide

This repository is built to be continued by humans and AI agents without losing context.

Before each task:

1. Read `CODEX.md`.
2. Read `.memory/current-state.md`.
3. Read `.memory/current-task.md`.
4. Read `.memory/architecture-summary.md`.
5. Check the current git diff.
6. Keep project text, docs, code comments, prompts, and UI copy in English.

Working rules:

- Do not overwrite unfinished user work.
- Keep the Control Plane and Execution Plane separate.
- Run long-running work through the queue.
- Validate AI output with schemas before trusting it.
- Do not add direct provider calls outside provider packages.
- Do not store plaintext credentials.
- Do not allow audits against private networks.
- Update memory and documentation after meaningful changes.

