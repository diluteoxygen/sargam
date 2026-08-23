import React from "react";

export default function DistributionChart({ highlight, tone, distribution }) {
  // distribution: { 1: n, 2: n, 3: n, 4: n, 5: n, 6: n, X: n }
  // Falls back to empty if not provided
  const dist = distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  const rows = [1, 2, 3, 4, 5, 6];
  const allValues = [...rows.map((r) => dist[r] || 0), dist["X"] || 0];
  const max = Math.max(...allValues, 1);

  return (
    <div className="sg-dist">
      {rows.map((rowNum) => {
        const val = dist[rowNum] || 0;
        const isHi = highlight === rowNum;
        return (
          <div className="sg-dist-row" key={rowNum}>
            <span className="sg-dist-label">{rowNum}</span>
            <div className="sg-dist-track">
              <div
                className={"sg-dist-fill" + (isHi ? ` is-${tone}` : "")}
                style={{ width: `${Math.max((val / max) * 100, 6)}%` }}
              />
            </div>
            <span className="sg-dist-count">{val}</span>
          </div>
        );
      })}
      <div className="sg-dist-row">
        <span className="sg-dist-label">X</span>
        <div className="sg-dist-track">
          <div
            className={"sg-dist-fill" + (highlight === "X" ? " is-loss" : "")}
            style={{ width: `${Math.max(((dist["X"] || 0) / max) * 100, 6)}%` }}
          />
        </div>
        <span className="sg-dist-count">{dist["X"] || 0}</span>
      </div>
    </div>
  );
}
