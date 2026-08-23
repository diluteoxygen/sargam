import React from "react";
import { X, Check } from "lucide-react";

export default function GuessRow({ row, isActive, resultTone }) {
  const status = row?.status || (row?.type === "skip" ? "skip" : row?.correct ? "correct" : row?.type === "guess" ? "wrong" : null);
  const text = row?.text;
  const statusClass = status ? ` is-filled is-${status}` : "";

  return (
    <div
      className={
        "sg-row" + statusClass + (isActive ? " is-active" : "")
      }
    >
      <span className="sg-row-text">
        {status === "skip" && "Skipped"}
        {status === "wrong" && text}
        {status === "correct" && text}
      </span>
      <span className="sg-row-icon">
        {(status === "skip" || status === "wrong") && <X size={20} />}
        {status === "correct" && <Check size={20} />}
      </span>
    </div>
  );
}
