# PLAN WDROŻENIA USPRAWNIEŃ - KALKULATOR KOSZTÓW

**Wersja:** 1.0
**Data utworzenia:** 2025-11-25
**Status:** W trakcie realizacji
**Aktualnie:** Przygotowanie do Fazy 0

---

## 📋 ZASADY BEZPIECZEŃSTWA

1. **Backup przed każdą fazą** - eksport danych z Firestore
2. **Feature flags** - nowe funkcje włączane stopniowo
3. **Backward compatibility** - stare kalkulacje muszą działać
4. **Testowanie na środowisku staging** przed produkcją
5. **Rollback plan** - możliwość szybkiego cofnięcia zmian

---

## FAZA 0: PRZYGOTOWANIE (przed rozpoczęciem prac)

**Status:** 🟡 Do wykonania
**Odpowiedzialny:** Claude + Patryk
**Termin:** Przed rozpoczęciem Fazy 1

### 0.1 Backup danych
```
□ Eksport wszystkich kolekcji Firestore do JSON:
  - calculations
  - materials
  - packaging-compositions
  - workstations
  - clients
  - clientManual
  - transport
  - roles
  - users

□ Backup kodu (git tag: v1.0-before-refactor)
□ Dokumentacja aktualnego stanu aplikacji
```

**Polecenia:**
```bash
# Backup Firestore
firebase firestore:export gs://kalkulator-produkcyjny---alpha.firebasestorage.app/backups/before-refactor-$(date +%Y%m%d)

# Git tag
git tag v1.0-before-refactor
git push origin v1.0-before-refactor
```

### 0.2 Środowisko testowe
```
□ Utworzenie projektu Firebase staging (opcjonalne - można testować na dev branch)
□ Branch: feature/refactor-phase-1
□ CI/CD pipeline dla automatycznych testów (opcjonalne)
```

### 0.3 Testy regresji (manualne)
```
Checklist funkcjonalności do przetestowania po każdej zmianie:
  □ Tworzenie nowej kalkulacji (każdy tryb: weight, surface, volume, heatshield, multilayer)
  □ Wczytywanie istniejącej kalkulacji z katalogu
  □ Edycja kalkulacji i zapis
  □ Export PDF, Excel, JSON
  □ Import CBD
  □ Dodawanie/usuwanie zakładek
  □ Dodawanie/usuwanie pozycji
  □ Kalkulacja pakowania
  □ Kalkulacja transportu
  □ Stanowiska produkcyjne
  □ Uprawnienia (różne role)
```

---

## FAZA 1: UTILITIES I WALIDACJA (Tydzień 1-2)

**Ryzyko:** 🟢 NISKIE - dodajemy nowy kod, nie modyfikujemy istniejącego
**Status:** 🟡 Do wykonania
**Branch:** feature/refactor-phase-1

### 1.1 Utworzenie struktury utilities
```
src/utils/
├── validators.js          # Walidacja danych
├── itemFactory.js         # Factory dla items/tabs
├── curveInterpolation.js  # Centralna logika krzywych
├── costCalculations.js    # Centralne obliczenia kosztów
├── formatters.js          # Formatowanie liczb/walut
└── index.js               # Eksport wszystkich utils
```

