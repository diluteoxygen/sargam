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

function ShareButton({ isWin, solvedIn, score, date, mode, rows }) {
  const [copied, setCopied] = useState(false);
  async function handleShare() {
    const modeLabels = { daily: "Daily", all: "All Songs", trending: "Trending Hits" };
    const modeLabel = modeLabels[mode] || "Sargam";
    
    // Generate Emoji Grid
    const grid = rows.map(r => {
      if (!r) return "⬜";
      if (r.type === "skip") return "⬛";
      if (r.correct) return "🟩";
      return "🟥";
    }).join(" ");

    const result = isWin ? `${solvedIn}/6` : "X/6";
    const text = `Sargam ${modeLabel} ${date} — ${result}\n${grid}\nScore: ${score} 🏆\n\nhttps://sargam.vercel.app`;
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

  const [ftueStep, setFtueStep] = useState(() => {
    if (typeof localStorage === "undefined") return 0;
    return !localStorage.getItem("sargam-played") ? 1 : 0;
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
    if (ftueStep === 1) {
      setModal("help");
      try {
        localStorage.setItem("sargam-played", "true");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayClick = () => {
    if (ftueStep === 1) setFtueStep(2);
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
    if (ftueStep === 2) setFtueStep(0);
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
      {ftueStep > 0 && <div className="sg-tutorial-backdrop" />}
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
                className={"sg-play-btn" + (playing ? " is-playing" : "") + (ftueStep === 1 && !playing && !gameOver && attempt === 0 ? " sg-spotlight" : "")}
                onClick={handlePlayClick}
                disabled={gameOver}
                aria-label={playing ? "Pause snippet" : "Play snippet"}
              >
                {ftueStep === 1 && <div className="sg-tutorial-text">Tap to listen to 0.2s!</div>}
                {playing ? (
                  <Pause size={22} strokeWidth={2.4} />
                ) : (
                  <Play size={22} strokeWidth={2.4} style={{ marginLeft: 2 }} />
                )}
              </button>
              <form className="sg-guess-form" onSubmit={onFormSubmit}>
              <div className={"sg-search" + (ftueStep === 2 ? " sg-spotlight" : "")}>
                {ftueStep === 2 && <div className="sg-tutorial-text" style={{ bottom: "calc(100% + 15px)", top: "auto" }}>Now guess the song or Skip!</div>}
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
                    if (ftueStep === 2) setFtueStep(0);
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
            <div className="sg-inline-results" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px", paddingTop: 8 }}>

              <div className="sg-result-hero">
                <div className="sg-result-status" data-tone={resultTone}>
                  {resultTone === "win" ? "You Got It" : "Game Over"}
                </div>
                <div className="sg-result-title">{target?.title}</div>
                <div className="sg-result-meta">{target?.movie} &middot; {target?.artist}</div>

                {target?.links && (target.links.spotify || target.links.apple || target.links.youtube) && (
                  <div className="sg-result-links">
                    {target.links.spotify && (
                      <a href={target.links.spotify} target="_blank" rel="noreferrer" className="sg-result-link" title="Listen on Spotify" style={{ color: "#1db954" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                        Spotify
                      </a>
                    )}
                    {target.links.apple && (
                      <a href={target.links.apple} target="_blank" rel="noreferrer" className="sg-result-link" title="Listen on Apple Music" style={{ color: "#fa243c" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z"/></svg>
                        Apple Music
                      </a>
                    )}
                    {target.links.youtube && (
                      <a href={target.links.youtube} target="_blank" rel="noreferrer" className="sg-result-link" title="Watch on YouTube" style={{ color: "#ff4444" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        YouTube
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="sg-stats">
                <div className="sg-stat-box">
                  <div className="sg-stat-num">{solvedIn || "—"}</div>
                  <div className="sg-stat-label">Solved In</div>
                </div>
                <div className="sg-stat-box">
                  <div className="sg-stat-num" style={{ color: "var(--gold)" }}>{score}</div>
                  <div className="sg-stat-label">Score</div>
                </div>
                <div className="sg-stat-box">
                  <div className="sg-stat-num">{currentStats.currentStreak}</div>
                  <div className="sg-stat-label">Streak</div>
                </div>
                <div className="sg-stat-box">
                  <div className="sg-stat-num">{computeAverage(currentStats) ?? "—"}</div>
                  <div className="sg-stat-label">Avg</div>
                </div>
              </div>

              <div>
                <div className="sg-panel-title" style={{ marginBottom: 10 }}>Guess Distribution</div>
                <DistributionChart highlight={resultTone === "win" ? solvedIn : "X"} tone={resultTone} distribution={currentStats.distribution} />
              </div>

              {mode === "challenge" && challengeData && (
                <div className="sg-result-challenge">
                  <span style={{ color: score > challengeData.score ? "var(--gold)" : score < challengeData.score ? "var(--red)" : "var(--text)", fontWeight: 700 }}>
                    {score > challengeData.score ? "You beat them" : score < challengeData.score ? "They beat you" : "Tied"}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Your {score} vs their {challengeData.score}</span>
                </div>
              )}

              {mode === "daily" && (
                <div className="sg-result-countdown">
                  <span className="sg-result-countdown-label">Next tune in</span>
                  <span className="sg-result-countdown-time"><DailyCountdown /></span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <ShareButton isWin={solvedIn !== null} solvedIn={solvedIn} score={score} date={date} mode={mode} rows={rows} />
                <button
                  type="button"
                  className="sg-btn sg-btn-ghost"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => {
                    const code = btoa(JSON.stringify({ id: target.id, score: score }));
                    const url = `${window.location.origin}/?c=${code}`;
                    navigator.clipboard.writeText(`I scored ${score} on Sargam! Can you beat me?\n\n${url}`);
                    alert("Challenge link copied! Send it to your friend.");
                  }}
                >
                  <Zap size={16} />
                  Challenge
                </button>
              </div>

              {mode !== "daily" && mode !== "challenge" && (
                <button
                  type="button"
                  className="sg-btn sg-btn-solid"
                  onClick={handleNext}
                  style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "14px 0", borderRadius: 10 }}
                >
                  Next Song
                  <ChevronRight size={20} />
                </button>
              )}

              {mode === "challenge" && (
                <button
                  type="button"
                  className="sg-btn sg-btn-solid"
                  onClick={() => { window.location.href = window.location.pathname; }}
                  style={{ width: "100%", justifyContent: "center", fontSize: 16, padding: "14px 0", borderRadius: 10 }}
                >
                  Play Daily Game
                  <ChevronRight size={20} />
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
