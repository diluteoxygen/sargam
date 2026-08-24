# Plan: End-Game Streaming Links

## 1. Goal
Provide genuine, verified links to Spotify, Apple Music, and YouTube on the end-game screen so users can listen to the full songs. Avoid dead links by verifying presence before displaying icons.

## 2. Schema Updates
We will add a new `links` object to each song entry in `data/songs.json`:
```json
"links": {
  "spotify": "https://open.spotify.com/track/...",
  "apple": "https://music.apple.com/...",
  "youtube": "https://www.youtube.com/watch?v=..."
}
```
*If a song is missing from a platform, its value will be explicitly set to `null`.*

## 3. Data Population Strategy
Since we have 343 songs, doing this manually is impossible. We will write an automated enrichment script (`scripts/enrich_streaming_links.py`) to fetch these links programmatically:

### A. YouTube
- **Method:** We will use `yt-dlp` (the same tool we used for audio ingestion).
- **Execution:** Run `yt-dlp "ytsearch1:{title} {artist}" --get-id`
- **Result:** Returns the exact video ID, which guarantees a 100% playable, non-dead YouTube link (`https://www.youtube.com/watch?v={id}`).

### B. Apple Music
- **Method:** We will use the **iTunes Search API**. It is completely public, free, and does not require authentication.
- **Execution:** Query `https://itunes.apple.com/search?term={title}+{artist}&entity=song&limit=1`.
- **Result:** If a match is found, we extract the `trackViewUrl`. If the API returns no results, we set the link to `null`.

### C. Spotify
- **Method:** We will use the official **Spotify Web API** via the `spotipy` Python library.
- **Requirement:** Because Spotify heavily blocks scraping, **we will need you to provide a Spotify Client ID and Secret**. 
- **Execution:** Query the `/v1/search` endpoint. If found, we extract `external_urls.spotify`. If not, we set it to `null`.

## 4. UI Implementation
We will update the `EndGame` or `PostGame` component:
- Add a `"Listen on:"` section below the result stats.
- Use SVG icons for Spotify, Apple Music, and YouTube.
- **Conditional Rendering:** 
  ```jsx
  {song.links?.spotify && (
    <a href={song.links.spotify} target="_blank" rel="noreferrer" title="Listen on Spotify">
      <SpotifyIcon />
    </a>
  )}
  ```
- This ensures users only ever see icons for verified, working links.

## 5. Next Steps / Action Items
To execute this plan, I need you to do **one** thing:
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an App (name it anything, e.g., "Sargam Links").
3. Get the **Client ID** and **Client Secret**.
4. Drop them in a `.env` file or provide them securely in our chat.

Once you provide the Spotify credentials, I will write and execute the script to map all 343 songs, and then implement the UI components!
