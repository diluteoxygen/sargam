# Sargam — Architecture

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Overview

Sargam is a client-heavy web application backed by a thin API. The front end handles all game state; the back end serves the catalog and resolves the daily song. There is no server-side session or game state in MVP.

```
Browser
  |
  |-- React SPA (Vite build) --------> /api/daily  -------> Node/Express
  |                                    /api/catalog          |
  |-- localStorage (Round state)                            songs.json (catalog)
```

---

## 2. Front-end

### Framework and build

**React 18 + Vite.**

Rationale: the existing `sargam.jsx` already uses React hooks and JSX. Vite is the lowest-friction build tool for a React project — near-instant HMR, minimal config, and no ejection path needed. No Create React App, no Next.js (SSR adds no value for a single-page daily game).

### File structure (proposed, not required by this document)

```
src/
  components/
    GuessRow.jsx
    Timeline.jsx
    ResultModal.jsx
    SettingsModal.jsx
    DistributionChart.jsx
    Toggle.jsx
  hooks/
    useRound.js       -- manages Round state and localStorage persistence
    useAudio.js       -- wraps HTMLAudioElement, enforces tier cutoff
    useDaily.js       -- fetches /api/daily, memoizes for session
  lib/
    normalize.js      -- shared guess normalization (already in sargam.jsx)
    scoring.js        -- canonical score lookup from spec table
    tiers.js          -- default RevealTier array
  App.jsx             -- root; wires hooks to components
  main.jsx            -- ReactDOM.createRoot entry point
  styles.css          -- CSS custom properties extracted from the inline CSS block
```

The existing `sargam.jsx` is the source for all components above. Tickets that build components must use it as the starting point, not rewrite from scratch.

### State management

No external state library (Redux, Zustand, etc.) is introduced in MVP. React's built-in `useState`/`useReducer`/`useRef` plus the three hooks above are sufficient.

### Audio playback

Implemented in `useAudio.js`. Key decisions (from spec.md section 5):

- One `<audio>` element per Round, loaded from `song.audioUrl`.
- On each play call, reset `currentTime = 0` then start playback.
- Attach a `timeupdate` listener. When `audio.currentTime >= tier.cutoffSeconds`, call `audio.pause()`. If `tier.cutoffSeconds` is `null`, do not attach the cutoff listener — let the audio play to natural end.
- Expose `{ playing, play, stop }` to the component layer.

This mirrors the existing `playTimer` / `setTimeout` approach in `sargam.jsx` but uses actual audio position rather than a wall-clock timer.

### RevealTier on the Timeline component

The existing `Timeline` uses `weight`-based flex sizing (from `STAGES[i].weight`). With explicit `cutoffSeconds` values, the visual proportions can be derived as:

```
weight(tier) = tier.cutoffSeconds ?? FULL_SONG_VISUAL_WEIGHT
```

Where `FULL_SONG_VISUAL_WEIGHT` is a constant chosen for visual balance (e.g. 30). This makes the "full song" segment visually larger than the 5-second segment, which is the intent. The Timeline component accepts the tier array and computes weights locally — no changes to the component interface are required.

---

## 3. Back-end

### Runtime

**Node.js 20 LTS + Express.**

Rationale: minimal operational overhead, compatible with the front-end ecosystem. No framework-level opinion on routing beyond what Express provides.

### Endpoints

#### GET /api/daily

Returns the DailyEntry (see domain-model.md section 2) for the current UTC date.

Response shape:

```json
{
  "date": "2026-08-22",
  "song": {
    "id": "tum-hi-ho",
    "title": "Tum Hi Ho",
    "artist": "Arijit Singh",
    "movie": "Aashiqui 2",
    "genre": "new-age",
    "audioUrl": "https://...",
    "revealTiers": [
      { "index": 0, "cutoffSeconds": 0.2, "label": "0.2 seconds" },
      { "index": 1, "cutoffSeconds": 0.5, "label": "0.5 seconds" },
      { "index": 2, "cutoffSeconds": 2,   "label": "2 seconds"   },
      { "index": 3, "cutoffSeconds": 5,   "label": "5 seconds"   },
      { "index": 4, "cutoffSeconds": null, "label": "Full song"  }
    ]
  }
}
```

Daily song selection: `songs[daysSinceUnixEpoch % songs.length]` where `daysSinceUnixEpoch = Math.floor(Date.now() / 86400000)`.

Response is cached with `Cache-Control: public, max-age=3600` (1 hour). The value is stable for a given date so longer caching is safe, but 1 hour is conservative.

#### GET /api/catalog

Returns the full song list (id, title, artist, movie, genre — no audioUrl) for client-side autocomplete. This endpoint exists so the client does not have to embed the catalog at build time. If the catalog grows, the client can incrementally search without a full rebuild.

Response is cached aggressively: `Cache-Control: public, max-age=86400`.

### Data store (MVP)

A flat `songs.json` file on disk, loaded into memory at server startup. No database dependency in MVP. The file is the source of truth for the catalog.

Schema of one song entry in `songs.json`:

```json
{
  "id": "tum-hi-ho",
  "title": "Tum Hi Ho",
  "artist": "Arijit Singh",
  "movie": "Aashiqui 2",
  "genre": "new-age",
  "audioUrl": "https://...",
  "revealTiers": [ ... ]
}
```

If `revealTiers` is absent from a song entry, the server falls back to the default tier array (defined in `src/lib/tiers.js` and duplicated or imported in the server). This enforces the invariant from domain-model.md section 3 without requiring every song entry to repeat the default array.

---

## 4. Reveal tier extensibility

This section exists because the brief explicitly requires the reveal tier design to appear here.

The `revealTiers` field on Song is the only place tier values live. The game engine (client) reads `song.revealTiers[currentTierIndex].cutoffSeconds` at playback time. No hardcoded tier durations exist in any component or hook. To give a single song custom tiers:

1. Edit its `revealTiers` array in `songs.json`.
2. Redeploy (or restart the server if JSON is loaded at startup).
3. No code change is required.

---

## 5. Deployment (MVP target)

Single server process serves both the Express API and the Vite-built static files from `dist/`. No separate CDN or reverse proxy is required for MVP. Audio files are hosted at a URL that the server does not proxy — the client fetches audio directly (from wherever the audio decision in ticket 001 lands).

---

## 6. What is explicitly not decided here

- Database schema (Postgres) — deferred to a post-MVP ticket.
- CI/CD pipeline — deferred.
- CDN strategy for audio files — depends on ticket 001.
- Any auth or session mechanism — non-goal for MVP.
