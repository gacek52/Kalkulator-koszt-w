# 🚀 Przewodnik Wdrożenia - System Zarządzania Użytkownikami

## Przegląd

Ten dokument zawiera krok po kroku instrukcje wdrożenia systemu zarządzania użytkownikami z rolami i uprawnieniami.

## Wymagania wstępne

- ✅ Projekt Firebase utworzony
- ✅ Firebase Authentication włączone
- ✅ Firestore Database utworzony
- ✅ Node.js zainstalowany (do uruchomienia skryptu inicjalizacyjnego)

---

## Krok 1: Włącz Email/Password Authentication ✅

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. Wybierz swój projekt: **kalkulator-produkcyjny---alpha**
3. W menu po lewej: **Authentication** > **Sign-in method**
4. Kliknij **Email/Password**
5. Włącz pierwszy przełącznik: **Enable**
6. **NIE włączaj** "Email link (passwordless sign-in)"
7. Kliknij **Save**

**Status: ✅ WYKONANE**

---

## Krok 2: Pobierz Service Account Key

Potrzebny do uruchomienia skryptu inicjalizacyjnego ról.

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. **Project Settings** (koło zębate) > **Service accounts**
3. Kliknij **Generate new private key**
4. Zapisz plik jako `serviceAccountKey.json` w głównym katalogu projektu:
   ```
   C:\Projekty\cost-calculator-app\serviceAccountKey.json
   ```

⚠️ **WAŻNE**: Ten plik zawiera wrażliwe dane. NIE commituj go do git!

Dodaj do `.gitignore`:
```
serviceAccountKey.json
```

---

## Krok 3: Zainstaluj Firebase Admin SDK

W terminalu w katalogu projektu:

```bash
cd C:\Projekty\cost-calculator-app
npm install firebase-admin --save-dev
```

---

## Krok 4: Uruchom skrypt inicjalizacyjny ról

Ten skrypt utworzy 4 domyślne role w Firestore.

```bash
node src/scripts/initializeRoles.js
```

**Oczekiwany output:**
```
✓ Firebase Admin SDK zainicjalizowany

🚀 Inicjalizacja domyślnych ról...

✓ Dodaję rolę: "Super Administrator" (super-admin)
✓ Dodaję rolę: "Administrator" (admin)
✓ Dodaję rolę: "Użytkownik" (user)
✓ Dodaję rolę: "Gość" (guest)

✅ Utworzono 4 nowych ról w Firestore

📊 Podsumowanie ról:
─────────────────────────────────────────────────
Super Administrator       | super-admin     | 25 uprawnień 🔒 CHRONIONE
Administrator             | admin           | 24 uprawnień
Użytkownik               | user            | 9 uprawnień
Gość                     | guest           | 6 uprawnień
─────────────────────────────────────────────────
```

---

## Krok 5: Wdróż Firestore Security Rules

### Opcja A: Przez Firebase Console (zalecane dla początku)

