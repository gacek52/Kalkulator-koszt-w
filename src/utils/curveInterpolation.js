/**
 * Utilities dla interpolacji krzywych czasowych
 *
 * Centralna logika interpolacji używana w całej aplikacji.
 * Zapewnia spójność obliczeń dla wszystkich procesów.
 *
 * @module utils/curveInterpolation
 */

/**
 * Interpolacja liniowa między dwoma punktami
 * @param {number} x - Wartość X dla której szukamy Y
 * @param {number} x1 - X pierwszego punktu
 * @param {number} y1 - Y pierwszego punktu
 * @param {number} x2 - X drugiego punktu
 * @param {number} y2 - Y drugiego punktu
 * @returns {number} Interpolowana wartość Y
 * @private
 */
const linearInterpolate = (x, x1, y1, x2, y2) => {
  if (x2 === x1) return y1; // Unikaj dzielenia przez zero
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
};

/**
 * Sortuje punkty krzywej według wartości X
 * @param {Array<{x: number, y: number}>} points - Punkty krzywej
 * @returns {Array<{x: number, y: number}>} Posortowane punkty
 * @private
 */
const sortCurvePoints = (points) => {
  return [...points].sort((a, b) => a.x - b.x);
};

/**
 * Interpoluje wartość z krzywej
 * @param {number} x - Wartość dla której szukamy interpolacji (np. waga części)
 * @param {Array<{x: number, y: number}>} curve - Krzywa (punkty)
 * @param {object} options - Opcje interpolacji
 * @param {string} options.extrapolation - Jak obsłużyć wartości poza zakresem ('extend'|'clamp'|'zero')
 * @returns {number|null} Interpolowana wartość lub null jeśli brak krzywej
 * @example
 * const bakingCurve = [
 *   { x: 0, y: 60 },
 *   { x: 1000, y: 120 },
 *   { x: 5000, y: 180 }
 * ];
 * const time = interpolateFromCurve(2500, bakingCurve); // 150 sekund
 */
export const interpolateFromCurve = (x, curve, options = {}) => {
  const { extrapolation = 'extend' } = options;

  // Walidacja
  if (!curve || !Array.isArray(curve) || curve.length === 0) {
    return null;
  }

  if (curve.length === 1) {
    return curve[0].y;
  }

  // Sortuj punkty według X
  const sortedPoints = sortCurvePoints(curve);

  // Znajdź odpowiedni zakres
  const firstPoint = sortedPoints[0];
  const lastPoint = sortedPoints[sortedPoints.length - 1];

  // Wartość przed pierwszym punktem
  if (x < firstPoint.x) {
    switch (extrapolation) {
      case 'clamp':
        return firstPoint.y;
      case 'zero':
        return 0;
      case 'extend':
      default:
        // Ekstrapoluj liniowo używając pierwszych dwóch punktów
        if (sortedPoints.length >= 2) {
          return linearInterpolate(
            x,
            sortedPoints[0].x,
            sortedPoints[0].y,
            sortedPoints[1].x,
            sortedPoints[1].y
          );
        }
        return firstPoint.y;
    }
  }

  // Wartość po ostatnim punkcie
  if (x > lastPoint.x) {
    switch (extrapolation) {
      case 'clamp':
        return lastPoint.y;
      case 'zero':
        return 0;
      case 'extend':
      default:
        // Ekstrapoluj liniowo używając ostatnich dwóch punktów
        if (sortedPoints.length >= 2) {
          const len = sortedPoints.length;
          return linearInterpolate(
            x,
            sortedPoints[len - 2].x,
            sortedPoints[len - 2].y,
            sortedPoints[len - 1].x,
            sortedPoints[len - 1].y
          );
        }
        return lastPoint.y;
    }
  }

  // Wartość wewnątrz zakresu - interpolacja
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const p1 = sortedPoints[i];
    const p2 = sortedPoints[i + 1];

    if (x >= p1.x && x <= p2.x) {
      return linearInterpolate(x, p1.x, p1.y, p2.x, p2.y);
    }
  }

  // Fallback (nie powinno się zdarzyć)
  return lastPoint.y;
};

