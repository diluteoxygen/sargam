# Song Curation & Recognizability -- Specification

**Version:** 1.0
**Date:** 2026-08-24
**Status:** Draft (pending review)
**Depends on:** `docs/spec.md`, `docs/domain-model.md`, `docs/song-curation/options.md`

---

## 1. Decision: Phased Hybrid (Option D from options.md)

The chosen approach is a phased hybrid of heuristic pre-screening (for cold start) and gameplay telemetry (for ongoing, evidence-based curation). The rationale:

- No other option works at all stages of the project's life. Heuristic screening works on day one but does not scale or self-correct. Telemetry is the best long-term signal but is useless until there are enough plays per song. Panel testing is operationally impractical for a solo developer pre-launch. The hybrid chains them in the right order.

- This is consistent with how the project already handles phased decisions. Reveal tiers ship with fixed defaults and are architected to accept per-song overrides later (see `docs/spec.md` section 3.1 and `docs/architecture.md` section 4). Suitability follows the same pattern: ship with a manual/heuristic gate, architect the telemetry pipeline, let data replace judgment over time.

---

## 2. Design principle: representative-player calibration

**Whatever approach is used to assess song suitability or difficulty must optimize for the target player, not for the developer's or any insider's music fluency.**

The founders and their friend-group playtesters have demonstrably higher familiarity with this catalog than the target audience. The #1 playtester complaint -- "popular songs that I can't recognize from a clip" -- is itself evidence that the developer's judgment of "everyone knows this" is unreliable for a broader audience.

This principle applies at every phase:

- **Phase 1 (heuristic screening):** The reviewer must adopt a conservative default: when uncertain whether a casual listener would recognize a clip, mark it `review` or `unsuitable`, not `suitable`. The cost of a false negative (pulling a recognizable song) is low (one fewer song in a 345-song pool). The cost of a false positive (serving an unrecognizable song) is a frustrated player who may not return.

- **Phase 2 (telemetry):** The data itself is from representative players, which makes this the most bias-resistant phase. But the thresholds (what skip rate is "too high") must be set based on the actual player population's behavior, not on the developer's expectation of what "should" be recognizable.

---

## 3. Suitability as a gate (separate from difficulty)

### 3.1 The two axes

The domain model gains two new concepts:

- **Suitability:** a binary gate. A song is either `suitable` (it belongs in the active play pool) or `unsuitable` (it does not). A third state, `review`, exists for borderline songs awaiting more data or human review.

- **Difficulty:** for songs that pass the suitability gate, a tier classification (the existing `super-easy`, `easy`, `hard` concept, potentially refined). Difficulty answers "how short a clip is needed for recognition?" Suitability answers "can this song be recognized from *any* clip at all, by a representative player?"

### 3.2 What "recognizable enough" means

A song passes the suitability gate if a representative casual listener has a reasonable chance of identifying it from a clip of 5 seconds or less. Operationally:

- **Phase 1 (heuristic):** The reviewer listens to the first 5 seconds of the song and asks: "Would a person who knows this song casually (has heard it at a wedding, in a taxi, in a film) recognize it from this clip?" If the answer is "probably not" -- because the first 5 seconds is instrumental filler, crowd noise, or generically indistinguishable from dozens of other songs -- the song is marked `unsuitable` or `review`.

- **Phase 2 (telemetry):** A song is flagged for suitability review if its full-round loss rate (all 6 attempts exhausted with no correct guess) exceeds 60% after 30 or more serves. This is the measurable bar. The 60% threshold is a starting point, not a sacred number -- it should be recalibrated after the first 1000 rounds of telemetry data across all songs.

### 3.3 What happens to unsuitable songs

- Songs marked `unsuitable` are removed from the active play pool. They are **not** deleted from `songs.json`. Instead, a `suitability` field is set to `unsuitable`, and the song selection logic in `useDaily.js` (and any future server-side selection) excludes songs where `suitability === "unsuitable"`.

- Songs marked `review` are provisionally included in the pool but are prioritized for telemetry review once data exists.

- An `unsuitable` song can be reclassified to `suitable` if telemetry data later contradicts the heuristic judgment (e.g., the song was served enough times and players actually did recognize it), or if the audio file is replaced with a better-quality version where the identifiable hook starts earlier.

---

## 4. Telemetry requirements

### 4.1 What must be logged

The game currently logs zero per-song outcome data. This is the single most important prerequisite for Phase 2 and must be instrumented in Phase 1, even though the data will not be actionable until Phase 2.

