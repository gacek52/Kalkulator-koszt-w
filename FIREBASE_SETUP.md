# Firebase Setup - Cost Calculator App

## ✅ Ukończone zadania

### 1. Zmienne środowiskowe (.env)
- ✅ Utworzono plik `.env` z kluczami Firebase API
- ✅ Utworzono plik `.env.production` dla production
- ✅ Utworzono `.env.example` jako template
- ✅ `.gitignore` zawiera wpisy dla `.env*`

### 2. Firebase Authentication
- ✅ Zaimplementowano login przez Google
- ✅ Zaimplementowano anonymous login z nickiem
- ✅ System ról: admin/user (email-based)
- ✅ Frontend: `AuthContext` + `LoginScreen`

### 3. Firestore Security Rules
- ✅ Wymagane uwierzytelnienie dla wszystkich kolekcji
- ✅ Users collection: każdy użytkownik może zarządzać swoim dokumentem
- ✅ Calculations: właściciel może edytować swoje kalkulacje
- ✅ Sessions: per-user isolation
- ✅ Client Manual: tylko admini mogą modyfikować

### 4. Backend (Firebase Functions)
- ✅ Authentication middleware dodany do wszystkich routes
- ✅ `ownerId` dodany do kalkulacji
- ✅ Weryfikacja tokenów Firebase Auth
- ✅ Access control dla sesji (tylko własne sesje)

### 5. Frontend API Client
- ✅ Automatyczne dodawanie Firebase Auth token do requestów
- ✅ Obsługa błędów uwierzytelnienia

### 6. Deployment
- ✅ Firestore rules wdrożone
- ✅ Functions wdrożone: https://us-central1-kalkulator-produkcyjny---alpha.cloudfunctions.net/api
- ✅ Hosting wdrożony: https://kalkulator-produkcyjny---alpha.web.app

## 🔐 Konfiguracja dla dewelopera

### 1. Sklonuj repozytorium i zainstaluj dependencies:
```bash
npm install
cd functions && npm install && cd ..
```

### 2. Skopiuj `.env.example` jako `.env` i uzupełnij wartości:
```bash
cp .env.example .env
```

### 3. Pobierz klucze Firebase z Firebase Console:
1. Otwórz [Firebase Console](https://console.firebase.google.com/)
2. Wybierz projekt: `kalkulator-produkcyjny---alpha`
3. Przejdź do **Project Settings** (koło zębate)
4. Scroll down do "Your apps" -> wybierz Web app
5. Skopiuj wartości do `.env`

### 4. Skonfiguruj adminów (opcjonalnie):
Dodaj emaile adminów do `.env`:
```
REACT_APP_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### 5. Uruchom lokalnie:
```bash
# Development (Express server + React)
npm run dev

# Production build
npm run build
```

## 🚀 Deployment na Firebase

### 1. Zainstaluj Firebase CLI:
```bash
npm install -g firebase-tools
```

### 2. Zaloguj się:
```bash
firebase login
```

### 3. Deploy wszystkiego:
```bash
firebase deploy
```

### 4. Deploy wybiórczo:
```bash
firebase deploy --only firestore:rules   # Tylko reguły Firestore
firebase deploy --only functions         # Tylko Cloud Functions
firebase deploy --only hosting           # Tylko hosting
```

## 📁 Struktura projektu

```
cost-calculator-app/
├── .env                    # Klucze Firebase (NIE commituj!)
├── .env.production         # Klucze dla production
├── .env.example            # Template dla .env
├── firebase.json           # Konfiguracja Firebase
├── firestore.rules         # Security rules dla Firestore
├── firestore.indexes.json  # Indeksy Firestore
├── functions/              # Cloud Functions (backend)
│   ├── index.js           # Entry point
│   ├── server/            # Express routes i middleware
│   │   ├── middleware/
│   │   │   └── auth.js    # Firebase Auth middleware
│   │   ├── routes/
│   │   │   ├── catalog.js
│   │   │   ├── session.js
│   │   │   └── ...
│   │   └── services/
│   │       └── storage-firestore.js
│   └── package.json
├── src/
│   ├── firebase.js        # Firebase config
│   ├── services/
│   │   └── api.js         # API client (auto-adds auth token)
│   ├── context/
│   │   ├── AuthContext.js
│   │   └── SessionContext.js
│   └── components/
│       └── Auth/
│           └── LoginScreen.js
└── build/                 # Production build

```

## 🔒 Bezpieczeństwo

### Firestore Rules (firestore.rules):
```javascript
// Wymagane uwierzytelnienie dla wszystkich kolekcji
// Właściciele mogą edytować swoje kalkulacje
// Sesje są izolowane per użytkownik
```

### Backend Authentication:
Wszystkie routes chronione przez middleware:
```javascript
const { authenticate } = require('../middleware/auth');
router.use(authenticate);
```

### Frontend Authorization:
Token automatycznie dodawany do requestów:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

## 🌐 URLs

- **Production App**: https://kalkulator-produkcyjny---alpha.web.app
- **API Functions**: https://us-central1-kalkulator-produkcyjny---alpha.cloudfunctions.net/api
- **Firebase Console**: https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha

## 📝 Notatki

1. **Admin users**: Konfigurowane przez `REACT_APP_ADMIN_EMAILS` w `.env`
2. **Anonymous login**: Każdy gość może zalogować się z nickiem (min 2 znaki)
3. **Auto-save**: Sesje zapisywane co 30 sekund do Firestore
4. **Local fallback**: LocalStorage używane jako backup przy błędach API

## ⚠️ Ostrzeżenia

- **NIE commituj pliku `.env`** - zawiera wrażliwe klucze API
- **Zawsze używaj `.env.example`** jako template dla innych developerów
- **Runtime Node.js 18 jest deprecated** - rozważ upgrade do Node.js 20
