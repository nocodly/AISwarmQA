# Current Task

The current task is to finish the self-audit fixes and prepare the repository for the next production-ready pass.

Latest user request:

- The owner asked to "go through the site and find errors."
- A self-audit was performed against the local app.

Confirmed findings fixed in the working tree:

1. Local API/database failure
   - `/api/health/database`, `/api/dashboard`, and `/api/integrations/github/status` initially returned 500.
   - Root cause: the database package bypassed centralized runtime config and could fall back to `localhost:55432`.
   - Fix: use `readRuntimeConfig().databaseUrl` in the Prisma client and Prisma config.

2. Dashboard New Audit deep link
   - Clicking or opening `/dashboard?newAudit=1` needed to reliably open the new audit modal.
   - Fix: `DashboardClient` now reads `useSearchParams()`.
   - `DashboardPage` wraps the client in `Suspense` to satisfy Next production build requirements.

3. Local Next dev origin issue
   - Next dev blocked requests from `127.0.0.1`, which could leave the dashboard stuck on loading in browser checks.
   - Fix: `allowedDevOrigins` includes `127.0.0.1` and `localhost`.

4. Potential broken agent detail link
   - Agent rows used an index-based lookup for `auditId`.
   - Fix: include `auditId` directly in the mapped agent object.

Verification already completed:

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS
- `pnpm build`: PASS
- API probe: PASS
- Browser UI probe: PASS

CI follow-up:

- Commit `557febf` was pushed to `main`.
- GitHub Actions run `30397267559` failed during `pnpm db:generate`.
- Root cause: `packages/database/prisma.config.ts` imports `@ai-swarm-qa/config`, but a fresh CI checkout had not built `packages/config`, so Prisma could not resolve `@ai-swarm-qa/config/dist/index.js`.
- Commit `c109dfa` fixed the root `db:generate` and `db:migrate` scripts so they build `@ai-swarm-qa/config` before invoking database Prisma commands.
- GitHub Actions run `30397773717` passed: Prisma generation, typecheck, tests, and build all succeeded.

Production verification:

- `GET /api/health`: PASS, returned 200.
- `GET /api/health/database`: PASS, returned 200.
- `GET /api/dashboard` and `GET /api/integrations/github/status`: returned 401 for unauthenticated probes, which is expected in production.
- Browser check: `/dashboard?newAudit=1` opened the New Audit modal in production and had no console errors.
- Browser check: public header menu buttons opened the expected link groups and had no console errors.

New QA finding fixed locally:

- Unauthenticated app data pages showed a primary `Try again` action for 401 sign-in-required states, even though retry cannot succeed without auth.
- Fix in progress: dashboard and shared app data pages now show a primary `Sign in` action for sign-in-required errors and keep `Try again` for non-auth load failures.

Next recommended actions:

1. Commit and push the sign-in-required UI fix.
2. Let CI run again.
3. Verify production once Railway auto-deploys the latest commit, or authenticate Railway CLI before manually triggering deployments.
4. Continue the full app workflow pass with an authenticated production session or approved test account: auth, dashboard navigation, new audit creation, audit detail page, findings detail, GitHub export, billing, settings, and evidence.

New user direction on 2026-07-30:

- Do not touch the public landing page.
- Simplify the dashboard/app experience.
- Make the dashboard very clear, high quality, and operational.
- Buttons, icons, and placement should feel intentional and easy to understand.

Dashboard redesign in progress:

- `apps/web/src/app/dashboard/DashboardClient.tsx` now uses a simpler dashboard structure:
  - concise workspace header
  - one primary `New audit` action
  - current/next audit panel
  - three compact metrics
  - recent audits and recent findings
- Removed old decorative dashboard sections from the rendered dashboard:
  - swarm activity visualization
  - findings donut overview
  - agent context strip
  - trend-line SVG metrics
- Removed secondary dashboard panels from the rendered dashboard:
  - search/header utility controls
  - quick actions
  - evidence gallery
  - GitHub export queue
  - plan usage
