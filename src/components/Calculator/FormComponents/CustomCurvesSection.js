import React from 'react';

/**
 * CustomCurvesSection - Sekcja krzywych niestandardowych
 *
 * Wyekstrahowany z ItemCard (~100 linii)
 *
 * Odpowiedzialność:
 * - Renderowanie wszystkich krzywych niestandardowych dla itemu
 * - Dropdown źródła danych (manual, weightNetto, weightBrutto, surfaceNetto, surfaceBrutto)
 * - Pole input (ręczne lub auto)
 * - Wyświetlanie wyników interpolacji
 * - Obliczanie i wyświetlanie kosztu
 *
 * @param {Array} customCurves - Lista krzywych z tab.customCurves
 * @param {Object} item - Dane itemu
 * @param {Function} onUpdate - Callback do aktualizacji itemu
 * @param {Object} themeClasses - Klasy CSS dla motywu
 * @param {boolean} darkMode - Tryb ciemny
 */
export function CustomCurvesSection({
  customCurves,
  item,
  onUpdate,
  themeClasses,
  darkMode
}) {
  // Nie renderuj jeśli brak krzywych
  if (!customCurves || customCurves.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className={`text-sm font-medium ${themeClasses.text.secondary}`}>
        Krzywe niestandardowe
      </h4>
      {customCurves.map((curve) => {
        const inputMode = curve.inputMode || 'x';
        const curveValues = item.customCurveValues?.[curve.id] || {};
        const dataSource = curveValues.source || 'manual';

        const inputLabel = inputMode === 'x'
          ? `Wartość X (${curve.xUnit})`
          : `Wartość Y (${curve.yUnit})`;
        const outputUnit = inputMode === 'x' ? curve.yUnit : curve.xUnit;
        const outputValue = inputMode === 'x'
          ? item.results?.customCurveCosts?.[curve.id]?.interpolatedY
          : item.results?.customCurveCosts?.[curve.id]?.interpolatedX;

        const handleSourceChange = (newSource) => {
          const newCustomCurveValues = {
            ...(item.customCurveValues || {}),
            [curve.id]: {
              ...curveValues,
              source: newSource
            }
          };
          onUpdate({ customCurveValues: newCustomCurveValues });
        };

        const handleInputChange = (newInput) => {
          const newCustomCurveValues = {
            ...(item.customCurveValues || {}),
            [curve.id]: {
              ...curveValues,
              input: newInput
            }
          };
          onUpdate({ customCurveValues: newCustomCurveValues });
        };

        return (
          <div key={curve.id} className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="text-sm font-medium mb-2">{curve.name}</div>
            <div className="grid grid-cols-3 gap-2">
              {/* Dropdown źródła danych */}
              <div>
                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                  Źródło danych
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className={`w-full px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                >
                  <option value="manual">Ręczne</option>
                  <option value="weightNetto">Waga netto</option>
                  <option value="weightBrutto">Waga brutto</option>
                  <option value="surfaceNetto">Powierzchnia netto</option>
                  <option value="surfaceBrutto">Powierzchnia brutto</option>
                </select>
              </div>

              {/* Pole input - disabled jeśli automatyczne */}
              <div>
                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                  {inputLabel}
                </label>
                {dataSource === 'manual' ? (
                  <input
                    type="number"
                    value={curveValues.input || ''}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`w-full px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                    step="0.1"
                    placeholder="0"
                  />
                ) : (
                  <div className={`w-full px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700 ${themeClasses.text.secondary} flex items-center`}>
                    <span className="text-green-600 mr-1">✓</span> Auto
                  </div>
                )}
              </div>

              {/* Wynik */}
              <div>
                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                  Wynik
                </label>
                <div className={`px-2 py-1 text-xs ${themeClasses.text.secondary}`}>
                  {outputValue
                    ? `${outputValue.toFixed(2)} ${outputUnit}`
                    : '-'}
                  <br />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {item.results?.customCurveCosts?.[curve.id]?.cost
                      ? `${item.results.customCurveCosts[curve.id].cost.toFixed(3)} €`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
