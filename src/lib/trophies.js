export const TROPHIES = {
  "one_hit_wonder": {
    id: "one_hit_wonder",
    title: "One Hit Wonder",
    desc: "Guess a song correctly on the 1st attempt",
    icon: "Zap",
    color: "#FFD700"
  },
  "clutch": {
    id: "clutch",
    title: "Clutch",
    desc: "Guess a song correctly on your final 6th attempt",
    icon: "Clock",
    color: "#FF4500"
  },
  "streak_god": {
    id: "streak_god",
    title: "Streak God",
    desc: "Reach a streak of 5",
    icon: "Flame",
    color: "#FF6347"
  },
  "maestro": {
    id: "maestro",
    title: "Maestro",
    desc: "Reach Player Level 5",
    icon: "Crown",
    color: "#9370DB"
  },
  "veteran": {
    id: "veteran",
    title: "Veteran",
    desc: "Play 50 games across all modes",
    icon: "Star",
    color: "#00CED1"
  },
  "night_owl": {
    id: "night_owl",
    title: "Night Owl",
    desc: "Play a game between midnight and 4AM",
    icon: "Moon",
    color: "#4169E1"
  }
};

const TROPHIES_KEY = "sargam-trophies";

export function getUnlockedTrophies() {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(TROPHIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function unlockTrophy(id) {
  const unlocked = getUnlockedTrophies();
  if (!unlocked.includes(id)) {
    unlocked.push(id);
    localStorage.setItem(TROPHIES_KEY, JSON.stringify(unlocked));
    return true; // Newly unlocked
  }
  return false;
}

export function checkTrophies({ solvedIn, streak, level, totalGames, hour }) {
  const unlockedNow = [];

  if (solvedIn === 1) {
    if (unlockTrophy("one_hit_wonder")) unlockedNow.push("one_hit_wonder");
  }

  if (solvedIn === 6) {
    if (unlockTrophy("clutch")) unlockedNow.push("clutch");
  }

  if (streak >= 5) {
    if (unlockTrophy("streak_god")) unlockedNow.push("streak_god");
  }

  if (level >= 5) {
    if (unlockTrophy("maestro")) unlockedNow.push("maestro");
  }

  if (totalGames >= 50) {
    if (unlockTrophy("veteran")) unlockedNow.push("veteran");
  }

  if (hour !== undefined && hour >= 0 && hour < 4) {
    if (unlockTrophy("night_owl")) unlockedNow.push("night_owl");
  }

  return unlockedNow;
}
