const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require("fs");
const path = require("path");

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath || !fs.existsSync(keyPath)) {
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON.");
    process.exit(1);
}

const serviceAccount = require(path.resolve(keyPath));

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "sargam-app-2026.firebasestorage.app"
});

const bucket = getStorage().bucket();
const clipsDir = path.join(__dirname, "../data/highlight_clips");

async function uploadClips() {
    const files = fs.readdirSync(clipsDir).filter(f => f.endsWith('.m4a'));
    console.log(`Found ${files.length} clips to upload.`);
    
    // Upload with concurrency control to avoid hitting memory limits or rate limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (file) => {
            const localPath = path.join(clipsDir, file);
            const destPath = `audio/${file}`;
            
            console.log(`Uploading ${file}...`);
            await bucket.upload(localPath, {
                destination: destPath,
                metadata: {
                    contentType: 'audio/mp4',
                    cacheControl: 'public, max-age=31536000'
                }
            });
        }));
    }
    console.log("Upload complete.");
}

uploadClips().catch(console.error);
