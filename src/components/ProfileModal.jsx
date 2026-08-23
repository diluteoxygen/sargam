import React, { useState, useEffect } from "react";
import { Zap, Clock, Flame, Crown, X, LogIn, LogOut, Star, Moon, Pencil, Check } from "lucide-react";
import { TROPHIES, getUnlockedTrophies } from "../lib/trophies.js";
import { getProgressToNextLevel, loadXP } from "../lib/scoring.js";
import { loadStats } from "../lib/stats.js";
import { auth, googleProvider } from "../lib/firebase.js";
import { signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { syncFromCloud, pushToCloud } from "../lib/sync.js";
import { useLeaderboard } from "../hooks/useLeaderboard.js";

const ICON_MAP = { Zap, Clock, Flame, Crown, Star, Moon };

export default function ProfileModal({ onClose }) {
  const [unlocked, setUnlocked] = useState([]);
  const [xp, setXp] = useState(0);
  const [user, setUser] = useState(() => auth.currentUser);
  
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [tempName, setTempName] = useState("");

  const [stats, setStats] = useState({ totalGames: 0, wins: 0, maxStreak: 0 });
  
  const [joinDate, setJoinDate] = useState(() => {
    let jd = localStorage.getItem("sargam-join-date");
    if (!jd) {
      jd = new Date().toISOString();
      localStorage.setItem("sargam-join-date", jd);
    }
    return jd;
  });

  const refreshData = () => {
    setUnlocked(getUnlockedTrophies());
    setXp(loadXP());
    
    let tGames = 0, tWins = 0, mStreak = 0;
    ["daily", "all", "trending"].forEach(m => {
      const s = loadStats(m);
      tGames += s.totalGames;
      tWins += s.wins;
      if (s.maxStreak > mStreak) mStreak = s.maxStreak;
    });
    setStats({ totalGames: tGames, wins: tWins, maxStreak: mStreak });

    const localName = localStorage.getItem("sargam-username");
    setUsername(auth.currentUser?.displayName || localName || "Guest Player");
    
    let jd = localStorage.getItem("sargam-join-date");
    if (!jd) {
      jd = new Date().toISOString();
      localStorage.setItem("sargam-join-date", jd);
    }
    setJoinDate(jd);
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    window.addEventListener("sargam-sync-complete", handleSync);
    
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        syncFromCloud(u).then(() => refreshData());
      } else {
        refreshData();
      }
    });
    
    return () => {
      window.removeEventListener("sargam-sync-complete", handleSync);
      unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    const keysToClear = [
      "sargam-xp",
      "sargam-trophies",
      "sargam-stats-daily",
      "sargam-stats-all",
      "sargam-stats-trending",
      "sargam-username",
      "sargam-join-date"
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const saveName = async () => {
    const finalName = tempName.trim() || "Guest Player";
    setUsername(finalName);
    localStorage.setItem("sargam-username", finalName);
    
    if (user) {
      try {
        await updateProfile(user, { displayName: finalName });
      } catch (err) {
        console.error("Failed to update profile", err);
      }
    }
    
    pushToCloud();
    setIsEditing(false);
  };

  const { currentLevel, percentage } = getProgressToNextLevel(xp);
  const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  
  let formattedJoinDate = "Unknown";
  try {
    formattedJoinDate = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(joinDate));
  } catch (e) {
    console.error("Invalid join date:", joinDate);
  }

  const { myRank, loading } = useLeaderboard(xp);

  return (
    <div className="sg-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sg-modal" onMouseDown={(e) => e.stopPropagation()} style={{ padding: "0", overflow: "hidden", maxWidth: 400, width: "100%" }}>
        
        {/* Discord-style Banner */}
        <div style={{ height: 100, background: "linear-gradient(135deg, var(--gold), #FF8C00)", position: "relative" }}>
          <button 
            onClick={onClose} 
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar & Top Actions */}
        <div style={{ padding: "0 24px", position: "relative", marginTop: -40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ position: "relative" }}>
              {user?.photoURL ? (
                <img src={user.photoURL} loading="lazy" referrerPolicy="no-referrer" alt="Avatar" style={{ width: 80, height: 80, borderRadius: "50%", border: "6px solid var(--bg)", objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", background: "var(--surface)" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--surface)", border: "6px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)" }}>{currentLevel}</span>
                </div>
              )}
            </div>
            
            {user ? (
              <button onClick={handleLogout} className="sg-btn sg-btn-ghost" style={{ padding: "6px 12px", height: "32px", fontSize: "12px", background: "var(--surface-2)" }}>
                <LogOut size={14} style={{ marginRight: 6 }} /> Sign Out
              </button>
            ) : (
              <button onClick={handleLogin} className="sg-btn sg-btn-solid" style={{ padding: "6px 12px", height: "32px", fontSize: "12px", background: "#fff", color: "#000" }}>
                <LogIn size={14} style={{ marginRight: 6 }} /> Google Sign In
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "16px 24px 24px 24px" }}>
          
          {/* Username & Badges Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {isEditing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input 
                  autoFocus
                  value={tempName}
                  maxLength={16}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", borderRadius: 6, fontSize: 24, fontWeight: 800, width: 200, outline: "none" }}
                />
                <button onClick={saveName} className="sg-btn sg-btn-solid" style={{ width: 32, height: 32, padding: 0, borderRadius: 6 }}>
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
                <h2 title={username} style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{username}</h2>
                {user && (
                  <button onClick={() => { setTempName(username); setIsEditing(true); }} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4, flexShrink: 0 }}>
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            
            {/* Discord-style Badges */}
            {unlocked.length > 0 && (
              <div style={{ display: "flex", gap: 4, background: "var(--surface-2)", padding: "4px 6px", borderRadius: 8, border: "1px solid var(--border)", alignItems: "center" }}>
                {unlocked.map(id => {
                  const trophy = TROPHIES[id];
                  if (!trophy) return null;
                  const IconComponent = ICON_MAP[trophy.icon] || Flame;
                  return (
                    <div key={id} title={`${trophy.title}: ${trophy.desc}`} style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }}>
                      <IconComponent size={16} color={trophy.color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 }}>
            Level {currentLevel} • {Math.round(percentage)}% to next
          </div>
          
          <div style={{ marginTop: 8, height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${percentage}%`, background: "var(--gold)" }} />
          </div>

          {!user && (
            <div style={{ marginTop: 24, padding: 12, background: "var(--surface-2)", borderRadius: 8, fontSize: 13, color: "var(--text-dim)", textAlign: "center", border: "1px solid var(--border)" }}>
              Sign in to permanently save your Rank and Badges across devices!
            </div>
          )}

          {/* Stats Dashboard */}
          <div style={{ marginTop: 24, padding: 16, background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>Global Rank</h3>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)", marginBottom: 24 }}>
              {loading ? "..." : myRank ? `#${myRank.toLocaleString()}` : "Unranked"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Win Rate</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{winRate}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Total Games</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{stats.totalGames}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Max Streak</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>{stats.maxStreak} 🔥</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Member Since</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginTop: 6 }}>{formattedJoinDate}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
