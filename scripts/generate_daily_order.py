import json
import random

def generate_daily_order():
    with open('data/songs.json', 'r') as f:
        songs = json.load(f)
    
    # Filter for suitable songs
    eligible = [s for s in songs if s.get('suitability', 'suitable') not in ('unsuitable', 'provisional_unsuitable')]
    
    # Extract IDs
    ids = [s['id'] for s in eligible]
    
    # Sort them first for deterministic seeding
    ids.sort()
    
    # Randomize with a fixed seed so it's reproducible if needed
    random.seed(42)
    random.shuffle(ids)
    
    # Save to data/daily_order.json
    with open('data/daily_order.json', 'w') as f:
        json.dump(ids, f, indent=2)
        
    print(f"Generated daily_order.json with {len(ids)} songs.")

if __name__ == '__main__':
    generate_daily_order()
