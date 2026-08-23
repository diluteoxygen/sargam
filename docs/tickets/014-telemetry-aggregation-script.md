---
status: open
depends_on: [012]
created: 2026-08-24
updated: 2026-08-24
---

# 014 -- Telemetry Aggregation Script for Song Metrics

## Context

Once ticket 012 is complete, `roundEvents` will accumulate in Firestore. This ticket builds the offline script that reads those events, computes per-song metrics, and outputs a report for human review.

This is the bridge between raw telemetry and actionable curation decisions. The script does not modify `songs.json` or the game's behavior -- it produces a recommendation file that a human reviewer uses to update suitability and difficulty tags manually.

Read before starting:
- `docs/song-curation/spec.md` sections 4 and 6 (telemetry requirements, human-in-the-loop decision)
- `docs/song-curation/domain-model.md` sections 2 and 3 (RoundEvent and SongMetrics schemas)
- `data/songs.json` (to cross-reference song metadata with computed metrics)

## Scope

**In scope:**

1. A Node.js script (`scripts/aggregate-song-metrics.js` or `.cjs`) that:
   - Reads all documents from the Firestore `roundEvents` collection.
   - Groups events by `songId`.
   - For each song with at least 30 events, computes the SongMetrics fields defined in `docs/song-curation/domain-model.md` section 3: `totalServes`, `winRate`, `lossRate`, `medianTierAtGuess`, `skipRate`, `lastUpdated`.
   - Outputs the results to `data/song-metrics.json` (a new file, not a modification of `songs.json`).
   - Prints a summary to stdout: total events processed, number of songs with sufficient data, and a list of songs flagged for review (lossRate > 0.60).

2. The script requires a Firebase service account key or admin credentials to read from Firestore. It is not run in the browser or by the game client.

**Out of scope:**
- Automatically updating `songs.json` based on metrics (that is the human reviewer's job)
- Building any UI for reviewing metrics
- Scheduling the script (manual invocation for now)
- Any changes to the game client

## Acceptance criteria

- [ ] The script reads from the `roundEvents` Firestore collection.
- [ ] `data/song-metrics.json` is produced with correct SongMetrics fields for every song with 30+ events.
- [ ] Songs with fewer than 30 events are excluded from the output (insufficient data).
- [ ] Songs with `lossRate > 0.60` are printed to stdout as flagged for review.
- [ ] The script completes without errors on an empty `roundEvents` collection (outputs an empty metrics file).
- [ ] No modifications to `songs.json`, the game client, or any production code.

## File pointers

- `scripts/aggregate-song-metrics.js` -- the new script
- `data/song-metrics.json` -- the new output file
- `docs/song-curation/domain-model.md` sections 2 and 3 -- input and output schemas
