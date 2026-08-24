"""
Reset startTime to 0 in songs.json for all songs whose highlight clips have
been generated and uploaded.

This must run AFTER the highlight clips are uploaded to Firebase Storage and
the audioUrl values are still pointing at the same paths. The clip files start
at the onset (which was the old startTime), so the offset is now 0 from the
client's perspective.

Usage:
  python3 scripts/reset_starttimes.py [--clip-dir PATH] [--dry-run]

The clip-dir defaults to data/highlight_clips/. Only songs whose clip exists
in that directory are reset (so partial uploads don't silently break songs
whose clips were not yet uploaded).
"""

import argparse
import json
import os

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
DEFAULT_CLIP_DIR = os.path.join(os.path.dirname(__file__), "../data/highlight_clips")


def main():
    parser = argparse.ArgumentParser(
        description="Reset startTime to 0 for songs with generated highlight clips."
    )
    parser.add_argument("--clip-dir", default=DEFAULT_CLIP_DIR,
                        help="Directory containing the generated clip files.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print changes without modifying songs.json.")
    args = parser.parse_args()

    with open(SONGS_FILE) as f:
        songs = json.load(f)

    clip_dir = args.clip_dir
    if not os.path.isdir(clip_dir):
        print(f"Clip directory not found: {clip_dir}")
        return

    clips_present = {
        os.path.splitext(f)[0]
        for f in os.listdir(clip_dir)
        if f.endswith(".m4a")
    }

    reset_count = 0
    skipped_count = 0

    for song in songs:
        sid = song["id"]
        old_start = song.get("startTime", 0.0)

        if sid not in clips_present:
            skipped_count += 1
            continue

        if old_start == 0.0:
            # Already 0 or was always 0 — no-op.
            continue

        if args.dry_run:
            print(f"DRY {sid}: startTime {old_start:.3f}s -> 0.0s")
        else:
            song["startTime"] = 0.0

        reset_count += 1

    print(f"\nClips found: {len(clips_present)}")
    print(f"Songs reset: {reset_count} (startTime -> 0.0)")
    print(f"Songs without clip (skipped): {skipped_count}")

    if args.dry_run:
        print("[dry-run] songs.json not modified.")
        return

    with open(SONGS_FILE, "w") as f:
        json.dump(songs, f, indent=2)
    print(f"songs.json updated.")


if __name__ == "__main__":
    main()
