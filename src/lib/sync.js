import { auth, db } from "./firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

// The master keys we care about syncing
const KEYS = [
  "sargam-xp",
  "sargam-trophies",
  "sargam-stats-daily",
  "sargam-stats-all",
  "sargam-stats-trending",
  "sargam-username",
  "sargam-join-date"
];

// Takes local payload and cloud payload, returns merged payload
function mergeData(local, cloud) {
  if (!cloud) return local;

  const merged = { ...local };

  // Merge XP (Max)
  const localXp = parseInt(local["sargam-xp"] || "0", 10);
  const cloudXp = parseInt(cloud["sargam-xp"] || "0", 10);
  merged["sargam-xp"] = Math.max(localXp, cloudXp).toString();

  // Merge Trophies (Union)
  try {
    const localT = JSON.parse(local["sargam-trophies"] || "[]");
    const cloudT = JSON.parse(cloud["sargam-trophies"] || "[]");
    merged["sargam-trophies"] = JSON.stringify(Array.from(new Set([...localT, ...cloudT])));
  } catch (e) {}

  // Merge Stats (Max stats)
  ["daily", "all", "trending"].forEach(mode => {
    const k = `sargam-stats-${mode}`;
    try {
      const lStats = JSON.parse(local[k] || "{}");
      const cStats = JSON.parse(cloud[k] || "{}");
      
      const lTotal = lStats.totalGames || 0;
      const cTotal = cStats.totalGames || 0;
      
      if (cTotal > lTotal) {
        merged[k] = JSON.stringify(cStats);
      } else {
        merged[k] = JSON.stringify(lStats);
      }
    } catch (e) {}
  });

  // Merge Username (Prefer cloud if exists)
  if (cloud["sargam-username"]) {
    merged["sargam-username"] = cloud["sargam-username"];
  }

  // Merge Join Date (Prefer earliest)
  if (local["sargam-join-date"] && cloud["sargam-join-date"]) {
    const lDate = new Date(local["sargam-join-date"]);
    const cDate = new Date(cloud["sargam-join-date"]);
    merged["sargam-join-date"] = lDate < cDate ? local["sargam-join-date"] : cloud["sargam-join-date"];
  } else {
    merged["sargam-join-date"] = cloud["sargam-join-date"] || local["sargam-join-date"] || new Date().toISOString();
  }

  return merged;
}

export async function syncFromCloud(user) {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    // Build local payload
    const localPayload = {};
    KEYS.forEach(k => {
      localPayload[k] = localStorage.getItem(k) || null;
    });

    if (snap.exists()) {
      const cloudPayload = snap.data();
      const merged = mergeData(localPayload, cloudPayload);
      
      // Save merged to localStorage
      KEYS.forEach(k => {
        if (merged[k]) {
          if (k === "sargam-xp") {
            setXP(merged[k]);
          } else {
            localStorage.setItem(k, merged[k]);
          }
        }
      });

      // Dispatch event to update UI instantly
      window.dispatchEvent(new CustomEvent("sargam-xp-changed", { detail: parseInt(merged["sargam-xp"] || "0", 10) }));
      window.dispatchEvent(new CustomEvent("sargam-sync-complete"));
      
      // Push merged back up to cloud
      merged["xp_number"] = parseInt(merged["sargam-xp"] || "0", 10);
      await setDoc(userRef, merged, { merge: true });
    } else {
      // First time login, push local to cloud
      localPayload["xp_number"] = parseInt(localPayload["sargam-xp"] || "0", 10);
      await setDoc(userRef, localPayload, { merge: true });
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

export async function pushToCloud() {
  const user = auth.currentUser;
  if (!user) return; // Silent return for guests

  const payload = {};
  KEYS.forEach(k => {
    payload[k] = localStorage.getItem(k) || null;
    if (k === "sargam-username" && !payload[k]) {
      payload[k] = user.displayName || "Guest Player";
    }
  });
  
  payload["xp_number"] = parseInt(payload["sargam-xp"] || "0", 10);

  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, payload, { merge: true });
  } catch (err) {
    console.error("Push to cloud failed:", err);
  }
}