/**
 * Odwrotna interpolacja liniowa z krzywej (Y→X) z ekstrapolacją
 * Znajduje wartość X dla podanej wartości Y
 *
 * @param {number} y - Wartość Y dla której szukamy X
 * @param {Array<{x: number, y: number}>} curve - Punkty krzywej
 * @param {object} options - Opcje interpolacji
 * @param {string} options.extrapolation - Jak obsłużyć wartości poza zakresem ('extend'|'clamp'|'zero')
 * @returns {number} Interpolowana wartość X
 * @example
 * const weightFromTime = reverseInterpolateFromCurve(150, bakingCurve); // znajdź wagę dla 150 sek
 */
export const reverseInterpolateFromCurve = (y, curve, options = {}) => {
  const { extrapolation = 'extend' } = options;

  // Walidacja
  if (!curve || !Array.isArray(curve) || curve.length === 0) return 0;
  if (curve.length === 1) return curve[0].x;

  // Sortuj po Y
  const sortedCurve = [...curve].sort((a, b) => a.y - b.y);

  // Ekstrapolacja w dół (przed pierwszym punktem)
  if (y <= sortedCurve[0].y && sortedCurve.length >= 2) {
    if (extrapolation === 'clamp') return sortedCurve[0].x;
    if (extrapolation === 'zero') return 0;

    const y1 = sortedCurve[0].y;
    const x1 = sortedCurve[0].x;
    const y2 = sortedCurve[1].y;
    const x2 = sortedCurve[1].x;
    if (y2 === y1) return x1; // unikaj dzielenia przez zero
    const slope = (x2 - x1) / (y2 - y1);
    return x1 + slope * (y - y1);
  }

  // Ekstrapolacja w górę (po ostatnim punkcie)
  if (y >= sortedCurve[sortedCurve.length - 1].y && sortedCurve.length >= 2) {
    if (extrapolation === 'clamp') return sortedCurve[sortedCurve.length - 1].x;
    if (extrapolation === 'zero') return 0;

    const n = sortedCurve.length;
    const y1 = sortedCurve[n - 2].y;
    const x1 = sortedCurve[n - 2].x;
    const y2 = sortedCurve[n - 1].y;
    const x2 = sortedCurve[n - 1].x;
    if (y2 === y1) return x2; // unikaj dzielenia przez zero
    const slope = (x2 - x1) / (y2 - y1);
    return x2 + slope * (y - y2);
  }

  // Interpolacja (między punktami)
  for (let i = 0; i < sortedCurve.length - 1; i++) {
    if (y >= sortedCurve[i].y && y <= sortedCurve[i + 1].y) {
      const y1 = sortedCurve[i].y;
      const x1 = sortedCurve[i].x;
      const y2 = sortedCurve[i + 1].y;
      const x2 = sortedCurve[i + 1].x;

      if (y2 === y1) return x1; // unikaj dzielenia przez zero
      const t = (y - y1) / (y2 - y1);
      return x1 + t * (x2 - x1);
    }
  }

  return 0;
};

/**
 * Interpoluje wartość z krzywej presetowej
 * @param {number} x - Wartość dla której szukamy interpolacji
 * @param {string} curveType - Typ krzywej ('bakingTime'|'cleaningTime'|'handlingTime')
 * @param {object} presetCurves - Obiekt z krzywymi presetowymi
 * @returns {number|null}
 * @example
 * const time = interpolateFromPreset(1500, 'bakingTime', globalCurves);
 */
export const interpolateFromPreset = (x, curveType, presetCurves) => {
  if (!presetCurves || !presetCurves[curveType]) {
    return null;
  }
  return interpolateFromCurve(x, presetCurves[curveType]);
};

