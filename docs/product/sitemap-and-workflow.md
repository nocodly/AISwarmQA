# AISwarmQA Product Sitemap and Workflow

Last updated: 2026-08-02

This document defines the product information architecture for the SaaS app experience. It is intentionally separate from the public landing page and marketing content. Do not change the landing page from this document alone.

## Product Principle

AISwarmQA should feel like an operational QA console, not a content hub. The app should make one business workflow obvious:

```text
Visitor -> sign up -> dashboard -> new audit -> audit report -> findings review -> GitHub export -> settings/billing
```

The app should keep a small primary navigation and use contextual links for supporting pages. Users should always understand the next action: start an audit, open a report, review findings, connect GitHub, export confirmed issues, or manage the workspace.

## Business Sitemap

### Public acquisition

These routes exist for visitors and search traffic. They should stay outside the authenticated app shell and should not be edited unless the owner explicitly asks for landing or marketing changes.

| Route | Role | Decision |
| --- | --- | --- |
| `/` | Main marketing landing page | Primary public route; do not touch unless explicitly requested. |
| `/pricing` | Plan comparison and conversion | Primary public route; link to signup/auth and billing context. |
| `/features`, `/how-it-works`, `/use-cases`, `/integrations`, `/compare`, `/blog`, `/docs`, `/glossary`, `/changelog` | SEO and education routes | Secondary public routes; useful for acquisition, not app workflow. |
| `/about`, `/contact`, `/status`, `/privacy`, `/terms`, `/imprint` | Trust, support, legal | Secondary or footer-only public routes. |
| Topic routes such as `/browser-testing`, `/playwright-testing`, `/accessibility-testing`, `/mobile-testing` | Public topic pages | Secondary acquisition routes. Keep CTAs pointed to signup or new audit entry. |

### Authentication and activation

| Route | Role | Decision |
| --- | --- | --- |
| `/auth` | Sign in and sign up | Primary gateway. Successful auth should land on `/dashboard`. |
| `/onboarding` | First-run setup checklist | Secondary/conditional. Show only for incomplete workspace setup, empty workspace, or post-signup guidance. Do not keep it in main nav. |

### Core app

These are the primary app pages. They should remain in the sidebar.

| Route | Role | Decision |
| --- | --- | --- |
| `/dashboard` | Workspace command center | Primary. Show current work, GitHub state, recent audits, recent findings, and the main `New audit` action. |
| `/audits` | Audit history | Primary. A list of audit runs with status, target, findings count, timestamp, and `View audit`. |
| `/audits/[id]` | Audit report and review workspace | Primary detail route. This is the main report, finding review, evidence, agent activity, export, download, and share surface. |
| `/findings` | Cross-audit triage queue | Primary. Supports issue selection, source audit preview, filtering, and contextual export for a single finding. |
| `/github` | GitHub connection and repository readiness | Primary. Manage GitHub connection; export itself should happen from reviewed findings or reports. |
| `/settings` | Workspace/account/security/team/plan summary | Primary account route. Include billing entry points inside this page. |

### Secondary app routes

These routes can exist, but they should be reached contextually rather than through primary navigation.

| Route | Role | Decision |
| --- | --- | --- |
| `/billing` | Billing portal, plan limits, checkout actions | Secondary. Link from Settings and upgrade prompts. Consider merging most visible plan content into `/settings`. |
| `/reports` | Alternate audit report list | Merge candidate. It duplicates `/audits`; keep only if it becomes an exports/downloads archive. |
| `/evidence` | Evidence gallery | Secondary or hidden. Evidence is strongest inside `/audits/[id]`; keep the index for support/debug only. |
| `/agents` | Swarm activity list | Secondary or hidden. Agent activity is strongest inside dashboard and audit reports; keep the index for diagnostics only. |
| `/projects` | Project/audit start hub | Merge candidate. Current product language is audit-first, so this should redirect to `/dashboard?newAudit=1` or become a future target-management page. |
| `/projects/new` | Legacy new audit entry | Merge candidate. Prefer the dashboard new audit modal. If retained, it should be a direct launcher or redirect. |

### Hidden/system routes

| Route | Role | Decision |
| --- | --- | --- |
| `/evidence/[publicEvidenceId]` | Shareable evidence view | Hidden detail route. Open only from reports, exported issues, or explicit evidence links. |
| `/admin/content` | Internal content administration | Hidden/admin-only. Do not expose in normal app navigation. |
| `/search` | Public/content search | Secondary public utility, not core app navigation. |
| `/sitemap.xml` via `sitemap.ts` | Search engine sitemap | System route. Keep public-focused. |
| `/api/*` | Product APIs | Hidden/system. Do not link directly except GitHub install/callback flows. |

