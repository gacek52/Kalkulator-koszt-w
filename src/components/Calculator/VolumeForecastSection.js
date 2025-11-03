import React, { useState } from 'react';
import { Calendar, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Komponent sekcji prognozy wolumenu produkcji w latach
 * Umożliwia definiowanie prognozowanych ilości produkcji dla każdego roku
 */
export function VolumeForecastSection({ item, onUpdate, themeClasses, darkMode }) {
  const forecastEnabled = item.volumeForecast?.enabled || false;
  const forecastYears = item.volumeForecast?.years || {};

  // Stan lokalny dla zakresu lat
  const [yearRange, setYearRange] = useState(() => {
    const years = Object.keys(forecastYears).map(y => parseInt(y));
    const currentYear = new Date().getFullYear();
    return {
      from: years.length > 0 ? Math.min(...years) : currentYear,
      to: years.length > 0 ? Math.max(...years) : currentYear + 10
    };
  });

  // Stan zwijania kalendarza (niezależny od checkbox)
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleForecast = () => {
    if (!forecastEnabled) {
      // Włączanie - inicjalizuj z pustym obiektem lat
      const currentYear = new Date().getFullYear();
      const initialYears = {};
      for (let year = currentYear; year <= currentYear + 10; year++) {
        initialYears[year] = 0;
      }

      onUpdate({
        volumeForecast: {
          enabled: true,
          years: initialYears
        }
      });

      setYearRange({
        from: currentYear,
        to: currentYear + 10
      });
    } else {
      // Wyłączanie
      onUpdate({
        volumeForecast: {
          enabled: false,
          years: {}
        }
      });
    }
  };

  const handleYearValueChange = (year, value) => {
    const numValue = parseFloat(value) || 0;
    onUpdate({
      volumeForecast: {
        enabled: true,
        years: {
          ...forecastYears,
          [year]: numValue
        }
      }
    });
  };

  const handleExtendRange = () => {
    const newYears = { ...forecastYears };

    // Dodaj nowe lata w nowym zakresie
    for (let year = yearRange.from; year <= yearRange.to; year++) {
      if (!newYears[year]) {
        newYears[year] = 0;
      }
    }

    onUpdate({
      volumeForecast: {
        enabled: true,
        years: newYears
      }
    });
  };

  const handleRemoveYear = (year) => {
    const newYears = { ...forecastYears };
    delete newYears[year];

    onUpdate({
      volumeForecast: {
        enabled: true,
        years: newYears
      }
    });
  };

  const handleCopyFromAnnualVolume = () => {
    const annualVolume = parseFloat(item.annualVolume) || 0;
    const newYears = {};

    for (let year = yearRange.from; year <= yearRange.to; year++) {
      newYears[year] = annualVolume;
    }

    onUpdate({
      volumeForecast: {
        enabled: true,
        years: newYears
      }
    });
  };

  // Oblicz sumę wszystkich lat
  const totalVolume = Object.values(forecastYears).reduce((sum, vol) => sum + (parseFloat(vol) || 0), 0);

  // Posortowane lata
  const sortedYears = Object.keys(forecastYears)
    .map(y => parseInt(y))
    .sort((a, b) => a - b);

  return (
    <div className={`${themeClasses.card} rounded-lg border p-4 mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${themeClasses.text.secondary}`}
            title={isExpanded ? "Zwiń kalendarz" : "Rozwiń kalendarz"}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forecastEnabled}
              onChange={handleToggleForecast}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Calendar size={18} className={themeClasses.text.primary} />
            <span className={`font-medium ${themeClasses.text.primary}`}>
              Kalendarz prognoz wolumenu
            </span>
          </label>
        </div>

        {forecastEnabled && (
          <span className={`text-sm ${themeClasses.text.secondary}`}>
            Suma: <span className="font-bold text-blue-600">{totalVolume.toLocaleString()}</span> szt
          </span>
        )}
      </div>

      {forecastEnabled && isExpanded && (
        <div className="space-y-3">
          {/* Zakres lat - kontrolki */}
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Od roku:
                </label>
                <input
                  type="number"
                  value={yearRange.from}
                  onChange={(e) => setYearRange(prev => ({ ...prev, from: parseInt(e.target.value) || prev.from }))}
                  className={`w-20 px-2 py-1 border rounded ${themeClasses.input} text-sm`}
                  min="2020"
                  max="2100"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Do roku:
                </label>
                <input
                  type="number"
                  value={yearRange.to}
                  onChange={(e) => setYearRange(prev => ({ ...prev, to: parseInt(e.target.value) || prev.to }))}
                  className={`w-20 px-2 py-1 border rounded ${themeClasses.input} text-sm`}
                  min="2020"
                  max="2100"
                />
              </div>

              <button
                onClick={handleExtendRange}
                className={`px-3 py-1 rounded text-sm font-medium ${themeClasses.button.primary} flex items-center gap-1`}
                title="Rozszerz zakres lat"
              >
                <Plus size={14} />
                Rozszerz zakres
              </button>

              <button
                onClick={handleCopyFromAnnualVolume}
                className={`px-3 py-1 rounded text-sm font-medium ${themeClasses.button.secondary} text-xs`}
                title="Skopiuj wartość z 'Ilość roczna' do wszystkich lat"
              >
                Kopiuj z rocznej ({item.annualVolume || 0})
              </button>
            </div>

            <p className={`text-xs ${themeClasses.text.secondary}`}>
              Ustaw zakres lat i kliknij "Rozszerz zakres" aby dodać nowe lata do prognozy
            </p>
          </div>

          {/* Grid lat i wolumenów */}
          {sortedYears.length > 0 ? (
            <div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {sortedYears.map(year => (
                  <div
                    key={year}
                    className={`flex items-center gap-2 p-2 rounded border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'}`}
                  >
                    <span className={`font-medium text-sm min-w-[45px] ${themeClasses.text.primary}`}>
                      {year}
                    </span>
                    <input
                      type="number"
                      value={forecastYears[year] || 0}
                      onChange={(e) => handleYearValueChange(year, e.target.value)}
                      className={`flex-1 px-2 py-1 border rounded text-right text-sm ${themeClasses.input}`}
                      min="0"
                      step="1"
                    />
                    <button
                      onClick={() => handleRemoveYear(year)}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                      title="Usuń rok"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className={`p-2 rounded border-2 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-400 bg-gray-50'} flex justify-between items-center`}>
                <span className={`font-bold text-sm ${themeClasses.text.primary}`}>SUMA</span>
                <span className="font-bold text-sm text-blue-600">
                  {totalVolume.toLocaleString()} szt
                </span>
              </div>
            </div>
          ) : (
            <div className={`text-center py-3 ${themeClasses.text.secondary}`}>
              <p className="text-sm">Brak zdefiniowanych lat. Ustaw zakres i kliknij "Rozszerz zakres".</p>
            </div>
          )}

          {/* Info o relacji z annualVolume */}
          <div className={`text-xs ${themeClasses.text.secondary} p-2 rounded ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
            ℹ️ <strong>Uwaga:</strong> Kalendarz prognoz służy do planowania wieloletniego.
            Pole "Ilość roczna" ({item.annualVolume || 0} szt) nadal jest używane w kalkulacjach jednostkowych.
            Kalendarz będzie wykorzystywany w dashboard capacity timeline.
          </div>
        </div>
      )}
    </div>
  );
}
