import os
import json
import uuid

SONGS_FILE = os.path.join(os.path.dirname(__file__), "../data/songs.json")

new_songs = [
    {"title": "Tu Hi Disda", "movie": "Bhooth Bangla", "artist": "Arijit Singh, Nikhita Gandhi", "genre": "new-age", "year": 2026},
    {"title": "Sitaare", "movie": "Ikkis", "artist": "Arijit Singh", "genre": "new-age", "year": 2026},
    {"title": "Ban Ke Dikha", "movie": "Ikkis", "artist": "Vishal Dadlani", "genre": "new-age", "year": 2026},
    {"title": "Jaiye Sajana", "movie": "Dhurandhar The Revenge", "artist": "B Praak", "genre": "new-age", "year": 2026},
    {"title": "Hum Dono", "movie": "Single", "artist": "Vishal Dadlani, Shruti Pathak", "genre": "new-age", "year": 2026},
    {"title": "Arz Kiya Hai", "movie": "Coke Studio Bharat", "artist": "Anuv Jain", "genre": "new-age", "year": 2026},
    {"title": "Tu Hai Toh Main Hoon", "movie": "Sky Force", "artist": "Arijit Singh, Afsana Khan", "genre": "new-age", "year": 2025},
    {"title": "Tum Ho Toh", "movie": "Single", "artist": "Vishal Mishra", "genre": "new-age", "year": 2025},
    {"title": "Bijuria", "movie": "Sunny Sanskari Ki Tulsi Kumari", "artist": "Sunidhi Chauhan", "genre": "new-age", "year": 2025},
    {"title": "Panwadi", "movie": "Sunny Sanskari Ki Tulsi Kumari", "artist": "Badshah", "genre": "new-age", "year": 2025},
    {"title": "Dhurandar", "movie": "Dhurandhar", "artist": "Sachet Tandon", "genre": "new-age", "year": 2025},
    {"title": "Saiyaara", "movie": "Saiyaara", "artist": "Arijit Singh", "genre": "new-age", "year": 2025},
    {"title": "Tauba Tauba", "movie": "Bad Newz", "artist": "Karan Aujla", "genre": "new-age", "year": 2024},
    {"title": "Winning Speech", "movie": "Single", "artist": "Karan Aujla", "genre": "new-age", "year": 2024},
    {"title": "Softly", "movie": "Making Memories", "artist": "Karan Aujla", "genre": "new-age", "year": 2023},
    {"title": "Admirin You", "movie": "Making Memories", "artist": "Karan Aujla", "genre": "new-age", "year": 2023},
    {"title": "Try Me", "movie": "Making Memories", "artist": "Karan Aujla", "genre": "new-age", "year": 2023},
    {"title": "Excuses", "movie": "Single", "artist": "AP Dhillon, Gurinder Gill", "genre": "new-age", "year": 2020},
    {"title": "Brown Munde", "movie": "Single", "artist": "AP Dhillon, Gurinder Gill", "genre": "new-age", "year": 2020},
    {"title": "With You", "movie": "Single", "artist": "AP Dhillon", "genre": "new-age", "year": 2023},
    {"title": "True Stories", "movie": "Single", "artist": "AP Dhillon", "genre": "new-age", "year": 2023},
    {"title": "Summer High", "movie": "Single", "artist": "AP Dhillon", "genre": "new-age", "year": 2022},
    {"title": "Lover", "movie": "MoonChild Era", "artist": "Diljit Dosanjh", "genre": "new-age", "year": 2021},
    {"title": "Peaches", "movie": "Drive Thru", "artist": "Diljit Dosanjh", "genre": "new-age", "year": 2022},
    {"title": "Lemonade", "movie": "Drive Thru", "artist": "Diljit Dosanjh", "genre": "new-age", "year": 2022},
    {"title": "Hass Hass", "movie": "Single", "artist": "Diljit Dosanjh, Sia", "genre": "new-age", "year": 2023},
    {"title": "G.O.A.T.", "movie": "G.O.A.T.", "artist": "Diljit Dosanjh", "genre": "new-age", "year": 2020},
    {"title": "Naina", "movie": "Crew", "artist": "Diljit Dosanjh, Badshah", "genre": "new-age", "year": 2024},
    {"title": "Kinni Kinni", "movie": "Single", "artist": "Diljit Dosanjh", "genre": "new-age", "year": 2023},
    {"title": "Chaleya", "movie": "Jawan", "artist": "Arijit Singh, Shilpa Rao", "genre": "new-age", "year": 2023},
    {"title": "Zinda Banda", "movie": "Jawan", "artist": "Anirudh Ravichander", "genre": "new-age", "year": 2023},
    {"title": "Not Ramaiya Vastavaiya", "movie": "Jawan", "artist": "Anirudh Ravichander", "genre": "new-age", "year": 2023},
    {"title": "O Maahi", "movie": "Dunki", "artist": "Arijit Singh", "genre": "new-age", "year": 2023},
    {"title": "Lutt Putt Gaya", "movie": "Dunki", "artist": "Arijit Singh", "genre": "new-age", "year": 2023},
    {"title": "Arjan Vailly", "movie": "Animal", "artist": "Bhupinder Babbal", "genre": "new-age", "year": 2023},
    {"title": "Pehle Bhi Main", "movie": "Animal", "artist": "Vishal Mishra", "genre": "new-age", "year": 2023},
    {"title": "Hua Main", "movie": "Animal", "artist": "Raghav Chaitanya", "genre": "new-age", "year": 2023},
    {"title": "Saari Duniya Jalaa Denge", "movie": "Animal", "artist": "B Praak", "genre": "new-age", "year": 2023},
    {"title": "Sher Khul Gaye", "movie": "Fighter", "artist": "Vishal-Shekhar, Benny Dayal", "genre": "new-age", "year": 2024},
    {"title": "Ishq Jaisa Kuch", "movie": "Fighter", "artist": "Vishal-Shekhar, Shilpa Rao", "genre": "new-age", "year": 2024},
    {"title": "Heeriye", "movie": "Single", "artist": "Arijit Singh, Jasleen Royal", "genre": "new-age", "year": 2023},
    {"title": "Tere Vaaste", "movie": "Zara Hatke Zara Bachke", "artist": "Varun Jain, Sachin-Jigar", "genre": "new-age", "year": 2023},
    {"title": "Phir Aur Kya Chahiye", "movie": "Zara Hatke Zara Bachke", "artist": "Arijit Singh", "genre": "new-age", "year": 2023},
    {"title": "Tum Kya Mile", "movie": "Rocky Aur Rani Kii Prem Kahaani", "artist": "Arijit Singh, Shreya Ghoshal", "genre": "new-age", "year": 2023},
    {"title": "What Jhumka?", "movie": "Rocky Aur Rani Kii Prem Kahaani", "artist": "Arijit Singh, Jonita Gandhi", "genre": "new-age", "year": 2023},
    {"title": "Ve Kamleya", "movie": "Rocky Aur Rani Kii Prem Kahaani", "artist": "Arijit Singh, Shreya Ghoshal", "genre": "new-age", "year": 2023},
    {"title": "O Bedardeya", "movie": "Tu Jhoothi Main Makkaar", "artist": "Arijit Singh", "genre": "new-age", "year": 2023},
    {"title": "Tere Pyaar Mein", "movie": "Tu Jhoothi Main Makkaar", "artist": "Arijit Singh", "genre": "new-age", "year": 2023},
    {"title": "Show Me The Thumka", "movie": "Tu Jhoothi Main Makkaar", "artist": "Sunidhi Chauhan, Shashwat Singh", "genre": "new-age", "year": 2023},
    {"title": "Jhoome Jo Pathaan", "movie": "Pathaan", "artist": "Arijit Singh, Sukriti Kakar", "genre": "new-age", "year": 2023},
    {"title": "Besharam Rang", "movie": "Pathaan", "artist": "Shilpa Rao, Caralisa Monteiro", "genre": "new-age", "year": 2022},
    {"title": "Kesariya", "movie": "Brahmastra", "artist": "Arijit Singh", "genre": "new-age", "year": 2022},
    {"title": "Deva Deva", "movie": "Brahmastra", "artist": "Arijit Singh", "genre": "new-age", "year": 2022},
    {"title": "Dance Ka Bhoot", "movie": "Brahmastra", "artist": "Arijit Singh", "genre": "new-age", "year": 2022},
    {"title": "Apna Bana Le", "movie": "Bhediya", "artist": "Arijit Singh", "genre": "new-age", "year": 2022},
    {"title": "Raataan Lambiyan", "movie": "Shershaah", "artist": "Jubin Nautiyal, Asees Kaur", "genre": "new-age", "year": 2021},
    {"title": "Ranjha", "movie": "Shershaah", "artist": "B Praak, Jasleen Royal", "genre": "new-age", "year": 2021},
    {"title": "Manike", "movie": "Thank God", "artist": "Yohani, Jubin Nautiyal", "genre": "new-age", "year": 2022},
    {"title": "Bhool Bhulaiyaa 2 Title Track", "movie": "Bhool Bhulaiyaa 2", "artist": "Neeraj Shridhar", "genre": "new-age", "year": 2022},
    {"title": "Ami Je Tomar", "movie": "Bhool Bhulaiyaa 2", "artist": "Arijit Singh", "genre": "new-age", "year": 2022},
    {"title": "Tum Hi Ho", "movie": "Aashiqui 2", "artist": "Arijit Singh", "genre": "new-age", "year": 2013},
    {"title": "Sunn Raha Hai", "movie": "Aashiqui 2", "artist": "Ankit Tiwari", "genre": "new-age", "year": 2013},
    {"title": "Chahun Main Ya Naa", "movie": "Aashiqui 2", "artist": "Arijit Singh, Palak Muchhal", "genre": "new-age", "year": 2013},
    {"title": "Galliyan", "movie": "Ek Villain", "artist": "Ankit Tiwari", "genre": "new-age", "year": 2014},
    {"title": "Zaroorat", "movie": "Ek Villain", "artist": "Mustafa Zahid", "genre": "new-age", "year": 2014},
    {"title": "Hamari Adhuri Kahani", "movie": "Hamari Adhuri Kahani", "artist": "Arijit Singh", "genre": "new-age", "year": 2015},
    {"title": "Samjhawan", "movie": "Humpty Sharma Ki Dulhania", "artist": "Arijit Singh, Shreya Ghoshal", "genre": "new-age", "year": 2014},
    {"title": "Zaalima", "movie": "Raees", "artist": "Arijit Singh, Harshdeep Kaur", "genre": "new-age", "year": 2017},
    {"title": "Laila Main Laila", "movie": "Raees", "artist": "Pawni Pandey", "genre": "new-age", "year": 2017},
    {"title": "Kar Gayi Chull", "movie": "Kapoor & Sons", "artist": "Badshah, Fazilpuria", "genre": "new-age", "year": 2016},
    {"title": "Bolna", "movie": "Kapoor & Sons", "artist": "Arijit Singh, Asees Kaur", "genre": "new-age", "year": 2016},
    {"title": "Let's Nacho", "movie": "Kapoor & Sons", "artist": "Badshah, Benny Dayal", "genre": "new-age", "year": 2016},
    {"title": "Kaun Tujhe", "movie": "M.S. Dhoni", "artist": "Palak Muchhal", "genre": "new-age", "year": 2016},
    {"title": "Besabriyaan", "movie": "M.S. Dhoni", "artist": "Armaan Malik", "genre": "new-age", "year": 2016},
    {"title": "Ae Dil Hai Mushkil", "movie": "Ae Dil Hai Mushkil", "artist": "Arijit Singh", "genre": "new-age", "year": 2016},
    {"title": "Bulleya", "movie": "Ae Dil Hai Mushkil", "artist": "Amit Mishra, Shilpa Rao", "genre": "new-age", "year": 2016},
    {"title": "Cutiepie", "movie": "Ae Dil Hai Mushkil", "artist": "Pardeep Sran, Nakash Aziz", "genre": "new-age", "year": 2016},
    {"title": "Dil Diyan Gallan", "movie": "Tiger Zinda Hai", "artist": "Atif Aslam", "genre": "new-age", "year": 2017},
    {"title": "Swag Se Swagat", "movie": "Tiger Zinda Hai", "artist": "Vishal Dadlani, Neha Bhasin", "genre": "new-age", "year": 2017},
    {"title": "Hawayein", "movie": "Jab Harry Met Sejal", "artist": "Arijit Singh", "genre": "new-age", "year": 2017},
    {"title": "Radha", "movie": "Jab Harry Met Sejal", "artist": "Sunidhi Chauhan, Shahid Mallya", "genre": "new-age", "year": 2017},
    {"title": "Bom Diggy Diggy", "movie": "Sonu Ke Titu Ki Sweety", "artist": "Zack Knight, Jasmin Walia", "genre": "new-age", "year": 2018},
    {"title": "Dil Chori", "movie": "Sonu Ke Titu Ki Sweety", "artist": "Yo Yo Honey Singh", "genre": "new-age", "year": 2018},
    {"title": "Aankh Marey", "movie": "Simmba", "artist": "Mika Singh, Neha Kakkar", "genre": "new-age", "year": 2018},
    {"title": "Tere Bin", "movie": "Simmba", "artist": "Rahat Fateh Ali Khan, Asees Kaur", "genre": "new-age", "year": 2018},
    {"title": "O Saki Saki", "movie": "Batla House", "artist": "Neha Kakkar, Tulsi Kumar", "genre": "new-age", "year": 2019},
    {"title": "Bekhayali", "movie": "Kabir Singh", "artist": "Sachet Tandon", "genre": "new-age", "year": 2019},
    {"title": "Tujhe Kitna Chahne Lage", "movie": "Kabir Singh", "artist": "Arijit Singh", "genre": "new-age", "year": 2019},
    {"title": "Kaise Hua", "movie": "Kabir Singh", "artist": "Vishal Mishra", "genre": "new-age", "year": 2019},
    {"title": "Shaitan Ka Saala", "movie": "Housefull 4", "artist": "Sohail Sen, Vishal Dadlani", "genre": "new-age", "year": 2019},
    {"title": "Tujhe Dekha To", "movie": "Dilwale Dulhania Le Jayenge", "artist": "Kumar Sanu, Lata Mangeshkar", "genre": "golden-era", "year": 1995},
    {"title": "Ho Gaya Hai Tujhko To Pyaar Sajna", "movie": "Dilwale Dulhania Le Jayenge", "artist": "Lata Mangeshkar, Udit Narayan", "genre": "golden-era", "year": 1995},
    {"title": "Mehndi Laga Ke Rakhna", "movie": "Dilwale Dulhania Le Jayenge", "artist": "Lata Mangeshkar, Udit Narayan", "genre": "golden-era", "year": 1995},
    {"title": "Bholi Si Surat", "movie": "Dil To Pagal Hai", "artist": "Udit Narayan, Lata Mangeshkar", "genre": "golden-era", "year": 1997},
    {"title": "Dil To Pagal Hai", "movie": "Dil To Pagal Hai", "artist": "Lata Mangeshkar, Udit Narayan", "genre": "golden-era", "year": 1997},
    {"title": "Koi Mil Gaya", "movie": "Kuch Kuch Hota Hai", "artist": "Udit Narayan, Alka Yagnik, Kavita Krishnamurthy", "genre": "golden-era", "year": 1998},
    {"title": "Ladki Badi Anjani Hai", "movie": "Kuch Kuch Hota Hai", "artist": "Kumar Sanu, Alka Yagnik", "genre": "golden-era", "year": 1998},
    {"title": "Suraj Hua Maddham", "movie": "Kabhi Khushi Kabhie Gham", "artist": "Sonu Nigam, Alka Yagnik", "genre": "golden-era", "year": 2001},
    {"title": "Bole Chudiyan", "movie": "Kabhi Khushi Kabhie Gham", "artist": "Kavita K, Alka Y, Sonu N, Udit N, Amit K", "genre": "golden-era", "year": 2001},
    {"title": "You Are My Soniya", "movie": "Kabhi Khushi Kabhie Gham", "artist": "Sonu Nigam, Alka Yagnik", "genre": "golden-era", "year": 2001},
    {"title": "Kal Ho Naa Ho", "movie": "Kal Ho Naa Ho", "artist": "Sonu Nigam", "genre": "golden-era", "year": 2003},
    {"title": "Maahi Ve", "movie": "Kal Ho Naa Ho", "artist": "Sadhana S, Sujata B, Udit N, Sonu N, Shankar M", "genre": "golden-era", "year": 2003},
    {"title": "It's The Time To Disco", "movie": "Kal Ho Naa Ho", "artist": "Shaan, Vasundhara Das, KK", "genre": "golden-era", "year": 2003},
    {"title": "Main Yahaan Hoon", "movie": "Veer-Zaara", "artist": "Udit Narayan", "genre": "golden-era", "year": 2004},
    {"title": "Tere Liye", "movie": "Veer-Zaara", "artist": "Lata Mangeshkar, Roop Kumar Rathod", "genre": "golden-era", "year": 2004},
    {"title": "Do Pal", "movie": "Veer-Zaara", "artist": "Lata Mangeshkar, Sonu Nigam", "genre": "golden-era", "year": 2004},
    {"title": "Mitwa", "movie": "Kabhi Alvida Naa Kehna", "artist": "Shafqat Amanat Ali, Shankar Mahadevan, Caralisa", "genre": "golden-era", "year": 2006},
    {"title": "Kabhi Alvida Naa Kehna", "movie": "Kabhi Alvida Naa Kehna", "artist": "Sonu Nigam, Alka Yagnik", "genre": "golden-era", "year": 2006},
    {"title": "Where's The Party Tonight", "movie": "Kabhi Alvida Naa Kehna", "artist": "Shaan, Vasundhara Das, Loy Mendonsa, Shankar M", "genre": "golden-era", "year": 2006},
    {"title": "Bidi Jalaile", "movie": "Omkara", "artist": "Sunidhi Chauhan, Sukhwinder Singh", "genre": "golden-era", "year": 2006},
    {"title": "Namak", "movie": "Omkara", "artist": "Rekha Bhardwaj, Rakesh Pandit", "genre": "golden-era", "year": 2006},
    {"title": "Kajra Re", "movie": "Bunty Aur Babli", "artist": "Alisha Chinai, Shankar Mahadevan, Javed Ali", "genre": "golden-era", "year": 2005},
    {"title": "Chup Chup Ke", "movie": "Bunty Aur Babli", "artist": "Sonu Nigam, Mahalaxmi Iyer", "genre": "golden-era", "year": 2005},
    {"title": "Dhoom Machale", "movie": "Dhoom", "artist": "Sunidhi Chauhan", "genre": "golden-era", "year": 2004},
    {"title": "Crazy Kiya Re", "movie": "Dhoom 2", "artist": "Sunidhi Chauhan", "genre": "golden-era", "year": 2006},
    {"title": "Mauja Hi Mauja", "movie": "Jab We Met", "artist": "Mika Singh", "genre": "golden-era", "year": 2007},
    {"title": "Tum Se Hi", "movie": "Jab We Met", "artist": "Mohit Chauhan", "genre": "golden-era", "year": 2007},
    {"title": "Yeh Ishq Hai", "movie": "Jab We Met", "artist": "Shreya Ghoshal", "genre": "golden-era", "year": 2007},
    {"title": "Pehli Nazar Mein", "movie": "Race", "artist": "Atif Aslam", "genre": "golden-era", "year": 2008},
    {"title": "Zara Zara Touch Me", "movie": "Race", "artist": "Monali Thakur", "genre": "golden-era", "year": 2008},
    {"title": "Desi Girl", "movie": "Dostana", "artist": "Shankar Mahadevan, Sunidhi Chauhan, Vishal Dadlani", "genre": "golden-era", "year": 2008},
    {"title": "Maa Da Laadla", "movie": "Dostana", "artist": "Saleem", "genre": "golden-era", "year": 2008},
    {"title": "Iktara", "movie": "Wake Up Sid", "artist": "Kavita Seth, Amitabh Bhattacharya", "genre": "golden-era", "year": 2009},
    {"title": "Pee Loon", "movie": "Once Upon A Time In Mumbaai", "artist": "Mohit Chauhan", "genre": "golden-era", "year": 2010},
    {"title": "Tum Jo Aaye", "movie": "Once Upon A Time In Mumbaai", "artist": "Rahat Fateh Ali Khan, Tulsi Kumar", "genre": "golden-era", "year": 2010},
    {"title": "Munni Badnaam Hui", "movie": "Dabangg", "artist": "Mamta Sharma, Aishwarya, Master Saleem", "genre": "golden-era", "year": 2010},
    {"title": "Tere Mast Mast Do Nain", "movie": "Dabangg", "artist": "Rahat Fateh Ali Khan", "genre": "golden-era", "year": 2010},
]

def main():
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

    print(f"Added {added_count} new songs. Total is now {len(songs)}.")

if __name__ == "__main__":
    main()
