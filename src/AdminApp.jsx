import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Download, Trash2, RotateCcw } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';

function WaveformPlayer({ url, currentStartTime, onStartTimeChange, playing, onPlayPause }) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(255,255,255,0.2)',
      progressColor: 'var(--gold)',
      cursorColor: 'var(--gold)',
      barWidth: 2,
      height: 80,
      url: url,
    });
    
    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      if (currentStartTime) {
        ws.seekTo(currentStartTime / dur);
      }
    });

    wsRef.current = ws;
    
    return () => ws.destroy();
  }, [url]);

  useEffect(() => {
    if (wsRef.current) {
      if (playing) wsRef.current.play();
      else wsRef.current.pause();
    }
  }, [playing]);

  const handleSetStart = () => {
    if (wsRef.current) {
      onStartTimeChange(wsRef.current.getCurrentTime());
    }
  };

  const markerLeft = duration > 0 ? (currentStartTime / duration) * 100 : 0;

  return (
    <div style={{ margin: "24px 0" }}>
      <div style={{ width: "100%", background: "#1c1a1f", borderRadius: 8, padding: "8px 0" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <div ref={containerRef} />
          {duration > 0 && (
            <div style={{
              position: "absolute",
              left: `${markerLeft}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: "var(--red)",
              zIndex: 10,
              pointerEvents: "none"
            }}>
              <div style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", background: "var(--red)", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>START</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
        <button onClick={onPlayPause} style={{ background: "var(--gold)", border: "none", borderRadius: "50%", width: 64, height: 64, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {playing ? <Pause size={28} color="#241605" /> : <Play size={28} color="#241605" style={{ marginLeft: 4 }} />}
        </button>
        <button 
          onClick={handleSetStart} 
          style={{ padding: "0 24px", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 32, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
        >
          Set Start to Playhead
        </button>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [songs, setSongs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("queue");

  // Ingest form
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [movie, setMovie] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);

  // Player state
  const [playingId, setPlayingId] = useState(null);
  const [trimEdits, setTrimEdits] = useState({});

  useEffect(() => {
    fetchSongs();
  }, []);

  async function fetchSongs() {
    try {
      const res = await fetch("/api/admin/songs");
      const data = await res.json();
      setSongs(data);
      setQueue(data.filter((s) => !s.difficulty));
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  const currentSong = queue[0];
  const playing = currentSong ? playingId === currentSong.id : false;
  const currentStartTime = currentSong 
    ? (trimEdits[currentSong.id] !== undefined ? trimEdits[currentSong.id] : (currentSong.startTime || 0))
    : 0;

  const handleStartTimeChange = (time) => {
    if (currentSong) {
      setTrimEdits(prev => ({ ...prev, [currentSong.id]: time }));
    }
  };

  const togglePlaying = () => {
    if (currentSong) {
      setPlayingId(prev => prev === currentSong.id ? null : currentSong.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (activeTab !== "queue" || !currentSong) return;
      if (document.activeElement.tagName === "INPUT") return;

      if (e.code === "ArrowLeft") {
        e.preventDefault();
        await tagSong(currentSong.id, "hard");
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        await tagSong(currentSong.id, "easy");
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlaying();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSong, queue, activeTab, currentStartTime]);

  async function tagSong(id, difficulty) {
    try {
      await fetch("/api/admin/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, difficulty, startTime: currentStartTime })
      });
      setQueue((q) => q.slice(1));
      fetchSongs(); // Refresh full catalog behind the scenes
    } catch (e) {
      console.error("Failed to tag", e);
    }
  }

  async function resetSong(id) {
    try {
      await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      fetchSongs();
    } catch (e) {
      console.error("Failed to reset", e);
    }
  }

  async function deleteSong(id) {
    if (!window.confirm("Are you sure you want to permanently delete this song and its mp3 file?")) return;
    try {
      await fetch(`/api/admin/song/${id}`, { method: "DELETE" });
      fetchSongs();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  }

  async function handleIngest(e) {
    e.preventDefault();
    setIsDownloading(true);
    try {
      const res = await fetch("/api/admin/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, artist, movie, year })
      });
      const data = await res.json();
      if (data.success) {
        alert("Downloaded and added: " + data.song.title);
        setUrl(""); setTitle(""); setArtist(""); setMovie("");
        fetchSongs(); 
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Request failed");
    }
    setIsDownloading(false);
  }

  const TabButton = ({ id, label }) => (
    <button 
      onClick={() => setActiveTab(id)} 
      style={{ padding: "12px 24px", background: activeTab === id ? "var(--surface-2)" : "transparent", color: activeTab === id ? "var(--text)" : "var(--text-dim)", border: "none", borderBottom: activeTab === id ? "2px solid var(--gold)" : "2px solid transparent", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
    >
      {label}
    </button>
  );

  return (
    <div className="sg-app" style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 24 }}>Admin Dashboard</h1>
        
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 32 }}>
          <TabButton id="queue" label={`Queue (${queue.length})`} />
          <TabButton id="catalog" label={`Catalog (${songs.length})`} />
          <TabButton id="add" label="Add Song" />
        </div>

        {activeTab === "queue" && (
          <div>
            {currentSong ? (
              <div style={{ background: "var(--surface)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid var(--border)" }}>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>{currentSong.title}</h3>
                <p style={{ color: "var(--text-dim)" }}>{currentSong.artist} {currentSong.movie ? `• ${currentSong.movie}` : ""}</p>
                
                <WaveformPlayer 
                  key={currentSong.id}
                  url={currentSong.audioUrl} 
                  currentStartTime={currentStartTime} 
                  onStartTimeChange={handleStartTimeChange}
                  playing={playing}
                  onPlayPause={togglePlaying}
                />

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <button onClick={() => tagSong(currentSong.id, "hard")} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", color: "var(--text)", padding: "12px 24px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}>
                    <ChevronLeft size={18} /> HARD (Slow Intro)
                  </button>
                  <div style={{ padding: "12px", color: "var(--text-dim)" }}>Start: {currentStartTime.toFixed(2)}s</div>
                  <button onClick={() => tagSong(currentSong.id, "easy")} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", color: "var(--text)", padding: "12px 24px", borderRadius: 8, border: "1px solid var(--border)", cursor: "pointer" }}>
                    EASY (Normal) <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid var(--border)" }}>
                <h3>All caught up!</h3>
                <p style={{ color: "var(--text-dim)" }}>Every song in the database has a difficulty tag.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "catalog" && (
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
              <thead style={{ background: "var(--surface-2)" }}>
                <tr>
                  <th style={{ padding: 16, color: "var(--text-dim)" }}>Song</th>
                  <th style={{ padding: 16, color: "var(--text-dim)" }}>Tag</th>
                  <th style={{ padding: 16, color: "var(--text-dim)" }}>Start</th>
                  <th style={{ padding: 16, textAlign: "right", color: "var(--text-dim)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map(song => (
                  <tr key={song.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontWeight: 600 }}>{song.title}</div>
                      <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{song.artist}</div>
                    </td>
                    <td style={{ padding: 16 }}>
                      {song.difficulty ? (
                        <span style={{ padding: "4px 8px", background: "var(--surface-2)", borderRadius: 4, fontSize: 12 }}>{song.difficulty.toUpperCase()}</span>
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>Untagged</span>
                      )}
                    </td>
                    <td style={{ padding: 16, color: "var(--text-dim)" }}>
                      {song.startTime?.toFixed(1) || "0.0"}s
                    </td>
                    <td style={{ padding: 16, textAlign: "right" }}>
                      <button onClick={() => resetSong(song.id)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", marginRight: 16 }} title="Reset Tags">
                        <RotateCcw size={18} />
                      </button>
                      <button onClick={() => deleteSong(song.id)} style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer" }} title="Delete Song">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "add" && (
          <form onSubmit={handleIngest} style={{ background: "var(--surface)", borderRadius: 16, padding: 32, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>YouTube URL</label>
              <input required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ width: "100%", padding: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>Title</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Tum Hi Ho" style={{ width: "100%", padding: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>Artist</label>
                <input required value={artist} onChange={e => setArtist(e.target.value)} placeholder="Arijit Singh" style={{ width: "100%", padding: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>Movie (Optional)</label>
                <input value={movie} onChange={e => setMovie(e.target.value)} placeholder="Aashiqui 2" style={{ width: "100%", padding: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>Year</label>
                <input type="number" value={year} onChange={e => setYear(e.target.value)} style={{ width: "100%", padding: 12, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, boxSizing: "border-box" }} />
              </div>
            </div>
            
            <button type="submit" disabled={isDownloading} style={{ marginTop: 16, background: "var(--gold)", color: "#241605", border: "none", padding: 16, borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: isDownloading ? "not-allowed" : "pointer", opacity: isDownloading ? 0.7 : 1 }}>
              <Download size={18} />
              {isDownloading ? "Downloading with yt-dlp..." : "Download & Add to Database"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
