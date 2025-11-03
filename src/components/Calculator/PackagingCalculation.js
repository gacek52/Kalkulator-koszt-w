import React from 'react';
import { usePackaging } from '../../context/PackagingContext';

/**
 * Komponent do obliczania pakowania dla pojedynczego elementu
 */
export function PackagingCalculation({
  item,
  onUpdate,
  themeClasses,
  darkMode
}) {
  const { state: packagingState } = usePackaging();

  // Oblicz ilość w kartonie
  const calculatePartsInBox = () => {
    if (!item.packaging) return 0;
    const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
    const layers = parseFloat(item.packaging.layers) || 0;
    return partsPerLayer * layers;
  };

  // Pobierz dane kompozycji
  const getCompositionData = () => {
    if (!item.packaging) return null;

    if (item.packaging.compositionId === 'custom') {
      return {
        name: 'Niestandardowa',
        cost: parseFloat(item.packaging.customPrice) || 0,
        packagesPerPallet: 0,
        palletsPerSpace: 0,
        standardPalletWeight: 0,
        totalWeight: 0
      };
    }

    if (!item.packaging.compositionId) return null;

    const composition = packagingState.compositions.find(
      c => c.id == item.packaging.compositionId
    );

    if (!composition) return null;

    // Znajdź typ opakowania aby pobrać wagę kartonu
    const packagingType = packagingState.types?.find(
      t => t.id === composition.packagingTypeId
    );

    return {
      name: composition.name,
      cost: composition.compositionCost,
      packagesPerPallet: composition.packagesPerPallet,
      palletsPerSpace: composition.palletsPerSpace,
      standardPalletWeight: composition.standardPalletWeight || 0,
      totalWeight: composition.totalWeight || 0,
      cartonWeight: packagingType?.weight || 0
    };
  };

  // Oblicz metryki pakowania
  const calculatePackagingMetrics = () => {
    const compositionData = getCompositionData();
    if (!compositionData) return null;

    const partsInBox = item.packaging.manualPartsInBox
      ? parseFloat(item.packaging.partsInBox) || 0
      : calculatePartsInBox();

    if (partsInBox === 0) return null;

    // Dla niestandardowej kompozycji nie obliczamy metryk palet
    if (item.packaging.compositionId === 'custom') {
      return {
        partsInBox,
        partsPerPallet: 0,
        partsPerSpace: 0,
        costPerPart: compositionData.cost / partsInBox,
        compositionCost: compositionData.cost,
        cartonWeight: 0,
        palletWeight: 0
      };
    }

    const partsPerPallet = partsInBox * compositionData.packagesPerPallet;
    const partsPerSpace = partsPerPallet * compositionData.palletsPerSpace;
    const costPerPart = compositionData.cost / partsPerSpace;

    // Oblicz wagi
    // Waga detalu (jeśli dostępna w item.results)
    const detailWeight = item.results?.nettoWeight || item.results?.bruttoWeight || 0;

    // Waga kartonu = waga opakowania + (waga detalu × ilość detali w kartonie)
    const cartonWeight = compositionData.cartonWeight + (detailWeight * partsInBox / 1000); // detailWeight w gramach, cartonWeight w kg

    // Waga palety = waga standardowej palety + (waga kartonu × ilość kartonów na palecie)
    const palletWeight = compositionData.standardPalletWeight + (cartonWeight * compositionData.packagesPerPallet);

    return {
      partsInBox,
      partsPerPallet,
      partsPerSpace,
      costPerPart,
      compositionCost: compositionData.cost,
      cartonWeight: cartonWeight,
      palletWeight: palletWeight,
      detailWeight: detailWeight
    };
  };

  const metrics = calculatePackagingMetrics();
  const compositionData = getCompositionData();

  const handleFieldChange = (field, value) => {
    onUpdate({
      packaging: {
        ...item.packaging,
        [field]: value
      }
    });
  };

  const handleManualCheckboxChange = (checked) => {
    const updates = {
      packaging: {
        ...item.packaging,
        manualPartsInBox: checked
      }
    };

    // Jeśli przełączamy na auto, oblicz wartość
    if (!checked) {
      updates.packaging.partsInBox = calculatePartsInBox().toString();
    }

    onUpdate(updates);
  };

  const handleCompositionChange = (compositionId) => {
    onUpdate({
      packaging: {
        ...item.packaging,
        compositionId: compositionId === '' ? null : compositionId
      }
    });
  };

  return (
    <div className={`p-4 rounded-lg border ${themeClasses.card}`}>
      <h4 className={`text-sm font-semibold mb-3 ${themeClasses.text.primary}`}>
        Pakowanie
      </h4>

      <div className="space-y-4">
        {/* Części na warstwę i ilość warstw */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
              Części na warstwę
            </label>
            <input
              type="number"
              value={item.packaging.partsPerLayer}
              onChange={(e) => handleFieldChange('partsPerLayer', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
              placeholder="0"
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
              Ilość warstw
            </label>
            <input
              type="number"
              value={item.packaging.layers}
              onChange={(e) => handleFieldChange('layers', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
              placeholder="0"
              min="0"
              step="1"
            />
          </div>
        </div>

        {/* Liczba elementów w kartonie */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs ${themeClasses.text.secondary}`}>
              Liczba elementów w kartonie
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={item.packaging.manualPartsInBox}
                onChange={(e) => handleManualCheckboxChange(e.target.checked)}
                className="rounded"
              />
              <span className={`text-xs ${themeClasses.text.secondary}`}>
                Ręczne
              </span>
            </label>
          </div>
          <input
            type="number"
            value={item.packaging.partsInBox}
            onChange={(e) => handleFieldChange('partsInBox', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
            placeholder="0"
            min="0"
            step="1"
            disabled={!item.packaging.manualPartsInBox}
          />
          {!item.packaging.manualPartsInBox && (
            <div className={`text-xs mt-1 ${themeClasses.text.muted}`}>
              Obliczane: {calculatePartsInBox()} szt.
            </div>
          )}
        </div>

        {/* Wybór kompozycji */}
        <div>
          <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
            Kompozycja pakowania
          </label>
          <select
            value={item.packaging.compositionId || ''}
            onChange={(e) => handleCompositionChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
          >
            <option value="">Wybierz kompozycję</option>
            {packagingState.compositions.map(comp => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.compositionCost.toFixed(2)} €)
              </option>
            ))}
            <option value="custom">Niestandardowa (własna cena)</option>
          </select>
        </div>

        {/* Cena niestandardowa */}
        {item.packaging.compositionId === 'custom' && (
          <div>
            <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
              Cena kompozycji (€)
            </label>
            <input
              type="number"
              value={item.packaging.customPrice}
              onChange={(e) => handleFieldChange('customPrice', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {/* Metryki pakowania */}
        {metrics && compositionData && (
          <div className={`mt-4 p-3 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className={`text-xs font-semibold mb-2 ${themeClasses.text.primary}`}>
              Metryki pakowania
            </div>
            <div className="space-y-1 text-xs">
              {item.packaging.compositionId !== 'custom' && (
                <>
                  <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                    <span>Części w kartonie:</span>
                    <span className="font-medium">{metrics.partsInBox} szt.</span>
                  </div>
                  <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                    <span>Części na paletę:</span>
                    <span className="font-medium">{metrics.partsPerPallet} szt.</span>
                  </div>
                  <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                    <span>Części na miejsce paletowe:</span>
                    <span className="font-medium">{metrics.partsPerSpace} szt.</span>
                  </div>
                  {metrics.detailWeight > 0 && (
                    <>
                      <div className={`flex justify-between pt-2 border-t ${
                        darkMode ? 'border-gray-600' : 'border-gray-300'
                      } ${themeClasses.text.secondary}`}>
                        <span>Waga kartonu:</span>
                        <span className="font-medium">{metrics.cartonWeight.toFixed(2)} kg</span>
                      </div>
                      <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                        <span>Waga palety:</span>
                        <span className="font-medium">{metrics.palletWeight.toFixed(2)} kg</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className={`flex justify-between pt-2 border-t ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              } ${themeClasses.text.primary}`}>
                <span className="font-semibold">Koszt pakowania na detal:</span>
                <span className="font-semibold">{metrics.costPerPart.toFixed(4)} €</span>
              </div>
            </div>
          </div>
        )}

        {/* Metryki transportu - roczne zapotrzebowanie */}
        {metrics && compositionData && item.packaging.compositionId !== 'custom' &&
         item.annualVolume && parseFloat(item.annualVolume) > 0 && metrics.partsPerSpace > 0 && (
          <div className={`mt-3 p-3 rounded-lg ${
            darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
          }`}>
            <div className={`text-xs font-semibold mb-2 ${
              darkMode ? 'text-blue-400' : 'text-blue-800'
            }`}>
              Metryki transportu (rocznie)
            </div>
            <div className="space-y-1 text-xs">
              <div className={`flex justify-between ${
                darkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                <span>Kartonów rocznie:</span>
                <span className="font-medium">
                  {Math.ceil(parseFloat(item.annualVolume) / metrics.partsInBox)} szt.
                </span>
              </div>
              <div className={`flex justify-between ${
                darkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                <span>Palet rocznie:</span>
                <span className="font-medium">
                  {Math.ceil(parseFloat(item.annualVolume) / metrics.partsPerPallet)} szt.
                </span>
              </div>
              <div className={`flex justify-between pt-2 border-t ${
                darkMode ? 'border-blue-700' : 'border-blue-200'
              } ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                <span className="font-semibold">Miejsc paletowych rocznie:</span>
                <span className="font-semibold">
                  {Math.ceil(parseFloat(item.annualVolume) / metrics.partsPerSpace)} szt.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
