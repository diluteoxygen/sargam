const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PUBLIC_AUDIO = path.join(__dirname, '../public/audio');
const DIST_AUDIO = path.join(__dirname, '../dist_audio');
const SONGS_JSON = path.join(__dirname, '../data/songs.json');
const CDN_BASE = 'https://pub-placeholder.r2.dev';

if (!fs.existsSync(DIST_AUDIO)) {
  fs.mkdirSync(DIST_AUDIO, { recursive: true });
}

const files = fs.readdirSync(PUBLIC_AUDIO).filter(f => f.endsWith('.mp3'));

console.log(`Found ${files.length} MP3 files. Starting conversion to 64kbps m4a...`);

let completed = 0;

async function processFile(file) {
  return new Promise((resolve) => {
    const inputPath = path.join(PUBLIC_AUDIO, file);
    const outputFileName = file.replace('.mp3', '.m4a');
    const outputPath = path.join(DIST_AUDIO, outputFileName);
    
    if (fs.existsSync(outputPath)) {
       completed++;
       resolve();
       return;
    }
    
    const cmd = `ffmpeg -y -i "${inputPath}" -c:a aac -b:a 64k "${outputPath}"`;
    exec(cmd, (err) => {
      if (err) {
        console.error(`Error converting ${file}`);
      } else {
        completed++;
        console.log(`[${completed}/${files.length}] Converted ${file} -> ${outputFileName}`);
      }
      resolve();
    });
  });
}

async function run() {
  const CONCURRENCY = 4;
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(f => processFile(f)));
  }
  
  console.log('\nConversion complete. Updating songs.json...');
  
  const songsData = JSON.parse(fs.readFileSync(SONGS_JSON, 'utf-8'));
  let updatedCount = 0;
  
  const newSongsData = songsData.map(song => {
    if (song.audioUrl && song.audioUrl.startsWith('/audio/')) {
      const fileName = song.audioUrl.split('/').pop();
      const m4aName = fileName.replace('.mp3', '.m4a');
      updatedCount++;
      return {
        ...song,
        audioUrl: `${CDN_BASE}/${m4aName}`
      };
    }
    return song;
  });
  
  fs.writeFileSync(SONGS_JSON, JSON.stringify(newSongsData, null, 2));
  console.log(`Updated ${updatedCount} entries in songs.json to point to ${CDN_BASE}`);
  console.log('Done! You can now upload the contents of /dist_audio to your Cloudflare R2 bucket.');
}

run();
