import React, { useEffect } from 'react';

/**
 * Pola wejściowe dla trybu kalkulacji PROSTE HEATSHIELD'Y
 * Blacha + mata izolacyjna z procesami standardowymi
 */
export function HeatshieldModeFields({ item, onUpdate, themeClasses, darkMode }) {

  // Inicjalizacja domyślnych wartości
  useEffect(() => {
    if (!item.heatshield) return;

    const defaults = {};

    // Ustaw domyślne wartości tylko jeśli pole nie istnieje lub jest puste
    if (!item.heatshield.sheetDensity || item.heatshield.sheetDensity === '') {
      defaults.sheetDensity = '7850';
    }
    if (!item.heatshield.bendingCost || item.heatshield.bendingCost === '') {
      defaults.bendingCost = '0.08';
    }
    if (!item.heatshield.joiningCost || item.heatshield.joiningCost === '') {
      defaults.joiningCost = '0';
    }

    if (Object.keys(defaults).length > 0) {
      onUpdate({
        heatshield: {
          ...item.heatshield,
          ...defaults
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    item.heatshield?.surfaceNetto,
    item.heatshield?.sheetDensity,
    item.heatshield?.bendingCost,
    item.heatshield?.joiningCost
  ]);

  // Auto-obliczanie powierzchni i wag
  useEffect(() => {
    const surfaceNetto = parseFloat(item.heatshield?.surfaceNetto) || 0;
    const sheetDensity = parseFloat(item.heatshield?.sheetDensity) || 0;
    const sheetThickness = parseFloat(item.heatshield?.sheetThickness) || 0;
    const matDensity = parseFloat(item.heatshield?.matDensity) || 0;
    const matThickness = parseFloat(item.heatshield?.matThickness) || 0;

    let updates = {};

    if (surfaceNetto > 0) {
      // Powierzchnia brutto blachy = powierzchnia netto × 2
      const surfaceBruttoSheet = surfaceNetto * 2;
      updates.surfaceBruttoSheet = surfaceBruttoSheet.toFixed(4);

      // Powierzchnia netto blachy = powierzchnia netto maty
      updates.surfaceNettoSheet = surfaceNetto.toFixed(4);
      updates.surfaceNettoMat = surfaceNetto.toFixed(4);

      // Oblicz wagi
      if (sheetDensity > 0 && sheetThickness > 0) {
        // Waga blachy: powierzchnia brutto × grubość × gęstość
        const sheetWeight = surfaceBruttoSheet * sheetThickness * sheetDensity;
        updates.sheetWeight = sheetWeight.toFixed(1);
      }

      if (matDensity > 0 && matThickness > 0) {
        // Waga maty: powierzchnia netto × grubość × gęstość
        const matWeight = surfaceNetto * matThickness * matDensity;
        updates.matWeight = matWeight.toFixed(1);
      }

      // Suma wag
      const totalWeight = (parseFloat(updates.sheetWeight || item.heatshield?.sheetWeight) || 0) +
                         (parseFloat(updates.matWeight || item.heatshield?.matWeight) || 0);
      if (totalWeight > 0) {
        updates.totalWeight = totalWeight.toFixed(1);
      }
    }

    // Aktualizuj tylko jeśli są zmiany
    if (Object.keys(updates).length > 0) {
      onUpdate({
        heatshield: {
          ...item.heatshield,
          ...updates
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    item.heatshield?.surfaceNetto,
    item.heatshield?.sheetDensity,
    item.heatshield?.sheetThickness,
    item.heatshield?.matDensity,
    item.heatshield?.matThickness
  ]);

  // Merge z domyślnymi wartościami przy każdym renderze
  const heatshield = {
    sheetDensity: '7850',
    bendingCost: '0.08',
    joiningCost: '0',
    ...(item.heatshield || {})
  };

  return (
    <div className="space-y-4">
      {/* Powierzchnia netto (z CAD/3D) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={`block text-xs ${themeClasses.text.secondary}`}>
            Powierzchnia netto (z CAD/3D)
          </label>
          <input
            type="number"
            value={heatshield.surfaceNettoInput || ''}
            onChange={(e) => {
              const inputValue = parseFloat(e.target.value) || 0;
              const unit = heatshield.surfaceUnit || 'mm2';
              // Przelicz na m²
              let surfaceM2 = inputValue;
              if (unit === 'mm2') {
                surfaceM2 = inputValue / 1000000;
              }
              onUpdate({
                heatshield: {
                  ...heatshield,
                  surfaceNettoInput: e.target.value,
                  surfaceNetto: surfaceM2.toFixed(6)
                }
              });
            }}
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
            value={heatshield.surfaceUnit || 'mm2'}
            onChange={(e) => {
              const inputValue = parseFloat(heatshield.surfaceNettoInput) || 0;
              let surfaceM2 = inputValue;
              if (e.target.value === 'mm2') {
                surfaceM2 = inputValue / 1000000;
              } else {
                surfaceM2 = inputValue;
              }
              onUpdate({
                heatshield: {
                  ...heatshield,
                  surfaceUnit: e.target.value,
                  surfaceNetto: surfaceM2.toFixed(6)
                }
              });
            }}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
          >
            <option value="mm2">mm²</option>
            <option value="m2">m²</option>
          </select>
        </div>
      </div>

      {/* Parametry blachy */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-xs font-medium mb-2">🛡️ Parametry blachy</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Grubość [mm]
            </label>
            <input
              type="number"
              value={heatshield.sheetThickness || ''}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, sheetThickness: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Gęstość [kg/m³]
            </label>
            <input
              type="number"
              value={heatshield.sheetDensity || '7850'}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, sheetDensity: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="1"
            />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <label className={`text-xs ${themeClasses.text.secondary}`}>
              Cena blachy (€/{heatshield.sheetPriceUnit || 'kg'})
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => onUpdate({
                  heatshield: { ...heatshield, sheetPriceUnit: 'kg' }
                })}
                className={`px-2 py-0.5 text-xs rounded ${
                  heatshield.sheetPriceUnit === 'kg' || !heatshield.sheetPriceUnit
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                €/kg
              </button>
              <button
                onClick={() => onUpdate({
                  heatshield: { ...heatshield, sheetPriceUnit: 'm2' }
                })}
                className={`px-2 py-0.5 text-xs rounded ${
                  heatshield.sheetPriceUnit === 'm2'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                €/m²
              </button>
            </div>
          </div>
          <input
            type="number"
            value={heatshield.sheetPrice || ''}
            onChange={(e) => onUpdate({
              heatshield: { ...heatshield, sheetPrice: e.target.value }
            })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
            placeholder="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Parametry maty */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="text-xs font-medium mb-2">🧵 Parametry maty izolacyjnej</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Grubość [mm]
            </label>
            <input
              type="number"
              value={heatshield.matThickness || ''}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, matThickness: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Gęstość [kg/m³]
            </label>
            <input
              type="number"
              value={heatshield.matDensity || ''}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, matDensity: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="1"
            />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-1">
            <label className={`text-xs ${themeClasses.text.secondary}`}>
              Cena maty (€/{heatshield.matPriceUnit || 'm2'})
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => onUpdate({
                  heatshield: { ...heatshield, matPriceUnit: 'kg' }
                })}
                className={`px-2 py-0.5 text-xs rounded ${
                  heatshield.matPriceUnit === 'kg'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                €/kg
              </button>
              <button
                onClick={() => onUpdate({
                  heatshield: { ...heatshield, matPriceUnit: 'm2' }
                })}
                className={`px-2 py-0.5 text-xs rounded ${
                  heatshield.matPriceUnit === 'm2' || !heatshield.matPriceUnit
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                €/m²
              </button>
            </div>
          </div>
          <input
            type="number"
            value={heatshield.matPrice || ''}
            onChange={(e) => onUpdate({
              heatshield: { ...heatshield, matPrice: e.target.value }
            })}
            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
            placeholder="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Procesy standardowe */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className="text-xs font-medium mb-2">⚙️ Procesy standardowe</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Gięcie [€/szt]
            </label>
            <input
              type="number"
              value={heatshield.bendingCost || '0.08'}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, bendingCost: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0.08"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Łączenie [€/szt]
            </label>
            <input
              type="number"
              value={heatshield.joiningCost || '0'}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, joiningCost: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
          <div>
            <label className={`block text-xs ${themeClasses.text.secondary}`}>
              Klejenie [€/szt]
            </label>
            <input
              type="number"
              value={heatshield.gluingCost || ''}
              onChange={(e) => onUpdate({
                heatshield: { ...heatshield, gluingCost: e.target.value }
              })}
              className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
              placeholder="0"
              step="0.01"
            />
          </div>
        </div>
        <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
          💡 Przygotówka i wycinanie laserowe obliczane z krzywych w zakładce "Krzywe"
        </div>
      </div>

      {/* Wyniki obliczeń */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
        <div className="text-xs font-medium mb-2">📊 Obliczone wartości:</div>
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Pow. brutto blachy:</span>
              <span className="font-medium">{heatshield.surfaceBruttoSheet ? `${parseFloat(heatshield.surfaceBruttoSheet).toFixed(4)} m²` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Pow. netto blachy:</span>
              <span className="font-medium">{heatshield.surfaceNettoSheet ? `${parseFloat(heatshield.surfaceNettoSheet).toFixed(4)} m²` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Pow. netto maty:</span>
              <span className="font-medium">{heatshield.surfaceNettoMat ? `${parseFloat(heatshield.surfaceNettoMat).toFixed(4)} m²` : '-'}</span>
            </div>
          </div>
          <hr className={`my-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />
          <div className="grid grid-cols-3 gap-2">
            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Waga blachy:</span>
              <span className="font-medium">{heatshield.sheetWeight ? `${parseFloat(heatshield.sheetWeight).toFixed(1)} g` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Waga maty:</span>
              <span className="font-medium">{heatshield.matWeight ? `${parseFloat(heatshield.matWeight).toFixed(1)} g` : '-'}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className={themeClasses.text.primary}>Waga całkowita:</span>
              <span className={themeClasses.text.primary}>{heatshield.totalWeight ? `${parseFloat(heatshield.totalWeight).toFixed(1)} g` : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