- `apps/web/src/components/AppShell.tsx` now shows only the primary app navigation: Dashboard, Audits, Findings, GitHub, and Settings.
- `apps/web/src/app/globals.css` has a new minimal dashboard CSS layer with a quieter shell, neutral panels, stable grids, compact buttons, and restrained accent colors.
- Landing/marketing pages were not edited.

App-wide simplification pass:

- The owner approved the simplified dashboard direction and asked to apply it to the other app pages.
- The same minimal style is now applied across app screens without changing marketing/landing pages.
- Simplified app pages and components:
  - `apps/web/src/components/AppDataPages.tsx`: Audits, Findings, Evidence, Agents, Reports, and GitHub pages now use shorter headers, one main action, compact lists, and fewer panels.
  - `apps/web/src/app/projects/page.tsx`: reduced to three clear project/audit entry cards.
  - `apps/web/src/app/projects/new/page.tsx`: simplified page copy.
  - `apps/web/src/app/AuditForm.tsx`: rendered with minimal CSS that hides the extra guide panel and keeps the wizard focused.
  - `apps/web/src/app/billing/BillingClient.tsx`: reduced to plan metrics, billing actions, and limits.
  - `apps/web/src/app/settings/SettingsClient.tsx`: reduced to members, invitations, and delete workspace.
  - `apps/web/src/app/audits/[id]/AuditDetails.tsx`: removed the extra context panel and reduced top report actions.

Serious app visual polish:

- The owner asked to remove visual inaccuracies and reduce the multicolor look.
- App UI should now stay serious, neutral, and easier to scan:
  - app icons are neutral inside the application shell
  - severity badges use a restrained neutral style
  - app typography is scoped to the provided system Primer-style stack
  - finding rows now use clearer columns so severity, title, summary, and host do not visually merge
  - audit detail finding cards and issue preview are more structured
- This remains scoped to app pages; the public landing page must not be edited.

GitHub/Primer app direction:

- The owner wants the product app to use GitHub/Primer as the design reference, with the strict light token set they provided.
- App pages now use a GitHub-like light canvas, thin borders, compact rows, small neutral icons, issue-state dots, repository-state dots, and denser issue/repository lists.
- Fixed the GitHub page connection copy so repository objects no longer render as `[object Object]`; repository count is normalized before display.
- GitHub repository rows now use explicit columns for state, repo name, issue status, and visibility/branch metadata to prevent overlap.
- `/findings` now uses a GitHub Issues-inspired list:
  - filter input
  - Open/Exported counters
  - header filter controls
  - checkbox, open-state icon, title, labels, metadata, summary, affected page, and evidence count per row
  - muted light labels rather than bright multicolor pills

Strict light Primer-style design token pass:

- The owner provided GitHub/Primer-style design rules and asked to apply them.
- The application shell now has scoped app tokens in `apps/web/src/app/globals.css`:
  - light canvas `#ffffff`
  - light surface `#f6f8fa`
  - light borders `#d0d7de` and `#d8dee4`
  - text `#1f2328` and muted text `#656d76`
  - Primer blue `#0969da` for primary app actions, links, and focus
  - semantic success, warning, and danger colors exactly from the provided token set
  - system font stack for UI and SFMono-style stack for code
  - 14px base text, 24px page H1, 32px dashboard display heading
  - 6px default radius
  - no decorative shadows by default
  - dense rows with 12px vertical / 16px horizontal spacing
- Keep this scoped to app pages. Do not edit the public landing page unless the owner explicitly reverses that instruction.

Latest strict light cleanup:

- The owner reported that the app still had color inaccuracies after the first light pass.
- Fixed remaining dark-theme leakage in `apps/web/src/app/globals.css` by adding a final app-only cleanup layer:
  - app cards, dashboard live audit facts, metric cards, recent audit rows, recent finding rows, repository rows, and GitHub-style issue rows now resolve to light surfaces
  - text resolves to `#1f2328`
  - muted text resolves to `#656d76`
  - borders resolve to `#d0d7de` / `#d8dee4`
  - progress and primary actions resolve to Primer blue `#0969da`
  - old neon green/cyan and dark card backgrounds are overridden inside the app shell
