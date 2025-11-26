/**
 * Walidatory danych wejściowych
 *
 * Używane do walidacji danych przed kalkulacją kosztów.
 * NIE zmieniają istniejącego kodu - będą używane OPCJONALNIE w nowych miejscach.
 *
 * @module utils/validators
 */

export const validators = {
  /**
   * Sprawdza czy wartość jest poprawną liczbą
   * @param {string|number} value - Wartość do sprawdzenia
   * @param {number} min - Minimalna wartość (domyślnie 0)
   * @returns {boolean}
   * @example
   * validators.isValidNumber(10) // true
   * validators.isValidNumber('10.5') // true
   * validators.isValidNumber('abc') // false
   * validators.isValidNumber(-5, 0) // false
   */
  isValidNumber: (value, min = 0) => {
    if (value === '' || value === null || value === undefined) return false;
    const num = parseFloat(value);
    return !isNaN(num) && num >= min;
  },

  /**
   * Sprawdza czy waga jest poprawna
   * @param {string|number} weight - Waga do sprawdzenia
   * @param {string} unit - Jednostka (g, kg)
   * @returns {boolean}
   * @example
   * validators.isValidWeight(500, 'g') // true
   * validators.isValidWeight(0.5, 'kg') // true
   * validators.isValidWeight(-5, 'g') // false
   */
  isValidWeight: (weight, unit = 'g') => {
    if (!validators.isValidNumber(weight, 0)) return false;
    const num = parseFloat(weight);

    // Sprawdź czy wartość ma sens dla jednostki
    if (unit === 'kg' && num > 10000) return false; // Zbyt duża waga w kg
    if (unit === 'g' && num > 10000000) return false; // Zbyt duża waga w gramach

    return true;
  },

  /**
   * Sprawdza czy powierzchnia jest poprawna
   * @param {string|number} area - Powierzchnia do sprawdzenia
   * @param {string} unit - Jednostka (mm2, cm2, m2)
   * @returns {boolean}
   */
  isValidArea: (area, unit = 'mm2') => {
    if (!validators.isValidNumber(area, 0)) return false;
    const num = parseFloat(area);

    // Sprawdź rozsądne limity
    if (unit === 'mm2' && num > 10000000) return false; // 10m² w mm²
    if (unit === 'cm2' && num > 100000) return false; // 10m² w cm²
    if (unit === 'm2' && num > 100) return false; // 100m²

    return true;
  },

  /**
   * Sprawdza czy objętość jest poprawna
   * @param {string|number} volume - Objętość do sprawdzenia
   * @param {string} unit - Jednostka (mm3, cm3, m3)
   * @returns {boolean}
   */
  isValidVolume: (volume, unit = 'mm3') => {
    if (!validators.isValidNumber(volume, 0)) return false;
    const num = parseFloat(volume);

    // Sprawdź rozsądne limity
    if (unit === 'mm3' && num > 1000000000) return false; // 1m³ w mm³
    if (unit === 'cm3' && num > 1000000) return false; // 1m³ w cm³
    if (unit === 'm3' && num > 10) return false; // 10m³

    return true;
  },

  /**
   * Sprawdza czy Part ID jest poprawny
   * @param {string} partId - Part ID do sprawdzenia
   * @returns {boolean}
   */
  isValidPartId: (partId) => {
    if (!partId || typeof partId !== 'string') return false;
    const trimmed = partId.trim();
    return trimmed.length > 0 && trimmed.length <= 100;
  },

  /**
   * Sprawdza czy roczna wielkość produkcji jest poprawna
   * @param {string|number} annualVolume - Roczna wielkość produkcji
   * @returns {boolean}
   */
  isValidAnnualVolume: (annualVolume) => {
    return validators.isValidNumber(annualVolume, 0);
  },

  /**
   * Sprawdza czy efficiency (wydajność) jest poprawna
   * @param {string|number} efficiency - Wydajność (0-100%)
   * @returns {boolean}
   */
  isValidEfficiency: (efficiency) => {
    if (!validators.isValidNumber(efficiency, 0)) return false;
    const num = parseFloat(efficiency);
    return num >= 0 && num <= 100;
  },

  /**
   * Sprawdza czy item jest poprawny w zależności od trybu
   * @param {object} item - Item do walidacji
   * @param {string} mode - Tryb kalkulacji (weight, surface, volume, heatshield, multilayer)
   * @returns {object} { valid: boolean, errors: string[] }
   * @example
   * const result = validators.isValidItem(item, 'weight');
   * if (!result.valid) {
   *   console.log('Errors:', result.errors);
   * }
   */
  isValidItem: (item, mode) => {
    const errors = [];

    // Walidacja wspólnych pól
    if (!validators.isValidPartId(item.partId)) {
      errors.push('Niepoprawny lub brakujący numer części (Part ID)');
    }

    if (!validators.isValidAnnualVolume(item.annualVolume)) {
      errors.push('Niepoprawna roczna wielkość produkcji');
    }

    // Walidacja specyficzna dla trybu
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
        if (item.thickness && !validators.isValidNumber(item.thickness, 0)) {
          errors.push('Niepoprawna grubość');
        }
        if (item.density && !validators.isValidNumber(item.density, 0)) {
          errors.push('Niepoprawna gęstość');
        }
        break;

      case 'volume':
        if (!validators.isValidVolume(item.volume, item.volumeUnit)) {
          errors.push('Niepoprawna objętość');
        }
        break;

      case 'heatshield':
        if (!item.heatshield) {
          errors.push('Brak danych heatshield');
          break;
        }
        if (!validators.isValidArea(item.heatshield.surfaceNetto, item.heatshield.surfaceUnit)) {
          errors.push('Niepoprawna powierzchnia netto (heatshield)');
        }
        break;

      case 'multilayer':
        if (!item.multilayer || !item.multilayer.layers || item.multilayer.layers.length === 0) {
          errors.push('Brak warstw (multilayer)');
          break;
        }
        item.multilayer.layers.forEach((layer, index) => {
          if (!validators.isValidNumber(layer.thickness, 0)) {
            errors.push(`Warstwa ${index + 1}: Niepoprawna grubość`);
          }
          if (!validators.isValidNumber(layer.density, 0)) {
            errors.push(`Warstwa ${index + 1}: Niepoprawna gęstość`);
          }
        });
        break;

      default:
        errors.push(`Nieznany tryb kalkulacji: ${mode}`);
    }

    // Walidacja stanowisk jeśli są
    if (item.workstations && Array.isArray(item.workstations)) {
      item.workstations.forEach((ws, index) => {
        if (ws.efficiency && !validators.isValidEfficiency(ws.efficiency)) {
          errors.push(`Stanowisko ${index + 1}: Niepoprawna wydajność (0-100%)`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanityzuje wartość numeryczną - zawsze zwraca poprawną liczbę
   * @param {string|number} value - Wartość do sanityzacji
   * @param {number} defaultValue - Wartość domyślna jeśli niepoprawna
   * @param {number} min - Minimalna wartość
   * @param {number} max - Maksymalna wartość
   * @returns {number}
   * @example
   * validators.sanitizeNumber('abc', 0) // 0
   * validators.sanitizeNumber('150', 0, 0, 100) // 100
   * validators.sanitizeNumber('-10', 0, 0, 100) // 0
   */
  sanitizeNumber: (value, defaultValue = 0, min = -Infinity, max = Infinity) => {
    const num = parseFloat(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  },

  /**
   * Formatuje wartość numeryczną dla bezpiecznego użycia
   * @param {string|number} value - Wartość do sformatowania
   * @param {number} decimals - Liczba miejsc po przecinku
   * @returns {string}
   */
  formatNumber: (value, decimals = 2) => {
    const num = validators.sanitizeNumber(value, 0);
    return num.toFixed(decimals);
  }
};

export default validators;
