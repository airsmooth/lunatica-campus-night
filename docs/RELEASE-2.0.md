# Qairu Space 2.0.0

Lunatica theme by wateroff plus Campus Night study tools by airsmooth. Preserves Firefox ID, Chrome listing and all existing storage keys. Ordinary settings exports remain format `campus-night-settings` v2; imports v1/v2 remain supported. No automatic reset and no automatic leaderboard participation.

## Changes

- Replaces the Dark Reader engine with locally bundled Lunatica theme/color rules and three retained palettes.
- Preserves exams in the schedule grid, exam sessions, deadlines, personal notes/status, favorites, calendar export and schedule history.
- Adds a native on-site XP table. Equal XP has equal rank. Tiers use existing campus level thresholds.
- Explicit opt-in, manual XP refresh, deletion with retry, and separate private-key transfer page. Values are self-reported by the extension; no identity or university verification.

## Validation

Node regression tests include legacy import, notes, exam mapping/grid, schedule history, themes, XP parsing, API SQLite queries, consent, sender restrictions, failed-network recovery and account-tab routing. Browser preview uses synthetic data and native campus styles. Native Firefox installation and Chrome installation are separate from the DOM preview and must not be inferred from it.

## Store review notes

Campus pages require a university account. Reviewers should not be given user credentials. Test fixtures under tests contain synthetic HTML/data; they can reproduce parsing and storage behavior with `npm ci && npm test`. XP participation is optional and disabled until explicit confirmation. Source build: Node 22.23.2, `npm ci`, `npm run build`. Generated Firefox and Chromium packages share extension source. No remote JavaScript or analytics.

Host access is limited to campus.qairu.edu.kz and the named ranking Worker. Firefox optional data transmission types: websiteContent (XP), authenticationInfo (random management key), personallyIdentifyingInfo (public chosen alias). Chromium disclosures cover site content, saved campus URLs, identifying information, authentication information and location data (Cloudflare processes IP addresses; no GPS permission). The privacy statement describes what is local and what optional data reaches Cloudflare.

## Publication status

Submitted to both existing listings on 13 November 2026. This is pending moderation, not approval or public availability of 2.0.0.

- Firefox AMO: version 6703738, file 5247825, status awaiting review. Automated validation: 0 errors, 0 warnings. Source archive uploaded, release/reviewer notes saved, listing renamed Qairu Space, MIT license selected, privacy text and two synthetic screenshots updated. Version 1.4.0 became Mozilla-disabled when superseded by the newer pending submission. No signed 2.0.0 XPI has been downloaded.
- Chrome Web Store: existing item akkedafgaegkaccceojhpelhamfkogpa, draft package version 2.0.0 verified before submission. Google confirmed submission and status awaiting review; automatic publication after approval is selected. Description, screenshots, data declarations, permission justifications and reviewer instructions saved. Published package was still 1.2.2 at submission time.
- Source archive corresponds to commit aa3fe14. Later release-status documentation does not change packaged runtime. Release ZIPs, source ZIP, store screenshots and SHA256SUMS.txt are in the local outputs/qairu-space-2.0.0 directory outside this repository.
- Production XP service is deployed at https://qairu-space-xp.airsmooth.workers.dev. Synthetic join/update/ties/delete checks passed and synthetic records were deleted. No user XP was enrolled during testing.
- Public privacy policy: https://gist.github.com/airsmooth/609d5c62b74f0524b27857095d125238

## Verification and review decisions

- Full regression suite: 30 tests passed. Firefox web-ext lint: 0 errors/warnings. Both generated packages passed JavaScript syntax and manifest-reference checks. Rebuilding extracted source with pinned dependencies produced byte-identical generated files after LF normalization.
- Browser previews used synthetic data at desktop and narrow widths. Native Firefox/Chrome installation was not performed, so installed-browser behavior is not independently verified by those previews.
- Ordinary backup remains version 2 because no new appearance keys require migration. Future settings must explicitly extend the import allowlist.
- The management key uses extension-origin IndexedDB instead of content-script-readable storage.local. Its transfer uses a separate file; ordinary settings backup excludes it.
- Consent copy explicitly states that the public leaderboard API is readable outside the extension. Values are self-reported, with no identity or university verification.
- Important review findings were fixed with regression tests: synthetic page clicks cannot invoke authenticated mutations, account-page XP requests target a campus tab, and failed joins retain visible key-recovery controls.
- Unchanged 1.4 modules were checked at integration boundaries and by regression tests, not fully re-audited. Operational claims were separately checked against the live service/store interfaces.
- Known minor beta limit: beyond 10,050 participants, next-page navigation repeats the last accessible page. This is deferred; the production board was empty at release verification.
- The managed development worktree is retained with ignored verification artifacts; no user files or historical release artifacts were removed.
