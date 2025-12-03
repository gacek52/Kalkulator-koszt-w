# CODE MAP - Kalkulator Kosztów Produkcji

**Wersja:** 1.7
**Data:** 2025-12-03
**Status:** Phase 5.2 COMPLETE - ItemResults extracted, fallback removed

---

## 📜 INSTRUKCJE DLA AI (CLAUDE)

> **WAŻNE:** Zawsze czytaj ten plik NAJPIERW przed jakąkolwiek pracą nad kodem!
>
> **Zasady:**
> 1. ✅ Przeczytaj CODE_MAP.md → znajdź odpowiedni moduł
> 2. ✅ Czytaj TYLKO relevantne pliki (nie cały codebase!)
> 3. ✅ Aktualizuj CODE_MAP.md po każdej zmianie struktury
> 4. ✅ Używaj sekcji "Jak modyfikować?" jako przewodnika
> 5. ❌ NIE czytaj całego OldCalculatorForm.js bez potrzeby

---

## 🏗️ ARCHITEKTURA GŁÓWNA

```
src/
├── components/
│   ├── Calculator/
│   │   ├── CostCalculator.js          # 🎯 GŁÓWNY KONTENER
│   │   ├── OldCalculatorForm.js       # 📝 FORMULARZ (2299 linii, w refaktoryzacji)
│   │   ├── CalculatorForm.js          # 🔀 WRAPPER (feature flag routing)
│   │   ├── NewCalculatorForm.js       # 🆕 NOWA WERSJA (obecnie = wrapper)
│   │   │
│   │   ├── FormComponents/            # 🧩 KOMPONENTY UI
│   │   │   ├── ItemCard.js            # ❤️ ITEM RENDERING (513 linii)
│   │   │   ├── ItemResults.js         # 📊 WYNIKI (196 linii)
│   │   │   └── CustomCurvesSection.js # 📊 KRZYWE (130 linii, nieużywane)
│   │   │
│   │   ├── hooks/                     # 🔧 LOGIKA BIZNESOWA
│   │   │   └── useItemCalculation.js  # (placeholder, TODO)
│   │   │
│   │   └── [inne komponenty]          # SettingsPanel, CBDImport, etc.
│   │
│   └── [inne moduły]                  # Admin, Auth, Common, Catalog, etc.
│
├── context/                           # 📦 STATE MANAGEMENT
│   ├── CalculatorContext.js           # Stan kalkulacji (tabs, items)
│   ├── MaterialContext.js             # Materiały, kompozycje
│   ├── PackagingContext.js            # Kartony, palety
│   ├── TransportContext.js            # Typy transportu
│   └── WorkstationContext.js          # Stanowiska produkcyjne
│
└── config/
    └── featureFlags.js                # 🚩 FEATURE FLAGS
```

---

## 📂 SZCZEGÓŁOWA MAPA KOMPONENTÓW

### **CostCalculator.js** (główny kontener)
**Rozmiar:** ~1200 linii
**Odpowiedzialność:**
- State management (tabs, activeTab, globalSGA)
- Session management
- Kalkulacja save/load do Firestore
- Export (PDF, Excel, JSON)
- Import CBD
- Routing między zakładkami

**Kluczowe funkcje:**
- `handleAddTab()` - dodaje nową zakładkę
- `handleSaveCalculation()` - zapisuje do Firestore
- `handleExportPDF()` - eksport do PDF

**Contexts używane:**
- CalculatorContext
- PackagingContext
- MaterialContext
- TransportContext
- WorkstationContext
- ClientContext

---

### **OldCalculatorForm.js** (formularz kalkulacji)
**Rozmiar:** 1617 linii ✅ ZREDUKOWANY z 2299 (-682 linii, -30%)
**Odpowiedzialność:**
- Renderowanie formularza dla pojedynczej zakładki
- Kalkulacja kosztów itemów
- Interpolacja krzywych (funkcje inline - mogą być w utils)
- Obsługa różnych trybów (weight/surface/volume/heatshield/multilayer)

**Główne sekcje:**

#### **1. Imports & Setup** (linie 1-45)
```javascript
// Contexts, hooks, komponenty
import { ItemCard } from './FormComponents/ItemCard';
import { FEATURE_FLAGS } from '../../config/featureFlags';
```

#### **2. useEffect - Auto-recalculation** (linie 46-91)
- Przelicza wszystkie items gdy zmienia się globalSGA, parametry zakładki, transport
- Iteruje po WSZYSTKICH zakładkach (nie tylko aktualnej)

