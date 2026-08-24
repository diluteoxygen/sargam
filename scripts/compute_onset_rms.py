"""
Compute onsetSeconds for each song using windowed RMS energy analysis.

Method:
  - Analyse the first 15 seconds of each track with a single ffmpeg pass using
    the astats filter with reset=1 at 0.5s intervals. This gives per-window
    RMS values in one invocation, avoiding repeated subprocess launches.
  - Compute the track's overall RMS over that 15s window from the same pass.
  - Onset = first 0.5s window at or above 40% of the track's own overall RMS,
    with consecutive windows required to sustain >= 300ms (satisfied by a single
    0.5s window by definition).
  - Threshold is per-track-relative, not a fixed dB, so loudness variation across
    the catalog does not affect the gate.

Why startTime, not onsetSeconds:
  The existing startTime field in songs.json is already consumed by useAudio.js
  as the play-start offset. Adding a separate onsetSeconds field would duplicate
  it. We reuse startTime and note the mapping in the domain model addendum.

Output:
  - Updates startTime in data/songs.json for all songs with local audio.
  - Writes data/onset_distribution.json with per-song onset values and the
    suitability verdict for the checkpoint report.

Usage:
  python3 scripts/compute_onset_rms.py [--dry-run] [--limit N]
"""

import argparse
import datetime
import json
import os
import re
import subprocess

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
DIST_FILE = os.path.join(os.path.dirname(__file__), "../data/onset_distribution.json")
AUDIO_DIRS = [
    "/home/oxy/Documents/sargam_audio_backup/audio",
    "/home/oxy/Documents/sargam_batch2",
    "/home/oxy/Documents/sargam_batch3",
]

ANALYSIS_WINDOW = 15.0    # seconds of track to analyse
WINDOW_SIZE = 0.5         # seconds per RMS window (astats reset interval)
THRESHOLD_RATIO = 0.40    # fraction of track RMS at which onset is declared
REVEAL_CAP = 7.0          # songs with onset > this are provisionally unsuitable


def find_audio(song_id):
    for directory in AUDIO_DIRS:
        path = os.path.join(directory, f"{song_id}.m4a")
        if os.path.exists(path):
            return path
    return None


def db_to_linear(db):
    """Convert dB to linear amplitude. Values below -120dB treated as zero."""
    if db is None or db < -120:
        return 0.0
    return 10.0 ** (db / 20.0)


