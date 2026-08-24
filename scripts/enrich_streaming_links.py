import json
import urllib.parse
import urllib.request
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

DB_PATH = "data/songs.json"

def get_apple_link(title, artist):
    query = urllib.parse.quote_plus(f"{title} {artist}")
    url = f"https://itunes.apple.com/search?term={query}&entity=song&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.getcode() == 200:
                data = json.loads(response.read().decode())
                if data.get("resultCount", 0) > 0:
                    return data["results"][0].get("trackViewUrl")
    except urllib.error.HTTPError as e:
        if e.code == 403:
            return "403"
    except Exception:
        pass
    return None

def main():
    with open(DB_PATH) as f:
        db = json.load(f)
        
    print(f"Starting enrichment for {len(db)} songs...")
    updated_count = 0
    
    print("--- Fetching Apple Music Links ---")
    apple_blocked = False
    
    for idx, s in enumerate(db):
        if "links" not in s: s["links"] = {}
        links = s["links"]
        
        # Apple Music
        if not links.get("apple") and not apple_blocked:
            ap = get_apple_link(s["title"], s["artist"])
            if ap == "403":
                print(f"[{idx}/{len(db)}] [Apple] Rate limit hit (403). Halting.")
                apple_blocked = True
            elif ap:
                links["apple"] = ap
                updated_count += 1
                if updated_count % 5 == 0:
                    with open(DB_PATH, "w") as f:
                        json.dump(db, f, indent=2)
                print(f"[{idx}/{len(db)}] [Apple] Added: {s['title']}")
            else:
                print(f"[{idx}/{len(db)}] [Apple] Not found: {s['title']}")
                
            if not apple_blocked:
                # To respect ~20 req/min limit
                time.sleep(2.5)

    if updated_count > 0:
        with open(DB_PATH, 'w') as f:
            json.dump(db, f, indent=2)
        print(f"Saved DB with {updated_count} new link updates.")
    else:
        print("No new links were added.")

if __name__ == "__main__":
    main()
