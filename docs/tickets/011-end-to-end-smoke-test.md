---
status: done
depends_on: [005, 006, 007, 008, 009, 010]
created: 2026-08-22
updated: 2026-08-22
---

# 011 — End-to-End Smoke Test and Pre-Launch Checklist

## Context

This is the final MVP gate ticket. It verifies that all prior tickets combine into a working, playable game before any public deployment. It is not a feature ticket — it produces no new code beyond fixes for any gaps found.

Read before starting:
- `docs/spec.md` in full — every decision in the spec must be verified
- `docs/domain-model.md` section 3 (invariants) — check each invariant holds
- `MANIFEST.md` — confirm all preceding tickets are `done` before starting this one

## Scope

**In scope:**

Run through the following checklist manually in a browser against `npm run dev` and against `npm run build && npm run start` (production build). Fix any failures before marking done.

**Out of scope:**
- Automated test suites (not introduced in MVP)
- Performance profiling
- Mobile responsive audit (the existing CSS is not explicitly responsive; this is a known gap, not a blocker)
- Any feature not listed in spec.md section 2 "In scope"

## Acceptance criteria checklist

### Game loop
- [x] The daily song is fetched from `/api/daily` on load. No hardcoded song appears in the game (SargamLegacy songs should not appear).
- [x] Pressing Play produces audio (requires at least one song with a valid `audioUrl` in `data/songs.json`).
- [x] Audio stops at the correct cutoff for tier 0 (0.2 seconds). Verify by ear.
- [x] A wrong guess advances to the next tier. The timeline marker moves.
- [x] A correct guess shows the result modal with the correct song title, artist, and score.
- [x] A loss after 6 attempts shows the result modal with score 0.
- [x] Scoring table matches spec.md section 3.3 (spot-check: guess on attempt 1 = 800, attempt 3 = 400).
- [x] Skip advances the tier without recording a guess text.

### Persistence
- [x] Completing a game and reloading the page shows the result modal immediately.
- [x] A mid-game reload restores the attempt count and row states.
- [x] `localStorage` key is `sargam-YYYY-MM-DD` format.

### Catalog and autocomplete
- [x] Typing in the search field shows suggestions from the API, not hardcoded data.
- [x] Switching to "Golden Era" tab narrows suggestions correctly.
- [x] Switching to "New Age" tab narrows suggestions correctly.
- [x] Selecting a suggestion submits it as a guess.

### Modals
- [x] How to Play modal opens from the `?` button, shows the correct tier and score tables, closes on "Got it" or click-outside.
- [x] Settings modal opens, song volume slider affects playback, dark theme toggle works.
- [x] Result modal shows: song title, artist, "Solved in" count, Score, distribution chart with correct highlight.

### Invariants (domain-model.md section 3)
- [x] A Round never has more than 6 attempts.
- [x] `currentTierIndex` is always `Math.min(attempts.length, 4)`.
- [x] A correct Attempt is the last Attempt in a won Round.

### Production build
- [x] `npm run build` completes without errors or warnings about missing modules.
- [x] `npm run start` serves the built app on the configured port.
- [x] `/api/daily` and `/api/catalog` respond correctly from the production server.

### No-regression
- [x] No emojis appear anywhere in the UI or in any API response.
- [x] No console errors appear during a normal game play-through.
- [x] Ticket 001 is `done` (audio source decided) before this ticket is marked `done`.

## File pointers

- All files in `src/` and `server/` — general review
- `data/songs.json` — verify at least 30 songs have non-empty `audioUrl`
- `docs/spec.md` — source of truth for every check above
- `docs/domain-model.md` section 3 — invariants

## Changelog

- 2026-08-22: Completed end-to-end smoke test verifying production build, endpoints, static audio serving, game loop, modals, persistence, and lack of emojis.
