import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Filter, Plus, Edit2, Trash2, Sun, Moon, Package, Layers, Users, Settings, Eye } from 'lucide-react';
import { useCatalog, STATUS_LABELS, CALCULATION_STATUS } from '../../context/CatalogContext';
import { useSession } from '../../context/SessionContext';
import { SessionRestoreDialog } from '../Session/SessionRestoreDialog';

/**
 * Komponent widoku katalogu kalkulacji
 */
export function CatalogView({ themeClasses, darkMode, onToggleDarkMode, onNewCalculation, onLoadCalculation, onBackToCalculator, onOpenPackaging, onOpenMaterials, onOpenClients, onOpenClientManualSettings, onOpenClientManualPreview, hasActiveCalculation }) {
  const { state: catalogState, actions: catalogActions, filteredCalculations, summary } = useCatalog();
  const { filters, sortBy, sortOrder } = catalogState;
  const { activeSession, clearSession, loadCalculationToSession } = useSession();

  const [expandedCalculations, setExpandedCalculations] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSessionRestoreDialog, setShowSessionRestoreDialog] = useState(false);
  const [sessionRestoreChecked, setSessionRestoreChecked] = useState(false);

  // Sprawdź czy jest aktywna sesja przy pierwszym wejściu
  useEffect(() => {
    if (!sessionRestoreChecked && activeSession && !hasActiveCalculation) {
      setShowSessionRestoreDialog(true);
      setSessionRestoreChecked(true);
    }
  }, [activeSession, sessionRestoreChecked, hasActiveCalculation]);

  // Obsługa przywracania sesji
  const handleRestoreSession = () => {
    if (activeSession && activeSession.calculation) {
      // Załaduj kalkulację z sesji
      onLoadCalculation(activeSession.calculation);
    }
    setShowSessionRestoreDialog(false);
  };

  // Obsługa odrzucenia sesji
  const handleDiscardSession = () => {
    clearSession();
    setShowSessionRestoreDialog(false);
  };

  // Obsługa anulowania
  const handleCancelRestore = () => {
    setShowSessionRestoreDialog(false);
  };

  // Toggle rozwinięcia kalkulacji
  const toggleExpanded = (calcId) => {
    setExpandedCalculations(prev => ({
      ...prev,
      [calcId]: !prev[calcId]
    }));
  };

  // Zmiana sortowania
  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    catalogActions.setSort(field, newOrder);
  };

  // Formatowanie dat
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Formatowanie waluty
  const formatCurrency = (value) => {
    return `€${parseFloat(value || 0).toFixed(2)}`;
  };

  return (
    <div className={`${themeClasses.background} min-h-screen`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Katalog Kalkulacji
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Zarządzaj swoimi kalkulacjami kosztów
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveCalculation && (
                <button
                  onClick={onBackToCalculator}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.success} flex items-center gap-2`}
                  title="Powrót do edytowanej kalkulacji"
                >
                  ← Powrót do kalkulatora
                </button>
              )}

              <button
                onClick={onToggleDarkMode}
                className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
              >
                <Filter size={16} />
                Filtry
              </button>

              <button
                onClick={onOpenPackaging}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                title="Zarządzanie pakowaniem"
              >
                <Package size={16} />
                Pakowanie
              </button>

              <button
                onClick={onOpenMaterials}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                title="Zarządzanie materiałami"
              >
                <Layers size={16} />
                Materiały
              </button>

              <button
                onClick={onOpenClients}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                title="Zarządzanie klientami"
              >
                <Users size={16} />
                Klienci
              </button>

              <div className="flex">
                <button
                  onClick={onOpenClientManualSettings}
                  className={`px-3 py-2 rounded-l-lg font-medium ${themeClasses.button.secondary} border-r ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                  title="Ustawienia Client Manual - edycja stawek i kosztów"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={onOpenClientManualPreview}
                  className={`px-4 py-2 rounded-r-lg font-medium ${themeClasses.button.secondary}`}
                  title="Podgląd Client Manual - tylko do odczytu"
                >
                  Client Manual
                </button>
              </div>

              <button
                onClick={onNewCalculation}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
              >
                <Plus size={16} />
                Nowa kalkulacja
              </button>
            </div>
          </div>

          {/* Filtry */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Klient
                  </label>
                  <input
                    type="text"
                    value={filters.client}
                    onChange={(e) => catalogActions.setFilter({ client: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="Wyszukaj klienta..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => catalogActions.setFilter({ status: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  >
                    <option value="">Wszystkie</option>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Data od
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => catalogActions.setFilter({ dateFrom: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Data do
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => catalogActions.setFilter({ dateTo: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Podsumowanie */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-sm ${themeClasses.text.secondary}`}>Liczba kalkulacji</p>
              <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>{summary.count}</p>
            </div>
            <div>
              <p className={`text-sm ${themeClasses.text.secondary}`}>Całkowity obrót</p>
              <p className={`text-2xl font-bold text-blue-600`}>{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <div>
              <p className={`text-sm ${themeClasses.text.secondary}`}>Całkowity przychód</p>
              <p className={`text-2xl font-bold text-green-600`}>{formatCurrency(summary.totalProfit)}</p>
            </div>
          </div>
        </div>

        {/* Tabela kalkulacji */}
        <div className={`${themeClasses.card} rounded-lg border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${themeClasses.background} border-b border-gray-200 dark:border-gray-600`}>
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('calculationId')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1`}
                    >
                      ID
                      {sortBy === 'calculationId' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('client')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1`}
                    >
                      Klient
                      {sortBy === 'client' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1`}
                    >
                      Data
                      {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1`}
                    >
                      Status
                      {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('revenue')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1 ml-auto`}
                    >
                      Obrót
                      {sortBy === 'revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort('profit')}
                      className={`text-sm font-medium ${themeClasses.text.secondary} hover:text-blue-600 flex items-center gap-1 ml-auto`}
                    >
                      Przychód
                      {sortBy === 'profit' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCalculations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <p className={themeClasses.text.secondary}>Brak kalkulacji do wyświetlenia</p>
                    </td>
                  </tr>
                ) : (
                  filteredCalculations.map((calc) => {
                    // Oblicz sumy obrotu i przychodu z wszystkich detali
                    const calculatedRevenue = (calc.items || []).reduce((sum, item) => {
                      const annualVolume = parseFloat(item.annualVolume || 0);
                      const unitCost = item.results?.totalWithSGA || 0;
                      return sum + (annualVolume * unitCost);
                    }, 0);

                    const calculatedProfit = (calc.items || []).reduce((sum, item) => {
                      const annualVolume = parseFloat(item.annualVolume || 0);
                      const marginPercent = parseFloat(item.margin || 0);
                      const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
                      return sum + (annualVolume * unitMargin);
                    }, 0);

                    return (
                    <React.Fragment key={calc.id}>
                      <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                        <td className={`px-4 py-3 ${themeClasses.text.primary}`}>#{calc.id}</td>
                        <td className={`px-4 py-3 ${themeClasses.text.primary}`}>{calc.client || '-'}</td>
                        <td className={`px-4 py-3 ${themeClasses.text.secondary} text-sm`}>
                          {formatDate(calc.modifiedDate || calc.createdDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            calc.status === CALCULATION_STATUS.NOMINATED ? 'bg-green-100 text-green-800' :
                            calc.status === CALCULATION_STATUS.NOT_NOMINATED ? 'bg-red-100 text-red-800' :
                            calc.status === CALCULATION_STATUS.SENT ? 'bg-blue-100 text-blue-800' :
                            calc.status === CALCULATION_STATUS.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {STATUS_LABELS[calc.status] || '-'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${themeClasses.text.primary}`}>
                          {formatCurrency(calculatedRevenue)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium text-green-600`}>
                          {formatCurrency(calculatedProfit)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => toggleExpanded(calc.id)}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
                              title="Pokaż szczegóły"
                            >
                              {expandedCalculations[calc.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button
                              onClick={() => onLoadCalculation(calc)}
                              className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
                              title="Wczytaj kalkulację"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => catalogActions.removeCalculation(calc.id)}
                              className={`p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600`}
                              title="Usuń kalkulację"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Rozwinięte szczegóły */}
                      {expandedCalculations[calc.id] && (
                        <tr className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                          <td colSpan="7" className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Notatki */}
                              {calc.notes && (
                                <div>
                                  <p className={`text-sm font-medium ${themeClasses.text.secondary} mb-1`}>Notatki:</p>
                                  <p className={`text-sm ${themeClasses.text.primary}`}>{calc.notes}</p>
                                </div>
                              )}

                              {/* Szczegóły detali */}
                              {calc.items && calc.items.length > 0 && (
                                <div>
                                  <p className={`text-sm font-medium ${themeClasses.text.secondary} mb-2`}>
                                    Detale ({calc.items.length}):
                                  </p>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${themeClasses.text.secondary}`}>
                                          <th className="text-left py-2">Part ID</th>
                                          <th className="text-left py-2">Materiał</th>
                                          <th className="text-right py-2">Roczna ilość</th>
                                          <th className="text-right py-2">Koszt jednostkowy</th>
                                          <th className="text-right py-2">Wpływ na obrót</th>
                                          <th className="text-right py-2">Wpływ na przychód</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {calc.items.map((item, idx) => {
                                          const annualVolume = parseFloat(item.annualVolume || 0);
                                          const unitCost = item.results?.totalWithSGA || 0;
                                          const itemRevenue = annualVolume * unitCost;

                                          // Oblicz przychód używając marży z detalu (tak jak w tooltipie)
                                          const marginPercent = parseFloat(item.margin || 0);
                                          const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
                                          const itemProfit = annualVolume * unitMargin;

                                          return (
                                            <tr key={idx} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${themeClasses.text.primary}`}>
                                              <td className="py-2">{item.partId || '-'}</td>
                                              <td className="py-2">{item.tabName || '-'}</td>
                                              <td className="text-right">{annualVolume.toLocaleString()}</td>
                                              <td className="text-right">{formatCurrency(unitCost)}</td>
                                              <td className="text-right font-medium">{formatCurrency(itemRevenue)}</td>
                                              <td className={`text-right font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{formatCurrency(itemProfit)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Session Restore Dialog */}
      {showSessionRestoreDialog && (
        <SessionRestoreDialog
          session={activeSession}
          onRestore={handleRestoreSession}
          onDiscard={handleDiscardSession}
          onCancel={handleCancelRestore}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}