### 1.2 validators.js - nowy plik
```javascript
/**
 * Walidatory danych wejściowych
 * NIE zmieniają istniejącego kodu
 * Będą używane OPCJONALNIE w nowych miejscach
 */

export const validators = {
  /**
   * Sprawdza czy wartość jest poprawną liczbą
   * @param {string|number} value - Wartość do sprawdzenia
   * @param {number} min - Minimalna wartość (domyślnie 0)
   * @returns {boolean}
   */
  isValidNumber: (value, min = 0) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min;
  },

  /**
   * Sprawdza czy waga jest poprawna
   * @param {string|number} weight - Waga do sprawdzenia
   * @param {string} unit - Jednostka (g, kg)
   * @returns {boolean}
   */
  isValidWeight: (weight, unit = 'g') => {
    if (!validators.isValidNumber(weight, 0)) return false;
    const num = parseFloat(weight);

    // Sprawdź czy wartość ma sens dla jednostki
    if (unit === 'kg' && num > 10000) return false; // Zbyt duża waga
    if (unit === 'g' && num > 10000000) return false; // Zbyt duża waga

    return true;
  },

  /**
   * Sprawdza czy powierzchnia jest poprawna
   */
  isValidArea: (area, unit = 'mm2') => {
    return validators.isValidNumber(area, 0);
  },

  /**
   * Sprawdza czy objętość jest poprawna
   */
  isValidVolume: (volume, unit = 'mm3') => {
    return validators.isValidNumber(volume, 0);
  },

  /**
   * Sprawdza czy item jest poprawny w zależności od trybu
   * @param {object} item - Item do walidacji
   * @param {string} mode - Tryb kalkulacji (weight, surface, volume, heatshield, multilayer)
   * @returns {object} { valid: boolean, errors: string[] }
   */
  isValidItem: (item, mode) => {
    const errors = [];

    switch (mode) {
      case 'weight':
        if (!validators.isValidWeight(item.weight, item.weightUnit)) {
          errors.push('Niepoprawna waga');
        }
        break;
      case 'surface':
        if (!validators.isValidArea(item.surfaceArea, item.surfaceUnit)) {
          errors.push('Niepoprawna powierzchnia');
        }
        break;
      case 'volume':
        if (!validators.isValidVolume(item.volume, item.volumeUnit)) {
          errors.push('Niepoprawna objętość');
        }
        break;
      // TODO: heatshield, multilayer
    }

    // Walidacja wspólnych pól
    if (!item.partId || item.partId.trim() === '') {
      errors.push('Brak numeru części');
    }

    if (!validators.isValidNumber(item.annualVolume, 0)) {
      errors.push('Niepoprawna roczna wielkość produkcji');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanityzuje wartość numeryczną
   * @param {string|number} value - Wartość do sanityzacji
   * @param {number} defaultValue - Wartość domyślna jeśli niepoprawna
   * @param {number} min - Minimalna wartość
   * @param {number} max - Maksymalna wartość
   * @returns {number}
   */
  sanitizeNumber: (value, defaultValue = 0, min = -Infinity, max = Infinity) => {
    const num = parseFloat(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }
};
```

