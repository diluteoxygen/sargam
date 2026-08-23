---
status: done
depends_on: [003, 004]
created: 2026-08-22
updated: 2026-08-22
---

# 007 — Catalog Autocomplete Wire-Up

## Context

The existing `sargam.jsx` filters suggestions from a hardcoded `SONGS` constant. This ticket replaces that with the catalog fetched from `/api/catalog`, applies genre tab filtering, and ensures the suggestion list matches the domain model.

Read before starting:
- `docs/spec.md` section 9 (genre tabs behavior — filter autocomplete only, not the daily song)
- `docs/domain-model.md` section 1 (Song fields, particularly `genre`)
- `src/hooks/useDaily.js` and `src/App.jsx` (created by ticket 003)
- `src/SargamLegacy.jsx` lines 379-383 — the original suggestion filter logic

## Scope

**In scope:**

1. Create or extend `src/hooks/useCatalog.js`:
   - Fetches `GET /api/catalog` once on mount (not on every render).
   - Returns `{ songs, loading, error }` where `songs` is the catalog array.
   - Memoizes the result in module-level scope so multiple hook calls in the same session do not re-fetch.

2. In `src/App.jsx` (or wherever suggestions are filtered):
   - Replace the hardcoded `SONGS` filter with `useCatalog`.
   - Apply genre tab filter: if `tab === "All"`, show all songs; if `tab === "golden-era"` or `"new-age"`, filter by `song.genre`.
   - Tab labels in the UI are "All", "Golden Era", "New Age". The mapping to `genre` field values is: "Golden Era" -> `"golden-era"`, "New Age" -> `"new-age"`.
   - Keep the existing substring match logic: `song.title.toLowerCase().includes(query.toLowerCase())`.
   - Show at most 5 suggestions (existing behavior).

3. While catalog is loading, show an empty suggestion list (no spinner needed).

**Out of scope:**
- Fuzzy matching beyond the existing substring search
- Paginating the suggestion list
- Changing the visual appearance of the suggestion dropdown
- Caching catalog in localStorage

## Acceptance criteria

- [x] Typing in the search field shows suggestions from the API catalog, not the hardcoded SONGS array.
- [x] Switching from "All" to "Golden Era" tab narrows suggestions to songs with `genre: "golden-era"`.
- [x] Switching to "New Age" tab narrows suggestions to songs with `genre: "new-age"`.
- [x] The tab does not change the daily song.
- [x] Maximum 5 suggestions are shown at a time.
- [x] `GET /api/catalog` is called once per session, not on every keystroke.
- [x] `status` is flipped to `done`.

## File pointers

- `src/hooks/useCatalog.js` — create this file
- `src/App.jsx` — wire in the hook
- `src/SargamLegacy.jsx` lines 47-48, 379-383 — original tab and filter logic
- `docs/spec.md` section 9 — genre tab behavior
- `data/songs.json` — genre values assigned in ticket 002

## Changelog

- 2026-08-22: Created src/hooks/useCatalog.js with session memoization and wired autocomplete and genre tab filters in App.jsx.
