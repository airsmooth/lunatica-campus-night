# Private grades and GPA comparison implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship opt-in private grade comparison in Qairu Space 2.1.0, preserving all 2.0 functionality and submitting both stores.
**Architecture:** Strict DOM-to-metric parser; extension-origin consent and secret vault; separate private Worker/D1 routes and daily coarse self-only snapshots. Existing XP remains isolated. No raw student data in source/test fixtures.
**Tech Stack:** WebExtension MV3 JavaScript, Node test runner/jsdom/sqlite, Cloudflare Worker/D1.
**Spec:** ../specs/2026-11-13-grade-ranking-design.md (explicitly approved by user).

## Global Constraints
- Existing Firefox ID and Chrome item unchanged. Version 2.1.0; author wateroff, airsmooth.
- Separate grades consent and secret; exact grades private to server, no public participant/grade endpoint.
- One selected academic period; explicit change; only same-account fresh reads. Automatic check at most once per day with an open campus tab.
- N>=20, outward 10% bands, ties span entire group, outward 20-place/count bands. Daily publication needs five distinct changed members after first snapshot.
- Delete/expiry invalidates affected snapshots immediately; retention 90 days; heartbeat on successfully read unchanged data.
- No real student enrollment during testing; source fixtures synthetic. Preserve settings and ordinary backup v2, excluding grades consent/keys/data.

## Review Focus
- Two browser copies race with update/delete: CAS conflict cannot resurrect erased contributions or silently overwrite a newer snapshot (Task 2/3).
- Partial HTML/filter/locale/account switching must never be accepted as a complete replacement or zero grade (Task 1/3).
- Changed score/member cannot query an old or arbitrary-value snapshot to probe distribution; snapshots cannot publish across concurrent mutations (Task 2).
- Restarts during failed join/delete retain key and stop automatic uploads until recovery (Task 3).
- React rerenders, theme-off and a missing GPA must preserve native layout and show honest unavailable state (Task 4).

### Task 1: Strict grade model and campus collector
**Files:** extension/grades-model.js, extension/grades-source.js, tests/grades-model.cjs, tests/grades-source.cjs; docs source-contract notes.
**Interfaces:** CampusGrades.validateSnapshot({period,complete,metrics}) returns normalized snapshot, each metric {key,kind,course,work,value,max,status}; CampusGrades.range(N,H,E) returns coarse bands or null. CampusGradesSource.parse(doc) returns {snapshot,anchors,issues}; identity(profileDoc) returns campus email for in-memory HMAC only; collection reads profile before/after grades and fails closed on mismatch. Metric keys include kind, canonical course/work IDs, scale and status. Period YYYY-YYYY~N. UUID work IDs only; ambiguous works excluded with visible explanation.
- [ ] Write tests for decimal comma, 40/40=100%, real zero vs missing, duplicate/ambiguous work IDs, period mismatch/filter, GPA absent/verified scale, N19/20, ties and 20-place rounding. Assert e.g. range(100,20,1).percent=[20,30].
- [ ] Run node --test tests/grades-model.cjs tests/grades-source.cjs; expected missing module failures.
- [ ] Implement strict bounded allowlisted payload and real observed DOM adapters, without parsing hydration/private app state. Prove source selectors and official GPA scale before enabling their metrics; preserve unsupported reasons.
- [ ] Run these tests and legacy parsing regressions; expected all pass. Commit.

### Task 2: Private service and daily snapshots
**Files:** server/grades.mjs, server/grades-schema.sql, server/worker.mjs, scripts/build-worker.cjs, tests/grades-server.mjs.
**Interfaces:** routeGrades(request,env,now) handles /v2/grades/member (GET/PUT/DELETE), /heartbeat (POST), /results (GET); shared exact snapshot model from Task 1. publishGrades(env,now) executes daily pruning/publication. Tokens separate from XP; JSON never returns other tokens, exact values or raw histograms. SQLite tests implement D1 batch transaction semantics.
- [ ] Write tests: consent version required, 19/20, equal results, five distinct changes vs repeated edits, once/day, own result tied to snapshot metric fingerprint, unsupported routes, limits, CAS/idempotent lost response, period replacement, delete vs update, expiry and heartbeat. Assert XP board contains no grade fields.
- [ ] Run node --test tests/grades-server.mjs; expected missing service failures.
- [ ] Implement private prefixed tables and atomic mutation/CAS with generation guard for computed snapshots. Keep only current exact values and coarse snapshots. DELETE tombstones prevent late retries resurrecting a retired key; remove personal metric/change records and invalidate all affected snapshots. Publication never uses unvalidated input or stale generation.
- [ ] Run grade service and existing server tests; expected pass. Commit.

### Task 3: Consent, account binding and automatic lifecycle
**Files:** extension/grades-background.js, extension/grades-account.html/.js/.css, extension/grades-source.js, tests/grades-client.cjs, tests/grades-account.cjs.
**Interfaces:** runtime messages space:grades action open/state/preview/join/update/pause/resume/changePeriod/delete/export/import/results/tick. Only bundled account origin may mutate membership or export secrets; campus may tick/query state/results/open. create({browser,fetch,vault,now}) returns handle(message,sender). Vault contains secret, salt/account binding, selected period and recovery state; local storage only nonsensitive status. Source returns bounded fresh snapshot and local identity, background HMAC binds identity and never transmits email.
- [ ] Write tests for no consent no network/grade reads, independently revoked native permission, trusted account-only mutation, double-check identity, selected period, once/day unchanged heartbeat, changed upload, pause vs delete, key retention on failures, pending deletion restart, separate key format and no old backup changes.
- [ ] Run node --test tests/grades-client.cjs tests/grades-account.cjs; expected missing modules.
- [ ] Implement serialized state machine, pre-persist key/pending operation, CAS recovery with server revision and accepted digest; never replay old payload after account change. Delete has priority and cancellation generation; resume/changePeriod requires fresh preview/explicit consent. Expose self-only coarse results, never secrets to campus.
- [ ] Run task tests and XP client regressions; expected pass. Commit.

### Task 4: Campus integration, verification and dual release
**Files:** extension/grades-ui.js/.css, extension/site-panel.js, extension/popup.html, manifests/build adapter; tests/grades-ui.cjs; docs/PRIVACY.md, docs/RELEASE-2.1.md.
**Interfaces:** on grades/GPA page bind parser anchors to self-only coarse results; standalone Grades tab opens consent, displays privacy/status/help. Campus lifecycle tick starts only after stored consent; native cells untouched, injected nodes removed on logout/navigation. UI mounts through existing campus tokens and locale-neutral source model.
- [ ] Write tests for native data preserved, idempotent React updates, missing GPA, unknown work, empty/19-member state, no individual/student data, narrow layout, no synthetic click mutations. Run RED.
- [ ] Implement inline labels and compact controls; version/bundle both browsers, include separate account-page Chromium polyfill. Update privacy for exact server storage and account email processed only locally.
- [ ] Run full npm test, build both, Firefox lint, manifest/syntax checks, reproducibility from source archive; expected all meaningful checks pass. Desktop/narrow synthetic browser verification and one independent whole-branch review; fix important findings with failing regression tests.
- [ ] Apply additive grade schema and deploy backward-compatible Worker. Live synthetic API isolation/checks with disposable test namespace/records; no student enrollment. Update public policy and both store listings/packages/source; preserve existing IDs/settings. Record actual pending/approved status and evidence, commit and publish source.
