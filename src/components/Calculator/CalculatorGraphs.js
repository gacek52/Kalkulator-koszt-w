import React from 'react';
import { useCalculator } from '../../context/CalculatorContext';
import { EditableCurve } from '../Graphs/EditableCurve';

/**
 * Komponent z wykresami krzywych skalowania
 */
export function CalculatorGraphs({ tab, tabIndex, themeClasses, darkMode }) {
  const { actions } = useCalculator();

  const handleBakingCurveUpdate = (newCurveData) => {
    const updates = {
      editingCurves: {
        ...tab.editingCurves,
        baking: newCurveData.map(point => ({ weight: point.x, time: point.y }))
      }
    };

    // Przelicz wszystkie elementy po zmianie krzywej
    const updatedItems = tab.items.map(item => {
      if (item.weight) {
        const results = calculateItemCost(item, { ...tab, ...updates });
        return { ...item, results };
      }
      return item;
    });

    actions.updateTab(tab.id, { ...updates, items: updatedItems });
  };

  const handleCleaningCurveUpdate = (newCurveData) => {
    const updates = {
      editingCurves: {
        ...tab.editingCurves,
        cleaning: newCurveData.map(point => ({ weight: point.x, time: point.y }))
      }
    };

    // Przelicz wszystkie elementy po zmianie krzywej
    const updatedItems = tab.items.map(item => {
      if (item.weight) {
        const results = calculateItemCost(item, { ...tab, ...updates });
        return { ...item, results };
      }
      return item;
    });

    actions.updateTab(tab.id, { ...updates, items: updatedItems });
  };

  // Funkcja kalkulacji kosztów elementu (skopiowana z CalculatorForm)
  const calculateItemCost = (item, tabData) => {
    const weight = parseFloat(item.weight) || 0;
    if (weight === 0) return null;

    const materialCost = parseFloat(tabData.materialCost) || 0;
    const bakingCost = parseFloat(tabData.bakingCost) || 0;
    const cleaningCost = parseFloat(tabData.cleaningCost) || 0;
    const handlingCost = parseFloat(tabData.handlingCost) || 0;

    // Oblicz koszt materiału (€/kg -> €)
    const materialCost_total = (weight / 1000) * materialCost;

    // Interpolacja czasu pieczenia z krzywej
    const bakingTime = interpolateFromCurve(weight, tabData.editingCurves.baking);
    const bakingCost_total = (bakingTime / 3600) * (bakingCost / 8); // sekundy -> godziny -> koszt

    // Oblicz koszt czyszczenia
    let cleaningCost_total = 0;
    if (item.cleaningOption === 'scaled') {
      const cleaningTime = interpolateFromCurve(weight, tabData.editingCurves.cleaning);
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
          customProcessesCost += processCost * (weight / 1000) * efficiency;
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

    const totalCost = materialCost_total + bakingCost_total + cleaningCost_total + handlingCost_total + customProcessesCost;

    return {
      materialCost: materialCost_total,
      bakingCost: bakingCost_total,
      cleaningCost: cleaningCost_total,
      handlingCost: handlingCost_total,
      customProcessesCost,
      totalCost,
      bakingTime,
      cleaningTime: item.cleaningOption === 'scaled'
        ? interpolateFromCurve(weight, tabData.editingCurves.cleaning)
        : parseFloat(item.manualCleaningTime) || 0
    };
  };

  // Interpolacja liniowa z krzywej
  const interpolateFromCurve = (weight, curve) => {
    if (!curve || curve.length === 0) return 0;

    const sortedCurve = [...curve].sort((a, b) => a.weight - b.weight);

    if (weight <= sortedCurve[0].weight) return sortedCurve[0].time;
    if (weight >= sortedCurve[sortedCurve.length - 1].weight) return sortedCurve[sortedCurve.length - 1].time;

    for (let i = 0; i < sortedCurve.length - 1; i++) {
      if (weight >= sortedCurve[i].weight && weight <= sortedCurve[i + 1].weight) {
        const x1 = sortedCurve[i].weight;
        const y1 = sortedCurve[i].time;
        const x2 = sortedCurve[i + 1].weight;
        const y2 = sortedCurve[i + 1].time;

        const t = (weight - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
      }
    }

    return 0;
  };

  const handleHeatshieldPrepCurveUpdate = (newCurveData) => {
    const updates = {
      editingCurves: {
        ...tab.editingCurves,
        heatshieldPrep: newCurveData.map(point => ({ x: point.x, y: point.y }))
      }
    };
    actions.updateTab(tab.id, updates);
  };

  const handleHeatshieldLaserCurveUpdate = (newCurveData) => {
    const updates = {
      editingCurves: {
        ...tab.editingCurves,
        heatshieldLaser: newCurveData.map(point => ({ x: point.x, y: point.y }))
      }
    };
    actions.updateTab(tab.id, updates);
  };

  return (
    <div className={`${themeClasses.card} rounded-lg border p-6 space-y-8`}>
      <div>
        <h2 className={`text-xl font-semibold mb-2 ${themeClasses.text.primary}`}>
          Krzywe skalowania
        </h2>
        <p className={`text-sm ${themeClasses.text.secondary}`}>
          {tab.calculationType === 'heatshield'
            ? 'Edytowalne krzywe do automatycznego obliczania czasów i kosztów dla heatshield'
            : 'Edytowalne krzywe do automatycznego obliczania czasów pieczenia i czyszczenia'}
        </p>
      </div>

      <div className="space-y-8">
        {/* Krzywe dla trybów podstawowych */}
        {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
          <>
            {/* Krzywa pieczenia */}
            <EditableCurve
              curveData={tab.editingCurves.baking.map(point => ({ x: point.weight, y: point.time }))}
              onUpdateCurve={handleBakingCurveUpdate}
              title="🔥 Krzywa pieczenia"
              color="#EF4444"
              themeClasses={themeClasses}
              darkMode={darkMode}
              xLabel="Waga (g)"
              yLabel="Czas (sek)"
              interpolationType="linear"
            />

            {/* Krzywa czyszczenia */}
            <EditableCurve
              curveData={tab.editingCurves.cleaning.map(point => ({ x: point.weight, y: point.time }))}
              onUpdateCurve={handleCleaningCurveUpdate}
              title="🧽 Krzywa czyszczenia"
              color="#10B981"
              themeClasses={themeClasses}
              darkMode={darkMode}
              xLabel="Waga (g)"
              yLabel="Czas (sek)"
              interpolationType="linear"
            />
          </>
        )}

        {/* Krzywe dla trybu heatshield */}
        {tab.calculationType === 'heatshield' && (
          <>
            {/* Krzywa przygotówki */}
            <EditableCurve
              curveData={(tab.editingCurves.heatshieldPrep || []).map(point => ({ x: point.x, y: point.y }))}
              onUpdateCurve={handleHeatshieldPrepCurveUpdate}
              title="🔧 Krzywa przygotówki"
              color="#F59E0B"
              themeClasses={themeClasses}
              darkMode={darkMode}
              xLabel="Powierzchnia (m²)"
              yLabel="Czas (sek)"
              interpolationType="linear"
            />

            {/* Krzywa lasera */}
            <EditableCurve
              curveData={(tab.editingCurves.heatshieldLaser || []).map(point => ({ x: point.x, y: point.y }))}
              onUpdateCurve={handleHeatshieldLaserCurveUpdate}
              title="⚡ Krzywa cięcia laserowego"
              color="#8B5CF6"
              themeClasses={themeClasses}
              darkMode={darkMode}
              xLabel="Powierzchnia (m²)"
              yLabel="Cena (€)"
              interpolationType="linear"
            />
          </>
        )}
      </div>

      {/* Informacje pomocnicze */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-200 dark:border-blue-800`}>
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          💡 Jak używać krzywych:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Punkty na wykresie można edytować w tabeli obok</li>
          <li>• Aplikacja automatycznie interpoluje wartości między punktami</li>
          <li>• Dodawaj nowe punkty przyciskiem "Dodaj punkt"</li>
          <li>• Usuwaj niepotrzebne punkty (minimum 2 punkty musi zostać)</li>
          <li>• Zmiany krzywych automatycznie przeliczają wszystkie kalkulacje</li>
        </ul>
      </div>
    </div>
  );
}