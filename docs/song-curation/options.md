# Song Curation & Recognizability -- Options Brainstorm

**Date:** 2026-08-24
**Status:** Brainstorm (precedes spec decision)

---

## 0. Catalog inventory (as of this writing)

Before evaluating options, here is the actual data shape we are reasoning about:

- **345 songs** in `data/songs.json`.
- **Difficulty tags:** 192 `super-easy`, 12 `easy`, 6 `hard`, 135 untagged.
- **Genre split:** 147 `new-age`, 55 `golden-era`, 143 `trending`.
- **248 songs** have a `year` field; 97 do not.
- **Telemetry:** Zero per-song telemetry exists today. `stats.js` tracks aggregate per-mode statistics (total games, win/loss, distribution by attempt index, streaks). It does not record which song was played, which tier the guess landed on, or whether a specific song was skipped. The game generates no server-side or cloud-side event data per round.

The existing `difficulty` field is a flat string tag applied manually. The `super-easy` tag was bulk-applied to 192 tracks identified as viral/popular, and drives a probabilistic matchmaking system in `useDaily.js` that biases beginners toward those tracks. There is no suitability gate; every song in `songs.json` can be served.

---

## 1. The problem restated

The playtester complaint is not "this song is too hard." It is "I listened to the full clip and I have no idea what this is." Those are different failures:

- **Difficulty** (the existing axis): a recognizable song where a shorter clip is harder and a longer clip is easier. This is the domain the current easy/medium/hard tiering lives in. Difficulty is a matter of *how much audio* a player needs.

- **Suitability** (the missing axis): whether a given song can be recognized from *any* short clip at all, by a representative player (not the developer or their immediate friend group). A song that is famous by name but has a 12-second instrumental intro before anything identifiable happens is unsuitable regardless of its Spotify stream count. A deep album cut that only the most dedicated listeners would know by ear is unsuitable regardless of how distinctive its opening bars are.

The current system conflates these. A song tagged `hard` might actually be unsuitable (should not be in the pool), and an untagged song might be perfectly suitable but genuinely difficult (should be tagged hard and served, not removed). Separating these two axes is the core goal.

### The bias problem

The founders and their friend-group testers have significantly higher familiarity with this catalog than the target player base. A song that "everyone knows" in that circle may be genuinely unrecognizable to a casual Bollywood music listener. Whatever approach is chosen must explicitly account for this gap. The developer's own ear is not ground truth for the target audience.

---

## 2. Option A: Real gameplay telemetry as ground truth

### How it works

Instrument the game to log per-song, per-tier outcomes to a server-side or cloud store. For each completed round, record: `songId`, `mode`, `date`, `tiersHeard` (how many tiers the player listened to before guessing or giving up), `outcome` (correct guess, wrong guess at attempt N, or full loss), and `skippedAt` (tier index of first skip, if any).

Over time, aggregate these into per-song metrics:
- **Recognition rate at tier N**: what fraction of players who heard tier N guessed correctly?
- **Skip rate**: what fraction of total serves resulted in a full loss (all 6 attempts used with no correct guess)?
- **Median tier-to-guess**: for correct guesses, what tier did recognition happen?

Use the skip rate (or equivalently, the inverse of the full-round recognition rate) as the suitability signal: a song with a skip rate above some threshold (e.g., above 60% after 50+ serves) is flagged as unsuitable. Use the median tier-to-guess as the difficulty signal.

### What it needs

- A telemetry pipeline: either Firestore writes per round completion, or a lightweight `/api/telemetry` endpoint. Given the existing Firestore integration for sync, Firestore is the obvious channel.
- A minimum sample size before the data is actionable (a song served 5 times tells you nothing; 50+ is the floor for rough statistical confidence).
- A batch process or script that reads accumulated telemetry and produces updated suitability/difficulty tags, reviewed by a human before being applied.

### Cold-start behavior

None. On day one, before any player data exists, this approach provides zero signal. Every song in the catalog is in the same position it is now: manually tagged or untagged with no evidence-based gate. For the 135 currently untagged songs, this approach simply says "wait and see."

### Ongoing maintenance cost

Low once instrumented. The telemetry writes happen automatically. The aggregation script runs periodically. Human review of the output is optional but recommended.

### Failure modes

- **Insufficient data per song.** With 345 songs and 100 DAU playing one daily song, a given song is served once every 345 days. That is nowhere near enough data to make per-song decisions for the full catalog. Endless modes generate more data but are biased toward high-engagement players who are not representative of the target casual audience.
- **Confounds.** A song might have a high skip rate not because it is unrecognizable, but because it was served disproportionately to beginners (via the adaptive matchmaking system), or because the audio file has a quality issue. Raw telemetry does not distinguish these causes.
- **Feedback loop.** If unsuitable songs are removed from the pool based on telemetry, the remaining pool gets progressively easier, which inflates win rates and makes the threshold harder to calibrate over time.

