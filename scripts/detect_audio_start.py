import os
import subprocess
import json

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "../public/audio")

def get_first_sound_timestamp(mp3_path, threshold_db=-35):
    if not os.path.exists(mp3_path):
        return 0.0

    # Scan the first 15 seconds for silence
    cmd = [
        'ffmpeg', '-ss', '0', '-t', '15', '-i', mp3_path,
        '-af', f'silencedetect=noise={threshold_db}dB:d=0.03',
        '-f', 'null', '-'
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    lines = res.stderr.split('\n')

    first_silence_start = None
    for line in lines:
        if 'silence_start:' in line:
            try:
                t = float(line.split('silence_start:')[1].strip())
                if first_silence_start is None:
                    first_silence_start = t
            except:
                pass
        if 'silence_end:' in line:
            try:
                end_t = float(line.split('silence_end:')[1].split()[0].strip())
                # If silence started at near 0 (<= 0.12s), the sound starts at end_t
                if first_silence_start is not None and first_silence_start <= 0.12:
                    return round(end_t, 3)
                else:
                    return 0.0
            except:
                pass
    return 0.0

def main():
    with open(SONGS_FILE, "r") as f:
        songs = json.load(f)

    print(f"Detecting first waveform onset for {len(songs)} songs...")
    updated_count = 0

    for idx, s in enumerate(songs):
        song_id = s.get("id")
        mp3_path = os.path.join(AUDIO_DIR, f"{song_id}.mp3")
        start_time = get_first_sound_timestamp(mp3_path, -35)
        s["startTime"] = start_time
        updated_count += 1
        print(f"[{idx+1}/{len(songs)}] {s['title']} ({song_id}) -> startTime: {start_time}s")

    with open(SONGS_FILE, "w") as f:
        json.dump(songs, f, indent=2)

    print(f"\nDone! Updated {updated_count} songs in {SONGS_FILE} with accurate waveform start timestamps.")

if __name__ == "__main__":
    main()
