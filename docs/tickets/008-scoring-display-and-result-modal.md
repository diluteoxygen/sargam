---
status: done
depends_on: [003, 005]
created: 2026-08-22
updated: 2026-08-22
---

# 008 — Scoring Display and Result Modal

## Context

The result modal in `sargam.jsx` shows "Solved in" and "Average" stats but does not yet display the Score from the canonical table. This ticket adds the score field to the modal and wires all modal data to real Round state.

Read before starting:
- `docs/spec.md` section 3.3 (canonical scoring table)
- `docs/domain-model.md` section 1 (Round.score, Round.status, Round.attempts)
- `src/components/ResultModal.jsx` (created by ticket 003)
- `src/hooks/useRound.js` and localStorage state (ticket 005)
- `src/lib/scoring.js` (ticket 002)

## Scope

**In scope:**

1. Add a "Score" stat box to `ResultModal.jsx` alongside the existing "Solved in" and "Average" boxes. The score value comes from `Round.score` (computed and stored by `useRound.js`). For a loss, show `0`.

2. The "Average" stat box currently shows a hardcoded `3.6`. For MVP this remains hardcoded (server-side aggregation is out of scope). Add a comment in the component marking it as a placeholder.

3. The percentile line currently shows hardcoded values from `PERCENTILES` in SargamLegacy. For MVP this remains hardcoded. Add a comment marking it as a placeholder. Do not compute it from real data.

4. The distribution chart (`DistributionChart.jsx`) uses the hardcoded `DISTRIBUTION` array. For MVP this remains static. Add a comment. The `highlight` prop must be wired to the actual attempt index (1-based) at which the player won, or `"X"` for a loss — this is already wired correctly in the legacy code but must be verified in the extracted version.

5. The "The song was" section must show `song.title` and `song.artist` from the daily song (not hardcoded). Verify this is correctly threaded from `useDaily` through `useRound` to `ResultModal`.

6. The modal banner color: gold (`--gold`) for win, red (`--red`) for loss — already in the CSS, just verify it is correctly applied in the extracted component.

**Out of scope:**
- Share button behavior (present but inert per spec.md section 2)
- Real average and distribution stats from server
- Real percentile calculation
- The mini-player in the modal (remains static/decorative for MVP)

## Acceptance criteria

- [x] A "Score" box is visible in the result modal for both win and loss outcomes.
- [x] Score value matches the canonical table in spec.md section 3.3 (e.g. guess on attempt 0 = 1000, guess on attempt 2 = 600, loss = 0).
- [x] "Solved in" shows the correct 1-based attempt number (not 0-based).
- [x] Song title and artist in the modal match the actual daily song from the API.
- [x] Distribution chart highlights the correct row for the player's result.
- [x] The hardcoded "Average" and percentile values have a `// placeholder` comment in the source.
- [x] `status` is flipped to `done`.

## File pointers

- `src/components/ResultModal.jsx` — modify this file
- `src/lib/scoring.js` — import for score computation (do not inline the table)
- `src/hooks/useRound.js` — where score is stored
- `docs/spec.md` section 3.3 — canonical scoring table
- `src/SargamLegacy.jsx` lines 155-226 — original modal for reference

## Changelog

- 2026-08-22: Added canonical Score box to ResultModal.jsx, verified round score binding and comments for placeholder average/percentile.
