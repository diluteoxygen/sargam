# Ticket Manifest

One line per ticket. Format: id | title | status | depends_on

---

001 | Audio Source Decision (Blocking) | done | —
002 | Repo Scaffold and Song Catalog | done | —
003 | Component Extraction from Legacy Monolith | done | 002
004 | Express API (Daily Endpoint and Catalog Endpoint) | done | 002
005 | Local State Persistence | done | 003, 004
006 | Live Audio Playback | done | 003, 001
007 | Catalog Autocomplete Wire-Up | done | 003, 004
008 | Scoring Display and Result Modal | done | 003, 005
009 | How to Play Modal | done | 003
010 | Expand Song Catalog | done | 002, 001
011 | End-to-End Smoke Test and Pre-Launch Checklist | done | 005, 006, 007, 008, 009, 010
012 | Instrument Per-Round Telemetry to Firestore | done | —
013 | Add Suitability Field and Heuristic Screening Pass | done | —
014 | Telemetry Aggregation Script for Song Metrics | done | 012
015 | Telemetry-Informed Suitability Review Process | done | 013, 014
016 | Highlight Clip and CDN | open | 013

---

## Dependency graph

```
001 (audio source — blocking for 006, 010)
002 (scaffold — unblocks everything)
  -> 003 (component extraction)
       -> 005 (persistence) -> 008 (scoring modal)
       -> 006 (audio playback) [also needs 001]
       -> 007 (autocomplete) [also needs 004]
       -> 009 (how to play modal)
  -> 004 (express api)
       -> 005
       -> 007
  -> 010 (catalog expansion) [also needs 001]
  -> all of above -> 011 (smoke test)

--- Song Curation ---

012 (round telemetry) [no blockers]
013 (suitability field + screening) [no blockers]
  012 -> 014 (aggregation script)
  013 + 014 -> 015 (telemetry-informed review)
  013 -> 016 (highlight clip and CDN)
```

## Execution notes

- 001 and 002 can start immediately and in parallel.
- 003 and 004 can start as soon as 002 is done (and in parallel with each other).
- 001 blocks 006 and 010 from being fully completed but does not block them from being started with placeholder audio.
- 011 is the MVP go/no-go gate. Do not open a public URL until 011 is done.
- 012 and 013 can start immediately and in parallel. Neither depends on any prior ticket.
- 014 depends only on 012 (it needs the roundEvents collection to exist).
- 015 depends on both 013 (suitability tags must exist to review) and 014 (metrics must be computable to inform the review). It is a process ticket, not a code ticket.
- 016 depends on 013 for the onsetSeconds / startTime values used as clip start points. It can be started as soon as 013 is done.
- 012 should be prioritized: every day without telemetry is a day of lost signal.