### 1.3 itemFactory.js - nowy plik
```javascript
/**
 * Factory functions dla tworzenia items i tabs
 * Centralna definicja struktury - używana przy tworzeniu NOWYCH itemów
 * Stare itemy pozostają nietknięte (backward compatibility)
 */

/**
 * Domyślna struktura itemu
 * UWAGA: Każda zmiana tutaj musi być backward compatible!
 */
export const DEFAULT_ITEM_STRUCTURE = {
  id: null,
  partId: '',
  description: '',
  annualVolume: '',

  // Volume forecast
  volumeForecast: {
    enabled: false,
    years: {}
  },

  // Weight mode
  weight: '',
  weightOption: 'netto',
  bruttoWeight: '',
  weightUnit: 'g',

  // Surface mode
  surfaceArea: '',
  surfaceUnit: 'mm2',
  thickness: '',
  density: '',
  surfaceWeight: '',
  surfaceCalcLocked: {
    thickness: true,
    density: true,
    surfaceWeight: false
  },
  sheetLength: '1000',
  sheetWidth: '1000',
  partsPerSheet: '',
  surfaceBrutto: '',

  // Volume mode
  volume: '',
  volumeUnit: 'mm3',
  dimensions: {
    length: '',
    width: '',
    height: ''
  },
  volumeWeightOption: 'brutto-auto',

  // Heatshield mode
  heatshield: {
    surfaceNettoInput: '',
    surfaceNetto: '',
    surfaceUnit: 'mm2',
    sheetThickness: '',
    sheetDensity: '',
    sheetPrice: '',
    sheetPriceUnit: 'kg',
    matThickness: '',
    matDensity: '',
    matPrice: '',
    matPriceUnit: 'm2',
    bendingCost: '',
    joiningCost: '0',
    gluingCost: '',
    surfaceBruttoSheet: '',
    surfaceNettoSheet: '',
    surfaceNettoMat: '',
    sheetWeight: '',
    matWeight: ''
  },

  // Multilayer mode
  multilayer: {
    layers: [{
      id: 1,
      name: 'Warstwa 1',
      thickness: '',
      density: '',
      priceUnit: 'kg',
      price: '',
      surfaceNettoInput: '',
      surfaceUnit: 'mm2',
      surfaceNetto: '',
      sheetLength: '',
      sheetWidth: '',
      partsPerSheet: '',
      surfaceBrutto: '',
      weightNetto: '',
      weightBrutto: '',
      curveScope: 'global',
      customCurveValues: {}
    }],
    nextLayerId: 2
  },

  // Common
  cleaningOption: 'scaled',
  manualCleaningTime: '45',
  margin: '',
  customValues: {},
  customCurveValues: {},
  results: null,
  unit: 'kg',

  // Workstations
  workstation: {
    id: null,
    efficiency: ''
  },
  workstations: [{
    id: 1,
    workstationId: null,
    efficiency: '',
    name: 'Stanowisko 1',
    costMode: 'auto',
    manualCost: ''
  }],
  nextWorkstationId: 2,

  // Packaging
  packaging: {
    partsPerLayer: '',
    layers: '',
    partsInBox: '',
    manualPartsInBox: false,
    compositionId: null,
    customPrice: ''
  }
};

/**
 * Tworzy nowy item z domyślnymi wartościami
 * @param {number} id - ID itemu
 * @param {object} overrides - Opcjonalne nadpisanie wartości domyślnych
 * @returns {object} Nowy item
 */
export const createDefaultItem = (id, overrides = {}) => {
  return {
    ...DEFAULT_ITEM_STRUCTURE,
    id,
    ...overrides
  };
};

/**
 * Tworzy nową zakładkę z domyślnymi wartościami
 * @param {number} id - ID zakładki
 * @param {string} name - Nazwa zakładki
 * @param {string} mode - Tryb kalkulacji (weight, surface, volume, heatshield, multilayer)
 * @returns {object} Nowa zakładka
 */
export const createDefaultTab = (id, name, mode = 'weight') => {
  return {
    id,
    name: name || `Material ${id}`,
    calculationType: mode,
    items: [],
    nextItemId: 1
  };
};

/**
 * Tworzy item z pending pool (CBD import)
 * @param {object} pendingItem - Item z pending pool
 * @param {number} itemId - ID do przypisania
 * @returns {object} Nowy item
 */
export const createItemFromPending = (pendingItem, itemId) => {
  return createDefaultItem(itemId, {
    partId: pendingItem.partId,
    description: pendingItem.description || '',
    annualVolume: pendingItem.annualVolume.toString(),
    volumeForecast: pendingItem.hasVolumeForecast ? {
      enabled: true,
      years: pendingItem.volumeForecast || {}
    } : {
      enabled: false,
      years: {}
    }
  });
};
```

