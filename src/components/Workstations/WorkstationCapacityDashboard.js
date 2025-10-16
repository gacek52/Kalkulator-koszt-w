import React, { useState, useMemo } from 'react';
import { Activity, ArrowLeft, Sun, Moon, Filter, TrendingUp, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useWorkstation } from '../../context/WorkstationContext';
import { useCatalog, STATUS_LABELS } from '../../context/CatalogContext';
import {
  calculateWorkstationUtilization,
  filterUtilizationData,
  sortUtilizationData
} from '../../utils/workstationCapacity';

/**
 * Dashboard zajętości stanowisk produkcyjnych
 */
export function WorkstationCapacityDashboard({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state: workstationState } = useWorkstation();
  const { state: catalogState, utils: catalogUtils, actions: catalogActions } = useCatalog();

  // Stan filtrów
  const [filters, setFilters] = useState({
    showOnlyOverloaded: false,
    workstationType: '',
    minUtilization: 0,
    maxUtilization: 200
  });

  // Stan sortowania
  const [sortBy, setSortBy] = useState('utilization');
  const [sortOrder, setSortOrder] = useState('desc');

  // Stan rozwinięć
  const [expandedWorkstations, setExpandedWorkstations] = useState({});

  // Lokalna historia zaznaczonych kalkulacji (pozostaje dopóki użytkownik nie wyjdzie z dashboardu)
  const [localSelectedHistory, setLocalSelectedHistory] = useState([]);

  // Aktualizuj lokalną historię gdy zmienia się customSelectedIds
  React.useEffect(() => {
    const currentIds = catalogState.capacityFilters.customSelectedIds || [];

    // Dodaj nowe ID do historii (zachowując kolejność dodawania)
    setLocalSelectedHistory(prev => {
      const newIds = currentIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [catalogState.capacityFilters.customSelectedIds]);

  // Funkcja do usunięcia kalkulacji z lokalnej historii
  const removeFromHistory = (calcId) => {
    setLocalSelectedHistory(prev => prev.filter(id => id !== calcId));
    // Jeśli kalkulacja jest jeszcze zaznaczona w globalnym stanie, odznacz ją
    if (catalogState.capacityFilters.customSelectedIds.includes(calcId)) {
      catalogActions.toggleCalculationForCapacity(calcId);
    }
  };

  // Oblicz wykorzystanie stanowisk (z filtrowaniem kalkulacji)
  const utilizationData = useMemo(() => {
    try {
      if (!catalogState || !catalogState.calculations) {
        console.warn('catalogState or calculations is undefined');
        return {};
      }
      if (!workstationState || !workstationState.workstations) {
        console.warn('workstationState or workstations is undefined');
        return {};
      }

      // Filtruj kalkulacje według capacity filters
      const filteredCalculations = catalogUtils.filterCalculationsForCapacity(
        catalogState.calculations,
        catalogState.capacityFilters
      );

      return calculateWorkstationUtilization(filteredCalculations, workstationState.workstations);
    } catch (error) {
      console.error('Error calculating workstation utilization:', error);
      return {};
    }
  }, [catalogState, workstationState, catalogUtils]);

  // Zastosuj filtry
  const filteredData = useMemo(() => {
    return filterUtilizationData(utilizationData, filters);
  }, [utilizationData, filters]);

  // Sortuj dane
  const sortedData = useMemo(() => {
    return sortUtilizationData(filteredData, sortBy, sortOrder);
  }, [filteredData, sortBy, sortOrder]);

  // Pobierz unikalne typy stanowisk
  const workstationTypes = useMemo(() => {
    const types = new Set();
    workstationState.workstations.forEach(ws => types.add(ws.type));
    return Array.from(types);
  }, [workstationState.workstations]);

  // Przełącz rozwinięcie stanowiska
  const toggleWorkstation = (wsId) => {
    setExpandedWorkstations(prev => ({
      ...prev,
      [wsId]: !prev[wsId]
    }));
  };

  // Oblicz statystyki
  const stats = useMemo(() => {
    const totalWorkstations = workstationState.workstations.length;
    const overloadedCount = Object.values(utilizationData).filter(d => d.utilizationPercent > 100).length;
    const underutilizedCount = Object.values(utilizationData).filter(d => d.utilizationPercent < 50).length;
    const totalAvailableHours = Object.values(utilizationData).reduce((sum, d) => sum + d.availableHours, 0);
    const totalRequiredHours = Object.values(utilizationData).reduce((sum, d) => sum + d.totalRequiredHours, 0);
    const avgUtilization = totalAvailableHours > 0 ? (totalRequiredHours / totalAvailableHours) * 100 : 0;

    return {
      totalWorkstations,
      overloadedCount,
      underutilizedCount,
      avgUtilization,
      totalAvailableHours,
      totalRequiredHours
    };
  }, [utilizationData, workstationState.workstations]);

  // Funkcja do uzyskania koloru dla % wykorzystania
  const getUtilizationColor = (percent) => {
    if (percent > 100) return darkMode ? 'text-red-400' : 'text-red-600';
    if (percent > 80) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    if (percent < 50) return darkMode ? 'text-blue-400' : 'text-blue-600';
    return darkMode ? 'text-green-400' : 'text-green-600';
  };

  const getUtilizationBgColor = (percent) => {
    if (percent > 100) return darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
    if (percent > 80) return darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
    if (percent < 50) return darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200';
    return darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
  };

  return (
    <div className={`${themeClasses.background} min-h-screen`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Dashboard zajętości stanowisk
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Analiza wykorzystania capacity stanowisk produkcyjnych
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
              >
                <ArrowLeft size={16} />
                Powrót
              </button>

              <button
                onClick={onToggleDarkMode}
                className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Wszystkie stanowiska</p>
                <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>{stats.totalWorkstations}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Przeciążone (>100%)</p>
                <p className={`text-2xl font-bold text-red-600 dark:text-red-400`}>{stats.overloadedCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Niewykorzystane (&lt;50%)</p>
                <p className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>{stats.underutilizedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Średnie wykorzystanie</p>
                <p className={`text-2xl font-bold ${getUtilizationColor(stats.avgUtilization)}`}>
                  {stats.avgUtilization.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filtry kalkulacji dla capacity */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${themeClasses.text.primary}`}>Które kalkulacje wliczyć do capacity?</h3>
          </div>

          <div className="space-y-3">
            <p className={`text-sm ${themeClasses.text.secondary}`}>
              Wybierz według statusu lub zaznacz ręcznie w katalogu:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => catalogActions.setCapacityFilters({ includeDraft: !catalogState.capacityFilters.includeDraft })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeDraft
                    ? 'bg-gray-600 hover:bg-gray-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Szkice
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeInProgress: !catalogState.capacityFilters.includeInProgress })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeInProgress
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                W trakcie
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeSent: !catalogState.capacityFilters.includeSent })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeSent
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Wysłane
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeNominated: !catalogState.capacityFilters.includeNominated })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeNominated
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Nominacja ✓
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeNotNominated: !catalogState.capacityFilters.includeNotNominated })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeNotNominated
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Brak nominacji
              </button>
            </div>

            {localSelectedHistory.length > 0 && (
              <div className={`mt-3 p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${themeClasses.text.primary}`}>
                    Kalkulacje do porównania ({localSelectedHistory.length})
                  </p>
                  <p className={`text-xs ${themeClasses.text.secondary}`}>
                    Zaznaczone wliczane do capacity: {catalogState.capacityFilters.customSelectedIds.length}
                  </p>
                </div>
                <div className="space-y-2">
                  {localSelectedHistory.map(calcId => {
                    const calculation = catalogState.calculations.find(c => c.id === calcId);
                    if (!calculation) return null;

                    const isActive = catalogState.capacityFilters.customSelectedIds.includes(calcId);

                    return (
                      <div
                        key={calcId}
                        className={`flex items-center justify-between p-2 rounded ${
                          isActive
                            ? (darkMode ? 'bg-gray-800/50' : 'bg-white')
                            : (darkMode ? 'bg-gray-900/30 opacity-60' : 'bg-gray-100 opacity-60')
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => catalogActions.toggleCalculationForCapacity(calcId)}
                            className="rounded cursor-pointer"
                            title={isActive ? "Odznacz - przestanie być wliczana do capacity" : "Zaznacz - będzie wliczana do capacity"}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${themeClasses.text.primary}`}>
                                #{calcId}
                              </span>
                              {calculation.client && (
                                <span className={`text-sm ${themeClasses.text.secondary}`}>
                                  - {calculation.client}
                                </span>
                              )}
                              {calculation.status && (
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  calculation.status === 'nominated'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : calculation.status === 'sent'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : calculation.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {STATUS_LABELS[calculation.status]}
                                </span>
                              )}
                              {!isActive && (
                                <span className={`text-xs italic ${themeClasses.text.secondary}`}>
                                  (nie wliczana)
                                </span>
                              )}
                            </div>
                            {calculation.items && calculation.items.length > 0 && (
                              <div className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                                {calculation.items.length} {calculation.items.length === 1 ? 'zakładka' : 'zakładek'}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromHistory(calcId)}
                          className={`p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400`}
                          title="Usuń całkowicie z listy porównania"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filtry stanowisk i sortowanie */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${themeClasses.text.primary}`}>Filtry stanowisk i sortowanie</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Typ stanowiska */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>Typ stanowiska</label>
              <select
                value={filters.workstationType}
                onChange={(e) => setFilters({ ...filters, workstationType: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              >
                <option value="">Wszystkie</option>
                {workstationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Wykorzystanie min */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>
                Wykorzystanie min (%)
              </label>
              <input
                type="number"
                value={filters.minUtilization}
                onChange={(e) => setFilters({ ...filters, minUtilization: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                max="200"
                step="10"
              />
            </div>

            {/* Wykorzystanie max */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>
                Wykorzystanie max (%)
              </label>
              <input
                type="number"
                value={filters.maxUtilization}
                onChange={(e) => setFilters({ ...filters, maxUtilization: parseFloat(e.target.value) || 200 })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                max="200"
                step="10"
              />
            </div>

            {/* Sortowanie */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>Sortuj według</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                >
                  <option value="name">Nazwa</option>
                  <option value="utilization">Wykorzystanie</option>
                  <option value="available">Dostępna</option>
                  <option value="required">Wymagana</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`px-3 py-2 border rounded-lg ${themeClasses.button.secondary}`}
                  title={sortOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Tylko przeciążone */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showOnlyOverloaded}
                onChange={(e) => setFilters({ ...filters, showOnlyOverloaded: e.target.checked })}
                className="rounded"
              />
              <span className={`text-sm ${themeClasses.text.secondary}`}>
                Pokaż tylko przeciążone stanowiska (>100%)
              </span>
            </label>
          </div>
        </div>

        {/* Lista stanowisk */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
            Stanowiska ({sortedData.length})
          </h3>

          {sortedData.length === 0 ? (
            <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
              <p className={themeClasses.text.secondary}>
                Brak stanowisk spełniających kryteria filtrowania
              </p>
            </div>
          ) : (
            sortedData.map((data) => {
              const ws = data.workstation;
              const isExpanded = expandedWorkstations[ws.id];

              return (
                <div
                  key={ws.id}
                  className={`rounded-lg border p-4 ${getUtilizationBgColor(data.utilizationPercent)}`}
                >
                  {/* Header stanowiska */}
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleWorkstation(ws.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold text-lg ${themeClasses.text.primary}`}>
                            {ws.name}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${themeClasses.text.secondary}`}>
                            {ws.type}
                          </span>
                        </div>

                        {/* Parametry stanowiska */}
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className={themeClasses.text.secondary}>Dostępna:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {data.availableHours.toLocaleString('pl-PL')} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wymagana:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {data.totalRequiredHours.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wolna:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {Math.max(0, data.availableHours - data.totalRequiredHours).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wykorzystanie:</span>
                            <div className={`font-mono font-semibold ${getUtilizationColor(data.utilizationPercent)}`}>
                              {data.utilizationPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Pasek postępu */}
                        <div className="mt-3">
                          <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className={`h-full transition-all ${
                                data.utilizationPercent > 100
                                  ? 'bg-red-600'
                                  : data.utilizationPercent > 80
                                  ? 'bg-yellow-600'
                                  : data.utilizationPercent < 50
                                  ? 'bg-blue-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(100, data.utilizationPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <button className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}>
                          {isExpanded ? '▼' : '►'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista produktów */}
                  {isExpanded && data.products.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                        Przypisane produkty ({data.products.length})
                      </h5>
                      <div className="space-y-1">
                        {data.products.map((product, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded text-sm ${darkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Kalkulacja:</span>
                                <div className={themeClasses.text.primary}>{product.catalogName}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Zakładka:</span>
                                <div className={themeClasses.text.primary}>{product.tabName}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Part ID:</span>
                                <div className={themeClasses.text.primary}>{product.partId}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Ilość/Wydajność:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>
                                  {product.annualVolume.toLocaleString('pl-PL')} / {product.efficiency} szt/8h
                                </div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Wymagane h:</span>
                                <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                                  {product.requiredHours.toFixed(0)} h/rok
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
