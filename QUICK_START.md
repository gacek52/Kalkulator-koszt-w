# 🚀 Quick Start - Wdrożenie Systemu Użytkowników

## Status wykonania

- ✅ **Krok 1**: Email/Password włączone w Firebase Console

## Następne kroki (do wykonania):

### Krok 2: Pobierz Service Account Key

1. Idź do: https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha/settings/serviceaccounts/adminsdk
2. Kliknij **"Generate new private key"**
3. Zapisz plik jako: `C:\Projekty\cost-calculator-app\serviceAccountKey.json`

**WAŻNE**: Ten plik NIE będzie commitowany do git (jest w .gitignore)

---

### Krok 3: Zainstaluj firebase-admin

```bash
cd C:\Projekty\cost-calculator-app
npm install firebase-admin --save-dev
```

---

### Krok 4: Uruchom skrypt inicjalizacyjny

```bash
npm run init-roles
```

Ten skrypt utworzy 4 domyślne role w Firestore:
- **super-admin** (gacek52@gmail.com) - 25 uprawnień 🔒
- **admin** - 24 uprawnienia (wszystko oprócz zarządzania rolami)
- **user** - 9 uprawnień (tylko własne kalkulacje + read-only)
- **guest** - 6 uprawnień (podgląd własnych kalkulacji + read-only)

---

### Krok 5: Wdróż Firestore Security Rules

**Opcja A: Firebase Console (zalecane)**

1. Idź do: https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha/firestore/rules
2. Otwórz plik: `FIRESTORE_SECURITY_RULES.md`
3. Skopiuj cały blok kodu (od `rules_version = '2';` do końca)
4. Wklej do edytora w Firebase Console
5. Kliknij **"Publish"**

**Opcja B: Firebase CLI**

```bash
# Zainstaluj CLI (jeśli nie masz)
npm install -g firebase-tools

# Zaloguj się
firebase login

# Utwórz firestore.rules w głównym katalogu
# (skopiuj z FIRESTORE_SECURITY_RULES.md)

# Wdróż
firebase deploy --only firestore:rules
```

---

### Krok 6: Pierwsza instalacja - Zaloguj jako super-admin

```bash
# Uruchom aplikację
npm run dev
```

1. W aplikacji: **Zaloguj się przez Google**
2. Wybierz: **gacek52@gmail.com**
3. System automatycznie nadaje rolę **super-admin**

**Weryfikacja w Firestore:**
- Kolekcja: `users`
- Twój dokument (uid)
- Pole `role`: `"super-admin"`

---

### Krok 7: Utwórz testowego użytkownika

Zalogowany jako gacek52@gmail.com:

1. **Katalog** > **Formularze** (dropdown) > **Zarządzanie użytkownikami**
2. Kliknij **+ Dodaj użytkownika**
3. Wypełnij:
   - Email: `test@example.com`
   - Hasło: (kliknij generator lub wpisz)
   - Rola: `user`
   - ✓ Wymagaj zmiany hasła
4. **Utwórz użytkownika**
5. **ZAPISZ HASŁO** z alertu!

---

### Krok 8: Przetestuj logowanie Email/Password

1. Wyloguj się
2. Zakładka **Email/Hasło**
3. Zaloguj jako: `test@example.com`
4. Użyj hasła z poprzedniego kroku
5. Zmień hasło (dialog się pojawi automatycznie)

**Wymagania nowego hasła:**
- Minimum 8 znaków
- 1 wielka litera
- 1 mała litera
- 1 cyfra

---

### Krok 9: Przetestuj panel zarządzania rolami

Zaloguj jako **gacek52@gmail.com**:

1. **Katalog** > **Formularze** > **Zarządzanie rolami** (🔒 tylko ty widzisz)
2. Zobacz 4 domyślne role
3. Kliknij **+ Dodaj rolę**
4. Stwórz testową rolę:
   - ID: `moderator`
   - Nazwa: `Moderator`
   - Zaznacz wybrane uprawnienia
5. **Utwórz rolę**

---

## Quick Test Checklist

Szybki test czy wszystko działa:

- [ ] Zalogowanie Google jako gacek52@gmail.com
- [ ] Widoczna opcja "Zarządzanie rolami" w menu
- [ ] Widoczna opcja "Zarządzanie użytkownikami" w menu
- [ ] Utworzenie użytkownika Email/Password
- [ ] Logowanie Email/Password
- [ ] Wymuszenie zmiany hasła działa
- [ ] Historia logowań widoczna
- [ ] Wyłączenie konta działa
- [ ] Użytkownik "user" nie widzi zarządzania użytkownikami

---

## Troubleshooting

### "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin --save-dev
```

### "serviceAccountKey.json not found"
Pobierz z Firebase Console > Project Settings > Service Accounts

### "Permission denied" w Firestore
Sprawdź czy wdrożyłeś Security Rules

### Nie widzę "Zarządzanie rolami"
Ta opcja jest TYLKO dla gacek52@gmail.com (super-admin)

---

## Dokumentacja

- **Pełny przewodnik**: `DEPLOYMENT_GUIDE.md`
- **Security Rules**: `FIRESTORE_SECURITY_RULES.md`
- **Skrypt inicjalizacyjny**: `src/scripts/initializeRoles.js`

---

## Następne kroki po wdrożeniu

1. Utwórz prawdziwe konta dla zespołu
2. Przypisz odpowiednie role
3. Przetestuj uprawnienia każdej roli
4. Rozważ dodanie Cloud Functions
5. Włącz email verification (produkcja)
6. Dodaj 2FA (produkcja)

---

**Potrzebujesz pomocy?** Sprawdź `DEPLOYMENT_GUIDE.md` dla szczegółowych instrukcji.
