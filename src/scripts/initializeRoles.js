/**
 * Skrypt inicjalizacyjny do utworzenia domyślnych ról w Firestore
 *
 * Uruchom ten skrypt JEDEN RAZ aby utworzyć domyślne role:
 * node src/scripts/initializeRoles.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicjalizuj Firebase Admin SDK
// UWAGA: Musisz mieć plik serviceAccountKey.json w katalogu głównym projektu
try {
  const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✓ Firebase Admin SDK zainicjalizowany');
} catch (error) {
  console.error('✗ Błąd inicjalizacji Firebase Admin SDK');
  console.error('Upewnij się, że masz plik serviceAccountKey.json w głównym katalogu projektu');
  console.error('Pobierz go z: Firebase Console > Project Settings > Service Accounts > Generate new private key');
  process.exit(1);
}

const db = admin.firestore();

// Definicje domyślnych ról
const DEFAULT_ROLES = {
  'super-admin': {
    id: 'super-admin',
    name: 'Super Administrator',
    protected: true,
    email: 'gacek52@gmail.com',
    permissions: {
      // Użytkownicy
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      users_disable: true,
      users_view_history: true,

      // Role (TYLKO super-admin)
      roles_manage: true,

      // Kalkulacje
      calculations_view_all: true,
      calculations_view_own: true,
      calculations_edit_all: true,
      calculations_edit_own: true,
      calculations_delete_all: true,
      calculations_delete_own: true,

      // Materiały
      materials_view: true,
      materials_edit: true,
      materials_create: true,
      materials_delete: true,

      // Klienci
      clients_view: true,
      clients_edit: true,
      clients_create: true,
      clients_delete: true,

      // Pakowanie
      packaging_view: true,
      packaging_edit: true,

      // Stanowiska
      workstations_view: true,
      workstations_edit: true
    }
  },

  'admin': {
    id: 'admin',
    name: 'Administrator',
    protected: false,
    permissions: {
      // Użytkownicy
      users_view: true,
      users_create: true,
      users_edit: true,
      users_delete: true,
      users_disable: true,
      users_view_history: true,

      // Role (NIE - tylko super-admin)
      roles_manage: false,

      // Kalkulacje
      calculations_view_all: true,
      calculations_view_own: true,
      calculations_edit_all: true,
      calculations_edit_own: true,
      calculations_delete_all: true,
      calculations_delete_own: true,

      // Materiały
      materials_view: true,
      materials_edit: true,
      materials_create: true,
      materials_delete: true,

      // Klienci
      clients_view: true,
      clients_edit: true,
      clients_create: true,
      clients_delete: true,

      // Pakowanie
      packaging_view: true,
      packaging_edit: true,

      // Stanowiska
      workstations_view: true,
      workstations_edit: true
    }
  },

  'user': {
    id: 'user',
    name: 'Użytkownik',
    protected: false,
    permissions: {
      // Użytkownicy - brak dostępu
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      users_disable: false,
      users_view_history: false,

      // Role - brak dostępu
      roles_manage: false,

      // Kalkulacje - tylko własne
      calculations_view_all: false,
      calculations_view_own: true,
      calculations_edit_all: false,
      calculations_edit_own: true,
      calculations_delete_all: false,
      calculations_delete_own: true,

      // Materiały - tylko odczyt
      materials_view: true,
      materials_edit: false,
      materials_create: false,
      materials_delete: false,

      // Klienci - tylko odczyt
      clients_view: true,
      clients_edit: false,
      clients_create: false,
      clients_delete: false,

      // Pakowanie - tylko odczyt
      packaging_view: true,
      packaging_edit: false,

      // Stanowiska - tylko odczyt
      workstations_view: true,
      workstations_edit: false
    }
  },

  'guest': {
    id: 'guest',
    name: 'Gość',
    protected: false,
    permissions: {
      // Użytkownicy - brak dostępu
      users_view: false,
      users_create: false,
      users_edit: false,
      users_delete: false,
      users_disable: false,
      users_view_history: false,

      // Role - brak dostępu
      roles_manage: false,

      // Kalkulacje - tylko podgląd własnych
      calculations_view_all: false,
      calculations_view_own: true,
      calculations_edit_all: false,
      calculations_edit_own: false, // Goście nie mogą edytować
      calculations_delete_all: false,
      calculations_delete_own: false,

      // Materiały - tylko odczyt
      materials_view: true,
      materials_edit: false,
      materials_create: false,
      materials_delete: false,

      // Klienci - tylko odczyt
      clients_view: true,
      clients_edit: false,
      clients_create: false,
      clients_delete: false,

      // Pakowanie - tylko odczyt
      packaging_view: true,
      packaging_edit: false,

      // Stanowiska - tylko odczyt
      workstations_view: true,
      workstations_edit: false
    }
  }
};

async function initializeRoles() {
  console.log('\n🚀 Inicjalizacja domyślnych ról...\n');

  try {
    const batch = db.batch();
    let count = 0;

    for (const [roleId, roleData] of Object.entries(DEFAULT_ROLES)) {
      const roleRef = db.collection('roles').doc(roleId);

      // Sprawdź czy rola już istnieje
      const roleDoc = await roleRef.get();

      if (roleDoc.exists) {
        console.log(`⚠️  Rola "${roleData.name}" (${roleId}) już istnieje - pomijam`);
      } else {
        batch.set(roleRef, {
          ...roleData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
        console.log(`✓ Dodaję rolę: "${roleData.name}" (${roleId})`);
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`\n✅ Utworzono ${count} nowych ról w Firestore`);
    } else {
      console.log('\n✅ Wszystkie domyślne role już istnieją w Firestore');
    }

    // Wyświetl podsumowanie
    console.log('\n📊 Podsumowanie ról:');
    console.log('─────────────────────────────────────────────────');

    for (const [roleId, roleData] of Object.entries(DEFAULT_ROLES)) {
      const permCount = Object.values(roleData.permissions).filter(v => v === true).length;
      const protectedLabel = roleData.protected ? '🔒 CHRONIONE' : '';
      console.log(`${roleData.name.padEnd(25)} | ${roleId.padEnd(15)} | ${permCount} uprawnień ${protectedLabel}`);
    }

    console.log('─────────────────────────────────────────────────\n');

    // Następne kroki
    console.log('📝 Następne kroki:');
    console.log('1. Wdróż Firestore Security Rules (skopiuj z FIRESTORE_SECURITY_RULES.md)');
    console.log('2. Zaloguj się jako gacek52@gmail.com');
    console.log('3. Sprawdź panel "Zarządzanie rolami" w aplikacji');
    console.log('4. Utwórz testowego użytkownika Email/Password\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Błąd podczas inicjalizacji ról:', error);
    process.exit(1);
  }
}

// Uruchom inicjalizację
initializeRoles();
