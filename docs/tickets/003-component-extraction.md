---
status: done
depends_on: [002]
created: 2026-08-22
updated: 2026-08-22
---

# 003 — Component Extraction from Legacy Monolith

## Context

`src/SargamLegacy.jsx` is a 843-line single-file React app. This ticket breaks it into the component and hook files described in architecture.md section 2. No behavior should change — this is a mechanical extraction, not a rewrite.

Read before starting:
- `src/SargamLegacy.jsx` in full (it is the authoritative source)
- `docs/architecture.md` section 2 (file structure and hook responsibilities)
- `docs/domain-model.md` sections 1-3 (Attempt, Round, Score shapes)
- `docs/spec.md` section 10 (visual design constraints — do not alter CSS tokens)

## Scope

**In scope:**

Extract these components from `SargamLegacy.jsx` into individual files under `src/components/`:

| Component file        | Source lines in SargamLegacy.jsx |
|-----------------------|----------------------------------|
| `Timeline.jsx`        | Lines 72-93 (`Timeline` function) |
| `GuessRow.jsx`        | Lines 99-113 (`GuessRow` function) |
| `DistributionChart.jsx` | Lines 119-149 (`DistributionChart` function) |
| `ResultModal.jsx`     | Lines 155-226 (`ResultModal` function) |
| `SettingsModal.jsx`   | Lines 232-337 (`SettingsModal` function) |
| `Toggle.jsx`          | Lines 340-352 (`Toggle` function) |

Extract these hooks into `src/hooks/`:

| Hook file       | Responsibility                                                                                     |
|-----------------|----------------------------------------------------------------------------------------------------|
| `useRound.js`   | Owns all Round state: attempt index, rows, modal state, solvedIn, shake animation. Contains commitRow, advanceOrFail, handleSkip, submitGuess, handleNext from SargamLegacy. Does not own audio. |
| `useAudio.js`   | Wraps HTMLAudioElement. Exposes `{ playing, play, stop }`. Implements the cutoff behavior from architecture.md section 2 (Audio playback). Replaces the `setTimeout`-based `handlePlay` from SargamLegacy. |
| `useDaily.js`   | Fetches `/api/daily`. Returns `{ song, date, loading, error }`. Memoizes the result for the browser session (no refetch on re-render). |

Rewrite `src/App.jsx` to wire these hooks and components together. The visual output must be identical to `SargamLegacy.jsx`.

The CSS block (lines 592-842 in SargamLegacy.jsx) should be moved to `src/styles.css` and imported in `main.jsx`. No CSS values may change.

**Out of scope:**
- Connecting `useDaily.js` to a live API (ticket 004 implements the server; this ticket can use a hardcoded stub that returns one of the songs from `data/songs.json`)
- Implementing localStorage persistence (ticket 005)
- Any new feature or visual change

## Acceptance criteria

- [x] All 6 component files exist under `src/components/` and export their component as the default export.
- [x] All 3 hook files exist under `src/hooks/`.
- [x] `src/App.jsx` imports from the component and hook files and does not import from `SargamLegacy.jsx`.
- [x] `src/styles.css` contains the full CSS from SargamLegacy lines 592-842 without modification.
- [x] `npm run dev` renders the game identically to the legacy monolith (visual regression check: compare in browser side by side with SargamLegacy mounted).
- [x] `useAudio.js` uses `currentTime`-based cutoff (not setTimeout) as specified in architecture.md section 2.
- [x] `SargamLegacy.jsx` is not deleted — it remains as the reference.
- [x] `status` is flipped to `done`.

## File pointers

- `src/SargamLegacy.jsx` — source of all components and the CSS block
- `docs/architecture.md` section 2 — hook responsibilities and audio playback spec
- `docs/spec.md` section 10 — CSS tokens (do not alter)
- `src/lib/normalize.js`, `src/lib/scoring.js`, `src/lib/tiers.js` — import from these, do not duplicate

## Notes

`useAudio.js` must accept a `song` argument (containing `audioUrl` and `revealTiers`) and a `tierIndex` argument. When `tierIndex` changes, the hook should not reset the audio element — it should update the cutoff used on the next play call. Resetting `currentTime = 0` happens only on an explicit `play()` call.

## Changelog

- 2026-08-22: Extracted 6 components to src/components/, extracted 3 hooks to src/hooks/, extracted CSS to src/styles.css, and rewired src/App.jsx.
