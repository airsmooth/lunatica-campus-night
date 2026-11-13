---
name: Qairu Space — Lunatica campus integration
description: Compact study tools that inherit the QAIRU Campus interface.
colors:
  campus-blue: "#5aa9ff"
  accent: "#2f7fe8"
  link: "#7ab8ff"
  canvas: "#0c0c0f"
  card: "#18181d"
  main: "#131317"
  sunk: "#212128"
  line: "#2a2a32"
  line-strong: "#3b3b45"
  ink: "#ededf0"
  secondary-ink: "#dcdce2"
  muted-ink: "#a2a2ad"
  faint-ink: "#8b8b95"
  information: "#15243a"
  warning: "#e9b45a"
  danger: "#e9564c"
  warm-canvas: "#211e1a"
  warm-card: "#302b24"
  warm-ink: "#e3dbcc"
  midnight-canvas: "#0c0e12"
  midnight-card: "#171c24"
  midnight-ink: "#d5d9df"
typography:
  title:
    fontFamily: inherit
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.4
  section:
    fontFamily: inherit
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: inherit
    fontSize: 12px
    lineHeight: 1.5
  label:
    fontFamily: inherit
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
  metadata:
    fontFamily: inherit
    fontSize: 11px
    lineHeight: 1.45
rounded:
  card: 16px
  control: 12px
  meeting: 10px
  pill: 999px
spacing:
  compact: 8px
  control: 12px
  section: 16px
  column: 20px
components:
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: 6px 12px
  button-hover:
    backgroundColor: "{colors.main}"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: 10px 12px
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: 14px 20px
  meeting:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.meeting}"
    padding: 8px 10px 8px 12px
  exam-type:
    backgroundColor: "{colors.information}"
    textColor: "{colors.campus-blue}"
    rounded: "{rounded.pill}"
    padding: 0 8px
---

# Design System: Qairu Space

## Overview

**Creative North Star: "Follow the campus interface"**

Qairu Space preserves the QAIRU Campus interface and adds compact study controls. Lunatica by wateroff supplies integrated dark color mapping; native navigation, timetable geometry and inherited typography remain authoritative. The approved world is quiet, readable and practical, without a separate decorative dashboard.

This record is extracted from extension/lunatica-theme.js, scripts/build-theme.cjs, extension/site-panel.js, extension/ranking-ui.js, extension/ranking-account.css and extension/schedule-exams.css. Frontmatter describes default graphite colors, selected alternative-palette anchors and component shape fallbacks. Runtime campus variables take precedence.

**Key Characteristics:**

- Lunatica tonal surfaces, inherited type and thin separators.
- Compact controls and blue underline navigation.
- Native timetable geometry and explicit uncertainty.
- Responsive columns, accessible disclosures and a plain voluntary XP table.

## Colors

### Primary

Campus blue comes from `--cmp-blue` and marks links, selected tab underlines, focus and confirmed timetable card edges. The information surface uses `--cmp-info-bg` on exam-type pills and the current ranking row. Lunatica accent serves native accent controls and selection; its lighter link color appears on the separate ranking account page.

### Neutral

Card and main surfaces inherit `--cmp-surface-card` and `--cmp-surface-main`; separators inherit `--cmp-line`. Primary, secondary and muted text use `--cmp-ink-900`, `--cmp-ink-700` and `--cmp-ink-600`. Warning and danger retain their campus semantic roles for uncertain sessions and overdue work.

**The Campus Authority Rule.** Resolve on-site colors through the campus tokens before their documented defaults.

The companion popup retains its existing dark utility surface (`#181c22`), light text (`#e1e5e6`), muted text (`#a4afb9`), separator (`#343d47`) and accent (`#70b7ee`). These popup literals are not an on-site replacement palette.

Warm and midnight are existing alternative palettes, not separate brands. Their selected anchors are in frontmatter; complete values remain in `scripts/build-theme.cjs` and upstream Lunatica scales. Do not reconstruct complete palettes from these anchors. With dark mode inactive, injected theme styles are removed and native campus variables take over; component code retains light fallbacks. The separate ranking account page uses graphite canvas, card, line, ink, muted and link values.

## Typography

On-site text inherits the campus family, previously observed as Manrope. There is no display type role. The compact hierarchy uses the frontmatter title, section, body, label and metadata roles. Task and search-result links use 13px; the search field uses 14px. Times use tabular numerals.

