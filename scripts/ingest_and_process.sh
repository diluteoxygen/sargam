#!/bin/bash
set -e

echo "Starting full ingestion and processing pipeline..."

echo "1. Resuming download of new movies..."
python3 scripts/ingest_new_movies.py

echo "2. Processing new songs (RMS onset + highlight clips)..."
bash scripts/process_new.sh

echo "Done! The new songs are added, trimmed, and their startTimes are reset."
