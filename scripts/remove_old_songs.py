import json

with open('data/songs.json') as f:
    db = json.load(f)

old_movies = ['sholay', 'aradhana', 'kabhi kabhie', '1942 a love story', 'mohra', 'yaadon ki baaraat', 'woh kaun thi', 'aandhi', 'maine pyar kiya', 'ddlj', 'baazigar', 'hum aapke hain koun', 'prince', 'umrao jaan', 'hare rama hare krishna', 'karz', 'qayamat se qayamat tak', 'border', 'hum kisise kum naheen', 'dil se', 'kuch kuch hota hai', 'dil to pagal hai', 'dilwale dulhania le jayenge']
old_artists = ['kishore kumar', 'lata mangeshkar', 'mohammed rafi', 'asha bhosle', 'mukesh', 'r.d. burman', 'kumar sanu', 'udit narayan', 'alka yagnik', 'kavita krishnamurthy', 's. p. balasubrahmanyam']

initial_len = len(db)
filtered_db = []

for s in db:
    year = s.get('year')
    artist = s.get('artist', '').lower()
    movie = s.get('movie', '').lower()
    
    is_old = False
    
    # 1. Year based (1990s or older)
    if year and isinstance(year, int) and year <= 1999:
        is_old = True
        
    # 2. Artist based (Legends from 70s-90s)
    if any(a in artist for a in old_artists):
        if not year or (isinstance(year, int) and year <= 2003): 
            is_old = True
            
    # 3. Known old movies
    if any(m == movie for m in old_movies):
        is_old = True

    if not is_old:
        filtered_db.append(s)
    else:
        print(f"REMOVING: {s['title']} ({s.get('year', 'N/A')}) - {s['artist']}")

with open('data/songs.json', 'w') as f:
    json.dump(filtered_db, f, indent=2)

print(f"Removed {initial_len - len(filtered_db)} songs. Current count: {len(filtered_db)}")
