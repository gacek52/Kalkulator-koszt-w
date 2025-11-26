# PHASE 2 - TESTING GUIDE

**Data utworzenia:** 2025-11-26
**Faza:** 2 - Migracja do utilities z feature flags
**Status:** Gotowe do testowania

---

## 📋 CO ZOSTAŁO ZMIENIONE?

### Nowy kod:
1. **Feature flags system** (`src/config/featureFlags.js`)
   - Centralna kontrola włączania/wyłączania nowych funkcji
   - Debug logging w konsoli przeglądarki

2. **Migracja funkcji CBD import**:
   - `handleAssignToTab()` - przypisanie pojedynczej pozycji do zakładki
   - `handleBulkAssignToTab()` - przypisanie wielu pozycji naraz

### Stan flag (WSZYSTKIE WYŁĄCZONE):
```javascript
USE_NEW_ITEM_FACTORY: false        // ❌ WYŁĄCZONA - używa starego kodu
USE_NEW_VALIDATORS: false          // ❌ WYŁĄCZONA
USE_NEW_CURVE_INTERPOLATION: false // ❌ WYŁĄCZONA
USE_NEW_FORMATTERS: false          // ❌ WYŁĄCZONA
DEBUG_FEATURE_FLAGS: true          // ✅ WŁĄCZONA - logi w konsoli
```

**BEZPIECZEŃSTWO:** Ponieważ wszystkie flagi są wyłączone, aplikacja działa **DOKŁADNIE TAK SAMO** jak przed zmianami. Nowy kod jest obecny, ale NIE jest wykonywany.

---

## 🧪 TEST 1: Weryfikacja ze starym kodem (flagi wyłączone)

**Cel:** Upewnić się, że nic się nie zepsuło.

### Kroki:
1. Otwórz aplikację: https://kalkulator-produkcyjny---alpha.web.app
2. Otwórz konsolę przeglądarki (F12 → Console)
3. Importuj przykładowy plik CBD (.xlsx)
4. **SPRAWDŹ w konsoli:** Powinieneś zobaczyć:
   ```
   [FeatureFlag] handleAssignToTab using USE_NEW_ITEM_FACTORY: OLD code
   [FeatureFlag] handleBulkAssignToTab using USE_NEW_ITEM_FACTORY: OLD code
   ```

5. Zaznacz 3 pozycje z pending pool
6. Kliknij "Dodaj zaznaczone do zakładki"
7. **SPRAWDŹ:**
   - ✅ Wszystkie 3 pozycje pojawiły się w zakładce
   - ✅ Pozycje zniknęły z pending pool
   - ✅ Volume forecast calendar jest włączony (jeśli dane miały prognozy)
   - ✅ Dane są poprawnie wypełnione

8. Sprawdź pojedyncze przypisanie:
   - Kliknij "Dodaj do zakładki" na jednej pozycji
   - **SPRAWDŹ:** Pozycja została dodana poprawnie

### Oczekiwany wynik:
- ✅ Wszystko działa jak zwykle
- ✅ W konsoli widać komunikaty "OLD code"
- ✅ Bulk assign działa (wszystkie pozycje, nie tylko ostatnia)
- ✅ Single assign działa

---

## 🧪 TEST 2: Weryfikacja z nowym kodem (flagi włączone)

**Cel:** Przetestować nowy kod z utilities.

### Przygotowanie - włączenie flag:

**UWAGA:** Zmiany w feature flags wymagają zmiany kodu i redeploy. NIE rób tego bez konsultacji!

1. Edytuj `src/config/featureFlags.js`:
   ```javascript
   export const FEATURE_FLAGS = {
     USE_NEW_ITEM_FACTORY: true,  // ← Zmień na true
     // ...
   };
   ```

2. Build i deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Kroki testowe (po deploy):
1. Wyczyść cache przeglądarki (Ctrl+Shift+Delete)
2. Otwórz aplikację: https://kalkulator-produkcyjny---alpha.web.app
3. Otwórz konsolę (F12)
4. Importuj plik CBD
5. **SPRAWDŹ w konsoli:**
   ```
   [FeatureFlag] handleAssignToTab using USE_NEW_ITEM_FACTORY: NEW code
   [FeatureFlag] handleBulkAssignToTab using USE_NEW_ITEM_FACTORY: NEW code
   ```

6. Zaznacz 3 pozycje i dodaj do zakładki
7. **SPRAWDŹ:**
   - ✅ Wszystkie 3 pozycje pojawiły się
   - ✅ Volume forecast działa
   - ✅ Dane są identyczne jak w starym kodzie
   - ✅ Pozycje zniknęły z pending pool

8. Porównaj z TEST 1:
   - ✅ Wyniki powinny być IDENTYCZNE
   - ✅ Jedyna różnica: komunikaty w konsoli ("NEW code" zamiast "OLD code")

---

## 🧪 TEST 3: Regresja - pełna funkcjonalność

**Cel:** Upewnić się, że cała aplikacja działa poprawnie.

Użyj checklist z [REGRESSION_TESTS.md](./REGRESSION_TESTS.md):

### Priorytety do przetestowania:
1. **CBD Import (KRYTYCZNE):**
   - [ ] Import pliku .xlsx
   - [ ] Import pliku .xlsm
   - [ ] Pending pool wyświetla pozycje
   - [ ] Single assign działa
   - [ ] Bulk assign (3+ pozycji) działa
   - [ ] Volume forecast calendar auto-enabled
   - [ ] Duplikacja pending item
   - [ ] Usunięcie pending item

2. **Tworzenie kalkulacji:**
   - [ ] Nowa kalkulacja w trybie Weight
   - [ ] Dodanie pozycji ręcznie
   - [ ] Zapis do katalogu

