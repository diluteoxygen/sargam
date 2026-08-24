import React, { useState } from "react";
import { User, Volume2, ChevronDown, RotateCcw } from "lucide-react";
import Toggle from "./Toggle.jsx";

export default function SettingsModal({
  onClose,
  songVolume,
  onSongVolumeChange,
  sfxEnabled,
  onSfxEnabledChange,
  sfxVolume,
  onSfxVolumeChange,
  darkTheme,
  onDarkThemeChange,
  reduceMotion,
  onReduceMotionChange
}) {
  const [accessOpen, setAccessOpen] = useState(false);

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all your stats and progress? This cannot be undone.")) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        // Delete everything related to Sargam except user preferences
        if (k && k.startsWith("sargam-") && k !== "sargam-settings") {
          localStorage.removeItem(k);
        }
      }
      window.location.reload();
    }
  };

  return (
    <div className="sg-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sg-modal sg-settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sg-settings-layout">
          <aside className="sg-settings-nav">
            <div className="sg-avatar">
              <User size={20} />
            </div>
            <button className="sg-settings-nav-item is-active" type="button">
              Preferences
            </button>
          </aside>

          <section className="sg-settings-panel">
            {/* Song audio volume */}
            <div className="sg-pref-row">
              <div className="sg-pref-label">
                <Volume2 size={16} />
                Song Audio
              </div>
              <div className="sg-pref-control">
                <span className="sg-pref-pct">{songVolume}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={songVolume}
                  onChange={(e) => onSongVolumeChange(Number(e.target.value))}
                  className="sg-slider"
                />
              </div>
            </div>

            {/* Sound effects */}
            <div className="sg-pref-row">
              <div className="sg-pref-toggle-row">
                <div className="sg-pref-label">
                  <Volume2 size={16} />
                  Sound Effects
                </div>
                <Toggle checked={sfxEnabled} onChange={onSfxEnabledChange} />
              </div>
              {sfxEnabled && (
                <div className="sg-pref-control" style={{ marginTop: 10 }}>
                  <span className="sg-pref-pct">{sfxVolume}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={(e) => onSfxVolumeChange(Number(e.target.value))}
                    className="sg-slider"
                  />
                </div>
              )}
            </div>

            {/* Dark theme */}
            <div className="sg-pref-row sg-pref-toggle-row">
              <div className="sg-pref-label">Dark Theme</div>
              <Toggle checked={darkTheme} onChange={onDarkThemeChange} />
            </div>

            {/* Accessibility accordion */}
            <button
              type="button"
              className="sg-accordion-head"
              onClick={() => setAccessOpen((v) => !v)}
            >
              <span>Accessibility</span>
              <ChevronDown size={16} className={accessOpen ? "sg-chev is-open" : "sg-chev"} />
            </button>
            {accessOpen && (
              <div className="sg-accordion-body">
                <div className="sg-pref-toggle-row">
                  <span className="sg-pref-sublabel">Reduce motion</span>
                  <Toggle checked={reduceMotion} onChange={onReduceMotionChange} />
                </div>
              </div>
            )}
            
            {/* Danger Zone */}
            <div className="sg-pref-row" style={{ marginTop: "2rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <div className="sg-pref-label" style={{ color: "var(--wrong)", marginBottom: "0.5rem" }}>
                Danger Zone
              </div>
              <button 
                type="button" 
                onClick={handleResetData}
                style={{ 
                  backgroundColor: "var(--wrong)", 
                  color: "white", 
                  border: "none", 
                  padding: "10px 16px", 
                  borderRadius: "6px", 
                  cursor: "pointer",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                <RotateCcw size={16} />
                Reset Stats & Progress
              </button>
            </div>

            {/* Legal Links */}
            <div style={{ marginTop: "2rem", display: "flex", gap: "16px", justifyContent: "center", fontSize: "12px", opacity: 0.7 }}>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dim)", textDecoration: "none" }} onMouseOver={(e) => e.target.style.color = "var(--text)"} onMouseOut={(e) => e.target.style.color = "var(--text-dim)"}>Privacy Policy</a>
              <span style={{ color: "var(--border)" }}>&bull;</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-dim)", textDecoration: "none" }} onMouseOver={(e) => e.target.style.color = "var(--text)"} onMouseOut={(e) => e.target.style.color = "var(--text-dim)"}>Terms of Service</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