On every round completion (win or loss), the following event must be written to Firestore:

| Field            | Type     | Notes |
|------------------|----------|-------|
| `songId`         | string   | The Song's `id` from `songs.json`. |
| `mode`           | string   | `"daily"`, `"all"`, or `"trending"`. |
| `date`           | string   | UTC date string. |
| `outcome`        | string   | `"won"` or `"lost"`. |
| `attemptCount`   | number   | Total attempts used (1-6). |
| `tierAtGuess`    | number or null | The tier index at which the correct guess was made. `null` if lost. |
| `skips`          | number   | Number of skip actions in the round. |
| `timestamp`      | number   | Unix timestamp in milliseconds. |

This event is anonymous (no user ID). It is a write-only append to a `roundEvents` collection. The game does not read from this collection during gameplay; it is consumed only by the offline aggregation script.

### 4.2 Why this is sequenced first

Without this telemetry, Phase 2 cannot happen. Even if the data is not used for months, the sooner it starts accumulating, the sooner per-song metrics become statistically meaningful. Every day of delay is a day of lost signal. This is a prerequisite, not a nice-to-have.

---

## 5. Migration of the existing catalog

### 5.1 The current state

- 345 songs in `songs.json`.
- 192 tagged `difficulty: "super-easy"`, 12 `easy`, 6 `hard`, 135 untagged.
- No `suitability` field exists on any song.

### 5.2 The migration

A one-time reclassification pass:

1. **Add `suitability` field to every song.** Default: `"suitable"` for all songs that currently have a `difficulty` tag (since they were manually reviewed at some point). Default: `"review"` for the 135 untagged songs (since they were bulk-imported without a manual recognizability check).

2. **Run the heuristic screening pass on the `review` songs.** Listen to the first 5 seconds of each of the 135 untagged songs. Reclassify each as `suitable`, `unsuitable`, or leave as `review` if genuinely borderline.

3. **Spot-check a random sample of the 210 tagged songs.** The `super-easy` tag was applied in bulk to "popular/viral" tracks. Popularity is a weak proxy for recognizability (see options.md section 3). A spot-check of 30-40 of these songs, focused on "does the first 5 seconds actually sound identifiable?", is warranted to catch false positives.

4. **Preserve existing difficulty tags.** The `difficulty` field is not replaced or renamed. Suitability is additive -- it is a new field alongside the existing one. Songs that are `suitable` keep whatever difficulty tag they had.

### 5.3 Timeline

This migration is a manual task: 135 songs at 15 seconds each is about 35 minutes of focused listening. The spot-check adds 10-15 minutes. Total: under an hour. It should be done before the next public deployment.

---

## 6. Interaction with the existing manual tiering workflow

### 6.1 Decision: keep human-in-the-loop

The heuristic screening pass is a human process. The telemetry aggregation produces recommendations, not automated actions. A human reviews the telemetry output and decides whether to reclassify a song.

Rationale: at current scale (345 songs, pre-launch), the manual overhead is trivial. Automating suitability decisions introduces the risk of removing songs that players do recognize but that happened to be served to an unrepresentative sample of beginners. The cost of a human review step is 5 minutes per week; the cost of a wrongly-removed song is a gap in the catalog and wasted curation effort.

### 6.2 When to revisit

If the catalog grows past 1000 songs or DAU exceeds 500, the manual review step should be replaced by an automated gate with human override (i.e., the script applies changes by default, and a human can reverse them). This is a future decision, not an MVP one.

---

## 7. Phasing summary

| Phase | Trigger | Suitability source | Difficulty source | Telemetry role |
|-------|---------|-------------------|-------------------|----------------|
| 1 (MVP) | Now | Heuristic screening (manual listen) | Existing manual tags | Instrumented and accumulating, not yet consumed |
| 2 (Post-launch) | 30+ plays per song | Telemetry-informed, human-reviewed | Telemetry-informed (median tier-to-guess) | Primary signal, reviewed by human |
| 3 (Scale) | 500+ DAU, 1000+ songs | Telemetry-automated with human override | Telemetry-automated | Automated gate with override |

---

## 8. Non-goals (reaffirmed from brief)

- No ML model training or third-party audio-analysis vendor integration in any phase described here.
- No admin UI for curation beyond what is scoped in tickets. The manual screening pass is done by editing `songs.json` directly.
- No changes to reveal-tier mechanics, scoring, or round rules. This spec governs which songs enter the pool and how they are classified, not how a round plays out once a song is selected.
