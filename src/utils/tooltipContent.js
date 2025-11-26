/**
 * Centralized tooltip content for the application
 *
 * Contains help text for complex fields and features
 */

export const TOOLTIP_CONTENT = {
  // Calculator fields
  QUANTITY: 'Ilość sztuk do wyprodukowania. Większa ilość zwykle oznacza niższy koszt jednostkowy.',

  PACKAGING: 'Wybierz rodzaj opakowania dla produktu. Wpływa na koszty materiałowe i transport.',

  TRANSPORT: 'Typ transportu wpływa na koszty i czas dostawy. Kurierzy są szybsi, ale drożsi.',

  MARGIN: 'Marża procentowa dodawana do kosztów produkcji. Standardowo 10-30%.',

  WORKING_HOURS: 'Szacowany czas pracy w godzinach. Używany do obliczenia kosztów robocizny.',

  MATERIAL_WASTE: 'Procent marnotrawstwa materiału (np. 5% oznacza, że 5% materiału będzie zmarnowane).',

  SETUP_TIME: 'Czas przygotowania maszyny/stanowiska przed rozpoczęciem produkcji.',

  CYCLE_TIME: 'Czas potrzebny na wyprodukowanie jednej sztuki produktu.',

  PRODUCTION_CURVE: 'Krzywa uczenia się - jak efektywność wzrasta wraz z liczbą wyprodukowanych sztuk.',

  LABOR_COST: 'Koszt godziny pracy pracownika. Może się różnić w zależności od stanowiska.',

  OVERHEAD_COSTS: 'Koszty ogólne (wynajem, prąd, woda itp.) rozkładane na produkty.',

  CLIENT_DISCOUNT: 'Zniżka dla klienta wyrażona w procentach. 0% = brak zniżki.',

  PAYMENT_TERMS: 'Warunki płatności wpływają na ostateczną cenę (np. płatność z góry może dać zniżkę).',

  TAX_RATE: 'Stawka VAT lub podatku obowiązująca dla tego produktu.',

  // Item management
  ADD_ITEM: 'Dodaj nowy element do kalkulacji. Możesz wybrać materiały, komponenty lub usługi.',

  REMOVE_ITEM: 'Usuń element z kalkulacji. Zmiana nie będzie widoczna dopóki nie zapiszesz.',

  DUPLICATE_ITEM: 'Skopiuj element wraz ze wszystkimi ustawieniami.',

  // Catalog
  SAVE_TO_CATALOG: 'Zapisz bieżącą kalkulację do katalogu, aby móc do niej wrócić później.',

  LOAD_FROM_CATALOG: 'Wczytaj zapisaną wcześniej kalkulację z katalogu.',

  // Export/Import
  EXPORT_JSON: 'Eksportuj kalkulację do pliku JSON. Możesz go zaimportować później lub udostępnić innym.',

  IMPORT_JSON: 'Importuj kalkulację z pliku JSON. Nadpisze bieżącą kalkulację.',

  EXPORT_PDF: 'Generuj profesjonalny raport PDF z podsumowaniem kalkulacji.',

  // Advanced features
  BATCH_CALCULATION: 'Oblicz koszty dla wielu różnych ilości jednocześnie.',

  COMPARE_VARIANTS: 'Porównaj różne warianty kalkulacji obok siebie.',

  CURRENCY_CONVERSION: 'Przelicz ceny na inną walutę używając aktualnego kursu.',
};

export default TOOLTIP_CONTENT;
