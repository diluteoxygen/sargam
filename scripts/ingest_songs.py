import json
import os
import re
import subprocess
import shlex

SONGS_TEXT = """
1. **Kesariya** – Arijit Singh, Pritam
2. **Tauba Tauba** – Karan Aujla, Ikky
3. **Raataan Lambiyan** – Jubin Nautiyal, Asees Kaur
4. **Cheques** – Shubh
5. **Maan Meri Jaan** – King
6. **Lut Gaye** – Jubin Nautiyal
7. **Brown Munde** – AP Dhillon, Gurinder Gill, Shinda Kahlon
8. **Apna Bana Le** – Arijit Singh, Sachin-Jigar
9. **Chaleya** – Arijit Singh, Shilpa Rao, Anirudh Ravichander
10. **295** – Sidhu Moose Wala
11. **Big Dawgs** – Hanumankind, Kalmi
12. **Husn** – Anuv Jain
13. **Aaj Ki Raat** – Madhubanti Bagchi, Divya Kumar, Sachin-Jigar
14. **Arjan Vailly** – Bhupinder Babbal, Manan Bhardwaj
15. **Softly** – Karan Aujla, Ikky
16. **Excuses** – AP Dhillon, Gurinder Gill
17. **Heeriye** – Jasleen Royal, Arijit Singh
18. **Pehle Bhi Main** – Vishal Mishra, Raj Shekhar
19. **Satranga** – Arijit Singh, Shreyas Puranik
20. **Bijlee Bijlee** – Harrdy Sandhu, B Praak
21. **Aayi Nai** – Pawan Singh, Simran Choudhary, Sachin-Jigar
22. **Ranjha** – B Praak, Jasleen Royal
23. **Genda Phool** – Badshah, Payal Dev
24. **Millionaire** – Yo Yo Honey Singh
25. **Lover** – Diljit Dosanjh
26. **Titliaan** – Afsana Khan, Jaani, B Praak
27. **With You** – AP Dhillon
28. **Jamal Kudu** – Kayan, Harshavardhan Rameshwar
29. **What Jhumka?** – Arijit Singh, Jonita Gandhi, Pritam
30. **Kahani Suno 2.0** – Kaifi Khalil
31. **Elevated** – Shubh
32. **No Love** – Shubh
33. **Baller** – Shubh, Ikky
34. **O Maahi** – Arijit Singh, Pritam
35. **Sajni (O Sajni Re)** – Arijit Singh, Ram Sampath
36. **Kinni Kinni** – Diljit Dosanjh
37. **Besharam Rang** – Shilpa Rao, Vishal-Shekhar
38. **Jhoome Jo Pathaan** – Arijit Singh, Sukriti Kakar, Vishal-Shekhar
39. **Tum Kya Mile** – Arijit Singh, Shreya Ghoshal, Pritam
40. **Tere Pyaar Mein** – Arijit Singh, Nikhita Gandhi, Pritam
41. **The Last Ride** – Sidhu Moose Wala, Wazir Patar
42. **Levels** – Sidhu Moose Wala, Sunny Malton
43. **Admirin' You** – Karan Aujla, Preston Pablo, Ikky
44. **Jugnu** – Badshah, Nikhita Gandhi
45. **Pani Pani** – Badshah, Aastha Gill
46. **Shayad** – Arijit Singh, Pritam
47. **Ve Haaniyaan** – Danny, Avvy Sra, Sagar
48. **Illuminati** – Sushin Shyam, Dabzee
49. **Tu Aake Dekhle** – King
50. **Jo Tum Mere Ho** – Anuv Jain
51. **Naina** – Diljit Dosanjh, Badshah
52. **Hass Hass** – Diljit Dosanjh, Sia
53. **Daku** – Chani Nattan, Inderpal Moga
54. **Still Rollin** – Shubh
55. **King Shit** – Shubh
56. **Winning Speech** – Karan Aujla, Mxrci
57. **52 Bars** – Karan Aujla, Ikky
58. **One Love** – Shubh
59. **Insane** – AP Dhillon, Gurinder Gill, Shinda Kahlon
60. **Summer High** – AP Dhillon
61. **Dil Nu** – AP Dhillon
62. **Wo Noor** – AP Dhillon
63. **Spaceship** – AP Dhillon, Gurinder Gill
64. **Majhail** – AP Dhillon, Gurinder Gill
65. **G.O.A.T.** – Diljit Dosanjh
66. **Born to Shine** – Diljit Dosanjh
67. **Vibe** – Diljit Dosanjh
68. **Clash** – Diljit Dosanjh
69. **Lalkara** – Diljit Dosanjh, Sultaan
70. **Never Fold** – Sidhu Moose Wala, Sunny Malton
71. **Bitch I'm Back** – Sidhu Moose Wala
72. **These Days** – Sidhu Moose Wala, Bohemia
73. **Signed To God** – Sidhu Moose Wala
74. **SYL** – Sidhu Moose Wala
75. **Drippy** – Sidhu Moose Wala, AR Paisley, Mxrci
76. **410** – Sidhu Moose Wala, Sunny Malton
77. **Watch Out** – Sidhu Moose Wala, Sikander Kahlon
78. **We Rollin** – Shubh
79. **Her** – Shubh
80. **Offshore** – Shubh
81. **Dior** – Shubh
82. **You and Me** – Shubh
83. **Bandana** – Shubh
84. **MVP** – Shubh
85. **Safety Off** – Shubh
86. **White Brown Black** – Karan Aujla, Avvy Sra, Jaani
87. **Antidote** – Karan Aujla, Jay Trak
88. **Try Me** – Karan Aujla, Ikky
89. **Jee Ni Lagda** – Karan Aujla
90. **Chitta Kurta** – Karan Aujla
91. **Players** – Badshah, Karan Aujla
92. **God Damn** – Badshah, Karan Aujla
93. **Soulmate** – Badshah, Arijit Singh
94. **Payal** – Yo Yo Honey Singh, Paradox
95. **Bonita** – Yo Yo Honey Singh
96. **Jatt Mehkma** – Yo Yo Honey Singh
97. **Bhool Bhulaiyaa 3 Title Track** – Pitbull, Diljit Dosanjh, Neeraj Shridhar
98. **Ami Je Tomar 3.0** – Shreya Ghoshal, Arijit Singh, Pritam
99. **Jaana Samjho Na** – Aditya Rikhari, Tulsi Kumar, Lijo George-DJ Chetas
100. **Samjho Na** – Aditya Rikhari
101. **Teri Baaton Mein Aisa Uljha Jiya** – Raghav, Tanishk Bagchi, Asees Kaur
102. **Akhiyaan Gulaab** – Mitraz
103. **Laal Peeli Akhiyaan** – Romy, Tanishk Bagchi
104. **Tum Se** – Sachin-Jigar, Raghav Chaitanya, Varun Jain
105. **Taras** – Jasmine Sandlas, Sachin-Jigar
106. **Ishq Mitaye** – Mohit Chauhan, A.R. Rahman
107. **Naram Kaalja** – Alka Yagnik, Richa Sharma, Pooja Tiwari, A.R. Rahman
108. **Vida Karo** – Arijit Singh, Jonita Gandhi, A.R. Rahman
109. **Tu Kya Jaane** – Yashika Sikka, A.R. Rahman
110. **Baaja** – Mohit Chauhan, Romy, A.R. Rahman
111. **Param Sundari** – Shreya Ghoshal, A.R. Rahman
112. **Chaka Chak** – Shreya Ghoshal, A.R. Rahman
113. **Rait Zara Si** – Arijit Singh, Shashaa Tirupati, A.R. Rahman
114. **Doobey** – Lothika, OAFF, Savera
115. **Gehraiyaan Title Track** – Lothika, OAFF, Savera
116. **Ghodey Pe Sawaar** – Sireesha Bhagavatula, Amit Trivedi
117. **Phero Na Najariya** – Sireesha Bhagavatula, Amit Trivedi
118. **Shauq** – Shahid Mallya, Sireesha Bhagavatula, Swanand Kirkire, Amit Trivedi
119. **Jehda Nasha** – Amar Jalal, IP Singh, Yohani, Harjot Kaur
120. **Manike** – Yohani, Jubin Nautiyal, Surya Ragunaathan
121. **Deva Deva** – Arijit Singh, Jonita Gandhi, Pritam
122. **Rasiya** – Shreya Ghoshal, Tushar Joshi, Pritam
123. **Dance Ka Bhoot** – Arijit Singh, Pritam
124. **Ve Kamleya** – Arijit Singh, Shreya Ghoshal, Pritam
125. **Kudmayi** – Sachet Tandon, Shahid Mallya, Pritam
126. **Dhindhora Baje Re** – Darshan Raval, Bhoomi Trivedi, Pritam
127. **Pyaar Hota Kayi Baar Hai** – Arijit Singh, Pritam
128. **O Bedardeya** – Arijit Singh, Pritam
129. **Show Me The Thumka** – Sunidhi Chauhan, Shashwat Singh, Pritam
130. **Zinda Banda** – Anirudh Ravichander
131. **Not Ramaiya Vastavaiya** – Vishal Dadlani, Shilpa Rao, Anirudh Ravichander
132. **Lutt Putt Gaya** – Arijit Singh, Pritam
133. **Nikle The Kabhi Hum Ghar Se** – Sonu Nigam, Pritam
134. **Papa Meri Jaan** – Sonu Nigam, Harshavardhan Rameshwar
135. **Saari Duniya Jalaa Denge** – B Praak, Jaani
136. **Main Nikla Gaddi Leke (Reprise)** – Udit Narayan, Aditya Narayan, Mithoon
137. **Udd Jaa Kaale Kaava (Reprise)** – Udit Narayan, Alka Yagnik, Mithoon
138. **Zihaal e Miskin** – Vishal Mishra, Shreya Ghoshal
139. **Naseeb Se** – Vishal Mishra, Payal Dev
140. **Jaanam** – Vishal Mishra
141. **Khoobsurat** – Vishal Mishra, Sachin-Jigar
142. **Tumhare Hi Rahenge Hum** – Varun Jain, Shilpa Rao, Sachin-Jigar
143. **Tilasmi Bahein** – Sharmistha Chatterjee, Sanjay Leela Bhansali
144. **Sakal Ban** – Raja Hasan, Sanjay Leela Bhansali
145. **Chaudhavi Shab** – Sanjay Leela Bhansali
146. **Choli Ke Peeche** – Diljit Dosanjh, Ila Arun, Alka Yagnik
147. **Ghagra** – Ila Arun, Romy, Srushti Tawade
148. **Do U Know (Khel Khel Mein)** – Diljit Dosanjh, Tanishk Bagchi
149. **Hauli Hauli** – Guru Randhawa, Yo Yo Honey Singh, Neha Kakkar
150. **Chal Kudiye** – Diljit Dosanjh, Alia Bhatt, Manpreet Singh
151. **Tenu Sang Rakhna** – Arijit Singh, Anumita Nadesan, Achint
152. **Akhiyaan De Kol** – Shilpa Rao, Mellow D, Tanishk Bagchi
153. **Raanjhan** – Parampara Tandon, Sachet-Parampara
154. **Angaaron (The Couple Song)** – Shreya Ghoshal, Devi Sri Prasad
155. **Pushpa Pushpa** – Mika Singh, Devi Sri Prasad
156. **Kissik** – Sublahshini, Devi Sri Prasad
157. **Srivalli (Hindi)** – Javed Ali, Devi Sri Prasad
158. **Oo Bolega Ya Oo Oo Bolega** – Kanika Kapoor, Devi Sri Prasad
159. **Saami Saami (Hindi)** – Sunidhi Chauhan, Devi Sri Prasad
160. **Nadiyon Paar (Let the Music Play)** – Sachin-Jigar, Rashmeet Kaur, Shamur
161. **Kusu Kusu** – Zahrah S Khan, Dev Negi, Tanishk Bagchi
162. **Tip Tip (Sooryavanshi)** – Udit Narayan, Alka Yagnik, Tanishk Bagchi
163. **Najaa (Sooryavanshi)** – Pav Dharia, Nikhita Gandhi, Tanishk Bagchi
164. **Garmi** – Badshah, Neha Kakkar
165. **Illegal Weapon 2.0** – Jasmine Sandlas, Garry Sandhu
166. **Muqabla (Street Dancer 3D)** – Yash Narvekar, Parampara Thakur, Tanishk Bagchi
167. **Burjkhalifa** – Shashi-DJ Khushi, Nikhita Gandhi, Madhubanti Bagchi
168. **Care Ni Karda** – Sweetaj Brar, Yo Yo Honey Singh
169. **Taaron Ke Shehar** – Neha Kakkar, Jubin Nautiyal
170. **Baarish Ki Jaaye** – B Praak, Jaani
171. **Filhaal 2 Mohabbat** – B Praak, Jaani
172. **Kya Loge Tum** – B Praak, Jaani
173. **Afsos** – B Praak, Jaani
174. **Besharam Bewaffa** – B Praak, Jaani
175. **Dil Chahte Ho** – Jubin Nautiyal, Payal Dev
176. **Chhor Denge** – Parampara Tandon, Sachet-Parampara
177. **Soni Soni** – Darshan Raval, Jonita Gandhi, Rochak Kohli
178. **Ishq (Lost;Found)** – Faheem Abdullah, Rauhan Malik
179. **Chand Baaliyan** – Aditya A
180. **Alag Aasmaan** – Anuv Jain
181. **Baarishein** – Anuv Jain
182. **Gul** – Anuv Jain
183. **Mishri** – Anuv Jain
184. **Tu Te Sharab** – Jordan Sandhu
185. **Kinna Chir** – The PropheC
186. **Akhiyaan** – Mitraz
187. **Junoon** – Mitraz
188. **Gulaab** – Mitraz
189. **Faasle** – Aditya Rikhari
190. **Jadugar** – Paradox
191. **Babam Bam** – Paradox
192. **BT Ho Gayi** – Paradox
193. **Main Nahi Toh Kaun** – Srushti Tawade
194. **Ram Ram** – MC Square
195. **Nadaan** – MC Square
196. **Khatta Flow** – Seedhe Maut, KR$NA
197. **Hola Amigo** – KR$NA, Seedhe Maut
198. **Old Money** – AP Dhillon
199. **Bora Bora** – AP Dhillon, Ayra Starr
200. **Chhaila** – Sunidhi Chauhan, Shreya Ghoshal, Salim-Sulaiman
"""