#### **3. Funkcje interpolacji krzywych** (linie 93-180)
- `interpolateFromCurve(x, curve)` - interpolacja X→Y z ekstrapolacją (~45 linii)
- `reverseInterpolateFromCurve(y, curve)` - odwrotna Y→X (~45 linii)

#### **4. Funkcje kalkulacji kosztów** (linie 182-1020)
- `calculateMultilayerCost(item, tabData, sga)` - tryb multilayer (~250 linii)
- `calculateHeatshieldCost(item, tabData, sga)` - tryb heatshield (~170 linii)
- `calculatePackagingCost(item)` - koszt pakowania (~30 linii)
- `calculateWorkstationsCost(item)` - stanowiska produkcyjne (~30 linii)
- `calculateTransportCost(item, tabData)` - transport (~60 linii)
- `calculateItemCost(item, tabData, sga)` - ❤️ GŁÓWNA FUNKCJA (~270 linii)

#### **5. Handlery** (linie 1023-1410)
- `handleItemUpdate(itemId, updates)` - aktualizacja itemu (~10 linii)
- `hasTabData()` - sprawdza czy są dane (~50 linii)
- `handleResetTab()` - reset zakładki (~100 linii)
- `handleMaterialCompositionSelect()` - wybór materiału (~40 linii)
- `handleTabParameterUpdate()` - zmiana parametrów (~60 linii)
- `handleAddItem()` - dodaje item (~120 linii)

#### **6. JSX Rendering - Header & Parameters** (linie 1415-1672)
- Nagłówek z Settings button
- Selektor trybu kalkulacji
- Wybór materiału dla zakładki
- Parametry zakładki (materialCost, bakingCost, etc.)
- Procesy niestandardowe

#### **7. JSX Rendering - Items Loop WITH FEATURE FLAG** (linie 1674-2294)
```javascript
{tab.items.map((item, index) => {
  // FEATURE FLAG: USE_EXTRACTED_ITEM_CARD
  if (FEATURE_FLAGS.USE_EXTRACTED_ITEM_CARD) {
    return <ItemCard ... />; // ✅ NOWY (590 linii w osobnym pliku)
  }

  // FALLBACK: Stary inline kod (600 linii)
  return <div>...</div>; // ❌ DO USUNIĘCIA
})}
```

**🎯 TARGET REFAKTORYZACJI:**
- Usunąć fallback kod (linie 1699-2294) → **-600 linii**
- Wyekstrahować funkcje kalkulacji do hooks → **-850 linii**
- **Rezultat: 2299 → ~850 linii**

---

### **FormComponents/ItemCard.js** (rendering pojedynczego itemu)
**Rozmiar:** 513 linii ✅ ZREDUKOWANY z 673 (-160 linii, -24%)
**Status:** ✅ WYEKSTRAHOWANY (Phase 5.1) + ZOPTYMALIZOWANY (Phase 5.2)
**Odpowiedzialność:**
- Renderowanie pojedynczego itemu w kalkulacji
- Pola specyficzne dla trybu (weight/surface/volume/heatshield/multilayer)
- Pola wspólne (annualVolume, margin)
- Sekcje: stanowiska, pakowanie, tooling, prognozy, transport
- ~~Wyniki kalkulacji~~ → PRZENIESIONE DO ItemResults.js
- Akcje: duplicate, delete
- Collapse/expand

**Props:**
```javascript
<ItemCard
  item={item}              // dane itemu
  index={index}            // indeks w tablicy
  tab={tab}                // dane zakładki
  calculationMeta={...}    // transport, client
  onUpdate={fn}            // callback aktualizacji
  onDuplicate={fn}         // callback powielania
  onDelete={fn}            // callback usuwania
  themeClasses={obj}       // CSS classes
  darkMode={bool}          // tryb ciemny
  packagingState={obj}     // stan pakowania
  transportState={obj}     // stan transportu
  clientState={obj}        // stan klientów
  canDelete={bool}         // czy można usunąć
/>
```

**Główne sekcje:**
1. **Collapse header** (linie 86-105) - przycisk zwijania + partId
2. **Mode-specific fields** (linie 111-218) - pola zależne od trybu
3. **Common fields** (linie 221-251) - annualVolume, margin
4. **Workstations** (linie 254-261) - stanowiska produkcyjne
5. **Packaging** (linie 264-270) - pakowanie
6. **Tooling** (linie 273-279) - narzędzia
7. **Volume forecast** (linie 282-288) - prognozy
8. **Transport details** (linie 291-357) - szczegóły transportu
9. **Cleaning options** (linie 360-372) - czyszczenie
10. **Custom curves** (linie 375-477) - krzywe niestandardowe (🎯 DO EKSTRAKCJI)
11. **Results** (linie 480-575) - wyniki kalkulacji (🎯 DO EKSTRAKCJI)
12. **Action buttons** (linie 579-595) - duplicate, delete

