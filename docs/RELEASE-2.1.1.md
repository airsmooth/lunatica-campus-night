# Qairu Space 2.1.1

Fixes for the current campus UI (17 November 2026): announcement heading, badges and important border now use dark announcement tokens in all three palettes. Dark primary action buttons use a matched background/text pair instead of using the foreground-oriented cmp-navy token as a background. Turning the theme off removes these owned rules.

Course lists default to 12 through the campus select's ordinary change event, once per mounted pager on /ru/courses, /kk/courses and /en/courses. Other routes and selectors are untouched. Manual 24/48 remains possible for the current visit. No new permissions or storage changes; existing IDs and settings preserved.

Verification: three regression tests failed before implementation and passed after. Full suite 56/56; Firefox lint zero errors/warnings; both browser builds 2.1.1. Live campus native select change confirmed 12 cards; synthetic preview uses the observed campus CSS and production content scripts. No real grades enrolled or changed. Service deployment unchanged (2.1.0 remains compatible).

Store submissions and screenshots are recorded in the workspace outputs/qairu-space-2.1.1 release folder after upload. Approval and installation are separate from submission.
