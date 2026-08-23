import confetti from "canvas-confetti";

export function fireWinConfetti() {
  confetti({
    particleCount: 130,
    spread: 72,
    origin: { y: 0.6 },
    colors: ["#e0a638", "#f2eef2", "#7bbc8e", "#c9c47b", "#7b9bc9"]
  });
}
