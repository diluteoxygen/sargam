---
status: done
depends_on: [003]
created: 2026-08-22
updated: 2026-08-22
---

# 009 — How to Play Modal

## Context

The header in `sargam.jsx` has a `HelpCircle` button with `aria-label="How to play"`. It currently does nothing. This ticket implements the modal it should open.

Read before starting:
- `src/SargamLegacy.jsx` lines 458-461 (the button) and lines 232-337 (SettingsModal as a structural reference for modal pattern)
- `docs/spec.md` section 3 (game rules to explain) and section 10 (visual design constraints)
- `docs/domain-model.md` section 3.1 (reveal tier table — use it in the instructions)

## Scope

**In scope:**

1. Create `src/components/HowToPlayModal.jsx`. It uses the same `sg-overlay`/`sg-modal` pattern as `SettingsModal.jsx` (click outside closes). No new CSS classes needed beyond what already exists.

2. Content of the modal — written in plain English, no emojis:
   - Title: "How to Play"
   - Paragraph: "A snippet of a Bollywood song plays. Guess the title. Each wrong guess or skip reveals a longer snippet."
   - Reveal tier table (matching the spec):
     | Attempt | Snippet length |
     |---------|---------------|
     | 1       | 0.2 seconds   |
     | 2       | 0.5 seconds   |
     | 3       | 2 seconds     |
     | 4       | 5 seconds     |
     | 5 or 6  | Full song     |
   - Paragraph: "The earlier you guess correctly, the higher your score."
   - Score table (from spec.md section 3.3):
     | Attempt | Score |
     |---------|-------|
     | 1       | 1000  |
     | 2       | 800   |
     | 3       | 600   |
     | 4       | 400   |
     | 5       | 200   |
     | 6       | 100   |
     | No guess | 0   |
   - A "Got it" button (solid gold button, closes the modal).

3. Wire the `HelpCircle` button in `src/App.jsx` (or wherever the header is) to set modal state to `"help"` (or equivalent).

**Out of scope:**
- Animated tutorial or interactive demo
- Localizing the instructions into Hindi
- Any change to the visual design tokens

## Acceptance criteria

- [x] Clicking the `?` button opens the How to Play modal.
- [x] Clicking outside the modal or the "Got it" button closes it.
- [x] The modal contains the reveal tier table and scoring table matching spec.md section 3.1 and 3.3 exactly.
- [x] No emojis appear anywhere in the modal content.
- [x] The modal follows the same overlay/modal CSS pattern as SettingsModal (uses `sg-overlay`, `sg-modal`).
- [x] `status` is flipped to `done`.

## File pointers

- `src/components/HowToPlayModal.jsx` — create this file
- `src/App.jsx` — wire the button
- `src/SargamLegacy.jsx` lines 232-337 — SettingsModal for structural reference
- `docs/spec.md` sections 3.1 and 3.3 — source of truth for the tables

## Changelog

- 2026-08-22: Created src/components/HowToPlayModal.jsx containing canonical reveal tier and scoring tables without emojis, wired to header button in App.jsx.
