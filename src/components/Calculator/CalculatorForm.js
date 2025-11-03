import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Settings, Copy, Truck, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { usePackaging } from '../../context/PackagingContext';
import { useMaterial, materialUtils } from '../../context/MaterialContext';
import { useWorkstation } from '../../context/WorkstationContext';
import { useTransport } from '../../context/TransportContext';
import { useClient } from '../../context/ClientContext';
import { NumberInput } from '../Common/NumberInput';
import { SelectInput } from '../Common/SelectInput';
import { CalculationTypeSelector } from './CalculationTypeSelector';
import { SurfaceModeFields } from './SurfaceModeFields';
import { VolumeModeFields } from './VolumeModeFields';
import { HeatshieldModeFields } from './HeatshieldModeFields';
import { MultilayerModeFields } from './MultilayerModeFields';
import { PackagingCalculation } from './PackagingCalculation';
import { ToolingSection } from './ToolingSection';
import { VolumeForecastSection } from './VolumeForecastSection';
import { WorkstationFields } from './WorkstationFields';

/**
 * Formularz kalkulacji materiałów i procesów
 */
export function CalculatorForm({ tab, tabs, tabIndex, globalSGA, calculationMeta, themeClasses, darkMode, onOpenSettings }) {
  const { actions } = useCalculator();
  const { state: packagingState } = usePackaging();
  const { state: materialState } = useMaterial();
  const { state: workstationState } = useWorkstation();
  const { state: transportState } = useTransport();
  const { state: clientState } = useClient();
  const [selectedMaterialTypeId, setSelectedMaterialTypeId] = useState('');
  const [collapsedItems, setCollapsedItems] = useState({});

  // Filtruj kompozycje dla wybranego typu
  const filteredCompositions = selectedMaterialTypeId
    ? materialUtils.getCompositionsByType(materialState, parseInt(selectedMaterialTypeId))
    : [];

  // Przelicz wszystkie items gdy zmienia się globalSGA lub parametry zakładki
  useEffect(() => {
    const updatedItems = tab.items.map(item => {
      // Przelicz jeśli item ma dane wejściowe w zależności od trybu
      const hasInputData = tab.calculationType === 'heatshield'
        ? (item.heatshield?.surfaceNetto)
        : tab.calculationType === 'multilayer'
        ? (item.multilayer?.layers?.length > 0)
        : item.weight;

      if (hasInputData && item.results) {
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
  }, [globalSGA, tab.materialCost, tab.bakingCost, tab.cleaningCost, tab.handlingCost, tab.prepCost]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Funkcja kalkulacji kosztów dla trybu multilayer
  const calculateMultilayerCost = (item, tabData, sga) => {
    const m = item.multilayer || {};

    if (!m.layers || m.layers.length === 0) return null;

    // Oblicz koszty materiałów dla wszystkich warstw
    let totalMaterialCost = 0;
    const layerCosts = {};

    m.layers.forEach(layer => {
      const price = parseFloat(layer.price) || 0;
      const priceUnit = layer.priceUnit || 'kg';
      const weightBrutto = parseFloat(layer.weightBrutto) || 0;
      const surfaceBrutto = parseFloat(layer.surfaceBrutto) || 0;

      let layerCost = 0;
      if (priceUnit === 'kg') {
        layerCost = (weightBrutto / 1000) * price;
      } else {
        layerCost = surfaceBrutto * price;
      }

      totalMaterialCost += layerCost;
      layerCosts[`layer_${layer.id}_cost`] = layerCost;
    });

    // Procesy - używamy krzywych globalnych lub per-warstwa
    // Na razie używamy podstawowych kosztów z tabData
    const bakingCost = parseFloat(tabData.bakingCost) || 0;
    const cleaningCost = parseFloat(tabData.cleaningCost) || 0;
    const handlingCost = parseFloat(tabData.handlingCost) || 0;

    // Suma wag wszystkich warstw dla procesów - używamy BRUTTO (za cały materiał trzeba zapłacić)
    const totalWeightNetto = m.layers.reduce((sum, l) => sum + (parseFloat(l.weightNetto) || 0), 0);
    const totalWeightBrutto = m.layers.reduce((sum, l) => sum + (parseFloat(l.weightBrutto) || 0), 0);
    const totalWeight = Math.max(totalWeightNetto, totalWeightBrutto);

    // Interpolacja z krzywych bazując na całkowitej wadze brutto
    const bakingTime = interpolateFromCurve(totalWeight, tabData.editingCurves.baking);
    const bakingCost_total = (bakingTime / 3600) * (bakingCost / 8);

    const cleaningTime = interpolateFromCurve(totalWeight, tabData.editingCurves.cleaning);
    const cleaningCost_total = (cleaningTime / 3600) * (cleaningCost / 8);

    const handlingCost_total = handlingCost;

    // Krzywe niestandardowe - dla trybu multilayer
    let customCurvesCost = 0;
    const customCurveCosts = {};
    const layerCurveCosts = {};

    if (tabData.customCurves && tabData.customCurves.length > 0) {
      // Podziel warstwy na grupy: per-layer i global
      const layersWithLayerScope = m.layers.filter(l => l.curveScope === 'layer');
      const layersWithGlobalScope = m.layers.filter(l => l.curveScope !== 'layer'); // domyślnie global

      // 1. Oblicz krzywe per-warstwa dla warstw z curveScope='layer'
      layersWithLayerScope.forEach(layer => {
        layerCurveCosts[layer.id] = {};

        tabData.customCurves.forEach(curve => {
          const inputMode = curve.inputMode || 'x';
          const curveValues = layer.customCurveValues?.[curve.id] || {};
          const dataSource = curveValues.source || 'manual';

          let inputValue;
          if (dataSource === 'manual') {
            inputValue = parseFloat(curveValues.input);
          } else if (dataSource === 'weightNetto') {
            inputValue = parseFloat(layer.weightNetto) || 0;
            if (curve.xUnit === 'kg') inputValue = inputValue / 1000;
          } else if (dataSource === 'weightBrutto') {
            inputValue = parseFloat(layer.weightBrutto) || 0;
            if (curve.xUnit === 'kg') inputValue = inputValue / 1000;
          } else if (dataSource === 'surfaceNetto') {
            let surfaceInM2 = parseFloat(layer.surfaceNetto) || 0;
            if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
            else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
            else inputValue = surfaceInM2;
          } else if (dataSource === 'surfaceBrutto') {
            let surfaceInM2 = parseFloat(layer.surfaceBrutto) || 0;
            if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
            else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
            else inputValue = surfaceInM2;
          }

          if (!isNaN(inputValue) && inputValue > 0) {
            let interpolatedX, interpolatedY;
            if (inputMode === 'x') {
              interpolatedX = inputValue;
              interpolatedY = interpolateFromCurve(inputValue, curve.points);
            } else {
              interpolatedY = inputValue;
              interpolatedX = reverseInterpolateFromCurve(inputValue, curve.points);
            }

            const yCost = parseFloat(curve.yCost) || 0;
            let cost = 0;
            if (curve.yUnit === 'sek') cost = (interpolatedY / 3600) * yCost;
            else if (curve.yUnit === 'min') cost = (interpolatedY / 60) * yCost;
            else if (curve.yUnit === 'h') cost = interpolatedY * yCost;
            else if (curve.yUnit === 'g') cost = (interpolatedY / 1000) * yCost;
            else if (curve.yUnit === 'kg') cost = interpolatedY * yCost;
            else cost = interpolatedY * yCost;

            customCurvesCost += cost;
            layerCurveCosts[layer.id][curve.id] = { interpolatedX, interpolatedY, cost, inputMode };
          }
        });
      });

      // 2. Oblicz krzywe globalnie dla warstw z curveScope='global'
      if (layersWithGlobalScope.length > 0) {
        // Oblicz sumy dla warstw globalnych
        const globalWeightNetto = layersWithGlobalScope.reduce((sum, l) => sum + (parseFloat(l.weightNetto) || 0), 0);
        const globalWeightBrutto = layersWithGlobalScope.reduce((sum, l) => sum + (parseFloat(l.weightBrutto) || 0), 0);
        const globalSurfaceNetto = layersWithGlobalScope.reduce((sum, l) => sum + (parseFloat(l.surfaceNetto) || 0), 0);
        const globalSurfaceBrutto = layersWithGlobalScope.reduce((sum, l) => sum + (parseFloat(l.surfaceBrutto) || 0), 0);

        tabData.customCurves.forEach(curve => {
          const inputMode = curve.inputMode || 'x';
          const curveValues = item.customCurveValues?.[curve.id] || {};
          const dataSource = curveValues.source || 'manual';

          let inputValue;
          if (dataSource === 'manual') {
            inputValue = parseFloat(curveValues.input);
          } else if (dataSource === 'weightNetto') {
            inputValue = globalWeightNetto;
            if (curve.xUnit === 'kg') inputValue = globalWeightNetto / 1000;
          } else if (dataSource === 'weightBrutto') {
            inputValue = globalWeightBrutto;
            if (curve.xUnit === 'kg') inputValue = globalWeightBrutto / 1000;
          } else if (dataSource === 'surfaceNetto') {
            let surfaceInM2 = globalSurfaceNetto;
            if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
            else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
            else inputValue = surfaceInM2;
          } else if (dataSource === 'surfaceBrutto') {
            let surfaceInM2 = globalSurfaceBrutto;
            if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
            else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
            else inputValue = surfaceInM2;
          }

          if (!isNaN(inputValue) && inputValue > 0) {
            let interpolatedX, interpolatedY;
            if (inputMode === 'x') {
              interpolatedX = inputValue;
              interpolatedY = interpolateFromCurve(inputValue, curve.points);
            } else {
              interpolatedY = inputValue;
              interpolatedX = reverseInterpolateFromCurve(inputValue, curve.points);
            }

            const yCost = parseFloat(curve.yCost) || 0;
            let cost = 0;
            if (curve.yUnit === 'sek') cost = (interpolatedY / 3600) * yCost;
            else if (curve.yUnit === 'min') cost = (interpolatedY / 60) * yCost;
            else if (curve.yUnit === 'h') cost = interpolatedY * yCost;
            else if (curve.yUnit === 'g') cost = (interpolatedY / 1000) * yCost;
            else if (curve.yUnit === 'kg') cost = interpolatedY * yCost;
            else cost = interpolatedY * yCost;

            customCurvesCost += cost;
            customCurveCosts[curve.id] = { interpolatedX, interpolatedY, cost, inputMode };
          }
        });
      }
    }

    // Koszty stanowisk produkcyjnych (tak jak w heatshield)
    const workstationsResult = calculateWorkstationsCost(item);
    const workstationsCost_total = workstationsResult.total;
    const workstationCosts = workstationsResult.costs;

    // Procesy niestandardowe - dla trybu multilayer
    // Te koszty są niezależne od ilości i zawartości warstw - dodawane "on top"
    let customProcessesCost = 0;
    if (tabData.customProcesses) {
      tabData.customProcesses.forEach(process => {
        const processCost = parseFloat(process.cost) || 0;
        const efficiency = parseFloat(process.efficiency) || 1;

        switch (process.unit) {
          case 'euro/szt':
            // Koszt per sztuka - dodawany bezpośrednio
            customProcessesCost += processCost;
            break;
          case 'euro/kg':
            // Koszt per kg - używamy całkowitej wagi brutto wszystkich warstw
            customProcessesCost += processCost * (totalWeightBrutto / 1000);
            break;
          case 'euro/8h':
            // Dla euro/8h: efficiency = ile części na zmianę, więc koszt = processCost / efficiency
            if (efficiency > 0) {
              customProcessesCost += processCost / efficiency;
            }
            break;
          default:
            // Domyślnie euro/szt
            customProcessesCost += processCost;
            break;
        }
      });
    }

    const totalCost = totalMaterialCost + bakingCost_total + cleaningCost_total + handlingCost_total + customCurvesCost + workstationsCost_total + customProcessesCost;

    // Oblicz cenę z marżą
    const margin = parseFloat(item.margin) || 0;
    const totalWithMargin = totalCost * (1 + margin / 100);

    // Oblicz finalną cenę z SG&A
    const sgaPercent = parseFloat(sga) || 0;
    const totalWithSGA = totalWithMargin * (1 + sgaPercent / 100);

    // Oblicz koszt transportu (dodawany ON TOP po SG&A)
    const transportCost = calculateTransportCost(item, tabData);

    // Finalny koszt łączny = totalWithSGA + transport (NIE mnożone przez marżę ani SG&A)
    const finalTotalCost = totalWithSGA + transportCost;

    return {
      materialCost: totalMaterialCost,
      bakingCost: bakingCost_total,
      cleaningCost: cleaningCost_total,
      handlingCost: handlingCost_total,
      workstationsCost: workstationsCost_total, // Dodany koszt stanowisk
      workstationCosts, // Szczegóły per stanowisko
      customProcessesCost, // Dodany koszt procesów niestandardowych
      customCurvesCost,
      customCurveCosts,
      layerCurveCosts, // Wyniki krzywych per-warstwa
      ...layerCosts, // Dodaj koszty poszczególnych warstw
      transportCost, // Koszt transportu
      totalCost,
      totalWithMargin,
      totalWithSGA,
      finalTotalCost, // Koszt końcowy z transportem
      nettoWeight: totalWeight,
      bruttoWeight: totalWeight,
      bakingTime,
      cleaningTime
    };
  };

  // Funkcja kalkulacji kosztów dla trybu heatshield
  const calculateHeatshieldCost = (item, tabData, sga) => {
    const h = item.heatshield || {};

    const surfaceNetto = parseFloat(h.surfaceNetto) || 0;
    if (surfaceNetto === 0) return null;

    // Pobierz parametry materiałów
    const surfaceBruttoSheet = parseFloat(h.surfaceBruttoSheet) || 0;
    const surfaceNettoMat = parseFloat(h.surfaceNettoMat) || 0;
    const sheetWeight = parseFloat(h.sheetWeight) || 0;
    const matWeight = parseFloat(h.matWeight) || 0;

    const sheetPrice = parseFloat(h.sheetPrice) || 0;
    const matPrice = parseFloat(h.matPrice) || 0;
    const sheetPriceUnit = h.sheetPriceUnit || 'kg';
    const matPriceUnit = h.matPriceUnit || 'm2';

    // Oblicz koszty materiałów
    let sheetCost = 0;
    if (sheetPriceUnit === 'kg') {
      sheetCost = (sheetWeight / 1000) * sheetPrice; // waga w gramach -> kg
    } else {
      sheetCost = surfaceBruttoSheet * sheetPrice; // powierzchnia w m²
    }

    let matCost = 0;
    if (matPriceUnit === 'kg') {
      matCost = (matWeight / 1000) * matPrice;
    } else {
      matCost = surfaceNettoMat * matPrice;
    }

    const materialCost_total = sheetCost + matCost;

    // Procesy standardowe
    const bendingCost = parseFloat(h.bendingCost) || 0;
    const joiningCost = parseFloat(h.joiningCost) || 0;
    const gluingCost = parseFloat(h.gluingCost) || 0;

    // Dla procesów używamy większej powierzchni (brutto blachy jeśli większa)
    // Za cały materiał trzeba zapłacić
    const surfaceForProcesses = Math.max(surfaceNetto, surfaceBruttoSheet);

    // Laser - interpolacja z krzywej (powierzchnia -> cena w €)
    const laserCost_total = interpolateFromCurve(surfaceForProcesses, tabData.editingCurves.heatshieldLaser || []);

    // Koszty stanowisk produkcyjnych (zastępuje prepCost)
    const workstationsResult = calculateWorkstationsCost(item);
    const workstationsCost_total = workstationsResult.total;
    const workstationCosts = workstationsResult.costs;

    // Procesy niestandardowe - dla trybu heatshield
    let customProcessesCost = 0;
    if (tabData.customProcesses) {
      tabData.customProcesses.forEach(process => {
        const processCost = parseFloat(process.cost) || 0;
        const efficiency = parseFloat(process.efficiency) || 1;

        switch (process.unit) {
          case 'euro/szt':
            customProcessesCost += processCost * efficiency;
            break;
          case 'euro/kg':
            // Używamy całkowitej wagi (blacha + mata)
            const totalWeight = sheetWeight + matWeight;
            customProcessesCost += processCost * (totalWeight / 1000) * efficiency;
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
    }

    // Krzywe niestandardowe - dla trybu heatshield
    let customCurvesCost = 0;
    const customCurveCosts = {};
    if (tabData.customCurves) {
      tabData.customCurves.forEach(curve => {
        const inputMode = curve.inputMode || 'x';
        const curveValues = item.customCurveValues?.[curve.id] || {};
        const dataSource = curveValues.source || 'manual';

        let inputValue;
        if (dataSource === 'manual') {
          inputValue = parseFloat(curveValues.input);
        } else if (dataSource === 'weightNetto') {
          inputValue = sheetWeight;
          if (curve.xUnit === 'kg') inputValue = sheetWeight / 1000;
        } else if (dataSource === 'weightBrutto') {
          inputValue = sheetWeight + matWeight;
          if (curve.xUnit === 'kg') inputValue = (sheetWeight + matWeight) / 1000;
        } else if (dataSource === 'surfaceNetto') {
          let surfaceInM2 = surfaceNetto;
          if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
          else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
          else inputValue = surfaceInM2;
        } else if (dataSource === 'surfaceBrutto') {
          let surfaceInM2 = surfaceBruttoSheet;
          if (curve.xUnit === 'mm2') inputValue = surfaceInM2 * 1000000;
          else if (curve.xUnit === 'cm2') inputValue = surfaceInM2 * 10000;
          else inputValue = surfaceInM2;
        }

        if (!isNaN(inputValue) && inputValue > 0) {
          let interpolatedX, interpolatedY;
          if (inputMode === 'x') {
            interpolatedX = inputValue;
            interpolatedY = interpolateFromCurve(inputValue, curve.points);
          } else {
            interpolatedY = inputValue;
            interpolatedX = reverseInterpolateFromCurve(inputValue, curve.points);
          }

          const yCost = parseFloat(curve.yCost) || 0;
          let cost = 0;
          if (curve.yUnit === 'sek') cost = (interpolatedY / 3600) * yCost;
          else if (curve.yUnit === 'min') cost = (interpolatedY / 60) * yCost;
          else if (curve.yUnit === 'h') cost = interpolatedY * yCost;
          else if (curve.yUnit === 'g') cost = (interpolatedY / 1000) * yCost;
          else if (curve.yUnit === 'kg') cost = interpolatedY * yCost;
          else cost = interpolatedY * yCost;

          customCurvesCost += cost;
          customCurveCosts[curve.id] = { interpolatedX, interpolatedY, cost, inputMode };
        }
      });
    }

    const totalCost = materialCost_total + workstationsCost_total + laserCost_total + bendingCost + joiningCost + gluingCost + customProcessesCost + customCurvesCost;

    // Oblicz cenę z marżą
    const margin = parseFloat(item.margin) || 0;
    const totalWithMargin = totalCost * (1 + margin / 100);

    // Oblicz finalną cenę z SG&A
    const sgaPercent = parseFloat(sga) || 0;
    const totalWithSGA = totalWithMargin * (1 + sgaPercent / 100);

    // Oblicz koszt transportu (dodawany ON TOP po SG&A)
    const transportCost = calculateTransportCost(item, tabData);

    // Finalny koszt łączny = totalWithSGA + transport (NIE mnożone przez marżę ani SG&A)
    const finalTotalCost = totalWithSGA + transportCost;

    return {
      materialCost: materialCost_total,
      workstationsCost: workstationsCost_total, // Nowy koszt stanowisk (zastępuje prepCost)
      workstationCosts, // Szczegóły per stanowisko
      laserCost: laserCost_total,
      bendingCost,
      joiningCost,
      gluingCost,
      customProcessesCost, // Dodany koszt procesów niestandardowych
      customCurvesCost,
      customCurveCosts,
      transportCost, // Koszt transportu
      totalCost,
      totalWithMargin,
      totalWithSGA,
      finalTotalCost, // Koszt końcowy z transportem
      nettoWeight: sheetWeight, // waga blachy brutto
      bruttoWeight: matWeight  // waga maty brutto
    };
  };

  // Funkcja kalkulacji kosztów elementu
  // Oblicz koszt pakowania per detal
  const calculatePackagingCost = (item) => {
    if (!item.packaging) return 0;

    const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
    const layers = parseFloat(item.packaging.layers) || 0;

    const partsInBox = item.packaging.manualPartsInBox
      ? parseFloat(item.packaging.partsInBox) || 0
      : partsPerLayer * layers;

    if (partsInBox === 0) return 0;

    // Dla niestandardowej kompozycji
    if (item.packaging.compositionId === 'custom') {
      const customPrice = parseFloat(item.packaging.customPrice) || 0;
      return customPrice / partsInBox;
    }

    // Dla standardowej kompozycji
    if (!item.packaging.compositionId) return 0;

    const composition = packagingState.compositions.find(
      c => c.id == item.packaging.compositionId
    );

    if (!composition) return 0;

    const partsPerPallet = partsInBox * composition.packagesPerPallet;
    const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

    return composition.compositionCost / partsPerSpace;
  };

  // Oblicz koszt stanowisk produkcyjnych
  const calculateWorkstationsCost = (item) => {
    if (!item.workstations || item.workstations.length === 0) return { total: 0, costs: {} };

    let totalWorkstationCost = 0;
    const workstationCosts = {};

    item.workstations.forEach(ws => {
      let cost = 0;

      if (ws.costMode === 'manual' && ws.manualCost) {
        // Użyj ręcznego kosztu
        cost = parseFloat(ws.manualCost) || 0;
      } else if (ws.workstationId && ws.efficiency) {
        // Oblicz automatycznie
        const workstation = workstationState.workstations.find(w => w.id === ws.workstationId);
        if (workstation) {
          const efficiency = parseFloat(ws.efficiency) || 0;
          const costPer8h = parseFloat(workstation.costPer8h) || 0;
          cost = efficiency > 0 ? (costPer8h / efficiency) : 0;
        }
      }

      totalWorkstationCost += cost;
      workstationCosts[ws.id] = {
        cost,
        mode: ws.costMode || 'auto',
        name: ws.name || `Stanowisko ${ws.id}`
      };
    });

    return { total: totalWorkstationCost, costs: workstationCosts };
  };

  // Funkcja obliczania kosztu transportu dla pojedynczego detalu (odczyt z calculationMeta, nie z zakładki)
  const calculateTransportCost = (item, tabData) => {
    // Jeśli transport nie jest włączony
    if (!calculationMeta.transport || !calculationMeta.transport.enabled) {
      return 0;
    }

    // Jeśli brak wybranego typu transportu
    if (!calculationMeta.transport.transportTypeId) {
      return 0;
    }

    // Pobierz typ transportu
    const transportType = transportState.types && transportState.types.find(t => t.id == calculationMeta.transport.transportTypeId);
    if (!transportType) {
      return 0;
    }

    // Pobierz odległość
    let distance = 0;
    if (calculationMeta.transport.distanceSource === 'client') {
      distance = parseFloat(calculationMeta.transport.clientDistance) || 0;
    } else {
      distance = parseFloat(calculationMeta.transport.manualDistance) || 0;
    }

    if (distance === 0) {
      return 0;
    }

    // Pobierz dane pakowania
    if (!item.packaging || !item.packaging.compositionId) {
      // Brak pakowania - nie można obliczyć kosztu transportu
      return 0;
    }

    // Dla niestandardowej kompozycji nie obliczamy transportu
    if (item.packaging.compositionId === 'custom') {
      return 0;
    }

    // Pobierz kompozycję pakowania
    const composition = packagingState.compositions.find(
      c => c.id == item.packaging.compositionId
    );

    if (!composition) {
      return 0;
    }

    // KROK 1: Oblicz koszt transportu na miejsce paletowe
    const totalTransportCost = transportType.pricePerKm * distance;
    const costPerSpace = totalTransportCost / transportType.palletSpaces;

    // KROK 2: Oblicz ile detali mieści się w jednym miejscu paletowym
    const partsInBox = item.packaging.manualPartsInBox
      ? parseFloat(item.packaging.partsInBox) || 0
      : (parseFloat(item.packaging.partsPerLayer) || 0) * (parseFloat(item.packaging.layers) || 0);

    if (partsInBox === 0) {
      return 0;
    }

    const partsPerPallet = partsInBox * composition.packagesPerPallet;
    const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

    if (partsPerSpace === 0) {
      return 0;
    }

    // KROK 3: Oblicz koszt transportu na jeden detal
    const transportCostPerDetail = costPerSpace / partsPerSpace;

    return transportCostPerDetail;
  };

  const calculateItemCost = (item, tabData, sga) => {
    // Specjalna obsługa trybu heatshield
    if (tabData.calculationType === 'heatshield') {
      return calculateHeatshieldCost(item, tabData, sga);
    }

    // Specjalna obsługa trybu multilayer
    if (tabData.calculationType === 'multilayer') {
      return calculateMultilayerCost(item, tabData, sga);
    }

    const nettoWeight = parseFloat(item.weight) || 0;
    if (nettoWeight === 0) return null;

    // Oblicz wagę brutto w zależności od opcji i trybu
    let bruttoWeight = nettoWeight;

    if (tabData.calculationType === 'surface') {
      // W trybie surface bruttoWeight jest obliczane w SurfaceModeFields z arkusza
      bruttoWeight = parseFloat(item.bruttoWeight) || nettoWeight;
    } else if (item.weightOption === 'brutto-auto') {
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
      const surfaceNetto = item.surfaceUnit === 'mm2'
        ? (parseFloat(item.surfaceArea) || 0) / 1000000
        : (parseFloat(item.surfaceArea) || 0);

      // Używamy większej powierzchni (brutto jeśli dostępna i większa)
      const surfaceForCost = surfaceBrutto > surfaceNetto ? surfaceBrutto : surfaceNetto;
      materialCost_total = surfaceForCost * materialCost;
    } else {
      // Domyślnie: cena za kg (używamy wagi brutto)
      materialCost_total = (bruttoWeight / 1000) * materialCost;
    }

    // Dla procesów (pieczenie, czyszczenie) ZAWSZE używamy większej wartości (brutto jeśli dostępna)
    // W trybie surface item.bruttoWeight jest obliczane z surfaceBrutto
    // Za całość materiału trzeba zapłacić, więc bierzemy większą wartość
    const weightForProcesses = Math.max(bruttoWeight, nettoWeight);

    // Interpolacja czasu pieczenia z krzywej - używamy wagi brutto dla procesów
    const bakingTime = interpolateFromCurve(weightForProcesses, tabData.editingCurves.baking);
    const bakingCost_total = (bakingTime / 3600) * (bakingCost / 8); // sekundy -> godziny -> koszt

    // Oblicz koszt czyszczenia - używamy wagi brutto
    let cleaningCost_total = 0;
    if (item.cleaningOption === 'scaled') {
      const cleaningTime = interpolateFromCurve(weightForProcesses, tabData.editingCurves.cleaning);
      cleaningCost_total = (cleaningTime / 3600) * (cleaningCost / 8);
    } else {
      const manualTime = parseFloat(item.manualCleaningTime) || 0;
      cleaningCost_total = (manualTime / 3600) * (cleaningCost / 8);
    }

    // Koszt obsługi (fallback gdy brak stanowisk)
    const handlingCost_total = handlingCost;

    // Koszty stanowisk produkcyjnych (zastępuje handlingCost jeśli są stanowiska)
    const workstationsResult = calculateWorkstationsCost(item);
    const workstationsCost_total = workstationsResult.total;
    const workstationCosts = workstationsResult.costs;

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
          // Używamy wagi brutto (weightForProcesses) - za całość materiału trzeba zapłacić
          customProcessesCost += processCost * (weightForProcesses / 1000) * efficiency;
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
        const curveValues = item.customCurveValues?.[curve.id] || {};
        const dataSource = curveValues.source || 'manual';

        // Pobierz wartość wejściową na podstawie wybranego źródła
        let inputValue;

        if (dataSource === 'manual') {
          // Ręczne wprowadzanie
          inputValue = parseFloat(curveValues.input);
        } else if (dataSource === 'weightNetto') {
          // Waga netto w gramach
          inputValue = nettoWeight;
          // Konwertuj do jednostki X krzywej jeśli potrzeba
          if (curve.xUnit === 'kg') {
            inputValue = nettoWeight / 1000; // g → kg
          }
        } else if (dataSource === 'weightBrutto') {
          // Waga brutto w gramach
          inputValue = bruttoWeight;
          // Konwertuj do jednostki X krzywej jeśli potrzeba
          if (curve.xUnit === 'kg') {
            inputValue = bruttoWeight / 1000; // g → kg
          }
        } else if (dataSource === 'surfaceNetto') {
          // Powierzchnia netto - pobierz z odpowiedniego miejsca w zależności od trybu
          let surfaceInM2 = 0;
          if (tabData.calculationType === 'heatshield') {
            surfaceInM2 = parseFloat(item.heatshield?.surfaceNetto) || 0;
          } else if (tabData.calculationType === 'surface') {
            const surfaceArea = parseFloat(item.surfaceArea) || 0;
            if (item.surfaceUnit === 'mm2') {
              surfaceInM2 = surfaceArea / 1000000; // mm² → m²
            } else {
              surfaceInM2 = surfaceArea; // już w m²
            }
          } else if (tabData.calculationType === 'multilayer') {
            // Suma powierzchni netto wszystkich warstw
            item.multilayer?.layers?.forEach(layer => {
              const layerSurface = parseFloat(layer.surfaceNetto) || 0;
              surfaceInM2 += layerSurface;
            });
          }
          // Konwertuj m² do jednostki X krzywej jeśli potrzeba
          if (curve.xUnit === 'mm2') {
            inputValue = surfaceInM2 * 1000000; // m² → mm²
          } else if (curve.xUnit === 'cm2') {
            inputValue = surfaceInM2 * 10000; // m² → cm²
          } else {
            inputValue = surfaceInM2; // m²
          }
        } else if (dataSource === 'surfaceBrutto') {
          // Powierzchnia brutto - pobierz z odpowiedniego miejsca w zależności od trybu
          let surfaceInM2 = 0;
          if (tabData.calculationType === 'heatshield') {
            surfaceInM2 = parseFloat(item.heatshield?.surfaceBruttoSheet) || 0;
          } else if (tabData.calculationType === 'surface') {
            surfaceInM2 = parseFloat(item.surfaceBrutto) || 0;
          } else if (tabData.calculationType === 'multilayer') {
            // Suma powierzchni brutto wszystkich warstw
            item.multilayer?.layers?.forEach(layer => {
              const layerSurface = parseFloat(layer.surfaceBrutto) || 0;
              surfaceInM2 += layerSurface;
            });
          }
          // Konwertuj m² do jednostki X krzywej jeśli potrzeba
          if (curve.xUnit === 'mm2') {
            inputValue = surfaceInM2 * 1000000; // m² → mm²
          } else if (curve.xUnit === 'cm2') {
            inputValue = surfaceInM2 * 10000; // m² → cm²
          } else {
            inputValue = surfaceInM2; // m²
          }
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

    // Koszt pakowania
    const packagingCost = calculatePackagingCost(item);

    // Użyj kosztów stanowisk jeśli są, w przeciwnym razie użyj handlingCost
    const finalHandlingOrWorkstationsCost = workstationsCost_total > 0 ? workstationsCost_total : handlingCost_total;

    const totalCost = materialCost_total + bakingCost_total + cleaningCost_total + finalHandlingOrWorkstationsCost + customProcessesCost + customCurvesCost + packagingCost;

    // Oblicz cenę z marżą
    const margin = parseFloat(item.margin) || 0;
    const totalWithMargin = totalCost * (1 + margin / 100);

    // Oblicz finalną cenę z SG&A
    const sgaPercent = parseFloat(sga) || 0;
    const totalWithSGA = totalWithMargin * (1 + sgaPercent / 100);

    // Oblicz koszt transportu (dodawany ON TOP po SG&A)
    const transportCost = calculateTransportCost(item, tabData);

    // Finalny koszt łączny = totalWithSGA + transport (NIE mnożone przez marżę ani SG&A)
    const finalTotalCost = totalWithSGA + transportCost;

    return {
      materialCost: materialCost_total,
      bakingCost: bakingCost_total,
      cleaningCost: cleaningCost_total,
      handlingCost: handlingCost_total,
      workstationsCost: workstationsCost_total, // Nowy koszt stanowisk
      workstationCosts, // Szczegóły per stanowisko
      customProcessesCost,
      customCurvesCost,
      customCurveCosts,
      packagingCost,
      transportCost, // Koszt transportu
      totalCost,
      totalWithMargin,
      totalWithSGA,
      finalTotalCost, // Koszt końcowy z transportem
      nettoWeight,
      bruttoWeight,
      bakingTime,
      cleaningTime: item.cleaningOption === 'scaled'
        ? interpolateFromCurve(nettoWeight, tabData.editingCurves.cleaning)
        : parseFloat(item.manualCleaningTime) || 0
    };
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

  // Sprawdza czy zakładka ma wypełnione dane wprowadzone przez użytkownika
  const hasTabData = () => {
    // Sprawdzamy tylko rzeczywiste dane wprowadzone przez użytkownika w items
    // Pomijamy puste stringi i undefined
    const hasItemData = tab.items.some(item => {
      // Podstawowe pola (pomijamy puste wartości)
      if (item.weight && item.weight !== '') return true;
      if (item.partId && item.partId !== '') return true;
      if (item.annualVolume && item.annualVolume !== '') return true;
      if (item.margin && item.margin !== '') return true;

      // Pola dla trybu surface
      if (item.surfaceNetto && item.surfaceNetto !== '') return true;
      if (item.surfaceBrutto && item.surfaceBrutto !== '') return true;
      if (item.sheetLength && item.sheetLength !== '') return true;
      if (item.sheetWidth && item.sheetWidth !== '') return true;
      if (item.partsPerSheet && item.partsPerSheet !== '') return true;

      // Pola dla trybu volume
      if (item.volumeLength && item.volumeLength !== '') return true;
      if (item.volumeWidth && item.volumeWidth !== '') return true;
      if (item.volumeHeight && item.volumeHeight !== '') return true;

      // Pola dla trybu heatshield (pomijamy domyślne wartości)
      if (item.heatshield) {
        const h = item.heatshield;
        if (h.surfaceNettoInput && h.surfaceNettoInput !== '') return true;
        if (h.sheetThickness && h.sheetThickness !== '') return true;
        if (h.sheetPrice && h.sheetPrice !== '') return true;
        if (h.matThickness && h.matThickness !== '') return true;
        if (h.matDensity && h.matDensity !== '') return true;
        if (h.matPrice && h.matPrice !== '') return true;
        if (h.gluingCost && h.gluingCost !== '') return true;
        // Pomijamy sheetDensity, bendingCost i joiningCost bo mają wartości domyślne
      }

      // Pola dla trybu multilayer
      if (item.multilayer?.layers && item.multilayer.layers.length > 0) {
        return item.multilayer.layers.some(layer => {
          if (layer.surfaceNettoInput && layer.surfaceNettoInput !== '') return true;
          if (layer.thickness && layer.thickness !== '') return true;
          if (layer.density && layer.density !== '') return true;
          if (layer.price && layer.price !== '') return true;
          if (layer.sheetLength && layer.sheetLength !== '') return true;
          if (layer.sheetWidth && layer.sheetWidth !== '') return true;
          if (layer.partsPerSheet && layer.partsPerSheet !== '') return true;
          return false;
        });
      }

      return false;
    });

    return hasItemData;
  };

  // Resetuje zakładkę do stanu początkowego
  const handleResetTab = () => {
    // Dla trybu Heatshield: szukaj stanowiska "Gilotyna" i dodaj je automatycznie
    let initialWorkstations = [];
    let nextWsId = 1;

    if (tab.calculationType === 'heatshield') {
      const gilotynaWorkstation = workstationState.workstations.find(ws =>
        ws.name.toLowerCase().includes('gilotyna') || ws.name.toLowerCase().includes('guillotine')
      );

      if (gilotynaWorkstation) {
        initialWorkstations = [{
          id: 1,
          workstationId: gilotynaWorkstation.id,
          efficiency: '',
          name: 'Gilotyna',
          costMode: 'auto',
          manualCost: ''
        }];
        nextWsId = 2;
      }
    }

    // Resetuj tylko items do domyślnego stanu
    // Zachowaj wszystkie parametry zakładki (koszty, krzywe, procesy)
    actions.updateTab(tab.id, {
      items: [{
        id: 1,
        partId: '',
        weight: '',
        margin: '',
        annualVolume: '',
        weightOption: 'netto',
        cleaningOption: 'scaled',
        bruttoWeight: '',
        manualCleaningTime: '',
        customValues: {},
        customCurveValues: {},
        results: null,
        // Pola dla stanowisk produkcyjnych
        workstation: {
          id: null,
          efficiency: ''
        },
        // Nowa struktura dla wielu stanowisk (zastępuje stare workstation)
        workstations: initialWorkstations,
        nextWorkstationId: nextWsId,
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
        volumeWeightOption: 'brutto-auto',
        // Pola dla trybu HEATSHIELD
        heatshield: {
          surfaceNettoInput: '',
          surfaceNetto: '',
          surfaceUnit: 'mm2',
          sheetThickness: '',
          sheetDensity: '',
          sheetPrice: '',
          sheetPriceUnit: 'kg',
          matThickness: '',
          matDensity: '',
          matPrice: '',
          matPriceUnit: 'm2',
          bendingCost: '',
          joiningCost: '0',
          gluingCost: '',
          surfaceBruttoSheet: '',
          surfaceNettoSheet: '',
          surfaceNettoMat: '',
          sheetWeight: '',
          matWeight: ''
        },
        // Pola dla trybu MULTILAYER
        multilayer: {
          layers: []
        }
      }],
      nextItemId: 2
    });
  };

  // Obsługa wyboru kompozycji materiału dla zakładki
  const handleMaterialCompositionSelect = (compositionId) => {
    if (!compositionId) return;

    const composition = materialUtils.getCompositionWithDetails(materialState, parseInt(compositionId));
    if (composition) {
      const updates = {
        selectedMaterialCompositionId: composition.id,
        materialCost: composition.pricePerKg.toString()
      };

      // Jeśli zakładka nie ma custom name, zmień nazwę na nazwę materiału
      if (!tab.isCustomName) {
        updates.name = composition.displayName;
      }

      // Dla trybu POWIERZCHNIA, uzupełnij parametry materiału we wszystkich itemach
      if (tab.calculationType === 'surface') {
        const updatedItems = tab.items.map(item => ({
          ...item,
          thickness: composition.thickness.toString(),
          density: composition.density.toString(),
          surfaceWeight: composition.surfaceWeight.toFixed(2)
        }));
        updates.items = updatedItems;
      }

      handleTabParameterUpdate('selectedMaterialCompositionId', composition.id);
      handleTabParameterUpdate('materialCost', composition.pricePerKg.toString());

      if (!tab.isCustomName) {
        handleTabParameterUpdate('name', composition.displayName);
      }

      if (tab.calculationType === 'surface' && updates.items) {
        actions.updateTab(tab.id, { items: updates.items });
      }
    }
  };

  // Obsługa aktualizacji parametrów zakładki
  const handleTabParameterUpdate = (parameter, value) => {
    const updates = { [parameter]: value };
    const newTabData = { ...tab, ...updates };

    // Jeśli zmieniamy na tryb powierzchnia, zeruj koszty pieczenia i czyszczenia
    if (parameter === 'calculationType' && value === 'surface') {
      updates.bakingCost = '0';
      updates.cleaningCost = '0';
    }

    // Jeśli zmieniamy na tryb zaawansowany (heatshield lub multilayer), zeruj standardowe koszty
    if (parameter === 'calculationType' && (value === 'heatshield' || value === 'multilayer')) {
      updates.materialCost = '0';
      updates.bakingCost = '0';
      updates.cleaningCost = '0';
      updates.handlingCost = '0';
    }

    // Przelicz wszystkie elementy po zmianie parametru
    const updatedItems = tab.items.map(item => {
      // Jeśli zmieniamy NA tryb heatshield, dodaj stanowisko Gilotyna do wszystkich elementów
      if (parameter === 'calculationType' && value === 'heatshield') {
        // Szukaj stanowiska Gilotyna tylko jeśli element nie ma jeszcze stanowisk
        if (!item.workstations || item.workstations.length === 0) {
          const gilotynaWorkstation = workstationState.workstations.find(ws =>
            ws.name.toLowerCase().includes('gilotyna') || ws.name.toLowerCase().includes('guillotine')
          );

          if (gilotynaWorkstation) {
            item = {
              ...item,
              workstations: [{
                id: 1,
                workstationId: gilotynaWorkstation.id,
                efficiency: '',
                name: 'Gilotyna',
                costMode: 'auto',
                manualCost: ''
              }],
              nextWorkstationId: 2
            };
          }
        }
      }

      // Sprawdź czy item ma dane wejściowe w zależności od trybu
      const hasInputData = newTabData.calculationType === 'heatshield'
        ? (item.heatshield?.surfaceNetto)
        : item.weight;

      if (hasInputData) {
        const results = calculateItemCost(item, newTabData, globalSGA);
        return { ...item, results };
      }
      return item;
    });

    actions.updateTab(tab.id, { ...updates, items: updatedItems });
  };

  // Dodawanie nowego elementu
  const handleAddItem = () => {
    // Dla trybu Heatshield: szukaj stanowiska "Gilotyna" i dodaj je automatycznie
    let initialWorkstations = [];
    let nextWsId = 1;

    if (tab.calculationType === 'heatshield') {
      const gilotynaWorkstation = workstationState.workstations.find(ws =>
        ws.name.toLowerCase().includes('gilotyna') || ws.name.toLowerCase().includes('guillotine')
      );

      if (gilotynaWorkstation) {
        initialWorkstations = [{
          id: 1,
          workstationId: gilotynaWorkstation.id,
          efficiency: '',
          name: 'Gilotyna',
          costMode: 'auto',
          manualCost: ''
        }];
        nextWsId = 2;
      }
    }

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
      // Pola dla stanowisk produkcyjnych
      workstation: {
        id: null,
        efficiency: ''
      },
      // Nowa struktura dla wielu stanowisk (zastępuje stare workstation)
      workstations: initialWorkstations,
      nextWorkstationId: nextWsId,
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
      volumeWeightOption: 'brutto-auto',
      // Pola dla trybu HEATSHIELD
      heatshield: {
        surfaceNettoInput: '',
        surfaceNetto: '',
        surfaceUnit: 'mm2',
        sheetThickness: '',
        sheetDensity: '',
        sheetPrice: '',
        sheetPriceUnit: 'kg',
        matThickness: '',
        matDensity: '',
        matPrice: '',
        matPriceUnit: 'm2',
        bendingCost: '',
        joiningCost: '0',
        gluingCost: '',
        surfaceBruttoSheet: '',
        surfaceNettoSheet: '',
        surfaceNettoMat: '',
        sheetWeight: '',
        matWeight: '',
        totalWeight: ''
      },
      // Pola dla pakowania
      packaging: {
        partsPerLayer: '',
        layers: '',
        manualPartsInBox: false,
        partsInBox: '',
        compositionId: null,
        customPrice: ''
      }
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
        onReset={handleResetTab}
        hasData={hasTabData}
        themeClasses={themeClasses}
        darkMode={darkMode}
      />

      {/* Wybór materiału dla zakładki */}
      {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
          <div className={`text-sm font-medium mb-3 ${themeClasses.text.primary}`}>
            🎯 Wybór materiału dla zakładki (opcjonalnie)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
                Typ materiału
              </label>
              <select
                value={selectedMaterialTypeId}
                onChange={(e) => setSelectedMaterialTypeId(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${themeClasses.input}`}
              >
                <option value="">-- Wybierz typ --</option>
                {materialState.materialTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.pricePerKg.toFixed(2)} €/kg)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
                Wariant (grubość × gęstość)
              </label>
              <select
                value={tab.selectedMaterialCompositionId || ''}
                onChange={(e) => handleMaterialCompositionSelect(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${themeClasses.input}`}
                disabled={!selectedMaterialTypeId}
              >
                <option value="">-- Wybierz wariant --</option>
                {filteredCompositions.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.thickness}mm × {comp.density} kg/m³ = {comp.surfaceWeight.toFixed(1)} g/m²
                  </option>
                ))}
              </select>
            </div>
          </div>
          {tab.selectedMaterialCompositionId && (
            <div className={`mt-2 text-xs ${themeClasses.text.secondary}`}>
              ✓ Materiał: {materialUtils.getCompositionWithDetails(materialState, tab.selectedMaterialCompositionId)?.displayName}
            </div>
          )}
        </div>
      )}

      {/* Parametry zakładki - tylko dla trybów podstawowych */}
      {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
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
      )}

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

        {tab.items.map((item, index) => {
          const isCollapsed = collapsedItems[item.id];

          return (
          <div key={item.id} className={`border rounded-lg p-4 space-y-3 ${darkMode ? 'border-gray-600' : 'border-gray-200'} ${index % 2 === 0 ? (darkMode ? 'bg-gray-800/50' : 'bg-gray-100') : (darkMode ? 'bg-gray-900/30' : 'bg-gray-50')}`}>
            {/* ID części - zawsze widoczne z przyciskiem zwijania */}
            <div className="flex items-start gap-2">
              <button
                onClick={() => setCollapsedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
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
                  onChange={(e) => handleItemUpdate(item.id, { partId: e.target.value })}
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
                      onChange={(e) => handleItemUpdate(item.id, { weight: e.target.value })}
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

            {tab.calculationType === 'heatshield' && (
              <HeatshieldModeFields
                item={item}
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            )}

            {tab.calculationType === 'multilayer' && (
              <MultilayerModeFields
                item={item}
                tab={tab}
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
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

            {/* Stanowiska - tylko dla prostych trybów */}
            {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
              <WorkstationFields
                item={item}
                onUpdate={(updates) => handleItemUpdate(item.id, updates)}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            )}

            {/* Pakowanie */}
            <PackagingCalculation
              item={item}
              onUpdate={(updates) => handleItemUpdate(item.id, updates)}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />

            {/* Sekcja toolingu/narzędzi */}
            <ToolingSection
              item={item}
              onUpdate={(updates) => handleItemUpdate(item.id, updates)}
              themeClasses={themeClasses}
              darkMode={darkMode}
            />

            {/* Kalendarz prognoz wolumenu */}
            <VolumeForecastSection
              item={item}
              onUpdate={(updates) => handleItemUpdate(item.id, updates)}
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

                      const distance = calculationMeta.transport.distanceSource === 'client'
                        ? parseFloat(calculationMeta.transport.clientDistance) || 0
                        : parseFloat(calculationMeta.transport.manualDistance) || 0;

                      if (distance === 0) return null;

                      const composition = packagingState.compositions.find(
                        c => c.id == item.packaging?.compositionId
                      );
                      if (!composition) return null;

                      const partsInBox = item.packaging.manualPartsInBox
                        ? parseFloat(item.packaging.partsInBox) || 0
                        : (parseFloat(item.packaging.partsPerLayer) || 0) * (parseFloat(item.packaging.layers) || 0);

                      const partsPerPallet = partsInBox * composition.packagesPerPallet;
                      const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

                      const totalTransportCost = transportType.pricePerKm * distance;
                      const costPerSpace = totalTransportCost / transportType.palletSpaces;

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
                              handleItemUpdate(item.id, { customCurveValues: newCustomCurveValues });
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
                                handleItemUpdate(item.id, { customCurveValues: newCustomCurveValues });
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
            {item.results && (
              <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className={themeClasses.text.secondary}>Materiał:</span>
                    <div className="font-mono">{item.results.materialCost?.toFixed(2) || '0.00'} €</div>
                  </div>

                  {/* Wyświetl procesy w zależności od trybu */}
                  {tab.calculationType === 'heatshield' ? (
                    <>
                      {/* Koszty stanowisk produkcyjnych */}
                      {item.results.workstationsCost > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Stanowiska:</span>
                          <div className="font-mono">{item.results.workstationsCost.toFixed(3)} €</div>
                          {/* Szczegóły per stanowisko */}
                          {item.results.workstationCosts && Object.keys(item.results.workstationCosts).length > 1 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs">
                                Szczegóły
                              </summary>
                              <div className="mt-1 pl-2 space-y-0.5">
                                {Object.entries(item.results.workstationCosts).map(([wsId, wsData]) => (
                                  <div key={wsId} className={`text-xs ${themeClasses.text.secondary}`}>
                                    • {wsData.name}: {wsData.cost.toFixed(3)} € ({wsData.mode === 'manual' ? 'ręczny' : 'auto'})
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                      {item.results.laserCost !== undefined && (
                        <div>
                          <span className={themeClasses.text.secondary}>Laser:</span>
                          <div className="font-mono">{item.results.laserCost.toFixed(2)} €</div>
                        </div>
                      )}
                      {item.results.bendingCost > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Gięcie:</span>
                          <div className="font-mono">{item.results.bendingCost.toFixed(2)} €</div>
                        </div>
                      )}
                      {item.results.joiningCost > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Łączenie:</span>
                          <div className="font-mono">{item.results.joiningCost.toFixed(2)} €</div>
                        </div>
                      )}
                      {item.results.gluingCost > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Klejenie:</span>
                          <div className="font-mono">{item.results.gluingCost.toFixed(2)} €</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {item.results.bakingCost !== undefined && (
                        <div>
                          <span className={themeClasses.text.secondary}>Pieczenie:</span>
                          <div className="font-mono">{item.results.bakingCost.toFixed(2)} €</div>
                        </div>
                      )}
                      {item.results.cleaningCost !== undefined && parseFloat(tab.cleaningCost || 0) > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Czyszczenie:</span>
                          <div className="font-mono">{item.results.cleaningCost.toFixed(2)} €</div>
                        </div>
                      )}
                      {/* Koszty stanowisk produkcyjnych */}
                      {item.results.workstationsCost > 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Stanowiska:</span>
                          <div className="font-mono">{item.results.workstationsCost.toFixed(3)} €</div>
                          {/* Szczegóły per stanowisko */}
                          {item.results.workstationCosts && Object.keys(item.results.workstationCosts).length > 1 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs">
                                Szczegóły
                              </summary>
                              <div className="mt-1 pl-2 space-y-0.5">
                                {Object.entries(item.results.workstationCosts).map(([wsId, wsData]) => (
                                  <div key={wsId} className={`text-xs ${themeClasses.text.secondary}`}>
                                    • {wsData.name}: {wsData.cost.toFixed(3)} € ({wsData.mode === 'manual' ? 'ręczny' : 'auto'})
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                      {/* Koszt obsługi - fallback gdy brak stanowisk */}
                      {item.results.handlingCost > 0 && item.results.workstationsCost === 0 && (
                        <div>
                          <span className={themeClasses.text.secondary}>Obsługa:</span>
                          <div className="font-mono">{item.results.handlingCost.toFixed(3)} €</div>
                        </div>
                      )}
                    </>
                  )}

                  {item.results.customProcessesCost > 0 && (
                    <div>
                      <span className={themeClasses.text.secondary}>Procesy niestand.:</span>
                      <div className="font-mono">{item.results.customProcessesCost.toFixed(3)} €</div>
                    </div>
                  )}
                  {item.results.customCurvesCost > 0 && (
                    <div>
                      <span className={themeClasses.text.secondary}>Krzywe:</span>
                      <div className="font-mono">{item.results.customCurvesCost.toFixed(2)} €</div>
                    </div>
                  )}
                  {item.results.packagingCost > 0 && (
                    <div>
                      <span className={themeClasses.text.secondary}>Pakowanie:</span>
                      <div className="font-mono">{item.results.packagingCost.toFixed(4)} €</div>
                    </div>
                  )}
                  {item.results.transportCost > 0 && (
                    <div>
                      <span className={themeClasses.text.secondary}>Transport:</span>
                      <div className="font-mono">{item.results.transportCost.toFixed(4)} €</div>
                    </div>
                  )}
                  <div>
                    <span className={themeClasses.text.secondary}>Całkowity:</span>
                    <div className="font-mono font-bold">{item.results.finalTotalCost?.toFixed(2) || item.results.totalCost?.toFixed(2) || '0.00'} €</div>
                  </div>
                  {/* DAP Price (z transportem) */}
                  {item.results.transportCost > 0 && (() => {
                    const exwPrice = item.results.totalWithSGA || 0; // Cena EXW = cena bez transportu
                    const dapPrice = item.results.finalTotalCost || (exwPrice + item.results.transportCost); // DAP = EXW + transport
                    const client = calculationMeta.client
                      ? clientState.clients.find(c => c.id === calculationMeta.client)
                      : null;
                    const cityName = client?.city ? ` ${client.city}` : '';

                    return (
                      <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex items-center gap-1">
                          <span className={themeClasses.text.secondary}>Cena DAP{cityName}:</span>
                          <div className="relative group">
                            <Info size={14} className={`${themeClasses.text.secondary} cursor-help`} />
                            <div className={`absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 rounded shadow-lg text-xs ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                              <div className="font-semibold mb-1">Delivered At Place</div>
                              <div className="space-y-0.5">
                                <div>EXW: €{exwPrice.toFixed(4)}</div>
                                <div>Transport: €{item.results.transportCost.toFixed(4)}</div>
                                <div className="pt-1 border-t border-gray-400">
                                  <strong>DAP: €{dapPrice.toFixed(4)}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-green-600 dark:text-green-400">
                          {dapPrice.toFixed(2)} €
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
            </>
            )}

            {/* Przyciski akcji - zawsze widoczne */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => actions.duplicateItem(tab.id, item.id)}
                className="text-blue-500 hover:text-blue-700 p-1"
                title="Powiel element"
              >
                <Copy size={16} />
              </button>
              {tab.items.length > 1 && (
                <button
                  onClick={() => actions.removeItem(tab.id, item.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Usuń element"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}