---
status: done
depends_on: []
created: 2026-08-22
updated: 2026-08-22
---

# 002 — Repo Scaffold and Song Catalog

## Context

The existing codebase is a single file: `sargam.jsx` in the project root. There is no build system, no package.json, no server, and no data layer. This ticket creates the project scaffold that all subsequent tickets depend on.

Read before starting:
- `docs/architecture.md` sections 2 (file structure) and 3 (back-end/data store)
- `docs/domain-model.md` section 1 (Song fields)
- `docs/spec.md` section 6 (stack) and section 9 (genre tabs)

## Scope

**In scope:**

1. Initialize a `package.json` at the project root with:
   - `name: "sargam"`
   - Scripts: `dev` (runs Vite dev server + Express concurrently), `build` (Vite build), `start` (runs Express serving the built `dist/`)
   - Dependencies: `react`, `react-dom`, `lucide-react`, `express`
   - Dev dependencies: `vite`, `@vitejs/plugin-react`

2. Create `vite.config.js` with the React plugin and a proxy rule: `/api` requests forwarded to `http://localhost:3001` during dev.

3. Create the directory tree:
   ```
   src/
     components/   (empty, populated by ticket 003+)
     hooks/        (empty)
     lib/
       normalize.js   -- export the normalize() function from sargam.jsx
       scoring.js     -- export the SCORES array [1000,800,600,400,200,100]
       tiers.js       -- export DEFAULT_TIERS (the 5-element array from spec.md section 3.1)
     App.jsx        -- re-export from sargam.jsx for now (do not rewrite)
     main.jsx       -- ReactDOM.createRoot('#root')
   index.html       -- Vite entry point, mounts #root
   server/
     index.js       -- Express server (ticket 004)
   data/
     songs.json     -- song catalog (this ticket)
   ```

4. Populate `data/songs.json` with the 13 songs already in `sargam.jsx` (the `SONGS` constant), extended with:
   - `id`: kebab-case of the title (e.g. `"tum-hi-ho"`)
   - `genre`: assign `"golden-era"` to songs with a release year before 2000 (Chaiyya Chaiyya 1998, Tujhe Dekha To 1995), `"new-age"` to everything else. Use best-effort based on known film years; this is not a hard correctness requirement.
   - `audioUrl`: empty string `""` for all songs (placeholder until ticket 001 is resolved)
   - `revealTiers`: omit the field for all songs (server will apply the default from `tiers.js`)

5. Move `sargam.jsx` to `src/SargamLegacy.jsx` and add a comment at the top: `// Legacy monolith — source of truth for UI until components are extracted. Do not delete.`

**Out of scope:**
- Splitting sargam.jsx into components (ticket 003)
- Implementing the Express server (ticket 004)
- Populating real audio URLs (ticket 001)

## Acceptance criteria

- [x] `npm install` completes without errors.
- [x] `npm run dev` starts both the Vite dev server and a placeholder Express server (even if Express just returns 404 for now — the dev proxy must not crash Vite).
- [x] `npm run build` produces a `dist/` directory.
- [x] `data/songs.json` contains all 13 songs with valid `id`, `genre`, and `audioUrl: ""` fields.
- [x] `src/lib/normalize.js`, `src/lib/scoring.js`, and `src/lib/tiers.js` exist and export the correct values.
- [x] `src/SargamLegacy.jsx` exists (the original file, moved).
- [x] `status` is flipped to `done`.

## File pointers

- `sargam.jsx` (project root) — source for SONGS constant (lines 31-45) and normalize function (lines 58-60)
- `docs/architecture.md` section 2 — proposed file structure
- `docs/spec.md` section 6 — stack decisions
- `docs/domain-model.md` section 1 — Song schema

## Notes

The `dev` script must run both Vite and Express concurrently. Use the `concurrently` package or an npm workspace script. Do not require two separate terminal windows to be open during development.

## Changelog

- 2026-08-22: Initialized package.json with React/Vite/Express/concurrently, created directory structure, library helpers, data/songs.json with 13 songs, and moved sargam.jsx to src/SargamLegacy.jsx.
