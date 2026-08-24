import json
import os
import re
import subprocess
import sys

NEW_SONGS_JSON = "new_songs.json"
DB_PATH = "data/songs.json"
OUT_DIR = os.path.expanduser("~/Documents/sargam_batch3")

os.makedirs(OUT_DIR, exist_ok=True)

with open(DB_PATH, 'r') as f:
    db = json.load(f)

with open(NEW_SONGS_JSON, 'r') as f:
    new_songs = json.load(f)

existing_ids = {s["id"] for s in db}
existing_titles = {s["title"].lower().strip() for s in db}

added_ids = []

for song in new_songs:
    title = song["title"].strip()
    artist = song["artist"].strip()
    movie = song["movie"].strip()
    
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    
    # Simple deduplication
    if slug in existing_ids or title.lower() in existing_titles:
        print(f"SKIPPING {title} - already in DB")
        continue

    print(f"DOWNLOADING {title} by {artist}...")
    
    # Adding 'full lyrics' as user requested
    search_query = f"{title} {artist} {movie} full lyrics"
    out_tmpl = os.path.join(OUT_DIR, f"{slug}.%(ext)s")
    
    cmd = [
        "yt-dlp",
        f"ytsearch1:{search_query}",
        "-x",
        "--audio-format", "m4a",
        "--audio-quality", "64k",
        "-o", out_tmpl,
        "--force-overwrites"
    ]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Determine year by existing DB or fallback
        # Let's just set a generic year since they are mostly 2010s
        year = 2012
        if movie == "Rockstar": year = 2011
        elif movie == "Barfi": year = 2012
        elif movie == "Yeh Jawaani Hai Deewani": year = 2013
        elif movie == "Kurbaan": year = 2009
        elif movie == "Rocky Handsome": year = 2016
        elif movie == "Chup Chup Ke": year = 2006
        elif movie == "Delhi 6": year = 2009
        elif movie == "Delhi Belly": year = 2011
        elif movie == "Nautanki Saala": year = 2013
        elif movie == "Vicky Donor": year = 2012
        elif movie == "Bareilly Ki Barfi": year = 2017
        elif movie == "Bhaag Milkha Bhaag": year = 2013
        elif movie == "Dabangg": year = 2010
        
        new_entry = {
            "id": slug,
            "title": title,
            "movie": movie,
            "artist": artist,
            "genre": "trending",
            "audioUrl": f"https://firebasestorage.googleapis.com/v0/b/sargam-app-2026.firebasestorage.app/o/audio%2F{slug}.m4a?alt=media",
            "startTime": 0,
            "difficulty": "medium",
            "year": year
        }
        db.append(new_entry)
        added_ids.append(slug)
        existing_ids.add(slug)
        existing_titles.add(title.lower())
        
        # Write back to JSON
        with open(DB_PATH, 'w') as f:
            json.dump(db, f, indent=2)
            
        print(f"  -> SUCCESS! Saved to {slug}.m4a")
        
    except subprocess.CalledProcessError:
        print(f"  -> ERROR downloading {title}")

# Save added IDs for processing later
with open('added_ids.json', 'w') as f:
    json.dump(added_ids, f)

print(f"\nDONE! Downloaded {len(added_ids)} new songs.")
