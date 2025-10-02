import React, { useEffect } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { NumberInput } from '../Common/NumberInput';
import { SelectInput } from '../Common/SelectInput';
import { CalculationTypeSelector } from './CalculationTypeSelector';
import { SurfaceModeFields } from './SurfaceModeFields';
import { VolumeModeFields } from './VolumeModeFields';

/**
 * Formularz kalkulacji materiałów i procesów
 */
export function CalculatorForm({ tab, tabIndex, globalSGA, themeClasses, darkMode, onOpenSettings }) {
  const { actions } = useCalculator();

  // Przelicz wszystkie items gdy zmienia się globalSGA lub parametry zakładki
  useEffect(() => {
    const updatedItems = tab.items.map(item => {
      if (item.weight && item.results) {
        const results = calculateItemCost(item, tab, globalSGA);
        return { ...item, results };
      }
      return item;
    });

    // Sprawdź czy coś się zmieniło (żeby uniknąć nieskończonej pętli)
    const hasChanges = updatedItems.some((item, idx) => {
      const oldResults = tab.items[idx]?.results;
      const newResults = item.results;
      if (!oldResults || !newResults) return false;

      return (
        oldResults.totalWithSGA !== newResults.totalWithSGA ||
        oldResults.totalCost !== newResults.totalCost ||
        oldResults.materialCost !== newResults.materialCost ||
        oldResults.bakingCost !== newResults.bakingCost ||
        oldResults.cleaningCost !== newResults.cleaningCost
      );
    });

    if (hasChanges) {
      actions.updateTab(tab.id, { items: updatedItems });
    }
  }, [globalSGA, tab.materialCost, tab.bakingCost, tab.cleaningCost, tab.handlingCost]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funkcja kalkulacji kosztów elementu
  const calculateItemCost = (item, tabData, sga) => {
    const nettoWeight = parseFloat(item.weight) || 0;
    if (nettoWeight === 0) return null;

    // Oblicz wagę brutto w zależności od opcji
    let bruttoWeight = nettoWeight;
    if (item.weightOption === 'brutto-auto') {
      // Interpolacja z krzywej brutto
      bruttoWeight = interpolateFromCurve(nettoWeight, tabData.editingCurves.bruttoWeight);
    } else if (item.weightOption === 'brutto-manual') {
      bruttoWeight = parseFloat(item.bruttoWeight) || nettoWeight;
    }

    const materialCost = parseFloat(tabData.materialCost) || 0;
    const bakingCost = parseFloat(tabData.bakingCost) || 0;
    const cleaningCost = parseFloat(tabData.cleaningCost) || 0;
    const handlingCost = parseFloat(tabData.handlingCost) || 0;

    // Oblicz koszt materiału w zależności od trybu i jednostki
    let materialCost_total = 0;
    if (tabData.calculationType === 'surface' && tabData.materialPriceUnit === 'm2') {
      // Tryb powierzchnia z ceną za m²
      const surfaceBrutto = parseFloat(item.surfaceBrutto) || 0;
      materialCost_total = surfaceBrutto * materialCost;
    } else {
      // Domyślnie: cena za kg (używamy wagi brutto)
      materialCost_total = (bruttoWeight / 1000) * materialCost;
    }

    // Interpolacja czasu pieczenia z krzywej - używamy wagi netto dla procesów
    const bakingTime = interpolateFromCurve(nettoWeight, tabData.editingCurves.baking);
    const bakingCost_total = (bakingTime / 3600) * (bakingCost / 8); // sekundy -> godziny -> koszt

    // Oblicz koszt czyszczenia
    let cleaningCost_total = 0;
    if (item.cleaningOption === 'scaled') {
      const cleaningTime = interpolateFromCurve(nettoWeight, tabData.editingCurves.cleaning);
      cleaningCost_total = (cleaningTime / 3600) * (cleaningCost / 8);
    } else {
      const manualTime = parseFloat(item.manualCleaningTime) || 0;
      cleaningCost_total = (manualTime / 3600) * (cleaningCost / 8);
    }

    // Koszt obsługi
    const handlingCost_total = handlingCost;

    // Procesy niestandardowe
    let customProcessesCost = 0;
    tabData.customProcesses.forEach(process => {
      const processValue = parseFloat(item.customValues[process.id]) || 0;
      const processCost = parseFloat(process.cost) || 0;
      const efficiency = parseFloat(process.efficiency) || 1;

      switch (process.unit) {
        case 'euro/szt':
          customProcessesCost += processCost * efficiency;
          break;
        case 'euro/kg':
          customProcessesCost += processCost * (nettoWeight / 1000) * efficiency;
          break;
        case 'euro/8h':
          // Dla euro/8h: efficiency = ile części na zmianę, więc koszt = processCost / efficiency
          if (efficiency > 0) {
            customProcessesCost += processCost / efficiency;
          }
          break;
        default:
          // Domyślnie euro/szt
          customProcessesCost += processCost * efficiency;
          break;
      }
    });

    // Krzywe niestandardowe
    let customCurvesCost = 0;
    const customCurveCosts = {};
    if (tabData.customCurves) {
      tabData.customCurves.forEach(curve => {
        const inputMode = curve.inputMode || 'x';
        const autoBindSource = curve.autoBindSource || 'manual';

        // Pobierz wartość wejściową - automatycznie lub ręcznie
        let inputValue;
        if (autoBindSource === 'weight') {
          inputValue = nettoWeight; // waga netto w gramach
        } else if (autoBindSource === 'bruttoWeight') {
          inputValue = bruttoWeight; // waga brutto w gramach
        } else {
          // Ręczne wprowadzanie
          inputValue = parseFloat(item.customCurveValues?.[curve.id]?.input);
        }

        if (!isNaN(inputValue) && inputValue > 0) {
          let interpolatedX, interpolatedY;

          if (inputMode === 'x') {
            // Podano X → oblicz Y
            interpolatedX = inputValue;
            interpolatedY = interpolateFromCurve(inputValue, curve.points);
          } else {
            // Podano Y → oblicz X (odwrotna interpolacja)
            interpolatedY = inputValue;
            interpolatedX = reverseInterpolateFromCurve(inputValue, curve.points);
          }

          // Oblicz koszt na podstawie wartości Y i kosztu jednostki Y
          const yCost = parseFloat(curve.yCost) || 0;
          let cost = 0;

          // Konwersja jednostek czasu do godzin dla obliczenia kosztu
          if (curve.yUnit === 'sek') {
            cost = (interpolatedY / 3600) * yCost; // yCost to €/h
          } else if (curve.yUnit === 'min') {
            cost = (interpolatedY / 60) * yCost; // yCost to €/h
          } else if (curve.yUnit === 'h') {
            cost = interpolatedY * yCost; // yCost to €/h
          } else if (curve.yUnit === 'g') {
            cost = (interpolatedY / 1000) * yCost; // yCost to €/kg
          } else if (curve.yUnit === 'kg') {
            cost = interpolatedY * yCost; // yCost to €/kg
          } else {
            // Dla innych jednostek: bezpośrednie mnożenie
            cost = interpolatedY * yCost;
          }

          customCurvesCost += cost;
          customCurveCosts[curve.id] = {
            interpolatedX,
            interpolatedY,
            cost,
            inputMode
          };
        }
      });
    }

    const totalCost = materialCost_total + bakingCost_total + cleaningCost_total + handlingCost_total + customProcessesCost + customCurvesCost;

    // Oblicz cenę z marżą
    const margin = parseFloat(item.margin) || 0;
    const totalWithMargin = totalCost * (1 + margin / 100);

    // Oblicz finalną cenę z SG&A
    const sgaPercent = parseFloat(sga) || 0;
    const totalWithSGA = totalWithMargin * (1 + sgaPercent / 100);

    return {
      materialCost: materialCost_total,
      bakingCost: bakingCost_total,
      cleaningCost: cleaningCost_total,
      handlingCost: handlingCost_total,
      customProcessesCost,
      customCurvesCost,
      customCurveCosts,
      totalCost,
      totalWithMargin,
      totalWithSGA,
      nettoWeight,
      bruttoWeight,
      bakingTime,
      cleaningTime: item.cleaningOption === 'scaled'
        ? interpolateFromCurve(nettoWeight, tabData.editingCurves.cleaning)
        : parseFloat(item.manualCleaningTime) || 0
    };
  };

  // Interpolacja liniowa z krzywej (X→Y) z ekstrapolacją
  const interpolateFromCurve = (x, curve) => {
    if (!curve || curve.length === 0) return 0;

    const sortedCurve = [...curve].sort((a, b) => a.x - b.x);

    // Ekstrapolacja w lewo (przed pierwszym punktem)
    if (x <= sortedCurve[0].x && sortedCurve.length >= 2) {
      const x1 = sortedCurve[0].x;
      const y1 = sortedCurve[0].y;
      const x2 = sortedCurve[1].x;
      const y2 = sortedCurve[1].y;
      const slope = (y2 - y1) / (x2 - x1);
      return y1 + slope * (x - x1);
    }

    // Ekstrapolacja w prawo (po ostatnim punkcie)
    if (x >= sortedCurve[sortedCurve.length - 1].x && sortedCurve.length >= 2) {
      const n = sortedCurve.length;
      const x1 = sortedCurve[n - 2].x;
      const y1 = sortedCurve[n - 2].y;
      const x2 = sortedCurve[n - 1].x;
      const y2 = sortedCurve[n - 1].y;
      const slope = (y2 - y1) / (x2 - x1);
      return y2 + slope * (x - x2);
    }

    // Interpolacja (między punktami)
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

    return 0;
  };

  // Odwrotna interpolacja liniowa z krzywej (Y→X) z ekstrapolacją
  const reverseInterpolateFromCurve = (y, curve) => {
    if (!curve || curve.length === 0) return 0;

    const sortedCurve = [...curve].sort((a, b) => a.y - b.y);

    // Ekstrapolacja w dół (przed pierwszym punktem)
    if (y <= sortedCurve[0].y && sortedCurve.length >= 2) {
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

  // Obsługa aktualizacji elementu
  const handleItemUpdate = (itemId, updates) => {
    const updatedItems = tab.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        const results = calculateItemCost(updatedItem, tab, globalSGA);
        return { ...updatedItem, results };
      }
      return item;
    });

    actions.updateTab(tab.id, { items: updatedItems });
  };

  // Obsługa aktualizacji parametrów zakładki
  const handleTabParameterUpdate = (parameter, value) => {
    const updates = { [parameter]: value };

    // Jeśli zmieniamy na tryb powierzchnia, zeruj koszty pieczenia i czyszczenia
    if (parameter === 'calculationType' && value === 'surface') {
      updates.bakingCost = '0';
      updates.cleaningCost = '0';
    }

    // Przelicz wszystkie elementy po zmianie parametru
    const updatedItems = tab.items.map(item => {
      if (item.weight) {
        const results = calculateItemCost(item, { ...tab, ...updates }, globalSGA);
        return { ...item, results };
      }
      return item;
    });

    actions.updateTab(tab.id, { ...updates, items: updatedItems });
  };

  // Dodawanie nowego elementu
  const handleAddItem = () => {
    const newItem = {
      id: tab.nextItemId,
      partId: '',
      // Pola wspólne
      weight: '',
      weightOption: 'netto',
      bruttoWeight: '',
      cleaningOption: 'scaled',
      manualCleaningTime: '45',
      margin: '',
      annualVolume: '',
      customValues: {},
      customCurveValues: {},
      results: null,
      // Pola dla trybu WAGA
      weightUnit: 'g',
      // Pola dla trybu POWIERZCHNIA
      surfaceArea: '',
      surfaceUnit: 'mm2',
      thickness: '',
      density: '',
      surfaceWeight: '',
      surfaceCalcLocked: { thickness: true, density: true, surfaceWeight: false },
      sheetLength: '1000',
      sheetWidth: '1000',
      partsPerSheet: '',
      surfaceBrutto: '',
      // Pola dla trybu OBJĘTOŚĆ
      volume: '',
      volumeUnit: 'mm3',
      dimensions: { length: '', width: '', height: '' },
      volumeWeightOption: 'brutto-auto'
    };

    actions.addItem(tab.id, newItem);
    actions.updateTab(tab.id, { nextItemId: tab.nextItemId + 1 });
  };

  return (
    <div className={`${themeClasses.card} rounded-lg border p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
          Kalkulacja kosztów
        </h2>
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Otwórz ustawienia"
        >
          <Settings className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Selektor trybu kalkulacji */}
      <CalculationTypeSelector
        calculationType={tab.calculationType || 'weight'}
        onChange={(type) => handleTabParameterUpdate('calculationType', type)}
        themeClasses={themeClasses}
        darkMode={darkMode}
      />

      {/* Parametry zakładki */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Koszt materiału z opcją jednostki dla trybu surface */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
              Koszt materiału (€/{tab.materialPriceUnit || 'kg'})
            </label>
            {tab.calculationType === 'surface' && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleTabParameterUpdate('materialPriceUnit', 'kg')}
                  className={`px-2 py-0.5 text-xs rounded ${
                    tab.materialPriceUnit === 'kg' || !tab.materialPriceUnit
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  €/kg
                </button>
                <button
                  onClick={() => handleTabParameterUpdate('materialPriceUnit', 'm2')}
                  className={`px-2 py-0.5 text-xs rounded ${
                    tab.materialPriceUnit === 'm2'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  €/m²
                </button>
              </div>
            )}
          </div>
          <input
            type="number"
            value={tab.materialCost}
            onChange={(e) => handleTabParameterUpdate('materialCost', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
            min="0"
            step="0.01"
          />
        </div>

        <NumberInput
          label="Koszt pieczenia (€/8h)"
          value={tab.bakingCost}
          onChange={(value) => handleTabParameterUpdate('bakingCost', value)}
          min={0}
          step={1}
          themeClasses={themeClasses}
        />

        <NumberInput
          label="Koszt czyszczenia (€/8h)"
          value={tab.cleaningCost}
          onChange={(value) => handleTabParameterUpdate('cleaningCost', value)}
          min={0}
          step={1}
          themeClasses={themeClasses}
        />

        <NumberInput
          label="Koszt obsługi (€/szt)"
          value={tab.handlingCost}
          onChange={(value) => handleTabParameterUpdate('handlingCost', value)}
          min={0}
          step={0.01}
          themeClasses={themeClasses}
        />
      </div>

      {/* Procesy niestandardowe */}
      <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
            ⚙️ Procesy niestandardowe
          </h3>
          <button
            onClick={() => {
              const newProcess = {
                name: 'Nowy proces',
                cost: '0',
                unit: 'euro/szt',
                efficiency: '1'
              };
              actions.addCustomProcess(tab.id, newProcess);
            }}
            className={`px-3 py-1 rounded text-sm font-medium ${themeClasses.button.primary}`}
          >
            <Plus size={14} className="inline mr-1" />
            Dodaj proces
          </button>
        </div>

        {tab.customProcesses && tab.customProcesses.length > 0 ? (
          <div className="space-y-2">
            {tab.customProcesses.map((process) => (
              <div key={process.id} className={`flex gap-2 items-end p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                <div className="flex-1">
                  <label className={`block text-xs ${themeClasses.text.secondary}`}>Nazwa</label>
                  <input
                    type="text"
                    value={process.name}
                    onChange={(e) => actions.updateCustomProcess(tab.id, process.id, { name: e.target.value })}
                    className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                  />
                </div>
                <div className="w-24">
                  <label className={`block text-xs ${themeClasses.text.secondary}`}>Koszt</label>
                  <input
                    type="number"
                    value={process.cost}
                    onChange={(e) => actions.updateCustomProcess(tab.id, process.id, { cost: e.target.value })}
                    className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                  />
                </div>
                <div className="w-32">
                  <label className={`block text-xs ${themeClasses.text.secondary}`}>Jednostka</label>
                  <SelectInput
                    value={process.unit}
                    onChange={(value) => {
                      // Resetuj efficiency do 1 gdy zmieniamy jednostkę na inną niż euro/8h
                      if (value !== 'euro/8h') {
                        actions.updateCustomProcess(tab.id, process.id, { unit: value, efficiency: '1' });
                      } else {
                        actions.updateCustomProcess(tab.id, process.id, { unit: value });
                      }
                    }}
                    options={[
                      { value: 'euro/szt', label: '€/szt' },
                      { value: 'euro/kg', label: '€/kg' },
                      { value: 'euro/8h', label: '€/8h' }
                    ]}
                    themeClasses={themeClasses}
                  />
                </div>
                {process.unit === 'euro/8h' && (
                  <div className="w-24">
                    <label className={`block text-xs ${themeClasses.text.secondary}`}>Wydajność (szt/8h)</label>
                    <input
                      type="number"
                      value={process.efficiency}
                      onChange={(e) => actions.updateCustomProcess(tab.id, process.id, { efficiency: e.target.value })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      step="1"
                      min="1"
                    />
                  </div>
                )}
                <button
                  onClick={() => actions.removeCustomProcess(tab.id, process.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${themeClasses.text.secondary} text-center py-2`}>
            Brak procesów niestandardowych. Dodaj pierwszy proces powyżej.
          </p>
        )}
      </div>

      {/* Lista elementów */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
            Elementy do kalkulacji
          </h3>
          <button
            onClick={handleAddItem}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${themeClasses.button.primary}`}
          >
            <Plus size={16} className="inline mr-1" />
            Dodaj element
          </button>
        </div>

        {tab.items.map((item) => (
          <div key={item.id} className={`border rounded-lg p-4 space-y-3 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            {/* ID części - zawsze widoczne */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                ID części
              </label>
              <input
                type="text"
                value={item.partId}
                onChange={(e) => handleItemUpdate(item.id, { partId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                placeholder="np. ABC123"
              />
            </div>

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
                      onChange={(e) => handleItemUpdate(item.id, { weight: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="0"
                      step="0.1"
                    />
                    {item.results && item.weightOption !== 'netto' && (
                      <div className={`text-xs mt-1 ${themeClasses.text.secondary}`}>
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
                      onChange={(value) => handleItemUpdate(item.id, { weightOption: value })}
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
                        onChange={(e) => handleItemUpdate(item.id, { bruttoWeight: e.target.value })}
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
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            )}

            {tab.calculationType === 'volume' && (
              <VolumeModeFields
                item={item}
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                bruttoCurve={tab.editingCurves.bruttoWeight}
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
                  onChange={(e) => handleItemUpdate(item.id, { annualVolume: e.target.value })}
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
                  onChange={(e) => handleItemUpdate(item.id, { margin: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  min="0"
                  step="0.1"
                  placeholder="np. 20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Opcja czyszczenia
                </label>
                <SelectInput
                  value={item.cleaningOption}
                  onChange={(value) => handleItemUpdate(item.id, { cleaningOption: value })}
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
                  onChange={(value) => handleItemUpdate(item.id, { manualCleaningTime: value })}
                  min={0}
                  step={1}
                  themeClasses={themeClasses}
                />
              )}
            </div>

            {/* Krzywe niestandardowe */}
            {tab.customCurves && tab.customCurves.length > 0 && (
              <div className="space-y-2">
                <h4 className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Krzywe niestandardowe
                </h4>
                {tab.customCurves.map((curve) => {
                  const inputMode = curve.inputMode || 'x';
                  const autoBindSource = curve.autoBindSource || 'manual';
                  const isAutoBound = autoBindSource !== 'manual';

                  const inputLabel = inputMode === 'x'
                    ? `${curve.name} - wartość X (${curve.xUnit})`
                    : `${curve.name} - wartość Y (${curve.yUnit})`;
                  const outputUnit = inputMode === 'x' ? curve.yUnit : curve.xUnit;
                  const outputValue = inputMode === 'x'
                    ? item.results?.customCurveCosts?.[curve.id]?.interpolatedY
                    : item.results?.customCurveCosts?.[curve.id]?.interpolatedX;

                  const autoBindLabel = autoBindSource === 'weight' ? 'Waga netto' :
                                       autoBindSource === 'bruttoWeight' ? 'Waga brutto' : '';

                  return (
                    <div key={curve.id} className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs ${themeClasses.text.secondary}`}>
                          {curve.name}
                          {isAutoBound && <span className="ml-1 text-green-600">✓ {autoBindLabel}</span>}
                        </label>
                        {isAutoBound ? (
                          <div className={`w-full px-2 py-1 text-sm border rounded bg-gray-100 dark:bg-gray-700 ${themeClasses.text.secondary}`}>
                            Automatyczne
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={item.customCurveValues?.[curve.id]?.input || ''}
                            onChange={(e) => {
                              const newCustomCurveValues = {
                                ...(item.customCurveValues || {}),
                                [curve.id]: {
                                  input: e.target.value
                                }
                              };
                              handleItemUpdate(item.id, { customCurveValues: newCustomCurveValues });
                            }}
                            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                            step="0.1"
                            placeholder={inputLabel}
                          />
                        )}
                      </div>
                      <div className="flex items-end">
                        <div className={`px-2 py-1 text-sm ${themeClasses.text.secondary}`}>
                          → {outputValue
                            ? `${outputValue.toFixed(2)} ${outputUnit}`
                            : '-'}
                          <br />
                          <span className="font-semibold">
                            {item.results?.customCurveCosts?.[curve.id]?.cost
                              ? `${item.results.customCurveCosts[curve.id].cost.toFixed(3)} €`
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Wyniki kalkulacji */}
            {item.results && (
              <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className={themeClasses.text.secondary}>Materiał:</span>
                    <div className="font-mono">{item.results.materialCost.toFixed(2)} €</div>
                  </div>
                  <div>
                    <span className={themeClasses.text.secondary}>Pieczenie:</span>
                    <div className="font-mono">{item.results.bakingCost.toFixed(2)} €</div>
                  </div>
                  <div>
                    <span className={themeClasses.text.secondary}>Czyszczenie:</span>
                    <div className="font-mono">{item.results.cleaningCost.toFixed(2)} €</div>
                  </div>
                  {item.results.customCurvesCost > 0 && (
                    <div>
                      <span className={themeClasses.text.secondary}>Krzywe:</span>
                      <div className="font-mono">{item.results.customCurvesCost.toFixed(2)} €</div>
                    </div>
                  )}
                  <div>
                    <span className={themeClasses.text.secondary}>Całkowity:</span>
                    <div className="font-mono font-bold">{item.results.totalCost.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            )}

            {/* Przycisk usuwania */}
            {tab.items.length > 1 && (
              <div className="flex justify-end">
                <button
                  onClick={() => actions.removeItem(tab.id, item.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}