- Added `devIndicators: false` in `apps/web/next.config.ts` so the local Next dev tools preference panel does not obscure app visual QA.
- Browser computed-style verification for `/dashboard` confirmed:
  - shell, sidebar, live audit card, audit fact cards, metric cards, and finding rows use `rgb(255, 255, 255)` backgrounds
  - panel headers use `rgb(246, 248, 250)`
  - app text uses `rgb(31, 35, 40)`
  - borders use `rgb(208, 215, 222)`
  - progress uses `rgb(9, 105, 218)`
  - the Next dev tools `Preferences` panel is no longer present in the DOM after restart

Linear design system rebuild:

- The owner decided to stop patching the accumulated app CSS and provided the Linear Design System Community Figma file as the new reference.
- Figma access was verified for file `lbAeYRL4tS1LfVAo0ywcBu`; design context was read from the Linear app screen node `2001:10130`.
- `apps/web/src/app/globals.css` was mechanically cleaned from the previous app-design marker onward:
  - removed accumulated dashboard/app/GitHub/Primer/strict-light override layers
  - kept the public landing and marketing CSS above that marker untouched
  - replaced the app layer with one Linear-inspired design system block
- The new app system uses:
  - 275px sidebar
  - 28px nav rows
  - 13px app font scale
  - 44px table/issue rows
  - white app surfaces on `#f7f8fa`
  - `#fbfbfc` sidebar
  - `#e1e4e8` borders
  - `#1f2328` primary text
  - `#737982` muted text
  - Linear purple `#5e6ad2` for primary actions and progress
  - neutral icons and low-decoration surfaces
- Browser computed-style verification confirmed `/dashboard` and `/findings` now use the new Linear metrics and colors.

Linear icon pass:

- The owner asked that all app icons also come from the design system.
- Figma SVG icon nodes were exported from the Linear Design System Community file and embedded as the new `LinearIcon` app component in `apps/web/src/components/BrandIcons.tsx`.
- The existing `BrandIcon` and `GitHubLogo` exports were kept for the public landing/marketing experience.
- App-only UI was converted from old colorful brand icons / GitHub logo / lucide action glyphs to `LinearIcon` or plain text actions:
  - `apps/web/src/components/AppShell.tsx`
  - `apps/web/src/components/AppDataPages.tsx`
  - `apps/web/src/app/dashboard/DashboardClient.tsx`
  - `apps/web/src/app/AuditForm.tsx`
  - `apps/web/src/app/audits/[id]/AuditDetails.tsx`
  - `apps/web/src/app/auth/AuthClient.tsx`
  - `apps/web/src/app/billing/BillingClient.tsx`
  - `apps/web/src/app/settings/SettingsClient.tsx`
  - `apps/web/src/app/onboarding/OnboardingClient.tsx`
  - `apps/web/src/app/projects/page.tsx`
- App shell HTML for `/dashboard` now contains `linear-icon` instances and no `brand-icon` or `github-logo` instances.
- Landing page content was not edited.

Current verification status:

- `git diff --check`: PASS.
- `pnpm db:generate`: PASS.
- `pnpm --filter @ai-swarm-qa/web typecheck`: PASS after Prisma client generation.
- `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
- Local HTTP probe for `http://localhost:3000/dashboard`: PASS, returned 200.
- Local HTTP probes for `/audits`, `/findings`, `/github`, `/settings`, `/billing`, `/projects`, `/projects/new`, `/evidence`, `/agents`, and `/reports`: PASS, returned 200.
- Local HTTP probes for `/dashboard`, `/findings`, `/github`, `/audits`, `/settings`, `/billing`, `/projects`, `/projects/new`, `/onboarding`, and `/auth`: PASS, returned 200 after the Linear icon pass.
- Dashboard HTML check after the Linear icon pass: `linear-icon: 22`, `brand-icon: 0`, `github-logo: 0`.
- Playwright screenshot probe was not completed because the local Playwright browser executable is not installed in this environment.

