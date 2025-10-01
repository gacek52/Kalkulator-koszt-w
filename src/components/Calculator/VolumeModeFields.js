import React, { useEffect } from 'react';

/**
 * Pola wejściowe dla trybu kalkulacji OBJĘTOŚĆ
 */
export function VolumeModeFields({ item, onUpdate, bruttoCurve, themeClasses, darkMode }) {

  // Interpolacja liniowa z krzywej (dla wagi brutto)
  const interpolateFromCurve = (x, curve) => {
    if (!curve || curve.length === 0) return x; // jeśli brak krzywej, zwróć netto

    const sortedCurve = [...curve].sort((a, b) => a.x - b.x);

    // Ekstrapolacja w lewo
    if (x <= sortedCurve[0].x && sortedCurve.length >= 2) {
      const x1 = sortedCurve[0].x;
      const y1 = sortedCurve[0].y;
      const x2 = sortedCurve[1].x;
      const y2 = sortedCurve[1].y;
      const slope = (y2 - y1) / (x2 - x1);
      return y1 + slope * (x - x1);
    }

    // Ekstrapolacja w prawo
    if (x >= sortedCurve[sortedCurve.length - 1].x && sortedCurve.length >= 2) {
      const n = sortedCurve.length;
      const x1 = sortedCurve[n - 2].x;
      const y1 = sortedCurve[n - 2].y;
      const x2 = sortedCurve[n - 1].x;
      const y2 = sortedCurve[n - 1].y;
      const slope = (y2 - y1) / (x2 - x1);
      return y2 + slope * (x - x2);
    }

    // Interpolacja między punktami
    for (let i = 0; i < sortedCurve.length - 1; i++) {
      if (x >= sortedCurve[i].x && x <= sortedCurve[i + 1].x) {
        const x1 = sortedCurve[i].x;
        const y1 = sortedCurve[i].y;
        const x2 = sortedCurve[i + 1].x;
        const y2 = sortedCurve[i + 1].y;

        const t = (x - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
      }
    }

    return x; // fallback
  };

  // Auto-obliczanie objętości z wymiarów i wagi
  useEffect(() => {
    const length = parseFloat(item.dimensions.length) || 0;
    const width = parseFloat(item.dimensions.width) || 0;
    const height = parseFloat(item.dimensions.height) || 0;
    const volume = parseFloat(item.volume) || 0;
    const density = parseFloat(item.density) || 0;

    let updates = {};

    // Oblicz objętość z wymiarów (jeśli podane)
    if (length > 0 && width > 0 && height > 0) {
      let calculatedVolume = length * width * height; // mm³

      // Przelicz na wybraną jednostkę
      if (item.volumeUnit === 'cm3') {
        calculatedVolume = calculatedVolume / 1000; // mm³ -> cm³
      } else if (item.volumeUnit === 'm3') {
        calculatedVolume = calculatedVolume / 1000000000; // mm³ -> m³
      }

      updates.volume = calculatedVolume.toFixed(6);
    }

    // Przelicz objętość na cm³ dla obliczania wagi
    let volumeCm3 = 0;
    const finalVolume = parseFloat(updates.volume || item.volume) || 0;

    if (finalVolume > 0) {
      if (item.volumeUnit === 'mm3') {
        volumeCm3 = finalVolume / 1000;
      } else if (item.volumeUnit === 'cm3') {
        volumeCm3 = finalVolume;
      } else if (item.volumeUnit === 'm3') {
        volumeCm3 = finalVolume * 1000000;
      }
    }

    // Oblicz wagę netto z objętości i gęstości
    if (volumeCm3 > 0 && density > 0) {
      const weightNetto = volumeCm3 * density; // cm³ × g/cm³ = g
      updates.weight = weightNetto.toFixed(1);

      // Oblicz wagę brutto z krzywej (jak w trybie waga)
      if (bruttoCurve && weightNetto > 0) {
        const weightBrutto = interpolateFromCurve(weightNetto, bruttoCurve);
        updates.bruttoWeight = weightBrutto.toFixed(1);
      }
    }

    // Aktualizuj tylko jeśli są zmiany
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    item.dimensions.length,
    item.dimensions.width,
    item.dimensions.height,
    item.volume,
    item.volumeUnit,
    item.density
  ]);

  return (
    <div className="space-y-4">
      {/* Wymiary (opcjonalne - dla auto-obliczania objętości) */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-xs font-medium mb-2">
          📐 Wymiary (opcjonalne - auto-oblicza objętość)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Długość [mm]
            </label>
            <input
              type="number"
              value={item.dimensions.length}
              onChange={(e) => onUpdate({
                dimensions: { ...item.dimensions, length: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Szerokość [mm]
            </label>
            <input
              type="number"
              value={item.dimensions.width}
              onChange={(e) => onUpdate({
                dimensions: { ...item.dimensions, width: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Wysokość [mm]
            </label>
            <input
              type="number"
              value={item.dimensions.height}
              onChange={(e) => onUpdate({
                dimensions: { ...item.dimensions, height: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Objętość */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs ${themeClasses.text.secondary}`}>
            Objętość
          </label>
          <input
            type="number"
            value={item.volume}
            onChange={(e) => onUpdate({ volume: e.target.value })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
            placeholder="0"
            step="0.000001"
          />
        </div>
        <div>
          <label className={`block text-xs ${themeClasses.text.secondary}`}>
            Jednostka
          </label>
          <select
            value={item.volumeUnit}
            onChange={(e) => onUpdate({ volumeUnit: e.target.value })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
          >
            <option value="mm3">mm³</option>
            <option value="cm3">cm³</option>
            <option value="m3">m³</option>
          </select>
        </div>
      </div>

      {/* Gęstość */}
      <div>
        <label className={`block text-xs ${themeClasses.text.secondary}`}>
          Gęstość materiału [g/cm³]
        </label>
        <input
          type="number"
          value={item.density}
          onChange={(e) => onUpdate({ density: e.target.value })}
          className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
          placeholder="0"
          step="0.001"
        />
      </div>

      {/* Wyniki obliczeń */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
        <div className="text-xs font-medium mb-2">📊 Obliczone wartości:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Waga netto:</span>
            <span className="font-medium">{item.weight ? `${parseFloat(item.weight).toFixed(1)} g` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Waga brutto:</span>
            <span className="font-medium">{item.bruttoWeight ? `${parseFloat(item.bruttoWeight).toFixed(1)} g` : '-'}</span>
          </div>
        </div>
      </div>

      {/* Informacja o wyliczaniu brutto */}
      <div className={`p-2 rounded text-xs ${darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
        💡 Waga brutto jest obliczana automatycznie z krzywej (podobnie jak w trybie waga)
      </div>
    </div>
  );
}
