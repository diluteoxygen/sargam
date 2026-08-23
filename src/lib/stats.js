import { addXP } from "./scoring.js";

// Per-mode stats stored in localStorage.
// Key: sargam-stats-<mode>
// Shape:
// {
//   totalGames: number,
//   wins: number,
//   currentStreak: number,
//   maxStreak: number,
//   streakScore: number,
//   lastPlayedDate: string | null,  // YYYY-MM-DD of most recently completed game
//   lastWinDate: string | null,
//   distribution: { "1": n, "2": n, "3": n, "4": n, "5": n, "6": n, "X": n }
// }

const EMPTY = () => ({
  totalGames: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  streakScore: 0,
  lastPlayedDate: null,
  lastWinDate: null,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 }
});

function key(mode) {
  return `sargam-stats-${mode}`;
}

export function loadStats(mode) {
  try {
    const raw = localStorage.getItem(key(mode));
    if (!raw) return EMPTY();
    const parsed = JSON.parse(raw);
    return { ...EMPTY(), ...parsed };
  } catch {
    return EMPTY();
  }
}

// Records the result of a completed game for a given mode and date.
// isWin: boolean
// solvedIn: number (1-6 for wins) | null (for loss)
// date: YYYY-MM-DD string
// score: number
export function recordResult(mode, date, isWin, solvedIn, score = 0) {
  try {
    const stats = loadStats(mode);

    if (mode === "daily") {
      // Do not double-count if this date was already recorded
      if (stats.lastPlayedDate === date) return stats;

      stats.totalGames += 1;

      if (isWin) {
        stats.wins += 1;
        const distKey = String(solvedIn ?? 6);
        stats.distribution[distKey] = (stats.distribution[distKey] || 0) + 1;

        // Streak: win on consecutive day extends streak
        const prevDate = stats.lastWinDate;
        if (prevDate) {
          const prev = new Date(prevDate);
          const curr = new Date(date);
          const diffDays = Math.round((curr - prev) / 86400000);
          if (diffDays === 1) {
            stats.currentStreak += 1;
            stats.streakScore += score;
          } else {
            stats.currentStreak = 1;
            stats.streakScore = score;
          }
        } else {
          stats.currentStreak = 1;
          stats.streakScore = score;
        }
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.lastWinDate = date;
      } else {
        stats.distribution["X"] = (stats.distribution["X"] || 0) + 1;
        stats.currentStreak = 0;
        stats.streakScore = 0;
      }

      stats.lastPlayedDate = date;
    } else {
      // ENDLESS MODES
      stats.totalGames += 1;

      if (isWin) {
        stats.wins += 1;
        const distKey = String(solvedIn ?? 6);
        stats.distribution[distKey] = (stats.distribution[distKey] || 0) + 1;

        stats.currentStreak += 1;
        stats.streakScore += score;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.lastWinDate = date;
      } else {
        stats.distribution["X"] = (stats.distribution["X"] || 0) + 1;
        stats.currentStreak = 0;
        stats.streakScore = 0;
      }

      stats.lastPlayedDate = date;
    }

    localStorage.setItem(key(mode), JSON.stringify(stats));
    if (score > 0) addXP(score);
    return stats;
  } catch {
    return loadStats(mode);
  }
}

// Compute average guesses from distribution (wins only)
export function computeAverage(stats) {
  let total = 0;
  let count = 0;
  for (let i = 1; i <= 6; i++) {
    const n = stats.distribution[i] || 0;
    total += i * n;
    count += n;
  }
  if (count === 0) return null;
  return (total / count).toFixed(1);
}
