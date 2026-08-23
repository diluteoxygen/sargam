---
status: open
depends_on: [013, 014]
created: 2026-08-24
updated: 2026-08-24
---

# 015 -- Telemetry-Informed Suitability Review Process

## Context

This ticket is the Phase 2 capstone: using accumulated telemetry (from ticket 012) and computed metrics (from ticket 014) to validate or override the heuristic suitability tags applied in ticket 013.

This is deliberately not a code ticket. It is a process ticket that documents when and how the human reviewer should run the aggregation script, interpret the output, and update `songs.json`.

Read before starting:
- `docs/song-curation/spec.md` sections 3.2 and 6 (measurable bar, human-in-the-loop)
- `docs/song-curation/domain-model.md` section 3 (SongMetrics)
- `data/song-metrics.json` (output of ticket 014's script)

## Scope

**In scope:**

1. Document a repeatable review process:
   - Run `scripts/aggregate-song-metrics.js` (or `.cjs`).
   - Open `data/song-metrics.json`.
   - For each song flagged (lossRate > 0.60 and totalServes >= 30):
     - If currently `suitability: "suitable"` or `"review"`: investigate. Listen to the first 5 seconds. If the loss rate is explained by the clip being genuinely unrecognizable, reclassify to `"unsuitable"`. If the loss rate seems anomalous (e.g., the song is recognizable but was disproportionately served to beginners), leave as-is and note for re-review at next aggregation.
   - For each song currently `"review"` that is NOT flagged (lossRate <= 0.60 and totalServes >= 30):
     - Promote to `"suitable"`. The telemetry confirms the heuristic uncertainty was unwarranted.
   - For each song currently `"unsuitable"` with totalServes >= 30 and lossRate <= 0.40:
     - Consider promotion to `"suitable"`. The heuristic may have been overly conservative.

2. After updates, commit the modified `songs.json` and redeploy.

**Out of scope:**
- Automating the reclassification (Phase 3 concern, only relevant at 500+ DAU)
- Modifying the aggregation script
- Any game client changes

## Acceptance criteria

- [ ] A written review process exists (this ticket's description serves as the process document).
- [ ] The process has been executed at least once with real telemetry data (even if no reclassifications result, the execution itself validates the workflow).
- [ ] Any reclassifications are committed to `data/songs.json` with a commit message referencing this ticket.

## File pointers

- `data/song-metrics.json` -- input to the review
- `data/songs.json` -- file to update based on review
- `docs/song-curation/spec.md` section 3.2 -- the suitability threshold definition
