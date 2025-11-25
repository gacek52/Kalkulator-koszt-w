/**
 * Skrypt do backupu danych z Firestore
 * Eksportuje wszystkie kolekcje do plików JSON
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicjalizacja Admin SDK
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Lista kolekcji do backupu
const COLLECTIONS = [
  'calculations',
  'materials',
  'packaging-compositions',
  'workstations',
  'clients',
  'clientManual',
  'transport',
  'roles',
  'users',
  'sessions',
  'curve-presets'
];

async function backupCollection(collectionName) {
  console.log(`📦 Backing up ${collectionName}...`);

  try {
    const snapshot = await db.collection(collectionName).get();
    const data = [];

    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`   ✅ Found ${data.length} documents in ${collectionName}`);
    return {
      collection: collectionName,
      count: data.length,
      documents: data
    };
  } catch (error) {
    console.error(`   ❌ Error backing up ${collectionName}:`, error.message);
    return {
      collection: collectionName,
      count: 0,
      documents: [],
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Starting Firestore backup...\n');

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);

  // Utwórz katalog backups jeśli nie istnieje
  if (!fs.existsSync(path.join(__dirname, '..', 'backups'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'backups'));
  }

  // Utwórz katalog dla tego backupu
  fs.mkdirSync(backupDir);

  const results = {
    timestamp: new Date().toISOString(),
    backupPath: backupDir,
    collections: []
  };

  // Backup każdej kolekcji
  for (const collectionName of COLLECTIONS) {
    const collectionData = await backupCollection(collectionName);
    results.collections.push(collectionData);

    // Zapisz do osobnego pliku
    const filePath = path.join(backupDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(collectionData, null, 2));
  }

  // Zapisz manifest
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));

  console.log('\n✅ Backup completed!');
  console.log(`📁 Backup location: ${backupDir}`);
  console.log(`📊 Summary:`);

  let totalDocs = 0;
  results.collections.forEach(col => {
    console.log(`   - ${col.collection}: ${col.count} documents`);
    totalDocs += col.count;
  });

  console.log(`\n📈 Total documents backed up: ${totalDocs}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});