## App Navigation Decision

The sidebar should stay small:

```text
Main
- Dashboard
- Audits
- Findings
- GitHub

Account
- Settings
```

Do not add `Billing`, `Projects`, `Reports`, `Evidence`, `Agents`, or `Onboarding` to the main sidebar unless the product role changes. They are supporting surfaces and should be reachable from the page where they become useful.

Recommended contextual links:

- Dashboard: `New audit`, `Manage GitHub`, `View all audits`, `View all findings`, `View agent activity` only when activity exists.
- Audits: `New audit`, `View audit`.
- Audit report: `Export issues`, `Download`, `Share`, `Select all`, finding rows, technical diagnostics collapsed by default.
- Findings: `View full report`, `Export issue`, filters.
- GitHub: `Connect new` or `Disconnect`, `Open reports` or preferably `Open audits`.
- Settings: billing portal, plan comparison, workspace/team/account/security controls.
- Billing: back to Settings and upgrade/manage plan actions.

## Primary User Workflow

### Visitor to signup

Goal: convert a visitor who understands AISwarmQA into a workspace user.

Expected path:

```text
/ -> /pricing or /auth -> /auth -> /dashboard
```

Rules:

- Marketing CTAs should go to signup/auth or directly to the audit-start intent.
- Public content should not send app users into confusing legacy app hubs.
- After sign in or sign up, the user should land on `/dashboard`.

### First audit

Goal: start the first safe audit with minimal uncertainty.

Expected path:

```text
/dashboard -> New audit modal -> /api/audits -> /audits/[id]
```

New audit modal hierarchy:

1. Target URL.
2. Access mode: public, temporary test account, or guided instructions.
3. Mission/scope: quick smoke, full product flow, login/signup, checkout/billing, mobile, or custom.
4. Launch review and safety rules.

Copy priorities:

- Say "temporary test account", not generic credentials.
- Explain that AISwarmQA inspects the client-side website in a browser.
- Explain that AISwarmQA does not access server files, databases, or source code.
- Explain that GitHub export happens later from reviewed findings.

### Running audit

Goal: keep the user oriented while execution-plane work runs asynchronously.

Expected path:

```text
/audits/[id] live status -> auto-refresh -> completed report
```

Report priorities while running:

1. Lifecycle state and progress.
2. Active/queued/completed mission count.
3. Cancel action when safe.
4. Early findings or pending report state.
5. Technical diagnostics collapsed or secondary.

### Report and findings review

Goal: turn raw audit output into confirmed engineering work.

Expected path:

```text
/audits/[id] -> select finding -> issue preview -> verify evidence/repro -> select findings for export
```

Report page hierarchy:

1. Top actions: GitHub export, download, share.
2. Audit status and summary metrics.
3. Findings review list.
4. Issue-like preview: severity dot, title, affected page, actual behavior, expected behavior, reproduction steps, evidence.
5. Agent activity.
6. Technical run data collapsed by default.

Findings page hierarchy:

1. Cross-audit issue queue and filters.
2. Selected issue preview with source audit context.
3. `View full report` as the main deep review action.
4. Single-issue `Export issue` for quick confirmed findings.

### GitHub export

Goal: export only confirmed findings into a selected repository as actionable issues.

Expected path:

```text
/github connect if needed -> /audits/[id] or /findings -> Export issue(s) -> choose repository -> choose assignee or skip -> confirm -> queued export
```

Rules:

- `/github` is for connection, repository readiness, and permissions clarity.
- `/github` should not be the primary export surface.
- Export actions belong on `/audits/[id]` and `/findings`.
- The export modal should always show repository selection, assignee or skip assignee, evidence link choice, and final confirmation.
- Copy must say AISwarmQA uses GitHub for repository selection and issue creation, not source-code access.

### Settings and billing

Goal: manage account, workspace, team, security state, and plan.

Expected path:

```text
/settings -> account/security/team/plan -> /billing or billing portal when needed
```

Rules:

- Settings is the account home.
- Billing can remain a secondary route, but plan summary and upgrade intent should be visible in Settings.
- Passwords must never be displayed. Settings should state that passwords are protected and managed by Supabase Auth.

## Route and Link Conflicts

