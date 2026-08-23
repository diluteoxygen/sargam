import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEFAULT_TIERS, HARD_TIERS } from "../src/lib/tiers.js";
import { exec } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
const port = process.env.PORT || 3001;

const catalogPath = path.join(__dirname, "../data/songs.json");

let rawSongs;
try {
  const content = fs.readFileSync(catalogPath, "utf-8");
  rawSongs = JSON.parse(content);
} catch (err) {
  console.error("Failed to load catalog from " + catalogPath, err);
  process.exit(1);
}

const songs = rawSongs.map((s) => ({
  ...s,
  startTime: typeof s.startTime === "number" ? s.startTime : 0,
  revealTiers: s.revealTiers || (s.difficulty === "hard" ? HARD_TIERS : DEFAULT_TIERS)
}));

const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

app.get("/api/daily", (req, res) => {
  const now = Date.now();
  const dayIndex = Math.floor(now / 86400000) % songs.length;
  const todayUTCDateString = new Date(Math.floor(now / 86400000) * 86400000)
    .toISOString()
    .slice(0, 10);

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({
    date: todayUTCDateString,
    song: songs[dayIndex]
  });
});

// Per-mode song endpoint. Deterministic per UTC day per mode.
// Mode offsets ensure different songs per mode on the same day.
const MODE_OFFSETS = { daily: 0, all: 7, "golden-era": 13, "new-age": 19 };

app.get("/api/song", (req, res) => {
  const mode = req.query.mode || "daily";
  const now = Date.now();
  const todayUTCDateString = new Date(Math.floor(now / 86400000) * 86400000)
    .toISOString()
    .slice(0, 10);

  if (mode === "daily") {
    const dayIndex = Math.floor(now / 86400000) % songs.length;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json({ date: todayUTCDateString, song: songs[dayIndex], mode: "daily" });
  }

  let pool;
  if (mode === "trending") {
    pool = songs.filter((s) => s.year >= 2024);
  } else {
    pool = songs;
  }

  if (!pool.length) {
    return res.status(404).json({ error: "No songs for mode" });
  }

  // Parse excluded song IDs to avoid immediate repeats in a session
  const excludeRaw = req.query.exclude || "";
  const excludeIds = excludeRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let candidates = pool.filter((s) => !excludeIds.includes(s.id));
  if (candidates.length === 0) {
    // If all songs in pool were played, reset candidate pool
    candidates = pool;
  }

  // Pick a random song from candidate pool
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const song = candidates[randomIndex];

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.json({ date: todayUTCDateString, song, mode });
});

const searchCatalog = songs.map((s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist,
  movie: s.movie,
  genre: s.genre,
  year: s.year
}));

app.get("/api/catalog", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(searchCatalog);
});
app.get("/api/admin/songs", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(songs);
});

app.post("/api/admin/tag", (req, res) => {
  const { id, difficulty, startTime } = req.body;
  const songIndex = rawSongs.findIndex(s => s.id === id);
  if (songIndex > -1) {
    if (difficulty !== undefined) rawSongs[songIndex].difficulty = difficulty;
    if (startTime !== undefined) rawSongs[songIndex].startTime = startTime;
    fs.writeFileSync(catalogPath, JSON.stringify(rawSongs, null, 2));
    
    // Update live memory arrays
    if (difficulty !== undefined) {
      songs[songIndex].difficulty = difficulty;
      songs[songIndex].revealTiers = difficulty === "hard" ? HARD_TIERS : DEFAULT_TIERS;
    }
    if (startTime !== undefined) {
      songs[songIndex].startTime = startTime;
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Song not found" });
  }
});

app.post("/api/admin/reset", (req, res) => {
  const { id } = req.body;
  const songIndex = rawSongs.findIndex(s => s.id === id);
  if (songIndex > -1) {
    delete rawSongs[songIndex].difficulty;
    rawSongs[songIndex].startTime = 0;
    fs.writeFileSync(catalogPath, JSON.stringify(rawSongs, null, 2));
    
    delete songs[songIndex].difficulty;
    songs[songIndex].startTime = 0;
    songs[songIndex].revealTiers = DEFAULT_TIERS;
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Song not found" });
  }
});

app.delete("/api/admin/song/:id", (req, res) => {
  const id = req.params.id;
  const songIndex = rawSongs.findIndex(s => s.id === id);
  if (songIndex > -1) {
    rawSongs.splice(songIndex, 1);
    fs.writeFileSync(catalogPath, JSON.stringify(rawSongs, null, 2));
    
    songs.splice(songIndex, 1);
    const searchIdx = searchCatalog.findIndex(s => s.id === id);
    if (searchIdx > -1) searchCatalog.splice(searchIdx, 1);
    
    const audioPath = path.join(publicPath, "songs", `${id}.mp3`);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Song not found" });
  }
});

app.post("/api/admin/add", (req, res) => {
  const { url, title, artist, movie, year } = req.body;
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  
  const outputPath = path.join(publicPath, "songs", `${id}.mp3`);
  
  // -x extract audio, --audio-format mp3
  const cmd = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: stderr || "Download failed" });
    }
    
    const newSong = {
      id,
      title,
      artist,
      movie,
      year: parseInt(year) || 2024,
      genre: "Bollywood",
      audioUrl: `/songs/${id}.mp3`,
      startTime: 0
    };
    
    rawSongs.push(newSong);
    fs.writeFileSync(catalogPath, JSON.stringify(rawSongs, null, 2));
    
    const liveSong = { ...newSong, revealTiers: DEFAULT_TIERS };
    songs.push(liveSong);
    searchCatalog.push({ ...newSong });
    
    res.json({ success: true, song: liveSong });
  });
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Sargam server listening on port ${port}`);
});
