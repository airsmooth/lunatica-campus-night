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

Host access is limited to campus.qairu.edu.kz and the named ranking Worker. Firefox optional data transmission types: websiteContent (XP), authenticationInfo (random management key), personallyIdentifyingInfo (public chosen alias). Chromium disclosures retain site content and saved campus URLs, and add authentication information. The privacy statement describes what is local and what optional data reaches Cloudflare.

## Publication status

2.0.0 packages have not yet been submitted. This section must be updated after actual store submission; local build and deployment are not store approval.
