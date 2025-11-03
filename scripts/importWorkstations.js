/**
 * Skrypt do importu stanowisk produkcyjnych do Firestore
 *
 * Uruchom: node scripts/importWorkstations.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Przykładowe stanowiska
const workstations = [
  {
    "name": "Prasa",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 1
  },
  {
    "name": "Prasa (rolsztanca) 1",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 2
  },
  {
    "name": "Prasa (rolsztanca) 2",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 3
  },
  {
    "name": "Klejenie Scania 1",
    "type": "Ręczne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 4
  },
  {
    "name": "Klejenie Scania 2",
    "type": "Ręczne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 5
  },
  {
    "name": "Gilotyna",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 6
  },
  {
    "name": "Piec do kształtek",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 7
  },
  {
    "name": "Karuzela do kształtek",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 8
  },
  {
    "name": "Płyta grzewcza1",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 9
  },
  {
    "name": "Stanowisko przygotówki 1",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 12
  }
];

async function importWorkstations() {
  console.log('🚀 Rozpoczynam import stanowisk do Firestore...\n');

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let successCount = 0;
  let errorCount = 0;

  for (const workstation of workstations) {
    try {
      const docRef = doc(db, 'workstations', `ws_${workstation.id}`);
      await setDoc(docRef, workstation);
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

  if (successCount === workstations.length) {
    console.log('\n🎉 Import zakończony pomyślnie!');
  }

  process.exit(0);
}

importWorkstations().catch(error => {
  console.error('❌ Krytyczny błąd:', error);
  process.exit(1);
});
