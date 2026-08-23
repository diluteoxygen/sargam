import React from "react";

export default function HowToPlayModal({ onClose }) {
  return (
    <div className="sg-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="sg-modal" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div
          className="sg-modal-banner"
          style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}
        >
          <h2 style={{ color: "var(--text)" }}>How to Play</h2>
        </div>

        <div
          className="sg-modal-body"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: "var(--text)" }}>
            A snippet of a Bollywood song plays. Guess the title. Each wrong guess or skip reveals a longer snippet.
          </p>

          <div className="sg-panel" style={{ margin: 0 }}>
            <p className="sg-panel-title">Reveal Tiers</p>
            <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "6px 4px", color: "var(--text-dim)" }}>Attempt</th>
                  <th style={{ padding: "6px 4px", color: "var(--text-dim)" }}>Snippet length</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>1</td>
                  <td style={{ padding: "6px 4px" }}>0.2 seconds</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>2</td>
                  <td style={{ padding: "6px 4px" }}>0.5 seconds</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>3</td>
                  <td style={{ padding: "6px 4px" }}>2 seconds</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>4</td>
                  <td style={{ padding: "6px 4px" }}>5 seconds</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>5</td>
                  <td style={{ padding: "6px 4px" }}>10 seconds</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 4px" }}>6</td>
                  <td style={{ padding: "6px 4px" }}>Full song</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.5", color: "var(--text)" }}>
            The earlier you guess correctly, the higher your score.
          </p>

          <div className="sg-panel" style={{ margin: 0 }}>
            <p className="sg-panel-title">Scoring</p>
            <table style={{ width: "100%", fontSize: "12.5px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "6px 4px", color: "var(--text-dim)" }}>Attempt</th>
                  <th style={{ padding: "6px 4px", color: "var(--text-dim)" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>1</td>
                  <td style={{ padding: "6px 4px" }}>500</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>2</td>
                  <td style={{ padding: "6px 4px" }}>400</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>3</td>
                  <td style={{ padding: "6px 4px" }}>300</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>4</td>
                  <td style={{ padding: "6px 4px" }}>200</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>5</td>
                  <td style={{ padding: "6px 4px" }}>100</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px 4px" }}>6</td>
                  <td style={{ padding: "6px 4px" }}>10</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 4px" }}>No guess</td>
                  <td style={{ padding: "6px 4px" }}>0</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            className="sg-btn sg-btn-solid"
            type="button"
            style={{ width: "100%", marginTop: "4px" }}
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
