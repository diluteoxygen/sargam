import os, json, uuid
SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")
new_songs = [
    {"title": "Naatu Naatu", "movie": "RRR", "artist": "Rahul Sipligunj, Kaala Bhairava", "genre": "new-age", "year": 2022},
    {"title": "Kala Chashma", "movie": "Baar Baar Dekho", "artist": "Amar Arshi, Badshah", "genre": "new-age", "year": 2016},
    {"title": "Ghungroo", "movie": "War", "artist": "Arijit Singh, Shilpa Rao", "genre": "new-age", "year": 2019},
    {"title": "Dil Diyan Gallan", "movie": "Tiger Zinda Hai", "artist": "Atif Aslam", "genre": "new-age", "year": 2017},
    {"title": "Tum Hi Aana", "movie": "Marjaavaan", "artist": "Jubin Nautiyal", "genre": "new-age", "year": 2019},
    {"title": "Lut Gaye", "movie": "Single", "artist": "Jubin Nautiyal", "genre": "new-age", "year": 2021},
    {"title": "Bijlee Bijlee", "movie": "Single", "artist": "Harrdy Sandhu", "genre": "new-age", "year": 2021},
    {"title": "Param Sundari", "movie": "Mimi", "artist": "Shreya Ghoshal", "genre": "new-age", "year": 2021},
    {"title": "Srivalli", "movie": "Pushpa", "artist": "Javed Ali", "genre": "new-age", "year": 2021},
    {"title": "Oo Bolega Ya Oo Oo Bolega", "movie": "Pushpa", "artist": "Kanika Kapoor", "genre": "new-age", "year": 2021},
    {"title": "Saami Saami", "movie": "Pushpa", "artist": "Sunidhi Chauhan", "genre": "new-age", "year": 2021},
    {"title": "Jalebi Baby", "movie": "Single", "artist": "Tesher, Jason Derulo", "genre": "new-age", "year": 2021},
    {"title": "Pasoori", "movie": "Coke Studio", "artist": "Ali Sethi, Shae Gill", "genre": "new-age", "year": 2022},
    {"title": "Excuses", "movie": "Single", "artist": "AP Dhillon, Gurinder Gill", "genre": "new-age", "year": 2020},
    {"title": "Jug Jug Jeeve", "movie": "Shiddat", "artist": "Sachet Tandon", "genre": "new-age", "year": 2021},
    {"title": "Raabta", "movie": "Agent Vinod", "artist": "Arijit Singh", "genre": "new-age", "year": 2012},
    {"title": "Subhanallah", "movie": "Yeh Jawaani Hai Deewani", "artist": "Sreerama Chandra", "genre": "new-age", "year": 2013},
    {"title": "Kabira", "movie": "Yeh Jawaani Hai Deewani", "artist": "Tochi Raina, Rekha Bhardwaj", "genre": "new-age", "year": 2013},
]
with open(SONGS_FILE, "r") as f:
    songs = json.load(f)
existing_titles = {s["title"].lower().strip() for s in songs}
added_count = 0
for ns in new_songs:
    if ns["title"].lower().strip() not in existing_titles:
        ns["id"] = str(uuid.uuid4())
        ns["startTime"] = 0.0
        ns["audioUrl"] = f"/audio/{ns['id']}.mp3"
        songs.append(ns)
        existing_titles.add(ns["title"].lower().strip())
        added_count += 1
with open(SONGS_FILE, "w") as f:
    json.dump(songs, f, indent=2)
print(f"Added {added_count} more songs. Total is now {len(songs)}.")
