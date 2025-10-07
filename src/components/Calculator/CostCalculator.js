import React, { useState, useEffect } from 'react';
import { Calculator, Sun, Moon, ArrowLeft, Save, ChevronDown, X } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { useSession } from '../../context/SessionContext';
import { useCatalog, STATUS_LABELS } from '../../context/CatalogContext';
import { useClient } from '../../context/ClientContext';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { SettingsPanel } from './SettingsPanel';
import { SaveStatusIndicator } from '../Session/SaveStatusIndicator';
import { JsonExportButton } from '../Common/JsonExportButton';
import { JsonImportButton, validationSchemas } from '../Common/JsonImportButton';
import { CalculatorCsvExportButton } from '../Common/CsvExportButton';

/**
 * Główny komponent kalkulatora kosztów
 */
export function CostCalculator({ onBackToCatalog, calculationToLoad, onSaveRef }) {
  const { state, actions } = useCalculator();
  const { tabs, activeTab, globalSGA, darkMode, calculationMeta, hasUnsavedChanges } = state;
  const { state: catalogState, actions: catalogActions } = useCatalog();
  const { state: clientState } = useClient();
  const { updateSession, activeSession, startNewSession, clearSession } = useSession();
  const [editingTabId, setEditingTabId] = React.useState(null);
  const [editingTabName, setEditingTabName] = React.useState('');
  const [showSettings, setShowSettings] = React.useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadConfirmDialog, setShowLoadConfirmDialog] = useState(false);
  const [pendingCalculationToLoad, setPendingCalculationToLoad] = useState(null);

  // Konfiguracja motywów
  const themeClasses = {
    background: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    card: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: {
      primary: darkMode ? 'text-white' : 'text-gray-900',
      secondary: darkMode ? 'text-gray-300' : 'text-gray-600'
    },
    input: darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900',
    button: {
      primary: darkMode
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: darkMode
        ? 'bg-gray-600 hover:bg-gray-700 text-white'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      success: darkMode
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'bg-green-600 hover:bg-green-700 text-white'
    }
  };

  const currentTab = tabs[activeTab];

  // Funkcja deep copy dla bezpiecznego klonowania danych
  const deepCopy = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };

  // Znajdź istniejącą kalkulację powiązaną z obecną sesją (jeśli istnieje)
  const linkedCalculationId = calculationMeta.catalogId;
  const existingCalculation = linkedCalculationId
    ? catalogState.calculations.find(calc => calc.id === linkedCalculationId)
    : null;

  // Funkcja ładowania kalkulacji z katalogu
  React.useEffect(() => {
    if (calculationToLoad) {
      if (hasUnsavedChanges) {
        // Pokaż dialog potwierdzenia
        setPendingCalculationToLoad(calculationToLoad);
        setShowLoadConfirmDialog(true);
      } else {
        // Załaduj bez pytania
        loadCalculationFromCatalog(calculationToLoad);
      }
    }
  }, [calculationToLoad]);

  // Synchronizacja zmian ze SessionContext (auto-save)
  React.useEffect(() => {
    // Aktualizuj sesję przy każdej zmianie stanu kalkulatora
    if (tabs.length > 0) {
      const calculationData = {
        globalSGA,
        tabs,
        activeTab,
        calculationMeta
      };
      updateSession(calculationData);
    }
  }, [tabs, activeTab, globalSGA, calculationMeta]);

  // Inicjalizacja sesji przy starcie (jeśli nie ma aktywnej sesji)
  React.useEffect(() => {
    if (!activeSession && tabs.length > 0) {
      startNewSession({
        globalSGA,
        tabs,
        activeTab,
        calculationMeta
      });
    }
  }, []); // Tylko przy pierwszym renderowaniu

  const loadCalculationFromCatalog = (calculation) => {
    actions.loadCalculation(calculation);
    setShowLoadConfirmDialog(false);
    setPendingCalculationToLoad(null);
  };

  const cancelLoad = () => {
    setShowLoadConfirmDialog(false);
    setPendingCalculationToLoad(null);
    if (onBackToCatalog) {
      onBackToCatalog();
    }
  };

  // Funkcja zapisywania kalkulacji
  const saveCalculation = (asNewVariant = false) => {
    const allItems = tabs.flatMap(tab =>
      tab.items.map(item => ({
        ...item,
        tabName: tab.name
      }))
    );

    // Deep copy danych aby uniknąć referencji
    const calculationData = {
      ...deepCopy(calculationMeta),
      tabs: deepCopy(tabs),
      globalSGA: globalSGA,
      items: deepCopy(allItems),
      totalRevenue: 0,
      totalProfit: 0
    };

    if (!asNewVariant && existingCalculation) {
      // Nadpisz istniejącą kalkulację
      catalogActions.updateCalculation(linkedCalculationId, calculationData);
      alert('Kalkulacja zaktualizowana w katalogu!');
    } else {
      // Zapisz jako nowy wpis
      const newId = catalogState.nextCalculationId;
      catalogActions.addCalculation(calculationData);

      // Zapisz ID w metadanych aby pamiętać powiązanie
      actions.updateCalculationMeta({ catalogId: newId });

      alert(asNewVariant ? 'Zapisano jako nowy wariant!' : 'Kalkulacja zapisana w katalogu!');
    }

    // Oznacz jako zapisane
    actions.markAsSaved();

    // Wyczyść sesję roboczą po pomyślnym zapisie
    clearSession();

    setShowSaveMenu(false);
  };

  // Udostępnij funkcję zapisu przez ref
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = (asNewVariant = false) => saveCalculation(asNewVariant);
    }
  }, [onSaveRef, saveCalculation]);

  // Obsługa dodawania nowej zakładki
  const handleAddTab = () => {
    const newTab = {
      id: Date.now(),
      name: `Materiał ${tabs.length + 1}`,
      calculationType: 'weight',
      materialCost: '2.0',
      materialPriceUnit: 'kg',
      bakingCost: '110',
      cleaningCost: '90',
      handlingCost: '0.08',
      prepCost: '90',
      customProcesses: [],
      nextProcessId: 1,
      showAdvanced: false,
      editingCurves: {
        baking: [
          { x: 50, y: 45 },
          { x: 100, y: 55 },
          { x: 500, y: 70 },
          { x: 1000, y: 80 },
          { x: 2000, y: 90 },
          { x: 3000, y: 95 }
        ],
        cleaning: [
          { x: 50, y: 45 },
          { x: 100, y: 55 },
          { x: 500, y: 70 },
          { x: 1000, y: 80 },
          { x: 2000, y: 90 },
          { x: 3000, y: 95 }
        ],
        bruttoWeight: [
          { x: 50, y: 60 },
          { x: 100, y: 120 },
          { x: 500, y: 600 },
          { x: 1000, y: 1200 },
          { x: 2000, y: 2300 },
          { x: 3000, y: 3300 }
        ],
        heatshieldPrep: [
          { x: 0.01, y: 30 },
          { x: 0.05, y: 45 },
          { x: 0.1, y: 60 },
          { x: 0.5, y: 120 },
          { x: 1.0, y: 180 },
          { x: 2.0, y: 300 }
        ],
        heatshieldLaser: [
          { x: 0.0, y: 5 },
          { x: 0.01, y: 5 },
          { x: 0.05, y: 8 },
          { x: 0.1, y: 12 },
          { x: 0.5, y: 25 },
          { x: 1.0, y: 40 },
          { x: 2.0, y: 70 }
        ]
      },
      customCurves: [],
      nextCurveId: 1,
      items: [{
        id: 1,
        partId: '',
        weight: '',
        weightOption: 'netto',
        bruttoWeight: '',
        cleaningOption: 'scaled',
        manualCleaningTime: '45',
        margin: '',
        customValues: {},
        customCurveValues: {},
        results: null,
        annualVolume: '',
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
        },
        // Pola dla pakowania
        unit: 'kg',
        packaging: {
          partsPerLayer: '',
          layers: '',
          partsInBox: '',
          manualPartsInBox: false,
          compositionId: null,
          customPrice: ''
        }
      }],
      nextItemId: 2
    };

    actions.addTab(newTab);
    actions.setActiveTab(tabs.length);
  };

  // Obsługa usuwania zakładki
  const handleRemoveTab = (tabId, tabIndex) => {
    if (tabs.length <= 1) {
      alert('Nie możesz usunąć ostatniej zakładki!');
      return;
    }

    if (window.confirm('Czy na pewno chcesz usunąć tę zakładkę?')) {
      actions.removeTab(tabId);

      // Ustaw aktywną zakładkę na poprzednią lub następną
      if (tabIndex === activeTab) {
        // Jeśli usuwamy aktywną zakładkę
        if (tabIndex > 0) {
          actions.setActiveTab(tabIndex - 1);
        } else {
          actions.setActiveTab(0);
        }
      } else if (tabIndex < activeTab) {
        // Jeśli usuwamy zakładkę przed aktywną, zmniejsz indeks aktywnej
        actions.setActiveTab(activeTab - 1);
      }
    }
  };

  // Obsługa importu danych z migracją
  const handleImport = (data) => {
    // Migracja danych - dodaj brakujące pola z domyślnymi wartościami
    const migratedData = {
      globalSGA: data.globalSGA || '12',
      tabs: data.tabs || [],
      activeTab: data.activeTab ?? 0,
      nextTabId: data.nextTabId ?? (data.tabs?.length + 1 || 2),
      darkMode: data.darkMode ?? true,
      calculationMeta: data.calculationMeta ?? {
        client: '',
        status: 'draft',
        notes: '',
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        catalogId: null
      },
      hasUnsavedChanges: false
    };

    actions.loadData(migratedData);
    alert('Dane zostały pomyślnie zaimportowane!');
  };

  // Obsługa edycji nazwy zakładki
  const handleStartEditTabName = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleSaveTabName = (tabId) => {
    if (editingTabName.trim()) {
      actions.updateTab(tabId, { name: editingTabName, isCustomName: true });
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleCancelEditTabName = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  // Przygotuj dane do eksportu - wszystkie dane potrzebne do pełnego odtworzenia stanu
  const exportData = {
    version: '2.1',
    exportDate: new Date().toISOString(),
    globalSGA,
    tabs,
    activeTab,
    nextTabId: state.nextTabId,
    darkMode,
    calculationMeta
  };

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col gap-4">
            {/* Top row: Title and buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                    Kalkulator Kosztów Produkcyjnych
                  </h1>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Kompleksowa kalkulacja kosztów materiałów i procesów
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
              {/* Przycisk powrotu do katalogu */}
              {onBackToCatalog && (
                <button
                  onClick={onBackToCatalog}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                  title="Powrót do katalogu"
                >
                  <ArrowLeft size={16} />
                  Katalog
                </button>
              )}

              {/* Przełącznik motywu */}
              <button
                onClick={() => actions.setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Przyciski eksportu/importu */}
              <JsonExportButton
                data={exportData}
                filename="kalkulator-kosztow"
                themeClasses={themeClasses}
              />

              <JsonImportButton
                onImport={handleImport}
                validateData={validationSchemas.calculator}
                themeClasses={themeClasses}
              />

              <CalculatorCsvExportButton
                tabs={tabs}
                globalSGA={globalSGA}
                themeClasses={themeClasses}
              />
            </div>
            </div>

            {/* Save Status Indicator */}
            <SaveStatusIndicator darkMode={darkMode} />
          </div>
        </div>

        {/* Navigation tabs */}
        <div className={`${themeClasses.card} rounded-lg border mb-6`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="group relative">
                  {editingTabId === tab.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTabName(tab.id);
                          if (e.key === 'Escape') handleCancelEditTabName();
                        }}
                        onBlur={() => handleSaveTabName(tab.id)}
                        autoFocus
                        className={`px-3 py-2 rounded-lg border ${themeClasses.input} w-40`}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => actions.setActiveTab(index)}
                      onDoubleClick={() => handleStartEditTabName(tab)}
                      className={`relative px-4 py-2 pr-8 rounded-lg font-medium transition-colors ${
                        index === activeTab
                          ? themeClasses.button.primary
                          : themeClasses.button.secondary
                      }`}
                      title="Kliknij dwukrotnie aby edytować nazwę"
                    >
                      {tab.name}
                      {tabs.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTab(tab.id, index);
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}
                          title="Usuń zakładkę"
                        >
                          <X size={14} />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddTab}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
            >
              + Nowa zakładka
            </button>
          </div>

          {/* Global SG&A */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                Globalny SG&A (%):
              </label>
              <input
                type="number"
                value={globalSGA}
                onChange={(e) => actions.setGlobalSGA(e.target.value)}
                className={`w-20 px-2 py-1 border rounded ${themeClasses.input}`}
                step="0.1"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Metadane kalkulacji */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Klient
              </label>
              <select
                value={calculationMeta.clientId || ''}
                onChange={(e) => {
                  const clientId = e.target.value;
                  if (!clientId) {
                    actions.updateCalculationMeta({ clientId: null, client: '', clientCity: '' });
                  } else {
                    const selectedClient = clientState.clients.find(c => c.id === parseInt(clientId));
                    if (selectedClient) {
                      actions.updateCalculationMeta({
                        clientId: selectedClient.id,
                        client: selectedClient.name,
                        clientCity: selectedClient.city
                      });
                    }
                  }
                }}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
              >
                <option value="">-- Wybierz klienta --</option>
                {clientState.clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.city && `(${client.city})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Status
              </label>
              <select
                value={calculationMeta.status}
                onChange={(e) => actions.updateCalculationMeta({ status: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Notatki
              </label>
              <input
                type="text"
                value={calculationMeta.notes}
                onChange={(e) => actions.updateCalculationMeta({ notes: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                placeholder="Dodatkowe informacje..."
              />
            </div>
          </div>

          <div className="relative flex">
            <button
              onClick={() => saveCalculation(false)}
              className={`px-4 py-2 rounded-l-lg font-medium ${themeClasses.button.success} flex items-center gap-2`}
            >
              <Save size={16} />
              {existingCalculation ? 'Nadpisz kalkulację' : 'Zapisz do katalogu'}
            </button>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className={`px-2 py-2 rounded-r-lg font-medium ${themeClasses.button.success} border-l ${darkMode ? 'border-green-700' : 'border-green-600'}`}
            >
              <ChevronDown size={16} />
            </button>

            {showSaveMenu && (
              <div className={`absolute top-full left-0 mt-1 ${themeClasses.card} rounded-lg border shadow-lg z-10 min-w-[200px]`}>
                <button
                  onClick={() => saveCalculation(true)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} rounded-t-lg`}
                >
                  Zapisz jako nowy wariant
                </button>
                <button
                  onClick={() => setShowSaveMenu(false)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.secondary} rounded-b-lg border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  Anuluj
                </button>
              </div>
            )}
          </div>
        </div>

        {currentTab && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Formularz kalkulacji */}
            <div className="xl:col-span-2">
              <CalculatorForm
                tab={currentTab}
                tabIndex={activeTab}
                globalSGA={globalSGA}
                themeClasses={themeClasses}
                darkMode={darkMode}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            {/* Wyniki */}
            <div>
              <CalculatorResults
                tab={currentTab}
                globalSGA={globalSGA}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && currentTab && (
          <SettingsPanel
            tab={currentTab}
            tabId={currentTab.id}
            themeClasses={themeClasses}
            darkMode={darkMode}
            actions={actions}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Dialog potwierdzenia ładowania */}
        {showLoadConfirmDialog && pendingCalculationToLoad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${themeClasses.card} rounded-lg border p-6 max-w-md mx-4`}>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text.primary}`}>
                Niezapisane zmiany
              </h3>
              <p className={`mb-6 ${themeClasses.text.secondary}`}>
                Masz niezapisane zmiany w aktualnej kalkulacji. Czy chcesz je zapisać przed załadowaniem innej kalkulacji?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    saveCalculation(false);
                    loadCalculationFromCatalog(pendingCalculationToLoad);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.success}`}
                >
                  Zapisz i załaduj
                </button>
                <button
                  onClick={() => loadCalculationFromCatalog(pendingCalculationToLoad)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
                >
                  Załaduj bez zapisu
                </button>
                <button
                  onClick={cancelLoad}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}