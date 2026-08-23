---
status: open
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

2. Perform the heuristic screening pass on the 135 `"review"` songs:
   - Listen to the first 5 seconds of each song's audio file.
   - Reclassify each as `"suitable"` (the clip is identifiable to a casual listener), `"unsuitable"` (the clip is not identifiable), or leave as `"review"` (genuinely borderline).
   - Follow the representative-player calibration principle from `docs/song-curation/spec.md` section 2: when uncertain, mark `"review"` or `"unsuitable"`, not `"suitable"`.

3. Spot-check 30-40 randomly sampled songs from the 210 that have difficulty tags, focused on whether the first 5 seconds is actually identifiable. Reclassify any that fail.

4. Update song selection logic in `src/hooks/useDaily.js` to exclude songs where `suitability === "unsuitable"` from the active pool. Songs where `suitability` is absent should be treated as `"suitable"` (backward compatibility, per domain model invariant 8).

**Out of scope:**
- Changing the `difficulty` field values (those are preserved as-is)
- Building any admin UI for the screening process
- Telemetry-based reclassification (ticket 014)
- Any changes to the search catalog (`data/search_catalog.json`) -- unsuitable songs may remain searchable as red herrings

## Acceptance criteria

- [ ] Every song in `data/songs.json` has a `suitability` field with value `"suitable"`, `"unsuitable"`, or `"review"`.
- [ ] No song with `suitability: "unsuitable"` is served in daily, all-songs, or trending modes.
- [ ] Songs without a `suitability` field (if any remain in edge cases) are treated as `"suitable"` by the selection logic.
- [ ] The existing `difficulty` field is unchanged on all songs.
- [ ] JSON is valid after modifications.

## File pointers

- `data/songs.json` -- the file to modify
- `src/hooks/useDaily.js` -- song selection logic to update
- `docs/song-curation/spec.md` -- source of truth for the screening criteria
- `docs/song-curation/domain-model.md` section 1 -- field schema and invariants
