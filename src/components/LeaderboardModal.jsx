import React, { useState, useEffect } from "react";
import { X, Trophy, Medal, LogIn } from "lucide-react";
import { useLeaderboard } from "../hooks/useLeaderboard.js";
import { getLevel } from "../lib/scoring.js";
import { auth, googleProvider } from "../lib/firebase.js";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { syncFromCloud } from "../lib/sync.js";

export default function LeaderboardModal({ onClose, currentXp }) {
  const { topPlayers, loading } = useLeaderboard(currentXp);
  const [currentUserUid, setCurrentUserUid] = useState(auth.currentUser?.uid || null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncFromCloud(res.user);
      window.location.reload();
    } catch(err) {
      console.error("Login failed", err);
    }
  };

  return (
    <div className="sg-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sg-modal" onMouseDown={(e) => e.stopPropagation()} style={{ padding: "0", overflow: "hidden", maxWidth: 400, width: "100%", height: 600, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Trophy size={24} color="var(--gold)" />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Global Top 50</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: "var(--surface)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", background: "var(--bg)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontWeight: 600 }}>Loading Rankings...</div>
          ) : topPlayers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontWeight: 600 }}>No players yet! Play a game to claim #1.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topPlayers.map((player, index) => {
                const rank = index + 1;
                const isMe = player.id === currentUserUid;
                const level = getLevel(player.xp);
                
                let rankColor = "var(--text-dim)";
                if (rank === 1) rankColor = "#FFD700"; // Gold
                if (rank === 2) rankColor = "#C0C0C0"; // Silver
                if (rank === 3) rankColor = "#CD7F32"; // Bronze

                return (
                  <div 
                    key={player.id} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      padding: "12px 16px", 
                      background: isMe ? "rgba(255, 215, 0, 0.1)" : "var(--surface)", 
                      borderRadius: 12,
                      border: isMe ? "1px solid var(--gold)" : "1px solid var(--border)",
                      gap: 16
                    }}
                  >
                    <div style={{ width: 56, fontSize: 18, fontWeight: 900, color: rankColor, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      #{rank}{rank <= 3 && <Medal size={16} color={rankColor} style={{ marginTop: -2 }} />}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {player.username} {isMe && <span style={{ fontSize: 12, color: "var(--gold)", marginLeft: 6 }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>
                        Level {level}
                      </div>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>
                      {player.xp.toLocaleString()} <span style={{ fontSize: 11, color: "var(--text-dim)" }}>XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !currentUserUid && (
            <div style={{ marginTop: 24, padding: "16px", borderRadius: 12, border: "1px dashed var(--border)", textAlign: "center", background: "rgba(255,255,255,0.02)" }}>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
                Want to see your name up here?<br/>Sign in to join the global leaderboard.
              </p>
              <button onClick={handleLogin} className="sg-btn sg-btn-ghost" style={{ padding: "6px 12px", fontSize: 13, margin: "0 auto" }}>
                <LogIn size={14} style={{ marginRight: 6 }} />
                Sign In with Google
              </button>
            </div>
          )}
        </div>

        

      </div>
    </div>
  );
}
