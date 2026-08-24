#!/usr/bin/env bash
# upload_highlight_clips.sh
#
# Uploads generated highlight clips from data/highlight_clips/ to Firebase
# Storage, replacing the existing audio files at the same paths.
#
# Prerequisites:
#   firebase-tools installed: npm install -g firebase-tools
#   Authenticated: firebase login
#   FIREBASE_PROJECT set (or pass --project flag)
#
# The existing audioUrl convention is:
#   https://firebasestorage.googleapis.com/v0/b/sargam-app-2026.firebasestorage.app/o/audio%2F<song_id>.m4a?alt=media
#
# This script uses gsutil (gcloud SDK) to upload, which supports --replace
# and is faster than firebase-tools for bulk uploads.
#
# Usage:
#   bash scripts/upload_highlight_clips.sh [--dry-run] [--bucket BUCKET_NAME]
#
# After upload completes, run:
#   python3 scripts/reset_starttimes.py
#   git add data/songs.json && git commit -m "016: reset startTime to 0 after highlight clip upload"

set -euo pipefail

CLIP_DIR="$(dirname "$0")/../data/highlight_clips"
BUCKET="gs://sargam-app-2026.firebasestorage.app/audio"
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        --bucket=*) BUCKET="${arg#*=}" ;;
    esac
done

if [ ! -d "$CLIP_DIR" ]; then
    echo "Clip directory not found: $CLIP_DIR"
    echo "Run: python3 scripts/generate_highlight_clips.py"
    exit 1
fi

CLIP_COUNT=$(ls "$CLIP_DIR"/*.m4a 2>/dev/null | wc -l)
echo "Found $CLIP_COUNT clips in $CLIP_DIR"
echo "Target bucket: $BUCKET"

if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] Would upload $CLIP_COUNT files. Showing first 5:"
    ls "$CLIP_DIR"/*.m4a | head -5
    exit 0
fi

echo "Starting upload..."
gsutil -m -h "Content-Type:audio/mp4" -h "Cache-Control:public, max-age=31536000" \
    cp -r "$CLIP_DIR"/*.m4a "$BUCKET/"

echo ""
echo "Upload complete."
echo ""
echo "Next steps:"
echo "  1. python3 scripts/reset_starttimes.py"
echo "  2. git add data/songs.json && git commit -m '016: reset startTime to 0 after highlight clip upload'"
echo "  3. Verify in-browser: play a snippet, confirm audio plays from the hook from the beginning,"
echo "     confirm win-celebration plays the clip."
