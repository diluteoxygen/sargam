#!/bin/bash
set -e
echo "Processing newly added songs..."

if [ ! -f added_ids.json ]; then
    echo "No added_ids.json found."
    exit 0
fi

IDS=$(python3 -c "import json; print('\n'.join(json.load(open('added_ids.json'))))")

for ID in $IDS; do
    echo "==================================="
    echo "Processing ID: $ID"
    echo "1. Computing RMS onset..."
    python3 scripts/compute_onset_rms.py --only-id "$ID"
    echo "2. Generating highlight clip..."
    python3 scripts/generate_highlight_clips.py --only-id "$ID"
done

echo "3. Resetting start times for all generated clips..."
python3 scripts/reset_starttimes.py

echo "Done processing new songs!"