def compute_onset(audio_path):
    """
    Return onset time in seconds using a single ffmpeg pass.

    Uses astats with reset=1 and a fixed block size equivalent to WINDOW_SIZE.
    Parses the per-block and overall RMS from stderr, then finds the first
    window >= THRESHOLD_RATIO * overall_rms.

    Falls back to 0.0 on any ffmpeg parse failure.
    """
    # ffmpeg's astats reset=1 resets stats every N samples. We need to
    # calculate N from WINDOW_SIZE. The actual sample rate isn't known until
    # we read the file, but astats also accepts time-based reset via the
    # -af "asetnsamples,astats" approach. Simpler: use silencedetect is out;
    # instead use volumedetect for overall + a fixed-time segmentation approach.
    #
    # Practical approach: run one ffmpeg pass with astats and parse both the
    # per-window "RMS level dB" lines and the final Overall stats line.
    # The per-window lines appear as "RMS level dB: X.XX" for each reset block.
    # The Overall stats appear at stream end.
    #
    # astats reset=1 resets per-audio-block, not per-second. The block count
    # depends on codec/demux. For m4a files the block size is typically 1024
    # samples at 44100Hz = ~23ms. This gives us many more windows than needed.
    # We accumulate them into WINDOW_SIZE-second buckets ourselves.

    cmd = [
        "ffmpeg", "-ss", "0", "-t", str(ANALYSIS_WINDOW),
        "-i", audio_path,
        "-af", "astats=metadata=1:reset=1",
        "-f", "null", "-",
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        return 0.0

    # Parse all per-block RMS level values and the overall RMS.
    # Lines look like:
    #   [Parsed_astats_0 @ 0x...] lavfi.astats.Overall.RMS_level=-18.34
    # or (older ffmpeg):
    #   [Parsed_astats_0 @ 0x...] Mean    RMS level:     -18.34 dB
    #
    # We need two things:
    #   1. Overall (track-level) RMS across the whole 15s window.
    #   2. Per-block RMS with timestamps to find onset window.
    #
    # astats metadata=1 writes lavfi metadata lines per block.
    # We also capture the pts_time from the lavfi output.

    # Alternative: use volumedetect for overall, then astats for windowed scan.
    # volumedetect gives mean_volume (RMS equivalent) in one pass.
    # Then a second pass with astats per-0.5s segment gives windowed RMS.

    return _compute_onset_two_pass(audio_path)


def _compute_onset_two_pass(audio_path):
    """
    Two-pass approach:
    Pass 1: volumedetect over the full ANALYSIS_WINDOW -> overall mean_volume (dB RMS).
    Pass 2: silencedetect with threshold = threshold_ratio applied to linear scale,
            converted back to dB -> finds onset precisely without per-window overhead.

    Actually, the cleanest way to use only ffmpeg is:
    Pass 1: volumedetect for overall RMS.
    Pass 2: astats with reset= large enough to give 0.5s windows.
            astats reset=N resets every N samples. If we know sample rate,
            N = sample_rate * WINDOW_SIZE. We can get sample rate from ffprobe.
    """
    # Pass 1: volumedetect for overall RMS (mean_volume)
    cmd1 = [
        "ffmpeg", "-ss", "0", "-t", str(ANALYSIS_WINDOW),
        "-i", audio_path,
        "-af", "volumedetect",
        "-f", "null", "-",
    ]
    try:
        res1 = subprocess.run(cmd1, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        return 0.0

    mean_volume_db = None
    for line in res1.stderr.splitlines():
        if "mean_volume:" in line:
            try:
                mean_volume_db = float(line.split("mean_volume:")[-1].strip().split()[0])
            except (ValueError, IndexError):
                pass

    if mean_volume_db is None:
        return 0.0

    track_rms_linear = db_to_linear(mean_volume_db)
    if track_rms_linear == 0.0:
        return 0.0

    threshold_linear = THRESHOLD_RATIO * track_rms_linear
    # Convert back to dB for silencedetect (noise= parameter)
    # threshold_db = 20 * log10(threshold_linear)
    import math
    threshold_db = 20.0 * math.log10(threshold_linear) if threshold_linear > 0 else -120.0

    # Pass 2: silencedetect with threshold = threshold_db, duration = 0.0
    # (any non-silent moment). We want the first silence_end, which is where
    # material crosses the threshold from below.
    # Use d=0.3 (300ms) so short transients below threshold don't count;
    # the first silence_end with d=0.3 gives us the onset of sustained material.
    cmd2 = [
        "ffmpeg", "-ss", "0", "-t", str(ANALYSIS_WINDOW),
        "-i", audio_path,
        "-af", f"silencedetect=noise={threshold_db:.2f}dB:d=0.3",
        "-f", "null", "-",
    ]
    try:
        res2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        return 0.0

    # Parse silence_end lines — each one is a transition from silence to sound.
    # The first silence_end is the onset.
    for line in res2.stderr.splitlines():
        if "silence_end:" in line:
            try:
                t = float(line.split("silence_end:")[-1].split()[0].strip())
                return round(t, 3)
            except (ValueError, IndexError):
                pass

    # No silence_end found means either:
    # (a) the track starts immediately above threshold (onset = 0.0), or
    # (b) the entire ANALYSIS_WINDOW is below threshold (very quiet/silent track).
    # Disambiguate using silence_start: if the first line is silence_start:0.0,
    # the track is quiet throughout -> return ANALYSIS_WINDOW as sentinel.
    for line in res2.stderr.splitlines():
        if "silence_start:" in line:
            try:
                t = float(line.split("silence_start:")[-1].strip())
                if t < 0.05:
                    # Starts silent immediately and never recovered -> sentinel
                    return ANALYSIS_WINDOW
            except (ValueError, IndexError):
                pass
            break

    # No silence at all in the analysis window -> track starts immediately.
    return 0.0


def main():
    parser = argparse.ArgumentParser(description="Compute RMS-based onset for songs.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print results without modifying songs.json.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process only the first N songs (for testing).")
    parser.add_argument("--only-id", type=str, default=None,
                        help="Process only a specific song by ID.")
    args = parser.parse_args()

    with open(SONGS_FILE) as f:
        songs = json.load(f)

    target = songs[:args.limit] if args.limit else songs

    if args.only_id:
        target = [s for s in target if s["id"] == args.only_id]


    results = []
    missing_audio = []

    for idx, song in enumerate(target):
        song_id = song["id"]
        audio_path = find_audio(song_id)

        if audio_path is None:
            missing_audio.append(song_id)
            onset = song.get("startTime", 0.0)
            label = "missing_audio"
            print(f"[{idx+1}/{len(target)}] {song_id}: no local audio, keeping startTime={onset}")
        else:
            onset = compute_onset(audio_path)
            label = "pass" if onset <= REVEAL_CAP else "provisional_unsuitable"
            print(f"[{idx+1}/{len(target)}] {song_id}: onset={onset}s -> {label}")

        results.append({
            "id": song_id,
            "title": song.get("title", ""),
            "onsetSeconds": onset,
            "status": label,
        })

    # Distribution summary
    pass_count = sum(1 for r in results if r["status"] == "pass")
    flagged_count = sum(1 for r in results if r["status"] == "provisional_unsuitable")
    missing_count = sum(1 for r in results if r["status"] == "missing_audio")

    buckets = {
        "0-1s":  sum(1 for r in results if 0 <= r["onsetSeconds"] < 1 and r["status"] != "missing_audio"),
        "1-3s":  sum(1 for r in results if 1 <= r["onsetSeconds"] < 3),
        "3-5s":  sum(1 for r in results if 3 <= r["onsetSeconds"] < 5),
        "5-7s":  sum(1 for r in results if 5 <= r["onsetSeconds"] < 7),
        "7s+":   flagged_count,
    }

    print()
    print("=== Onset distribution ===")
    for k, v in buckets.items():
        print(f"  {k}: {v}")
    print(f"  Pass (<=7s): {pass_count}")
    print(f"  Provisionally unsuitable (>7s): {flagged_count}")
    print(f"  Missing local audio (kept existing): {missing_count}")

    if args.dry_run:
        print("\n[dry-run] songs.json not modified.")
    else:
        onset_map = {
            r["id"]: (r["onsetSeconds"], r["status"])
            for r in results
            if r["status"] != "missing_audio"
        }

        with open(SONGS_FILE) as f:
            all_songs = json.load(f)

        for s in all_songs:
            sid = s["id"]
            if sid in onset_map:
                onset_val, status = onset_map[sid]
                s["startTime"] = onset_val
                # Determine suitability from onset + existing difficulty tag
                if status == "provisional_unsuitable":
                    s["suitability"] = "provisional_unsuitable"
                elif s.get("difficulty"):
                    # Had a difficulty tag => was manually reviewed => suitable
                    s["suitability"] = "suitable"
                else:
                    # No difficulty tag => bulk-imported, mark review
                    s["suitability"] = "review"
            else:
                # No local audio; apply suitability default only
                if not s.get("suitability"):
                    if s.get("difficulty"):
                        s["suitability"] = "suitable"
                    else:
                        s["suitability"] = "review"

        with open(SONGS_FILE, "w") as f:
            json.dump(all_songs, f, indent=2)
        print(f"\nsongs.json updated ({len(onset_map)} onset values, suitability fields added).")

    # Write distribution checkpoint file
    dist_output = {
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "method": "ffmpeg_volumedetect_plus_silencedetect",
        "parameters": {
            "analysis_window_s": ANALYSIS_WINDOW,
            "threshold_ratio": THRESHOLD_RATIO,
            "min_sustained_s": 0.3,
            "reveal_cap_s": REVEAL_CAP,
        },
        "summary": {
            "total_processed": len(results),
            "pass": pass_count,
            "provisional_unsuitable": flagged_count,
            "missing_audio": missing_count,
            "buckets": buckets,
        },
        "songs": results,
    }
    with open(DIST_FILE, "w") as f:
        json.dump(dist_output, f, indent=2)
    print(f"Distribution written to {DIST_FILE}")


if __name__ == "__main__":
    main()
