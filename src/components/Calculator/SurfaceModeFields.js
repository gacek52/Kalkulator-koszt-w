import React, { useEffect } from 'react';

/**
 * Pola wejściowe dla trybu kalkulacji POWIERZCHNIA
 * Implementuje "trójkąt zależności" - auto-obliczanie wartości
 */
export function SurfaceModeFields({ item, onUpdate, themeClasses, darkMode }) {

  // Auto-obliczanie w trójkącie zależności
  useEffect(() => {
    const surfaceArea = parseFloat(item.surfaceArea) || 0;
    const thickness = parseFloat(item.thickness) || 0;
    const density = parseFloat(item.density) || 0;
    const surfaceWeight = parseFloat(item.surfaceWeight) || 0;
    const sheetLength = parseFloat(item.sheetLength) || 0;
    const sheetWidth = parseFloat(item.sheetWidth) || 0;
    const partsPerSheet = parseFloat(item.partsPerSheet) || 0;

    let updates = {};

    // Przelicz powierzchnię na m²
    let surfaceAreaM2 = 0;
    if (item.surfaceUnit === 'mm2') {
      surfaceAreaM2 = surfaceArea / 1000000;
    } else {
      surfaceAreaM2 = surfaceArea;
    }

    // Trójkąt zależności: gęstość ↔ grubość ↔ ciężar powierzchniowy
    // Jeśli mamy gęstość i grubość, oblicz ciężar powierzchniowy
    if (density > 0 && thickness > 0 && surfaceWeight === 0) {
      // ciężar_powierzchniowy [g/m²] = gęstość [g/cm³] × grubość [mm] × 10
      const calculatedSurfaceWeight = density * thickness * 10;
      updates.surfaceWeight = calculatedSurfaceWeight.toFixed(2);
    }

    // Jeśli mamy ciężar powierzchniowy i grubość, oblicz gęstość
    if (surfaceWeight > 0 && thickness > 0 && density === 0) {
      // gęstość [g/cm³] = ciężar_powierzchniowy [g/m²] / (grubość [mm] × 10)
      const calculatedDensity = surfaceWeight / (thickness * 10);
      updates.density = calculatedDensity.toFixed(3);
    }

    // Jeśli mamy ciężar powierzchniowy i gęstość, oblicz grubość
    if (surfaceWeight > 0 && density > 0 && thickness === 0) {
      // grubość [mm] = ciężar_powierzchniowy [g/m²] / (gęstość [g/cm³] × 10)
      const calculatedThickness = surfaceWeight / (density * 10);
      updates.thickness = calculatedThickness.toFixed(2);
    }

    // Oblicz wagę netto
    if (surfaceAreaM2 > 0) {
      let weightNetto = 0;

      if (parseFloat(updates.surfaceWeight || item.surfaceWeight) > 0) {
        // Używamy ciężaru powierzchniowego
        weightNetto = surfaceAreaM2 * parseFloat(updates.surfaceWeight || item.surfaceWeight);
      } else if (density > 0 && thickness > 0) {
        // Używamy gęstości i grubości
        const volume_cm3 = surfaceAreaM2 * 10000 * (thickness / 10); // m² -> cm² -> cm³
        weightNetto = volume_cm3 * density;
      }

      if (weightNetto > 0) {
        updates.weight = weightNetto.toFixed(1);
      }
    }

    // Oblicz powierzchnię brutto
    if (sheetLength > 0 && sheetWidth > 0 && partsPerSheet > 0) {
      const sheetAreaM2 = (sheetLength * sheetWidth) / 1000000; // mm² -> m²
      const surfaceBruttoM2 = sheetAreaM2 / partsPerSheet;
      updates.surfaceBrutto = surfaceBruttoM2.toFixed(4);

      // Oblicz wagę brutto
      if (parseFloat(updates.surfaceWeight || item.surfaceWeight) > 0) {
        const weightBrutto = surfaceBruttoM2 * parseFloat(updates.surfaceWeight || item.surfaceWeight);
        updates.bruttoWeight = weightBrutto.toFixed(1);
      } else if (density > 0 && thickness > 0) {
        const volume_cm3 = surfaceBruttoM2 * 10000 * (thickness / 10);
        const weightBrutto = volume_cm3 * density;
        updates.bruttoWeight = weightBrutto.toFixed(1);
      }
    }

    // Aktualizuj tylko jeśli są zmiany
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    item.surfaceArea,
    item.surfaceUnit,
    item.thickness,
    item.density,
    item.surfaceWeight,
    item.sheetLength,
    item.sheetWidth,
    item.partsPerSheet
  ]);

  return (
    <div className="space-y-4">
      {/* Powierzchnia netto */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs ${themeClasses.text.secondary}`}>
            Powierzchnia netto
          </label>
          <input
            type="number"
            value={item.surfaceArea}
            onChange={(e) => onUpdate({ surfaceArea: e.target.value })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
            placeholder="0"
            step="0.01"
          />
        </div>
        <div>
          <label className={`block text-xs ${themeClasses.text.secondary}`}>
            Jednostka
          </label>
          <select
            value={item.surfaceUnit}
            onChange={(e) => onUpdate({ surfaceUnit: e.target.value })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
          >
            <option value="mm2">mm²</option>
            <option value="m2">m²</option>
          </select>
        </div>
      </div>

      {/* Trójkąt: Grubość, Gęstość, Ciężar powierzchniowy */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-xs font-medium mb-2 text-center">
          Właściwości materiału (wypełnij 2 z 3)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Grubość [mm]
            </label>
            <input
              type="number"
              value={item.thickness}
              onChange={(e) => onUpdate({ thickness: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Gęstość [g/cm³]
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
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Ciężar pow. [g/m²]
            </label>
            <input
              type="number"
              value={item.surfaceWeight}
              onChange={(e) => onUpdate({ surfaceWeight: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Arkusz i ilość detali */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className="text-xs font-medium mb-2 text-center">
          Parametry arkusza (dla wagi brutto)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Długość [mm]
            </label>
            <input
              type="number"
              value={item.sheetLength}
              onChange={(e) => onUpdate({ sheetLength: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="1000"
              step="1"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Szerokość [mm]
            </label>
            <input
              type="number"
              value={item.sheetWidth}
              onChange={(e) => onUpdate({ sheetWidth: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="1000"
              step="1"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Detali/arkusz
            </label>
            <input
              type="number"
              value={item.partsPerSheet}
              onChange={(e) => onUpdate({ partsPerSheet: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="1"
              min="1"
            />
          </div>
        </div>
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
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Pow. brutto:</span>
            <span className="font-medium">{item.surfaceBrutto ? `${parseFloat(item.surfaceBrutto).toFixed(4)} m²` : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
