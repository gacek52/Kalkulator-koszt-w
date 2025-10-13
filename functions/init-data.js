#!/usr/bin/env node

/**
 * Skrypt inicjalizujący Firestore domyślnymi danymi
 * Uruchom z folderu functions: node init-data.js
 *
 * Ten skrypt wypełnia Firestore wszystkimi domyślnymi danymi:
 * - clients (klienci)
 * - materialTypes (typy materiałów)
 * - materialCompositions (kombinacje grubość × gęstość)
 * - packagingTypes (typy opakowań)
 * - packagingCompositions (kompozycje pakowania)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// W Firebase Functions automatycznie używa Application Default Credentials
// Lokalnie można użyć: GOOGLE_APPLICATION_CREDENTIALS environment variable
admin.initializeApp();

const db = admin.firestore();

// ============================================================================
// DOMYŚLNI KLIENCI
// ============================================================================
const defaultClients = [
  {
    id: '1',
    name: 'Tenneco Polska',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Rybnik',
    country: 'Polska',
    notes: ''
  },
  {
    id: '2',
    name: 'Tenneco Edenkoben',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Edenkoben',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: '3',
    name: 'Tenneco Edenkoben Prototypy',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Edenkoben',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: '4',
    name: 'Tenneco Zwickau',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Zwickau',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: '5',
    name: 'Purem Tondela',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Tondela',
    country: 'Portugalia',
    notes: ''
  },
  {
    id: '6',
    name: 'Purem Rakovnik',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Rakovnik',
    country: 'Czechy',
    notes: ''
  },
  {
    id: '7',
    name: 'Purem Neunkirchen',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Neunkirchen',
    country: 'Niemcy',
    notes: ''
  }
];

// ============================================================================
// TYPY MATERIAŁÓW
// ============================================================================
const defaultMaterialTypes = [
  {
    id: '1',
    name: 'E-glass',
    pricePerKg: 1.75,
    color: '#3B82F6'
  },
  {
    id: '2',
    name: 'HT800',
    pricePerKg: 2.75,
    color: '#EF4444'
  },
  {
    id: '3',
    name: 'HT1000',
    pricePerKg: 6.4,
    color: '#F59E0B'
  },
  {
    id: '4',
    name: 'Silicat',
    pricePerKg: 7.3,
    color: '#10B981'
  },
  {
    id: '5',
    name: '1.4301 (bez ALS)',
    pricePerKg: 2.5,
    color: '#4feb24'
  }
];

// ============================================================================
// KOMPOZYCJE MATERIAŁÓW (grubość × gęstość)
// ============================================================================
const defaultMaterialCompositions = [
  // E-glass (materialTypeId: 1)
  { id: '1', materialTypeId: '1', thickness: 6, density: 120, name: '' },
  { id: '2', materialTypeId: '1', thickness: 6, density: 130, name: '' },
  { id: '3', materialTypeId: '1', thickness: 6, density: 150, name: '' },
  { id: '4', materialTypeId: '1', thickness: 6, density: 160, name: '' },
  { id: '5', materialTypeId: '1', thickness: 6, density: 165, name: '' },
  { id: '6', materialTypeId: '1', thickness: 8, density: 120, name: '' },
  { id: '7', materialTypeId: '1', thickness: 8, density: 130, name: '' },
  { id: '8', materialTypeId: '1', thickness: 8, density: 150, name: '' },
  { id: '9', materialTypeId: '1', thickness: 8, density: 160, name: '' },
  { id: '10', materialTypeId: '1', thickness: 8, density: 165, name: '' },
  { id: '11', materialTypeId: '1', thickness: 10, density: 120, name: '' },
  { id: '12', materialTypeId: '1', thickness: 10, density: 130, name: '' },
  { id: '13', materialTypeId: '1', thickness: 10, density: 150, name: '' },
  { id: '14', materialTypeId: '1', thickness: 10, density: 160, name: '' },
  { id: '15', materialTypeId: '1', thickness: 10, density: 165, name: '' },
  { id: '16', materialTypeId: '1', thickness: 12, density: 120, name: '' },
  { id: '17', materialTypeId: '1', thickness: 12, density: 130, name: '' },
  { id: '18', materialTypeId: '1', thickness: 12, density: 150, name: '' },
  { id: '19', materialTypeId: '1', thickness: 12, density: 160, name: '' },
  { id: '20', materialTypeId: '1', thickness: 12, density: 165, name: '' },
  { id: '21', materialTypeId: '1', thickness: 15, density: 120, name: '' },
  { id: '22', materialTypeId: '1', thickness: 15, density: 130, name: '' },
  { id: '23', materialTypeId: '1', thickness: 15, density: 150, name: '' },
  { id: '24', materialTypeId: '1', thickness: 15, density: 160, name: '' },
  { id: '25', materialTypeId: '1', thickness: 15, density: 165, name: '' },

  // HT800 (materialTypeId: 2)
  { id: '26', materialTypeId: '2', thickness: 6, density: 120, name: '' },
  { id: '27', materialTypeId: '2', thickness: 6, density: 130, name: '' },
  { id: '28', materialTypeId: '2', thickness: 6, density: 150, name: '' },
  { id: '29', materialTypeId: '2', thickness: 6, density: 160, name: '' },
  { id: '30', materialTypeId: '2', thickness: 6, density: 165, name: '' },
  { id: '31', materialTypeId: '2', thickness: 8, density: 120, name: '' },
  { id: '32', materialTypeId: '2', thickness: 8, density: 130, name: '' },
  { id: '33', materialTypeId: '2', thickness: 8, density: 150, name: '' },
  { id: '34', materialTypeId: '2', thickness: 8, density: 160, name: '' },
  { id: '35', materialTypeId: '2', thickness: 8, density: 165, name: '' },
  { id: '36', materialTypeId: '2', thickness: 10, density: 120, name: '' },
  { id: '37', materialTypeId: '2', thickness: 10, density: 130, name: '' },
  { id: '38', materialTypeId: '2', thickness: 10, density: 150, name: '' },
  { id: '39', materialTypeId: '2', thickness: 10, density: 160, name: '' },
  { id: '40', materialTypeId: '2', thickness: 10, density: 165, name: '' },
  { id: '41', materialTypeId: '2', thickness: 12, density: 120, name: '' },
  { id: '42', materialTypeId: '2', thickness: 12, density: 130, name: '' },
  { id: '43', materialTypeId: '2', thickness: 12, density: 150, name: '' },
  { id: '44', materialTypeId: '2', thickness: 12, density: 160, name: '' },
  { id: '45', materialTypeId: '2', thickness: 12, density: 165, name: '' },
  { id: '46', materialTypeId: '2', thickness: 15, density: 120, name: '' },
  { id: '47', materialTypeId: '2', thickness: 15, density: 130, name: '' },
  { id: '48', materialTypeId: '2', thickness: 15, density: 150, name: '' },
  { id: '49', materialTypeId: '2', thickness: 15, density: 160, name: '' },
  { id: '50', materialTypeId: '2', thickness: 15, density: 165, name: '' },

  // HT1000 (materialTypeId: 3)
  { id: '51', materialTypeId: '3', thickness: 6, density: 120, name: '' },
  { id: '52', materialTypeId: '3', thickness: 6, density: 130, name: '' },
  { id: '53', materialTypeId: '3', thickness: 6, density: 150, name: '' },
  { id: '54', materialTypeId: '3', thickness: 6, density: 160, name: '' },
  { id: '55', materialTypeId: '3', thickness: 6, density: 165, name: '' },
  { id: '56', materialTypeId: '3', thickness: 8, density: 120, name: '' },
  { id: '57', materialTypeId: '3', thickness: 8, density: 130, name: '' },
  { id: '58', materialTypeId: '3', thickness: 8, density: 150, name: '' },
  { id: '59', materialTypeId: '3', thickness: 8, density: 160, name: '' },
  { id: '60', materialTypeId: '3', thickness: 8, density: 165, name: '' },
  { id: '61', materialTypeId: '3', thickness: 10, density: 120, name: '' },
  { id: '62', materialTypeId: '3', thickness: 10, density: 130, name: '' },
  { id: '63', materialTypeId: '3', thickness: 10, density: 150, name: '' },
  { id: '64', materialTypeId: '3', thickness: 10, density: 160, name: '' },
  { id: '65', materialTypeId: '3', thickness: 10, density: 165, name: '' },
  { id: '66', materialTypeId: '3', thickness: 12, density: 120, name: '' },
  { id: '67', materialTypeId: '3', thickness: 12, density: 130, name: '' },
  { id: '68', materialTypeId: '3', thickness: 12, density: 150, name: '' },
  { id: '69', materialTypeId: '3', thickness: 12, density: 160, name: '' },
  { id: '70', materialTypeId: '3', thickness: 12, density: 165, name: '' },
  { id: '71', materialTypeId: '3', thickness: 15, density: 120, name: '' },
  { id: '72', materialTypeId: '3', thickness: 15, density: 130, name: '' },
  { id: '73', materialTypeId: '3', thickness: 15, density: 150, name: '' },
  { id: '74', materialTypeId: '3', thickness: 15, density: 160, name: '' },
  { id: '75', materialTypeId: '3', thickness: 15, density: 165, name: '' },

  // Silicat (materialTypeId: 4)
  { id: '76', materialTypeId: '4', thickness: 6, density: 120, name: '' },
  { id: '77', materialTypeId: '4', thickness: 6, density: 130, name: '' },
  { id: '78', materialTypeId: '4', thickness: 6, density: 150, name: '' },
  { id: '79', materialTypeId: '4', thickness: 6, density: 160, name: '' },
  { id: '80', materialTypeId: '4', thickness: 6, density: 165, name: '' },
  { id: '81', materialTypeId: '4', thickness: 8, density: 120, name: '' },
  { id: '82', materialTypeId: '4', thickness: 8, density: 130, name: '' },
  { id: '83', materialTypeId: '4', thickness: 8, density: 150, name: '' },
  { id: '84', materialTypeId: '4', thickness: 8, density: 160, name: '' },
  { id: '85', materialTypeId: '4', thickness: 8, density: 165, name: '' },
  { id: '86', materialTypeId: '4', thickness: 10, density: 120, name: '' },
  { id: '87', materialTypeId: '4', thickness: 10, density: 130, name: '' },
  { id: '88', materialTypeId: '4', thickness: 10, density: 150, name: '' },
  { id: '89', materialTypeId: '4', thickness: 10, density: 160, name: '' },
  { id: '90', materialTypeId: '4', thickness: 10, density: 165, name: '' },
  { id: '91', materialTypeId: '4', thickness: 12, density: 120, name: '' },
  { id: '92', materialTypeId: '4', thickness: 12, density: 130, name: '' },
  { id: '93', materialTypeId: '4', thickness: 12, density: 150, name: '' },
  { id: '94', materialTypeId: '4', thickness: 12, density: 160, name: '' },
  { id: '95', materialTypeId: '4', thickness: 12, density: 165, name: '' },
  { id: '96', materialTypeId: '4', thickness: 15, density: 120, name: '' },
  { id: '97', materialTypeId: '4', thickness: 15, density: 130, name: '' },
  { id: '98', materialTypeId: '4', thickness: 15, density: 150, name: '' },
  { id: '99', materialTypeId: '4', thickness: 15, density: 160, name: '' },
  { id: '100', materialTypeId: '4', thickness: 15, density: 165, name: '' },

  // 1.4301 (bez ALS) - blacha stalowa (materialTypeId: 5)
  { id: '101', materialTypeId: '5', thickness: 0.1, density: 7850, name: '' },
  { id: '102', materialTypeId: '5', thickness: 0.15, density: 7850, name: '' },
  { id: '103', materialTypeId: '5', thickness: 0.2, density: 7850, name: '' }
];

// ============================================================================
// TYPY OPAKOWAŃ
// ============================================================================
const defaultPackagingTypes = [
  {
    id: '1',
    name: 'Karton B1',
    dimensions: { length: 1200, width: 800, height: 1000 },
    cost: 9.6,
    volume: 0.96
  },
  {
    id: '2',
    name: 'Karton B2',
    dimensions: { length: 600, width: 800, height: 500 },
    cost: 3.6,
    volume: 0.24
  },
  {
    id: '3',
    name: 'Karton B4',
    dimensions: { length: 600, width: 400, height: 370 },
    cost: 1.6,
    volume: 0.0888
  }
];

// ============================================================================
// KOMPOZYCJE PAKOWANIA
// ============================================================================
const defaultPackagingCompositions = [
  {
    id: '1',
    name: 'Karton B1 pojedyńczy',
    packagingTypeId: '1',
    packagesPerPallet: 1,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 13.2
  },
  {
    id: '2',
    name: 'Karton B1 podwójny',
    packagingTypeId: '1',
    packagesPerPallet: 2,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 22.8
  },
  {
    id: '3',
    name: 'Paleta B2 standard',
    packagingTypeId: '2',
    packagesPerPallet: 8,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 32.4
  },
  {
    id: '4',
    name: 'Paleta B4 mała 2 stack',
    packagingTypeId: '3',
    packagesPerPallet: 12,
    palletsPerSpace: 2,
    palletCost: 3.6,
    compositionCost: 45.6
  },
  {
    id: '5',
    name: 'Paleta B4 mała 3 stack',
    packagingTypeId: '3',
    packagesPerPallet: 12,
    palletsPerSpace: 3,
    palletCost: 3.6,
    compositionCost: 68.4
  },
  {
    id: '6',
    name: 'Paleta B4 standard',
    packagingTypeId: '3',
    packagesPerPallet: 20,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 35.6
  }
];

// ============================================================================
// FUNKCJA INICJALIZACJI
// ============================================================================
async function initializeData() {
  console.log('🚀 Inicjalizacja Firestore...\n');

  try {
    // 1. Klienci
    console.log('👥 Inicjalizacja klientów...');
    const clientsRef = db.collection('clients');
    const existingClients = await clientsRef.limit(1).get();

    if (existingClients.empty) {
      for (const client of defaultClients) {
        await clientsRef.doc(client.id).set({
          ...client,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      console.log(`✅ Dodano ${defaultClients.length} klientów\n`);
    } else {
      console.log('⏭️  Klienci już istnieją, pomijam...\n');
    }

    // 2. Typy materiałów
    console.log('🧪 Inicjalizacja typów materiałów...');
    const materialTypesRef = db.collection('materialTypes');
    const existingMaterialTypes = await materialTypesRef.limit(1).get();

    if (existingMaterialTypes.empty) {
      for (const materialType of defaultMaterialTypes) {
        await materialTypesRef.doc(materialType.id).set({
          ...materialType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      console.log(`✅ Dodano ${defaultMaterialTypes.length} typów materiałów\n`);
    } else {
      console.log('⏭️  Typy materiałów już istnieją, pomijam...\n');
    }

    // 3. Kompozycje materiałów
    console.log('🔬 Inicjalizacja kompozycji materiałów...');
    const materialCompositionsRef = db.collection('materialCompositions');
    const existingCompositions = await materialCompositionsRef.limit(1).get();

    if (existingCompositions.empty) {
      // Użyj batch write dla dużej liczby dokumentów
      let batch = db.batch();
      let operationCount = 0;
      const BATCH_SIZE = 500;

      for (const composition of defaultMaterialCompositions) {
        const docRef = materialCompositionsRef.doc(composition.id);
        batch.set(docRef, {
          ...composition,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;

        // Commit batch co 500 operacji (limit Firestore)
        if (operationCount === BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      }

      // Commit pozostałe operacje
      if (operationCount > 0) {
        await batch.commit();
      }

      console.log(`✅ Dodano ${defaultMaterialCompositions.length} kompozycji materiałów\n`);
    } else {
      console.log('⏭️  Kompozycje materiałów już istnieją, pomijam...\n');
    }

    // 4. Typy opakowań
    console.log('📦 Inicjalizacja typów opakowań...');
    const packagingTypesRef = db.collection('packagingTypes');
    const existingPackagingTypes = await packagingTypesRef.limit(1).get();

    if (existingPackagingTypes.empty) {
      for (const packagingType of defaultPackagingTypes) {
        await packagingTypesRef.doc(packagingType.id).set({
          ...packagingType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      console.log(`✅ Dodano ${defaultPackagingTypes.length} typów opakowań\n`);
    } else {
      console.log('⏭️  Typy opakowań już istnieją, pomijam...\n');
    }

    // 5. Kompozycje pakowania
    console.log('📊 Inicjalizacja kompozycji pakowania...');
    const packagingCompositionsRef = db.collection('packagingCompositions');
    const existingPackagingCompositions = await packagingCompositionsRef.limit(1).get();

    if (existingPackagingCompositions.empty) {
      for (const composition of defaultPackagingCompositions) {
        await packagingCompositionsRef.doc(composition.id).set({
          ...composition,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      console.log(`✅ Dodano ${defaultPackagingCompositions.length} kompozycji pakowania\n`);
    } else {
      console.log('⏭️  Kompozycje pakowania już istnieją, pomijam...\n');
    }

    console.log('✨ Inicjalizacja zakończona pomyślnie!\n');
    console.log('📊 Podsumowanie:');
    console.log(`   - Klientów: ${defaultClients.length}`);
    console.log(`   - Typów materiałów: ${defaultMaterialTypes.length}`);
    console.log(`   - Kompozycji materiałów: ${defaultMaterialCompositions.length}`);
    console.log(`   - Typów opakowań: ${defaultPackagingTypes.length}`);
    console.log(`   - Kompozycji pakowania: ${defaultPackagingCompositions.length}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Błąd podczas inicjalizacji:', error);
    process.exit(1);
  }
}

initializeData();
