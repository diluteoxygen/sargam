import { useState, useEffect, useRef, useCallback } from "react";
import { normalize } from "../lib/normalize.js";
import { getScore } from "../lib/scoring.js";
import { recordResult } from "../lib/stats.js";
import { fireWinConfetti } from "../lib/confetti.js";
import { playWrong, playCorrect, playSkip, playStreakUp, playStreakLost } from "../lib/sfx.js";

function getStorageKey(mode, date) {
  if (!mode) return null;
  if (mode === "daily") {
    return `sargam-daily-${date || new Date().toISOString().slice(0, 10)}`;
  }
  return `sargam-game-${mode}`;
}

function getStoredRound(target, mode, date) {
  if (!target?.id || typeof localStorage === "undefined") return null;
  try {
    const key = getStorageKey(mode, date);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const storedSongId = data?.songId || data?.song?.id;
    if (data && storedSongId === target.id && Array.isArray(data.attempts)) {
      return data;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

export function useRound(
  target,
  date,
  mode = "daily",
  sfxEnabled = true,
  sfxVolume = 70,
  reduceMotion = false,
  fetchNextSong = null
) {
  const songId = target?.id;
  const key = getStorageKey(mode, date);

  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState(() => Array(6).fill(null));
  const [modal, setModal] = useState(null);
  const [solvedIn, setSolvedIn] = useState(null);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);

  const attemptsRef = useRef([]);

  // Load from localStorage on mount or when target/mode changes
  useEffect(() => {
    if (!songId) return;
    const stored = getStoredRound(target, mode, date);
    if (stored) {
      const restoredRows = Array(6).fill(null);
      let solvedAttempt = null;

      stored.attempts.forEach((att, idx) => {
        if (idx < 6) {
          const status = att.type === "skip" ? "skip" : att.correct ? "correct" : "wrong";
          restoredRows[idx] = { status, text: att.text, type: att.type, correct: att.correct };
          if (att.correct) solvedAttempt = idx + 1;
        }
      });

      attemptsRef.current = stored.attempts;
      setRows(restoredRows);
      setAttempt(Math.min(stored.attempts.length, 5));

      if (stored.status === "won") {
        setSolvedIn(solvedAttempt || stored.attempts.length);
        setScore(stored.score ?? (solvedAttempt ? getScore(solvedAttempt - 1) : 0));
      } else if (stored.status === "lost") {
        setScore(0);
      } else {
        setModal(null);
        setSolvedIn(null);
        setScore(0);
      }
    } else {
      attemptsRef.current = [];
      setAttempt(0);
      setRows(Array(6).fill(null));
      setModal(null);
      setSolvedIn(null);
      setScore(0);
    }
  }, [songId, mode, date]);

  function persist(newAttempts, newStatus, newScore) {
    if (!key || !target?.id || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          songId: target.id,
          song: target,
          date,
          mode,
          attempts: newAttempts,
          status: newStatus,
          score: newScore
        })
      );
    } catch {
      // Ignore write errors
    }
  }

  const isWon = solvedIn !== null;
  const isLost = !isWon && attemptsRef.current.length >= 6;
  const gameOver = isWon || isLost;
  const resultTone = isWon ? "win" : isLost ? "loss" : null;

  function handleSkip() {
    if (gameOver) return;
    const currentAttempt = attempt;
    const newAttemptItem = { index: currentAttempt, type: "skip", text: "Skipped", correct: false };
    const newAttempts = [...attemptsRef.current, newAttemptItem];
    attemptsRef.current = newAttempts;

    setRows((prev) => {
      const next = [...prev];
      next[currentAttempt] = { status: "skip", text: "Skipped", type: "skip", correct: false };
      return next;
    });

    if (sfxEnabled) playSkip(sfxVolume);

    if (currentAttempt >= 5) {
      setScore(0);

      persist(newAttempts, "lost", 0);
      const stats = recordResult(mode, date, false, null, 0);
      if (sfxEnabled && mode !== "daily" && stats.currentStreak === 0) {
        setTimeout(() => playStreakLost(sfxVolume), 300);
      }
    } else {
      setAttempt((a) => a + 1);
      persist(newAttempts, "in-progress", 0);
    }
  }

  function handleGiveUp() {
    if (gameOver || !target?.id || !target?.title) return;
    const currentAttempt = attempt;
    
    const newAttempts = [...attemptsRef.current];
    const newRows = [...rows];
    
    for (let i = currentAttempt; i < 6; i++) {
      newAttempts.push({ index: i, type: "skip", text: "Skipped", correct: false });
      newRows[i] = { status: "skip", text: "Skipped", type: "skip", correct: false };
    }
    
    attemptsRef.current = newAttempts;
    setRows(newRows);
    setAttempt(6);
    setScore(0);

    persist(newAttempts, "lost", 0);
    
    const stats = recordResult(mode, date, false, null, 0);
    
    if (sfxEnabled) {
      playWrong(sfxVolume);
      if (mode !== "daily" && stats.currentStreak === 0) {
        setTimeout(() => playStreakLost(sfxVolume), 300);
      }
    }
  }

  function submitGuess(value) {
    if (gameOver || !target?.id || !target?.title) return;
    const currentAttempt = attempt;

    if (value === null) {
      handleSkip();
      return;
    }

    const correct = target && normalize(value) === normalize(target.title);

    if (correct) {
      const newAttemptItem = { index: currentAttempt, type: "guess", text: value, correct: true };
      const newAttempts = [...attemptsRef.current, newAttemptItem];
      attemptsRef.current = newAttempts;

      const newRows = [...rows];
      newRows[currentAttempt] = { status: "correct", text: value, type: "guess", correct: true };
      setRows(newRows);

      const solved = currentAttempt + 1;
      const calculatedScore = getScore(currentAttempt);
      setSolvedIn(solved);
      setScore(calculatedScore);

      persist(newAttempts, "won", calculatedScore);
      const stats = recordResult(mode, date, true, solved, calculatedScore);

      if (sfxEnabled) {
        playCorrect(sfxVolume);
        if (mode !== "daily" && stats.currentStreak > 1) {
          setTimeout(() => playStreakUp(sfxVolume), 600);
        }
      }
      if (!reduceMotion) fireWinConfetti();
    } else {
      const newAttemptItem = { index: currentAttempt, type: "guess", text: value, correct: false };
      const newAttempts = [...attemptsRef.current, newAttemptItem];
      attemptsRef.current = newAttempts;

      const newRows = [...rows];
      newRows[currentAttempt] = { status: "wrong", text: value, type: "guess", correct: false };
      setRows(newRows);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (sfxEnabled) playWrong(sfxVolume);

      if (currentAttempt >= 5) {
        setScore(0);

        persist(newAttempts, "lost", 0);
        const stats = recordResult(mode, date, false, null, 0);
        if (sfxEnabled && mode !== "daily" && stats.currentStreak === 0) {
          setTimeout(() => playStreakLost(sfxVolume), 300);
        }
      } else {
        setAttempt((a) => a + 1);
        persist(newAttempts, "in-progress", 0);
      }
    }
  }

  // Next song handler: loads next song for category modes or resets round
  const handleNext = useCallback(async () => {
    setModal(null);
    setAttempt(0);
    setRows(Array(6).fill(null));
    setSolvedIn(null);
    setScore(0);
    attemptsRef.current = [];

    // Clear saved active game for category mode so next song starts fresh
    if (mode !== "daily" && key && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }

    if (mode !== "daily" && typeof fetchNextSong === "function") {
      await fetchNextSong(mode);
    }
  }, [mode, key, fetchNextSong]);

  return {
    attempt,
    setAttempt,
    rows,
    setRows,
    modal,
    setModal,
    solvedIn,
    setSolvedIn,
    score,
    setScore,
    shake,
    gameOver,
    resultTone,
    handleSkip,
    handleGiveUp,
    submitGuess,
    handleNext
  };
}
