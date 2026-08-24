# Song Curation — Domain Model Addendum

**Date:** 2026-08-24
**Status:** Draft
**Extends:** `docs/domain-model.md`

This document extends the existing domain model with concepts introduced by the song curation spec (`docs/song-curation/spec.md`). It does not redefine Song, Round, Attempt, RevealTier, or Score -- those remain as defined in `docs/domain-model.md`. This is an addendum, not a replacement.

The addendum format was chosen (rather than modifying the existing domain-model.md inline) because the curation concepts are a distinct concern from the core game loop. The existing domain model governs "how a round plays out." This addendum governs "which songs are eligible to be played and how they are classified." Keeping them separate reduces the risk of accidental edits to locked-in game-loop decisions.

---

## 1. New fields on Song

The Song entity (defined in `docs/domain-model.md` section 1) gains new optional fields:

| Field           | Type                                                                               | Notes |
|-----------------|------------------------------------------------------------------------------------|-------|
| `suitability`   | `"suitable"` / `"unsuitable"` / `"provisional_unsuitable"` / `"review"`           | Whether this song belongs in the active play pool. Default: `"suitable"` if omitted (backward compatibility). |
| `startTime`     | number (seconds)                                                                   | Onset time: the point at which sustained musical material begins, computed by `scripts/compute_onset_rms.py`. Also serves as the audio play-start offset in `useAudio.js`. Named `startTime` in `songs.json` to match the existing field already consumed by the audio hook; the domain concept is `onsetSeconds`. |
| `difficulty`    | `"super-easy"` / `"easy"` / `"hard"` / null                                       | Already exists on some songs. Retained as-is. Governs adaptive matchmaking in `useDaily.js`. No schema change needed, but this field is now formally part of the domain model rather than an ad-hoc tag. |

### Suitability semantics

- `"suitable"`: the song is eligible to be served in any mode. It has passed either the heuristic screening gate (Phase 1) or the telemetry-informed review (Phase 2+).
- `"unsuitable"`: the song is excluded from the active play pool. Confirmed by telemetry review (ticket 015). The song remains in `songs.json` for record-keeping and potential re-review.
- `"provisional_unsuitable"`: the song is excluded from the active play pool on the basis of the heuristic alone — specifically, `startTime > 7s` (the reveal cap). This is a coarse guess, not a confirmed finding. It is visibly distinct from `"unsuitable"` so the provenance is preserved. Promotion to `"suitable"` after telemetry confirms recognizability is expected for some of these.
- `"review"`: the song is provisionally included in the active pool but is flagged for priority review once telemetry data is available. Functionally treated as `suitable` for song selection purposes, but tracked separately for curation workflows.

### Invariants (extending domain-model.md section 3)

7. A Song with `suitability === "unsuitable"` or `suitability === "provisional_unsuitable"` must not be served in any game mode.
8. If `suitability` is absent from a Song record, it is treated as `"suitable"` (backward compatibility).
9. `difficulty` and `suitability` are independent axes. A song can be `suitable` and `hard`, or `unsuitable` regardless of difficulty. Difficulty is only meaningful for songs that pass the suitability gate.
10. `"provisional_unsuitable"` and `"unsuitable"` must remain as distinct field values. A heuristic flag and a telemetry-confirmed flag must not collapse into the same status.


---

## 2. New entity: RoundEvent

A telemetry record written on every round completion. RoundEvents are write-only from the game client's perspective. They are consumed by an offline aggregation script, never read during gameplay.

| Field            | Type          | Notes |
|------------------|---------------|-------|
| `songId`         | string        | The Song's `id`. |
| `mode`           | string        | `"daily"`, `"all"`, or `"trending"`. |
| `date`           | string        | UTC date string (e.g., `"2026-08-24"`). |
| `outcome`        | `"won"` / `"lost"` | Whether the player guessed correctly in any attempt. |
| `attemptCount`   | number        | Total attempts used (1-6). |
| `tierAtGuess`    | number / null | Tier index (0-4) at which the correct guess was made. `null` if `outcome === "lost"`. |
| `skips`          | number        | Number of skip actions in the round. |
| `timestamp`      | number        | Unix timestamp in milliseconds (`Date.now()`). |

### Storage

RoundEvents are appended to a Firestore collection named `roundEvents`. Each document is an auto-ID document containing the fields above. No indexes are required for MVP (the aggregation script reads the full collection).

### Privacy

RoundEvents are anonymous. No user ID, device ID, IP address, or any other identifying information is included. The event records what happened to a song, not who did it.

### Invariants

10. A RoundEvent is created exactly once per round completion. It is not created for abandoned rounds (page closed mid-game).
11. `tierAtGuess` is `null` if and only if `outcome === "lost"`.
12. `attemptCount` is between 1 and 6 inclusive.
13. `skips` is between 0 and `attemptCount` inclusive.

---

## 3. New value object: SongMetrics

A derived aggregate computed by the offline aggregation script from accumulated RoundEvents. Not stored in `songs.json` or in the game client. Stored either in a separate JSON file (`data/song-metrics.json`) or in a Firestore collection, at the implementer's discretion.

| Field                  | Type   | Notes |
|------------------------|--------|-------|
| `songId`               | string | The Song's `id`. |
| `totalServes`          | number | Total RoundEvents for this song. |
| `winRate`              | number | Fraction of serves with `outcome === "won"` (0.0 to 1.0). |
| `lossRate`             | number | `1.0 - winRate`. The primary suitability signal. |
| `medianTierAtGuess`    | number | Median `tierAtGuess` across winning rounds. The primary difficulty signal. |
| `skipRate`             | number | Average `skips / attemptCount` across all rounds. A secondary signal for player frustration. |
| `lastUpdated`          | string | ISO timestamp of the last aggregation run. |

### Usage

SongMetrics are consumed by a human reviewer (Phase 2) or by an automated script with human override (Phase 3). They are never consumed by the game client during gameplay.

---

## 4. Lifecycle (extending domain-model.md section 4)

The existing lifecycle in `docs/domain-model.md` section 4 describes the game loop. The curation lifecycle runs alongside it:

```
Song enters songs.json (via ingestion script or manual addition)
  -> suitability defaults to "review" (new songs) or "suitable" (if migrated with a difficulty tag)
  -> Song is served in game rounds
  -> On round completion: RoundEvent is written to Firestore
  -> Periodically: aggregation script reads RoundEvents, computes SongMetrics
  -> Human reviewer inspects SongMetrics for songs with lossRate > 0.60 and totalServes >= 30
     -> If confirmed unsuitable: update suitability to "unsuitable" in songs.json
     -> If borderline: leave as "review" for more data
     -> If data contradicts heuristic tag: update suitability to "suitable"
```

This lifecycle does not interfere with the game loop. The game reads `suitability` at song-selection time and ignores `unsuitable` songs. Everything else in the round proceeds exactly as defined in the existing domain model.
