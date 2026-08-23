---
status: done
depends_on: [002]
created: 2026-08-22
updated: 2026-08-22
---

# 004 — Express API (Daily Endpoint and Catalog Endpoint)

## Context

The front-end needs two API endpoints: one that returns today's song, and one that returns the full catalog for autocomplete. This ticket implements the Express server.

Read before starting:
- `docs/architecture.md` section 3 (endpoints, data store, daily song selection formula)
- `docs/domain-model.md` section 2 (DailyEntry shape)
- `docs/spec.md` section 7 (daily rotation) and section 5 (audio playback mechanism — audioUrl field)
- `data/songs.json` (created by ticket 002) — the catalog file this server reads

## Scope

**In scope:**

Create `server/index.js` implementing:

1. Load `data/songs.json` into memory at startup. If the file is missing or invalid JSON, log an error and exit with code 1.

2. For each song that lacks a `revealTiers` field, attach the default tier array from `docs/spec.md` section 3.1 (or import from `src/lib/tiers.js` if the server can resolve that path; otherwise inline the constant).

3. **GET /api/daily**
   - Compute `dayIndex = Math.floor(Date.now() / 86400000) % songs.length`
   - Return `{ date: todayUTCDateString, song: songs[dayIndex] }`
   - Response: `Content-Type: application/json`, `Cache-Control: public, max-age=3600`

4. **GET /api/catalog**
   - Return `songs.map(s => ({ id: s.id, title: s.title, artist: s.artist, movie: s.movie, genre: s.genre }))` — no `audioUrl`, no `revealTiers`
   - Response: `Content-Type: application/json`, `Cache-Control: public, max-age=86400`

5. In production mode (`NODE_ENV=production`), serve the Vite-built `dist/` directory as static files. All non-API routes return `dist/index.html`.

6. Listen on `process.env.PORT || 3001`.

**Out of scope:**
- Any authentication or rate limiting
- Guess validation server-side (matching is client-side in MVP per spec.md section 3.4)
- Stats aggregation
- Any endpoint beyond `/api/daily` and `/api/catalog`

## Acceptance criteria

- [x] `GET /api/daily` returns a valid DailyEntry JSON object with the correct shape (date string + full song with revealTiers populated).
- [x] The `dayIndex` formula is `Math.floor(Date.now() / 86400000) % songs.length` — verify by temporarily setting a known date and confirming which song is selected.
- [x] Songs without a `revealTiers` field in `songs.json` receive the default 5-tier array in the response.
- [x] `GET /api/catalog` returns an array of objects with `{id, title, artist, movie, genre}` only — no `audioUrl`.
- [x] Both endpoints set appropriate `Cache-Control` headers.
- [x] `npm run dev` (from ticket 002) proxies `/api` calls from the Vite dev server to the Express server successfully.
- [x] `npm run start` serves both the API and the static `dist/` from a single process.
- [x] `status` is flipped to `done`.

## File pointers

- `server/index.js` — create this file
- `data/songs.json` — catalog source (created by ticket 002)
- `vite.config.js` — verify proxy config matches the port used here
- `docs/architecture.md` section 3 — endpoint specs and response shapes
- `docs/domain-model.md` section 2 — DailyEntry shape

## Notes

The `todayUTCDateString` is computed as: `new Date(Math.floor(Date.now() / 86400000) * 86400000).toISOString().slice(0, 10)`. This gives a `YYYY-MM-DD` string in UTC regardless of server timezone.

## Changelog

- 2026-08-22: Implemented server/index.js with GET /api/daily, GET /api/catalog, Cache-Control headers, tier fallback, and production static file serving.
