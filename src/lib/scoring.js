export const SCORES = [1000, 800, 600, 400, 200, 10];

export function getScore(attemptIndex) {
  if (attemptIndex === undefined || attemptIndex === null || attemptIndex < 0 || attemptIndex >= SCORES.length) {
    return 0;
  }
  return SCORES[attemptIndex];
}

// XP System
// Level curve: Level = Math.floor(Math.sqrt(XP / 50)) + 1
// Example: Level 1 (0 XP), Level 2 (50 XP), Level 3 (200 XP), Level 4 (450 XP)
export function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function getXPForLevel(level) {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * 50;
}

export function getProgressToNextLevel(xp) {
  const currentLevel = getLevel(xp);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  
  const xpIntoLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const percentage = (xpIntoLevel / xpNeeded) * 100;
  
  return {
    currentLevel,
    xpIntoLevel,
    xpNeeded,
    percentage: Math.min(Math.max(percentage, 0), 100)
  };
}



const SALT = "sargam-secret-salt-2026";

function hashXP(xp) {
  let str = xp.toString() + SALT;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export function loadXP() {
  try {
    const xpStr = localStorage.getItem("sargam-xp") || "0";
    if (xpStr === "0") return 0;
    
    const sig = localStorage.getItem("sargam-sig");
    const migrated = localStorage.getItem("sargam-migrated");
    
    // 1-Time Migration for existing honest players
    if (!migrated) {
      localStorage.setItem("sargam-sig", hashXP(xpStr));
      localStorage.setItem("sargam-migrated", "true");
      return parseInt(xpStr, 10);
    }
    
    // Anti-Cheat Validation
    if (hashXP(xpStr) !== sig) {
      console.warn("Sargam Security: Save data tampering detected. Resetting XP to 0.");
      localStorage.setItem("sargam-xp", "0");
      localStorage.setItem("sargam-sig", hashXP("0"));
      window.dispatchEvent(new CustomEvent("sargam-xp-changed", { detail: 0 }));
      return 0;
    }
    
    return parseInt(xpStr, 10);
  } catch {
    return 0;
  }
}

export function addXP(amount) {
  if (amount <= 0) return loadXP();
  try {
    const current = loadXP();
    const newXP = current + amount;
    
    localStorage.setItem("sargam-xp", newXP.toString());
    localStorage.setItem("sargam-sig", hashXP(newXP.toString()));
    
    // Ensure migrated flag is set for new players too
    if (!localStorage.getItem("sargam-migrated")) {
      localStorage.setItem("sargam-migrated", "true");
    }
    
    // Dispatch custom event so the header updates instantly
    window.dispatchEvent(new CustomEvent("sargam-xp-changed", { detail: newXP }));
    
    return newXP;
  } catch {
    return 0;
  }
}

export function setXP(val) {
  localStorage.setItem("sargam-xp", val.toString());
  localStorage.setItem("sargam-sig", hashXP(val.toString()));
  if (!localStorage.getItem("sargam-migrated")) localStorage.setItem("sargam-migrated", "true");
  window.dispatchEvent(new CustomEvent("sargam-xp-changed", { detail: parseInt(val, 10) }));
}
