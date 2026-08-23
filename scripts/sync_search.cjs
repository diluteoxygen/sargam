const fs = require('fs');
const path = require('path');

const songsDbPath = path.join(__dirname, '../data/songs.json');
const searchDbPath = path.join(__dirname, '../data/search_catalog.json');

const songsDb = require(songsDbPath);
const searchDb = require(searchDbPath);

const searchIds = new Set(searchDb.map(s => s.id));

let addedCount = 0;

// 1. Sync playable songs
for (const song of songsDb) {
  if (!searchIds.has(song.id)) {
    searchDb.push({
      id: song.id,
      title: song.title,
      artist: song.artist || "Unknown",
      movie: song.movie || "",
      genre: song.genre || "trending"
    });
    searchIds.add(song.id);
    addedCount++;
  }
}

// 2. Add Red Herrings (Dummy search entries)
const DUMMY_SONGS = [
  { title: "Chammak Challo", artist: "Akon, Hamsika Iyer", movie: "Ra.One" },
  { title: "Tum Hi Ho Bandhu", artist: "Neeraj Shridhar, Kavita Seth", movie: "Cocktail" },
  { title: "Subha Hone Na De", artist: "Mika Singh, Shefali Alvares", movie: "Desi Boyz" },
  { title: "Kala Chashma", artist: "Amar Arshi, Badshah, Neha Kakkar", movie: "Baar Baar Dekho" },
  { title: "Bom Diggy Diggy", artist: "Zack Knight, Jasmin Walia", movie: "Sonu Ke Titu Ki Sweety" },
  { title: "Kar Gayi Chull", artist: "Badshah, Fazilpuria, Sukriti Kakar, Neha Kakkar", movie: "Kapoor & Sons" },
  { title: "Ghungroo", artist: "Arijit Singh, Shilpa Rao", movie: "War" },
  { title: "Badtameez Dil", artist: "Benny Dayal", movie: "Yeh Jawaani Hai Deewani" },
  { title: "Balam Pichkari", artist: "Vishal Dadlani, Shalmali Kholgade", movie: "Yeh Jawaani Hai Deewani" },
  { title: "Kabira", artist: "Tochi Raina, Rekha Bhardwaj", movie: "Yeh Jawaani Hai Deewani" },
  { title: "Zaalima", artist: "Arijit Singh, Harshdeep Kaur", movie: "Raees" },
  { title: "Hawayein", artist: "Arijit Singh", movie: "Jab Harry Met Sejal" },
  { title: "Gerua", artist: "Arijit Singh, Antara Mitra", movie: "Dilwale" },
  { title: "Janam Janam", artist: "Arijit Singh, Antara Mitra", movie: "Dilwale" },
  { title: "Channa Mereya", artist: "Arijit Singh", movie: "Ae Dil Hai Mushkil" },
  { title: "Ae Dil Hai Mushkil Title Track", artist: "Arijit Singh", movie: "Ae Dil Hai Mushkil" },
  { title: "Bullya", artist: "Amit Mishra, Shilpa Rao", movie: "Ae Dil Hai Mushkil" },
  { title: "Agar Tum Saath Ho", artist: "Alka Yagnik, Arijit Singh", movie: "Tamasha" },
  { title: "Matargashti", artist: "Mohit Chauhan", movie: "Tamasha" },
  { title: "Ilahi", artist: "Arijit Singh", movie: "Yeh Jawaani Hai Deewani" },
  { title: "Kabir Singh - Bekhayali", artist: "Sachet Tandon", movie: "Kabir Singh" },
  { title: "Tujhe Kitna Chahne Lage", artist: "Arijit Singh", movie: "Kabir Singh" },
  { title: "Tera Ban Jaunga", artist: "Akhil Sachdeva, Tulsi Kumar", movie: "Kabir Singh" },
  { title: "Kaise Hua", artist: "Vishal Mishra", movie: "Kabir Singh" },
  { title: "Dil Diyan Gallan", artist: "Atif Aslam", movie: "Tiger Zinda Hai" },
  { title: "Swag Se Swagat", artist: "Vishal Dadlani, Neha Bhasin", movie: "Tiger Zinda Hai" },
  { title: "O Saki Saki", artist: "Neha Kakkar, Tulsi Kumar, B Praak", movie: "Batla House" },
  { title: "Dilbar", artist: "Neha Kakkar, Dhvani Bhanushali, Ikka", movie: "Satyameva Jayate" },
  { title: "Aankh Marey", artist: "Mika Singh, Neha Kakkar, Kumar Sanu", movie: "Simmba" },
  { title: "Apna Time Aayega", artist: "Ranveer Singh", movie: "Gully Boy" },
  { title: "Lamberghini", artist: "The Doorbeen, Ragini", movie: "" },
  { title: "Prada", artist: "Jass Manak", movie: "" },
  { title: "Lehanga", artist: "Jass Manak", movie: "" },
  { title: "High Rated Gabru", artist: "Guru Randhawa", movie: "" },
  { title: "Lahore", artist: "Guru Randhawa", movie: "" },
  { title: "Naah", artist: "Harrdy Sandhu", movie: "" },
  { title: "Kya Baat Ay", artist: "Harrdy Sandhu", movie: "" },
  { title: "Na Ja", artist: "Pav Dharia", movie: "" },
  { title: "Proper Patola", artist: "Diljit Dosanjh, Badshah, Aastha Gill", movie: "Namaste England" },
  { title: "Garmi", artist: "Badshah, Neha Kakkar", movie: "Street Dancer 3D" },
  { title: "Muqabla", artist: "Yash Narvekar, Parampara Thakur", movie: "Street Dancer 3D" },
  { title: "Illegal Weapon 2.0", artist: "Jasmine Sandlas, Garry Sandhu", movie: "Street Dancer 3D" },
  { title: "Makhna", artist: "Tanishk Bagchi, Yasser Desai, Asees Kaur", movie: "Drive" },
  { title: "Param Sundari", artist: "Shreya Ghoshal", movie: "Mimi" },
  { title: "Rait Zara Si", artist: "Arijit Singh, Shashaa Tirupati", movie: "Atrangi Re" },
  { title: "Chaka Chak", artist: "Shreya Ghoshal", movie: "Atrangi Re" },
  { title: "Srivalli", artist: "Javed Ali", movie: "Pushpa" },
  { title: "Oo Bolega Ya Oo Oo Bolega", artist: "Kanika Kapoor", movie: "Pushpa" },
  { title: "Saami Saami", artist: "Sunidhi Chauhan", movie: "Pushpa" },
  { title: "Raataan Lambiyan", artist: "Jubin Nautiyal, Asees Kaur", movie: "Shershaah" },
  { title: "Ranjha", artist: "B Praak, Jasleen Royal", movie: "Shershaah" },
  { title: "Mann Bharryaa 2.0", artist: "B Praak", movie: "Shershaah" }
];

let dummyCount = 0;
for (const dummy of DUMMY_SONGS) {
  const slug = dummy.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!searchIds.has(slug)) {
    searchDb.push({
      id: slug,
      title: dummy.title,
      artist: dummy.artist,
      movie: dummy.movie,
      genre: "red-herring"
    });
    searchIds.add(slug);
    dummyCount++;
  }
}

fs.writeFileSync(searchDbPath, JSON.stringify(searchDb, null, 2));

console.log(`Synced ${addedCount} playable songs into the search catalog.`);
console.log(`Added ${dummyCount} red-herring dummy songs into the search catalog.`);
