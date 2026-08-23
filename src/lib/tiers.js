export const DEFAULT_TIERS = [
  { index: 0, cutoffSeconds: 0.2, label: "0.2 seconds" },
  { index: 1, cutoffSeconds: 0.5, label: "0.5 seconds" },
  { index: 2, cutoffSeconds: 2, label: "2 seconds" },
  { index: 3, cutoffSeconds: 5, label: "5 seconds" },
  { index: 4, cutoffSeconds: 10, label: "10 seconds" },
  { index: 5, cutoffSeconds: null, label: "Full song" }
];

export const HARD_TIERS = [
  { index: 0, cutoffSeconds: 1, label: "1 second" },
  { index: 1, cutoffSeconds: 3, label: "3 seconds" },
  { index: 2, cutoffSeconds: 6, label: "6 seconds" },
  { index: 3, cutoffSeconds: 10, label: "10 seconds" },
  { index: 4, cutoffSeconds: 15, label: "15 seconds" },
  { index: 5, cutoffSeconds: null, label: "Full song" }
];
