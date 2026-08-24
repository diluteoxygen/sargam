import json
import re

DB_PATH = "data/songs.json"

# Extract text from ingest_songs.py
with open("scripts/ingest_songs.py", "r") as f:
    content = f.read()
    
match = re.search(r'SONGS_TEXT = """(.*?)"""', content, re.DOTALL)
if not match:
    print("Could not find SONGS_TEXT")
    exit(1)
    
songs_text = match.group(1).strip()

parsed_titles = set()
for line in songs_text.split("\n"):
    m = re.match(r'\d+\.\s\*\*(.+?)\*\*\s[–-]\s(.+)', line)
    if m:
        parsed_titles.add(m.group(1).strip().lower())

with open(DB_PATH, "r") as f:
    db = json.load(f)

tagged = 0
for song in db:
    title_lower = song.get("title", "").strip().lower()
    if title_lower in parsed_titles:
        song["difficulty"] = "super-easy"
        tagged += 1

with open(DB_PATH, "w") as f:
    json.dump(db, f, indent=2)

print(f"Successfully tagged {tagged} songs as super-easy!")