1. Przejdź do [Firebase Console](https://console.firebase.google.com/)
2. **Firestore Database** > **Rules**
3. Otwórz plik `FIRESTORE_SECURITY_RULES.md` w edytorze
4. Skopiuj cały kod rules (sekcja "Przykładowe Security Rules")
5. Wklej do edytora w Firebase Console
6. Kliknij **Publish**

⚠️ **OSTRZEŻENIE**: Przed publikacją, sprawdź czy nie nadpisujesz ważnych istniejących reguł!

### Opcja B: Przez Firebase CLI

```bash
# Zainstaluj Firebase CLI (jeśli jeszcze nie masz)
npm install -g firebase-tools

# Zaloguj się
firebase login

# Inicjalizuj projekt (jeśli jeszcze nie zrobione)
firebase init firestore

# Edytuj firestore.rules
# Skopiuj rules z FIRESTORE_SECURITY_RULES.md

# Wdróż
firebase deploy --only firestore:rules
```

---

## Krok 6: Weryfikacja w Firestore

Sprawdź czy role zostały utworzone:

1. [Firebase Console](https://console.firebase.google.com/) > **Firestore Database**
2. Powinieneś zobaczyć kolekcję: **roles**
3. Z 4 dokumentami:
   - `super-admin` 🔒
   - `admin`
   - `user`
   - `guest`

---

## Krok 7: Pierwsza instalacja - Utwórz profil super-admina

Zaloguj się pierwszy raz jako **gacek52@gmail.com** przez Google:

```bash
# Uruchom aplikację
npm start
```

1. W aplikacji kliknij **Zaloguj się przez Google**
2. Wybierz konto **gacek52@gmail.com**
3. System automatycznie przypisze rolę **super-admin**

Sprawdź w Firestore:
- Kolekcja: **users**
- Dokument: (twoje uid)
- Pole `role`: **"super-admin"**

---

## Krok 8: Testowanie - Utwórz użytkownika Email/Password

1. W aplikacji (zalogowany jako gacek52): **Katalog** > **Formularze** (dropdown) > **Zarządzanie użytkownikami**
2. Kliknij **+ Dodaj użytkownika**
3. Wypełnij formularz:
   - **Email**: `test@example.com`
   - **Hasło**: Kliknij generator (lub wpisz minimum 6 znaków)
   - **Rola**: `user`
   - **✓ Wymagaj zmiany hasła przy pierwszym logowaniu**
4. Kliknij **Utwórz użytkownika**
5. **WAŻNE**: Zapisz hasło z alertu (jedyna szansa!)

---

## Krok 9: Testowanie - Logowanie Email/Password

1. Wyloguj się (prawy górny róg)
2. Kliknij zakładkę **Email/Hasło**
3. Wpisz:
   - Email: `test@example.com`
   - Hasło: (z poprzedniego kroku)
4. Kliknij **Zaloguj się**

**Oczekiwany wynik**: Dialog "Wymagana zmiana hasła"

5. Zmień hasło:
   - Minimum 8 znaków
   - 1 wielka litera
   - 1 mała litera
   - 1 cyfra
6. Kliknij **Zmień hasło**

**Oczekiwany wynik**: ✅ Pomyślne logowanie, przekierowanie do aplikacji

---

## Krok 10: Testowanie - Panel Zarządzania Rolami

Zaloguj się jako **gacek52@gmail.com**:

1. **Katalog** > **Formularze** > **Zarządzanie rolami** (🔒 tylko super-admin widzi)
2. Sprawdź 4 domyślne role
3. Kliknij **+ Dodaj rolę**
4. Utwórz testową rolę:
   - **ID**: `moderator`
   - **Nazwa**: `Moderator`
   - Zaznacz wybrane uprawnienia (np. tylko materiały i klienci)
5. Kliknij **Utwórz rolę**

**Oczekiwany wynik**: ✅ Nowa rola pojawia się na liście

---

## Krok 11: Testowanie - Uprawnienia

### Test 1: Użytkownik "user" nie widzi zarządzania użytkownikami

1. Zaloguj jako `test@example.com`
2. **Katalog** > **Formularze** (dropdown)
3. **Oczekiwany wynik**: ❌ Brak opcji "Zarządzanie użytkownikami" i "Zarządzanie rolami"

### Test 2: Użytkownik "user" widzi tylko własne kalkulacje

1. Utwórz kalkulację jako `test@example.com`
2. Wyloguj i zaloguj jako `gacek52@gmail.com`
3. **Oczekiwany wynik**: ✅ Admin widzi wszystkie kalkulacje

### Test 3: Goście nie mogą edytować

1. Zaloguj jako gość (nick)
2. Otwórz kalkulację
3. **Oczekiwany wynik**: ❌ Pola są read-only dla gości

---

## Krok 12: Testowanie - Historia logowań

1. Zaloguj jako admin: `gacek52@gmail.com`
2. **Zarządzanie użytkownikami**
3. Kliknij ikonę 📜 (History) przy użytkowniku `test@example.com`

**Oczekiwany wynik**: Modal z historią logowań:
- Timestamp
- Metoda: email
- Status: ✓ Sukces

---

## Krok 13: Testowanie - Wyłączanie kont

1. Zaloguj jako admin
2. **Zarządzanie użytkownikami**
3. Kliknij ikonę 👁️ (EyeOff) przy użytkowniku `test@example.com`
4. Potwierdź wyłączenie

**Oczekiwany wynik**: ✅ Status zmienia się na "Wyłączone"

5. Wyloguj się
6. Spróbuj zalogować jako `test@example.com`

**Oczekiwany wynik**: ❌ Błąd: "Konto zostało wyłączone..."

---

## Podsumowanie checklist

- [x] Email/Password włączone w Firebase Console
- [ ] Service Account Key pobrany
- [ ] Firebase Admin SDK zainstalowany
- [ ] Skrypt inicjalizacyjny uruchomiony
- [ ] Firestore Security Rules wdrożone
- [ ] Profil super-admina utworzony (gacek52@gmail.com)
- [ ] Użytkownik testowy Email/Password utworzony
- [ ] Wymuszenie zmiany hasła przetestowane
- [ ] Panel zarządzania rolami przetestowany
- [ ] Uprawnienia różnych ról przetestowane
- [ ] Historia logowań przetestowana
- [ ] Wyłączanie kont przetestowane

---

## Troubleshooting

### Problem: "Firebase Admin SDK nie może się zainicjalizować"

**Rozwiązanie**:
- Sprawdź czy `serviceAccountKey.json` jest w głównym katalogu projektu
- Sprawdź czy plik nie jest uszkodzony (powinien zawierać JSON)
- Upewnij się że zainstalowałeś `firebase-admin`: `npm install firebase-admin --save-dev`

### Problem: "Role już istnieją w Firestore"

**Rozwiązanie**:
- To normalne przy drugim uruchomieniu skryptu
- Skrypt pomija istniejące role
- Jeśli chcesz wymusić aktualizację, ręcznie usuń role w Firebase Console

### Problem: "Nie widzę 'Zarządzanie rolami' w menu"

**Rozwiązanie**:
- Ta opcja jest TYLKO dla super-admin (gacek52@gmail.com)
- Sprawdź w Firestore czy Twoje konto ma `role: "super-admin"`
- Wyloguj się i zaloguj ponownie

### Problem: "Nie mogę utworzyć użytkownika Email/Password"

**Rozwiązanie**:
- Sprawdź czy Email/Password jest włączone w Firebase Console
- Sprawdź console przeglądarki (F12) czy są błędy
- Upewnij się że hasło ma minimum 6 znaków

### Problem: "Security Rules nie pozwalają na operacje"

**Rozwiązanie**:
- Sprawdź czy wdrożyłeś rules z `FIRESTORE_SECURITY_RULES.md`
- W Firebase Console > Firestore > Rules sprawdź aktualny stan
- Testuj rules w zakładce "Rules Playground"

---

## Bezpieczeństwo

⚠️ **NIGDY nie commituj**:
- `serviceAccountKey.json`
- `.env` z API keys
- Plików z hasłami

✅ **Zawsze**:
- Używaj HTTPS w produkcji
- Regularnie przeglądaj uprawnienia użytkowników
- Monitoruj logi w Firebase Console
- Używaj silnych haseł (8+ znaków, wielka, mała, cyfra)

---

## Produkcja

Przed wdrożeniem do produkcji:

1. **Cloud Functions**: Rozważ przeniesienie tworzenia użytkowników do Cloud Functions
2. **Email verification**: Dodaj weryfikację emaili dla nowych kont
3. **Rate limiting**: Ogranicz próby logowania
4. **2FA**: Rozważ dodanie dwuskładnikowej autentykacji
5. **Audit logs**: Loguj wszystkie zmiany w uprawnieniach
6. **Backup**: Regularnie twórz kopie zapasowe Firestore

---

## Wsparcie

W razie problemów:
- Sprawdź console przeglądarki (F12)
- Sprawdź logi Firebase Console
- Przeczytaj `FIRESTORE_SECURITY_RULES.md`
- Sprawdź dokumentację Firebase: https://firebase.google.com/docs

---

**Powodzenia! 🚀**
