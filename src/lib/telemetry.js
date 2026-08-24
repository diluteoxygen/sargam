import { db } from "./firebase.js";
import { collection, addDoc } from "firebase/firestore";

/**
 * Fire-and-forget telemetry log for completed rounds.
 * Writes to the `roundEvents` collection.
 */
export async function logRoundEvent({
  songId,
  mode,
  date,
  outcome,
  attemptCount,
  tierAtGuess,
  skips
}) {
  if (!songId || !mode || !outcome) return;

  try {
    const eventsRef = collection(db, "roundEvents");
    // Fire and forget, no await needed from caller
    addDoc(eventsRef, {
      songId,
      mode,
      date: date || new Date().toISOString().split("T")[0],
      outcome,
      attemptCount,
      tierAtGuess: outcome === "lost" ? null : (tierAtGuess ?? null),
      skips,
      timestamp: Date.now()
    }).catch(() => {});
  } catch (err) {
    // Silent fail to preserve player experience
  }
}
