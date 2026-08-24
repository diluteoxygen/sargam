/**
 * aggregate-song-metrics.cjs
 *
 * Reads all documents from the Firestore `roundEvents` collection, groups
 * them by songId, and computes per-song metrics for songs with at least 30
 * events. Outputs data/song-metrics.json and prints a summary to stdout.
 *
 * Requires a Firebase service account key. Set the path via:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 * or pass --key-file=/path/to/serviceAccountKey.json.
 *
 * Usage:
 *   node scripts/aggregate-song-metrics.cjs [--key-file=PATH]
 *
 * This script does not modify songs.json or any game client code. It is
 * an offline aggregation tool only.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const SONGS_FILE = path.join(__dirname, "../data/songs.json");
const METRICS_FILE = path.join(__dirname, "../data/song-metrics.json");
const MIN_EVENTS = 30;
const HIGH_LOSS_THRESHOLD = 0.60;

// Parse --key-file argument if provided
const keyFileArg = process.argv.find((a) => a.startsWith("--key-file="));
if (keyFileArg) {
  const keyPath = keyFileArg.split("=").slice(1).join("=");
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
}

async function main() {
  // Lazy-load firebase-admin so the error message is useful if not installed
  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.error(
      "firebase-admin is not installed. Run: npm install --save-dev firebase-admin"
    );
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const songs = JSON.parse(fs.readFileSync(SONGS_FILE, "utf8"));
  const songIndex = Object.fromEntries(songs.map((s) => [s.id, s]));

  console.log("Reading roundEvents collection...");
  const snapshot = await db.collection("roundEvents").get();
  const docs = snapshot.docs.map((d) => d.data());
  console.log(`Total events: ${docs.length}`);

  if (docs.length === 0) {
    fs.writeFileSync(METRICS_FILE, JSON.stringify([], null, 2));
    console.log("No events found. Wrote empty metrics file.");
    return;
  }

  // Group events by songId
  const grouped = {};
  for (const ev of docs) {
    const sid = ev.songId;
    if (!sid) continue;
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(ev);
  }

  const now = new Date().toISOString();
  const metrics = [];
  const flagged = [];

  for (const [songId, events] of Object.entries(grouped)) {
    if (events.length < MIN_EVENTS) continue;

    const totalServes = events.length;
    const wins = events.filter((e) => e.outcome === "won");
    const winRate = wins.length / totalServes;
    const lossRate = 1.0 - winRate;

    // medianTierAtGuess: across winning rounds only
    const tiers = wins
      .map((e) => e.tierAtGuess)
      .filter((t) => typeof t === "number")
      .sort((a, b) => a - b);
    let medianTierAtGuess = null;
    if (tiers.length > 0) {
      const mid = Math.floor(tiers.length / 2);
      medianTierAtGuess =
        tiers.length % 2 === 0
          ? (tiers[mid - 1] + tiers[mid]) / 2
          : tiers[mid];
    }

    // skipRate: average (skips / attemptCount) across all rounds
    const skipRates = events
      .filter((e) => typeof e.attemptCount === "number" && e.attemptCount > 0)
      .map((e) => (e.skips || 0) / e.attemptCount);
    const skipRate =
      skipRates.length > 0
        ? skipRates.reduce((a, b) => a + b, 0) / skipRates.length
        : 0;

    const entry = {
      songId,
      title: songIndex[songId]?.title ?? null,
      totalServes,
      winRate: Math.round(winRate * 1000) / 1000,
      lossRate: Math.round(lossRate * 1000) / 1000,
      medianTierAtGuess,
      skipRate: Math.round(skipRate * 1000) / 1000,
      lastUpdated: now,
    };

    metrics.push(entry);

    if (lossRate > HIGH_LOSS_THRESHOLD) {
      flagged.push(entry);
    }
  }

  metrics.sort((a, b) => b.lossRate - a.lossRate);

  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));

  const songsWithData = metrics.length;
  const songsInsufficient = Object.keys(grouped).filter(
    (sid) => grouped[sid].length < MIN_EVENTS
  ).length;

  console.log();
  console.log(`Songs with >= ${MIN_EVENTS} events: ${songsWithData}`);
  console.log(`Songs with < ${MIN_EVENTS} events (excluded): ${songsInsufficient}`);
  console.log(`Songs flagged (lossRate > ${HIGH_LOSS_THRESHOLD}): ${flagged.length}`);

  if (flagged.length > 0) {
    console.log();
    console.log("Flagged songs:");
    for (const f of flagged) {
      console.log(
        `  ${f.songId} | ${f.title ?? "unknown"} | lossRate=${f.lossRate} | serves=${f.totalServes}`
      );
    }
  }

  console.log();
  console.log(`Metrics written to ${METRICS_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
