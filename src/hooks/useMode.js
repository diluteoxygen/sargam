// Manages the active mode. Persisted in sessionStorage so it survives hot reloads
// but resets each new browser session (daily mode is the default entry point).
// mode: "daily" | "all" | "golden-era" | "new-age"

import { useState, useEffect } from "react";

const SESSION_KEY = "sargam-mode";

export function useMode() {
  const [mode, setModeState] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has("c")) {
        return "challenge";
      }
      return sessionStorage.getItem(SESSION_KEY) || "daily";
    } catch {
      return "daily";
    }
  });

  function setMode(m) {
    setModeState(m);
    try {
      sessionStorage.setItem(SESSION_KEY, m);
    } catch {
      // sessionStorage may be unavailable
    }
  }

  return { mode, setMode };
}
