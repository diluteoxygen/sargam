import React, { useState, useRef, useMemo, useEffect, Suspense, lazy } from "react";
import { HelpCircle, Settings, Search, Play, Pause, Music2, Flame, ChevronRight, Share2, Zap, Clock, Crown, Star, Trophy, Flag } from "lucide-react";
import Timeline from "./components/Timeline.jsx";
import DistributionChart from "./components/DistributionChart.jsx";
import MiniPlayer from "./components/MiniPlayer.jsx";
import GuessRow from "./components/GuessRow.jsx";
const SettingsModal = lazy(() => import("./components/SettingsModal.jsx"));
const HowToPlayModal = lazy(() => import("./components/HowToPlayModal.jsx"));
const ProfileModal = lazy(() => import("./components/ProfileModal.jsx"));
const LeaderboardModal = lazy(() => import("./components/LeaderboardModal.jsx"));
import { useRound } from "./hooks/useRound.js";
import { useAudio } from "./hooks/useAudio.js";
import { useDaily } from "./hooks/useDaily.js";
import { useCatalog } from "./hooks/useCatalog.js";
import { useMode } from "./hooks/useMode.js";
import { searchSongs } from "./lib/search.js";
import { loadStats, computeAverage } from "./lib/stats.js";
import { getProgressToNextLevel, loadXP } from "./lib/scoring.js";
import { TROPHIES, checkTrophies } from "./lib/trophies.js";
import { pushToCloud } from "./lib/sync.js";

// Mode definitions: each has a display label and the API mode key
const MODES = [
  { label: "Daily", key: "daily" },
  { label: "All Songs", key: "all" },
  { label: "Trending", key: "trending" }
];

const SETTINGS_KEY = "sargam-settings";

function loadSavedSettings() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}