Latest Linear consistency cleanup:

- The owner reported remaining design inconsistencies:
  - red/yellow status dots in dashboard/findings
  - app content positioned too far from the sidebar
  - remaining old app styling on some pages
  - loading state needed to match the new app system
- Fixed structurally in app React:
  - removed severity dot rendering from dashboard recent findings
  - removed issue-state and row-state dot rendering from findings and GitHub repository lists
  - removed old decorative auth annotations from the app auth screen
  - replaced app data page loading copy with the same skeleton row pattern
- Added a final app-only Linear cleanup layer in `apps/web/src/app/globals.css`:
  - app content is left-aligned from the sidebar with a 1280px working width
  - dashboard, findings, audit detail, auth, loading, and issue preview surfaces are neutral light
  - severity labels are neutral pills, not colored warning labels
  - old dark evidence preview styling is overridden inside app pages
  - audit detail status values use neutral app text instead of neon/legacy colors
  - app loading rows use the Linear skeleton styling
- Landing/marketing JSX and design were not edited.

Latest verification:

- `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
- `git diff --check`: PASS, with only expected Windows CRLF warnings.
- Local HTTP probes returned 200 for `/dashboard`, `/findings`, `/github`, `/audits`, `/settings`, `/billing`, `/projects`, `/projects/new`, `/onboarding`, and `/auth`.
- HTML checks:
  - `/dashboard`: `linear-icon=22`, `brand-icon=0`, `github-logo=0`, `severity-dot=0`, `github-open-icon=0`
  - `/findings`: `linear-icon=22`, `brand-icon=0`, `github-logo=0`, `severity-dot=0`, `github-open-icon=0`
  - `/auth`: `linear-icon=6`, `brand-icon=0`, `github-logo=0`, `severity-dot=0`, `github-open-icon=0`

Next recommended actions:

1. Visually verify `/dashboard` locally or in production once dependencies/server access are available.
2. Run CI or approved validation in an environment where package registry access is acceptable.
3. If the visual direction is approved, continue simplifying related app pages with the same operational style.

Latest layout consistency pass:

- The owner reported that the app still lacked spacing, clear positioning, visible agents, and the small colored inserts seen in the Linear reference.
- App-only layout changes were made without touching the landing page:
  - Dashboard now has a visible `Swarm activity` agent panel beside the work queue.
  - Dashboard work content uses a clearer two-column board layout with recent audits, agents, and findings.
  - Shared app pages now render inside a common `app-content-stack` so `/findings`, `/github`, `/settings`, and `/billing` no longer stretch randomly across the full viewport.
  - Findings and repository states use controlled small Linear-style chips in green, purple, amber/yellow, and orange instead of old colored dot cues.
  - GitHub repositories use a more balanced two-column layout with status chips.
  - Settings and billing now use the same section rhythm, compact row lists, and toolbar spacing as the rest of the app.
- Added a final app-only CSS composition layer for:
  - consistent 36px/48px app padding
  - 1180px working width
  - card/list/panel spacing
  - compact row sizing
  - visible agent rows
  - Linear-style status chips
  - responsive single-column behavior

Verification after the latest pass:

- `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
- `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
- `git diff --check`: PASS, with only expected Windows CRLF warnings.
- Local HTTP probes returned 200 for `/dashboard`, `/findings`, `/github`, `/audits`, `/settings`, `/billing`, `/projects`, `/projects/new`, `/agents`, `/reports`, `/evidence`, and `/auth`.
- Browser screenshot/DOM verification could not be completed in this environment:
  - MCP Playwright is available but bundled Chromium is not installed.
  - System Edge launch through MCP was blocked by sandbox `spawn EPERM`.
  - Shell Node could not import `playwright` from the project.

Latest status dot adjustment:

- The owner asked to replace text status pills with bright circular indicators.
- Dashboard agent rows now show only a green active dot or red inactive dot for state.
- Dashboard recent findings now show only a bright severity dot:
  - weak/low: yellow
  - medium: orange
  - high/critical: red
- The shared findings, evidence, agents, and GitHub repository app views use the same dot convention where applicable.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - Local HTTP probes returned 200 for `/dashboard`, `/findings`, `/github`, `/agents`, and `/evidence`.

Latest GitHub export UI pass:

- The owner reported black checkbox squares and asked for a green GitHub export button with a modal flow:
  - choose repository
  - assign a responsible user or skip assignee
  - confirm export
- Fixed app-only UI:
  - Custom checkbox styling now prevents native black unchecked squares in findings and audit detail lists.
  - `/findings` rows now include a green `Export issue` GitHub button.
  - Clicking `Export issue` opens a modal that loads GitHub repositories and repository assignees, supports skipping assignee, and queues export through the existing audit GitHub export API for the selected finding.
  - Audit detail top actions now include a green `Export issues` GitHub button for selected findings.
  - Audit detail export modal supports repository selection, assignee selection/skip, optional public evidence link, and queues the existing export workflow.
  - Audit detail layout got a final width and column stabilization pass so the findings/review page does not stretch unpredictably.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/findings`, `/github`, `/agents`, `/evidence`, and `/audits/cms34z8t8002z0lmn8c7vqyk1`.

