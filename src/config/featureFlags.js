/**
 * Feature Flags - Kontrola włączania nowych funkcji
 *
 * Ten plik pozwala na stopniowe włączanie nowych funkcjonalności
 * bez ryzyka dla istniejących kalkulacji.
 *
 * WAŻNE: Gdy flaga = false, używany jest STARY KOD (bezpieczny fallback)
 *        Gdy flaga = true, używany jest NOWY KOD (z utilities)
 *
 * @module config/featureFlags
 */

/**
 * Feature Flags Configuration
 *
 * Zmiana flag w tym pliku pozwala na natychmiastowe włączenie/wyłączenie
 * nowych funkcjonalności bez rebuildu (wystarczy odświeżyć stronę).
 */
export const FEATURE_FLAGS = {
  /**
   * Użyj nowego itemFactory do tworzenia items/tabs
   * Gdy false: Używa starego inline kodu (100+ linii)
   * Gdy true: Używa createDefaultItem() / createDefaultTab()
   *
   * STATUS: ✅ ENABLED for testing (2025-11-26)
   */
  USE_NEW_ITEM_FACTORY: true,

  /**
   * Użyj nowych walidatorów
   * Gdy false: Brak walidacji lub stara walidacja
   * Gdy true: Używa validators.js
   */
  USE_NEW_VALIDATORS: false,

  /**
   * Użyj nowej interpolacji krzywych
   * Gdy false: Używa starego kodu interpolacji
   * Gdy true: Używa curveInterpolation.js
   */
  USE_NEW_CURVE_INTERPOLATION: false,

  /**
   * Użyj nowych formattersów
   * Gdy false: Używa inline formatowania
   * Gdy true: Używa formatters.js
   */
  USE_NEW_FORMATTERS: false,

  /**
   * Użyj nowego zrefaktoryzowanego CalculatorForm
   * Gdy false: Używa OldCalculatorForm (duży monolith, ~2000 linii)
   * Gdy true: Używa NewCalculatorForm (modularny, komponenty atomowe)
   *
   * STATUS: 🔴 FAZA 5 - W IMPLEMENTACJI (2025-11-28)
   * DOMYŚLNIE WYŁĄCZONE dla bezpieczeństwa produkcji
   */
  USE_NEW_CALCULATOR_FORM: false,

  /**
   * Debug mode - pokazuje w konsoli która wersja kodu jest używana
   */
  DEBUG_FEATURE_FLAGS: true
};

/**
 * Helper do sprawdzania czy feature jest włączony
 * @param {string} featureName - Nazwa feature flagi
 * @returns {boolean}
 */
export const isFeatureEnabled = (featureName) => {
  const enabled = FEATURE_FLAGS[featureName] === true;

  if (FEATURE_FLAGS.DEBUG_FEATURE_FLAGS) {
    console.log(`[FeatureFlag] ${featureName}: ${enabled ? '✅ ENABLED (NEW CODE)' : '❌ DISABLED (OLD CODE)'}`);
  }

  return enabled;
};

/**
 * Helper do logowania użycia feature
 * @param {string} featureName - Nazwa feature
 * @param {string} location - Gdzie jest używany (nazwa funkcji/komponentu)
 */
export const logFeatureUsage = (featureName, location) => {
  if (FEATURE_FLAGS.DEBUG_FEATURE_FLAGS) {
    const enabled = FEATURE_FLAGS[featureName];
    console.log(
      `[FeatureFlag] ${location} using ${featureName}: ${enabled ? 'NEW' : 'OLD'} code`
    );
  }
};

/**
 * Włącza wszystkie flagi (tylko do testowania!)
 * NIE używać na produkcji bez testów
 */
export const enableAllFeatures = () => {
  Object.keys(FEATURE_FLAGS).forEach(key => {
    if (key !== 'DEBUG_FEATURE_FLAGS') {
      FEATURE_FLAGS[key] = true;
    }
  });
  console.warn('⚠️ All feature flags ENABLED - for testing only!');
};

/**
 * Wyłącza wszystkie flagi (bezpieczny fallback)
 */
export const disableAllFeatures = () => {
  Object.keys(FEATURE_FLAGS).forEach(key => {
    if (key !== 'DEBUG_FEATURE_FLAGS') {
      FEATURE_FLAGS[key] = false;
    }
  });
  console.log('✅ All feature flags DISABLED - using old code (safe)');
};

/**
 * Pobiera status wszystkich flag (do debugowania)
 */
export const getFeatureFlagsStatus = () => {
  return { ...FEATURE_FLAGS };
};

// Export dla backward compatibility
export default FEATURE_FLAGS;
