import React from 'react';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { OldCalculatorForm } from './OldCalculatorForm';
import { NewCalculatorForm } from './NewCalculatorForm';

/**
 * CalculatorForm Wrapper
 *
 * Pattern: Wrapper Component z Feature Flag
 * Cel: Bezpieczne przełączanie między starą i nową wersją komponentu
 *
 * FAZA 5: Component Refactoring
 * Status: Wrapper zaimplementowany, nowy komponent w budowie
 *
 * Zachowanie:
 * - Jeśli USE_NEW_CALCULATOR_FORM = false → używa OldCalculatorForm (BEZPIECZNE)
 * - Jeśli USE_NEW_CALCULATOR_FORM = true → używa NewCalculatorForm (TESTOWE)
 *
 * Rollback: Zmień flagę na false i odśwież stronę - natychmiastowy powrót do starego kodu
 */
export function CalculatorForm(props) {
  // Feature flag check
  if (FEATURE_FLAGS.USE_NEW_CALCULATOR_FORM) {
    // Nowa zrefaktoryzowana wersja
    if (FEATURE_FLAGS.DEBUG_FEATURE_FLAGS) {
      console.log('[CalculatorForm] Using NEW refactored version');
    }
    return <NewCalculatorForm {...props} />;
  }

  // Stara sprawdzona wersja (domyślna)
  if (FEATURE_FLAGS.DEBUG_FEATURE_FLAGS) {
    console.log('[CalculatorForm] Using OLD version (safe fallback)');
  }
  return <OldCalculatorForm {...props} />;
}

// Re-export dla backward compatibility
export default CalculatorForm;