/**
 * Pobiera wartość z krzywej lub użyj custom value
 * @param {number} weight - Waga części
 * @param {string} curveType - Typ krzywej
 * @param {object} item - Item z potencjalnymi custom values
 * @param {object} globalCurves - Globalne krzywe
 * @returns {number|null}
 * @example
 * const time = getValueFromCurveOrCustom(1500, 'bakingTime', item, globalCurves);
 */
export const getValueFromCurveOrCustom = (weight, curveType, item, globalCurves) => {
  // Sprawdź czy item ma custom value dla tego typu
  if (item.customCurveValues && item.customCurveValues[curveType] !== undefined && item.customCurveValues[curveType] !== '') {
    return parseFloat(item.customCurveValues[curveType]);
  }

  // Sprawdź czy item ma custom curve
  if (item.customValues && item.customValues[curveType]) {
    return interpolateFromCurve(weight, item.customValues[curveType]);
  }

  // Użyj globalnej krzywej
  return interpolateFromPreset(weight, curveType, globalCurves);
};

/**
 * Konwertuje krzywe z formatu obiektowego na tablicę punktów
 * @param {object} curveObject - Obiekt z wartościami (np. {0: 60, 1000: 120})
 * @returns {Array<{x: number, y: number}>}
 * @example
 * const curve = convertCurveObjectToArray({ 0: 60, 1000: 120, 5000: 180 });
 * // [{x: 0, y: 60}, {x: 1000, y: 120}, {x: 5000, y: 180}]
 */
export const convertCurveObjectToArray = (curveObject) => {
  if (!curveObject || typeof curveObject !== 'object') {
    return [];
  }

  return Object.entries(curveObject)
    .map(([x, y]) => ({
      x: parseFloat(x),
      y: parseFloat(y)
    }))
    .filter(point => !isNaN(point.x) && !isNaN(point.y));
};

/**
 * Konwertuje tablicę punktów na obiekt
 * @param {Array<{x: number, y: number}>} curveArray - Tablica punktów
 * @returns {object}
 * @example
 * const obj = convertCurveArrayToObject([{x: 0, y: 60}, {x: 1000, y: 120}]);
 * // {0: 60, 1000: 120}
 */
export const convertCurveArrayToObject = (curveArray) => {
  if (!Array.isArray(curveArray)) {
    return {};
  }

  const obj = {};
  curveArray.forEach(point => {
    if (point.x !== undefined && point.y !== undefined) {
      obj[point.x] = point.y;
    }
  });
  return obj;
};

/**
 * Waliduje krzywą - sprawdza czy punkty są poprawne
 * @param {Array<{x: number, y: number}>} curve - Krzywa do walidacji
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateCurve = (curve) => {
  const errors = [];

  if (!Array.isArray(curve)) {
    errors.push('Krzywa musi być tablicą punktów');
    return { valid: false, errors };
  }

  if (curve.length === 0) {
    errors.push('Krzywa musi zawierać przynajmniej jeden punkt');
    return { valid: false, errors };
  }

  curve.forEach((point, index) => {
    if (typeof point.x !== 'number' || isNaN(point.x)) {
      errors.push(`Punkt ${index}: Niepoprawna wartość X`);
    }
    if (typeof point.y !== 'number' || isNaN(point.y)) {
      errors.push(`Punkt ${index}: Niepoprawna wartość Y`);
    }
    if (point.y < 0) {
      errors.push(`Punkt ${index}: Y nie może być ujemne`);
    }
  });

  // Sprawdź duplikaty X
  const xValues = curve.map(p => p.x);
  const uniqueX = new Set(xValues);
  if (xValues.length !== uniqueX.size) {
    errors.push('Krzywa zawiera duplikaty wartości X');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  interpolateFromCurve,
  reverseInterpolateFromCurve,
  interpolateFromPreset,
  getValueFromCurveOrCustom,
  convertCurveObjectToArray,
  convertCurveArrayToObject,
  validateCurve
};
