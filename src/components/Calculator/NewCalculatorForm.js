import React from 'react';
import { OldCalculatorForm } from './OldCalculatorForm';

/**
 * NewCalculatorForm - Nowa zrefaktoryzowana wersja
 *
 * FAZA 5: Component Refactoring - Work in Progress
 *
 * Status: TYMCZASOWO używa OldCalculatorForm jako fallback
 * Docelowo: Podzielony na małe komponenty atomowe
 *
 * TODO Phase 5:
 * - [ ] Ekstrakcja ItemBasicInfo component
 * - [ ] Ekstrakcja CostSummaryPreview component
 * - [ ] Utworzenie useItemValidation hook
 * - [ ] Refaktoryzacja głównej logiki formularza
 */
export function NewCalculatorForm(props) {
  // TYMCZASOWO: Używamy starego komponentu
  // To pozwala na build bez duplikacji kodu
  // Stopniowo będziemy refaktoryzować
  
  console.log('[NewCalculatorForm] Phase 5 - Currently using OldCalculatorForm as base');
  
  return <OldCalculatorForm {...props} />;
}

export default NewCalculatorForm;
