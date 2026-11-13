# Qairu Space 2.1.0

Private grade and period GPA comparison, independent from the public XP beta. Same Firefox ID and Chrome item, unchanged existing storage/backup format. No enrollment without separate consent.

The service stores current exact values privately and exposes only the authenticated participant's coarse interval. At least 20 active contributors, outward ten-percent bands, ties spanning the complete group, twenty-place/count bands. Daily publication requires five distinct changed remaining contributors after the first snapshot. Deletion/expiry immediately invalidates affected snapshots. Current grade fingerprints prevent showing a result beside a changed score.

Consent belongs to one selected academic period. Automatic check at most daily while campus is open; unchanged successful collection sends heartbeat. Fresh ordinary campus HTML is read between two account checks. Corporate email is HMAC-bound locally, never uploaded. Grade keys use a separate extension-origin IndexedDB and separate transfer file with renewed consent. Pause and durable pending deletion are distinct.

## Source contract and limits

Observed campus routes: `/ru/grades?term=2026-2027~1`, `/ru/profile`. Native period selector establishes the `term` query; Russian grade/profile labels are required. Course codes and statuses, quiz UUID links, declared graded-work count and all-course filter are validated. Unknown assignment identifiers and multiple attempts for the same quiz are excluded, with a visible count. No fuzzy title matching between students.

GPA scale is confirmed by university document QAIRU-EDU-RUL-005, page 13, linked in the campus documents UI at `/api/storage/f1b89656-45bb-463f-af02-6905bfcdf2d6`. Only campus-supplied period GPA is read, never derived from percentages. Missing GPA remains missing. No real student's grades, HTML, profile or comments are included in fixtures.

Native extension installation is not implied by browser fixture verification. User enrollment is not part of testing. Values are self-reported, with no university or unique-identity verification.

## Build and deployment

Node 22.23.2; `npm ci`, `npm test`, `npm run build`, `node scripts/build-worker.cjs`. Add `server/grades-schema.sql` to the existing D1 database before deploying the backward-compatible Worker; no XP tables are changed. Existing daily cron also prunes/publishes grade snapshots. Mutation batches use a global generation guard to reject stale concurrent writes. Tombstones retain only revoked-token hashes to prevent delayed resurrection.

## Release status

Implementation and service deployment complete; both existing store items received 2.1.0 on 13 November 2026 and are awaiting review. Store approval, a signed Firefox XPI and installation on the user's device are not yet confirmed.

Firefox AMO version 6704362 / file 5248449: submitted, zero validation errors or warnings. Source archive attached; release/reviewer notes, listing and embedded privacy updated. Chrome item `akkedafgaegkaccceojhpelhamfkogpa`: package 2.1.0 verified and submitted with automatic publication after approval; listing, permission justifications and testing instructions updated. The previous pending 2.0 draft was replaced; the last observed public Chrome version was 1.2.2.

Source archive commit `8377d65`. Clean `npm ci` and rebuild reproduced Firefox's 47 files, Chromium's 56 files and the Worker byte-for-byte; all JavaScript syntax checks passed. Worker output normalizes LF for cross-platform reproducibility. Archives, SHA256SUMS, test/lint logs, decisions and store confirmation screenshots are in `outputs/qairu-space-2.1.0` in the main workspace (outside this repository). Source was fast-forwarded and pushed to main without rewriting history.

Additive D1 schema applied; Worker deployment `b5bc882fc3e14a16be0c270aa11a9c57`, health version 2.1.0. Existing `0 3 * * *` cron registration verified. Production synthetic checks verified 19-member suppression, publication at 20 with complete tie bands, idempotency/CAS, absence of a public grades table, immediate deletion invalidation and retired-key rejection. All synthetic grade members, metrics and results were deleted; XP population was unchanged. Publication ran against production D1 through an authorized adapter using the same algorithm; an actual scheduled cron firing was not observed. No real student's grades were enrolled.

Public privacy policy updated and read back: https://gist.github.com/airsmooth/609d5c62b74f0524b27857095d125238 .

## Verification and review

53 tests pass after an independent whole-branch review. Four Important findings were reproduced failing and fixed: imported period/account must match the consent preview; resume/import cannot overwrite a durable pause/deletion; missing GPA markup cannot remove prior contributions; Firefox deletion can request only key-transmission permission without renewing upload consent, preserving pending deletion even when declined. No Critical or deferred Minor findings were reported.

A further production-limit test reproduced excessive D1 queries for thirty metrics. Daily pruning, consistent reads and guarded publication now use three batches, with chunks of 1,000 results per bound JSON value. A concurrent deletion regression proves stale computed snapshots cannot be published. Publication refuses a truncated population above 100,000 active participant-metric rows; this is a beta capacity limit, not partial ranking.

Both browser builds pass; Firefox lint reports zero errors/warnings. Synthetic browser views checked desktop and 390px widths, unchanged native score text, disclosures, unchecked initial consent and local preview. No real grades were enrolled. These previews do not verify native Firefox installation or every live React/theme variant.

Review rulings: deployment/cron, public policy and both store submissions are separate operational checks below, not inferred from tests. Live source coverage is limited to verified Russian DOM and supported identities; other structures fail closed. Formal anonymity/anti-fabrication guarantees are outside this beta; copy states those limits. Deletion conservatively does not count as one of five changed remaining participants, which can delay a fresh snapshot. Retired-key hashes prevent delayed resurrection and are disclosed; they contain no grade values. The managed worktree is retained rather than removed outside the tool that owns it.
