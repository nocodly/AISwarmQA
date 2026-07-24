# Browser Agent Fixture

The broken demo site includes an autonomous journey at `/agent-lab`.

Fixture behavior:

- home page exposes a same-origin `Agent lab` link
- `/agent-lab` exposes a safe search field
- `/agent-lab` exposes a safe `Preview demo` button
- clicking `Preview demo` displays a visible stalled error state
- home and lab pages include external links that must not be followed
- home and lab pages include destructive-looking controls
- home and lab pages include password fields
- home and lab pages include checkout or purchase controls

The mock Browser Agent must discover behavior through observations and actions. It must not hardcode database findings.
