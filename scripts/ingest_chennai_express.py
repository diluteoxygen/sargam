import json
import subprocess
import os
import re
import math

OUT_DIR = os.path.expanduser("~/Documents/sargam_batch2")
CLIPS_DIR = "data/highlight_clips"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

songs_to_add = [
    {"title": "1 2 3 4 Get on the Dance Floor", "artist": "Vishal Dadlani, Hamsika Iyer"},
    {"title": "Titli", "artist": "Chinmayi, Gopi Sunder"},
    {"title": "Tera Rastaa Chhodoon Na", "artist": "Amitabh Bhattacharya, Anusha Mani"},
    {"title": "Kashmir Main Tu Kanyakumari", "artist": "Sunidhi Chauhan, Arijit Singh, Neeti Mohan"},
    {"title": "Lungi Dance", "artist": "Yo Yo Honey Singh"}
]

def db_to_linear(db):
    return 10.0 ** (db / 20.0)

def compute_onset(audio_path):
    cmd1 = [
        "ffmpeg", "-ss", "0", "-t", "40.0",
        "-i", audio_path,
        "-af", "volumedetect",
        "-f", "null", "-"
    ]
    res1 = subprocess.run(cmd1, capture_output=True, text=True)
    mean_volume_db = None
    for line in res1.stderr.splitlines():
        if "mean_volume:" in line:
            try:
                mean_volume_db = float(line.split("mean_volume:")[-1].strip().split()[0])
            except: pass

    if mean_volume_db is None: return 0.0

    track_rms = db_to_linear(mean_volume_db)
    threshold = 0.50 * track_rms
    threshold_db = 20.0 * math.log10(threshold) if threshold > 0 else -120.0

    cmd2 = [
        "ffmpeg", "-ss", "0", "-t", "40.0",
        "-i", audio_path,
        "-af", f"silencedetect=noise={threshold_db:.2f}dB:d=0.3",
        "-f", "null", "-"
    ]
    res2 = subprocess.run(cmd2, capture_output=True, text=True)
    for line in res2.stderr.splitlines():
        if "silence_end:" in line:
            try:
                return round(float(line.split("silence_end:")[-1].split()[0].strip()), 3)
            except: pass
    return 0.0

with open("data/songs.json", 'r') as f:
    db = json.load(f)

for song in songs_to_add:
    slug = re.sub(r'[^a-z0-9]+', '-', song["title"].lower()).strip('-')
    raw_path = os.path.join(OUT_DIR, f"{slug}.m4a")
    clip_path = os.path.join(CLIPS_DIR, f"{slug}.m4a")
    
    print(f"--- DOWNLOADING: {song['title']} ---")
    query = f"{song['title']} {song['artist']} chennai express lyric"
    subprocess.run([
        "yt-dlp", f"ytsearch1:{query}", "-x", "--audio-format", "m4a",
        "--audio-quality", "64k", "-o", raw_path, "--force-overwrites"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if not os.path.exists(raw_path):
        print("FAILED to download.")
        continue
        
    print("Computing onset...")
    onset = compute_onset(raw_path)
    print(f"Onset: {onset}s")
    
    print("Extracting 20s highlight clip...")
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(onset), "-t", "21.0",
        "-i", raw_path,
        "-c", "copy", clip_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    print("Appending to db...")
    new_entry = {
        "id": slug,
        "title": song["title"],
        "movie": "Chennai Express",
        "artist": song["artist"],
        "genre": "trending",
        "audioUrl": f"https://firebasestorage.googleapis.com/v0/b/sargam-app-2026.firebasestorage.app/o/audio%2F{slug}.m4a?alt=media",
        "startTime": 0.0,
        "difficulty": "easy",
        "year": 2013,
        "suitability": "suitable"
    }
    db.append(new_entry)
    
    with open("data/songs.json", "w") as f:
        json.dump(db, f, indent=2)
        
    try:
        with open("data/search_catalog.json", "r") as sc_file:
            sc = json.load(sc_file)
        sc.append({
            "id": slug,
            "title": song["title"],
            "artist": song["artist"],
            "movie": "Chennai Express",
            "genre": "trending"
        })
        with open("data/search_catalog.json", "w") as sc_file:
            json.dump(sc, sc_file, indent=2)
    except: pass

print("Done generating clips and JSON.")
