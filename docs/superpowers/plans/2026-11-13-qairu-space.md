# Qairu Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Qairu Space 2.0.0 with Lunatica styling, preserved Campus Night data, and an opt-in XP leaderboard.
**Architecture:** Common WebExtension source, pure shared XP model, background-only authenticated leaderboard client, independent Worker/D1 service. Generate Firefox and Chromium packages from the common source.
**Tech Stack:** JavaScript, WebExtension MV3, Node test runner/jsdom, Cloudflare Worker/D1.
**Spec:** ../specs/2026-11-13-qairu-space-design.md (approved 2026-11-13; user delegated subsequent technical decisions).

## Global Constraints
- Firefox ID `campus-night@local.qairu-tools`; Chrome listing `akkedafgaegkaccceojhpelhamfkogpa` unchanged.
- Version 2.0.0, name Qairu Space, authors wateroff and airsmooth.
- Existing storage and v1/v2 backup compatibility; no clear/reset.
- No grade comparison, no invented XP awards, no automatic participation.
- No credentials or personal academic data in public repository/test fixtures.
- User has authorized publishing in both stores after verification.

## Review Focus
- A storage read or network response fails halfway through join/delete: retain recoverable state.
- A previous tab is logged out or another account is now shown: never send cached XP as fresh.
- Untrusted page messages/HTML/nickname: do not expose secret or execute markup.
- Multiple tabs mutate state: serialize sensitive operations and prevent duplicate identity.
- Optional permission revoked after joining: stop transmission, retain deletion/recovery path.

### Task 1: Common extension and Lunatica theme
**Files:** `extension/*` imported from outputs/campus-night-firefox; `scripts/build-theme.cjs`; `extension/lunatica-theme.js`; `extension/content.js`; `tests/theme.cjs`; `scripts/build.cjs`.
**Interfaces:** CampusNight existing normalize/isDark unchanged; CampusSpaceTheme.css(palette:string):string supplies extracted upstream CSS and retained warm/midnight palette adaptations.
- [ ] Test old stored preferences produce the requested dark/off/system state and inherited campus tokens; storage failure performs no writes; live changes remove the theme in off mode.
- [ ] Run `node --test tests/theme.cjs` and observe missing theme behavior fail.
- [ ] Extract upstream themeCSS and required constants into reproducible module; replace DarkReader application with one owned stylesheet. Keep comfort attributes and existing storage keys. Import source without personal artifacts. Build common packages preserving IDs.
- [ ] Run theme tests, existing migration/backup tests and syntax checks; expect pass.
- [ ] Commit source integration and record result.

### Task 2: XP model and service
**Files:** `extension/xp.js`; `extension/dashboard-content.js`; `server/worker.mjs`; `server/schema.sql`; `tests/xp.cjs`; `tests/server.mjs`.
**Interfaces:** CampusXP.parseDocument(doc):{xp:number}; CampusXP.tier(xp):{level:number,name:string,min:number}; Worker routes `/v1/board?offset=0`, `/v1/member` GET/PUT/DELETE with bearer secret, PUT also idempotent join. Public rows `{id,alias,xp,updatedAt,rank,tier}`; private keys never returned.
- [ ] Tests: XP 0/1200/18000, missing/ambiguous/invalid meter; rank tie 1/1/3; authenticated update/decrease/delete, malformed inputs/body limits, idempotency and 90-day expiry. Expected parse `{xp:1200}`, tier name `Junior`.
- [ ] Run `node --test tests/xp.cjs tests/server.mjs`; observe missing implementation fail.
- [ ] Implement strict parser, existing campus thresholds, own-trajectory fresh request; SQL schema and Worker with parameterized queries, rate limits, pagination, secret hashing, no request body logs and cron pruning. Test SQL against actual SQLite locally with a D1 adapter.
- [ ] Run tests; expect all pass. Commit.

### Task 3: Participation client and UI
**Files:** `extension/ranking-background.js`; `extension/ranking-ui.js`; `extension/ranking-account.html`; `extension/ranking-account.js`; `extension/site-panel.js`; `extension/manifest.json`; `tests/ranking-client.cjs`; `tests/ranking-ui.cjs`.
**Interfaces:** background messages `space:ranking` with action `state/list/join/update/delete`; state exposes membership metadata only; secret import/export restricted to bundled account page. CampusRanking.mount({root,request}):{activate(),destroy()}.
- [ ] Tests prove zero XP upload without join, failed join persists secret, retry reuses identity, failed delete retains key, success removes key, sender checks, revoked permission prevents sends, UI escapes aliases and shows recoverable errors.
- [ ] Run client/UI tests; observe absent implementation fail.
- [ ] Implement serialized background client, explicit consent and refresh, permission handling, extension-only key recovery page, site tab and native table/tier grouping. Ensure fresh trajectory read for join/update. Update branding text while retaining technical keys/backup identifier. Include manual recovery without deleting local settings.
- [ ] Run all new tests and old regression tests. Commit.

### Task 4: Deployment and release
**Files:** `scripts/deploy.mjs` (or documented API deployment); `docs/PRIVACY.md`; `docs/RELEASE-2.0.md`; README; build artifacts outside source.
**Interfaces:** isolated production Worker hostname pinned in extension config; reproducible packages and source archive.
- [ ] Verify Cloudflare plan through supported account UI/API; deploy isolated Worker+D1, schema and cron, no plan upgrade. Test live synthetic join/update/ties/delete and delete test records.
- [ ] Update privacy/store declarations for optional XP/authentication transmission; verify manifest permissions and consent revocation behavior. Build and lint both browser packages, check source archive reproduces packaged files.
- [ ] Inspect desktop and narrow-screen preview together; one batch of fixes and at most one confirmation round. Run complete regression suite; fresh whole-branch code review and required design finish handoff, fix important findings with regression tests.
- [ ] Push approved merged project, update public policy, submit 2.0.0 to both existing store listings, record status/screenshots. Report pending moderation accurately.