Latest audit detail polish:

- The owner reported that the audit detail page still lacked right-side padding, the issue preview still showed text severity like `high`, and the GitHub export action needed selected issue count context.
- Fixed audit detail UI:
  - The issue preview header now uses a colored severity dot instead of a text severity tag.
  - The issue preview panel has stronger internal spacing, clearer section padding, and stable right-column sizing.
  - The top green GitHub export button now shows the current selected count.
  - The export modal copy and submit button now say how many issues will be exported.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - Local HTTP probes returned 200 for `/audits/cms34z8t8002z0lmn8c7vqyk1` and `/findings`.

Latest audit detail spacing and diagnostics polish:

- The owner reported remaining audit detail UI issues:
  - GitHub icon on the green export button was not visible enough.
  - `Issues to review` and nearby buttons lacked padding.
  - Finding severity dots were stretched.
  - Completed status needed a green dot.
  - Agent activity lacked internal spacing.
  - Technical run data needed spacing and a short explanation.
- Fixed audit detail UI:
  - GitHub export icon is forced to white on the green button.
  - `Issues to review` header now has card padding, divider, and better button spacing.
  - Finding severity indicators are constrained to true 10px circles.
  - Status summary now shows a green dot next to completed.
  - Agent activity has a padded header and clean card grid.
  - Technical run data now has a designed summary header, short explanation, compact rows, and cleaner panel spacing.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/audits/cms34z8t8002z0lmn8c7vqyk1` and `/findings`.

Latest findings triage flow pass:

- The owner reported that `/findings` was unclear because issue rows did not make the source test/audit obvious enough.
- Updated `/findings` into a triage view:
  - issue rows now select an issue instead of immediately opening the full report.
  - row metadata now names the source test target.
  - a right-side preview panel shows the selected issue, source audit/test, status, findings count, priority count, affected page, evidence count, and completion time.
  - the preview panel includes a clear `View full report` action that opens the existing audit report page.
  - the existing per-issue GitHub export modal remains available from each row.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probe returned 200 for `/findings`.

Latest audits and GitHub clarity pass:

- The owner reported that `/audits` did not clearly expose the next action and that `/github` used unclear green/red repository dots.
- Updated `/audits`:
  - each audit row now shows the audit target, short audit ID, status with a clear state dot, finding count, timestamp, and a visible `View audit` action.
- Updated `/github`:
  - the connection card now uses a clear green `Connected` badge when the GitHub App is authorized.
  - repository rows no longer rely on unexplained colored dots.
  - repositories now show explicit readiness labels: `Ready`, `Archived`, or `Issues disabled`.
  - each repository row includes a short explanation of whether findings can be exported there.
  - the GitHub page includes a direct `Open reports` action because export happens from reviewed audit reports.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/audits` and `/github`.

