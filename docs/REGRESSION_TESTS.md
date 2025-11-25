# CHECKLIST TESTÓW REGRESJI

**Wersja:** 1.0
**Data utworzenia:** 2025-11-25
**Przeznaczenie:** Testy manualne do wykonania po każdej fazie refaktoryzacji

---

## 📋 PODSTAWOWE TESTY (wykonywać po każdej zmianie)

### 1. Logowanie i autoryzacja
```
□ Logowanie jako super-admin (gacek52@gmail.com)
□ Logowanie jako admin
□ Logowanie jako user
□ Logowanie jako guest
□ Wylogowanie działa poprawnie
□ Sesja jest zachowana po odświeżeniu strony
```

### 2. Tworzenie nowej kalkulacji

#### Weight Mode
```
□ Utworzenie nowej kalkulacji w trybie "Weight"
□ Dodanie pozycji z wagą (np. 500g)
□ Wprowadzenie Part ID i opisu
□ Wprowadzenie rocznej wielkości produkcji
□ Wybór materiału z listy
□ Wprowadzenie stanowiska produkcyjnego
□ Kalkulacja kosztów wyświetla się poprawnie
□ Zapis kalkulacji działa
□ Nazwa kalkulacji jest edytowalna
```

#### Surface Mode
```
□ Utworzenie nowej kalkulacji w trybie "Surface"
□ Dodanie pozycji z powierzchnią (np. 10000 mm²)
□ Wprowadzenie grubości i gęstości
□ Kalkulacja wagi z powierzchni działa
□ Wprowadzenie wymiarów arkusza (length/width)
□ Kalkulacja parts per sheet działa
□ Wszystkie wyniki wyświetlają się poprawnie
```

#### Volume Mode
```
□ Utworzenie nowej kalkulacji w trybie "Volume"
□ Dodanie pozycji z objętością (np. 50000 mm³)
□ Wprowadzenie wymiarów (length × width × height)
□ Kalkulacja objętości z wymiarów działa
□ Wybór opcji "brutto-auto" / "netto"
□ Wszystkie wyniki wyświetlają się poprawnie
```

#### Heatshield Mode
```
□ Utworzenie nowej kalkulacji w trybie "Heatshield"
□ Dodanie pozycji heatshield
□ Wprowadzenie powierzchni netto
□ Wprowadzenie parametrów blachy (grubość, gęstość, cena)
□ Wprowadzenie parametrów maty (grubość, gęstość, cena)
□ Wprowadzenie kosztów gięcia/łączenia
□ Kalkulacja kosztów blachy i maty działa
□ Wszystkie wyniki wyświetlają się poprawnie
```

#### Multilayer Mode
```
□ Utworzenie nowej kalkulacji w trybie "Multilayer"
□ Dodanie pozycji multilayer
□ Dodanie pierwszej warstwy (grubość, gęstość, cena)
□ Dodanie drugiej warstwy
□ Dodanie trzeciej warstwy
□ Usunięcie warstwy działa
□ Kalkulacja kosztów dla wszystkich warstw działa
□ Wszystkie wyniki wyświetlają się poprawnie
```

---

## 📋 ZAAWANSOWANE FUNKCJE

### 3. Zakładki (Tabs)
```
□ Dodanie nowej zakładki działa
□ Zmiana nazwy zakładki działa
□ Przełączanie między zakładkami działa
□ Usunięcie zakładki z confirmem działa
□ Duplikacja zakładki działa (jeśli jest funkcja)
```

### 4. Pozycje (Items)
```
□ Dodanie nowej pozycji w zakładce działa
□ Duplikacja pozycji działa
□ Usunięcie pozycji działa
□ Edycja Part ID i opisu działa
□ Zmiana rocznej wielkości produkcji przelicza koszty
```

### 5. Volume Forecast Calendar
```
□ Zaznaczenie checkboxa "Kalendarz prognoz wolumenu"
□ Wprowadzenie wolumenów dla poszczególnych lat
□ Wolumeny są zapisywane
□ Wyniki kalkulacji uwzględniają prognozy
□ Odznaczenie checkboxa ukrywa kalendarz
```

### 6. Stanowiska produkcyjne
```
□ Wybór stanowiska z listy
□ Wprowadzenie efficiency (%)
□ Dodanie drugiego stanowiska (Multiple workstations)
□ Usunięcie stanowiska działa
□ Przełączanie między auto/manual cost
□ Manual cost override działa
□ Koszt pracy jest prawidłowo liczony
```

