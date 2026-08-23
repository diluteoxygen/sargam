import React from "react";

export default function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={"sg-toggle" + (checked ? " is-on" : "")}
      onClick={() => onChange(!checked)}
    >
      <span className="sg-toggle-knob" />
    </button>
  );
}