### 1.4 Testy jednostkowe
```javascript
// tests/validators.test.js
import { validators } from '../src/utils/validators';

describe('validators', () => {
  describe('isValidNumber', () => {
    test('akceptuje poprawne liczby', () => {
      expect(validators.isValidNumber(10)).toBe(true);
      expect(validators.isValidNumber('10')).toBe(true);
      expect(validators.isValidNumber('10.5')).toBe(true);
    });

    test('odrzuca niepoprawne wartości', () => {
      expect(validators.isValidNumber('')).toBe(false);
      expect(validators.isValidNumber('abc')).toBe(false);
      expect(validators.isValidNumber(null)).toBe(false);
    });

    test('sprawdza minimum', () => {
      expect(validators.isValidNumber(-5, 0)).toBe(false);
      expect(validators.isValidNumber(5, 0)).toBe(true);
    });
  });

  describe('sanitizeNumber', () => {
    test('zwraca wartość domyślną dla NaN', () => {
      expect(validators.sanitizeNumber('abc', 0)).toBe(0);
      expect(validators.sanitizeNumber('', 10)).toBe(10);
    });

    test('stosuje min/max', () => {
      expect(validators.sanitizeNumber(150, 0, 0, 100)).toBe(100);
      expect(validators.sanitizeNumber(-10, 0, 0, 100)).toBe(0);
    });
  });
});

// tests/itemFactory.test.js
import { createDefaultItem, createDefaultTab } from '../src/utils/itemFactory';

describe('itemFactory', () => {
  describe('createDefaultItem', () => {
    test('tworzy item z domyślnymi wartościami', () => {
      const item = createDefaultItem(1);
      expect(item.id).toBe(1);
      expect(item.partId).toBe('');
      expect(item.weight).toBe('');
    });

    test('nadpisuje wartości domyślne', () => {
      const item = createDefaultItem(1, { partId: 'TEST-001' });
      expect(item.partId).toBe('TEST-001');
    });
  });
});
```

### ✅ Kryteria akceptacji Fazy 1:
```
□ Wszystkie pliki utils utworzone
□ Wszystkie testy przechodzą (npm test)
□ Istniejące kalkulacje działają bez zmian
□ Nowe utils NIE są jeszcze używane w produkcyjnym kodzie
□ Dokumentacja JSDoc kompletna
```

**Polecenia:**
```bash
# Instalacja narzędzi do testowania (jeśli nie ma)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom

# Uruchomienie testów
npm test

# Coverage
npm test -- --coverage
```

---

## FAZA 2: MIGRACJA DO UTILITIES (Tydzień 3-4)

**Ryzyko:** 🟡 ŚREDNIE - modyfikujemy istniejący kod, ale z fallbackiem
**Status:** 🔴 Nie rozpoczęto
**Branch:** feature/refactor-phase-2

### 2.1 Feature flags
```javascript
// src/config/featureFlags.js
export const FEATURE_FLAGS = {
  USE_NEW_ITEM_FACTORY: false,      // włącz po testach
  USE_NEW_VALIDATORS: false,         // włącz po testach
  USE_NEW_CURVE_INTERPOLATION: false // włącz po testach
};

// Można też przechowywać w ENV lub Firestore dla dynamicznej zmiany
```

### 2.2 Migracja z fallbackiem
```javascript
// PRZYKŁAD: PendingPoolPanel.js - handleAssignToTab()

// PRZED:
const newItem = {
  id: targetTab.nextItemId,
  partId: pendingItem.partId,
  // ... 100 linii
};

// PO:
import { createItemFromPending } from '../../utils/itemFactory';
import { FEATURE_FLAGS } from '../../config/featureFlags';

const newItem = FEATURE_FLAGS.USE_NEW_ITEM_FACTORY
  ? createItemFromPending(pendingItem, targetTab.nextItemId)
  : {
      // Stary kod jako fallback
      id: targetTab.nextItemId,
      partId: pendingItem.partId,
      // ... reszta starego kodu
    };
```

### 2.3 Kolejność migracji
```
□ 1. PendingPoolPanel.js - handleAssignToTab()
□ 2. CostCalculator.js - handleAddTab()
□ 3. CostCalculator.js - handleBulkAssignToTab()
□ 4. CalculatorForm.js - interpolacja krzywych (ostrożnie!)
```

### ✅ Kryteria akceptacji Fazy 2:
```
□ Feature flags działają (można włączać/wyłączać)
□ Stary kod działa gdy flagi wyłączone
□ Nowy kod działa gdy flagi włączone
□ Wszystkie istniejące kalkulacje wczytują się poprawnie
□ Testy regresji przechodzą (checklist z Fazy 0.3)
```

