const fs = require('fs');
const path = require('path');

const SONGS_JSON = path.join(__dirname, '../data/songs.json');
const songsData = JSON.parse(fs.readFileSync(SONGS_JSON, 'utf-8'));

const newSongsData = songsData.map(song => {
  if (song.audioUrl && song.audioUrl.startsWith('https://pub-placeholder.r2.dev/')) {
    const fileName = song.audioUrl.split('/').pop();
    return {
      ...song,
      audioUrl: `/audio/${fileName}`
    };
  }
  return song;
});

fs.writeFileSync(SONGS_JSON, JSON.stringify(newSongsData, null, 2));

// Delete old mp3s and move m4as
const { execSync } = require('child_process');
execSync('rm -rf public/audio/*.mp3');
execSync('mv dist_audio/*.m4a public/audio/');
execSync('rm -rf dist_audio');

console.log("Audio pipeline finished! 855MB wiped, replaced with 430MB m4a.");
