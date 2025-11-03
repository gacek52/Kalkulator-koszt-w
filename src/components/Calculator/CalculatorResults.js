import React, { useState } from 'react';
import { DollarSign, TrendingUp, Package, ChevronDown, ChevronRight, Truck, Box, FileText } from 'lucide-react';
import { CostTooltip, useTooltips } from '../Common/CostTooltip';
import { usePackaging } from '../../context/PackagingContext';
import { downloadPDS } from '../../services/pdsGenerator';

/**
 * Komponent wyświetlający wyniki kalkulacji
 */
export function CalculatorResults({ tabs, currentTabId, globalSGA, calculationMeta, themeClasses, darkMode }) {
  const [expandedTabs, setExpandedTabs] = useState({ [currentTabId]: true });
  const [showLogistics, setShowLogistics] = useState(false);
  const { state: packagingState } = usePackaging();
  const {
    hoveredItem,
    mousePosition,
    pinnedTooltips,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    handleItemClick,
    removePinnedTooltip
  } = useTooltips();

  const toggleTab = (tabId) => {
    setExpandedTabs(prev => ({
      ...prev,
      [tabId]: !prev[tabId]
    }));
  };

  // Oblicz podsumowanie dla pojedynczej zakładki
  const calculateTabSummary = (tab) => {
    const validItems = tab.items.filter(item => item.results);

    if (validItems.length === 0) {
      return {
        totalItems: 0,
        costBreakdown: {},
        totalCost: 0,
        totalWithMargin: 0,
        finalPrice: 0,
        totalTransportCost: 0,
        finalPriceWithTransport: 0
      };
    }

    // Dynamiczne zbieranie wszystkich kategorii kosztów
    const costBreakdown = {};
    let totalCost = 0;
    let totalWithMargin = 0;
    let totalTransportCost = 0;

    validItems.forEach(item => {
      const results = item.results;

      // Agreguj wszystkie koszty z wyników (pomijając sumy i wagi)
      Object.keys(results).forEach(key => {
        // Pomijamy pola które nie są kosztami jednostkowymi
        if (key === 'totalCost' || key === 'totalWithMargin' || key === 'totalWithSGA' ||
            key === 'finalTotalCost' ||
            key === 'nettoWeight' || key === 'bruttoWeight' ||
            key === 'bakingTime' || key === 'cleaningTime' || key === 'prepTime' ||
            key === 'customCurveCosts' || key === 'transportCost') {
          return;
        }

        const value = parseFloat(results[key]) || 0;
        if (value > 0) {
          costBreakdown[key] = (costBreakdown[key] || 0) + value;
        }
      });

      totalCost += results.totalCost || 0;
      totalWithMargin += results.totalWithMargin || 0;

      // Koszt transportu (jeśli istnieje) - to jest koszt jednostkowy na sztukę, NIE mnóż przez annualVolume
      const transportCost = results.transportCost || 0;
      totalTransportCost += transportCost;
    });

    // Oblicz finalną cenę z SG&A (aplikowane do ceny po marży)
    const sgaPercent = parseFloat(globalSGA) || 0;
    const finalPrice = totalWithMargin * (1 + sgaPercent / 100);
    const finalPriceWithTransport = finalPrice + totalTransportCost;

    return {
      totalItems: validItems.length,
      costBreakdown,
      totalCost,
      totalWithMargin,
      finalPrice,
      totalTransportCost,
      finalPriceWithTransport
    };
  };

  // Oblicz całkowite podsumowanie ze wszystkich zakładek
  const calculateTotalSummary = () => {
    let totalCost = 0;
    let totalWithMargin = 0;
    let totalItems = 0;
    let totalTransportCost = 0;

    tabs.forEach(tab => {
      const tabSummary = calculateTabSummary(tab);
      totalCost += tabSummary.totalCost;
      totalWithMargin += tabSummary.totalWithMargin;
      totalItems += tabSummary.totalItems;
      totalTransportCost += tabSummary.totalTransportCost;
    });

    const sgaPercent = parseFloat(globalSGA) || 0;
    const finalPrice = totalWithMargin * (1 + sgaPercent / 100);
    const finalPriceWithTransport = finalPrice + totalTransportCost;

    return {
      totalItems,
      totalCost,
      totalWithMargin,
      finalPrice,
      totalTransportCost,
      finalPriceWithTransport
    };
  };

  const totalSummary = calculateTotalSummary();

  // Oblicz dane logistyczne - zestawienie kompozycji pakowania w projekcie
  const calculateLogisticsSummary = () => {
    const compositionSummary = {};

    // Iteruj po wszystkich zakładkach i itemach
    tabs.forEach(tab => {
      tab.items.forEach(item => {
        // Sprawdź czy item ma pakowanie i roczne zapotrzebowanie
        if (!item.packaging || !item.packaging.compositionId || item.packaging.compositionId === 'custom') {
          return;
        }

        const yearlyDemand = parseFloat(item.annualVolume) || 0;
        if (yearlyDemand === 0) return;

        // Pobierz kompozycję pakowania
        const composition = packagingState.compositions.find(c => c.id == item.packaging.compositionId);
        if (!composition) return;

        // Oblicz ile detali w kartonie
        const partsInBox = item.packaging.manualPartsInBox
          ? parseFloat(item.packaging.partsInBox) || 0
          : (parseFloat(item.packaging.partsPerLayer) || 0) * (parseFloat(item.packaging.layers) || 0);

        if (partsInBox === 0) return;

        // Inicjalizuj wpis dla kompozycji jeśli nie istnieje
        if (!compositionSummary[composition.id]) {
          compositionSummary[composition.id] = {
            composition,
            items: [],
            totalYearlyDemand: 0,
            totalBoxes: 0,
            totalPallets: 0,
            totalPalletSpaces: 0
          };
        }

        // Oblicz ilości
        const boxesNeeded = yearlyDemand / partsInBox;
        const palletsNeeded = boxesNeeded / composition.packagesPerPallet;
        const spacesNeeded = palletsNeeded / composition.palletsPerSpace;

        // Dodaj item do listy
        compositionSummary[composition.id].items.push({
          tabName: tab.name,
          partId: item.partId,
          yearlyDemand,
          partsInBox,
          boxesNeeded,
          palletsNeeded,
          spacesNeeded
        });

        // Aktualizuj sumy
        compositionSummary[composition.id].totalYearlyDemand += yearlyDemand;
        compositionSummary[composition.id].totalBoxes += boxesNeeded;
        compositionSummary[composition.id].totalPallets += palletsNeeded;
        compositionSummary[composition.id].totalPalletSpaces += spacesNeeded;
      });
    });

    return Object.values(compositionSummary);
  };

  const logisticsSummary = calculateLogisticsSummary();

  // Mapowanie nazw kosztów na czytelne etykiety
  const getCostLabel = (key) => {
    const labels = {
      materialCost: 'Materiały',
      bakingCost: 'Pieczenie',
      cleaningCost: 'Czyszczenie',
      handlingCost: 'Obsługa',
      customProcessesCost: 'Procesy niestandardowe',
      customCurvesCost: 'Krzywe niestandardowe',
      // Heatshield
      prepCost: 'Przygotówka',
      laserCost: 'Cięcie laserowe',
      bendingCost: 'Gięcie',
      joiningCost: 'Łączenie',
      gluingCost: 'Klejenie'
    };
    return labels[key] || key;
  };

  const ResultCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className={`${themeClasses.card} rounded-lg border p-4`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
          <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${themeClasses.text.secondary}`}>
            {title}
          </h3>
          <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
        Podsumowanie kalkulacji
      </h2>

      {/* Główne statystyki */}
      <div className="grid grid-cols-1 gap-4">
        <ResultCard
          icon={Package}
          title="Elementy w kalkulacji"
          value={totalSummary.totalItems}
          subtitle="elementów z obliczeniami"
          color="gray"
        />

        <ResultCard
          icon={DollarSign}
          title="Koszt całkowity"
          value={`${totalSummary.totalCost.toFixed(2)} €`}
          subtitle="suma wszystkich kosztów"
          color="blue"
        />

        <ResultCard
          icon={TrendingUp}
          title="Cena finalna"
          value={`${totalSummary.finalPrice.toFixed(2)} €`}
          subtitle={`z marżą i SG&A ${globalSGA}%`}
          color="green"
        />

        {totalSummary.totalTransportCost > 0 && (
          <ResultCard
            icon={Truck}
            title="Cena finalna z dostawą"
            value={`${totalSummary.finalPriceWithTransport.toFixed(2)} €`}
            subtitle={`z marżą i SG&A ${globalSGA}%`}
            color="purple"
          />
        )}
      </div>

      {/* Rozkład kosztów projektu - akordeon dla każdej zakładki */}
      {totalSummary.totalItems > 0 && (
        <div className={`${themeClasses.card} rounded-lg border p-4`}>
          <h3 className={`text-lg font-medium mb-3 ${themeClasses.text.primary}`}>
            Rozkład kosztów projektu
          </h3>

          <div className="space-y-2">
            {tabs.map((tab, tabIndex) => {
              const tabSummary = calculateTabSummary(tab);
              if (tabSummary.totalItems === 0) return null;

              const isExpanded = expandedTabs[tab.id];

              return (
                <div key={tab.id} className={`border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  {/* Header zakładki - zawsze widoczny */}
                  <button
                    onClick={() => toggleTab(tab.id)}
                    className={`w-full flex items-center justify-between p-3 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className={`font-semibold ${themeClasses.text.primary}`}>
                        {tab.name || `Zakładka ${tabIndex + 1}`}
                      </span>
                      <span className={`text-xs ${themeClasses.text.secondary}`}>
                        ({tabSummary.totalItems} {tabSummary.totalItems === 1 ? 'element' : 'elementów'})
                      </span>
                    </div>
                    <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                      {tabSummary.finalPrice.toFixed(2)} €
                    </span>
                  </button>

                  {/* Zawartość zakładki - rozwijalna */}
                  {isExpanded && (
                    <div className="p-3 border-t" style={{ borderColor: 'inherit' }}>
                      <div className="space-y-2">
                        {/* Rozkład kosztów zakładki */}
                        {Object.entries(tabSummary.costBreakdown)
                          .sort(([keyA], [keyB]) => {
                            if (keyA === 'materialCost') return -1;
                            if (keyB === 'materialCost') return 1;
                            return getCostLabel(keyA).localeCompare(getCostLabel(keyB));
                          })
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className={themeClasses.text.secondary}>{getCostLabel(key)}:</span>
                              <span className={`font-mono ${themeClasses.text.primary}`}>
                                {value.toFixed(2)} €
                              </span>
                            </div>
                          ))}

                        <hr className={`my-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />

                        <div className="flex justify-between font-semibold text-sm">
                          <span className={themeClasses.text.primary}>Koszt całkowity:</span>
                          <span className={`font-mono ${themeClasses.text.primary}`}>
                            {tabSummary.totalCost.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className={themeClasses.text.secondary}>Z marżą:</span>
                          <span className={`font-mono ${themeClasses.text.primary}`}>
                            {tabSummary.totalWithMargin.toFixed(2)} €
                          </span>
                        </div>

                        <div className="flex justify-between font-bold text-sm text-green-600">
                          <span>Z SG&A {globalSGA}%:</span>
                          <span className="font-mono">
                            {tabSummary.finalPrice.toFixed(2)} €
                          </span>
                        </div>

                        {/* Lista elementów zakładki */}
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'inherit' }}>
                          <h4 className={`text-sm font-medium mb-2 ${themeClasses.text.primary}`}>
                            Lista elementów
                          </h4>
                          <div className="space-y-1" onMouseMove={handleMouseMove}>
                            {tab.items
                              .filter(item => item.results)
                              .map((item, index) => (
                                <div
                                  key={item.id}
                                  className={`flex justify-between items-center p-2 rounded transition-colors text-sm ${
                                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                                  }`}
                                >
                                  <div
                                    className="flex-1 cursor-pointer hover:opacity-80"
                                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                                    onMouseLeave={handleMouseLeave}
                                    onClick={(e) => handleItemClick(item, tab.id, e)}
                                    title="Kliknij aby przypiąć tooltip"
                                  >
                                    <span className={`font-medium ${themeClasses.text.primary}`}>
                                      {item.partId || `Element ${index + 1}`}
                                    </span>
                                    <span className={`ml-2 text-xs ${themeClasses.text.secondary}`}>
                                      ({item.weight}g)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadPDS(item, calculationMeta, packagingState);
                                      }}
                                      className={`p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors`}
                                      title="Generuj PDS (Packaging Data Sheet)"
                                    >
                                      <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                                    </button>
                                    <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                                      {item.results.totalCost.toFixed(2)} €
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Całkowity koszt projektu */}
            <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border-2`}>
              <div className="flex justify-between items-center">
                <span className={`text-lg font-bold ${themeClasses.text.primary}`}>
                  Całkowity koszt projektu:
                </span>
                <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {totalSummary.finalPrice.toFixed(2)} €
                </span>
              </div>
              <p className={`text-xs mt-1 ${themeClasses.text.secondary}`}>
                Suma wszystkich zakładek z marżą i SG&A {globalSGA}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logistyka projektu */}
      {logisticsSummary.length > 0 && (
        <div className={`${themeClasses.card} rounded-lg border p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck size={18} className={themeClasses.text.primary} />
              <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
                Logistyka projektu
              </h3>
            </div>
            <button
              onClick={() => setShowLogistics(!showLogistics)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${themeClasses.button.secondary}`}
            >
              {showLogistics ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {showLogistics ? 'Zwiń' : 'Rozwiń'}
            </button>
          </div>

          {showLogistics && (
            <div className="space-y-3">
              {logisticsSummary.map((compData) => (
                <div key={compData.composition.id} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                  {/* Nagłówek kompozycji */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Box size={16} className={themeClasses.text.primary} />
                      <h4 className={`font-semibold ${themeClasses.text.primary}`}>
                        {compData.composition.name}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                        <span>Kartonów na palecie:</span>
                        <span className={`font-semibold ${themeClasses.text.primary}`}>
                          {compData.composition.packagesPerPallet}
                        </span>
                      </div>
                      <div className={`flex justify-between ${themeClasses.text.secondary}`}>
                        <span>Palet na miejsce:</span>
                        <span className={`font-semibold ${themeClasses.text.primary}`}>
                          {compData.composition.palletsPerSpace}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Podsumowanie roczne */}
                  <div className={`p-3 rounded-lg mb-3 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h5 className={`text-xs font-semibold mb-2 ${themeClasses.text.primary}`}>
                      Zapotrzebowanie roczne:
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className={`block text-xs ${themeClasses.text.secondary}`}>Detali:</span>
                        <span className={`font-mono font-bold ${themeClasses.text.primary}`}>
                          {compData.totalYearlyDemand.toLocaleString('pl-PL')} szt
                        </span>
                      </div>
                      <div>
                        <span className={`block text-xs ${themeClasses.text.secondary}`}>Kartonów:</span>
                        <span className={`font-mono font-bold ${themeClasses.text.primary}`}>
                          {Math.ceil(compData.totalBoxes)} szt
                        </span>
                      </div>
                      <div>
                        <span className={`block text-xs ${themeClasses.text.secondary}`}>Palet:</span>
                        <span className={`font-mono font-bold ${themeClasses.text.primary}`}>
                          {Math.ceil(compData.totalPallets)} szt
                        </span>
                      </div>
                      <div>
                        <span className={`block text-xs ${themeClasses.text.secondary}`}>Miejsc paletowych:</span>
                        <span className={`font-mono font-bold ${themeClasses.text.primary}`}>
                          {Math.ceil(compData.totalPalletSpaces)} szt
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Przedziały czasowe */}
                  <div className={`p-3 rounded-lg mb-3 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h5 className={`text-xs font-semibold mb-2 ${themeClasses.text.primary}`}>
                      Planowanie dostaw:
                    </h5>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className={`block ${themeClasses.text.secondary}`}>Miesięcznie:</span>
                        <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                          ~{Math.ceil(compData.totalPalletSpaces / 12)} mp
                        </span>
                      </div>
                      <div>
                        <span className={`block ${themeClasses.text.secondary}`}>Co 2 tyg:</span>
                        <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                          ~{Math.ceil(compData.totalPalletSpaces / 26)} mp
                        </span>
                      </div>
                      <div>
                        <span className={`block ${themeClasses.text.secondary}`}>Tygodniowo:</span>
                        <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                          ~{Math.ceil(compData.totalPalletSpaces / 52)} mp
                        </span>
                      </div>
                      <div>
                        <span className={`block ${themeClasses.text.secondary}`}>Rocznie:</span>
                        <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                          {Math.ceil(compData.totalPalletSpaces)} mp
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lista elementów używających tej kompozycji */}
                  <details className="text-sm">
                    <summary className={`cursor-pointer font-medium ${themeClasses.text.secondary} hover:text-blue-500`}>
                      Szczegóły ({compData.items.length} {compData.items.length === 1 ? 'element' : 'elementów'})
                    </summary>
                    <div className="mt-2 space-y-1 pl-4">
                      {compData.items.map((item, idx) => (
                        <div key={idx} className={`flex justify-between text-xs p-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                          <div>
                            <span className={`font-medium ${themeClasses.text.primary}`}>
                              {item.partId || 'Element'}
                            </span>
                            <span className={`ml-2 ${themeClasses.text.secondary}`}>
                              ({item.tabName})
                            </span>
                          </div>
                          <div className={`text-right ${themeClasses.text.secondary}`}>
                            <div>{item.yearlyDemand.toLocaleString('pl-PL')} szt/rok</div>
                            <div className="font-mono">{Math.ceil(item.boxesNeeded)} kartonów, {Math.ceil(item.spacesNeeded)} mp</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {totalSummary.totalItems === 0 && (
        <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
          <Package className={`w-12 h-12 mx-auto mb-4 ${themeClasses.text.secondary}`} />
          <h3 className={`text-lg font-medium mb-2 ${themeClasses.text.primary}`}>
            Brak kalkulacji
          </h3>
          <p className={themeClasses.text.secondary}>
            Dodaj elementy i wprowadź wagę, aby zobaczyć wyniki kalkulacji.
          </p>
        </div>
      )}

      {/* Tooltip hover */}
      {hoveredItem && (
        <CostTooltip
          item={hoveredItem}
          position={mousePosition}
          isPinned={false}
          themeClasses={themeClasses}
          darkMode={darkMode}
        />
      )}

      {/* Przypięte tooltips */}
      {pinnedTooltips.map(tooltip => {
        // Znajdź aktualny item z tabs (live data)
        const tab = tabs.find(t => t.id === tooltip.tabId);
        const item = tab?.items.find(i => i.id === tooltip.itemId);

        // Jeśli item nie istnieje (został usunięty), nie renderuj tooltipa
        if (!item || !item.results) return null;

        return (
          <CostTooltip
            key={tooltip.id}
            item={item}
            position={tooltip.position}
            isPinned={true}
            onClose={() => removePinnedTooltip(tooltip.id)}
            themeClasses={themeClasses}
            darkMode={darkMode}
          />
        );
      })}
    </div>
  );
}