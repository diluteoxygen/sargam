import React from "react";
import { DEFAULT_TIERS } from "../lib/tiers.js";

const FULL_SONG_WEIGHT = 12;

// High-saturation, vibrant tier colors for all 6 tiers (0=impossible → 5=full song)
export const TIER_COLORS = [
  "#ef4444", // Tier 0: 0.2s  - Vivid Crimson Red ("Impossible")
  "#f97316", // Tier 1: 0.5s  - Bright Orange ("Very Hard")
  "#eab308", // Tier 2: 2.0s  - Rich Golden Amber ("Hard")
  "#10b981", // Tier 3: 5.0s  - Bright Emerald Green ("Medium")
  "#06b6d4", // Tier 4: 10.0s - Electric Cyan ("Generous")
  "#3b82f6"  // Tier 5: Full  - Electric Azure Blue ("Full Song")
];

function getTierWeight(tier) {
  if (tier.weight !== undefined) return tier.weight;
  if (tier.cutoffSeconds === null || tier.cutoffSeconds === undefined) return FULL_SONG_WEIGHT;
  if (tier.cutoffSeconds <= 0.2) return 1;
  if (tier.cutoffSeconds <= 0.5) return 2;
  if (tier.cutoffSeconds <= 2) return 4;
  if (tier.cutoffSeconds <= 5) return 6;
  if (tier.cutoffSeconds <= 10) return 9;
  return Math.round(tier.cutoffSeconds);
}

export default function Timeline({ attempt, tiers = DEFAULT_TIERS, playbackProgress = 0, playing = false }) {
  const currentTierIndex = Math.min(attempt, tiers.length - 1);
  const currentTier = tiers[currentTierIndex] || tiers[0];

  const weights = tiers.map(getTierWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Sum weight up to and including half the current tier so the arrow centers over the active segment
  let cumulativeWeight = 0;
  for (let i = 0; i < currentTierIndex; i++) {
    cumulativeWeight += weights[i];
  }
  const markerLeft = ((cumulativeWeight + weights[currentTierIndex] / 2) / totalWeight) * 100;

  return (
    <div className="sg-timeline">
      <div className="sg-timeline-label">{currentTier.label}</div>
      <div className="sg-timeline-marker-row">
        <div
          className="sg-timeline-marker"
          style={{
            left: `${markerLeft}%`,
            borderTopColor: TIER_COLORS[currentTierIndex] || TIER_COLORS[0]
          }}
        />
      </div>
      <div className="sg-timeline-track">
        {tiers.map((t, i) => {
          const isRevealed = i <= currentTierIndex;
          const isActive = i === currentTierIndex;
          const color = TIER_COLORS[i] || TIER_COLORS[TIER_COLORS.length - 1];

          return (
            <div
              key={t.index ?? i}
              className={`sg-timeline-seg${isRevealed ? " is-revealed" : ""}${isActive ? " is-active-tier" : ""}`}
              style={{
                flexGrow: weights[i],
                background: isRevealed ? color : undefined,
                boxShadow: isRevealed && isActive ? `0 0 10px ${color}66` : undefined
              }}
            >
              {isActive && playing && playbackProgress > 0 && (
                <div
                  className="sg-timeline-progress-bar"
                  style={{ width: `${Math.min(100, playbackProgress * 100)}%` }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
