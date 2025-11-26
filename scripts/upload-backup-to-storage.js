/**
 * Skrypt do uploadu backupu do Firebase Storage
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicjalizacja Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'kalkulator-produkcyjny---alpha.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function uploadFile(localPath, remotePath) {
  try {
    await bucket.upload(localPath, {
      destination: remotePath,
      metadata: {
        contentType: 'application/json',
      },
    });
    console.log(`   ✅ Uploaded: ${remotePath}`);
  } catch (error) {
    console.error(`   ❌ Error uploading ${remotePath}:`, error.message);
  }
}

async function uploadBackup(backupDir) {
  console.log('🚀 Uploading backup to Firebase Storage...\n');

  const backupName = path.basename(backupDir);
  const files = fs.readdirSync(backupDir);

  console.log(`📦 Found ${files.length} files to upload\n`);

  for (const file of files) {
    const localPath = path.join(backupDir, file);
    const remotePath = `backups/before-refactor-20251125/${file}`;

    await uploadFile(localPath, remotePath);
  }

  console.log('\n✅ Backup uploaded successfully!');
  console.log(`🔗 Location: gs://kalkulator-produkcyjny---alpha.firebasestorage.app/backups/before-refactor-20251125/`);
}

// Znajdź najnowszy backup
const backupsDir = path.join(__dirname, '..', 'backups');
const backupFolders = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('backup-'))
  .sort()
  .reverse();

if (backupFolders.length === 0) {
  console.error('❌ No backup found!');
  process.exit(1);
}

const latestBackup = path.join(backupsDir, backupFolders[0]);
console.log(`📁 Latest backup: ${latestBackup}\n`);

uploadBackup(latestBackup)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  });
