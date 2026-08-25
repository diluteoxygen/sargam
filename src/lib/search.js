import { normalize } from "./normalize.js";

/**
 * Phonetic & transliteration normalizer for Hindi/Bollywood queries.
 * Strips common query noise words ("movie", "songs"), collapses duplicate vowels,
 * and handles common Hindi transliteration variations (w/v, ph/f, dh/d, etc.).
 */
export function phoneticNormalize(str) {
  if (!str) return "";
  let s = str.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  // Remove generic query noise words
  s = s.replace(/\b(movie|film|cinema|songs|song|track|tracks|hits|bollywood|audio|album|gaana|geet)\b/g, " ");

  // Normalize duplicate vowels (e.g. saiyaraa -> saiyara, aari -> ari)
  s = s.replace(/aa+/g, "a")
       .replace(/ee+/g, "i")
       .replace(/oo+/g, "u")
       .replace(/ii+/g, "i")
       .replace(/uu+/g, "u")
       .replace(/yy+/g, "y");

  // Normalize phonetic consonant transliterations
  s = s.replace(/w/g, "v")
       .replace(/ph/g, "f")
       .replace(/dh/g, "d")
       .replace(/th/g, "t")
       .replace(/kh/g, "k")
       .replace(/gh/g, "g")
       .replace(/sh/g, "s")
       .replace(/z/g, "j");

  s = s.replace(/([a-z])\1+/g, "$1");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Levenshtein distance for fuzzy typo tolerance
 */
export function levenshtein(a, b) {
  if (!a) return b ? b.length : 0;
  if (!b) return a ? a.length : 0;

  const al = a.length;
  const bl = b.length;
  const matrix = [];

  for (let i = 0; i <= bl; i++) matrix[i] = [i];
  for (let j = 0; j <= al; j++) matrix[0][j] = j;

  for (let i = 1; i <= bl; i++) {
    for (let j = 1; j <= al; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bl][al];
}

/**
 * Searches and ranks songs based on multi-field, phonetic, multi-token, and fuzzy matching.
 * @param {Array} catalog - Array of song objects { title, movie, artist, genre }
 * @param {string} query - User search input
 * @param {string} mode - Active game mode ("daily", "all", "golden-era", "new-age")
 * @param {number} limit - Maximum suggestions to return (default 8)
 */
export function searchSongs(catalog, query, limit = 8) {
  if (!query || !catalog || !catalog.length) return [];

  const rawQ = query.toLowerCase().trim();
  const normQ = normalize(rawQ);
  if (!normQ) return [];

  const phoneQ = phoneticNormalize(rawQ);

  // Split query into significant tokens (exclude noise words)
  const qTokens = rawQ
    .split(/\s+/)
    .map((t) => normalize(t))
    .filter((t) => t.length > 0 && !["movie", "film", "song", "songs", "track", "hits", "bollywood", "album"].includes(t));

  const phoneTokens = phoneQ ? phoneQ.split(/\s+/).filter(Boolean) : [];

  const scored = [];

  for (const s of catalog) {
    const rawTitle = (s.title || "").toLowerCase();
    const rawMovie = (s.movie || "").toLowerCase();
    const rawArtist = (s.artist || "").toLowerCase();
    const fullRaw = `${rawTitle} ${rawMovie} ${rawArtist}`;

    const normTitle = normalize(s.title || "");
    const normMovie = normalize(s.movie || "");
    const normArtist = normalize(s.artist || "");
    const fullNorm = `${normTitle} ${normMovie} ${normArtist}`;

    const phoneTitle = phoneticNormalize(s.title);
    const phoneMovie = phoneticNormalize(s.movie);
    const phoneArtist = phoneticNormalize(s.artist);
    const fullPhone = `${phoneTitle} ${phoneMovie} ${phoneArtist}`;

    let score = 0;

    // 1. Direct title exact, prefix, substring
    if (normTitle === normQ) {
      score = Math.max(score, 100);
    } else if (normTitle.startsWith(normQ)) {
      score = Math.max(score, 90);
    } else if (normTitle.includes(normQ)) {
      score = Math.max(score, 80);
    }

    // 2. Movie or Artist direct prefix or substring
    else if (normMovie.startsWith(normQ)) {
      score = Math.max(score, 78);
    } else if (normMovie.includes(normQ)) {
      score = Math.max(score, 72);
    } else if (normArtist.startsWith(normQ)) {
      score = Math.max(score, 70);
    } else if (normArtist.includes(normQ)) {
      score = Math.max(score, 66);
    }

    // 3. Multi-token match across fields with per-token fuzzy tolerance
    if (qTokens.length > 0) {
      const songWords = fullNorm.split(/[\s\-]+/);
      let allTokensMatched = true;
      let fuzzyPenalties = 0;
      
      for (const tok of qTokens) {
        if (fullNorm.includes(tok)) {
          continue; // Exact substring match is fine
        }
        // Try fuzzy match against each word in the song
        let bestDist = 999;
        for (const sw of songWords) {
          if (!sw) continue;
          if (Math.abs(sw.length - tok.length) > 2) continue;
          const dist = levenshtein(tok, sw);
          if (dist < bestDist) bestDist = dist;
        }
        
        // Allow up to distance 1 for tokens of length 4-5, and distance 2 for tokens >= 6
        const allowedDist = tok.length >= 6 ? 2 : (tok.length >= 4 ? 1 : 0);
        if (bestDist <= allowedDist) {
           fuzzyPenalties += bestDist;
        } else {
           allTokensMatched = false;
           break;
        }
      }
      
      if (allTokensMatched) {
        score = Math.max(score, 62 - (fuzzyPenalties * 3));
      }
    }

    // 4. Phonetic & transliteration matching (e.g. "saiyaraa" -> "saiyaara", "randawa" -> "randhawa")
    if (phoneQ.length >= 2) {
      if (phoneTitle.includes(phoneQ)) {
        score = Math.max(score, 58);
      } else if (phoneMovie.includes(phoneQ)) {
        score = Math.max(score, 54);
      } else if (phoneArtist.includes(phoneQ)) {
        score = Math.max(score, 52);
      } else if (phoneTokens.length > 0 && phoneTokens.every((tok) => fullPhone.includes(tok))) {
        score = Math.max(score, 49);
      }
    }

    // 5. Fuzzy typo matching on words for queries >= 4 chars
    if (normQ.length >= 4 && score === 0) {
      const words = fullRaw.split(/[\s\-]+/);
      for (const w of words) {
        const cleanW = normalize(w);
        if (cleanW.length >= 3 && Math.abs(cleanW.length - normQ.length) <= 2) {
          const dist = levenshtein(cleanW, normQ);
          if (dist <= 2) {
            score = Math.max(score, 42 - dist * 6);
            break;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ song: s, score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by title + movie
  const seen = new Set();
  const results = [];

  for (const { song } of scored) {
    const key = `${normalize(song.title)}---${normalize(song.movie)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(song);
      if (results.length >= limit) break;
    }
  }

  return results;
}
