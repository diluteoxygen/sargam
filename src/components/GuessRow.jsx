import React from "react";

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
      {status === "skip" && "Skipped"}
      {status === "wrong" && text}
      {status === "correct" && text}
    </div>
  );
}
