/**
 * Skrypt do importu stanowisk produkcyjnych do Firestore
 * Używa Firebase REST API z Web API Key (nie wymaga Admin SDK)
 *
 * Uruchom: node scripts/importWorkstationsAdmin.js
 */

const https = require('https');
require('dotenv').config();

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;

if (!projectId || !apiKey) {
  console.error('❌ Brak wymaganych zmiennych środowiskowych (REACT_APP_FIREBASE_PROJECT_ID, REACT_APP_FIREBASE_API_KEY)');
  process.exit(1);
}

const workstations = [
  { name: "Prasa", type: "Prasa", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.8, costPer8h: 0, id: 1 },
  { name: "Prasa (rolsztanca) 1", type: "Prasa", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.8, costPer8h: 0, id: 2 },
  { name: "Prasa (rolsztanca) 2", type: "Prasa", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.8, costPer8h: 0, id: 3 },
  { name: "Klejenie Scania 1", type: "Ręczne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 4 },
  { name: "Klejenie Scania 2", type: "Ręczne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 5 },
  { name: "Gilotyna", type: "Inne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 6 },
  { name: "Piec do kształtek", type: "Inne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.8, costPer8h: 0, id: 7 },
  { name: "Karuzela do kształtek", type: "Inne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 8 },
  { name: "Płyta grzewcza1", type: "Inne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 9 },
  { name: "Stanowisko przygotówki 1", type: "Inne", shiftsPerDay: 3, hoursPerShift: 8, workDaysPerWeek: 5, holidaysPerYear: 10, efficiency: 0.85, costPer8h: 0, id: 12 }
];

// Konwertuj obiekt workstation na format Firestore
function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: value.toString() };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    }
  }
  return fields;
}

// Wykonaj request do Firestore REST API
function firestoreRequest(documentPath, data) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
    const body = JSON.stringify({ fields: toFirestoreFields(data) });

    const options = {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(url + '?key=' + apiKey, options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function importWorkstations() {
  console.log('🚀 Rozpoczynam import stanowisk do Firestore...\n');
  console.log('⚠️  UWAGA: To podejście może nie zadziałać z powodu Firestore Security Rules');
  console.log('   Jeśli wystąpią błędy, będę musiał użyć Firebase Admin SDK\n');

  let successCount = 0;
  let errorCount = 0;

  for (const workstation of workstations) {
    try {
      await firestoreRequest(`workstations/ws_${workstation.id}`, workstation);
      console.log(`✅ Dodano: ${workstation.name} (ID: ${workstation.id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Błąd przy dodawaniu ${workstation.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Podsumowanie:`);
  console.log(`   ✅ Sukces: ${successCount}`);
  console.log(`   ❌ Błędy: ${errorCount}`);
  console.log(`   📦 Łącznie: ${workstations.length}`);

  if (errorCount > 0) {
    console.log('\n💡 Jeśli wszystkie żądania zakończyły się błędem PERMISSION_DENIED,');
    console.log('   zaimportuję stanowiska bezpośrednio przez Firebase Console.');
  }

  process.exit(errorCount === workstations.length ? 1 : 0);
}

importWorkstations();