Latest app dot sizing pass:

- The owner reported that bright circular indicators were visually clipped in narrow rows.
- Added a final app-only CSS override that normalizes all app status/severity dots:
  - 7px circular size.
  - no glow/shadow that can clip against row bounds.
  - stable flex sizing and vertical alignment.
  - bright green/red/yellow/orange/red colors are preserved.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/dashboard`, `/findings`, `/audits`, `/agents`, and `/evidence`.

Latest GitHub connection action pass:

- The owner asked for the GitHub page to match the tighter left-aligned layout in the screenshot and to include a connection action:
  - `Disconnect` when GitHub is connected.
  - `Connect new` when GitHub is not connected.
- Added a real `POST /api/integrations/github/disconnect` route.
- Added `disconnectGitHubConnectionsForWorkspace()` in the database package. It marks active workspace GitHub connections as revoked instead of deleting connection/export history.
- Updated `/github` UI:
  - the header action now shows `Disconnect` for connected workspaces.
  - disconnected workspaces show `Connect new`.
  - the connection card keeps `Connect new` and `Open reports` actions.
  - the GitHub layout is capped to a tighter left-aligned working width so it no longer floats into a huge empty area.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/database typecheck`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probe returned 200 for `/github`.

Latest audit action polish pass:

- The owner requested small visual fixes on the audit status/report page:
  - add icons to `Download` and `Share`.
  - make the green GitHub export button use the app font and a visible GitHub icon.
  - make the sidebar brand text-only.
  - remove the `Clear` selection button.
- Updated:
  - `LinearIcon` now includes `download` and `share`.
  - Audit top actions render `Download` and `Share` with Linear-style icons.
  - `Clear` was removed from the findings selection controls.
  - App shell brand no longer renders the square `AI` mark.
  - Final app CSS ensures the GitHub export icon is white and the button typography uses the app font.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probe returned 200 for `/audits/cms34z8t8002z0lmn8c7vqyk1`.
  - HTML probe confirmed `Clear` and `brand-mark` are no longer rendered.

Latest dashboard loading and GitHub summary pass:

- The owner reported slow dashboard loading and asked for the dashboard to show GitHub connection state.
- Dashboard now renders the main layout immediately with fallback data while the overview API is loading, instead of relying on a full skeleton-only state.
- `/api/dashboard` now includes a `githubConnection` summary in the same overview payload:
  - connected/disconnected state
  - GitHub account login
  - selected repository, derived from the latest export repository or the first ready authorized repository
  - authorized repository count
  - ready repository count
- Dashboard now includes a top GitHub card:
  - disconnected state shows `Connect GitHub`
  - connected state shows a GitHub icon, `GitHub connected`, selected repository, ready/authorized repository count, and `Manage GitHub`
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/database typecheck`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probe returned 200 for `/dashboard`.
  - Local API probe returned 200 for `/api/dashboard`, but the local endpoint still takes roughly 1.5-1.8 seconds and may need a separate query profiling pass for real backend speed improvements.

Latest checkbox and dropdown control pass:

- The owner reported that the audit report findings were all selected by default and the checkbox target was too small.
- Audit detail findings are no longer auto-selected on page load; the first finding still opens for review, but GitHub export selection starts empty.
- The findings toolbar now toggles between `Select all` and `Deselect all` as a deliberate bulk action.
- Finding checkbox hit areas were enlarged so users do not need to click the tiny square exactly.
- App checkboxes now use a consistent Linear-style square control with green checked state and stable checkmark rendering.
- App dropdowns/select controls now share one final Linear-style treatment:
  - white surface
  - compact 34-38px height
  - 8px radius
  - thin border
  - right-side chevron
  - consistent focus ring
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/audits/cms34z8t8002z0lmn8c7vqyk1` and `/findings`.

