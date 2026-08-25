import json

with open("data/songs.json", "r") as f:
    songs = json.load(f)

with open("data/search_catalog.json", "r") as f:
    catalog = json.load(f)

catalog_ids = {s["id"] for s in catalog}
missing = []

for s in songs:
    if s["id"] not in catalog_ids:
        missing.append({
            "id": s["id"],
            "title": s.get("title", ""),
            "artist": s.get("artist", ""),
            "movie": s.get("movie", ""),
            "genre": s.get("genre", "")
        })

print(f"Found {len(missing)} playable songs missing from search catalog.")

if missing:
    catalog.extend(missing)
    with open("data/search_catalog.json", "w") as f:
        json.dump(catalog, f, indent=2)
    print("Catalog updated.")
