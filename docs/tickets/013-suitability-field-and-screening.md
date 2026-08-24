---
status: done
depends_on: []
created: 2026-08-24
updated: 2026-08-24
---

# 013 -- Add Suitability Field and Heuristic Screening Pass

## Context

The song catalog (`data/songs.json`) currently has 345 songs with no suitability gate. Every song in the file can be served to players, including songs whose opening seconds are generic instrumental filler, crowd noise, or otherwise unidentifiable to a casual listener. The `difficulty` tag exists on 210 songs but conflates two separate problems: "how short a clip is needed" (difficulty) and "can this song be recognized at all" (suitability).

This ticket adds the `suitability` field to the Song schema and performs the initial heuristic screening pass described in `docs/song-curation/spec.md` sections 3 and 5.

Read before starting:
- `docs/song-curation/spec.md` sections 3 and 5 (suitability gate definition, migration plan)
- `docs/song-curation/domain-model.md` section 1 (new fields on Song, invariants 7-9)
- `data/songs.json` (the file to modify)
- `src/hooks/useDaily.js` (song selection logic that must respect suitability)

## Scope

**In scope:**

1. Add a `suitability` field to every song in `data/songs.json`:
   - Songs that already have a `difficulty` tag: default to `"suitable"` (they were manually reviewed at some point).
   - Songs without a `difficulty` tag (currently 135): default to `"review"`.

2. Perform the heuristic screening pass on all songs using automated onset detection:
   - Compute an `onsetSeconds` value per song: the point at which sustained musical material begins, distinct from leading silence, ambient pad, or dialogue/SFX that a casual listener cannot identify a song from.
   - Method: windowed RMS energy analysis via ffmpeg over the first 15 seconds of each track. Threshold is relative to that track's own overall RMS (not a fixed absolute dB value), so the gate adapts to varying loudness across the catalog. Starting parameters: 0.5s windows, 0.1s scan step, onset = first window at or above 40% of the track's overall RMS. These parameters are tunable if the resulting distribution looks degenerate; one iteration of tuning is acceptable, not more.
   - Implementation: `scripts/compute_onset_rms.py`
   - Output: `onsetSeconds` stored in the existing `startTime` field of `songs.json` (that field is already consumed by `useAudio.js` as the play-start offset; adding a separate `onsetSeconds` field would duplicate it with no benefit).
   - Suitability decision: if `onsetSeconds` exceeds the 7-second reveal cap, flag the song `"provisional_unsuitable"`. If `onsetSeconds` is within the cap, the song passes the gate.

3. `"provisional_unsuitable"` is a distinct status from the telemetry-confirmed `"unsuitable"`. The data model must represent them separately:
   - Songs flagged by the heuristic are set to `suitability: "provisional_unsuitable"` in `songs.json`.
   - Songs confirmed unsuitable by telemetry review (ticket 015) are set to `suitability: "unsuitable"`.
   - Song selection logic excludes both `"provisional_unsuitable"` and `"unsuitable"` from the active pool.
   - The statuses must not collapse into a single field value; the distinction tracks provenance (coarse heuristic vs. gameplay evidence).

4. Update song selection logic in `src/hooks/useDaily.js` to exclude songs where `suitability === "unsuitable"` or `suitability === "provisional_unsuitable"` from the active pool. Songs where `suitability` is absent are treated as `"suitable"` (backward compatibility, per domain model invariant 8).

**Out of scope:**
- Changing the `difficulty` field values (those are preserved as-is)
- Building any admin UI for the screening process
- Telemetry-based reclassification (ticket 014)
- Any changes to the search catalog (`data/search_catalog.json`) -- unsuitable songs may remain searchable as red herrings

## Acceptance criteria

- [x] Every song in `data/songs.json` has a `suitability` field with value `"suitable"`, `"review"`, `"provisional_unsuitable"`, or `"unsuitable"`.
- [x] `startTime` in `data/songs.json` reflects RMS-based onset values computed by `scripts/compute_onset_rms.py` (not the prior silencedetect values).
- [x] Onset distribution checkpoint passes: not nearly all songs and not nearly zero songs are flagged (distribution reported in changelog below).
- [x] No song with `suitability: "unsuitable"` or `suitability: "provisional_unsuitable"` is served in daily, all-songs, or trending modes.
- [x] Songs without a `suitability` field (if any remain in edge cases) are treated as `"suitable"` by the selection logic.
- [x] The existing `difficulty` field is unchanged on all songs.
- [x] JSON is valid after modifications.
- [x] `data/onset_distribution.json` exists with the checkpoint report.

## File pointers

- `data/songs.json` -- the file to modify
- `src/hooks/useDaily.js` -- song selection logic to update
- `scripts/compute_onset_rms.py` -- the new onset detection script
- `data/onset_distribution.json` -- checkpoint report output
- `docs/song-curation/spec.md` -- source of truth for the screening criteria
- `docs/song-curation/domain-model.md` section 1 -- field schema and invariants

## Changelog

- 2026-08-24: Ticket drafted with "manual listening pass" acceptance criterion.
- 2026-08-24: Criterion corrected. Original ticket required a manual listening pass as the screening mechanism; this contradicts `docs/song-curation/spec.md`'s phased hybrid design, which mandates a heuristic gate for cold start (not a permanent manual process). The manual-listening language was a drafting inconsistency introduced during ticket decomposition, not a considered requirement. Replaced with automated RMS-based onset detection via ffmpeg. See resolution prompt for the full decision rationale.
- 2026-08-24: Implemented `scripts/compute_onset_rms.py`, updated `data/songs.json` with RMS-based `startTime` values and `suitability` field, updated `useDaily.js` suitability filter. Status set to done.