**✅ REFAKTORYZACJA COMPLETED (Phase 5.2):**
- ~~Wyekstrahować ItemResults~~ → ✅ DONE (-160 linii)
- **Rezultat: 673 → 513 linii (-24%)**
- CustomCurvesSection (już utworzony, można użyć w przyszłości)

---

### **FormComponents/ItemResults.js** (wyniki kalkulacji)
**Rozmiar:** 196 linii
**Status:** ✅ UTWORZONY (Phase 5.2)
**Odpowiedzialność:**
- Wyświetlanie rozbicia kosztów (materiał, procesy, pakowanie, transport)
- Obsługa różnych trybów kalkulacji (heatshield vs standardowe)
- Wyświetlanie szczegółów stanowisk produkcyjnych
- Cena całkowita i DAP (Delivered At Place)

**Props:**
```javascript
<ItemResults
  item={item}                  // dane itemu z wynikami
  tab={tab}                    // dane zakładki
  calculationMeta={...}        // transport, client
  themeClasses={obj}           // CSS classes
  darkMode={bool}              // tryb ciemny
  clientState={obj}            // stan klientów
/>
```

**Wyekstrahowano z:** ItemCard.js (linie 479-647)
**Rezultat:** ItemCard zredukowany o 160 linii (-24%)

---

### **FormComponents/CustomCurvesSection.js** (krzywe niestandardowe)
**Rozmiar:** 130 linii
**Status:** ✅ UTWORZONY, ❌ NIEUŻYWANY
**Odpowiedzialność:**
- Renderowanie krzywych niestandardowych
- Dropdown źródła danych (manual/auto)
- Input field (ręczne lub disabled)
- Wyświetlanie wyników interpolacji

**Props:**
```javascript
<CustomCurvesSection
  customCurves={tab.customCurves}  // lista krzywych
  item={item}                      // dane itemu
  onUpdate={fn}                    // callback
  themeClasses={obj}               // CSS
  darkMode={bool}                  // tryb ciemny
/>
```

**TODO:** Zamienić w ItemCard linie 375-477 na ten komponent

---

## 📦 CONTEXTS (State Management)

### **CalculatorContext.js**
**Odpowiedzialność:** Główny stan kalkulacji
**State:**
```javascript
{
  tabs: [],              // zakładki z itemami
  nextTabId: 1,
  calculationMeta: {
    name: '',
    client: null,
    transport: {
      enabled: false,
      transportTypeId: null,
      ...
    }
  },
  globalSGA: ''
}
```

**Actions:**
- `addTab(tab)`
- `removeTab(tabId)`
- `updateTab(tabId, updates)`
- `addItem(tabId, item)`
- `removeItem(tabId, itemId)`
- `duplicateItem(tabId, itemId)`
- `setCalculationMeta(meta)`
- `setGlobalSGA(sga)`

### **MaterialContext.js**
**State:** `{ materialTypes: [], compositions: [] }`

### **PackagingContext.js**
**State:** `{ compositions: [] }` (rodzaje kartonów/palet)

### **TransportContext.js**
**State:** `{ types: [] }` (typy transportu)

### **WorkstationContext.js**
**State:** `{ workstations: [] }` (stanowiska produkcyjne)

---

## 🚩 FEATURE FLAGS

**Plik:** `src/config/featureFlags.js`

### **USE_EXTRACTED_ITEM_CARD** (✅ ENABLED)
```javascript
USE_EXTRACTED_ITEM_CARD: true
```
- **Gdy true:** Używa ItemCard component (kod w osobnym pliku)
- **Gdy false:** Używa inline JSX (stary kod, fallback)
- **Status:** PRODUCTION, działa poprawnie
- **Rollback:** Zmień na `false` + rebuild + redeploy

### **USE_NEW_CALCULATOR_FORM** (❌ DISABLED)
```javascript
USE_NEW_CALCULATOR_FORM: false
```
- Wrapper pattern (NewCalculatorForm vs OldCalculatorForm)
- Obecnie wyłączone

---

## 🔧 JAK MODYFIKOWAĆ?

### **Zmiana logiki kalkulacji kosztów:**
```
1. Plik: src/components/Calculator/OldCalculatorForm.js
2. Funkcja: calculateItemCost() (linia ~748)
3. Dla trybu multilayer: calculateMultilayerCost() (linia ~182)
4. Dla trybu heatshield: calculateHeatshieldCost() (linia ~434)
```