| Conflict | Current effect | Recommendation |
| --- | --- | --- |
| `/audits` and `/reports` both list audit report-like objects | Users may not know which page owns report review. | Make `/audits` the canonical history and report entry. Merge `/reports` into `/audits`, redirect it, or reserve `/reports` for downloadable/exported report archives only. |
| `/dashboard?newAudit=1`, `/projects`, and `/projects/new` all imply audit creation | New users can be split across three start paths. | Make dashboard modal the canonical start. Convert `/projects/new` to a compatibility launcher/redirect and make `/projects` hidden until real project management exists. |
| `/evidence` duplicates evidence inside audit detail | Evidence lacks source context when viewed as a standalone gallery. | Keep evidence review inside `/audits/[id]`; keep `/evidence` secondary for support and public evidence link management. |
| `/agents` duplicates dashboard/report agent activity | Swarm state can feel like a separate product instead of audit context. | Keep agents visible in dashboard/report context; use `/agents` only for diagnostics or future agent observability. |
| `/github` has `Open reports` but export happens from audit reports/findings | Users may expect export directly from GitHub page. | Change the contextual action to `Open audits` or `Review findings`; keep export CTAs on `/audits/[id]` and `/findings`. |
| Marketing topic CTAs can point to `/projects/new` | Public conversion may enter a legacy app route. | Point new public CTAs to `/auth` or `/dashboard?newAudit=1` after auth handling is clarified. Do not edit landing unless explicitly requested. |
| Technical diagnostics on audit detail can compete with finding review | Non-technical users may lose the business next step. | Keep technical data collapsed and below agent activity. |

## Page Priority Summary

| Page | Priority | Keep/Merge/Hide |
| --- | --- | --- |
| `/dashboard` | Primary | Keep; command center and canonical audit start. |
| `/audits` | Primary | Keep; canonical audit/report history. |
| `/audits/[id]` | Primary | Keep; canonical report, finding review, and bulk export. |
| `/findings` | Primary | Keep; cross-audit triage queue and single finding export. |
| `/github` | Primary | Keep; connection and repository readiness only. |
| `/settings` | Primary | Keep; account, security, team, plan summary. |
| `/billing` | Secondary | Keep behind Settings/upgrade prompts, or partially merge into Settings. |
| `/onboarding` | Secondary | Conditional after signup, not always visible. |
| `/reports` | Merge candidate | Merge/redirect to `/audits` unless it becomes a download archive. |
| `/projects` | Merge candidate | Hide until real project management exists. |
| `/projects/new` | Merge candidate | Redirect or route into dashboard new audit modal. |
| `/evidence` | Secondary/hidden | Keep for support; evidence should be contextual in reports. |
| `/agents` | Secondary/hidden | Keep for diagnostics; agent activity should be contextual. |
| `/admin/content` | Hidden | Admin-only. |

## Copy Hierarchy

Use product nouns consistently:

- Prefer `audit` for the run object.
- Prefer `finding` for detected QA problems.
- Prefer `issue` only when preparing or exporting to GitHub.
- Prefer `report` for the completed audit detail page.
- Prefer `workspace` for account/team/settings context.

Primary CTA labels:

- `New audit`
- `Start audit`
- `View audit`
- `View full report`
- `Review findings`
- `Export issue`
- `Export issues`
- `Connect GitHub`
- `Manage GitHub`
- `Manage billing`

Avoid unclear labels:

- `Open reports` when the destination is really audit history.
- `Projects` as an audit-start concept before real project management exists.
- `Try again` for authentication-required states.
- Text-only severity labels when visual review relies on severity dots.

## Onboarding Logic

Onboarding should be conditional and short. The user should be considered onboarded when these actions are complete:

1. Workspace exists.
2. First audit is started.
3. At least one completed report exists.
4. GitHub is connected or intentionally skipped.
5. The user has visited Settings/Billing or acknowledged plan limits.

Recommended onboarding checklist:

- Start first audit.
- Review first report.
- Connect GitHub.
- Export first confirmed issue.
- Review workspace settings.

Do not make onboarding a permanent destination in primary navigation.

## Implementation Guidance

Near-term product simplification should happen in this order:

1. Keep the current sidebar as Dashboard, Audits, Findings, GitHub, Settings.
2. Treat `/audits` as the canonical report index; reduce or redirect `/reports`.
3. Treat `/dashboard?newAudit=1` as the canonical new audit path; reduce or redirect `/projects/new`.
4. Keep `/evidence` and `/agents` out of the main nav and use contextual links only.
5. Move billing entry points into Settings, with `/billing` as a secondary destination or billing portal bridge.
6. Keep technical diagnostics below the business workflow and collapsed by default.

Landing and public marketing routes are intentionally out of scope for this simplification pass.
