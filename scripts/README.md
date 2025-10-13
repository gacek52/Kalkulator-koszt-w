# Admin Scripts

## Set Admin Role

Skrypt do ręcznego ustawiania roli admin dla użytkownika w Firestore.

### Konfiguracja (jednorazowa):

1. **Pobierz Service Account Key z Firebase Console:**
   - Otwórz [Firebase Console](https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha/settings/serviceaccounts/adminsdk)
   - Kliknij **"Generate new private key"**
   - Zapisz plik jako `serviceAccountKey.json` w głównym folderze projektu
   - **NIGDY nie commituj tego pliku do git!** (już jest w .gitignore)

2. **Zainstaluj firebase-admin w głównym folderze:**
   ```bash
   npm install firebase-admin --save-dev
   ```

### Użycie:

```bash
node scripts/set-admin-role.js <email>
```

### Przykład:

```bash
node scripts/set-admin-role.js gacek52@gmail.com
```

### Co robi skrypt:

1. Znajduje użytkownika po emailu w Firebase Auth
2. Aktualizuje dokument użytkownika w Firestore:
   - Ustawia `role: 'admin'`
   - Aktualizuje `lastLogin`
3. Wyświetla zaktualizowane dane użytkownika

### Bezpieczeństwo:

- Service Account Key (`serviceAccountKey.json`) **NIE MOŻE** być commitowany do git
- Plik jest już dodany do `.gitignore`
- Ma pełne uprawnienia do projektu Firebase - trzymaj go bezpiecznie!

## Alternatywna metoda (bez skryptu):

### Przez Firebase Console:

1. Otwórz [Firestore Database](https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha/firestore)
2. Znajdź kolekcję `users`
3. Znajdź dokument użytkownika (UID)
4. Edytuj pole `role` -> ustaw wartość `admin`
5. Zapisz

### Przez Firebase CLI (interactive):

```bash
firebase firestore:delete users/<UID>/role
firebase firestore:set users/<UID> '{"role": "admin"}' --merge
```
