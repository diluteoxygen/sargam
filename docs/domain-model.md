# Sargam — Domain Model

**Version:** 1.0  
**Date:** 2026-08-22

This document establishes the canonical vocabulary for the Sargam codebase. Every other document and every ticket uses these terms exactly. Where a concept appears in `sargam.jsx` under a different name, the mapping is noted.

---

## 1. Entities

### Song

The atomic catalog item. A Song represents one Bollywood/Hindi recording.

| Field            | Type               | Notes                                                            |
|------------------|--------------------|------------------------------------------------------------------|
| `id`             | string             | Stable, URL-safe identifier (e.g. `tum-hi-ho`). Assigned at catalog build time. |
| `title`          | string             | Display title used for matching (e.g. "Tum Hi Ho").             |
| `artist`         | string             | Primary artist (e.g. "Arijit Singh").                           |
| `movie`          | string             | Film/album the song is from (e.g. "Aashiqui 2").                |
| `genre`          | `"golden-era" | "new-age"` | Controls tab filter. Every song has exactly one genre.   |
| `audioUrl`       | string             | URL of the single full-length audio file for this song.         |
| `revealTiers`    | RevealTier[]       | Ordered array of reveal tiers for this song (see section 3).    |

In the existing `sargam.jsx` the catalog is the `SONGS` constant (an array of `{title, movie, artist}`). The domain model extends this with `id`, `genre`, `audioUrl`, and `revealTiers`.

---

### RevealTier

An element of a Song's `revealTiers` array. Describes one playback window.

| Field             | Type           | Notes                                                                            |
|-------------------|----------------|----------------------------------------------------------------------------------|
| `index`           | number         | 0-based position in the tier array. Determines which attempt unlocks this tier.  |
| `cutoffSeconds`   | number | null  | Playback stops when `audio.currentTime >= cutoffSeconds`. `null` means play to natural end (the "full song" tier). |
| `label`           | string         | Human-readable duration string shown on the timeline (e.g. "0.2 seconds", "Full song"). |

**Default tier array (shared by all songs in MVP):**

```
index 0: { cutoffSeconds: 0.2,  label: "0.2 seconds" }
index 1: { cutoffSeconds: 0.5,  label: "0.5 seconds" }
index 2: { cutoffSeconds: 2,    label: "2 seconds"   }
index 3: { cutoffSeconds: 5,    label: "5 seconds"   }
index 4: { cutoffSeconds: null, label: "Full song"   }
```

This array is stored on each Song record. MVP seeds every song with the default array. Adding a custom array to a song later is a data change only.

In the existing `sargam.jsx` tiers are approximated by the `STAGES` array (6 elements with `weight` properties). The domain model replaces `weight`-based proportional widths with explicit `cutoffSeconds`. The timeline proportions must be recalculated from the actual cutoff values (or a fixed weight can be reassigned per tier for visual purposes — see architecture.md).

---

### Round

One player's play-through of the daily Song. A Round is ephemeral — it lives in client state and `localStorage`. It is never sent to the server in MVP.

| Field           | Type          | Notes                                                                  |
|-----------------|---------------|------------------------------------------------------------------------|
| `songId`        | string        | The Song's `id`.                                                       |
| `date`          | string        | ISO date string (UTC, e.g. `"2026-08-22"`). Used as the `localStorage` key prefix. |
| `attempts`      | Attempt[]     | Ordered list of all Attempt records for this Round.                    |
| `status`        | `"in-progress" | "won" | "lost"` | Derived: "won" if any Attempt is correct; "lost" if attempts.length === 6 and none are correct. |
| `score`         | number        | Derived from the canonical scoring table in spec.md section 3.3.       |
| `currentTierIndex` | number     | Index into the Song's `revealTiers` array for the next play. Equals `min(attempts.length, 4)`. |

---

### Attempt

One row in the guess grid. Created on each submit or skip action.

| Field      | Type                             | Notes                                             |
|------------|----------------------------------|---------------------------------------------------|
| `index`    | number                           | 0-based position in the Round's attempts array.   |
| `type`     | `"guess" | "skip"`               | "skip" means the player pressed Skip.             |
| `text`     | string | null                    | The guess text if type is "guess"; null if "skip". |
| `correct`  | boolean                          | True only if type is "guess" and the guess matched. Always false for skips. |

In `sargam.jsx` row state is `{status: "skip"|"wrong"|"correct", text: string}`. The domain model renames `status` to `type`+`correct` for clarity, but the mapping is 1:1.

---

### Score

Not a separate entity — Score is a derived number on a Round, computed from the canonical table in spec.md section 3.3. It is:

```
score = attemptIndexOfCorrectGuess === undefined
  ? 0
  : [1000, 800, 600, 400, 200, 100][attemptIndexOfCorrectGuess]
```

Score is stored alongside Round state in `localStorage` so it can be displayed without recomputation on reload.

---

## 2. Value objects

### DailyEntry

The response shape of the `/api/daily` endpoint. Combines the Song with the calendar context.

| Field        | Type      | Notes                                      |
|--------------|-----------|--------------------------------------------|
| `date`       | string    | UTC date string (e.g. `"2026-08-22"`).     |
| `song`       | Song      | The full Song record for today.            |

---

## 3. Invariants

1. `song.revealTiers.length >= 1`. The array must have at least one tier.
2. `revealTier.index` values are contiguous from 0 and match their position in the array.
3. Exactly one tier per Song may have `cutoffSeconds: null`. If present, it must be the last element.
4. A Round's `attempts.length` never exceeds 6.
5. A Round's `status` is "won" only if exactly one Attempt has `correct: true`. There is at most one correct Attempt per Round.
6. `Round.currentTierIndex = Math.min(Round.attempts.length, Song.revealTiers.length - 1)`.

---

## 4. Lifecycle

```
App loads
  -> fetch /api/daily -> DailyEntry
  -> check localStorage for Round keyed to DailyEntry.date
     -> found: restore Round, show result modal if status is "won"/"lost"
     -> not found: create new Round { songId, date, attempts: [], status: "in-progress" }

Player presses Play
  -> load Song.audioUrl into audio element (if not already loaded)
  -> play from currentTime = 0
  -> stop when currentTime >= currentTier.cutoffSeconds (or end of file if cutoffSeconds is null)

Player submits guess or skips
  -> create Attempt record
  -> append to Round.attempts
  -> if correct: set Round.status = "won", compute Round.score, persist to localStorage
  -> if wrong or skip: advance Round.currentTierIndex, persist to localStorage
  -> if attempts.length === 6 and no correct: set Round.status = "lost", persist to localStorage

Round ends (won or lost)
  -> show ResultModal
  -> persist final Round to localStorage
```
