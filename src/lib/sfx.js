// Sound effects synthesized via Web Audio API — minimalist UI pop architecture.

let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function gain(volume) {
  return Math.max(0, Math.min(1, volume / 100)) * 0.3;
}

// Universal snappy UI Pop generator
function uiPop(ac, freqStart, freqEnd, duration, t, g, type = "sine") {
  const osc = ac.createOscillator();
  const gainNode = ac.createGain();
  osc.type = type;
  
  osc.frequency.setValueAtTime(freqStart, t);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration); 
  
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(g, t + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration); 
  
  osc.connect(gainNode);
  gainNode.connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// Gritty, low-pitch thud (audible on laptops thanks to triangle wave harmonics)
export function playWrong(volume = 70) {
  try {
    const ac = getCtx();
    const g = gain(volume) * 1.5;
    const t = ac.currentTime;
    uiPop(ac, 300, 50, 0.2, t, g, "triangle");
  } catch {}
}

// Professional, crisp double-click (mid pop -> high pop)
export function playCorrect(volume = 70) {
  try {
    const ac = getCtx();
    const g = gain(volume) * 0.8;
    const t = ac.currentTime;
    uiPop(ac, 1200, 600, 0.1, t, g, "sine");
    uiPop(ac, 1800, 900, 0.1, t + 0.08, g, "sine");
  } catch {}
}

// Original satisfying snappy mid-pitch pop
export function playSkip(volume = 70) {
  try {
    const ac = getCtx();
    const g = gain(volume) * 0.8;
    const t = ac.currentTime;
    uiPop(ac, 800, 100, 0.15, t, g, "sine");
  } catch {}
}

// Fast ascending triple-pop for streak upgrades
export function playStreakUp(volume = 70) {
  try {
    const ac = getCtx();
    const g = gain(volume) * 0.7;
    const t = ac.currentTime;
    uiPop(ac, 800, 400, 0.1, t, g, "sine");
    uiPop(ac, 1200, 600, 0.1, t + 0.06, g, "sine");
    uiPop(ac, 1800, 900, 0.1, t + 0.12, g, "sine");
  } catch {}
}

// Slow descending double-thud for streak lost
export function playStreakLost(volume = 70) {
  try {
    const ac = getCtx();
    const g = gain(volume) * 1.2;
    const t = ac.currentTime;
    uiPop(ac, 400, 100, 0.2, t, g, "triangle");
    uiPop(ac, 250, 50, 0.2, t + 0.12, g, "triangle");
  } catch {}
}
