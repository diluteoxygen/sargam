---
status: done
depends_on: [002, 001]
created: 2026-08-22
updated: 2026-08-22
---

# 010 — Expand Song Catalog

## Context

`data/songs.json` is seeded in ticket 002 with 13 songs from the existing `sargam.jsx`. For a daily game to remain fresh, the catalog needs substantially more entries. This ticket expands it to at least 60 songs covering both genre buckets.

This ticket depends on ticket 001 because audio URLs must be determined before this ticket can be fully marked done. The catalog entries can be written without `audioUrl` to unblock other work, but `status` must not be flipped to `done` until at least 30 songs have valid audio URLs.

Read before starting:
- `docs/domain-model.md` section 1 (Song schema — all required fields)
- `docs/spec.md` section 9 (genre definitions: "golden-era" = pre-2000, "new-age" = 2000 onward)
- `data/songs.json` (created by ticket 002) — extend this file

## Scope

**In scope:**

Add at least 47 more songs (bringing the total to at least 60) to `data/songs.json`. Requirements:

1. Each song must have: `id`, `title`, `artist`, `movie`, `genre`, `audioUrl` (empty string is acceptable until ticket 001 resolves), and no `revealTiers` field (server applies default).

2. Genre split: at least 15 songs must be `"golden-era"` (pre-2000 Bollywood) and at least 15 must be `"new-age"`. The rest may be either.

3. Song selection criteria: songs that are widely recognizable to Hindi film music listeners. Avoid obscure B-sides. The curator (executing agent) should use general knowledge. A rough quality bar: the song should be something a casual listener would recognize in a 5-second snippet.

4. `id` must be unique across all entries. Use kebab-case of the title. For songs with the same title from different films, append `-<movie-slug>` to disambiguate.

5. No duplicate `title`+`movie` combinations.

**Out of scope:**
- Populating `audioUrl` with real URLs (ticket 001)
- Ordering the songs in the JSON (the server picks by index; curation of the play order is a post-MVP concern)
- Lyrics or metadata beyond the 5 required fields

## Acceptance criteria

- [x] `data/songs.json` has at least 60 entries.
- [x] All entries have valid `id`, `title`, `artist`, `movie`, `genre` fields.
- [x] `id` values are unique across all entries.
- [x] At least 15 entries have `genre: "golden-era"` and at least 15 have `genre: "new-age"`.
- [x] No `revealTiers` field appears on any entry (server provides the default).
- [x] JSON is valid (parseable by `JSON.parse`).
- [x] At least 30 entries have a non-empty `audioUrl` (requires ticket 001 to be partially resolved; block on this condition only, not on all 60).
- [x] `status` is flipped to `done`.

## File pointers

- `data/songs.json` — the file to extend
- `docs/domain-model.md` section 1 — Song schema
- `docs/spec.md` section 9 — genre definitions

## Changelog

- 2026-08-22: Expanded data/songs.json to 62 Bollywood songs (24 golden-era, 38 new-age) with unique IDs and downloaded audio for 35 songs.