### Verdict

Telemetry is the right long-term source of truth, but it cannot be the MVP approach. The sample-size problem alone makes it useless at current scale. It should be instrumented now as a prerequisite for later use, but it cannot gate today's curation decisions.

---

## 3. Option B: Heuristic pre-screening (audio and metadata signals)

### How it works

Evaluate each song against a set of proxy signals that correlate with early-clip recognizability, without requiring any player data:

1. **Intro length to first identifiable element.** The single strongest heuristic: how many seconds pass before a listener hears vocals, a distinctive instrumental hook, or any recognizable sonic signature? A song where the first 5 seconds is silence, crowd noise, or generic percussion is almost guaranteed to fail suitability at the 0.2s and 0.5s tiers. This is not something an algorithm easily detects -- it is a manual listen of the first 10 seconds of each track.

2. **Audio onset analysis.** A weaker automated version of the above: use a simple energy/loudness threshold on the audio waveform to detect whether the first 0.5 seconds contains signal above a noise floor. Songs that start with silence or near-silence are flagged for review. This is automatable with `ffmpeg` loudness analysis (no ML vendor required).

3. **Popularity as a weak filter.** Streaming counts (if available) or inclusion in curated "top 100 Bollywood" playlists can serve as a minimum-fame gate: a song that nobody has heard of is unsuitable regardless of how distinctive its intro is. But this is explicitly a weak signal -- the whole complaint is that popular songs can still be unrecognizable from a short clip. Popularity is necessary but not sufficient for suitability.

4. **Opening-bar distinctiveness (subjective).** Some songs open with an instantly iconic riff (the tabla hit of "Jai Ho," the synth of "Disco Deewane"). Others open with a generic string pad that could be any of 200 films. A manual pass rating "how distinctive is the first 2 seconds" on a 1-3 scale provides a fast heuristic. This is the most judgment-dependent signal and the one most susceptible to the bias problem.

### What it needs

- A manual listening pass through the catalog, focused on the first 10 seconds of each song. At 15 seconds per song (listen, note, move on), 345 songs takes about 90 minutes.
- Optionally, an `ffmpeg` script to measure RMS loudness of the first 0.5s and 2s windows, flagging songs below a threshold for review.
- A human reviewer who is *not* the developer or their immediate friend group, or at minimum, a conscious effort to adopt the perspective of a casual listener rather than an enthusiast.

### Cold-start behavior

Excellent. This approach works on day one with zero player data. Every song can be screened before the game goes public.

### Ongoing maintenance cost

Medium. Every new batch of songs needs the same manual listening pass. The `ffmpeg` automation helps triage but does not replace the subjective judgment calls.

### Failure modes

- **The bias problem is acute here.** A manual listen by the developer will systematically overestimate recognizability ("of course everyone knows this opening, it's Lata Mangeshkar"). Without a representative panel, the heuristic is only as good as the reviewer's ability to suppress their own expertise.
- **Intro-length is a necessary but not sufficient signal.** A song can have vocals starting at 0.1 seconds and still be unrecognizable to a casual listener if those vocals are generic or the song is obscure.
- **No ongoing learning.** This approach does not improve with usage data. A song misjudged as suitable at screening time stays in the pool until someone manually re-reviews it.

### Verdict

Heuristic pre-screening is the right MVP approach for cold-start curation. It is the only option that works before any players exist. But it must be done honestly -- the developer must either recruit outside reviewers or explicitly adopt a "when in doubt, pull it from the pool" stance to counteract the bias risk.

---

## 4. Option C: Panel / beta testing as a bridge

### How it works

Build a lightweight internal tool (or even a spreadsheet workflow) where a panel of 5-10 testers -- recruited outside the founder's immediate friend group, ideally varying in age and Bollywood music fluency -- listen to the first 0.2s, 0.5s, 2s, and 5s of each song and record:

- At which tier (if any) they recognized the song.
- If they never recognized it, they mark it as "unknown."

For each song, aggregate across the panel:
- **Panel recognition rate at 5s**: if fewer than, say, 3 out of 10 panelists recognized the song by the 5-second tier, it fails the suitability gate.
- **Median tier-to-recognize**: among panelists who did recognize it, this becomes the difficulty signal.

### What it needs

- A panel of 5-10 people outside the founders' circle. These could be friends of friends, Reddit volunteers, or beta testers recruited from a Bollywood music community. They do not need to be compensated for a one-time pass over 345 songs (it is about 90 minutes of listening, which a music fan might enjoy).
- A tool to present the clips. This could be as simple as a private page that plays each song's audio in tier-gated steps and collects a Google Form response per song. It does not need to be the production game UI.
- Time: coordinating even 5 external testers takes days, not hours.

