---
status: done
depends_on: [003, 004]
created: 2026-08-22
updated: 2026-08-22
---

# 005 — Local State Persistence

## Context

Players must not lose their progress on a page reload. The current game state is held only in React state; this ticket wires `localStorage` persistence to the Round lifecycle.

Read before starting:
- `docs/spec.md` section 8 (persistence spec)
- `docs/domain-model.md` section 1 (Round fields), section 4 (lifecycle)
- `src/hooks/useRound.js` (created by ticket 003) — this is where persistence lives

## Scope

**In scope:**

Modify `useRound.js` to:

1. Accept `date` and `songId` as arguments (these come from `useDaily`).

2. On mount, read `localStorage.getItem(`sargam-${date}`)`. If it parses to a valid Round object with matching `songId`, restore state from it. A valid stored Round has: `songId`, `date`, `attempts` array, `status` string, and `score` number.

3. After every state-changing action (guess submit, skip, game over), write the current Round to `localStorage.setItem(`sargam-${date}`, JSON.stringify(round))`.

4. If the stored Round's `status` is `"won"` or `"lost"`, set the modal state to `"win"` or `"loss"` respectively on mount so the result modal opens immediately.

5. If the stored Round's `songId` does not match today's `songId` (i.e. the stored date key matched but the song rotated — this should not happen in normal operation but guard against it), discard the stored state and start fresh.

The `score` field on the stored Round is computed using the canonical table from spec.md section 3.3:
```
[1000, 800, 600, 400, 200, 100][attemptIndexOfCorrectGuess] or 0
```
Use `src/lib/scoring.js` (created by ticket 002) — do not inline the table.

**Out of scope:**
- Any server-side persistence
- Sharing or exporting the round result
- Handling multiple past days' history

## Acceptance criteria

- [x] Completing a game (win or loss), reloading the page, and opening the app again shows the result modal immediately with the correct state.
- [x] The `localStorage` key format is `sargam-YYYY-MM-DD` where the date matches the server-returned `DailyEntry.date`.
- [x] The stored JSON contains `songId`, `date`, `attempts`, `status`, and `score`.
- [x] Score is read from `src/lib/scoring.js` — the constant is not duplicated.
- [x] A mid-game reload (e.g. 3 guesses made, not yet won or lost) restores the correct attempt count, row states, and tier index without showing the result modal.
- [x] `status` is flipped to `done`.

## File pointers

- `src/hooks/useRound.js` — modify this file
- `src/lib/scoring.js` — import scoring table from here
- `docs/spec.md` section 8 — persistence spec
- `docs/spec.md` section 3.3 — scoring table
- `docs/domain-model.md` section 1 (Round), section 4 (lifecycle)

## Changelog

- 2026-08-22: Added localStorage round persistence and recovery to useRound.js using sargam-YYYY-MM-DD key format and canonical scoring.
