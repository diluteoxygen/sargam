import json
import subprocess
import os

with open('added_ids.json') as f:
    added_ids = json.load(f)

print(f"Processing {len(added_ids)} new songs...")

for sid in added_ids:
    print(f"--- Computing onset for {sid} ---")
    # I can just call the functions from compute_onset_rms directly!
    # But wait, it's easier to just pass the modified compute_onset_rms.py