### Cold-start behavior

Excellent, by design. The whole point is to generate a ground-truth dataset before launch.

### Ongoing maintenance cost

High for ongoing use (you need to reconvene the panel for every new batch of songs). Reasonable as a one-time or semi-annual calibration exercise.

### Failure modes

- **Panel fatigue.** Asking someone to rate 345 songs is a lot. Drop-off is likely past 100. Batching helps but extends the calendar time.
- **Panel composition bias.** If the panel skews toward Bollywood enthusiasts (likely, since they are the ones who volunteer), their recognition rates will be higher than the target casual player's. The panel needs explicit instruction: "rate whether a *casual listener* would recognize this, not whether *you* do."
- **Not repeatable at scale.** For a growing catalog, this becomes a bottleneck. It works for the initial 345 songs but is not a sustainable ongoing process.
- **Coordination overhead.** The founder has 10 users and is pre-launch. Recruiting and managing a panel is real effort that competes with shipping the product.

### Verdict

Panel testing is the gold standard for answering "is this recognizable to a representative player" but is operationally heavy for a pre-launch project with a solo developer. It is the right approach for a one-time calibration pass if the founder can recruit even 3-5 outside testers. It is not the right ongoing mechanism.

---

## 5. Option D: Phased hybrid (heuristic gate at cold start, replaced by telemetry)

### How it works

Combine Options A and B in sequence, with Option C as an optional calibration step:

**Phase 1 (pre-launch, now):**
- Run the heuristic pre-screening pass (Option B) on all 345 songs. Focus on intro-length and a conservative "when in doubt, pull it" stance. Tag each song with a `suitability` field: `suitable`, `unsuitable`, or `review` (borderline).
- Songs tagged `unsuitable` are removed from the active pool (moved to a `held` status, not deleted -- they can be re-reviewed later).
- Songs tagged `review` are provisionally included but flagged for priority telemetry review once data exists.
- Optionally, recruit 3-5 outside testers (Option C) to validate the heuristic pass on a subset of borderline songs.

**Phase 2 (post-launch, once per-song play counts reach 30+):**
- Instrument per-round telemetry (Option A). Log `songId`, `tierAtGuess`, `outcome`, and `mode` to Firestore on every round completion.
- Build a periodic aggregation script that computes per-song recognition rate and median tier-to-guess.
- Songs whose telemetry contradicts their heuristic tag (e.g., a `suitable` song with a 70% skip rate after 50 serves) are flagged for human review and potential reclassification.

**Phase 3 (mature, 500+ DAU):**
- Telemetry becomes the primary signal. Heuristic tags become the fallback for new songs that have not yet accumulated enough plays.
- The suitability threshold is calibrated against the actual player population, not the developer's judgment.

### What it needs

- Phase 1: the manual listening pass (90 minutes), plus the `suitability` field added to the Song schema.
- Phase 2: Firestore telemetry writes (a code change in `useRound.js`), plus an aggregation script.
- Phase 3: no new code; just continued operation of the Phase 2 infrastructure.

### Cold-start behavior

Addressed by Phase 1 (heuristic gate).

### Ongoing maintenance cost

Low after Phase 2 is instrumented. The aggregation script runs periodically. Human review is recommended but optional for stable songs.

### Failure modes

- Phase 1 inherits the bias risk from Option B. Mitigation: conservative defaults (pull borderline songs) and the "review" tag for re-evaluation.
- Phase 2 inherits the sample-size problem from Option A at small scale. Mitigation: the threshold is not enforced automatically until a minimum play count is reached.
- The phased approach adds conceptual complexity: the source of truth for suitability changes over time. This must be documented clearly so a future implementer does not assume telemetry is the sole authority before enough data exists.

### Verdict

This is the approach that best fits the project's existing pattern of "ship the simple version now, architect for the smarter version later" (see how reveal tiers were handled: fixed defaults now, per-song overrides as a data change later). It gives a usable suitability gate on day one without requiring telemetry infrastructure that has no data to work with yet.

---

## 6. Comparison matrix

| Criterion                    | A (Telemetry) | B (Heuristic) | C (Panel)  | D (Hybrid) |
|------------------------------|---------------|---------------|------------|------------|
| Works on day one             | No            | Yes           | Yes        | Yes        |
| Bias-resistant               | High (long-term) | Low       | Medium     | Medium (improves) |
| Operational effort           | Low (once built) | Medium    | High       | Medium     |
| Scales with catalog growth   | Yes           | No            | No         | Yes        |
| Requires code changes        | Yes           | No            | Minimal    | Yes        |
| Consistent with project philosophy | Partially | Partially | Partially | Yes      |

---

## 7. Recommendation

Option D (phased hybrid) is the recommended approach. The reasoning is laid out in the spec that follows this document. This brainstorm is the input; the spec is the decision.