DB_PATH = "data/songs.json"
OUT_DIR = os.path.expanduser("~/Documents/sargam_batch2")

os.makedirs(OUT_DIR, exist_ok=True)

with open(DB_PATH, 'r') as f:
    db = json.load(f)

existing_titles = {s["title"].lower().strip() for s in db}

parsed_songs = []
for line in SONGS_TEXT.strip().split("\n"):
    match = re.match(r'\d+\.\s\*\*(.+?)\*\*\s[–-]\s(.+)', line)
    if match:
        title = match.group(1).strip()
        artist = match.group(2).strip()
        parsed_songs.append({"title": title, "artist": artist})

print(f"Found {len(parsed_songs)} songs in the list.")

added_count = 0
for i, song in enumerate(parsed_songs):
    if song["title"].lower().strip() in existing_titles:
        print(f"[{i+1}/200] SKIPPING {song['title']} - already in DB")
        continue

    print(f"[{i+1}/200] DOWNLOADING {song['title']} by {song['artist']}...")
    
    # Generate unique ID
    slug = re.sub(r'[^a-z0-9]+', '-', song["title"].lower()).strip('-')
    
    # Download with yt-dlp extracting best audio directly to m4a
    search_query = f"{song['title']} {song['artist']} lyric full"
    out_tmpl = os.path.join(OUT_DIR, f"{slug}.%(ext)s")
    
    cmd = [
        "yt-dlp",
        f"ytsearch1:{search_query}",
        "-x",
        "--audio-format", "m4a",
        "--audio-quality", "64k",
        "-o", out_tmpl,
        "--force-overwrites"
    ]
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Append to DB
        new_entry = {
            "id": slug,
            "title": song["title"],
            "movie": "",
            "artist": song["artist"],
            "genre": "trending",
            "audioUrl": f"https://firebasestorage.googleapis.com/v0/b/sargam-app-2026.firebasestorage.app/o/audio%2F{slug}.m4a?alt=media",
            "startTime": 0,
            "difficulty": "medium",
            "year": 2024
        }
        db.append(new_entry)
        
        # Write back to JSON immediately so partial progress is saved
        with open(DB_PATH, 'w') as f:
            json.dump(db, f, indent=2)
            
        added_count += 1
        existing_titles.add(song["title"].lower().strip())
        print(f"  -> SUCCESS! Saved to {slug}.m4a")
        
    except subprocess.CalledProcessError:
        print(f"  -> ERROR downloading {song['title']}")

print(f"\nDONE! Downloaded {added_count} new songs.")
