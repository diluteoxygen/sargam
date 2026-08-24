/**
 * Tests for the metric computation logic in aggregate-song-metrics.cjs.
 * Runs without Firebase credentials by testing the pure aggregation math.
 */

"use strict";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

// --- Inline the pure aggregation logic for testing ---

function computeMetrics(events, songIndex, minEvents = 30, now = new Date().toISOString()) {
  const grouped = {};
  for (const ev of events) {
    const sid = ev.songId;
    if (!sid) continue;
    if (!grouped[sid]) grouped[sid] = [];
    grouped[sid].push(ev);
  }

  const metrics = [];
  const flagged = [];

  for (const [songId, evs] of Object.entries(grouped)) {
    if (evs.length < minEvents) continue;

    const totalServes = evs.length;
    const wins = evs.filter((e) => e.outcome === "won");
    const winRate = wins.length / totalServes;
    const lossRate = 1.0 - winRate;

    const tiers = wins
      .map((e) => e.tierAtGuess)
      .filter((t) => typeof t === "number")
      .sort((a, b) => a - b);
    let medianTierAtGuess = null;
    if (tiers.length > 0) {
      const mid = Math.floor(tiers.length / 2);
      medianTierAtGuess =
        tiers.length % 2 === 0 ? (tiers[mid - 1] + tiers[mid]) / 2 : tiers[mid];
    }

    const skipRates = evs
      .filter((e) => typeof e.attemptCount === "number" && e.attemptCount > 0)
      .map((e) => (e.skips || 0) / e.attemptCount);
    const skipRate =
      skipRates.length > 0 ? skipRates.reduce((a, b) => a + b, 0) / skipRates.length : 0;

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
    if (lossRate > 0.60) flagged.push(entry);
  }

  return { metrics, flagged };
}

// --- Tests ---

console.log("aggregate-song-metrics logic tests");
console.log("---");

// 1. Empty collection
{
  const { metrics, flagged } = computeMetrics([], {}, 30);
  assert(metrics.length === 0, "Empty events -> empty metrics");
  assert(flagged.length === 0, "Empty events -> no flagged songs");
}

// 2. Insufficient events excluded
{
  const events = Array.from({ length: 29 }, () => ({
    songId: "song-a",
    outcome: "won",
    tierAtGuess: 1,
    attemptCount: 2,
    skips: 0,
  }));
  const { metrics } = computeMetrics(events, {}, 30);
  assert(metrics.length === 0, "Song with 29 events excluded (minEvents=30)");
}

// 3. Exactly 30 events included
{
  const events = Array.from({ length: 30 }, () => ({
    songId: "song-b",
    outcome: "won",
    tierAtGuess: 0,
    attemptCount: 1,
    skips: 0,
  }));
  const { metrics } = computeMetrics(events, { "song-b": { title: "Test Song" } }, 30);
  assert(metrics.length === 1, "Song with exactly 30 events included");
  assert(metrics[0].winRate === 1.0, "All wins -> winRate = 1.0");
  assert(metrics[0].lossRate === 0.0, "All wins -> lossRate = 0.0");
  assert(metrics[0].medianTierAtGuess === 0, "All tier=0 wins -> median = 0");
  assert(metrics[0].skipRate === 0.0, "No skips -> skipRate = 0.0");
}

// 4. High loss rate flagged
{
  const wins = Array.from({ length: 10 }, () => ({
    songId: "song-c",
    outcome: "won",
    tierAtGuess: 2,
    attemptCount: 3,
    skips: 1,
  }));
  const losses = Array.from({ length: 25 }, () => ({
    songId: "song-c",
    outcome: "lost",
    tierAtGuess: null,
    attemptCount: 6,
    skips: 2,
  }));
  const { metrics, flagged } = computeMetrics([...wins, ...losses], {}, 30);
  assert(metrics.length === 1, "Song with 35 events included");
  assert(metrics[0].lossRate > 0.60, `lossRate ${metrics[0].lossRate} > 0.60`);
  assert(flagged.length === 1, "High-loss song flagged");
}

// 5. medianTierAtGuess with even number of winners
{
  const events = [
    ...Array.from({ length: 10 }, () => ({ songId: "s", outcome: "won", tierAtGuess: 0, attemptCount: 1, skips: 0 })),
    ...Array.from({ length: 10 }, () => ({ songId: "s", outcome: "won", tierAtGuess: 2, attemptCount: 3, skips: 0 })),
    ...Array.from({ length: 15 }, () => ({ songId: "s", outcome: "lost", tierAtGuess: null, attemptCount: 6, skips: 0 })),
  ];
  const { metrics } = computeMetrics(events, {}, 30);
  // 20 wins: 10 at tier 0, 10 at tier 2; sorted = [0,0,...,2,2,...], median = (0+2)/2 = 1
  assert(metrics[0].medianTierAtGuess === 1, `Median of mixed tiers = 1, got ${metrics[0].medianTierAtGuess}`);
}

// 6. Events with missing songId are ignored
{
  const events = [
    ...Array.from({ length: 30 }, () => ({ songId: "song-good", outcome: "won", tierAtGuess: 1, attemptCount: 2, skips: 0 })),
    { outcome: "won", tierAtGuess: 0, attemptCount: 1, skips: 0 }, // no songId
  ];
  const { metrics } = computeMetrics(events, {}, 30);
  assert(metrics.length === 1, "Event without songId ignored");
}

console.log();
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