---

## FAZA 3: WALIDACJA W UI (Tydzień 5-6)

**Ryzyko:** 🟢 NISKIE - dodajemy informacje, nie blokujemy
**Status:** 🔴 Nie rozpoczęto
**Branch:** feature/refactor-phase-3

### 3.1 Wizualna walidacja (bez blokowania)
```javascript
// Komponent: FormFieldWithValidation.js
import { validators } from '../../utils/validators';

export const FormFieldWithValidation = ({
  value,
  onChange,
  validator,
  warningMessage,
  ...props
}) => {
  const isValid = validator ? validator(value) : true;

  return (
    <div>
      <input
        value={value}
        onChange={onChange}
        className={!isValid ? 'border-yellow-500' : ''}
        {...props}
      />
      {!isValid && (
        <span className="text-yellow-500 text-xs flex items-center gap-1">
          <AlertTriangle size={12} />
          {warningMessage}
        </span>
      )}
    </div>
  );
};
```

### 3.2 Toast notifications
```javascript
// src/components/Common/Toast.js
import { Toaster, toast } from 'react-hot-toast';

// Stopniowo zastępować alert() -> toast.success() / toast.error()
```

### 3.3 Tooltips
```javascript
// src/components/Common/Tooltip.js
// Dodać do skomplikowanych pól
```

### ✅ Kryteria akceptacji Fazy 3:
```
□ Walidacja pokazuje ostrzeżenia, nie blokuje
□ Użytkownik może kontynuować mimo ostrzeżeń
□ Toast notifications zamiast alert() w kluczowych miejscach
□ Tooltips dodane do minimum 10 skomplikowanych pól
```

---

## FAZA 4: WYDAJNOŚĆ (Tydzień 7-8)

**Ryzyko:** 🟡 ŚREDNIE - zmiany w renderowaniu
**Status:** 🔴 Nie rozpoczęto
**Branch:** feature/refactor-phase-4

### 4.1 Memoizacja obliczeń
```javascript
// CalculatorResults.js
const tabSummaries = useMemo(
  () => tabs.map(tab => calculateTabSummary(tab)),
  [tabs, globalSGA, /* inne zależności */]
);

const totalSummary = useMemo(
  () => ({
    totalCost: tabSummaries.reduce((sum, ts) => sum + ts.totalCost, 0),
    totalItems: tabSummaries.reduce((sum, ts) => sum + ts.itemCount, 0)
  }),
  [tabSummaries]
);
```

### 4.2 Debouncing localStorage
```javascript
// Custom hook: useLocalStorageDebounced.js
import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export const useLocalStorageDebounced = (key, value, delay = 1000) => {
  const debouncedSave = useDebouncedCallback(
    (val) => {
      localStorage.setItem(key, JSON.stringify(val));
    },
    delay
  );

  useEffect(() => {
    debouncedSave(value);
  }, [value, debouncedSave]);
};
```

### 4.3 React.memo dla list
```javascript
// Przykład: TabItem, CalculationListItem, etc.
const TabItem = React.memo(({ tab, onSelect, isActive }) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.tab.id === nextProps.tab.id &&
         prevProps.isActive === nextProps.isActive;
});
```

### ✅ Kryteria akceptacji Fazy 4:
```
□ Brak zauważalnych lagów przy pisaniu
□ Duże kalkulacje (20+ pozycji) działają płynnie
□ localStorage zapisuje się z opóźnieniem (nie blokuje UI)
□ Dane nadal zapisują się poprawnie (nie gubią się)
```

---

## FAZA 5: REFAKTORYZACJA KOMPONENTÓW (Tydzień 9-12)

**Ryzyko:** 🔴 WYSOKIE - duże zmiany strukturalne
**Status:** 🔴 Nie rozpoczęto
**Branch:** feature/refactor-phase-5

