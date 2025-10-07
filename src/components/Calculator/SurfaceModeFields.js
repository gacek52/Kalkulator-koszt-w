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
    // Sprawdź które pole ma być obliczane (unlocked)
    const locked = item.surfaceCalcLocked || { thickness: true, density: true, surfaceWeight: false };

    // Oblicz pole które jest unlocked (nie zaznaczone checkboxem)
    if (!locked.surfaceWeight && locked.thickness && locked.density) {
      // Oblicz ciężar powierzchniowy z gęstości i grubości
      // Wzór: g/m² = kg/m³ × mm (bo mm = m/1000, więc kg/m³ × m/1000 = kg/m² × 1000 = g/m²)
      if (density > 0 && thickness > 0) {
        const calculatedSurfaceWeight = density * thickness;
        updates.surfaceWeight = calculatedSurfaceWeight.toFixed(2);
      }
    } else if (!locked.density && locked.thickness && locked.surfaceWeight) {
      // Oblicz gęstość z ciężaru powierzchniowego i grubości
      if (surfaceWeight > 0 && thickness > 0) {
        const calculatedDensity = surfaceWeight / thickness;
        updates.density = calculatedDensity.toFixed(0);
      }
    } else if (!locked.thickness && locked.density && locked.surfaceWeight) {
      // Oblicz grubość z ciężaru powierzchniowego i gęstości
      if (surfaceWeight > 0 && density > 0) {
        const calculatedThickness = surfaceWeight / density;
        updates.thickness = calculatedThickness.toFixed(2);
      }
    }

    // Oblicz wagę netto
    if (surfaceAreaM2 > 0) {
      let weightNetto = 0;

      if (parseFloat(updates.surfaceWeight || item.surfaceWeight) > 0) {
        // Używamy ciężaru powierzchniowego [g/m²]
        // waga [g] = powierzchnia [m²] × ciężar powierzchniowy [g/m²]
        weightNetto = surfaceAreaM2 * parseFloat(updates.surfaceWeight || item.surfaceWeight);
      } else if (density > 0 && thickness > 0) {
        // Używamy gęstości i grubości
        // waga [g] = powierzchnia [m²] × grubość [mm] × gęstość [kg/m³]
        // (mm × kg/m³ = g/m², więc m² × g/m² = g)
        weightNetto = surfaceAreaM2 * thickness * density;
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
        const weightBrutto = surfaceBruttoM2 * thickness * density;
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
    item.surfaceCalcLocked?.thickness,
    item.surfaceCalcLocked?.density,
    item.surfaceCalcLocked?.surfaceWeight,
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
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-xs font-medium mb-2 text-center ${themeClasses.text.primary}`}>
          Właściwości materiału (zaznacz 2, trzecie się obliczy)
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={item.surfaceCalcLocked?.thickness !== false}
                onChange={(e) => {
                  const currentLocked = item.surfaceCalcLocked || { thickness: true, density: true, surfaceWeight: false };
                  const newLocked = { ...currentLocked };
                  newLocked.thickness = e.target.checked;

                  // Nie pozwalaj na odznaczenie jeśli zostałby tylko 1 zaznaczony
                  const checkedCount = Object.values(newLocked).filter(v => v).length;
                  if (checkedCount >= 2) {
                    onUpdate({ surfaceCalcLocked: newLocked });
                  }
                }}
                className="mr-2"
              />
              <label className={`text-xs ${themeClasses.text.secondary}`}>
                Grubość [mm]
              </label>
            </div>
            <input
              type="number"
              value={item.thickness}
              onChange={(e) => onUpdate({ thickness: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input} ${!item.surfaceCalcLocked?.thickness ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100' : ''}`}
              placeholder="0"
              step="0.01"
              disabled={!item.surfaceCalcLocked?.thickness}
            />
          </div>
          <div>
            <div className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={item.surfaceCalcLocked?.density !== false}
                onChange={(e) => {
                  const currentLocked = item.surfaceCalcLocked || { thickness: true, density: true, surfaceWeight: false };
                  const newLocked = { ...currentLocked };
                  newLocked.density = e.target.checked;

                  // Nie pozwalaj na odznaczenie jeśli zostałby tylko 1 zaznaczony
                  const checkedCount = Object.values(newLocked).filter(v => v).length;
                  if (checkedCount >= 2) {
                    onUpdate({ surfaceCalcLocked: newLocked });
                  }
                }}
                className="mr-2"
              />
              <label className={`text-xs ${themeClasses.text.secondary}`}>
                Gęstość [kg/m³]
              </label>
            </div>
            <input
              type="number"
              value={item.density}
              onChange={(e) => onUpdate({ density: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input} ${!item.surfaceCalcLocked?.density ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100' : ''}`}
              placeholder="0"
              step="1"
              disabled={!item.surfaceCalcLocked?.density}
            />
          </div>
          <div>
            <div className="flex items-center mb-1">
              <input
                type="checkbox"
                checked={item.surfaceCalcLocked?.surfaceWeight !== false}
                onChange={(e) => {
                  const currentLocked = item.surfaceCalcLocked || { thickness: true, density: true, surfaceWeight: false };
                  const newLocked = { ...currentLocked };
                  newLocked.surfaceWeight = e.target.checked;

                  // Nie pozwalaj na odznaczenie jeśli zostałby tylko 1 zaznaczony
                  const checkedCount = Object.values(newLocked).filter(v => v).length;
                  if (checkedCount >= 2) {
                    onUpdate({ surfaceCalcLocked: newLocked });
                  }
                }}
                className="mr-2"
              />
              <label className={`text-xs ${themeClasses.text.secondary}`}>
                Ciężar pow. [g/m²]
              </label>
            </div>
            <input
              type="number"
              value={item.surfaceWeight}
              onChange={(e) => onUpdate({ surfaceWeight: e.target.value })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input} ${!item.surfaceCalcLocked?.surfaceWeight ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100' : ''}`}
              placeholder="0"
              step="0.01"
              disabled={!item.surfaceCalcLocked?.surfaceWeight}
            />
          </div>
        </div>
      </div>

      {/* Arkusz i ilość detali */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className={`text-xs font-medium mb-2 text-center ${themeClasses.text.primary}`}>
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
        <div className={`text-xs font-medium mb-2 ${themeClasses.text.primary}`}>📊 Obliczone wartości:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Pow. netto:</span>
            <span className={`font-medium ${themeClasses.text.primary}`}>
              {item.surfaceArea ?
                `${(item.surfaceUnit === 'mm2' ? parseFloat(item.surfaceArea) / 1000000 : parseFloat(item.surfaceArea)).toFixed(4)} m²`
                : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Pow. brutto:</span>
            <span className={`font-medium ${
              item.surfaceBrutto && item.surfaceArea &&
              parseFloat(item.surfaceBrutto) < (item.surfaceUnit === 'mm2' ? parseFloat(item.surfaceArea) / 1000000 : parseFloat(item.surfaceArea))
                ? 'text-red-600 dark:text-red-400'
                : themeClasses.text.primary
            }`}>
              {item.surfaceBrutto ? `${parseFloat(item.surfaceBrutto).toFixed(4)} m²` : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Waga netto:</span>
            <span className={`font-medium ${themeClasses.text.primary}`}>{item.weight ? `${parseFloat(item.weight).toFixed(1)} g` : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className={themeClasses.text.secondary}>Waga brutto:</span>
            <span className={`font-medium ${
              item.bruttoWeight && item.weight && parseFloat(item.bruttoWeight) < parseFloat(item.weight)
                ? 'text-red-600 dark:text-red-400'
                : themeClasses.text.primary
            }`}>
              {item.bruttoWeight ? `${parseFloat(item.bruttoWeight).toFixed(1)} g` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