### 7. Krzywe czasowe (Curves)
```
□ Otwarcie panelu Settings
□ Zmiana wartości krzywej (Baking time)
□ Zmiana wartości krzywej (Cleaning time)
□ Zmiana wartości krzywej (Handling time)
□ Interpolacja liniowa działa poprawnie
□ Custom curves dla poszczególnych itemów
□ Scope: Global vs Custom przełączanie działa
```

### 8. Pakowanie (Packaging)
```
□ Wprowadzenie parts per layer
□ Wprowadzenie liczby layers
□ Automatyczna kalkulacja parts in box
□ Manual override parts in box
□ Wybór kompozycji pakowania z listy
□ Custom price dla pakowania
□ Koszt pakowania wyświetla się w wynikach
```

### 9. Transport
```
□ Wybór klienta z listy
□ Automatyczne wypełnienie dystansu
□ Manual override dystansu
□ Wybór source: distance vs pallet
□ Kalkulacja kosztu transportu na dystans
□ Kalkulacja kosztu transportu na paletę
□ Manual price per pallet override
□ Koszt transportu wyświetla się w wynikach
```

### 10. Marża (Margin)
```
□ Global SG&A wprowadzenie (np. 12%)
□ Item-specific margin override
□ Kalkulacja EXW (Ex Works)
□ Kalkulacja DAP (Delivered At Place)
□ Wszystkie ceny finalne są poprawne
```

---

## 📋 KATALOG I ZARZĄDZANIE

### 11. Katalog kalkulacji
```
□ Zapisana kalkulacja pojawia się w katalogu
□ Wyszukiwanie po nazwie działa
□ Filtrowanie po typie materiału działa
□ Filtrowanie po kliencie działa
□ Sortowanie po dacie działa
□ Sortowanie po nazwie działa
□ Kliknięcie na kalkulację wczytuje ją
□ Edycja nazwy w katalogu działa
□ Duplikacja kalkulacji działa
□ Usunięcie kalkulacji działa (z confirmem)
```

### 12. Export
```
□ Export do PDF (Quotation) działa
□ Export do PDF (Detailed Quotation) działa
□ Export do PDF (PDS - Packing Data Sheet) działa
□ Export do Excel (Interactive) działa
□ Export do JSON działa
□ Exported files są poprawne i otwierają się
```

### 13. Import
```
□ Import CBD z pliku .xlsx działa
□ Import CBD z pliku .xlsm działa
□ Pending Pool wyświetla zaimportowane pozycje
□ Assign pojedynczej pozycji do zakładki
□ Bulk assign wielu pozycji (zaznacz 3+)
□ Duplicate pending item działa
□ Usunięcie pending item działa
□ Volume forecast z CBD jest automatycznie włączony
```

### 14. Client Manual
```
□ Przycisk "Client Manual" widoczny (dla uprawnionych)
□ Przycisk ustawień (zębatka) widoczny dla edycji
□ Dodanie nowego manual dla klienta
□ Edycja labor cost i machine cost
□ Dodanie materiału do manuala
□ Edycja ceny materiału
□ Dodanie marży standardowej
□ Edycja marży standardowej
□ Usunięcie materiału/marży działa
□ Zapisane dane są widoczne po odświeżeniu
```

---

## 📋 ZARZĄDZANIE DANYMI

### 15. Materiały
```
□ Dodanie nowego materiału
□ Edycja nazwy materiału
□ Edycja ceny za kg
□ Edycja gęstości
□ Sync z zewnętrznym źródłem (jeśli skonfigurowane)
□ Usunięcie materiału działa (z confirmem)
□ Materiał pojawia się na liście w kalkulacjach
```

### 16. Pakowanie (Manager)
```
□ Dodanie nowej kompozycji pakowania
□ Edycja elementów pakowania (box, layer pad, etc.)
□ Edycja cen elementów
□ Edycja wymiarów pudełka
□ Usunięcie kompozycji działa
□ Kompozycja pojawia się na liście w kalkulacjach
```

### 17. Stanowiska (Manager)
```
□ Dodanie nowego stanowiska
□ Edycja nazwy stanowiska
□ Edycja kosztu pracy (€/h)
□ Edycja kosztu maszyny (€/h)
□ Usunięcie stanowiska działa
□ Stanowisko pojawia się na liście w kalkulacjach
```

### 18. Stanowiska - Capacity Dashboard
```
□ Dashboard wyświetla wszystkie stanowiska
□ Filtrowanie po stanowisku działa
□ Filtrowanie po kliencie działa
□ Filtrowanie po dacie działa
□ Wyświetlanie zajętości (%) dla stanowisk
□ Edycja assignments działa
□ Wykresy capacity load wyświetlają się poprawnie
□ Export capacity report działa
```