**Przykład:**
```javascript
// Zmiana formuły kosztu materiału
// OldCalculatorForm.js, linia ~779-793
let materialCost_total = 0;
if (tabData.calculationType === 'surface' && tabData.materialPriceUnit === 'm2') {
  const surfaceForCost = surfaceBrutto > surfaceNetto ? surfaceBrutto : surfaceNetto;
  materialCost_total = surfaceForCost * materialCost; // ← TU ZMIENIĆ
}
```

---

### **Zmiana UI formularza (pojedynczy item):**
```
1. Plik: src/components/Calculator/FormComponents/ItemCard.js
2. Znajdź odpowiednią sekcję:
   - Collapse header: linie 86-105
   - Mode fields: linie 111-218
   - Results: linie 480-575
```

**Przykład:**
```javascript
// Dodanie nowego pola do common fields
// ItemCard.js, linia ~221
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {/* Dodaj nowe pole tutaj */}
  <div>
    <label>Nowe pole</label>
    <input ... />
  </div>
</div>
```

---

### **Dodanie nowego pola do itemu:**

**KROK 1: Context - dodaj do initialState**
```javascript
// CalculatorContext.js, linia ~58
const initialState = {
  tabs: [{
    items: [{
      newField: '',  // ← DODAJ
      ...
    }]
  }]
};
```

**KROK 2: UI - dodaj w ItemCard**
```javascript
// ItemCard.js
<input
  value={item.newField}
  onChange={(e) => onUpdate({newField: e.target.value})}
/>
```

**KROK 3: Kalkulacja - użyj w calculateItemCost**
```javascript
// OldCalculatorForm.js, calculateItemCost()
const newFieldValue = parseFloat(item.newField) || 0;
const adjustedCost = totalCost * newFieldValue;
```

---

### **Zmiana interpolacji krzywych:**
```
1. Plik: src/components/Calculator/OldCalculatorForm.js
2. Funkcje:
   - interpolateFromCurve(x, curve) - linia ~93
   - reverseInterpolateFromCurve(y, curve) - linia ~136
```

---

### **Dodanie nowego trybu kalkulacji:**
```
1. CalculationTypeSelector.js - dodaj opcję
2. OldCalculatorForm.js - dodaj case w calculateItemCost()
3. Utwórz komponent XxxModeFields.js (wzór: SurfaceModeFields)
4. Dodaj w ItemCard.js (linie 111-218)
```

---

## 📊 STATYSTYKI KODU

### **Początkowy stan (v1.6):**
```
OldCalculatorForm.js:     2299 linii
ItemCard.js:              673 linii (przed pierwszą ekstrakcją)
CustomCurvesSection.js:   130 linii (nieużywany)
CostCalculator.js:        ~1200 linii
Contexts (5 plików):      ~2000 linii
Inne komponenty:          ~5000 linii
──────────────────────────────────
TOTAL:                    ~11,000 linii
```

### **Obecny stan (v1.7 - Phase 5.2 COMPLETE):**
```
OldCalculatorForm.js:     1617 linii (-682, -30%) ✅
  ├─ Fallback usunięty:   -597 linii
  ├─ Unused state:        -85 linii

ItemCard.js:              513 linii (-160, -24%) ✅
  └─ ItemResults extracted

ItemResults.js:           196 linii (NOWY) ✅
utils/curveInterpolation.js: 333 linii (reverseInterpolate dodany) ✅
CustomCurvesSection.js:   130 linii (gotowy do użycia)

TOTAL:                    ~10,200 linii (-800, -7%)
Pliki zoptymalizowane:    3 (-842 linii)
Nowe pliki:               1 (+196 linii)
```

### **Target przyszłej refaktoryzacji (opcjonalny):**
```
OldCalculatorForm.js:     ~850 linii (po ekstrakcji hooks)
  ├─ Orchestration:       ~400 linii
  └─ Pozostałe:           ~450 linii

hooks/useItemCalculations.js: ~850 linii (opcjonalny)
  ├─ calculateItemCost:         ~270 linii
  ├─ calculateMultilayerCost:   ~250 linii
  ├─ calculateHeatshieldCost:   ~170 linii
  └─ Pomocnicze:                ~160 linii

UWAGA: Ekstrakcja funkcji kalkulacji do hooks jest opcjonalna.
Obecny stan (1617 linii) jest akceptowalny i łatwy w utrzymaniu.
```

