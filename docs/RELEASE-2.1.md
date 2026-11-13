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

Implementation in progress. Store submission, live service checks and final review must be recorded here before claiming release. Existing 2.0 store status is historical and does not imply 2.1 approval.

## Verification and review

53 tests pass after an independent whole-branch review. Four Important findings were reproduced failing and fixed: imported period/account must match the consent preview; resume/import cannot overwrite a durable pause/deletion; missing GPA markup cannot remove prior contributions; Firefox deletion can request only key-transmission permission without renewing upload consent, preserving pending deletion even when declined. No Critical or deferred Minor findings were reported.

A further production-limit test reproduced excessive D1 queries for thirty metrics. Daily pruning, consistent reads and guarded publication now use three batches, with chunks of 1,000 results per bound JSON value. A concurrent deletion regression proves stale computed snapshots cannot be published. Publication refuses a truncated population above 100,000 active participant-metric rows; this is a beta capacity limit, not partial ranking.

Both browser builds pass; Firefox lint reports zero errors/warnings. Synthetic browser views checked desktop and 390px widths, unchanged native score text, disclosures, unchecked initial consent and local preview. No real grades were enrolled. These previews do not verify native Firefox installation or every live React/theme variant.

Review rulings: deployment/cron, public policy and both store submissions are separate operational checks below, not inferred from tests. Live source coverage is limited to verified Russian DOM and supported identities; other structures fail closed. Formal anonymity/anti-fabrication guarantees are outside this beta; copy states those limits. Deletion conservatively does not count as one of five changed remaining participants, which can delay a fresh snapshot. Retired-key hashes prevent delayed resurrection and are disclosed; they contain no grade values. The managed worktree is retained rather than removed outside the tool that owns it.
