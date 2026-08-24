"""
Generate a 20-second highlight clip per song, starting at song.startTime
(the RMS-based onset computed in ticket 013), re-encoded to mono AAC 64 kbps.

These clips replace the full audio tracks served to game clients. They cover:
  - All reveal tiers (max cutoff is 7s from onset in the default tier array)
  - A buffer for the win-celebration play (~13s of extra audio after the last tier)

After uploading the clips to Firebase Storage and updating audioUrl in songs.json,
reset startTime to 0 for every song whose clip was generated -- the clip starts
at onset, so there is no longer an offset to skip from within the file.

Usage:
  python3 scripts/generate_highlight_clips.py [--dry-run] [--limit N] [--only-id SONG_ID]

Output directory: data/highlight_clips/ (created if absent)
Each clip is named <song_id>.m4a, matching the existing Firebase Storage path
convention so re-upload replaces files in-place.

After reviewing the spot-check sample (data/highlight_clips_spotcheck/), run
this script without --dry-run to generate all 345 clips.
"""

import argparse
import json
import os
import subprocess
import sys

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
OUT_DIR = os.path.join(os.path.dirname(__file__), "../data/highlight_clips")

AUDIO_DIRS = [
    "/home/oxy/Documents/sargam_audio_backup/audio",
    "/home/oxy/Documents/sargam_batch2",
    "/home/oxy/Documents/sargam_batch3",
]

CLIP_DURATION = 20.0   # seconds
BITRATE = "64k"        # mono AAC target bitrate


def find_audio(song_id):
    for directory in AUDIO_DIRS:
        path = os.path.join(directory, f"{song_id}.m4a")
        if os.path.exists(path):
            return path
    return None


def get_duration(audio_path):
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "json",
        audio_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(json.loads(res.stdout)["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError):
        return None


def generate_clip(audio_path, start, clip_duration, out_path):
    """Extract and re-encode a clip. Returns (True, size_bytes) or (False, error_str)."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-t", str(clip_duration),
        "-i", audio_path,
        "-ac", "1",            # mono
        "-c:a", "aac",
        "-b:a", BITRATE,
        "-movflags", "+faststart",
        out_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        return False, res.stderr[-400:]
    return True, os.path.getsize(out_path)


def main():
    parser = argparse.ArgumentParser(
        description="Generate 20s mono 64kbps highlight clips for all songs."
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be done without creating files.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process only the first N songs (for testing).")
    parser.add_argument("--only-id", default=None,
                        help="Process a single song by ID.")
    args = parser.parse_args()

    with open(SONGS_FILE) as f:
        songs = json.load(f)

    if args.only_id:
        songs = [s for s in songs if s["id"] == args.only_id]
        if not songs:
            print(f"No song found with id: {args.only_id}")
            sys.exit(1)
    elif args.limit:
        songs = songs[:args.limit]

    if not args.dry_run:
        os.makedirs(OUT_DIR, exist_ok=True)

    total_in = 0
    total_out = 0
    skipped = 0
    failed = []

    for idx, song in enumerate(songs):
        song_id = song["id"]
        start = song.get("startTime", 0.0)

        # A startTime of 15.0 is the sentinel value from compute_onset_rms.py
        # meaning no onset was detected within the 15s analysis window. These
        # songs are provisional_unsuitable and excluded from the play pool, but
        # if a clip is generated for them anyway, clamp start to 0 so the clip
        # at least starts from the beginning rather than from a silent section.
        if start >= 15.0:
            print(
                f"[{idx+1}/{len(songs)}] WARN {song_id}: sentinel startTime={start}s "
                f"(onset never found), clamping to 0"
            )
            start = 0.0

        audio_path = find_audio(song_id)

        if audio_path is None:
            print(f"[{idx+1}/{len(songs)}] SKIP {song_id}: no local audio file")
            skipped += 1
            continue

        dur = get_duration(audio_path)
        if dur is None:
            print(f"[{idx+1}/{len(songs)}] SKIP {song_id}: could not read duration")
            skipped += 1
            continue

        clip_duration = min(CLIP_DURATION, dur - start)
        if clip_duration <= 0:
            print(f"[{idx+1}/{len(songs)}] SKIP {song_id}: startTime {start:.2f}s >= track duration {dur:.2f}s")
            skipped += 1
            continue

        in_size = os.path.getsize(audio_path)
        total_in += in_size

        out_path = os.path.join(OUT_DIR, f"{song_id}.m4a")

        if args.dry_run:
            print(
                f"[{idx+1}/{len(songs)}] DRY {song_id}: "
                f"start={start:.2f}s dur={clip_duration:.1f}s "
                f"src={in_size//1024}KB -> {out_path}"
            )
            continue

        ok, result = generate_clip(audio_path, start, clip_duration, out_path)
        if ok:
            out_size = result
            total_out += out_size
            print(
                f"[{idx+1}/{len(songs)}] OK {song_id}: "
                f"start={start:.2f}s dur={clip_duration:.1f}s "
                f"{in_size//1024}KB -> {out_size//1024}KB "
                f"({100*out_size//in_size}%)"
            )
        else:
            failed.append((song_id, result))
            print(f"[{idx+1}/{len(songs)}] FAIL {song_id}: {result[:120]}")

    print()
    if args.dry_run:
        print(f"[dry-run] Would process {len(songs) - skipped} songs, skip {skipped}.")
        return

    print(f"=== Summary ===")
    print(f"Processed: {len(songs) - skipped - len(failed)}")
    print(f"Skipped (no audio): {skipped}")
    print(f"Failed: {len(failed)}")
    if total_in > 0:
        print(f"Input total:  {total_in:,} bytes ({total_in/1024/1024:.1f} MB)")
        print(f"Output total: {total_out:,} bytes ({total_out/1024/1024:.1f} MB)")
        print(f"Reduction:    {100 - 100*total_out//total_in}%")
    if failed:
        print("\nFailed songs:")
        for sid, err in failed:
            print(f"  {sid}: {err[:80]}")


if __name__ == "__main__":
    main()
