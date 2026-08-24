import json
import os
import subprocess
import urllib.parse
import urllib.request
import time
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed

DB_PATH = "data/songs.json"

def get_spotify_token():
    try:
        import requests
        with open("secrets/.env") as f:
            env_vars = dict(line.strip().split('=') for line in f if '=' in line)
        client_id = env_vars.get("clientID", "").strip()
        client_secret = env_vars.get("secret", "").strip()

        if not client_id or not client_secret:
            return None

        auth_str = f"{client_id}:{client_secret}"
        b64_auth_str = base64.b64encode(auth_str.encode()).decode()
        resp = requests.post(
            "https://accounts.spotify.com/api/token",
            headers={"Authorization": f"Basic {b64_auth_str}"},
            data={"grant_type": "client_credentials"}
        )
        if resp.status_code == 200:
            return resp.json().get("access_token")
        else:
            print(f"Spotify Auth failed: {resp.text}")
    except Exception as e:
        print(f"Spotify Auth error: {e}")
    return None

def get_spotify_link(token, title, artist):
    if not token:
        return None
    try:
        import requests
        query = urllib.parse.quote_plus(f"track:{title} artist:{artist}")
        url = f"https://api.spotify.com/v1/search?q={query}&type=track&limit=1"
        resp = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("tracks", {}).get("items", [])
            if items:
                return items[0].get("external_urls", {}).get("spotify")
        elif resp.status_code == 403:
            # Usually implies Premium required for Developer App
            pass
    except Exception:
        pass
    return None

def get_youtube_link(title, artist):
    query = f"{title} {artist} song"
    cmd = ["yt-dlp", f"ytsearch1:{query}", "--get-id"]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        out = result.stdout.strip()
        lines = out.split('\n')
        for line in reversed(lines):
            line = line.strip()
            if line and not line.startswith("WARNING"):
                return f"https://www.youtube.com/watch?v={line}"
    except Exception:
        pass
    return None

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
    
    spotify_token = get_spotify_token()
    updated_count = 0
    
    # 1. YouTube (Parallel, safe to hit hard)
    print("--- Fetching YouTube Links ---")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for s in db:
            links = s.get("links", {})
            if not links.get("youtube"):
                futures[executor.submit(get_youtube_link, s["title"], s["artist"])] = s
                
        for future in as_completed(futures):
            s = futures[future]
            yt = future.result()
            if "links" not in s: s["links"] = {}
            if yt:
                s["links"]["youtube"] = yt
                updated_count += 1
                print(f"[YT] Added: {s['title']}")
                
    # 2. Apple & Spotify (Sequential to avoid rate limits)
    print("--- Fetching Apple & Spotify Links ---")
    apple_blocked = False
    
    for s in db:
        if "links" not in s: s["links"] = {}
        links = s["links"]
        
        # Apple Music
        if not links.get("apple") and not apple_blocked:
            ap = get_apple_link(s["title"], s["artist"])
            if ap == "403":
                print("[Apple] Rate limit hit (403). Halting Apple Music fetches for this run.")
                apple_blocked = True
            elif ap:
                links["apple"] = ap
                updated_count += 1
                print(f"[Apple] Added: {s['title']}")
            if not apple_blocked:
                time.sleep(1.5) # Gentle rate limit
                
        # Spotify
        if not links.get("spotify") and spotify_token:
            sp = get_spotify_link(spotify_token, s["title"], s["artist"])
            if sp:
                links["spotify"] = sp
                updated_count += 1
                print(f"[Spotify] Added: {s['title']}")
            time.sleep(0.5)

    if updated_count > 0:
        with open(DB_PATH, 'w') as f:
            json.dump(db, f, indent=2)
        print(f"Saved DB with {updated_count} new link updates.")
    else:
        print("No new links were added.")

if __name__ == "__main__":
    main()
