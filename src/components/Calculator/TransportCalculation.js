import React, { useEffect } from 'react';
import { Truck, AlertCircle } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { useClient } from '../../context/ClientContext';
import { usePackaging } from '../../context/PackagingContext';

/**
 * Komponent do zarządzania ustawieniami transportu dla całej kalkulacji
 */
export function TransportCalculation({
  tabs,
  calculationMeta,
  onUpdate,
  themeClasses,
  darkMode
}) {
  const { state: transportState } = useTransport();
  const { state: clientState } = useClient();
  const { state: packagingState } = usePackaging();

  // Pobierz odległość z klienta jeśli wybrano klienta
  useEffect(() => {
    if (calculationMeta.transport && calculationMeta.transport.distanceSource === 'client' && calculationMeta.clientId) {
      const client = clientState.clients.find(c => c.id === calculationMeta.clientId);
      if (client && client.distance) {
        onUpdate({
          transport: {
            ...calculationMeta.transport,
            clientDistance: client.distance.toString()
          }
        });
      }
    }
  }, [calculationMeta.clientId, calculationMeta.transport?.distanceSource, clientState.clients]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = (field, value) => {
    onUpdate({
      transport: {
        ...calculationMeta.transport,
        [field]: value
      }
    });
  };

  const handleEnabledChange = (enabled) => {
    onUpdate({
      transport: {
        ...calculationMeta.transport,
        enabled
      }
    });
  };

  // Pobierz aktualną odległość (z klienta lub ręczną)
  const getCurrentDistance = () => {
    if (!calculationMeta.transport) return 0;
    if (calculationMeta.transport.distanceSource === 'client') {
      return parseFloat(calculationMeta.transport.clientDistance) || 0;
    }
    return parseFloat(calculationMeta.transport.manualDistance) || 0;
  };

  // Pobierz wybrany typ transportu
  const selectedTransportType = calculationMeta.transport?.transportTypeId && transportState.types
    ? transportState.types.find(t => t.id == calculationMeta.transport.transportTypeId)
    : null;

  // Oblicz podgląd kosztów i zapotrzebowanie na miejsca paletowe dla całej kalkulacji
  const calculatePreview = () => {
    if (!selectedTransportType) return null;

    const distance = getCurrentDistance();
    if (distance === 0) return null;

    const totalCost = selectedTransportType.pricePerKm * distance;
    const costPerSpace = totalCost / selectedTransportType.palletSpaces;

    // Oblicz roczne zapotrzebowanie na miejsca paletowe dla WSZYSTKICH zakładek
    let yearlySpaces = 0;
    let hasYearlyDemand = false;

    // Iteruj po wszystkich zakładkach i wszystkich itemach
    for (const tab of tabs || []) {
      for (const item of tab.items || []) {
        const yearlyDemand = parseFloat(item.annualVolume) || 0;
        if (yearlyDemand === 0) continue;

        hasYearlyDemand = true;

        if (!item.packaging || !item.packaging.compositionId || item.packaging.compositionId === 'custom') {
          continue;
        }

        const composition = packagingState.compositions.find(c => c.id == item.packaging.compositionId);
        if (!composition) continue;

        // Oblicz ile detali mieści się w jednym miejscu paletowym
        const partsInBox = item.packaging.manualPartsInBox
          ? parseFloat(item.packaging.partsInBox) || 0
          : (parseFloat(item.packaging.partsPerLayer) || 0) * (parseFloat(item.packaging.layers) || 0);

        if (partsInBox === 0) continue;

        const partsPerPallet = partsInBox * composition.packagesPerPallet;
        const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

        if (partsPerSpace === 0) continue;

        // Ile miejsc paletowych rocznie dla tego itemu
        const spacesForItem = yearlyDemand / partsPerSpace;
        yearlySpaces += spacesForItem;
      }
    }

    const monthlySpaces = yearlySpaces / 12;
    const biweeklySpaces = yearlySpaces / 26; // co 2 tygodnie
    const weeklySpaces = yearlySpaces / 52; // tygodniowo

    return {
      distance,
      totalCost: totalCost.toFixed(2),
      costPerSpace: costPerSpace.toFixed(2),
      yearlySpaces: hasYearlyDemand ? yearlySpaces.toFixed(1) : null,
      monthlySpaces: hasYearlyDemand ? monthlySpaces.toFixed(1) : null,
      biweeklySpaces: hasYearlyDemand ? biweeklySpaces.toFixed(1) : null,
      weeklySpaces: hasYearlyDemand ? weeklySpaces.toFixed(1) : null
    };
  };

  const preview = calculatePreview();

  // Sprawdź maksymalną wysokość pakowania dla wszystkich itemów we wszystkich zakładkach
  const checkHeightCompatibility = () => {
    if (!selectedTransportType || !tabs || tabs.length === 0) return null;

    const maxLoadHeightMM = selectedTransportType.maxLoadHeight * 1000; // konwersja z m na mm
    let maxPackagingHeight = 0;
    let incompatibleItem = null;

    // Iteruj po wszystkich zakładkach
    for (const tab of tabs) {
      for (const item of tab.items || []) {
        if (!item.packaging || !item.packaging.compositionId || item.packaging.compositionId === 'custom') {
          continue;
        }

        const composition = packagingState.compositions.find(c => c.id == item.packaging.compositionId);
        if (!composition) continue;

        // Wysokość miejsca paletowego już jest obliczona w kompozycji pakowania!
        const totalHeight = composition.totalHeight; // w mm

        if (totalHeight > maxPackagingHeight) {
          maxPackagingHeight = totalHeight;
          if (totalHeight > maxLoadHeightMM) {
            incompatibleItem = {
              tabName: tab.name,
              itemId: item.id,
              partId: item.partId,
              height: totalHeight,
              maxHeight: maxLoadHeightMM
            };
          }
        }
      }
    }

    return incompatibleItem;
  };

  const heightWarning = checkHeightCompatibility();

  // Zabezpieczenie dla starych kalkulacji bez pola transport
  if (!calculationMeta.transport) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${themeClasses.card}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck size={16} className={themeClasses.text.primary} />
          <h4 className={`text-sm font-semibold ${themeClasses.text.primary}`}>
            Transport (dla całej kalkulacji)
          </h4>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={calculationMeta.transport.enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className={`text-xs ${themeClasses.text.secondary}`}>
            Doliczyć transport
          </span>
        </label>
      </div>

      {calculationMeta.transport.enabled && (
        <div className="space-y-4">
          {/* Typ transportu */}
          <div>
            <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
              Typ transportu
            </label>
            <select
              value={calculationMeta.transport.transportTypeId || ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFieldChange('transportTypeId', value ? parseInt(value) : null);
              }}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
            >
              <option value="">Wybierz typ transportu...</option>
              {transportState.types && transportState.types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.loadCapacity}kg, {type.palletSpaces} miejsc, {type.pricePerKm}€/km)
                </option>
              ))}
            </select>
          </div>

          {selectedTransportType && (
            <>
              {/* Źródło odległości */}
              <div>
                <label className={`block text-xs mb-2 ${themeClasses.text.secondary}`}>
                  Odległość
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="transport-distance-calculation"
                      value="client"
                      checked={calculationMeta.transport.distanceSource === 'client'}
                      onChange={(e) => handleFieldChange('distanceSource', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs ${themeClasses.text.secondary}`}>
                      Z klienta (automatycznie)
                      {calculationMeta.transport.distanceSource === 'client' && calculationMeta.transport.clientDistance && (
                        <span className="ml-1 font-semibold">
                          - {calculationMeta.transport.clientDistance} km
                        </span>
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="transport-distance-calculation"
                      value="manual"
                      checked={calculationMeta.transport.distanceSource === 'manual'}
                      onChange={(e) => handleFieldChange('distanceSource', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs ${themeClasses.text.secondary}`}>
                      Ręcznie
                    </span>
                  </label>

                  {calculationMeta.transport.distanceSource === 'manual' && (
                    <div className="ml-6">
                      <input
                        type="number"
                        value={calculationMeta.transport.manualDistance}
                        onChange={(e) => handleFieldChange('manualDistance', e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${themeClasses.input}`}
                        placeholder="Wprowadź odległość (km)"
                        min="0"
                        step="1"
                      />
                    </div>
                  )}
                </div>

                {/* Ostrzeżenie jeśli brak klienta */}
                {calculationMeta.transport.distanceSource === 'client' && !calculationMeta.clientId && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Nie wybrano klienta. Wybierz klienta w kalkulacji lub użyj ręcznej odległości.
                    </p>
                  </div>
                )}

                {/* Ostrzeżenie jeśli klient bez odległości */}
                {calculationMeta.transport.distanceSource === 'client' && calculationMeta.clientId && !calculationMeta.transport.clientDistance && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Wybrany klient nie ma zdefiniowanej odległości. Dodaj odległość do klienta lub użyj ręcznej odległości.
                    </p>
                  </div>
                )}
              </div>

              {/* Podgląd kosztów */}
              {preview && (
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h5 className={`text-xs font-semibold mb-2 ${themeClasses.text.primary}`}>
                    Podgląd kosztów transportu
                  </h5>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className={themeClasses.text.secondary}>Odległość:</span>
                      <span className={themeClasses.text.primary}>{preview.distance} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={themeClasses.text.secondary}>Koszt całkowity:</span>
                      <span className={themeClasses.text.primary}>€{preview.totalCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={themeClasses.text.secondary}>Koszt na miejsce paletowe:</span>
                      <span className={`font-semibold ${themeClasses.text.primary}`}>
                        €{preview.costPerSpace}
                      </span>
                    </div>

                    {/* Zapotrzebowanie na miejsca paletowe dla całego projektu */}
                    {preview.yearlySpaces && (
                      <>
                        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                          <p className={`text-xs font-semibold mb-2 ${themeClasses.text.primary}`}>
                            Zapotrzebowanie na miejsca paletowe (projekt):
                          </p>
                          <div className="flex justify-between">
                            <span className={themeClasses.text.secondary}>Rocznie:</span>
                            <span className={`font-semibold ${themeClasses.text.primary}`}>
                              {preview.yearlySpaces}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.text.secondary}>Miesięcznie:</span>
                            <span className={themeClasses.text.primary}>
                              ~{preview.monthlySpaces}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.text.secondary}>Co 2 tygodnie:</span>
                            <span className={themeClasses.text.primary}>
                              ~{preview.biweeklySpaces}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className={themeClasses.text.secondary}>Tygodniowo:</span>
                            <span className={themeClasses.text.primary}>
                              ~{preview.weeklySpaces}
                            </span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                      <p className={`text-xs italic ${themeClasses.text.secondary}`}>
                        Koszt na detal zostanie obliczony na podstawie pakowania
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ostrzeżenie o wysokości pakowania */}
              {heightWarning && (
                <div className="mt-2 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <strong>Uwaga!</strong> W zakładce "{heightWarning.tabName}"{heightWarning.partId ? ` (${heightWarning.partId})` : ''}
                    wysokość pakowania ({(heightWarning.height / 1000).toFixed(2)}m) przekracza
                    maksymalną wysokość ładunku transportu ({(heightWarning.maxHeight / 1000).toFixed(2)}m).
                    Wybierz inny typ transportu lub zmień pakowanie.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TransportCalculation;
