# Kalkulator Kosztów Produkcyjnych

Kompletna aplikacja React do kalkulacji kosztów produkcyjnych z funkcją zapisu i wczytywania obliczeń.

## 🚀 Szybkie uruchomienie

### Wymagania
- **Node.js** (wersja 14 lub nowsza) - [Pobierz tutaj](https://nodejs.org/)
- **npm** (instaluje się razem z Node.js)

### Instalacja i uruchomienie

1. **Otwórz terminal/command prompt** w folderze `cost-calculator-app`

2. **Zainstaluj zależności:**
   ```bash
   npm install
   ```

3. **Uruchom aplikację:**
   ```bash
   npm start
   ```

4. **Otwórz przeglądarkę** na adresie: `http://localhost:3000`

### Alternatywnie - użyj skryptów Windows

**Kliknij dwa razy** na plik `URUCHOM.bat` - automatycznie zainstaluje zależności i uruchomi aplikację.

## 📊 Funkcjonalności

### ✅ Kalkulacje kosztów
- **Materiały** - koszt €/kg z automatycznym przelicznikiem wagi brutto/netto
- **Pieczenie** - automatyczne skalowanie czasów na podstawie krzywych
- **Czyszczenie** - skalowanie lub ręczne ustawianie czasów
- **Koszty obsługi** - stały koszt €/szt
- **Procesy niestandardowe** - €/szt, €/kg, €/8h
- **Marża i SG&A** - procentowe naddatki

### 📁 Zarządzanie danymi
- **Zakładki materiałowe** - różne materiały z własnymi parametrami
- **Zapisywanie obliczeń** - z opisem i datą
- **Historia obliczeń** - lista wszystkich zapisanych kalkulacji
- **Export do CSV** - eksport danych do Excela

### 🎯 Interfejs użytkownika
- **Tooltips z rozpisem** - szczegółowy rozkład kosztów (hover + pin)
- **Dark mode** - jasny/ciemny motyw
- **Responsywność** - działa na telefonach i tabletach
- **Sortowanie** - tabele z sortowaniem kolumn

## 🔧 Komendy

```bash
# Uruchomienie w trybie rozwoju
npm start

# Zbudowanie aplikacji do wdrożenia
npm run build

# Uruchomienie testów
npm test

# Eject (zaawansowane - nie zalecane)
npm run eject
```

## 📱 Wsparcie przeglądarek

- ✅ Chrome (zalecane)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer nie jest wspierany

## 🎨 Personalizacja

### Zmiana domyślnych parametrów
Edytuj plik `src/components/CostCalculator.js`:

```javascript
// Linia ~46-49 - domyślne parametry zakładki
materialCost: '2.0',      // €/kg
bakingCost: '110',        // €/8h
cleaningCost: '90',       // €/8h
handlingCost: '0.08',     // €/szt

// Linia ~8 - domyślne SG&A
const [globalSGA, setGlobalSGA] = useState('15'); // %
```

### Zmiana krzywych skalowania
Edytuj tablice `defaultBakingScale` i `defaultCleaningScale` w pliku głównym.

## 🐛 Rozwiązywanie problemów

### Aplikacja nie uruchamia się
1. Sprawdź czy masz zainstalowane Node.js: `node --version`
2. Usuń folder `node_modules` i plik `package-lock.json`
3. Ponownie uruchom: `npm install && npm start`

### Błędy podczas instalacji
- Uruchom terminal jako Administrator
- Sprawdź połączenie internetowe
- Spróbuj: `npm install --force`

### Port 3000 zajęty
Aplikacja uruchomi się automatycznie na innym porcie (np. 3001).

## 📝 Struktura projektu

```
cost-calculator-app/
├── public/
│   ├── index.html          # Główny plik HTML
│   └── manifest.json       # Konfiguracja PWA
├── src/
│   ├── components/
│   │   └── CostCalculator.js  # Główny komponent
│   ├── index.js            # Punkt wejściowy
│   ├── index.css           # Style globalne
│   └── App.js              # Komponent główny
├── package.json            # Zależności i skrypty
└── README.md              # Ta dokumentacja
```

## 🔒 Bezpieczeństwo

- Wszystkie dane są przechowywane lokalnie w przeglądarce
- Brak wysyłania danych do zewnętrznych serwerów
- Export CSV dzieje się lokalnie w przeglądarce

## ⚡ Performance

- Aplikacja używa React 18 z optymalizacjami
- Tailwind CSS ładowane z CDN dla szybkości
- Minimalna ilość zależności zewnętrznych

## 🆘 Wsparcie

Jeśli masz problemy z aplikacją:

1. Sprawdź konsolę przeglądarki (F12)
2. Sprawdź czy wszystkie pliki są na miejscu
3. Zrestartuj serwer deweloperski

---

## 🚀 Deployment (opcjonalne)

Aby zbudować aplikację do wdrożenia na serwerze:

```bash
npm run build
```

Utworzy się folder `build/` z gotową aplikacją do wgrania na hosting.# Kalkulator-koszt-w
