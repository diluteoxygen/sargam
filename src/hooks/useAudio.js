import { useState, useRef, useEffect, useCallback } from "react";
import { DEFAULT_TIERS } from "../lib/tiers.js";

export function useAudio(song, tierIndex = 0, volume = 100) {
  const [playing, setPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const cutoffListenerRef = useRef(null);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      setPlaying(false);
      setPlaybackProgress(0);
    };
    const handlePause = () => {
      setPlaying(false);
      setPlaybackProgress(0);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      if (cutoffListenerRef.current) {
        audio.removeEventListener("timeupdate", cutoffListenerRef.current);
        cutoffListenerRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Update src when audioUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (song?.audioUrl) {
      audio.src = song.audioUrl;
      audio.load();
    } else {
      audio.src = "";
    }
    setPlaying(false);
    setPlaybackProgress(0);
  }, [song?.audioUrl]);

  // Update volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume / 100));
  }, [volume]);

  const tiers = song?.revealTiers || DEFAULT_TIERS;
  const currentTier = tiers[Math.min(tierIndex, tiers.length - 1)];

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (cutoffListenerRef.current) {
      audio.removeEventListener("timeupdate", cutoffListenerRef.current);
      cutoffListenerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    audio.pause();
    const start = typeof song?.startTime === "number" ? song.startTime : 0;
    audio.currentTime = start;
    setPlaying(false);
    setPlaybackProgress(0);
  }, [song?.startTime]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!song?.audioUrl) {
      return;
    }

    if (cutoffListenerRef.current) {
      audio.removeEventListener("timeupdate", cutoffListenerRef.current);
      cutoffListenerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Start playing precisely from the first waveform timestamp (skipping any leading silence)
    const startTime = typeof song?.startTime === "number" ? song.startTime : 0;
    audio.currentTime = startTime;

    const cutoffSeconds = currentTier?.cutoffSeconds;
    const cutoffTimestamp =
      cutoffSeconds !== null && cutoffSeconds !== undefined ? startTime + cutoffSeconds : null;

    if (cutoffTimestamp !== null) {
      const onTimeUpdate = () => {
        if (audio.currentTime >= cutoffTimestamp) {
          audio.pause();
          audio.removeEventListener("timeupdate", onTimeUpdate);
          cutoffListenerRef.current = null;
          setPlaying(false);
          setPlaybackProgress(0);
        }
      };
      cutoffListenerRef.current = onTimeUpdate;
      audio.addEventListener("timeupdate", onTimeUpdate);
    }

    // Animation frame loop to track progress smoothly from startTime to cutoff
    const trackProgress = () => {
      if (!audio.paused) {
        const elapsed = Math.max(0, audio.currentTime - startTime);
        const targetDuration =
          cutoffSeconds || (audio.duration ? Math.max(0.1, audio.duration - startTime) : 10);
        const p = Math.min(1, Math.max(0, elapsed / targetDuration));
        setPlaybackProgress(p);
        rafRef.current = requestAnimationFrame(trackProgress);
      } else {
        setPlaybackProgress(0);
      }
    };

    audio
      .play()
      .then(() => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(trackProgress);
      })
      .catch(() => {
        setPlaying(false);
        setPlaybackProgress(0);
      });
  }, [song?.audioUrl, song?.startTime, currentTier?.cutoffSeconds]);

  return { playing, playbackProgress, play, stop };
}