Native meeting cards use a 12.5px/1.25 bold title, 12px time and 11px metadata. The popup keeps its existing system UI body family and 16px heading. The separate ranking account page uses 15px/1.6 system-ui body type, a 28px h1, 18px h2 and 13px hints. Companion utility type does not establish a new on-site display identity.

## Layout

The full-width summary has a header, wrapping five-tab navigation and a three-column overview (`1fr 1fr .85fr`) with 20px gutters and vertical separators. Container widths at or below 800px use two columns with favorites across the next row; at or below 520px use one column, 16px gaps, horizontal separators and 12px 16px shell padding. These are container queries, not viewport breakpoints.

Settings and search are capped at 720px. Lists scroll within compact bounds, but opening a personal note removes the deadline list's height cap so its Save controls remain reachable. Actions wrap. The timetable preserves campus day columns and time rows. The popup remains 400px wide with a 350px maximum main-content height and internal scrolling.

The ranking section is capped at 960px, with a 600px scroll region, wrapping actions and 13px table rows. At a 520px container width, table text becomes 12px, cell padding becomes 10px 4px and date metadata becomes 10px. Long pseudonyms wrap. The account form has a 720px maximum-width main area and 24px side padding; at a 480px viewport it uses 16px side padding and full-width action-group buttons.

## Elevation & Depth

The study panel, ranking rows and account sections are flat: surface color, thin borders and spacing establish grouping without shadows. Lunatica also preserves a subtle inset edge on existing native cards and defines native surface and overlay shadow tokens. Those native treatments do not authorize shadows on the study summary. Inner overview sections are not nested decorative cards. No decorative animation language is introduced; reduced-motion preferences remain supported. Exact native shadows are recorded in the sidecar.

## Shapes

The shell and controls inherit `--cmp-r-card` and `--cmp-r-ctl`. Timetable cards retain their fixed meeting radius and thin border with a 3px semantic left edge, matching the native campus lesson card. Exam-type pills are the established rounded exception. Ranking account buttons and fields use 10px corners.

## Components

### Buttons

Quiet outlined controls use a minimum height of 32px. Hover uses the main surface; disabled controls use half opacity. The collapse control is transparent. Keyboard focus is a 2px campus-blue outline with a 3px offset.

### Inputs / Fields

Search and personal-note fields use card surfaces, thin campus borders and control corners. Notes resize vertically. Settings use native checkbox/radio controls with campus-blue accent and separated rows. Visible labels stay associated with their inputs.

### Navigation

The five on-site tabs are Overview, Exams, XP Ranking, Search and Settings. Selection uses a 2px blue underline and stronger ink, with a thin baseline and no filled tab card. Tabs wrap on narrow containers. Existing collapse preference remains intact.

### Cards / Containers

The summary is titled «Учебная сводка». Tasks, favorites, search results, schedule changes and exam groups use separators and compact rows. Personal notes, change history and session-table management use disclosure controls instead of separate branded panels.

### Timetable exams

**The Native Meeting Rule.** Keep the native day/time geometry and semantic left border, including the warning-color edge for uncertain sessions.

Short uncertainty labels remain visible; full notes and source-PDF links are in accessible details disclosures. Exam-type pills use the information surface. The session manager identifies the selected session; headings must not assume the bundled month when users can load another table.

### XP ranking and account form

A plain four-column table shows place, pseudonym, XP and campus tier. Update dates sit beneath pseudonyms; the current participant uses the information tint. Actions wrap, status is announced and deletion requires confirmation. Tier names are text, not a new trophy or badge system. The account page presents explicit consent and management-key transfer with visible labels. Its text field is capped at 360px. Account buttons use a link-colored border on hover and .45 disabled opacity, with a 2px focus outline and 3px offset.

## Do's and Don'ts

### Do:

- **Do** inherit campus tokens and typography on site.
- **Do** label XP as participant-supplied and keep consent, update dates and deletion controls visible.
- **Do** preserve native timetable placement, existing preferences and collapse behavior.
- **Do** keep official assignment status distinct from personal progress and notes.
- **Do** verify light/dark states, narrow layouts, keyboard focus, source failures and SPA remounts.
- **Do** use synthetic preview data and keep preview assets out of extension packages.

### Don't:

- **Don't** add a separate dashboard brand, promotional headline, stars, glow or arbitrary external backgrounds.
- **Don't** add shadows or nested decorative feature cards to the native summary.
- **Don't** hide uncertainty or let a scrolling note editor make Save unreachable.
- **Don't** promote legacy eyebrow selectors or popup system typography into new display or kicker patterns.
