# XP service deployment

The extension pins `https://qairu-space-xp.airsmooth.workers.dev`. Cloudflare account `1aafac4c4ba2bc1b373e36bbd31ab82b`; existing Free plan verified in the account UI on 2026-11-13. No subscription upgrade. New isolated D1 database `qairu-space-xp`, EEUR, replication disabled. IDs in `server/deployment.json` are resource identifiers, not credentials.

1. Run `node scripts/build-worker.cjs` to produce `dist/worker.mjs` from the shared XP model and Worker entrypoint.
2. Apply `server/schema.sql` using `POST /accounts/{account}/d1/database/{database}/query` with `{ "sql": "..." }`. Schema creation is idempotent.
3. Upload using `PUT /accounts/{account}/workers/scripts/qairu-space-xp`, multipart form: `metadata` JSON from `server/deployment.json` excluding `script_name` and top-level `database_id`; module part `worker.mjs` with MIME `application/javascript+module`.
4. `POST .../workers/scripts/qairu-space-xp/subdomain` with `{ "enabled": true, "previews_enabled": false }`.
5. `PUT .../workers/scripts/qairu-space-xp/schedules` with `[{ "cron": "0 3 * * *" }]`.

Deployment performed through the authorized Cloudflare connector. No API token is stored in this repository. Use the same service name to update; do not replace the database. Disable the subdomain to take the beta offline while preserving records for recovery. Protect D1 access through the Cloudflare account.

The rate limiter allows 240 API requests/minute/IP per Cloudflare location; hashed IP is a transient limiter key. It is an abuse throttle, not identity verification or a global hard cap. Free account quotas are shared with other Workers. When quotas are exhausted the beta can become unavailable; local study functions remain available.

Full invocation logs and Logpush are disabled. Logs and traces have 1% sampling; application code never logs bodies, bearer tokens or campus data. D1 retains only a bearer SHA-256 hash, random row ID, alias, XP and timestamp. 90-day inactive rows are excluded from every view and pruned daily. D1 Time Travel follows the Free plan's retention; consult current Cloudflare documentation before changing the plan or privacy statement.

Live synthetic health/join/idempotency/equal-rank/decrease/delete checks passed 2026-11-13. Both test records were deleted and authenticated reads then returned 404. No real student's XP was sent.
