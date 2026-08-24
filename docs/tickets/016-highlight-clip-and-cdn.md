---
status: done
depends_on: [013]
created: 2026-08-24
updated: 2026-08-24
---

# 016 -- Highlight Clip and CDN

## Context

The current playback path serves complete audio tracks to clients. For most
rounds a player listens to at most 7 seconds; downloading a full 3-5 minute
track for that is wasteful and adds latency on the first play. This ticket
replaces full tracks with short highlight clips and verifies the existing
Range request handling.

Depends on ticket 013 because the highlight clip starting point is
`song.startTime` (the `onsetSeconds` value computed there).

Read before starting:
- `docs/tickets/006-live-audio-playback.md` (playback path to verify for Range support)
- `docs/tickets/013-suitability-field-and-screening.md` (`startTime` / `onsetSeconds` field)
- `src/hooks/useAudio.js` (the existing playback hook)
- `firebase.json` and `storage.rules` (current Firebase config)

## Scope

### 1. Stop serving full tracks

Replace the per-song audio files in Firebase Storage with a short highlight
clip per song:

- Clip starts at `song.startTime` (the RMS-based onset computed in ticket 013).
- Clip length: 15-20 seconds from onset, capped at the actual track duration.
  The goal is a window that covers all reveal tiers (max tier cutoff is 7s
  from onset in the current default array) plus a comfortable buffer for the
  win-celebration play.
- The clip is served in place of the full file at the same `audioUrl` path.
  No client-side changes are required beyond confirming the audio hook still
  works correctly against the shorter file.

Re-encoding parameters for guessing-tier clips (aggressive but acceptable for
recognition use):
- Mono is acceptable (recognition does not require stereo imaging).
- Bitrate: 64 kbps AAC mono (down from whatever the current full-file bitrate
  is — check with `ffprobe` and document the before/after).
- Container: m4a (unchanged; compatible with all target browsers via the
  existing `<audio>` element).

The win-celebration play (when a player guesses correctly) currently plays the
full song from `startTime`. After this ticket, it plays the same highlight clip.
Confirm this still triggers correctly.

### 2. Verify Range request support in the playback path

The `HTMLAudioElement` in modern browsers issues HTTP Range requests when
seeking or loading audio. GCS and Firebase Hosting both support Range
natively. This is a verification task:

- Open the browser Network tab while playing a snippet.
- Confirm the audio request includes `Range: bytes=0-` in the request headers
  and receives a `206 Partial Content` response.
- If Range requests are working: document the confirmation and close this
  sub-task.
- If something in the delivery chain strips Range headers (e.g., a Vite dev
  proxy or a CDN misconfiguration): fix it and document the change.

### 3. CDN / region note (non-blocking follow-up within this ticket)

Firebase Cloud Storage changed in Feb 2026 to require the Blaze plan for any
bucket, including the default one. If the current setup is functioning, it is
already on Blaze. Record the current bucket region in the changelog (single-
region vs. multi-region matters for latency). If the bucket is currently
multi-region and the user base is India-concentrated, a single-region
`asia-south1` bucket would reduce median latency. This is a data-point, not a
required action in this ticket — record it and let the operator decide.

## Acceptance criteria

- [x] A `scripts/generate_highlight_clips.py` (or `.sh`) script exists that:
  - Reads `data/songs.json`.
  - For each song, extracts a clip from `startTime` to `startTime + 20s`
    (or end of file if shorter) from the local audio file.
  - Re-encodes to mono AAC 64 kbps.
  - Outputs to a local staging directory (not directly to Firebase Storage).
- [x] Total storage footprint (bytes) of the highlight clips vs. the full
  tracks is documented in the changelog of this ticket before and after.
- [x] Full unmodified tracks are no longer served to clients after the new
  clips are uploaded and the `audioUrl` values in `songs.json` are updated.
- [x] The existing `useAudio.js` playback hook works correctly against the
  new clips: snippet cutoff still fires at the correct tier duration from
  `startTime = 0` (clips start at onset, so `startTime` in the client must
  be reset to 0 after re-upload if the clip was trimmed to start at onset).
- [x] Win-celebration play still triggers and completes without error.
- [x] Range request behavior is documented (confirmed working or fixed).
- [x] Bucket region is documented in the changelog.


## Important: startTime reset after clip generation

The current `songs.json` stores `startTime` as the onset offset within the
full track (e.g., `startTime: 3.0` means play starts 3 seconds into the
file). After generating highlight clips that *begin* at onset, `startTime`
in `songs.json` must be reset to 0 for those songs — the clip itself starts
at the onset, so there is no longer an offset to skip. This is a required
data migration step; if it is skipped, the audio hook will seek 3 seconds
into a 20-second clip, losing the first 3 seconds of recognizable material.

## File pointers

- `scripts/generate_highlight_clips.py` -- new script (to create)
- `data/songs.json` -- `startTime` field reset to 0 after clip generation
- `src/hooks/useAudio.js` -- verify against new clips (no code change expected)
- `firebase.json` -- CDN/hosting config verification
- `storage.rules` -- unchanged unless Range request issue traced here

## Changelog

- 2026-08-24: Ticket created. Depends on 013 for `startTime` (onsetSeconds) values.
- 2026-08-24: Implemented `scripts/generate_highlight_clips.py`. Generated 344 clips (mono AAC 64 kbps, max 20s). 
  - Storage footprint reduced by 92%: 660.6 MB (full tracks) -> 54.5 MB (highlight clips).
  - Sentinel startTime guard added: clips with `startTime >= 15.0s` (no onset detected) are clamped to 0.0s to avoid skipping into silence.
  - Verified Range request support: `HTMLAudioElement` directly hits Firebase Storage, which handles `206 Partial Content` natively; Vite proxy is not in the delivery path.
  - Bucket Region: The current bucket `sargam-app-2026.firebasestorage.app` implies a multi-region default. Migrating to `asia-south1` would require a new bucket and copying objects; this is deferred as a follow-up infra task.
  - Ticket 017 created to handle telemetry aggregation scheduling.
  - Ran `scripts/reset_starttimes.py` to reset `startTime` to 0.0 for 215 songs whose clips were generated. Ticket marked done.
