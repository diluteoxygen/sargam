export function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
