# Backend API - Cost Calculator

## 📖 Przegląd

Backend oparty na **Node.js + Express** zapewniający REST API dla aplikacji Cost Calculator.

## 🚀 Uruchamianie

### Szybki start (Windows)
Kliknij dwukrotnie na `run-app.bat` - uruchomi backend, frontend i otworzy przeglądarkę.

### Ręczne uruchamianie

**Opcja 1: Oba serwery jednocześnie**
```bash
npm run dev
```

**Opcja 2: Osobno**
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm start
```

## 🌐 Endpointy API

**Base URL:** `http://localhost:3001/api`

### Health Check
- `GET /api/health` - Status serwera

### Catalog (Kalkulacje)
- `GET /api/catalog` - Pobierz wszystkie kalkulacje
- `GET /api/catalog/:id` - Pobierz kalkulację po ID
- `POST /api/catalog` - Stwórz nową kalkulację
- `PUT /api/catalog/:id` - Zaktualizuj kalkulację
- `DELETE /api/catalog/:id` - Usuń kalkulację
- `GET /api/catalog/search/:query` - Wyszukaj kalkulacje

### Clients (Klienci)
- `GET /api/clients` - Pobierz wszystkich klientów
- `GET /api/clients/:id` - Pobierz klienta po ID
- `POST /api/clients` - Dodaj nowego klienta
- `PUT /api/clients/:id` - Zaktualizuj klienta
- `DELETE /api/clients/:id` - Usuń klienta

### Materials (Materiały)
- `GET /api/materials` - Pobierz wszystkie materiały
- `GET /api/materials/:id` - Pobierz materiał po ID
- `POST /api/materials` - Dodaj nowy materiał
- `PUT /api/materials/:id` - Zaktualizuj materiał
- `DELETE /api/materials/:id` - Usuń materiał

### Packaging (Opakowania)
- `GET /api/packaging` - Pobierz wszystkie opakowania
- `GET /api/packaging/:id` - Pobierz opakowanie po ID
- `POST /api/packaging` - Dodaj nowe opakowanie
- `PUT /api/packaging/:id` - Zaktualizuj opakowanie
- `DELETE /api/packaging/:id` - Usuń opakowanie

### Client Manual (Instrukcje klientów)
- `GET /api/client-manual` - Pobierz wszystkie instrukcje
- `GET /api/client-manual/:id` - Pobierz instrukcję po ID
- `POST /api/client-manual` - Dodaj nową instrukcję
- `PUT /api/client-manual/:id` - Zaktualizuj instrukcję
- `DELETE /api/client-manual/:id` - Usuń instrukcję

### Session (Sesja robocza)
- `GET /api/session` - Pobierz aktywną sesję
- `POST /api/session` - Zapisz/zaktualizuj sesję
- `DELETE /api/session` - Usuń sesję

## 📁 Struktura backendu

```
server/
├── server.js                 # Główny plik serwera
├── routes/                   # Endpointy API
│   ├── catalog.js
│   ├── clients.js
│   ├── materials.js
│   ├── packaging.js
│   ├── clientManual.js
│   └── session.js
├── services/
│   └── storage.js           # Abstrakcja zapisu danych
├── middleware/
│   └── errorHandler.js      # Obsługa błędów
└── data/                    # Pliki JSON z danymi
    ├── catalog.json
    ├── clients.json
    ├── materials.json
    ├── packaging.json
    ├── clientManual.json
    └── session.json
```

## 💾 Przechowywanie danych

### Obecnie: JSON Files
Dane zapisywane w `server/data/*.json`

### Przyszłość: Firebase Firestore

Backend zaprojektowany z myślą o łatwej migracji do Firebase:

**storage.js** - Abstrakcja nad zapisem danych:
```javascript
// Obecny kod
storage.getAll('catalog')  // → czyta catalog.json

// Po migracji na Firebase (tylko zmiana implementacji!)
storage.getAll('catalog')  // → db.collection('catalog').get()
```

## 🔄 Migracja na Firebase

### 1. Instalacja Firebase
```bash
npm install firebase-admin
```

### 2. Konfiguracja
```javascript
// server/config/firebase.js
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project.firebaseio.com"
});
```

### 3. Zamiana storage.js
Zamień implementację w `server/services/storage.js`:
```javascript
// Zamiast fs.readFile
const snapshot = await db.collection(collection).get();
return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### 4. Deploy na Firebase Functions
```bash
firebase init functions
firebase deploy --only functions
```

## 🔐 CORS

Backend ma włączony CORS dla wszystkich origin:
```javascript
app.use(cors());
```

W produkcji ogranicz do swojej domeny:
```javascript
app.use(cors({
  origin: 'https://your-domain.com'
}));
```

## 🐛 Debugowanie

### Logi serwera
Backend loguje wszystkie błędy do konsoli:
```
console.error('Error:', error);
```

### Test endpointów
Użyj Postmana lub curl:
```bash
# Health check
curl http://localhost:3001/api/health

# Pobierz katalog
curl http://localhost:3001/api/catalog

# Dodaj kalkulację
curl -X POST http://localhost:3001/api/catalog \
  -H "Content-Type: application/json" \
  -d '{"calculationMeta": {"client": "Test"}, "tabs": []}'
```

## 📊 Format danych

### Catalog Item (Kalkulacja)
```json
{
  "id": "1234567890_abc123",
  "calculationMeta": {
    "client": "Klient ABC",
    "status": "draft",
    "notes": "..."
  },
  "tabs": [...],
  "items": [...],
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

### Client Item
```json
{
  "id": "1234567890_xyz789",
  "name": "Tenneco Polska",
  "code": "TEN-PL",
  "city": "Rybnik",
  "country": "Polska",
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

### Session
```json
{
  "calculation": {...},
  "isDraft": true,
  "linkedCalculationId": "123_abc",
  "lastAutoSave": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

## 🔧 Konfiguracja

### Zmiana portu
W `server/server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

Lub ustaw zmienną środowiskową:
```bash
PORT=5000 npm run server
```

### Zmiana lokalizacji danych
W `server/server.js`:
```javascript
const dataDir = path.join(__dirname, 'data');
```

## 📈 Możliwości rozwoju

1. **Autentykacja** - JWT tokens, user roles
2. **Walidacja** - JSON Schema validation
3. **Rate limiting** - express-rate-limit
4. **Logging** - Winston, Morgan
5. **Testing** - Jest, Supertest
6. **Database** - PostgreSQL, MongoDB, Firebase Firestore
7. **WebSockets** - Real-time sync między urządzeniami
8. **File upload** - Zdjęcia, PDF export
9. **Email** - Nodemailer dla powiadomień
10. **Backup** - Automatyczny backup danych

## 🆘 Problemy

### Port zajęty
```
Error: listen EADDRINUSE: address already in use :::3001
```
**Rozwiązanie:** Zmień port lub zabij proces na porcie 3001

### Node modules missing
```
Error: Cannot find module 'express'
```
**Rozwiązanie:** `npm install`

### CORS errors
```
Access to fetch at 'http://localhost:3001' blocked by CORS
```
**Rozwiązanie:** Sprawdź czy backend działa i czy CORS jest włączony
