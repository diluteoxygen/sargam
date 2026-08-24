---
status: open
depends_on: [014]
created: 2026-08-24
updated: 2026-08-24
---

# 017 -- Schedule Telemetry Aggregation

## Context

`scripts/aggregate-song-metrics.cjs` (ticket 014) must be run manually to
produce `data/song-metrics.json`, which ticket 015's review process depends on.
Currently nothing triggers it. A review that never runs because no one
remembered to run the script is the same as no review process at all.

This ticket adds a minimal scheduling mechanism so the aggregation runs
automatically on a regular cadence.

## Scope

**In scope:**

1. Choose and implement a scheduling approach:
   - Option A (simplest): a GitHub Actions workflow that runs on a cron
     schedule (e.g., weekly Sunday 00:00 UTC), calls the aggregation script,
     commits the updated `data/song-metrics.json` back to the repo, and
     optionally opens a PR or posts a summary comment. Requires a Firebase
     service account secret stored in GitHub Actions secrets.
   - Option B: a Firebase Cloud Function (HTTP trigger or Pub/Sub scheduled
     trigger) that reads roundEvents and writes to a Firestore `songMetrics`
     collection instead of a JSON file. More infrastructure, more
     operational surface. Only warranted if the JSON file approach breaks
     at scale.
   - Recommendation: Option A. The aggregation script is already Node.js,
     GitHub Actions already has access to the repo, and committing the
     metrics file keeps the audit trail in version control without new
     infrastructure. Option B becomes relevant only if the roundEvents
     collection exceeds a few hundred thousand documents (unlikely at MVP
     scale).

2. Document the cadence choice and the reasoning (weekly is fine for MVP;
   daily only if DAU grows to the point where the 30-event threshold is
   reached within a week for most songs).

**Out of scope:**
- Automating the suitability reclassification based on metrics output (Phase 3)
- Any changes to the aggregation script itself
- Any changes to the game client

## Acceptance criteria

- [ ] The aggregation script runs automatically on a documented cadence
  without manual intervention.
- [ ] The output (`data/song-metrics.json`) is updated and committed
  automatically after each run.
- [ ] A failure in the aggregation run sends a visible signal (email, Slack,
  or GitHub Actions notification) rather than failing silently.
- [ ] The cadence and the service account setup are documented in a
  `docs/runbooks/telemetry-aggregation.md` runbook.

## File pointers

- `scripts/aggregate-song-metrics.cjs` -- the script to schedule
- `.github/workflows/aggregate-telemetry.yml` -- new workflow file
- `docs/runbooks/telemetry-aggregation.md` -- new runbook

## Changelog

- 2026-08-24: Ticket created. Identified during ticket 016 execution as a
  gap: the 015 review process has no trigger, so it would not run in practice
  without this scheduling ticket.