function XpBadge({ onClick }) {
  const [xp, setXp] = useState(loadXP);

  useEffect(() => {
    const handleXpChanged = (e) => setXp(e.detail);
    window.addEventListener("sargam-xp-changed", handleXpChanged);
    return () => window.removeEventListener("sargam-xp-changed", handleXpChanged);
  }, []);

  const { currentLevel, percentage } = getProgressToNextLevel(xp);
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <button onClick={onClick} title={`Level ${currentLevel} (${Math.round(percentage)}% to next)`} style={{ border: "none", display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", padding: "4px 8px 4px 4px", borderRadius: 32, cursor: "pointer", transition: "transform 0.1s ease" }}>
      <div style={{ position: "relative", width: 24, height: 24 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="12" cy="12" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
          <circle cx="12" cy="12" r={radius} stroke="var(--gold)" strokeWidth="2" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} strokeLinecap="round" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", color: "var(--text)" }}>
          {currentLevel}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", paddingRight: 4, letterSpacing: 0.5 }}>LVL</span>
    </button>
  );
}
function DailyCountdown() {
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    function update() {
      const now = new Date();
      const nextUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = Math.max(0, Math.floor((nextUTC - now) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span>{countdown}</span>;
}

function ShareButton({ isWin, solvedIn, score, date, mode }) {
  const [copied, setCopied] = useState(false);
  async function handleShare() {
    const modeLabels = { daily: "Daily", all: "All Songs", trending: "Trending Hits" };
    const modeLabel = modeLabels[mode] || "Sargam";
    const result = isWin ? `Solved in ${solvedIn}/6` : "Failed";
    const text = `Sargam ${modeLabel} ${date} — ${result} — Score: ${score}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button type="button" className="sg-btn sg-btn-solid" onClick={handleShare} style={{ flex: 1, justifyContent: "center" }}>
      <Share2 size={18} style={{ marginRight: "6px" }} />
      {copied ? "Copied!" : "Share"}
    </button>
  );
}

export default function App() {
  const { mode, setMode } = useMode();
  
  const challengeData = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const c = params.get("c");
      if (c) return JSON.parse(atob(c));
    } catch {}
    return null;
  }, []);

  // Settings state initialized from localStorage
  const savedSettings = useMemo(() => loadSavedSettings(), []);
  const [songVolume, setSongVolume] = useState(savedSettings?.songVolume ?? 100);
  const [sfxEnabled, setSfxEnabled] = useState(savedSettings?.sfxEnabled ?? true);
  const [sfxVolume, setSfxVolume] = useState(savedSettings?.sfxVolume ?? 70);
  const [darkTheme, setDarkTheme] = useState(savedSettings?.darkTheme ?? true);
  const [reduceMotion, setReduceMotion] = useState(savedSettings?.reduceMotion ?? false);

  const [ftuePulse, setFtuePulse] = useState(() => {
    if (typeof localStorage === "undefined") return false;
    return !localStorage.getItem("sargam-played");
  });
  
  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ songVolume, sfxEnabled, sfxVolume, darkTheme, reduceMotion })
      );
    } catch {
      // Ignore write errors
    }
  }, [songVolume, sfxEnabled, sfxVolume, darkTheme, reduceMotion]);

  // Sync dark/light theme class on body
  useEffect(() => {
    if (darkTheme) {
      document.body.classList.remove("sg-light");
    } else {
      document.body.classList.add("sg-light");
    }
  }, [darkTheme]);

  const { song: target, date, fetchNextSong } = useDaily(mode, challengeData?.id);
  const { songs: catalogSongs } = useCatalog();

  const {
    attempt,
    rows,
    modal,
    setModal,
    solvedIn,
    score,
    shake,
    gameOver,
    resultTone,
    handleSkip,
    handleGiveUp,
    submitGuess,
    handleNext
  } = useRound(target, date, mode, sfxEnabled, sfxVolume, reduceMotion, fetchNextSong);

  const { playing, playbackProgress, play, stop } = useAudio(target, attempt, songVolume);

  const [toastTrophy, setToastTrophy] = useState(null);
  const [toastOut, setToastOut] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Check trophies when game ends
  useEffect(() => {
    if (gameOver) {
      const currentStats = loadStats(mode);
      const currentLevel = getProgressToNextLevel(loadXP()).currentLevel;
      const totalGames = MODES.reduce((sum, m) => sum + loadStats(m.key).totalGames, 0);
      const hour = new Date().getHours();

      const newlyUnlocked = checkTrophies({
        solvedIn: solvedIn,
        streak: currentStats.currentStreak,
        level: currentLevel,
        totalGames,
        hour
      });

      if (newlyUnlocked.length > 0) {
        // Just show the first one unlocked in this batch for the toast
        setToastOut(false);
        setToastTrophy(newlyUnlocked[0]);
        setTimeout(() => setToastOut(true), 3700);
        setTimeout(() => setToastTrophy(null), 4000);
      }
      
      // Sync local game progress to Firebase (if logged in)
      pushToCloud();
    }
  }, [gameOver, solvedIn, mode]);


  useEffect(() => {
    if (ftuePulse) {
      setModal("help");
      try {
        localStorage.setItem("sargam-played", "true");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayClick = () => {
    if (ftuePulse) setFtuePulse(false);
    if (playing) stop();
    else play();
  };

  const [input, setInput] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [selectedSugIndex, setSelectedSugIndex] = useState(-1);
  const inputRef = useRef(null);

  // Reset input and stop audio when mode changes
  useEffect(() => {
    setInput("");
    setShowSug(false);
    setSelectedSugIndex(-1);
    stop();
  }, [mode, target?.id, stop]);

  const suggestions = useMemo(() => {
    return searchSongs(catalogSongs, input, 8);
  }, [input, catalogSongs]);

  // Reset keyboard selection index when suggestions change
  useEffect(() => {
    setSelectedSugIndex(-1);
  }, [suggestions]);

  function onFormSubmit(e) {
    if (e) e.preventDefault();
    stop();
    if (selectedSugIndex >= 0 && suggestions[selectedSugIndex]) {
      submitGuess(suggestions[selectedSugIndex].title);
    } else if (input.trim()) {
      submitGuess(input);
    } else {
      return;
    }
    setInput("");
    setShowSug(false);
    setSelectedSugIndex(-1);
  }

  function onSelectSuggestion(title) {
    stop();
    submitGuess(title);
    setInput("");
    setShowSug(false);
    setSelectedSugIndex(-1);
  }

  function onInputKeyDown(e) {
    if (!showSug || suggestions.length === 0) {
      if (e.key === "Escape") {
        setShowSug(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSugIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSugIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter" && selectedSugIndex >= 0) {
      e.preventDefault();
      onSelectSuggestion(suggestions[selectedSugIndex].title);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSug(false);
      setSelectedSugIndex(-1);
      inputRef.current?.blur();
    }
  }

  function onSkipClick() {
    stop();
    handleSkip();
    setInput("");
    setShowSug(false);
    setSelectedSugIndex(-1);
  }

  function onGiveUpClick() {
    stop();
    handleGiveUp();
  }

  function onPlayClick() {
    if (gameOver) return;
    if (playing) {
      stop();
    } else {
      play();
    }
  }

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      // Modals take precedence for Escape
      if (e.key === "Escape") {
        if (modal) {
          setModal(null);
          return;
        }
      }

      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");
      const isButtonFocused = activeElement && activeElement.tagName === "BUTTON";

      // Space -> Play/Pause
      if (e.code === "Space" && !isInputFocused && !isButtonFocused) {
        e.preventDefault();
        onPlayClick();
      }

      // ArrowRight -> Skip or Next Song
      if (e.code === "ArrowRight" && !isInputFocused) {
        e.preventDefault();
        if (gameOver) {
          if (mode !== "daily") {
            handleNext();
          }
        } else {
          if (e.shiftKey) {
            onGiveUpClick();
          } else {
            onSkipClick();
          }
        }
      }

      // Typing letters -> Auto-focus input
      if (!isInputFocused && !isButtonFocused && !gameOver && !modal) {
        if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
          if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            inputRef.current?.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [modal, gameOver, playing, onPlayClick, onSkipClick, onGiveUpClick, handleNext, mode]);

  const currentStats = loadStats(mode);

  return (
    <div className="sg-app">
      <div className="sg-page">
        {/* header */}
        <header className="sg-header">
          <div className="sg-header-left">
            <XpBadge onClick={() => setModal("profile")} />
          </div>

          <h1 className="sg-brand">Sargam</h1>

          <div className="sg-header-right">
            <div className="sg-header-actions">
              <button
                className="sg-icon-btn"
                aria-label="Leaderboard"
                type="button"
                onClick={() => setModal("leaderboard")}
              >
                <Trophy size={20} />
              </button>
              <button
                className="sg-icon-btn"
                aria-label="How to play"
                type="button"
                onClick={() => setModal("help")}
              >
                <HelpCircle size={20} />
              </button>
              <button
                className="sg-icon-btn"
                aria-label="Preferences"
                type="button"
                onClick={() => setModal("settings")}
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* mode tabs */}
        <nav className="sg-tabs">
          {MODES.map(({ label, key }) => (
            <button
              key={key}
              type="button"
              className={"sg-tab" + (key === mode ? " is-active" : "")}
              onClick={() => {
                stop();
                setMode(key);
              }}
            >
              {label}
            </button>
          ))}
        </nav>




        <main className="sg-main">
          {!gameOver ? (
            <>
              <div className={"sg-rows" + (shake ? " sg-shake" : "")}>
                {rows.map((row, i) => (
                  <GuessRow
                    key={i}
                    row={row}
                    isActive={i === attempt && !gameOver}
                    resultTone={resultTone}
                  />
                ))}
              </div>
              <Timeline
                attempt={Math.min(attempt, 5)}
                tiers={target?.revealTiers}
                playbackProgress={playbackProgress}
                playing={playing}
              />
              <button
                type="button"
                className={"sg-play-btn" + (playing ? " is-playing" : "") + (ftuePulse && !playing && !gameOver && attempt === 0 ? " ftue-pulse" : "")}
                onClick={handlePlayClick}
                disabled={gameOver}
                aria-label={playing ? "Pause snippet" : "Play snippet"}
              >
                {playing ? (
                  <Pause size={22} strokeWidth={2.4} />
                ) : (
                  <Play size={22} strokeWidth={2.4} style={{ marginLeft: 2 }} />
                )}
              </button>
              <form className="sg-guess-form" onSubmit={onFormSubmit}>
              <div className="sg-search">
                <Search size={16} className="sg-search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  disabled={gameOver}
                  placeholder="Search a song"
                  onKeyDown={onInputKeyDown}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setShowSug(true);
                  }}
                  onFocus={(e) => {
                    setShowSug(true);
                    if (window.innerWidth <= 600) {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 300);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSug(false), 140)}
                />
                {showSug && suggestions.length > 0 && (
                  <ul className="sg-suggestions">
                    {suggestions.map((s, idx) => {
                      const isSelected = idx === selectedSugIndex;
                      return (
                        <li key={s.id || s.title}>
                          <button
                            type="button"
                            className={isSelected ? "is-highlighted" : ""}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onSelectSuggestion(s.title)}
                          >
                            <span className="sg-sug-swatch">
                              <Music2 size={13} />
                            </span>
                            <span className="sg-sug-text">
                              <strong>{s.title}</strong>
                              <em>
                                {s.movie} &middot; {s.artist}
                              </em>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="sg-guess-actions">
                <button
                  type="button"
                  className="sg-skip-btn"
                  disabled={gameOver}
                  onClick={onSkipClick}
                  title="Skip 1 guess"
                >
                  Skip
                </button>

              </div>
            </form>
            {!gameOver && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button
                  type="button"
                  className="sg-giveup-standalone"
                  onClick={onGiveUpClick}
                >
                  <Flag size={14} style={{ marginTop: -1 }} />
                  Give Up
                </button>
              </div>
            )}
            </>
          ) : (
            <div className="sg-inline-results" style={{ width: "100%", background: "var(--surface-2)", borderRadius: "12px", padding: "24px 16px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, color: resultTone === "win" ? "var(--gold)" : "var(--red)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                  {resultTone === "win" ? "You Got It!" : "Game Over"}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, lineHeight: 1.2 }}>{target?.title}</div>
                <div style={{ fontSize: 14, color: "var(--text-dim)", marginTop: 4 }}>{target?.movie} • {target?.artist}</div>
                
                <MiniPlayer target={target} />
              </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text)" }}>{solvedIn || "X"}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Solved In</div>
                </div>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--gold)" }}>{score}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Score</div>
                </div>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text)" }}>{currentStats.currentStreak}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Streak</div>
                </div>
                <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text)" }}>{computeAverage(currentStats) ?? "—"}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Avg Guess</div>
                </div>
              </div>

              <div style={{ background: "var(--surface)", padding: "16px", borderRadius: "12px" }}>
                <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, textAlign: "center" }}>Guess Distribution</div>
                <DistributionChart highlight={resultTone === "win" ? solvedIn : "X"} tone={resultTone} distribution={currentStats.distribution} />
              </div>

              {mode === "challenge" && challengeData && (
                <div style={{ textAlign: "center", background: "var(--surface)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: "14px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Result</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: score > challengeData.score ? "var(--gold)" : score < challengeData.score ? "var(--red)" : "var(--text)" }}>
                    {score > challengeData.score ? "👑 You Won!" : score < challengeData.score ? "💀 You Lost" : "🤝 Tie!"}
                  </div>
                </div>
              )}
              {mode === "daily" && (
                <div style={{ textAlign: "center", background: "var(--surface)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: "14px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px" }}>Next Tune</div>
                  <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    <DailyCountdown />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <ShareButton isWin={solvedIn !== null} solvedIn={solvedIn} score={score} date={date} mode={mode} />
                <button
                  type="button"
                  className="sg-btn sg-btn-ghost"
                  style={{ flex: 1, justifyContent: "center", border: "1px solid var(--border)" }}
                  onClick={() => {
                    const code = btoa(JSON.stringify({ id: target.id, score: score }));
                    const url = `${window.location.origin}/?c=${code}`;
                    navigator.clipboard.writeText(`I scored ${score} on Sargam! Can you beat me?\n\n${url}`);
                    alert("Challenge link copied! Send it to your friend.");
                  }}
                >
                  <Zap size={18} style={{ marginRight: "6px" }} />
                  Challenge
                </button>
              </div>

              {mode !== "daily" && mode !== "challenge" && (
                <button
                  type="button"
                  className="sg-btn sg-btn-solid"
                  onClick={handleNext}
                  style={{ width: "100%", justifyContent: "center", fontSize: 18, padding: 16, borderRadius: 12, background: "var(--gold)", color: "#000" }}
                >
                  Next Song
                  <ChevronRight size={22} style={{ marginLeft: 4 }} />
                </button>
              )}

              {mode === "challenge" && (
                <button
                  type="button"
                  className="sg-btn sg-btn-solid"
                  onClick={() => {
                    window.location.href = window.location.pathname;
                  }}
                  style={{ width: "100%", justifyContent: "center", fontSize: 18, padding: 16, borderRadius: 12, background: "var(--gold)", color: "#000", marginTop: 8 }}
                >
                  Play Daily Game
                  <ChevronRight size={22} style={{ marginLeft: 4 }} />
                </button>
              )}

              </div>
          )}
</main>
      </div>


      
      {toastTrophy && (
        <div className={toastOut ? "sg-toast-out" : ""} style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", border: `1px solid ${TROPHIES[toastTrophy]?.color || "var(--gold)"}`, borderRadius: 32, padding: "8px 16px", display: "flex", alignItems: "center", gap: 12, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", animation: "toastSlide 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
          <Star size={20} fill={TROPHIES[toastTrophy]?.color || "var(--gold)"} color={TROPHIES[toastTrophy]?.color || "var(--gold)"} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-dim)", letterSpacing: 1 }}>Achievement Unlocked</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{TROPHIES[toastTrophy]?.title}</div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {modal === "profile" && <ProfileModal onClose={() => setModal(null)} />}
        {modal === "leaderboard" && <LeaderboardModal onClose={() => setModal(null)} currentXp={loadXP()} />}
        {modal === "settings" && (
          <SettingsModal
            onClose={() => setModal(null)}
            songVolume={songVolume}
            onSongVolumeChange={setSongVolume}
            sfxEnabled={sfxEnabled}
            onSfxEnabledChange={setSfxEnabled}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={setSfxVolume}
            darkTheme={darkTheme}
            onDarkThemeChange={setDarkTheme}
            reduceMotion={reduceMotion}
            onReduceMotionChange={setReduceMotion}
          />
        )}
        {modal === "help" && <HowToPlayModal onClose={() => setModal(null)} />}
      </Suspense>
    </div>
  );
}