### 5.1 Strategia: Wrapper pattern
```javascript
// CalculatorFormWrapper.js
import { FEATURE_FLAGS } from '../../config/featureFlags';

const CalculatorFormWrapper = (props) => {
  if (FEATURE_FLAGS.USE_NEW_CALCULATOR_FORM) {
    return <NewCalculatorForm {...props} />;
  }
  return <CalculatorForm {...props} />; // Stary komponent
};

export default CalculatorFormWrapper;
```

### 5.2 Podział CalculatorForm
```
src/components/Calculator/CalculatorForm/
├── index.js                    # Wrapper + orchestrator
├── OldCalculatorForm.js        # Obecny CalculatorForm zmieniony na OldCalculatorForm
├── NewCalculatorForm.js        # Nowa wersja
├── components/
│   ├── ItemBasicInfo.js        # NOWY - podstawowe dane
│   ├── CostSummaryPreview.js   # NOWY - podgląd kosztów
│   └── ValidationMessages.js   # NOWY - komunikaty walidacji
└── hooks/
    └── useItemValidation.js    # NOWY - logika walidacji
```

### 5.3 Harmonogram
```
Tydzień 9:  Przygotowanie - wrapper pattern, testy
Tydzień 10: Refaktoryzacja CostSummaryPreview (niskie ryzyko)
Tydzień 11: Refaktoryzacja głównego formularza (wysokie ryzyko)
Tydzień 12: Testy, stabilizacja, bugfixy
```

### ✅ Kryteria akceptacji Fazy 5:
```
□ Można przełączać między starym i nowym kodem
□ Wszystkie tryby kalkulacji działają (weight, surface, volume, heatshield, multilayer)
□ Wszystkie istniejące kalkulacje wczytują się
□ Export/import działa poprawnie
□ Testy regresji przechodzą
□ Feature flag pozwala wrócić do starej wersji natychmiast
```

---

## FAZA 6: TESTY E2E (Tydzień 13-14)

**Ryzyko:** 🟢 NISKIE - tylko dodajemy testy
**Status:** 🔴 Nie rozpoczęto

### 6.1 Setup Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 6.2 Scenariusze testowe
```
e2e/
├── calculations.spec.js    # Tworzenie/edycja kalkulacji
├── catalog.spec.js         # Przeglądanie katalogu
├── export.spec.js          # Export PDF/Excel/JSON
├── import.spec.js          # Import CBD/JSON
├── permissions.spec.js     # Testy uprawnień
└── fixtures/               # Dane testowe
    ├── sample-cbd.xlsx
    └── sample-calculation.json
```

### ✅ Kryteria akceptacji Fazy 6:
```
□ Testy E2E przechodzą
□ CI/CD uruchamia testy automatycznie
□ Coverage > 80% dla krytycznych ścieżek
□ Dokumentacja testów
```

---

## 📅 HARMONOGRAM SZCZEGÓŁOWY

```
GRUDZIEŃ 2024:
Tydzień 1 (02-08.12):  FAZA 0 + rozpoczęcie FAZY 1
Tydzień 2 (09-15.12):  FAZA 1 dokończenie

GRUDZIEŃ-STYCZEŃ 2024/2025:
Tydzień 3 (16-22.12):  FAZA 2 część 1
Tydzień 4 (23-29.12):  FAZA 2 część 2 (święta - wolniej)
Tydzień 5 (30.12-05.01): FAZA 3 część 1
Tydzień 6 (06-12.01):  FAZA 3 część 2

STYCZEŃ 2025:
Tydzień 7 (13-19.01):  FAZA 4 część 1
Tydzień 8 (20-26.01):  FAZA 4 część 2

LUTY 2025:
Tydzień 9 (27.01-02.02):  FAZA 5 - przygotowanie
Tydzień 10 (03-09.02):    FAZA 5 - komponenty pomocnicze
Tydzień 11 (10-16.02):    FAZA 5 - główna refaktoryzacja
Tydzień 12 (17-23.02):    FAZA 5 - stabilizacja

MARZEC 2025:
Tydzień 13 (24.02-02.03): FAZA 6 - setup testów E2E
Tydzień 14 (03-09.03):    FAZA 6 - dokończenie i CI/CD

KONIEC: ~09.03.2025
```

