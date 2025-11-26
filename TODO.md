# Backlog - Planowane Funkcjonalności

## ✅ Zaimplementowane (2025-10-08)

### Faza 1A - Rozszerzone wyszukiwanie
- ✅ Wyszukiwanie po ID kalkulacji
- ✅ Wyszukiwanie po ID części lub nazwie materiału
- ✅ Filtr "Tylko z notatkami" (checkbox)
- ✅ Wizualne oznaczenie notatek (żółta ikona + tooltip)
- ✅ Badge z licznikiem wyników przy przycisku "Filtry"

### Infrastruktura
- ✅ Backend REST API (Express.js)
- ✅ Dwupoziomowa struktura zapisu kalkulacji (catalog.json + calculations/{id}.json)
- ✅ Czytelne ID w formacie RRMMDD-NN (np. 251008-01)
- ✅ Synchronizacja danych między instancjami
- ✅ Lazy loading pełnych kalkulacji

---

## 📋 Do Zrobienia

### Faza 1B - Porównywarka wariantów ✅ (zaimplementowane 2025-11-26)
- ✅ Checkboxy do zaznaczania kalkulacji w katalogu (max 4)
- ✅ Przycisk "Porównaj zaznaczone" (aktywny przy 2-4 zaznaczonych)
- ✅ Modal z tabelą porównawczą:
  - Nazwa kalkulacji / ID
  - Klient, status, właściciel
  - Data modyfikacji
  - Podsumowanie finansowe (obrót EXW/DAP, marża)
  - Różnice procentowe względem bazowej kalkulacji
  - Notatki
- ✅ Eksport porównania do PDF
- ✅ Eksport porównania do Excel

### Faza 2 - Analityka i raporty (priorytet: średni)

#### Raport zużycia materiałów
- [ ] Przycisk "Raport materiałów" dla filtrowanych kalkulacji
- [ ] Sumowanie rocznego zużycia per materiał (annual volume × weight)
- [ ] Grupowanie po typie materiału (HT800, HT1000, itp.)
- [ ] Export do Excel
- [ ] Wizualizacja (wykresy słupkowe)

#### Inteligentne przypomnienia (nieblokujące)
- [ ] Ostrzeżenie: niska marża (<15%)
- [ ] Ostrzeżenie: brak annual volume
- [ ] Ostrzeżenie: niekompletne dane przed wysłaniem
- [ ] Przypomnienie: znacząca zmiana ceny materiału od ostatniej kalkulacji
- [ ] Wszystkie jako żółte banery z możliwością zamknięcia

### Faza 3 - Zaawansowane funkcje (priorytet: niski, planowanie)

#### Historia wersji / Versioning
- [ ] Automatyczne zapisywanie wersji przy każdej edycji
- [ ] Przeglądarka historii zmian
- [ ] Widok "diff" - co się zmieniło między wersjami
- [ ] Przywracanie wcześniejszych wersji
- [ ] Timeline z datami modyfikacji

#### Import danych
- [ ] Import kalkulacji z plików Excel (template do określenia)
- [ ] Import listy części z plikami CAD (automatyczne wyliczanie powierzchni/objętości)
- [ ] Walidacja danych przy imporcie
- [ ] Preview przed importem

#### Authentication & Multi-user (gdy przejście na Firebase)
- [ ] System logowania
- [ ] Role użytkowników (admin, editor, viewer)
- [ ] Komentarze do kalkulacji
- [ ] Przypisywanie kalkulacji do użytkowników
- [ ] Powiadomienia o zmianach
- [ ] Audit log (kto, kiedy, co zmienił)

---

## 🔧 Możliwe ulepszenia techniczne

- [ ] Migracja na Firebase Firestore (zamiast lokalnych JSON)
- [ ] PWA - możliwość pracy offline
- [ ] Automatyczne backupy danych
- [ ] Optymalizacja wydajności dla dużych katalogów (>1000 kalkulacji)
- [ ] Testy jednostkowe (Jest)
- [ ] E2E testy (Playwright)

---

## 💡 Pomysły do rozważenia

- Szablony kalkulacji (zapisywanie często używanych konfiguracji materiałów)
- Dashboard ze statystykami (top klienci, średnia marża, trendy)
- Integracja z systemem CRM
- Automatyczne generowanie ofert PDF z logo firmy
- Kalkulator kosztów pakowania (bardziej zaawansowany)
- Multi-język (EN/PL/DE)

---

**Ostatnia aktualizacja:** 2025-11-26
**Następny krok:** Faza 2 - Analityka i raporty
