---
status: done
depends_on: [003, 001]
created: 2026-08-22
updated: 2026-08-22
---

# 006 — Live Audio Playback

## Context

Ticket 003 extracted `useAudio.js` and wired it to stub behavior. This ticket replaces the stub with real `HTMLAudioElement` playback that respects reveal tier cutoffs.

This ticket depends on ticket 001 (audio source decision) because at least some songs need a valid `audioUrl` to verify behavior. It can be started with placeholder audio URLs if ticket 001 is still `in-progress`, but it must be fully tested against real audio before being marked `done`.

Read before starting:
- `docs/architecture.md` section 2 (audio playback spec — client-side cutoff approach)
- `docs/spec.md` section 5 (playback mechanism decision and rationale)
- `docs/domain-model.md` section 1 (RevealTier fields — `cutoffSeconds` and `null` meaning)
- `src/hooks/useAudio.js` (created by ticket 003) — the file to complete

## Scope

**In scope:**

Complete `src/hooks/useAudio.js` with the following behavior:

1. Accept `{ audioUrl, revealTiers }` (the Song object) and `tierIndex` (current reveal tier index, 0-4).

2. Internally hold a single `HTMLAudioElement` ref. Create it once; do not recreate on tierIndex change.

3. When `audioUrl` changes (i.e. a new song loads), set `audio.src = audioUrl` and call `audio.load()`. Reset `currentTime = 0`. Do not autoplay.

4. `play()`:
   - Set `audio.currentTime = 0`
   - Call `audio.play()` (returns a Promise; handle rejection silently or log to console)
   - If `revealTiers[tierIndex].cutoffSeconds` is not null: attach a `timeupdate` listener that calls `audio.pause()` when `audio.currentTime >= cutoffSeconds`. Remove this listener after it fires.
   - If `cutoffSeconds` is null: do not attach a cutoff listener. Let the audio play to natural end.

5. `stop()`:
   - Call `audio.pause()` and reset `currentTime = 0`.
   - Remove any pending cutoff listener.

6. Expose `{ playing, play, stop }` where `playing` is true between `play()` and the next pause/end/stop.

7. Clean up the audio element and all listeners on component unmount.

8. Volume: read from settings state. The settings panel in `SettingsModal.jsx` has a "Song Audio" slider (0–100). Wire `audio.volume = songVolume / 100`. The volume value should be passed in as a prop/argument rather than read from a global.

**Out of scope:**
- Sound effects (separate audio element, deferred)
- Background music toggle (settings exists, behavior deferred)
- Lyric captions (settings exists, behavior deferred)
- Any visualization of playback progress (the mini-player in ResultModal is static for MVP)

## Acceptance criteria

- [x] Pressing Play starts audio from the beginning and stops at the correct cutoff for the current tier.
- [x] Pressing Play again after a cutoff replays from the beginning (not from where it stopped).
- [x] Tier 4 (cutoffSeconds: null) plays the full song without cutting off.
- [x] Advancing to the next tier (by guessing wrong or skipping) does not auto-play; the player must press Play again.
- [x] Song volume slider in Settings affects playback volume in real time.
- [x] No audio element leaks on remount (verify in browser DevTools: only one audio element in the DOM).
- [x] `status` is flipped to `done`.

## File pointers

- `src/hooks/useAudio.js` — the file to complete
- `docs/architecture.md` section 2 — authoritative playback spec
- `docs/domain-model.md` section 1 (RevealTier) — cutoffSeconds semantics
- `src/components/SettingsModal.jsx` — where song volume state lives; thread it down to useAudio

## Changelog

- 2026-08-22: Completed useAudio.js with HTMLAudioElement lifecycle, timeupdate-based tier cutoff, volume control binding, and cleanup.