### 19. Transport (Manager)
```
□ Dodanie nowej reguły transportu
□ Edycja dystansu vs ceny za paletę
□ Edycja reguł dla range dystansów
□ Usunięcie reguły transportu działa
□ Reguły są stosowane w kalkulacjach
```

### 20. Klienci
```
□ Dodanie nowego klienta
□ Edycja nazwy, adresu, miasta
□ Edycja dystansu z fabryki
□ Zapisane dane są widoczne po odświeżeniu
□ Usunięcie klienta działa
□ Klient pojawia się na liście w kalkulacjach
```

---

## 📋 UPRAWNIENIA (Role-Based Access)

### 21. Super-Admin
```
□ Widzi wszystkie kalkulacje
□ Może edytować wszystkie kalkulacje
□ Może usuwać wszystkie kalkulacje
□ Widzi zarządzanie użytkownikami
□ Widzi zarządzanie rolami
□ Może edytować uprawnienia
□ Ma dostęp do wszystkich managerów
```

### 22. Admin
```
□ Widzi wszystkie kalkulacje
□ Może edytować wszystkie kalkulacje
□ Może usuwać wszystkie kalkulacje
□ Widzi zarządzanie użytkownikami
□ NIE widzi zarządzania rolami
□ Ma dostęp do wszystkich managerów
```

### 23. User
```
□ Widzi TYLKO własne kalkulacje
□ Może edytować TYLKO własne kalkulacje
□ Może usuwać TYLKO własne kalkulacje
□ NIE widzi zarządzania użytkownikami
□ NIE widzi zarządzania rolami
□ Ma dostęp tylko do odczytu dla managerów
```

### 24. Guest
```
□ Widzi TYLKO własne kalkulacje (read-only)
□ NIE może edytować kalkulacji
□ NIE może usuwać kalkulacji
□ NIE widzi zarządzania użytkownikami
□ NIE widzi zarządzania rolami
□ Ma dostęp tylko do odczytu dla danych
```

---

## 📋 UI/UX

### 25. Responsywność i wydajność
```
□ Aplikacja działa płynnie na Chrome
□ Aplikacja działa płynnie na Firefox
□ Aplikacja działa płynnie na Edge
□ Brak lagów przy wprowadzaniu danych
□ Duże kalkulacje (20+ pozycji) działają płynnie
□ Scrolling jest płynny
□ Dark mode przełączanie działa
□ Light mode przełączanie działa
□ Kolory są czytelne w obu trybach
```

### 26. Zapisywanie i sesje
```
□ Auto-save działa (wskaźnik "Saving...")
□ Wskaźnik "Saved" pojawia się po zapisie
□ Odświeżenie strony przywraca sesję
□ Zamknięcie i otwarcie przywraca sesję
□ Prompt "Unsaved changes" pojawia się gdy trzeba
```

---

## 📋 EDGE CASES I BŁĘDY

### 27. Walidacja i edge cases
```
□ Puste pola numeryczne nie powodują crashy
□ Bardzo duże liczby (999999999) działają
□ Bardzo małe liczby (0.00001) działają
□ Ujemne liczby są odrzucane/obsługiwane
□ Znaki specjalne w Part ID działają (!@#$%^&*)
□ Bardzo długie opisy (500+ znaków) działają
□ Import CBD z pustymi polami działa
□ Import CBD z nieprawidłową strukturą pokazuje błąd
```

### 28. Obsługa błędów
```
□ Brak internetu pokazuje komunikat
□ Błąd API pokazuje user-friendly message
□ Timeout przy zapisie pokazuje retry option
□ Nieautoryzowany dostęp pokazuje redirect do loginu
□ 403 Forbidden pokazuje komunikat o brakujących uprawnieniach
□ 404 Not Found pokazuje komunikat o brakującym zasobie
```

---

## ✅ PODSUMOWANIE TESTÓW

**Data wykonania:** ___________
**Tester:** ___________
**Faza:** ___________
**Branch:** ___________

**Wyniki:**
- Testy przeszły: _____ / _____
- Testy nie przeszły: _____
- Błędy krytyczne: _____
- Błędy średnie: _____
- Błędy kosmetyczne: _____

**Komentarze:**
```
[Tutaj opisz znalezione problemy i uwagi]
```

**Decyzja:**
- [ ] ✅ Wszystko OK - można wdrażać na produkcję
- [ ] ⚠️ Drobne problemy - można wdrażać z monitowaniem
- [ ] ❌ Poważne problemy - wymaga poprawek przed wdrożeniem

---

**Ostatnia aktualizacja:** 2025-11-25
