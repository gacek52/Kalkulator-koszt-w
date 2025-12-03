import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2, Truck } from 'lucide-react';
import { SelectInput } from '../../Common/SelectInput';
import { NumberInput } from '../../Common/NumberInput';
import { SurfaceModeFields } from '../SurfaceModeFields';
import { VolumeModeFields } from '../VolumeModeFields';
import { HeatshieldModeFields } from '../HeatshieldModeFields';
import { MultilayerModeFields } from '../MultilayerModeFields';
import { WorkstationFields } from '../WorkstationFields';
import { PackagingCalculation } from '../PackagingCalculation';
import { ToolingSection } from '../ToolingSection';
import { VolumeForecastSection } from '../VolumeForecastSection';
import { ItemResults } from './ItemResults';

/**
 * ItemCard - Pojedynczy item w kalkulacji
 *
 * Wyekstrahowany z OldCalculatorForm (linie 1676-2268, ~590 linii)
 *
 * Odpowiedzialność:
 * - Renderowanie pojedynczego itemu w kalkulacji
 * - Pola specyficzne dla trybu kalkulacji (weight/surface/volume/heatshield/multilayer)
 * - Pola wspólne (annualVolume, margin)
 * - Sekcje: stanowiska, pakowanie, tooling, prognozy, transport
 * - Wyniki kalkulacji
 * - Akcje: duplicate, delete
 * - Collapse/expand
 *
 * @param {Object} item - Dane itemu
 * @param {number} index - Indeks w tablicy items
 * @param {Object} tab - Dane aktualnej zakładki
 * @param {Object} calculationMeta - Metadata kalkulacji (transport, client)
 * @param {Function} onUpdate - Callback do aktualizacji itemu
 * @param {Function} onDuplicate - Callback do powielania
 * @param {Function} onDelete - Callback do usuwania
 * @param {Object} themeClasses - Klasy CSS dla motywu
 * @param {boolean} darkMode - Tryb ciemny
 * @param {Object} packagingState - Stan pakowania z contextu
 * @param {Object} transportState - Stan transportu z contextu
 * @param {Object} clientState - Stan klientów z contextu
 * @param {boolean} canDelete - Czy można usunąć (minimalnie 1 item)
 */