3. **Wczytywanie kalkulacji:**
   - [ ] Wczytanie istniejącej kalkulacji
   - [ ] Edycja i ponowny zapis
   - [ ] Duplikacja kalkulacji

4. **Export:**
   - [ ] Export do PDF
   - [ ] Export do Excel
   - [ ] Export do JSON

---

## 🐛 CO ROBIĆ GDY COŚ NIE DZIAŁA?

### Scenariusz 1: Błąd w konsoli
```
❌ ERROR: Cannot read property 'volumeForecast' of undefined
```

**Rozwiązanie:**
1. Zrób screenshot błędu
2. Wyłącz flagę `USE_NEW_ITEM_FACTORY` → `false`
3. Redeploy
4. Sprawdź czy błąd zniknął
5. Zgłoś błąd z screenshotem

### Scenariusz 2: Bulk assign nie działa (znowu dodaje tylko ostatnią pozycję)
**To oznacza regresję w nowym kodzie!**

**Rozwiązanie:**
1. NATYCHMIAST wyłącz flagę
2. Redeploy
3. Zgłoś problem

### Scenariusz 3: Volume forecast nie włącza się automatycznie
**To może być problem z `createItemFromPending()`**

**Rozwiązanie:**
1. Sprawdź strukturę w konsoli:
   ```javascript
   console.log(item.volumeForecast);
   // Powinno być: { enabled: true, years: {...} }
   ```
2. Jeśli struktura niepoprawna → wyłącz flagę, zgłoś problem
3. Jeśli struktura OK ale UI nie reaguje → może być problem w komponencie

---

## 📊 KRYTERIA SUKCESU

### Test uznajemy za zaliczony gdy:
- [x] Build przechodzi bez błędów
- [ ] TEST 1 przechodzi w 100%
- [ ] TEST 2 przechodzi w 100%
- [ ] TEST 3 przechodzi w min. 90%
- [ ] Brak błędów krytycznych w konsoli
- [ ] Wydajność bez zmian (nie ma lagów)

### Gotowe do włączenia flag na stałe gdy:
- [ ] Wszystkie testy przechodzą przez min. 3 dni
- [ ] Brak zgłoszeń bugów od użytkowników
- [ ] Backup Firestore wykonany przed włączeniem
- [ ] Git tag utworzony: `v1.1-phase2-complete`

---

## 🔄 PLAN ROLLBACK

Jeśli coś pójdzie nie tak:

### Natychmiastowy rollback (< 5 min):
```bash
# 1. Wyłącz flagę w kodzie
# src/config/featureFlags.js → USE_NEW_ITEM_FACTORY: false

# 2. Redeploy
npm run build
firebase deploy --only hosting
```

### Pełny rollback do poprzedniej wersji (< 15 min):
```bash
# 1. Powrót do poprzedniego commita
git reset --hard v1.0-before-refactor

# 2. Redeploy
npm run build
firebase deploy --only hosting

# 3. Jeśli dane uszkodzone (mało prawdopodobne)
firebase firestore:import gs://kalkulator-produkcyjny---alpha.firebasestorage.app/backups/backup-2025-11-25T10-59-11/
```

---

## 📝 RAPORTOWANIE WYNIKÓW

### Szablon raportu:

```
## Test Report - Phase 2

**Data:** YYYY-MM-DD
**Tester:** [Imię]
**Flagi:** USE_NEW_ITEM_FACTORY = [true/false]

### TEST 1: Stary kod (flagi wyłączone)
- [ ] Import CBD - OK / FAIL
- [ ] Single assign - OK / FAIL
- [ ] Bulk assign - OK / FAIL
- [ ] Volume forecast - OK / FAIL
- **Komentarz:** ___________

### TEST 2: Nowy kod (flagi włączone)
- [ ] Import CBD - OK / FAIL
- [ ] Single assign - OK / FAIL
- [ ] Bulk assign - OK / FAIL
- [ ] Volume forecast - OK / FAIL
- **Komentarz:** ___________

### TEST 3: Regresja
- [ ] CBD Import (8/8 testów) - OK / FAIL
- [ ] Tworzenie kalkulacji - OK / FAIL
- [ ] Wczytywanie kalkulacji - OK / FAIL
- [ ] Export - OK / FAIL
- **Komentarz:** ___________

### Znalezione błędy:
1. [Opis błędu + screenshot]
2. ...

### Decyzja:
- [ ] ✅ Wszystko OK - można pozostawić na produkcji
- [ ] ⚠️ Drobne problemy - monitorować
- [ ] ❌ Poważne problemy - rollback wymagany
```

---

## 🔍 DEBUG TIPS

### Sprawdzanie struktury itemów w konsoli:
```javascript
// W DevTools Console:
const items = JSON.parse(localStorage.getItem('calculatorState')).tabs[0].items;
console.table(items.map(i => ({
  id: i.id,
  partId: i.partId,
  volumeForecastEnabled: i.volumeForecast?.enabled,
  volumeForecastYears: Object.keys(i.volumeForecast?.years || {})
})));
```

### Sprawdzanie flag:
```javascript
import { FEATURE_FLAGS } from './config/featureFlags';
console.log('Current flags:', FEATURE_FLAGS);
```

### Logi feature flag:
Wszystkie logi feature flag są prefixowane `[FeatureFlag]`. W konsoli użyj filtra:
```
[FeatureFlag]
```

---

**Ostatnia aktualizacja:** 2025-11-26
**Następna rewizja:** Po zakończeniu testów (2-3 dni)
**Status:** ✅ Gotowe do testowania - flagi WYŁĄCZONE (bezpieczny stan)
