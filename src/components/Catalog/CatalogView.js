import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Filter, Plus, Edit2, Trash2, Sun, Moon, Package, Layers, Users, Settings, Eye, Database, StickyNote, LogOut, Upload, FileBarChart, ClipboardList, Wrench, Truck, Activity, CheckSquare, Square } from 'lucide-react';
import { useCatalog, STATUS_LABELS, CALCULATION_STATUS } from '../../context/CatalogContext';
import { useSession } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { useClient } from '../../context/ClientContext';
import { useMaterial } from '../../context/MaterialContext';
import { usePackaging } from '../../context/PackagingContext';
import { SessionRestoreDialog } from '../Session/SessionRestoreDialog';
import { LocalStorageViewer } from '../DevTools/LocalStorageViewer';
import { catalogApi } from '../../services/api';

/**
 * Komponent widoku katalogu kalkulacji
 */
export function CatalogView({ themeClasses, darkMode, onToggleDarkMode, onNewCalculation, onLoadCalculation, onBackToCalculator, onOpenPackaging, onOpenMaterials, onOpenClients, onOpenWorkstations, onOpenWorkstationCapacity, onOpenClientManualSettings, onOpenClientManualPreview, hasActiveCalculation }) {
  const { state: catalogState, actions: catalogActions, filteredCalculations, summary } = useCatalog();
  const { filters, sortBy, sortOrder } = catalogState;
  const { activeSession, clearSession, loadCalculationToSession } = useSession();
  const { currentUser, logout, userRole, isAdmin } = useAuth();
  const { actions: clientActions } = useClient();
  const { actions: materialActions } = useMaterial();
  const { actions: packagingActions } = usePackaging();

  const [expandedCalculations, setExpandedCalculations] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSessionRestoreDialog, setShowSessionRestoreDialog] = useState(false);
  const [sessionRestoreChecked, setSessionRestoreChecked] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [showFormsDropdown, setShowFormsDropdown] = useState(false);

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

  // Obsługa pushowania danych do Firestore (tylko admin)
  const handlePushToFirestore = async () => {
    if (!isAdmin) {
      alert('Tylko administrator może synchronizować dane z bazą.');
      return;
    }

    if (!window.confirm('Czy na pewno chcesz zsynchronizować wszystkie dane (klienci, materiały, pakowanie) z bazą Firestore?')) {
      return;
    }

    setIsPushing(true);
    const results = [];

    try {
      // Push klientów
      try {
        const clientResult = await clientActions.pushToFirestore();
        results.push(`✅ Klienci: ${clientResult.message}`);
      } catch (error) {
        results.push(`❌ Klienci: ${error.message}`);
      }

      // Push materiałów
      try {
        const materialResult = await materialActions.pushToFirestore();
        results.push(`✅ Materiały: ${materialResult.message}`);
      } catch (error) {
        results.push(`❌ Materiały: ${error.message}`);
      }

      // Push opakowań
      try {
        const packagingResult = await packagingActions.pushToFirestore();
        results.push(`✅ Pakowanie: ${packagingResult.message}`);
      } catch (error) {
        results.push(`❌ Pakowanie: ${error.message}`);
      }

      // Pokaż podsumowanie
      alert('Synchronizacja zakończona:\n\n' + results.join('\n'));
    } catch (error) {
      console.error('Błąd podczas synchronizacji:', error);
      alert('Wystąpił nieoczekiwany błąd podczas synchronizacji danych.');
    } finally {
      setIsPushing(false);
    }
  };

  // Obsługa edycji kalkulacji - wczytaj pełne dane z API
  const handleEditCalculation = async (calc) => {
    try {
      // Pobierz pełną kalkulację z calculations/{id}.json
      const response = await catalogApi.getById(calc.id);

      if (response.success && response.data) {
        const fullCalculation = response.data;

        // Przekształć dane do formatu oczekiwanego przez CalculatorContext
        // Kalkulacja zapisana ma pola na poziomie głównym (client, status, notes...)
        // ale CalculatorContext oczekuje ich w calculationMeta
        const restructuredCalculation = {
          ...fullCalculation,
          calculationMeta: {
            client: fullCalculation.client || '',
            status: fullCalculation.status || 'draft',
            notes: fullCalculation.notes || '',
            createdDate: fullCalculation.createdDate || fullCalculation.createdAt,
            modifiedDate: fullCalculation.modifiedDate || fullCalculation.updatedAt,
            catalogId: fullCalculation.id, // Ustaw ID aby system wiedział że edytujemy istniejącą
            clientId: fullCalculation.clientId || null,
            clientCity: fullCalculation.clientCity || ''
          }
        };

        // Wczytaj pełną kalkulację do edytora
        onLoadCalculation(restructuredCalculation);
      } else {
        alert('Nie udało się wczytać kalkulacji');
      }
    } catch (error) {
      console.error('Błąd wczytywania kalkulacji:', error);
      alert('Wystąpił błąd podczas wczytywania kalkulacji');
    }
  };

  // Obsługa zaznaczania wszystkich widocznych kalkulacji dla capacity
  const handleSelectAllVisible = () => {
    // Zabezpieczenie przed undefined
    if (!catalogState.capacityFilters || !catalogActions.toggleCalculationForCapacity) return;

    // Zaznacz wszystkie widoczne kalkulacje (lub odznacz jeśli wszystkie są zaznaczone)
    const customIds = catalogState.capacityFilters.customSelectedIds || [];
    const allSelected = filteredCalculations.every(calc =>
      customIds.includes(calc.id)
    );

    if (allSelected) {
      // Odznacz wszystkie
      filteredCalculations.forEach(calc => {
        if (customIds.includes(calc.id)) {
          catalogActions.toggleCalculationForCapacity(calc.id);
        }
      });
    } else {
      // Zaznacz wszystkie
      filteredCalculations.forEach(calc => {
        if (!customIds.includes(calc.id)) {
          catalogActions.toggleCalculationForCapacity(calc.id);
        }
      });
    }
  };

  // Generowanie raportu z widocznych kalkulacji
  const handleGenerateReport = () => {
    // Filtruj tylko rozwinięte kalkulacje
    const expandedCalcs = filteredCalculations.filter(calc => expandedCalculations[calc.id]);

    if (expandedCalcs.length === 0) {
      alert('Brak rozwiniętych kalkulacji do raportu. Rozwiń przynajmniej jedną kalkulację aby wygenerować raport.');
      return;
    }

    let report = '═══════════════════════════════════════════════════════\n';
    report += '             RAPORT KALKULACJI KOSZTÓW\n';
    report += '═══════════════════════════════════════════════════════\n\n';
    report += `Data wygenerowania: ${new Date().toLocaleString('pl-PL')}\n`;
    report += `Liczba kalkulacji: ${expandedCalcs.length}\n`;
    report += `Liczba widocznych (z filtrów): ${filteredCalculations.length}\n\n`;

    // Podsumowanie ogólne
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalParts = 0;

    expandedCalcs.forEach(calc => {
      const calcRevenue = (calc.items || []).reduce((sum, item) => {
        const annualVolume = parseFloat(item.annualVolume || 0);
        const unitCost = item.results?.totalWithSGA || 0;
        return sum + (annualVolume * unitCost);
      }, 0);

      const calcProfit = (calc.items || []).reduce((sum, item) => {
        const annualVolume = parseFloat(item.annualVolume || 0);
        const marginPercent = parseFloat(item.margin || 0);
        const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
        return sum + (annualVolume * unitMargin);
      }, 0);

      totalRevenue += calcRevenue;
      totalProfit += calcProfit;
      totalParts += (calc.items || []).length;
    });

    report += '─────────────────────────────────────────────────────\n';
    report += '  PODSUMOWANIE\n';
    report += '─────────────────────────────────────────────────────\n';
    report += `  Całkowity obrót:     ${formatCurrency(totalRevenue)}\n`;
    report += `  Całkowity przychód:  ${formatCurrency(totalProfit)}\n`;
    report += `  Łączna liczba detali: ${totalParts}\n\n`;

    // Szczegóły każdej kalkulacji
    report += '═══════════════════════════════════════════════════════\n';
    report += '  SZCZEGÓŁY KALKULACJI\n';
    report += '═══════════════════════════════════════════════════════\n\n';

    expandedCalcs.forEach((calc, idx) => {
      report += `\n[${ idx + 1 }] KALKULACJA #${calc.id}\n`;
      report += '─────────────────────────────────────────────────────\n';
      report += `  Klient:           ${calc.client || '-'}\n`;
      report += `  Status:           ${STATUS_LABELS[calc.status] || '-'}\n`;
      report += `  Data modyfikacji: ${formatDate(calc.modifiedDate || calc.createdDate)}\n`;
      report += `  Właściciel:       ${calc.ownerName || calc.ownerId || '-'}\n`;

      if (calc.notes && calc.notes.trim() !== '') {
        report += `  Notatki:          ${calc.notes.replace(/\n/g, '\n                    ')}\n`;
      }

      // Oblicz sumy dla kalkulacji
      const calcRevenue = (calc.items || []).reduce((sum, item) => {
        const annualVolume = parseFloat(item.annualVolume || 0);
        const unitCost = item.results?.totalWithSGA || 0;
        return sum + (annualVolume * unitCost);
      }, 0);

      const calcProfit = (calc.items || []).reduce((sum, item) => {
        const annualVolume = parseFloat(item.annualVolume || 0);
        const marginPercent = parseFloat(item.margin || 0);
        const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
        return sum + (annualVolume * unitMargin);
      }, 0);

      report += `\n  Obrót:            ${formatCurrency(calcRevenue)}\n`;
      report += `  Przychód:         ${formatCurrency(calcProfit)}\n`;
      report += `  Liczba detali:    ${(calc.items || []).length}\n\n`;

      // Detale
      if (calc.items && calc.items.length > 0) {
        report += '  DETALE:\n';
        report += '  ─────────────────────────────────────────────────\n';

        calc.items.forEach((item, itemIdx) => {
          const annualVolume = parseFloat(item.annualVolume || 0);
          const unitCost = item.results?.totalWithSGA || 0;
          const itemRevenue = annualVolume * unitCost;
          const marginPercent = parseFloat(item.margin || 0);
          const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
          const itemProfit = annualVolume * unitMargin;

          report += `\n  ${itemIdx + 1}. ${item.partId || 'Bez ID'}\n`;
          report += `     Materiał:              ${item.tabName || '-'}\n`;
          report += `     Roczna ilość:          ${annualVolume.toLocaleString('pl-PL')} szt.\n`;

          // Zużycie materiału
          if (item.results) {
            const weightNetto = parseFloat(item.weight || 0);
            const weightBrutto = parseFloat(item.bruttoWeight || item.results.bruttoWeight || 0);
            const yearlyWeightNetto = (weightNetto / 1000) * annualVolume; // kg
            const yearlyWeightBrutto = (weightBrutto / 1000) * annualVolume; // kg

            report += `\n     ZUŻYCIE MATERIAŁU:\n`;
            report += `       Waga netto (szt.):   ${weightNetto.toFixed(2)} g\n`;
            report += `       Waga brutto (szt.):  ${weightBrutto.toFixed(2)} g\n`;
            report += `       Roczne zużycie netto: ${yearlyWeightNetto.toFixed(2)} kg\n`;
            report += `       Roczne zużycie brutto: ${yearlyWeightBrutto.toFixed(2)} kg\n`;

            if (item.surfaceArea) {
              const surfaceInM2 = item.surfaceUnit === 'mm2'
                ? parseFloat(item.surfaceArea) / 1000000
                : parseFloat(item.surfaceArea);
              const yearlySurface = surfaceInM2 * annualVolume;
              report += `       Powierzchnia (szt.): ${surfaceInM2.toFixed(4)} m²\n`;
              report += `       Roczna powierzchnia: ${yearlySurface.toFixed(2)} m²\n`;
            }

            if (item.heatshield) {
              const surfaceNetto = parseFloat(item.heatshield.surfaceNetto || 0);
              const surfaceBruttoSheet = parseFloat(item.heatshield.surfaceBruttoSheet || 0);
              const surfaceBruttoMat = parseFloat(item.heatshield.surfaceBruttoMat || 0);

              report += `\n     HEATSHIELD - Zużycie:\n`;
              report += `       Powierzchnia netto:   ${surfaceNetto.toFixed(4)} m²\n`;
              report += `       Blacha brutto (szt.): ${surfaceBruttoSheet.toFixed(4)} m²\n`;
              report += `       Mata brutto (szt.):   ${surfaceBruttoMat.toFixed(4)} m²\n`;
              report += `       Roczne zużycie blachy: ${(surfaceBruttoSheet * annualVolume).toFixed(2)} m²\n`;
              report += `       Roczne zużycie maty:   ${(surfaceBruttoMat * annualVolume).toFixed(2)} m²\n`;
            }
          }

          report += `\n     KOSZTY:\n`;
          report += `       Koszt jednostkowy:     ${formatCurrency(unitCost)}\n`;
          report += `       Marża:                 ${marginPercent}%\n`;
          report += `       Wpływ na obrót:        ${formatCurrency(itemRevenue)}\n`;
          report += `       Wpływ na przychód:     ${formatCurrency(itemProfit)}\n`;
        });
      }

      report += '\n';
    });

    report += '\n═══════════════════════════════════════════════════════\n';
    report += '  KONIEC RAPORTU\n';
    report += '═══════════════════════════════════════════════════════\n';

    setReportContent(report);
    setShowReport(true);
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

              {isAdmin && (
                <button
                  onClick={() => setShowDevTools(true)}
                  className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                  title="DevTools - podgląd localStorage"
                >
                  <Database size={20} />
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
                onClick={logout}
                className={`px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white flex items-center gap-2`}
                title={`Wyloguj (${currentUser?.displayName || currentUser?.email || 'użytkownik'}${isAdmin ? ' - Admin' : ''})`}
              >
                <LogOut size={16} />
                Wyloguj
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2 relative`}
              >
                <Filter size={16} />
                Filtry
                {(filters.calculationId || filters.client || filters.status || filters.dateFrom || filters.dateTo || filters.partSearch || filters.showOnlyWithNotes) && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {filteredCalculations.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleGenerateReport}
                className={`px-4 py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2`}
                title="Generuj raport z rozwiniętych kalkulacji"
              >
                <FileBarChart size={16} />
                Raport
              </button>

              {/* Dropdown Formularze */}
              <div className="relative">
                <button
                  onClick={() => setShowFormsDropdown(!showFormsDropdown)}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                  title="Formularze zarządzania danymi"
                >
                  <ClipboardList size={16} />
                  Formularze
                  <ChevronDown size={14} />
                </button>

                {showFormsDropdown && (
                  <div className={`absolute top-full right-0 mt-1 ${themeClasses.card} rounded-lg border shadow-lg z-10 min-w-[220px]`}>
                    <button
                      onClick={() => {
                        onOpenClients();
                        setShowFormsDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} rounded-t-lg flex items-center gap-2`}
                    >
                      <Users size={16} />
                      Klienci
                    </button>
                    <button
                      onClick={() => {
                        onOpenPackaging();
                        setShowFormsDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} flex items-center gap-2`}
                    >
                      <Package size={16} />
                      Pakowanie
                    </button>
                    <button
                      onClick={() => {
                        onOpenMaterials();
                        setShowFormsDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} flex items-center gap-2`}
                    >
                      <Layers size={16} />
                      Materiały
                    </button>
                    <button
                      onClick={() => {
                        if (onOpenWorkstations) {
                          onOpenWorkstations();
                          setShowFormsDropdown(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} flex items-center gap-2`}
                    >
                      <Wrench size={16} />
                      Stanowiska produkcyjne
                    </button>
                    <button
                      onClick={() => {
                        if (onOpenWorkstationCapacity) {
                          onOpenWorkstationCapacity();
                          setShowFormsDropdown(false);
                        }
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} flex items-center gap-2`}
                    >
                      <Activity size={16} />
                      Dashboard zajętości
                    </button>
                    <button
                      disabled
                      className={`w-full text-left px-4 py-2 ${themeClasses.text.muted} rounded-b-lg flex items-center gap-2 cursor-not-allowed opacity-50`}
                      title="Wkrótce dostępne"
                    >
                      <Truck size={16} />
                      Transport (wkrótce)
                    </button>
                  </div>
                )}
              </div>

              {isAdmin && (
                <button
                  onClick={handlePushToFirestore}
                  disabled={isPushing}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isPushing
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  } flex items-center gap-2`}
                  title="Synchronizuj wszystkie dane (klienci, materiały, pakowanie) z bazą Firestore"
                >
                  <Upload size={16} />
                  {isPushing ? 'Synchronizuję...' : 'Push to Firestore'}
                </button>
              )}

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
                    ID Kalkulacji
                  </label>
                  <input
                    type="text"
                    value={filters.calculationId}
                    onChange={(e) => catalogActions.setFilter({ calculationId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="np. 251008-01"
                  />
                </div>

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

              {/* Drugi wiersz filtrów - wyszukiwanie po częściach */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Wyszukaj część (ID lub nazwa materiału)
                  </label>
                  <input
                    type="text"
                    value={filters.partSearch}
                    onChange={(e) => catalogActions.setFilter({ partSearch: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    placeholder="np. 12345 lub HT800..."
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${themeClasses.text.primary}`}>
                    <input
                      type="checkbox"
                      checked={filters.showOnlyWithNotes}
                      onChange={(e) => catalogActions.setFilter({ showOnlyWithNotes: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <StickyNote size={16} className="text-yellow-500" />
                    <span className="text-sm">Tylko z notatkami</span>
                  </label>
                  <label className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${themeClasses.text.primary}`}>
                    <input
                      type="checkbox"
                      checked={filters.showOnlyMine}
                      onChange={(e) => catalogActions.setFilter({ showOnlyMine: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Users size={16} className="text-blue-500" />
                    <span className="text-sm">Tylko moje</span>
                  </label>
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

        {/* Sekcja zaznaczania kalkulacji dla capacity */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAllVisible}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                title="Zaznacz/odznacz wszystkie widoczne kalkulacje dla dashboardu zajętości"
              >
                <CheckSquare size={16} />
                Zaznacz wszystkie widoczne
              </button>
              <span className={`text-sm ${themeClasses.text.secondary}`}>
                Zaznaczono dla capacity: <span className="font-semibold text-blue-600">{catalogState.capacityFilters?.customSelectedIds?.length || 0}</span> kalkulacji
              </span>
            </div>
          </div>
        </div>

        {/* Tabela kalkulacji */}
        <div className={`${themeClasses.card} rounded-lg border overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${themeClasses.background} border-b border-gray-200 dark:border-gray-600`}>
                <tr>
                  <th className="px-4 py-3 text-center w-12">
                    <span className={`text-xs font-medium ${themeClasses.text.secondary}`} title="Zaznacz dla dashboardu zajętości">
                      📊
                    </span>
                  </th>
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
                  <th className="px-4 py-3 text-left">
                    <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>Właściciel</span>
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
                    <td colSpan="9" className="px-4 py-8 text-center">
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

                    const isSelectedForCapacity = catalogState.capacityFilters?.customSelectedIds?.includes(calc.id) || false;

                    return (
                    <React.Fragment key={calc.id}>
                      <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => catalogActions.toggleCalculationForCapacity(calc.id)}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${isSelectedForCapacity ? 'text-blue-600' : themeClasses.text.secondary}`}
                            title={isSelectedForCapacity ? 'Odznacz dla dashboardu zajętości' : 'Zaznacz dla dashboardu zajętości'}
                          >
                            {isSelectedForCapacity ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className={`px-4 py-3 ${themeClasses.text.primary}`}>
                          <div className="flex items-center gap-2">
                            <span>#{calc.id}</span>
                            {calc.notes && calc.notes.trim() !== '' && (
                              <div className="relative group">
                                <StickyNote
                                  size={16}
                                  className="text-yellow-500 cursor-help"
                                />
                                <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-lg">
                                  <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words">
                                    {calc.notes}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
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
                        <td className={`px-4 py-3 ${themeClasses.text.secondary} text-sm`}>
                          {calc.ownerName || calc.ownerId || '-'}
                          {calc.ownerId === currentUser?.uid && (
                            <span className="ml-1 text-blue-500">(ty)</span>
                          )}
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
                              onClick={() => handleEditCalculation(calc)}
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
                          <td colSpan="9" className="px-4 py-4">
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

      {/* DevTools */}
      {showDevTools && (
        <LocalStorageViewer
          darkMode={darkMode}
          onClose={() => setShowDevTools(false)}
        />
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${themeClasses.card} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${themeClasses.text.primary} flex items-center gap-2`}>
                <FileBarChart className="text-indigo-600" size={24} />
                Raport Kalkulacji
              </h2>
              <button
                onClick={() => setShowReport(false)}
                className={`px-3 py-1 rounded ${themeClasses.button.secondary}`}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <pre className={`${themeClasses.text.primary} text-xs font-mono whitespace-pre-wrap break-words`}>
                {reportContent}
              </pre>
            </div>

            {/* Footer with actions */}
            <div className={`flex items-center justify-end gap-2 p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(reportContent);
                  alert('Raport skopiowany do schowka!');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
              >
                Kopiuj do schowka
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `raport_kalkulacji_${new Date().toISOString().split('T')[0]}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className={`px-4 py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white`}
              >
                Pobierz jako plik
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}