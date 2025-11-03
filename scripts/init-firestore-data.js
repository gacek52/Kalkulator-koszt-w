#!/usr/bin/env node

/**
 * Skrypt inicjalizujący Firestore domyślnymi danymi
 * Uruchom: node scripts/init-firestore-data.js
 */

// Dodaj ścieżkę do modułów w functions
const path = require('path');
process.chdir(path.join(__dirname, '../functions'));

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Domyślni klienci - pusta tablica, klienci dodawani przez użytkowników
const defaultClients = [];

// Domyślne kompozycje opakowań
const defaultPackaging = [
  {
    name: 'Plastikowy pojemnik 600x400x200',
    length: '600',
    width: '400',
    height: '200',
    boxWeight: '1.5',
    price: '8.50',
    isDefault: true
  },
  {
    name: 'Kartonowe pudełko 400x300x250',
    length: '400',
    width: '300',
    height: '250',
    boxWeight: '0.8',
    price: '2.50',
    isDefault: true
  },
  {
    name: 'Paleta drewniana EUR 1200x800',
    length: '1200',
    width: '800',
    height: '150',
    boxWeight: '25',
    price: '15.00',
    isDefault: true
  },
  {
    name: 'Plastikowy pojemnik mały 300x200x150',
    length: '300',
    width: '200',
    height: '150',
    boxWeight: '0.6',
    price: '4.00',
    isDefault: true
  }
];

// Domyślne materiały
const defaultMaterials = [
  {
    name: 'Stal nierdzewna 304',
    density: '7.93',
    pricePerKg: '4.50',
    unit: 'kg',
    category: 'Stal',
    notes: 'Stal nierdzewna ferrytyczna',
    isDefault: true
  },
  {
    name: 'Stal nierdzewna 316L',
    density: '8.00',
    pricePerKg: '6.20',
    unit: 'kg',
    category: 'Stal',
    notes: 'Stal nierdzewna molibdenowa',
    isDefault: true
  },
  {
    name: 'Aluminium 5754',
    density: '2.70',
    pricePerKg: '3.80',
    unit: 'kg',
    category: 'Aluminium',
    notes: 'Stop aluminium-magnez',
    isDefault: true
  },
  {
    name: 'Miedź C110',
    density: '8.96',
    pricePerKg: '12.50',
    unit: 'kg',
    category: 'Miedź',
    notes: 'Miedź beztlenowa',
    isDefault: true
  }
];

async function initializeData() {
  console.log('🚀 Inicjalizacja danych w Firestore...\n');

  try {
    // 1. Inicjalizuj klientów
    console.log('📋 Dodawanie klientów...');
    const clientsRef = db.collection('clients');

    // Sprawdź czy są już jakieś klienty
    const existingClients = await clientsRef.limit(1).get();

    if (existingClients.empty) {
      const batch1 = db.batch();
      defaultClients.forEach(client => {
        const docRef = clientsRef.doc();
        batch1.set(docRef, {
          ...client,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch1.commit();
      console.log(`✅ Dodano ${defaultClients.length} klientów`);
    } else {
      console.log('⏭️  Klienci już istnieją, pomijam...');
    }

    // 2. Inicjalizuj opakowania
    console.log('\n📦 Dodawanie kompozycji opakowań...');
    const packagingRef = db.collection('packaging');

    const existingPackaging = await packagingRef.limit(1).get();

    if (existingPackaging.empty) {
      const batch2 = db.batch();
      defaultPackaging.forEach(pkg => {
        const docRef = packagingRef.doc();
        batch2.set(docRef, {
          ...pkg,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch2.commit();
      console.log(`✅ Dodano ${defaultPackaging.length} kompozycji opakowań`);
    } else {
      console.log('⏭️  Opakowania już istnieją, pomijam...');
    }

    // 3. Inicjalizuj materiały
    console.log('\n🔧 Dodawanie materiałów...');
    const materialsRef = db.collection('materials');

    const existingMaterials = await materialsRef.limit(1).get();

    if (existingMaterials.empty) {
      const batch3 = db.batch();
      defaultMaterials.forEach(material => {
        const docRef = materialsRef.doc();
        batch3.set(docRef, {
          ...material,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch3.commit();
      console.log(`✅ Dodano ${defaultMaterials.length} materiałów`);
    } else {
      console.log('⏭️  Materiały już istnieją, pomijam...');
    }

    console.log('\n✨ Inicjalizacja zakończona pomyślnie!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Błąd podczas inicjalizacji:', error);
    process.exit(1);
  }
}

initializeData();
