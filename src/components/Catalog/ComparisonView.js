import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { STATUS_LABELS } from '../../context/CatalogContext';
import { catalogApi } from '../../services/api';
import { downloadComparisonPDF, downloadComparisonExcel } from '../../services/comparisonExportGenerator';

/**
 * ComparisonView - Modal for comparing multiple calculations side-by-side
 */
export function ComparisonView({ darkMode, themeClasses, selectedIds, calculations, onClose }) {
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load full calculation data for selected IDs
  useEffect(() => {
    const loadCalculations = async () => {
      setLoading(true);
      try {
        const fullCalculations = await Promise.all(
          selectedIds.map(async (id) => {
            const calc = calculations.find(c => c.id === id);
            if (!calc) return null;

            // Fetch full calculation details if needed
            try {
              const response = await catalogApi.getById(id);
              if (response.success && response.data) {
                return response.data;
              }
            } catch (error) {
              console.error(`Error loading calculation ${id}:`, error);
            }
            return calc;
          })
        );

        setComparisonData(fullCalculations.filter(Boolean));
      } catch (error) {
        console.error('Error loading comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedIds && selectedIds.length > 0) {
      loadCalculations();
    }
  }, [selectedIds, calculations]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatCurrency = (value) => {
    return `€${parseFloat(value || 0).toFixed(2)}`;
  };

  // Calculate totals for each calculation
  const calculateTotals = (calc) => {
    const items = calc.items || [];

    const totalRevenueEXW = items.reduce((sum, item) => {
      const annualVolume = parseFloat(item.annualVolume || 0);
      const exwPrice = item.results?.totalWithSGA || 0;
      return sum + (annualVolume * exwPrice);
    }, 0);

    const totalRevenueDAP = items.reduce((sum, item) => {
      const annualVolume = parseFloat(item.annualVolume || 0);
      const exwPrice = item.results?.totalWithSGA || 0;
      const transportCost = item.results?.transportCost || 0;
      const unitCost = exwPrice + transportCost;
      return sum + (annualVolume * unitCost);
    }, 0);

    const totalProfit = items.reduce((sum, item) => {
      const annualVolume = parseFloat(item.annualVolume || 0);
      const marginPercent = parseFloat(item.margin || 0);
      const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
      return sum + (annualVolume * unitMargin);
    }, 0);

    const totalParts = items.length;

    const avgMargin = items.length > 0
      ? items.reduce((sum, item) => sum + parseFloat(item.margin || 0), 0) / items.length
      : 0;

    return {
      totalRevenueEXW,
      totalRevenueDAP,
      totalProfit,
      totalParts,
      avgMargin
    };
  };

  // Export handlers
  const handleExportToPDF = () => {
    try {
      downloadComparisonPDF(comparisonData);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Błąd podczas eksportu do PDF');
    }
  };

  const handleExportToExcel = () => {
    try {
      downloadComparisonExcel(comparisonData);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Błąd podczas eksportu do Excel');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`${themeClasses.card} rounded-lg shadow-xl p-6`}>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className={themeClasses.text.primary}>Ładowanie danych...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-bold ${themeClasses.text.primary} flex items-center gap-2`}>
              Porównanie Kalkulacji
              <span className="text-sm font-normal text-purple-600">
                ({comparisonData.length} kalkulacji)
              </span>
            </h2>
            <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
              Porównanie kluczowych wskaźników i detali
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToPDF}
              className={`p-2 rounded-lg ${themeClasses.button.secondary} hover:bg-purple-100 dark:hover:bg-purple-900`}
              title="Eksportuj porównanie do PDF"
            >
              <FileText size={20} />
            </button>
            <button
              onClick={handleExportToExcel}
              className={`p-2 rounded-lg ${themeClasses.button.secondary} hover:bg-purple-100 dark:hover:bg-purple-900`}
              title="Eksportuj porównanie do Excel"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                  <th className={`sticky left-0 z-10 px-4 py-3 text-left font-medium ${themeClasses.background} ${themeClasses.text.secondary}`}>
                    Parametr
                  </th>
                  {comparisonData.map((calc, idx) => (
                    <th key={calc.id} className={`px-4 py-3 text-left font-medium min-w-[200px] ${themeClasses.text.primary}`}>
                      Kalkulacja #{calc.id}
                      {idx === 0 && <span className="ml-2 text-xs text-blue-600">(bazowa)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Podstawowe informacje */}
                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-purple-50 dark:bg-purple-900/20`}>
                  <td colSpan={comparisonData.length + 1} className={`px-4 py-2 font-semibold ${themeClasses.text.primary}`}>
                    PODSTAWOWE INFORMACJE
                  </td>
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Klient</td>
                  {comparisonData.map(calc => (
                    <td key={calc.id} className={`px-4 py-3 ${themeClasses.text.primary}`}>
                      {calc.client || '-'}
                    </td>
                  ))}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Status</td>
                  {comparisonData.map(calc => (
                    <td key={calc.id} className={`px-4 py-3`}>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        calc.status === 'nominated' ? 'bg-green-100 text-green-800' :
                        calc.status === 'not_nominated' ? 'bg-red-100 text-red-800' :
                        calc.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        calc.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {STATUS_LABELS[calc.status] || '-'}
                      </span>
                    </td>
                  ))}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Data modyfikacji</td>
                  {comparisonData.map(calc => (
                    <td key={calc.id} className={`px-4 py-3 ${themeClasses.text.primary}`}>
                      {formatDate(calc.modifiedDate || calc.createdDate)}
                    </td>
                  ))}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Właściciel</td>
                  {comparisonData.map(calc => (
                    <td key={calc.id} className={`px-4 py-3 ${themeClasses.text.primary}`}>
                      {calc.ownerName || calc.ownerId || '-'}
                    </td>
                  ))}
                </tr>

                {/* Podsumowanie finansowe */}
                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-purple-50 dark:bg-purple-900/20`}>
                  <td colSpan={comparisonData.length + 1} className={`px-4 py-2 font-semibold ${themeClasses.text.primary}`}>
                    PODSUMOWANIE FINANSOWE
                  </td>
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Liczba detali</td>
                  {comparisonData.map(calc => {
                    const totals = calculateTotals(calc);
                    return (
                      <td key={calc.id} className={`px-4 py-3 font-medium ${themeClasses.text.primary}`}>
                        {totals.totalParts}
                      </td>
                    );
                  })}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Obrót (EXW)</td>
                  {comparisonData.map(calc => {
                    const totals = calculateTotals(calc);
                    return (
                      <td key={calc.id} className={`px-4 py-3 font-medium text-blue-600`}>
                        {formatCurrency(totals.totalRevenueEXW)}
                      </td>
                    );
                  })}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Obrót (DAP)</td>
                  {comparisonData.map(calc => {
                    const totals = calculateTotals(calc);
                    return (
                      <td key={calc.id} className={`px-4 py-3 font-medium text-purple-600`}>
                        {formatCurrency(totals.totalRevenueDAP)}
                      </td>
                    );
                  })}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Przychód</td>
                  {comparisonData.map(calc => {
                    const totals = calculateTotals(calc);
                    return (
                      <td key={calc.id} className={`px-4 py-3 font-medium text-green-600`}>
                        {formatCurrency(totals.totalProfit)}
                      </td>
                    );
                  })}
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Średnia marża</td>
                  {comparisonData.map(calc => {
                    const totals = calculateTotals(calc);
                    return (
                      <td key={calc.id} className={`px-4 py-3 font-medium ${themeClasses.text.primary}`}>
                        {totals.avgMargin.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>

                {/* Różnice procentowe względem bazowej */}
                {comparisonData.length > 1 && (
                  <>
                    <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-orange-50 dark:bg-orange-900/20`}>
                      <td colSpan={comparisonData.length + 1} className={`px-4 py-2 font-semibold ${themeClasses.text.primary}`}>
                        RÓŻNICE WZGLĘDEM BAZOWEJ (kalkulacja #{comparisonData[0].id})
                      </td>
                    </tr>

                    <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Różnica obrotu (DAP)</td>
                      {comparisonData.map((calc, idx) => {
                        if (idx === 0) {
                          return <td key={calc.id} className={`px-4 py-3 text-gray-400`}>-</td>;
                        }
                        const baseTotal = calculateTotals(comparisonData[0]).totalRevenueDAP;
                        const currentTotal = calculateTotals(calc).totalRevenueDAP;
                        const diff = currentTotal - baseTotal;
                        const diffPercent = baseTotal > 0 ? ((diff / baseTotal) * 100) : 0;
                        return (
                          <td key={calc.id} className={`px-4 py-3 font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            <span className="ml-2 text-xs">
                              ({diff >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Różnica przychodu</td>
                      {comparisonData.map((calc, idx) => {
                        if (idx === 0) {
                          return <td key={calc.id} className={`px-4 py-3 text-gray-400`}>-</td>;
                        }
                        const baseTotal = calculateTotals(comparisonData[0]).totalProfit;
                        const currentTotal = calculateTotals(calc).totalProfit;
                        const diff = currentTotal - baseTotal;
                        const diffPercent = baseTotal > 0 ? ((diff / baseTotal) * 100) : 0;
                        return (
                          <td key={calc.id} className={`px-4 py-3 font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            <span className="ml-2 text-xs">
                              ({diff >= 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </>
                )}

                {/* Notatki */}
                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-purple-50 dark:bg-purple-900/20`}>
                  <td colSpan={comparisonData.length + 1} className={`px-4 py-2 font-semibold ${themeClasses.text.primary}`}>
                    NOTATKI
                  </td>
                </tr>

                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${themeClasses.background} ${themeClasses.text.secondary}`}>Notatki</td>
                  {comparisonData.map(calc => (
                    <td key={calc.id} className={`px-4 py-3 ${themeClasses.text.primary} max-w-xs`}>
                      <div className="whitespace-pre-wrap text-xs">
                        {calc.notes || '-'}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