export function ItemCard({
  item,
  index,
  tab,
  calculationMeta,
  onUpdate,
  onDuplicate,
  onDelete,
  themeClasses,
  darkMode,
  packagingState,
  transportState,
  clientState,
  canDelete
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleUpdate = (updates) => {
    onUpdate(item.id, updates);
  };

  const handleDuplicate = () => {
    onDuplicate(tab.id, item.id);
  };

  const handleDelete = () => {
    onDelete(tab.id, item.id);
  };

  return (
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        darkMode ? 'border-gray-600' : 'border-gray-200'
      } ${
        index % 2 === 0
          ? (darkMode ? 'bg-gray-800/50' : 'bg-gray-100')
          : (darkMode ? 'bg-gray-900/50' : 'bg-gray-50')
      }`}
    >
      {/* ID części - zawsze widoczne z przyciskiem zwijania */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${themeClasses.text.secondary}`}
          title={isCollapsed ? "Rozwiń element" : "Zwiń element"}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
        <div className="flex-1">
          <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
            ID części
          </label>
          <input
            type="text"
            value={item.partId}
            onChange={(e) => handleUpdate({ partId: e.target.value })}
            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
            placeholder="np. ABC123"
          />
        </div>
      </div>

      {/* Zawartość - ukryta gdy zwinięte */}
      {!isCollapsed && (
        <>
          {/* Pola w zależności od trybu kalkulacji */}
          {(tab.calculationType === 'weight' || !tab.calculationType) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                    Waga netto (g)
                  </label>
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => handleUpdate({ weight: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    min="0"
                    step="0.1"
                  />
                  {item.results && item.weightOption !== 'netto' && (
                    <div className={`text-xs mt-1 ${
                      item.results.bruttoWeight < item.results.nettoWeight
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : themeClasses.text.secondary
                    }`}>
                      Brutto: {item.results.bruttoWeight.toFixed(1)}g
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                    Typ wagi
                  </label>
                  <SelectInput
                    value={item.weightOption}
                    onChange={(value) => handleUpdate({ weightOption: value })}
                    options={[
                      { value: 'netto', label: 'Waga netto' },
                      { value: 'brutto-auto', label: 'Brutto (auto z krzywej)' },
                      { value: 'brutto-manual', label: 'Brutto (ręcznie)' }
                    ]}
                    themeClasses={themeClasses}
                  />
                </div>

                {item.weightOption === 'brutto-manual' && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Waga brutto (g)
                    </label>
                    <input
                      type="number"
                      value={item.bruttoWeight}
                      onChange={(e) => handleUpdate({ bruttoWeight: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="0"
                      step="0.1"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {tab.calculationType === 'surface' && (
            <SurfaceModeFields
              item={item}
              onUpdate={handleUpdate}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />
          )}

          {tab.calculationType === 'volume' && (
            <VolumeModeFields
              item={item}
              onUpdate={handleUpdate}
              bruttoCurve={tab.editingCurves.bruttoWeight}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />
          )}

          {tab.calculationType === 'heatshield' && (
            <HeatshieldModeFields
              item={item}
              onUpdate={handleUpdate}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />
          )}

          {tab.calculationType === 'multilayer' && (
            <MultilayerModeFields
              item={item}
              tab={tab}
              onUpdate={handleUpdate}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />
          )}

          {/* Pola wspólne dla wszystkich trybów */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                Roczna ilość (szt.)
              </label>
              <input
                type="number"
                value={item.annualVolume || ''}
                onChange={(e) => handleUpdate({ annualVolume: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                step="1"
                placeholder="np. 10000"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                Marża (%)
              </label>
              <input
                type="number"
                value={item.margin || ''}
                onChange={(e) => handleUpdate({ margin: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                step="0.1"
                placeholder="np. 20"
              />
            </div>
          </div>

          {/* Stanowiska - tylko dla prostych trybów */}
          {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
            <WorkstationFields
              item={item}
              onUpdate={handleUpdate}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />
          )}

          {/* Pakowanie */}
          <PackagingCalculation
            item={item}
            onUpdate={handleUpdate}
            themeClasses={themeClasses}
            darkMode={darkMode}
          />

          {/* Sekcja toolingu/narzędzi */}
          <ToolingSection
            item={item}
            onUpdate={handleUpdate}
            themeClasses={themeClasses}
            darkMode={darkMode}
          />

          {/* Kalendarz prognoz wolumenu */}
          <VolumeForecastSection
            item={item}
            onUpdate={handleUpdate}
            themeClasses={themeClasses}
            darkMode={darkMode}
          />

          {/* Szczegóły transportu dla elementu */}
          {calculationMeta.transport && calculationMeta.transport.enabled && item.results && item.results.transportCost > 0 && (
            <div className={`p-3 rounded-lg border ${themeClasses.card} mt-3`}>
              <div className="flex items-center gap-2 mb-2">
                <Truck size={16} className={themeClasses.text.secondary} />
                <h4 className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                  Szczegóły transportu dla elementu
                </h4>
              </div>
              <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(() => {
                    // Oblicz szczegóły transportu dla tego elementu
                    const transportType = transportState.types?.find(t => t.id == calculationMeta.transport.transportTypeId);
                    if (!transportType) return null;

                    const composition = packagingState.compositions.find(
                      c => c.id == item.packaging?.compositionId
                    );
                    if (!composition) return null;

                    const partsInBox = item.packaging.manualPartsInBox
                      ? parseFloat(item.packaging.partsInBox) || 0
                      : (parseFloat(item.packaging.partsPerLayer) || 0) * (parseFloat(item.packaging.layers) || 0);

                    const partsPerPallet = partsInBox * composition.packagesPerPallet;
                    const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

                    // Pobierz costPerSpace z zapisanego stanu (obliczany przez TransportCalculation)
                    const costPerSpace = parseFloat(calculationMeta.transport.calculatedCostPerSpace) || 0;

                    if (costPerSpace === 0) return null;

                    return (
                      <>
                        <div className="col-span-2">
                          <span className={themeClasses.text.secondary}>Detali w miejscu paletowym:</span>
                          <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                            {partsPerSpace.toFixed(0)} szt
                          </div>
                        </div>
                        <div>
                          <span className={themeClasses.text.secondary}>Koszt na miejsce:</span>
                          <div className={`font-mono ${themeClasses.text.primary}`}>
                            €{costPerSpace.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className={themeClasses.text.secondary}>Koszt na detal:</span>
                          <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                            €{item.results.transportCost.toFixed(4)}
                          </div>
                        </div>
                        {item.annualVolume && parseFloat(item.annualVolume) > 0 && (
                          <>
                            <div className="col-span-2 mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                              <span className={themeClasses.text.secondary}>Miejsc paletowych rocznie:</span>
                              <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                                {Math.ceil(parseFloat(item.annualVolume) / partsPerSpace)}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {parseFloat(tab.cleaningCost || 0) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Opcja czyszczenia
                </label>
                <SelectInput
                  value={item.cleaningOption}
                  onChange={(value) => handleUpdate({ cleaningOption: value })}
                  options={[
                    { value: 'scaled', label: 'Z krzywej' },
                    { value: 'manual', label: 'Ręcznie' }
                  ]}
                  themeClasses={themeClasses}
                />
              </div>

              {item.cleaningOption === 'manual' && (
                <NumberInput
                  label="Czas czyszczenia (sek)"
                  value={item.manualCleaningTime}
                  onChange={(value) => handleUpdate({ manualCleaningTime: value })}
                  min={0}
                  step={1}
                  themeClasses={themeClasses}
                />
              )}
            </div>
          )}

          {/* Krzywe niestandardowe */}
          {tab.customCurves && tab.customCurves.length > 0 && (
            <div className="space-y-3">
              <h4 className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                Krzywe niestandardowe
              </h4>
              {tab.customCurves.map((curve) => {
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
                          onChange={(e) => {
                            const newCustomCurveValues = {
                              ...(item.customCurveValues || {}),
                              [curve.id]: {
                                ...curveValues,
                                source: e.target.value
                              }
                            };
                            handleUpdate({ customCurveValues: newCustomCurveValues });
                          }}
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
                            onChange={(e) => {
                              const newCustomCurveValues = {
                                ...(item.customCurveValues || {}),
                                [curve.id]: {
                                  ...curveValues,
                                  input: e.target.value
                                }
                              };
                              handleUpdate({ customCurveValues: newCustomCurveValues });
                            }}
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
          )}

          {/* Wyniki kalkulacji */}
          <ItemResults
            item={item}
            tab={tab}
            calculationMeta={calculationMeta}
            themeClasses={themeClasses}
            darkMode={darkMode}
            clientState={clientState}
          />
        </>
      )}

      {/* Przyciski akcji - zawsze widoczne */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleDuplicate}
          className="text-blue-500 hover:text-blue-700 p-1"
          title="Powiel element"
        >
          <Copy size={16} />
        </button>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 p-1"
            title="Usuń element"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