Latest custom dropdown correction:

- The owner clarified that native opened dropdown menus were still using the default Windows/browser look.
- Added a reusable `AppSelect` component in `apps/web/src/components/AppSelect.tsx`.
- Replaced the GitHub export modal native repository and assignee `<select>` controls with the custom app select in:
  - `apps/web/src/app/audits/[id]/AuditDetails.tsx`
  - `apps/web/src/components/AppDataPages.tsx`
- There are no remaining native `<select>` elements in `apps/web/src/app` or `apps/web/src/components`.
- The custom dropdown menu now renders with the app design system:
  - app-controlled trigger
  - app-controlled opened menu
  - compact option rows
  - hover and selected states
  - Linear-style border, radius, shadow, and focus ring
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Native select search returned no matches in `apps/web/src/app` or `apps/web/src/components`.
  - Local HTTP probes returned 200 for `/audits/cms34z8t8002z0lmn8c7vqyk1` and `/findings`.

Latest settings account and plan pass:

- The owner asked for Settings to show account information, login, password/security state, current plan, plan differences, and pricing.
- Password values are intentionally not displayed. Settings now explains that passwords are protected/hidden and managed through Supabase Auth.
- `/api/settings/workspace` now returns a safe `account` object:
  - user id
  - email
  - name
  - login derived from email
- `apps/web/src/app/settings/SettingsClient.tsx` now loads both workspace settings and billing summary.
- Settings now includes:
  - Account profile: name, login, email, user ID
  - Security: protected password state and auth provider
  - Current plan: plan name, status, billing interval, period end, audits used
  - Current limits: audits, pages, concurrency, team members, evidence retention, GitHub export, email reports, priority queue
  - Team members and invite controls
  - Plan comparison with Free, Pro, and Business pricing and feature differences
