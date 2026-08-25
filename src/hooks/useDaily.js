import { useState, useEffect, useCallback, useRef } from "react";
import songsData from "../../data/songs.json";
import dailyOrder from "../../data/daily_order.json";
import { DEFAULT_TIERS, HARD_TIERS } from "../lib/tiers.js";

// Session-level tracking of played song IDs per mode to prevent repeats in the session


function getPersistentHistory(mode) {
  if (typeof localStorage === "undefined" || mode === "daily" || mode === "challenge") return [];
  try {
    const raw = localStorage.getItem(`sargam-history-${mode}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addSongToHistory(mode, songId, poolSize) {
  if (typeof localStorage === "undefined" || mode === "daily" || mode === "challenge") return;
  const history = getPersistentHistory(mode);
  
  // Dynamic LRU buffer: 85% of the total available pool size
  const maxSize = Math.max(0, Math.floor(poolSize * 0.85));
  
  if (!history.includes(songId)) {
    history.push(songId);
  } else {
    const idx = history.indexOf(songId);
    history.splice(idx, 1);
    history.push(songId);
  }
  
  while (history.length > maxSize && history.length > 0) {
    history.shift(); // Remove oldest
  }
  
  try {
    localStorage.setItem(`sargam-history-${mode}`, JSON.stringify(history));
  } catch {}
}

// Memory cache of current song per mode
const modeSongCache = {};

function isSuitable(song) {
  const s = song.suitability;
  // Absent suitability defaults to suitable (domain model invariant 8).
  if (!s) return true;
  return s !== "unsuitable" && s !== "provisional_unsuitable";
}

function getFallbackSong(mode) {
  let pool = songsData.filter(isSuitable);
  if (mode === "trending") {
    pool = pool.filter((s) => s.year >= 2024);
  }
  
  const exclude = getPersistentHistory(mode);
  
  // Adaptive Matchmaking for non-daily modes
  if (typeof localStorage !== "undefined" && mode !== "daily") {
    const xp = parseInt(localStorage.getItem("sargam-xp") || "0", 10);
    const easyPool = pool.filter((s) => s.difficulty === "super-easy" && !exclude.includes(s.id));
    
    if (easyPool.length > 0) {
      if (xp < 1000 && Math.random() < 0.85) {
        pool = easyPool;
      } else if (xp < 5000 && Math.random() < 0.50) {
        pool = easyPool;
      }
    }
  }

  let picked;
  if (mode === "daily") {
    const now = Date.now();
    // Epoch: August 25, 2026 (20690 days since 1970 UTC)
    let dayIndex = Math.floor(now / 86400000) - 20690;
    if (dayIndex < 0) dayIndex = 0;
    
    // Fallback in case dailyOrder is smaller or gets changed
    const safeIndex = dayIndex % dailyOrder.length;
    const dailyId = dailyOrder[safeIndex];
    picked = pool.find(s => s.id === dailyId) || pool[0];
  } else {
    let candidates = pool.filter((s) => !exclude.includes(s.id));
    if (candidates.length === 0) {
       // Failsafe: if LRU buffer is completely exhausted or broken, just clear it implicitly
       candidates = pool;
    }
    picked = candidates[Math.floor(Math.random() * candidates.length)] || pool[0] || songsData[0];
  }

  return {
    ...picked,
    revealTiers: picked.revealTiers || (picked.difficulty === "hard" ? HARD_TIERS : DEFAULT_TIERS)
  };
}

export function useDaily(mode = "daily", challengeId = null) {
  const [daily, setDaily] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    
    if (mode === "challenge" && challengeId) {
      const song = songsData.find((s) => s.id === challengeId) || songsData[0];
      return {
        song: {
          ...song,
          revealTiers: song.revealTiers || (song.difficulty === "hard" ? HARD_TIERS : DEFAULT_TIERS)
        },
        date: today,
        mode,
        loading: false,
        error: null
      };
    }

    // Check if there is an active saved game in localStorage for this mode
    if (typeof localStorage !== "undefined") {
      try {
        const key = mode === "daily" ? `sargam-daily-${today}` : `sargam-game-${mode}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.song?.id && parsed.song?.audioUrl) {
            modeSongCache[mode] = {
              song: parsed.song,
              date: parsed.date || today,
              mode,
              loading: false,
              error: null
            };
            return modeSongCache[mode];
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    if (modeSongCache[mode]) {
      return modeSongCache[mode];
    }

    const fallback = getFallbackSong(mode);
    return {
      song: fallback,
      date: today,
      mode,
      loading: false,
      error: null
    };
  });

  const isFetchingRef = useRef(false);

  // Fetch or restore song when mode changes
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    if (mode === "challenge" && challengeId) {
      const song = songsData.find((s) => s.id === challengeId) || songsData[0];
      setDaily({
        song: {
          ...song,
          revealTiers: song.revealTiers || (song.difficulty === "hard" ? HARD_TIERS : DEFAULT_TIERS)
        },
        date: today,
        mode,
        loading: false,
        error: null
      });
      return;
    }

    // 1. Check if localStorage already has an in-progress or completed game with the song for this mode
    if (typeof localStorage !== "undefined") {
      try {
        const key = mode === "daily" ? `sargam-daily-${today}` : `sargam-game-${mode}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.song?.id && parsed.song?.audioUrl) {
            const restored = {
              song: parsed.song,
              date: parsed.date || today,
              mode,
              loading: false,
              error: null
            };
            modeSongCache[mode] = restored;
            setDaily(restored);
            return;
          }
        }
      } catch {
        // Ignore
      }
    }

    // 2. Check in-memory cache for mode
    if (modeSongCache[mode]) {
      setDaily(modeSongCache[mode]);
      return;
    }

    // 3. Otherwise use static data
    const fallback = getFallbackSong(mode);
    const result = {
      song: fallback,
      date: today,
      mode,
      loading: false,
      error: null
    };
    modeSongCache[mode] = result;
    if (fallback?.id) {
      let currentPoolSize = songsData.filter(isSuitable).length;
      if (mode === "trending") currentPoolSize = songsData.filter(isSuitable).filter(s => s.year >= 2024).length;
      addSongToHistory(mode, fallback.id, currentPoolSize);
    }
    setDaily(result);

  }, [mode, challengeId]);

  // Method to fetch a NEW song for category modes when clicking "Next Song"
  const fetchNextSong = useCallback(
    async (targetMode) => {
      const m = targetMode || mode;
      const today = new Date().toISOString().slice(0, 10);

      // Track current song as played persistently
      if (daily?.song?.id) {
        let currentPoolSize = songsData.filter(isSuitable).length;
        if (m === "trending") currentPoolSize = songsData.filter(isSuitable).filter(s => s.year >= 2024).length;
        addSongToHistory(m, daily.song.id, currentPoolSize);
      }

      const fallback = getFallbackSong(m);
      const fallbackEntry = {
        song: fallback,
        date: today,
        mode: m,
        loading: false,
        error: null
      };
      modeSongCache[m] = fallbackEntry;
      if (fallback?.id) {
        let currentPoolSize = songsData.filter(isSuitable).length;
        if (m === "trending") currentPoolSize = songsData.filter(isSuitable).filter(s => s.year >= 2024).length;
        addSongToHistory(m, fallback.id, currentPoolSize);
      }
      setDaily(fallbackEntry);
      return fallback;
    },
    [mode, daily?.song?.id]
  );

  return { ...daily, fetchNextSong };
}