### **Korzyści dla AI context:**
```
Przed: Czytam OldCalculatorForm (2299 linii) = ~50k tokenów
Po:    Czytam CODE_MAP (500 linii) + relevantny moduł (200-400 linii) = ~10k tokenów

OSZCZĘDNOŚĆ: 80-90% tokenów przy każdym zadaniu!
```

---

## 🎯 PLAN REFAKTORYZACJI

### **✅ COMPLETED:**
- [x] Phase 0-4: Utilities, validators, performance
- [x] Phase 5.1: ItemCard extraction + feature flag (590 linii)
- [x] Phase 5.2: Fallback removal, ItemResults extraction, CODE_MAP.md ✅
  - [x] Backup git tag: v1.6-before-major-refactor
  - [x] Usunąć stary fallback: -597 linii
  - [x] Utworzyć CODE_MAP.md: +531 linii dokumentacji
  - [x] Wyekstrahować ItemResults: -160 linii z ItemCard
  - [x] Dodać reverseInterpolateFromCurve do utils: +67 linii

**REZULTAT Phase 5.2:**
- OldCalculatorForm: 2299 → 1617 linii (-30%)
- ItemCard: 673 → 513 linii (-24%)
- ItemResults: +196 linii (nowy)
- Bundle size: -1.99 kB (zoptymalizowany)
- Build: ✅ Successful (no errors)

### **⏳ TODO (opcjonalne):**
- Phase 6: Ekstrakcja funkcji kalkulacji do hooks (~-850 linii z OldCalculatorForm)
  - **UWAGA:** Nie jest konieczne - obecny stan (1617 linii) jest już dobrze zorganizowany
  - Wymaga ostrożnej refaktoryzacji z pełnymi testami
- Phase 7: E2E tests (Playwright)

---

## 🔄 WORKFLOW DLA AI (CLAUDE)

### **Dla każdego zadania:**

```
1. ✅ PRZECZYTAJ CODE_MAP.md (ten plik)
2. ✅ Znajdź sekcję "Jak modyfikować?" dla Twojego zadania
3. ✅ Przeczytaj TYLKO wskazane pliki/funkcje
4. ✅ Wykonaj zadanie
5. ✅ Zaktualizuj CODE_MAP.md jeśli zmieniłeś strukturę
6. ✅ Zaktualizuj sekcję "Statystyki kodu" jeśli zmieniłeś rozmiary plików
```

### **Przykład workflow:**

**Zadanie:** "Dodaj pole taxRate do kalkulacji"

```
Krok 1: Przeczytaj CODE_MAP.md → sekcja "Dodanie nowego pola do itemu"
Krok 2: Edytuj CalculatorContext.js (initialState)
Krok 3: Edytuj ItemCard.js (UI)
Krok 4: Edytuj OldCalculatorForm.js (calculateItemCost)
Krok 5: Zaktualizuj CODE_MAP.md → dodaj taxRate do dokumentacji
```

---

## 📝 CHANGELOG

| Data | Zmiana | Impact |
|------|--------|--------|
| 2025-12-01 | ItemCard extracted (Phase 5.1) | -590 linii z OldCalculatorForm |
| 2025-12-01 | CustomCurvesSection created | Gotowy do użycia |
| 2025-12-03 | Fallback removed (Phase 5.2) | -597 linii z OldCalculatorForm |
| 2025-12-03 | Unused state removed | -85 linii z OldCalculatorForm |
| 2025-12-03 | ItemResults extracted | -160 linii z ItemCard, +196 nowy plik |
| 2025-12-03 | reverseInterpolateFromCurve added | +67 linii w utils |
| 2025-12-03 | CODE_MAP.md created | +531 linii dokumentacji |
| 2025-12-03 | Build optimized | -1.99 kB bundle size |

---

## 🆘 ROLLBACK

### **Jeśli coś poszło nie tak:**

```bash
# Powrót do v1.6 (ItemCard działa)
git reset --hard v1.6-before-major-refactor

# Rebuild + redeploy
npm run build
firebase deploy --only hosting
```

### **Jeśli ItemCard nie działa:**

```javascript
// featureFlags.js
USE_EXTRACTED_ITEM_CARD: false  // Zmień na false
```

---

## 📚 LINKI

- **Refactor Plan:** [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)
- **Firebase Console:** https://console.firebase.google.com/project/kalkulator-produkcyjny---alpha
- **Hosting URL:** https://kalkulator-produkcyjny---alpha.web.app

---

**Ostatnia aktualizacja:** 2025-12-03
**Wersja:** 1.7
**Phase 5.2:** ✅ COMPLETE
**Następna aktualizacja:** Gdy pojawi się potrzeba dalszych optymalizacji
