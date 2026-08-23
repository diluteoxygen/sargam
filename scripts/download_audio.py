import os
import json
import subprocess

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "../public/audio")

os.makedirs(AUDIO_DIR, exist_ok=True)

with open(SONGS_FILE, "r") as f:
    songs = json.load(f)

downloaded_count = 0
for idx, s in enumerate(songs):
    song_id = s["id"]
    target_path = os.path.join(AUDIO_DIR, f"{song_id}.mp3")
    if os.path.exists(target_path) and os.path.getsize(target_path) > 100000:
        s["audioUrl"] = f"/audio/{song_id}.mp3"
        downloaded_count += 1
        print(f"[{idx+1}/{len(songs)}] Already downloaded: {s['title']} ({song_id})")
        continue

    query = f"{s['title']} {s['movie']} {s['artist']} full lyrics"
    print(f"[{idx+1}/{len(songs)}] Downloading: {s['title']} - {query}")
    cmd = [
        "python3", "-m", "yt_dlp",
        f"ytsearch1:{query}",
        "-x",
        "--audio-format", "mp3",
        "-o", os.path.join(AUDIO_DIR, f"{song_id}.%(ext)s"),
        "--max-filesize", "15M",
        "--no-playlist"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(target_path):
        s["audioUrl"] = f"/audio/{song_id}.mp3"
        downloaded_count += 1
        print(f"[{idx+1}/{len(songs)}] Success: {s['title']}")
    else:
        print(f"[{idx+1}/{len(songs)}] Failed: {s['title']}")

with open(SONGS_FILE, "w") as f:
    json.dump(songs, f, indent=2)

print(f"Finished! Total songs with audio: {downloaded_count}/{len(songs)}. Updated {SONGS_FILE}.")
