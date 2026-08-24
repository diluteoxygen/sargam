---
status: done
depends_on: []
created: 2026-08-24
updated: 2026-08-24
---

# 012 -- Instrument Per-Round Telemetry to Firestore

## Context

The game currently logs zero per-song outcome data. All statistics in `src/lib/stats.js` are aggregate per-mode (total games, win rate, distribution by attempt index). There is no record of which song was played in a given round, what tier the correct guess happened at, or how many times a player skipped before guessing or giving up.

This is the single most important prerequisite for evidence-based song curation (see `docs/song-curation/spec.md` section 4). Without per-song telemetry, the project cannot move beyond manual/heuristic curation decisions. Every day of delay is a day of lost signal.

Read before starting:
- `docs/song-curation/spec.md` section 4 (telemetry requirements -- field schema)
- `docs/song-curation/domain-model.md` section 2 (RoundEvent entity)
- `src/hooks/useRound.js` (the round-completion logic where the write must be triggered)
- `src/lib/sync.js` (existing Firestore write patterns)

## Scope

**In scope:**

1. On every round completion (win or loss), write a RoundEvent document to a Firestore collection named `roundEvents`. The document contains the fields defined in `docs/song-curation/domain-model.md` section 2: `songId`, `mode`, `date`, `outcome`, `attemptCount`, `tierAtGuess`, `skips`, `timestamp`.

2. The write must be fire-and-forget: it must not block the UI, must not display errors to the player if it fails (network issues, Firestore quota), and must not retry. A lost event is acceptable; a degraded player experience is not.

3. No user ID or identifying information in the event. This is anonymous telemetry.

4. Firestore security rules must allow unauthenticated writes to the `roundEvents` collection (since guests play without signing in). The rules must be append-only: clients can create documents but not read, update, or delete them.

**Out of scope:**
- Reading or aggregating the telemetry (ticket 014)
- Any UI changes
- Modifying the existing `stats.js` aggregate tracking
- Rate limiting or abuse prevention (acceptable risk at current scale)

## Acceptance criteria

- [x] On a completed round (win or loss), a document appears in the Firestore `roundEvents` collection.
- [x] The document contains all 8 fields from the RoundEvent schema with correct types.
- [x] `tierAtGuess` is `null` when `outcome` is `"lost"`.
- [x] `skips` accurately counts the number of skip actions in the round.
- [x] A failed Firestore write does not produce a visible error or affect gameplay.
- [x] Firestore security rules for `roundEvents` allow create-only, no read/update/delete from clients.
- [x] No user-identifying information is included in the event.

## File pointers

- `src/hooks/useRound.js` -- add the telemetry write at round-completion
- `src/lib/sync.js` -- reference for existing Firestore write patterns
- `firestore.rules` -- update security rules for the new collection
- `docs/song-curation/domain-model.md` section 2 -- RoundEvent schema

## Changelog

- 2026-08-24: Implemented `src/lib/telemetry.js` and wired it into `useRound.js` for fire-and-forget telemetry. Updated `firestore.rules` for append-only `roundEvents`.

