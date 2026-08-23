# Sargam — Product Specification

**Version:** 1.0  
**Date:** 2026-08-22  
**Status:** Active

---

## 1. Product summary

Sargam is a daily Bollywood/Hindi music guessing game. One song per day. Players hear increasingly long snippets and guess the title. Earlier correct guesses score higher. The entire song catalog is Bollywood/Hindi-exclusive — that is the product's core differentiation from Songless (lessgames.com/songless).

The name "Sargam" (the Indian solfege system) is established in the existing JSX and is the product name.

---

## 2. Scope

### In scope for MVP

- Daily song rotation (one song per calendar date)
- Audio playback in reveal tiers
- Song search with autocomplete filtered to the catalog
- Guess submission with fuzzy title matching
- Skip action
- Scoring based on tier at which the correct guess was made
- Result modal showing: song title, artist, "solved in" count, guess distribution chart, percentile line, score
- Settings modal: song audio volume, sound effects toggle + volume, dark theme toggle, accessibility accordion (reduce motion, lyric captions)
- Genre tab filter (All / Golden Era / New Age) — filters the autocomplete candidate list; does not change the daily song
- Persistent local state for the current day's result (so a page reload does not reset progress mid-game)

### Explicit non-goals for MVP

- Dynamic per-song reveal tiers (architecture must allow it; implementation deferred)
- User accounts, server-side authentication
- Global leaderboards
- Share/copy-result feature beyond the Share button already in the UI (the button exists but its action is out of scope; it should be present but inert for MVP)
- SoundCloud or other embedded players
- Infinite-scroll or pagination of past songs
- Any non-Bollywood/Hindi content

---

## 3. Game rules

### 3.1 Reveal tiers

A game round has exactly five reveal tiers. Each tier exposes a longer audio snippet of the same song. For MVP every song uses the same tier array:

| Tier index | Duration     |
|------------|--------------|
| 0          | 0.2 s        |
| 1          | 0.5 s        |
| 2          | 2 s          |
| 3          | 5 s          |
| 4          | full song    |

"Full song" means the audio plays without a time cutoff until the player stops it manually or the round ends.

The reveal tier array is attached to each Song record in the data model (see domain-model.md section 3). The values above are the defaults. Per-song overrides are a data change, not a code change.

### 3.2 Guess rows

Six rows are shown. Each row maps to one attempt slot. Attempts are 0-indexed internally; rows are displayed 1-indexed to the player.

Attempt 0 uses tier 0 audio. Each wrong guess or skip advances the attempt by 1 and unlocks the next tier. Tier index is capped at 4; attempts 4 and 5 both play the full song. A correct guess or exhausting all six rows ends the round.

### 3.3 Scoring

Score is determined by the attempt index at which the correct guess was submitted. A miss (all six rows used without a correct guess) scores 0.

| Attempt index (0-based) | Points |
|-------------------------|--------|
| 0                       | 1000   |
| 1                       | 800    |
| 2                       | 600    |
| 3                       | 400    |
| 4                       | 200    |
| 5                       | 100    |
| no correct guess        | 0      |

Score is displayed in the result modal alongside the "solved in" count. The score is stored in local state for the current day alongside the attempt index.

This is the canonical scoring table. No other document or ticket may redefine it.

### 3.4 Guess matching

A guess is correct if `normalize(guess) === normalize(target.title)`, where `normalize` strips non-alphanumeric characters and lowercases. The existing JSX already implements this function. Transliteration variants (e.g. "Tum Hi Ho" vs "Tumhi Ho") are not resolved in MVP — exact normalized match only.

---

## 4. Audio sourcing decision

**Decision deferred — see blocking ticket 001.**

Selecting an audio source requires the project owner to weigh licensing cost and legal exposure. The three realistic options are:

1. Jiosaavn / Spotify / YouTube API 30-second preview URLs — free at low volume, but terms of service restrict game-like usage and require legal review.
2. Self-hosted files — full control, but requires clearing rights for each song individually before any public deployment.
3. Placeholder/royalty-free audio during development, replaced before launch — unblocks all other work immediately and is the recommended path for dev.

Option 3 unblocks all front-end and back-end development without licensing risk. The owner must decide on the production audio source before any deployment to a public URL. See ticket 001 for the decision checklist.

---

## 5. Audio playback mechanism

**Decision: one full audio file per song, truncated client-side at each tier's cutoff.**

Rationale: pre-cutting five separate audio files per song multiplies storage and complicates the asset pipeline. A single file per song with a client-side `currentTime` boundary is simpler to maintain, requires no server-side audio processing, and supports per-song custom tier durations as a data change. The only trade-off is that a determined player could inspect the audio URL and listen to the full file; this is acceptable for a casual daily game.

Implementation: the audio element is loaded once per song. On play, the player pauses playback when `currentTime >= tier.cutoffSeconds`. If `tier.cutoffSeconds` is `null`, playback continues to the natural end.

---

## 6. Stack

Determined by inspecting the existing `sargam.jsx`:

- **Frontend:** React with JSX. The existing file imports from `react` and `lucide-react`. The UI uses inlined CSS-in-JS. Build tooling: Vite (see architecture.md for rationale).
- **Backend:** Node.js/Express API for: serving the song catalog, resolving today's song by date, and (later) aggregating guess distribution stats. For MVP the distribution chart can be seeded with static data.
- **Data store:** Flat JSON file for the song catalog in MVP. Postgres recommended for any server-side persistence of stats (future).

---

## 7. Daily rotation

One song per calendar date. Rotation is determined server-side by indexing `(daysSinceEpoch % catalogLength)` against the ordered song catalog. The client calls a `/api/daily` endpoint that returns the song for today (title, artist, movie, genre, audio URL, reveal tiers). The server date is UTC; the daily song does not change mid-day regardless of client timezone.

---

## 8. Local state persistence

The player's progress for the current day is stored in `localStorage` keyed by the song's date string (e.g. `sargam-2026-08-22`). On load, if a stored result exists for today, the game renders in its completed state and the result modal is shown immediately. This prevents re-playing the same day's song after a page reload.

---

## 9. Genre tabs

Tabs (All / Golden Era / New Age) are present in the existing JSX. For MVP they filter the autocomplete suggestion list only. The daily song is selected from the full catalog regardless of which tab is active. Genre is a property of the Song record (see domain-model.md).

---

## 10. Visual design constraints

All front-end work must match the visual language established in `sargam.jsx`:

- Font: Poppins (Google Fonts)
- Background: `#121014`, surface: `#1c1a1f`, surface-2: `#242127`
- Accent/gold: `#e0a638`, gold-soft: `rgba(224,166,56,0.16)`
- Error/loss: `#c94c4c`
- Text: `#f2eef2`, dimmed: `#8a8590`
- Border: `rgba(255,255,255,0.09)`
- Border-radius: 8px (buttons/inputs), 14px (modals), 50% (play button)

Any component added in later tickets must use these CSS custom properties. Do not introduce a new design system or CSS framework.

---

## 11. Decisions closed to re-opening

Everything in sections 3–10 is decided and closed. Tickets implement these decisions; they do not reconsider them. The only open decision is audio sourcing (ticket 001).
