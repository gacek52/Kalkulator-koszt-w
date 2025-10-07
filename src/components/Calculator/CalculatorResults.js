import React from 'react';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import { CostTooltip, useTooltips } from '../Common/CostTooltip';

/**
 * Komponent wyświetlający wyniki kalkulacji
 */
export function CalculatorResults({ tab, globalSGA, themeClasses, darkMode }) {
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

  const calculateSummary = () => {
    const validItems = tab.items.filter(item => item.results);

    if (validItems.length === 0) {
      return {
        totalItems: 0,
        costBreakdown: {},
        totalCost: 0,
        totalWithMargin: 0,
        finalPrice: 0
      };
    }

    // Dynamiczne zbieranie wszystkich kategorii kosztów
    const costBreakdown = {};
    let totalCost = 0;
    let totalWithMargin = 0;

    validItems.forEach(item => {
      const results = item.results;

      // Agreguj wszystkie koszty z wyników (pomijając sumy i wagi)
      Object.keys(results).forEach(key => {
        // Pomijamy pola które nie są kosztami jednostkowymi
        if (key === 'totalCost' || key === 'totalWithMargin' || key === 'totalWithSGA' ||
            key === 'nettoWeight' || key === 'bruttoWeight' ||
            key === 'bakingTime' || key === 'cleaningTime' || key === 'prepTime' ||
            key === 'customCurveCosts') {
          return;
        }

        const value = parseFloat(results[key]) || 0;
        if (value > 0) {
          costBreakdown[key] = (costBreakdown[key] || 0) + value;
        }
      });

      totalCost += results.totalCost || 0;
      totalWithMargin += results.totalWithMargin || 0;
    });

    // Oblicz finalną cenę z SG&A (aplikowane do ceny po marży)
    const sgaPercent = parseFloat(globalSGA) || 0;
    const finalPrice = totalWithMargin * (1 + sgaPercent / 100);

    return {
      totalItems: validItems.length,
      costBreakdown,
      totalCost,
      totalWithMargin,
      finalPrice
    };
  };

  const summary = calculateSummary();

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
          value={summary.totalItems}
          subtitle="elementów z obliczeniami"
          color="gray"
        />

        <ResultCard
          icon={DollarSign}
          title="Koszt całkowity"
          value={`${summary.totalCost.toFixed(2)} €`}
          subtitle="suma wszystkich kosztów"
          color="blue"
        />

        <ResultCard
          icon={TrendingUp}
          title="Cena finalna"
          value={`${summary.finalPrice.toFixed(2)} €`}
          subtitle={`z marżą i SG&A ${globalSGA}%`}
          color="green"
        />
      </div>

      {/* Szczegółowy rozkład kosztów */}
      {summary.totalItems > 0 && (
        <div className={`${themeClasses.card} rounded-lg border p-4`}>
          <h3 className={`text-lg font-medium mb-3 ${themeClasses.text.primary}`}>
            Rozkład kosztów
          </h3>

          <div className="space-y-2">
            {/* Dynamiczne wyświetlanie wszystkich kategorii kosztów */}
            {Object.entries(summary.costBreakdown)
              .sort(([keyA], [keyB]) => {
                // Sortuj: materialCost na początku, potem alfabetycznie
                if (keyA === 'materialCost') return -1;
                if (keyB === 'materialCost') return 1;
                return getCostLabel(keyA).localeCompare(getCostLabel(keyB));
              })
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className={themeClasses.text.secondary}>{getCostLabel(key)}:</span>
                  <span className={`font-mono ${themeClasses.text.primary}`}>
                    {value.toFixed(2)} €
                  </span>
                </div>
              ))}

            <hr className={`my-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`} />

            <div className="flex justify-between font-semibold">
              <span className={themeClasses.text.primary}>Koszt całkowity:</span>
              <span className={`font-mono ${themeClasses.text.primary}`}>
                {summary.totalCost.toFixed(2)} €
              </span>
            </div>

            <div className="flex justify-between">
              <span className={themeClasses.text.secondary}>Z marżą:</span>
              <span className={`font-mono ${themeClasses.text.primary}`}>
                {summary.totalWithMargin.toFixed(2)} €
              </span>
            </div>

            <div className="flex justify-between font-bold text-green-600">
              <span>Z SG&A {globalSGA}%:</span>
              <span className="font-mono">
                {summary.finalPrice.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lista elementów */}
      {summary.totalItems > 0 && (
        <div className={`${themeClasses.card} rounded-lg border p-4`}>
          <h3 className={`text-lg font-medium mb-3 ${themeClasses.text.primary}`}>
            Lista elementów
          </h3>

          <div className="space-y-2" onMouseMove={handleMouseMove}>
            {tab.items
              .filter(item => item.results)
              .map((item, index) => (
                <div
                  key={item.id}
                  className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onMouseEnter={(e) => handleMouseEnter(item, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleItemClick(item, e)}
                  title="Kliknij aby przypiąć tooltip"
                >
                  <div>
                    <span className={`font-medium ${themeClasses.text.primary}`}>
                      {item.partId || `Element ${index + 1}`}
                    </span>
                    <span className={`ml-2 text-sm ${themeClasses.text.secondary}`}>
                      ({item.weight}g)
                    </span>
                  </div>
                  <span className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                    {item.results.totalCost.toFixed(2)} €
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {summary.totalItems === 0 && (
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
      {pinnedTooltips.map(tooltip => (
        <CostTooltip
          key={tooltip.id}
          item={tooltip.item}
          position={tooltip.position}
          isPinned={true}
          onClose={() => removePinnedTooltip(tooltip.id)}
          themeClasses={themeClasses}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}