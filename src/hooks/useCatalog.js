import { useState, useEffect } from "react";
import searchCatalogData from "../../data/search_catalog.json";

export function useCatalog() {
  const [catalog, setCatalog] = useState(() => ({
    songs: searchCatalogData || [],
    loading: false,
    error: null
  }));

  // With a fully static edge architecture, we just rely on the bundled JSON.
  // Vite's HMR will automatically reload the client if search_catalog.json changes during development.
  // In production, the file is baked into the bundle ensuring 0ms latency.
  
  return catalog;
}