- Added app-only CSS for settings account cards, detail rows, and plan comparison cards.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/settings`, `/api/settings/workspace`, and `/api/billing/summary`.
  - Safe API sanity check confirmed account/workspace and billing plan/limits are present without printing account values.

Latest new audit modal guidance pass:

- The owner reported that the New Audit popup looked broken/empty and asked for small per-step guidance.
- Dashboard `NewAuditModal` now includes a visible help card for every setup step:
  - URL/target guidance
  - access guidance
  - mission/scope guidance
  - launch/safety guidance
- The Access step now clearly says:
  - use only temporary test accounts
  - the connection is encrypted in transit
  - agents inspect the client-side website in a browser
  - AISwarmQA does not access server files, databases, or source code
- Temporary credentials copy was expanded to remind users not to provide admin, personal, or customer credentials.
- Review step now explains that GitHub export happens later from reviewed findings and is for repository metadata plus issue creation.
- GitHub connection page now includes a permission note:
  - AISwarmQA uses GitHub for repository selection and issue creation
  - the product workflow does not read repository files or source code
- Added final app-only CSS to make the new audit modal readable:
  - visible step labels and numbers
  - visible help card
  - stronger input/textarea states
  - readable choice cards
  - green temporary access notice
  - clearer launch review rows
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
  - Local HTTP probes returned 200 for `/dashboard?newAudit=1` and `/github`.
  - Source check confirmed the client-side/security/GitHub permission copy is present.

Product sitemap and workflow pass:

- Created `docs/product/sitemap-and-workflow.md` as the canonical app information architecture and workflow map.
- The clean business flow is documented as:
  - Visitor -> sign up -> dashboard -> new audit -> audit report -> findings review -> GitHub export -> settings/billing.
- Primary app navigation should stay:
  - Dashboard
  - Audits
  - Findings
  - GitHub
  - Settings
- Secondary or hidden app routes are documented:
  - `/billing` remains secondary behind Settings or upgrade prompts.
  - `/onboarding` is conditional after signup, not primary navigation.
  - `/evidence` and `/agents` are contextual/support surfaces.
  - `/admin/content`, public evidence detail routes, and API routes are hidden/system routes.
- Merge/removal candidates are documented:
  - `/reports` duplicates `/audits` unless it becomes an exported report archive.
  - `/projects` and `/projects/new` duplicate the dashboard new audit launcher unless real project management is introduced.
- Product copy hierarchy is documented:
  - Use `audit` for runs, `finding` for QA problems, `issue` for GitHub export, `report` for completed audit detail, and `workspace` for account/team context.
- Landing and public marketing routes were not edited.

Security, workflow, and UI stabilization pass:

- Fixed GitHub integration authorization boundaries:
  - GitHub App install now requires `github:manage`.
  - GitHub disconnect now requires `github:manage`.
  - GitHub webhooks no longer create connections under the development actor for unknown installations; webhook sync now only updates an existing active installation mapping.
- Hardened public evidence access:
  - Public evidence lookup now blocks deleted evidence and expired evidence directly, without waiting for retention cleanup.
  - Authenticated audit finding DTOs no longer expose internal evidence `localPath`, `storageBucket`, `storagePath`, content type, or object size fields to the app UI.
- Improved Supabase/Data API hardening:
  - Added a Prisma migration that revokes `anon` and `authenticated` access to server-owned public app tables/sequences/functions and enables RLS on current app tables.
  - The app remains server-side Prisma owned; raw Supabase Data API table access is not part of the app workflow.
- Improved auth session handling:
  - Added `/api/auth/session` to set and clear the AISwarmQA auth cookie server-side with `HttpOnly`.
  - Auth UI no longer writes the app auth access-token cookie through `document.cookie`.
- Improved findings and dropdown UI behavior:
  - Findings page checkboxes now have real selected state and a working select-all-visible control.
  - Custom app select now has label association and basic keyboard handling for Escape, arrow keys, Enter, and Space.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/database typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/shared test`: PASS after escalation for Windows sandbox `spawn EPERM`.
  - `corepack pnpm@10.0.0 test`: PASS after escalation for Windows sandbox `spawn EPERM`.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web build`: PASS after escalation for Windows sandbox `spawn EPERM`.
  - `corepack pnpm@10.0.0 --dir packages/database exec prisma validate --schema prisma/schema.prisma`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
- QA note:
  - The delegated QA task reported that production build and web tests passed after escalation.
  - Browser console verification remained blocked because the Playwright Chromium runtime was missing and the task was attempting a system Edge fallback.
  - The delegated QA task found a root typecheck blocker in `packages/ai/src/index.test.ts`; the planner fixture now includes `defaultAuditMissionContext` and the required `noStoredPasswords` constraint.
  - `corepack pnpm@10.0.0 typecheck`: PASS after that fixture fix.

New Audit backend workflow pass:

- Fixed the product workflow gap where New Audit metadata was accepted by the UI but dropped before planning.
- Added a shared sanitized mission context contract for:
  - access mode
  - audit scope
  - login URL
  - test account identifier
  - custom instructions
  - safety rules
- `/api/audits` now sanitizes New Audit metadata and includes it in the `plan-audit` queue payload.
- Planning jobs now pass mission context into planner input and mission merging.
- Mission records now persist the mission context inside mission instructions so worker-visible mission records retain the chosen scope and instructions.
- Mission execution queue payloads now carry the same sanitized mission context.
- Temporary access UX was reduced to supported fields:
  - login URL
  - test account email or username
  - safe access notes
  - no password field
- Plaintext passwords are not accepted by the audit request schema, are not queued, and are not stored.
- Verification:
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/shared test`: PASS after sandbox escalation for Windows `spawn EPERM`.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/shared typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/web lint`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/worker typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/database typecheck`: PASS.
  - `corepack pnpm@10.0.0 --filter @ai-swarm-qa/queue typecheck`: PASS.
  - `git diff --check`: PASS, with only expected Windows CRLF warnings.
