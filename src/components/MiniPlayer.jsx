import React, { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(secs) {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function MiniPlayer({ target }) {
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // Manage mini-player audio
  useEffect(() => {
    if (!target?.audioUrl) return;
    const audio = new Audio(target.audioUrl);
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlayingFull(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [target?.audioUrl]);

  function toggleFullPlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingFull) {
      audio.pause();
      setIsPlayingFull(false);
    } else {
      audio.play().then(() => setIsPlayingFull(true)).catch(() => setIsPlayingFull(false));
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="sg-mini-player" style={{ marginTop: 24, width: "100%", marginBottom: 0 }}>
      <button
        type="button"
        className="sg-mini-disc-btn"
        onClick={toggleFullPlay}
        aria-label={isPlayingFull ? "Pause full track" : "Play full track"}
      >
        {isPlayingFull ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
      </button>
      <div className="sg-mini-track">
        <div className="sg-mini-fill" style={{ width: `${progressPercent}%` }} />
      </div>
      <span className="sg-mini-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
