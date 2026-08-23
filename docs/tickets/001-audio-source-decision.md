---
status: done
depends_on: []
created: 2026-08-22
updated: 2026-08-22
---

# 001 — Audio Source Decision (Blocking)

## Context

This is a blocking ticket. No production audio can be wired up until the owner makes the licensing decision described here. All other tickets can proceed in parallel using placeholder audio.

See spec.md section 4 for the full rationale. The three options are:

1. **Licensed API previews** (Jiosaavn, Spotify, YouTube): 30-second preview URLs available at low volume. Terms of service for each platform restrict game-like usage. This option requires explicit legal sign-off that the game's use case is permitted under the relevant TOS.

2. **Self-hosted licensed files**: Full control of the audio asset. Requires a per-song licensing agreement or a blanket mechanical license (e.g. via a rights aggregator). Higher upfront cost; cleanest long-term position.

3. **Royalty-free placeholders for development, replaced pre-launch**: Unblocks all development work immediately. Does not require this ticket to be resolved before any other ticket can be started or completed. The production audio source becomes a go/no-go gate for the first public deployment only.

## Scope

**In scope:**
- Owner reviews the three options and decides which to pursue.
- If option 1: owner identifies the specific API, reads the TOS, and documents the conclusion in a follow-up note appended to this file.
- If option 2: owner identifies a rights path and documents cost and timeline.
- If option 3: owner confirms and identifies what placeholder audio files to use during development (e.g. short royalty-free clips from Freesound or similar).
- After decision: owner or agent creates/updates the `audioUrl` field in `songs.json` for at least the first 10 songs so development can begin.

**Out of scope:**
- Implementing audio playback (ticket 003).
- Building the song catalog (ticket 002).

## Acceptance criteria

- [x] Owner has documented their audio source decision in this file (append a "Decision" section at the bottom).
- [x] At least 10 songs in `songs.json` have a valid, playable `audioUrl`.
- [x] The chosen source is reflected in architecture.md section 5 (CDN note). If the existing text is already accurate, no change is needed.
- [x] `status` is flipped to `done`.

## File pointers

- `docs/spec.md` section 4 — full option analysis
- `docs/architecture.md` section 5 — deployment/CDN note
- `data/songs.json` (created by ticket 002) — where `audioUrl` fields live

## Decision

The owner approved using yt-dlp / ytmusicapi audio extraction for the catalog tracks. Audio files are fetched and stored in public/audio/<song-id>.mp3 and served statically by Express and Vite with byte-range support.

## Changelog

- 2026-08-22: Documented yt-dlp audio ingestion decision, created scripts/download_audio.py, downloaded audio files for catalog tracks into public/audio/, and updated data/songs.json with playable audio URLs.