---

## 🔄 PROCEDURA ROLLBACK

### Przed każdą fazą:
```bash
# 1. Git tag
git tag v1.X-before-phaseY
git push origin v1.X-before-phaseY

# 2. Backup Firestore
firebase firestore:export gs://kalkulator-produkcyjny---alpha.firebasestorage.app/backups/before-phase-Y-$(date +%Y%m%d)

# 3. Feature flag domyślnie wyłączony
# Sprawdź src/config/featureFlags.js
```

### W razie problemów:
```
1. NATYCHMIAST wyłącz feature flag (jeśli jest)
2. LUB: git revert do poprzedniego taga
3. LUB: git reset --hard v1.X-before-phaseY (w ostateczności)
4. Jeśli dane uszkodzone: restore Firestore z backupu
```

### Restore Firestore:
```bash
firebase firestore:import gs://kalkulator-produkcyjny---alpha.firebasestorage.app/backups/before-phase-Y-YYYYMMDD
```

---

## ✅ CHECKLIST PRZED KAŻDYM DEPLOY

```
□ Backup Firestore wykonany
□ Git tag utworzony
□ Testy jednostkowe przechodzą (npm test)
□ Testy manualne na localhost OK (checklist z Fazy 0.3)
□ Feature flags skonfigurowane poprawnie
□ Plan rollback gotowy (znamy tag i backup)
□ Build przechodzi bez błędów (npm run build)
□ Deploy na Firebase Hosting
```

---

## 📊 PROGRESS TRACKING

### Faza 0: ✅✅✅✅✅ 100% (COMPLETED 2025-11-25)
### Faza 1: ✅✅✅✅✅ 100% (COMPLETED 2025-11-25)
### Faza 2: ⬜⬜⬜⬜⬜ 0%
### Faza 3: ⬜⬜⬜⬜⬜ 0%
### Faza 4: ⬜⬜⬜⬜⬜ 0%
### Faza 5: ⬜⬜⬜⬜⬜ 0%
### Faza 6: ⬜⬜⬜⬜⬜ 0%

**Całkowity postęp:** 29% (2/7 faz)

---

## 📝 CHANGELOG

| Data | Faza | Zmiana | Status |
|------|------|--------|--------|
| 2025-11-25 | - | Utworzenie planu | ✅ |
| 2025-11-25 | 0 | Backup Firestore (65 dokumentów) | ✅ |
| 2025-11-25 | 0 | Git tag v1.0-before-refactor | ✅ |
| 2025-11-25 | 0 | Branch feature/refactor-phase-1 | ✅ |
| 2025-11-25 | 0 | Checklist testów regresji | ✅ |
| 2025-11-25 | 1 | Utworzenie validators.js | ✅ |
| 2025-11-25 | 1 | Utworzenie itemFactory.js | ✅ |
| 2025-11-25 | 1 | Utworzenie curveInterpolation.js | ✅ |
| 2025-11-25 | 1 | Utworzenie formatters.js | ✅ |
| 2025-11-25 | 1 | Testy jednostkowe (46 testów - wszystkie przechodzą) | ✅ |
| - | - | - | - |

---

## 🔗 LINKI I ZASOBY

- [Firebase Console](https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha)
- [Aplikacja produkcyjna](https://kalkulator-produkcyjny---alpha.web.app)
- [Analiza kodu](./CODE_ANALYSIS.md) - szczegóły z analizy
- [GitHub Repository](link-do-repo-jeśli-jest)

---

**Ostatnia aktualizacja:** 2025-11-25
**Następna rewizja:** Po zakończeniu Fazy 2
**Status:** ✅ Faza 0 i 1 ukończone - gotowi do Fazy 2
