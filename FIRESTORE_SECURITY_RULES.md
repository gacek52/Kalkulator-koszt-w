# Firestore Security Rules - System Zarządzania Użytkownikami

## Przegląd

Ten dokument zawiera reguły bezpieczeństwa Firestore dla systemu zarządzania użytkownikami z rolami i uprawnieniami.

## Struktura kolekcji

### `users/{uid}`
- **uid** - ID użytkownika z Firebase Auth
- **email** - Email użytkownika
- **displayName** - Nazwa wyświetlana
- **role** - ID roli (super-admin, admin, user, guest)
- **provider** - Metoda logowania (google, email, anonymous)
- **disabled** - Czy konto jest wyłączone
- **requirePasswordChange** - Czy użytkownik musi zmienić hasło
- **createdAt** - Data utworzenia
- **lastLogin** - Ostatnie logowanie
- **loginHistory** - Tablica ostatnich 50 logowań

### `roles/{roleId}`
- **id** - ID roli
- **name** - Nazwa roli
- **protected** - Czy rola jest chroniona przed edycją
- **permissions** - Obiekt z uprawnieniami (key: boolean)

## Przykładowe Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function getUserRole() {
      return getUserData().role;
    }

    function isSuperAdmin() {
      return isAuthenticated() && request.auth.token.email == 'gacek52@gmail.com';
    }

    function hasRole(role) {
      return isAuthenticated() && getUserRole() == role;
    }

    function getRolePermissions() {
      return get(/databases/$(database)/documents/roles/$(getUserRole())).data.permissions;
    }

    function hasPermission(permission) {
      return isAuthenticated() && getRolePermissions()[permission] == true;
    }

    // Users collection - uprawnienia do zarządzania użytkownikami
    match /users/{userId} {
      // Każdy zalogowany użytkownik może czytać własne dane
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Admini i super-admini mogą czytać wszystkich użytkowników
      allow read: if hasPermission('users_view');

      // Tworzenie użytkowników tylko przez adminów
      allow create: if hasPermission('users_create');

      // Edycja użytkowników
      allow update: if (
        // Użytkownik może edytować własne dane (z ograniczeniami)
        (request.auth.uid == userId &&
         !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'disabled', 'createdAt'])) ||
        // Lub ma uprawnienie users_edit (admini)
        (hasPermission('users_edit') &&
         // Ale nie może edytować super-admina
         resource.data.role != 'super-admin' &&
         // I nie może nadać roli super-admin
         request.resource.data.role != 'super-admin')
      );

      // Usuwanie tylko przez super-admina
      allow delete: if isSuperAdmin() && resource.data.role != 'super-admin';
    }

    // Roles collection - zarządzanie rolami tylko super-admin
    match /roles/{roleId} {
      // Wszyscy zalogowani mogą czytać role
      allow read: if isAuthenticated();

      // Tworzenie, edycja i usuwanie tylko super-admin
      allow create, update, delete: if isSuperAdmin() && !resource.data.protected;
    }

    // Calculations collection - kalkulacje
    match /calculations/{calcId} {
      // Odczyt - wszyscy mogą czytać własne, admini wszystkie
      allow read: if (
        resource.data.ownerId == request.auth.uid ||
        hasPermission('calculations_view_all')
      );

      // Tworzenie - każdy zalogowany może tworzyć
      allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;

      // Edycja - własne kalkulacje lub admin
      allow update: if (
        (resource.data.ownerId == request.auth.uid && hasPermission('calculations_edit_own')) ||
        hasPermission('calculations_edit_all')
      );

      // Usuwanie - własne kalkulacje lub admin
      allow delete: if (
        (resource.data.ownerId == request.auth.uid && hasPermission('calculations_delete_own')) ||
        hasPermission('calculations_delete_all')
      );
    }

    // Material types collection
    match /material-types/{typeId} {
      // Odczyt - wszyscy mogą czytać
      allow read: if hasPermission('materials_view');

      // Tworzenie, edycja, usuwanie - tylko admini
      allow create: if hasPermission('materials_create');
      allow update: if hasPermission('materials_edit');
      allow delete: if hasPermission('materials_delete');
    }

    // Material compositions collection
    match /material-compositions/{compositionId} {
      // Odczyt - wszyscy mogą czytać
      allow read: if hasPermission('materials_view');

      // Tworzenie, edycja, usuwanie - tylko admini
      allow create: if hasPermission('materials_create');
      allow update: if hasPermission('materials_edit');
      allow delete: if hasPermission('materials_delete');
    }

    // Clients collection
    match /clients/{clientId} {
      // Odczyt - wszyscy mogą czytać
      allow read: if hasPermission('clients_view');

      // Tworzenie, edycja, usuwanie - tylko admini
      allow create: if hasPermission('clients_create');
      allow update: if hasPermission('clients_edit');
      allow delete: if hasPermission('clients_delete');
    }

    // Packaging collection
    match /packaging/{packagingId} {
      // Odczyt - wszyscy mogą czytać
      allow read: if hasPermission('packaging_view');

      // Edycja - tylko admini
      allow update: if hasPermission('packaging_edit');
    }

    // Workstations collection
    match /workstations/{workstationId} {
      // Odczyt - wszyscy mogą czytać
      allow read: if hasPermission('workstations_view');

      // Edycja - tylko admini
      allow update: if hasPermission('workstations_edit');
    }
  }
}
```

## Uprawnienia

### Kategoria: Użytkownicy
- `users_view` - Podgląd wszystkich użytkowników
- `users_create` - Tworzenie nowych użytkowników (Email/Password)
- `users_edit` - Edycja użytkowników (role, disabled, etc.)
- `users_delete` - Usuwanie użytkowników (hard delete)
- `users_disable` - Wyłączanie/aktywowanie kont
- `users_view_history` - Podgląd historii logowań

### Kategoria: Role
- `roles_manage` - Zarządzanie rolami (tylko super-admin)

### Kategoria: Kalkulacje
- `calculations_view_all` - Podgląd wszystkich kalkulacji
- `calculations_view_own` - Podgląd własnych kalkulacji
- `calculations_edit_all` - Edycja wszystkich kalkulacji
- `calculations_edit_own` - Edycja własnych kalkulacji
- `calculations_delete_all` - Usuwanie wszystkich kalkulacji
- `calculations_delete_own` - Usuwanie własnych kalkulacji

### Kategoria: Materiały
- `materials_view` - Podgląd materiałów
- `materials_edit` - Edycja materiałów
- `materials_create` - Tworzenie materiałów
- `materials_delete` - Usuwanie materiałów

### Kategoria: Klienci
- `clients_view` - Podgląd klientów
- `clients_edit` - Edycja klientów
- `clients_create` - Tworzenie klientów
- `clients_delete` - Usuwanie klientów

### Kategoria: Pakowanie
- `packaging_view` - Podgląd pakowania
- `packaging_edit` - Edycja pakowania

### Kategoria: Stanowiska
- `workstations_view` - Podgląd stanowisk
- `workstations_edit` - Edycja stanowisk

## Domyślne role

### Super Administrator (super-admin)
- Email: gacek52@gmail.com
- Chronione przed edycją/usunięciem
- Wszystkie uprawnienia: TAK
- Specjalne: Jedyny kto może zarządzać rolami

### Administrator (admin)
- Wszystkie uprawnienia: TAK
- Wyjątek: `roles_manage` = NIE (nie może zarządzać rolami)
- Może zarządzać użytkownikami (tworzyć konta Email/Password)

### Użytkownik (user)
- Podgląd i edycja własnych kalkulacji
- Podgląd materiałów, klientów, pakowania (read-only)
- Nie może zarządzać użytkownikami ani rolami

### Gość (guest)
- Podgląd własnych kalkulacji (bez edycji)
- Podgląd materiałów, klientów, pakowania (read-only)
- Minimalne uprawnienia

## Implementacja

### 1. Aktywuj Email/Password w Firebase Console
1. Przejdź do Firebase Console
2. Authentication > Sign-in method
3. Włącz "Email/Password"

### 2. Wdróż Security Rules
1. Skopiuj rules z tego pliku
2. Firebase Console > Firestore Database > Rules
3. Wklej i opublikuj

### 3. Utwórz domyślne role
Uruchom skrypt inicjalizacyjny lub ręcznie utwórz kolekcję `roles` z dokumentami:
- `super-admin`
- `admin`
- `user`
- `guest`

### 4. Testowanie
1. Zaloguj się jako gacek52@gmail.com (super-admin)
2. Utwórz użytkownika testowego przez panel "Zarządzanie użytkownikami"
3. Przetestuj logowanie Email/Password
4. Sprawdź czy wymuszenie zmiany hasła działa
5. Przetestuj panel zarządzania rolami

## Bezpieczeństwo

### Najlepsze praktyki
1. **Nigdy nie przechowuj haseł w Firestore** - Firebase Auth robi to automatycznie
2. **Zawsze weryfikuj uprawnienia po stronie serwera** - nie ufaj klientowi
3. **Loguj wszystkie zmiany w rolach** - audit trail
4. **Regularnie przeglądaj uprawnienia** - principle of least privilege
5. **Używaj HTTPS** - zawsze szyfruj transmisję
6. **Monitoruj podejrzaną aktywność** - Firebase Authentication logs

### Chroniona rola super-admin
- Email gacek52@gmail.com jest hardcoded w systemie
- Nie można zmienić roli super-admin przez UI
- Nie można usunąć super-admina
- Tylko super-admin może zarządzać rolami

## Cloud Functions (opcjonalnie)

Dla zwiększenia bezpieczeństwa, zaleca się stworzenie Cloud Functions do:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Tworzenie użytkownika Email/Password (tylko admin)
exports.createUser = functions.https.onCall(async (data, context) => {
  // Sprawdź czy wywołujący jest adminem
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Tylko admin może tworzyć użytkowników');
  }

  const { email, password, role, requirePasswordChange } = data;

  try {
    // Utwórz użytkownika w Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false
    });

    // Utwórz profil w Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      role: role || 'user',
      provider: 'email',
      disabled: false,
      requirePasswordChange: requirePasswordChange !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      loginHistory: []
    });

    return { uid: userRecord.uid, email };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

## Podsumowanie

System uprawnień został zaprojektowany aby:
- ✅ Chronić wrażliwe dane (tylko właściciel lub admin)
- ✅ Umożliwić granularne uprawnienia (checkbox permissions)
- ✅ Chronić konto super-admina (gacek52@gmail.com)
- ✅ Umożliwić tworzenie kont Email/Password przez admina
- ✅ Śledzić historię logowań
- ✅ Wspierać wyłączanie kont (soft delete)
- ✅ Wymuszać zmianę hasła przy pierwszym logowaniu

Dla pełnej implementacji produkcyjnej, zaleca się dodanie:
- Email verification dla nowych kont
- 2FA (Two-Factor Authentication)
- Rate limiting dla prób logowania
- Cloud Functions dla wrażliwych operacji
- Audit logs dla wszystkich zmian w uprawnieniach
