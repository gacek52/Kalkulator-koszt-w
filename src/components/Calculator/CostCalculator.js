import React from 'react';
import { Calculator, Sun, Moon, ArrowLeft, Save } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { useCatalog, STATUS_LABELS } from '../../context/CatalogContext';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { SettingsPanel } from './SettingsPanel';
import { JsonExportButton } from '../Common/JsonExportButton';
import { JsonImportButton, validationSchemas } from '../Common/JsonImportButton';
import { CalculatorCsvExportButton } from '../Common/CsvExportButton';

/**
 * Główny komponent kalkulatora kosztów
 */
export function CostCalculator({ onBackToCatalog }) {
  const { state, actions } = useCalculator();
  const { tabs, activeTab, globalSGA, darkMode, calculationMeta } = state;
  const { actions: catalogActions } = useCatalog();
  const [editingTabId, setEditingTabId] = React.useState(null);
  const [editingTabName, setEditingTabName] = React.useState('');
  const [showSettings, setShowSettings] = React.useState(false);

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

  // Obsługa dodawania nowej zakładki
  const handleAddTab = () => {
    const newTab = {
      id: Date.now(),
      name: `Materiał ${tabs.length + 1}`,
      materialCost: '2.0',
      bakingCost: '110',
      cleaningCost: '90',
      handlingCost: '0.08',
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
        ]
      },
      items: [{
        id: 1,
        partId: '',
        weight: '',
        weightOption: 'netto',
        bruttoWeight: '',
        cleaningOption: 'scaled',
        manualCleaningTime: '45',
        customValues: {},
        results: null
      }],
      nextItemId: 2
    };

    actions.addTab(newTab);
    actions.setActiveTab(tabs.length);
  };

  // Obsługa importu danych
  const handleImport = (data) => {
    actions.loadData(data);
  };

  // Obsługa edycji nazwy zakładki
  const handleStartEditTabName = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleSaveTabName = (tabId) => {
    if (editingTabName.trim()) {
      actions.updateTab(tabId, { name: editingTabName });
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleCancelEditTabName = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  // Przygotuj dane do eksportu
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    globalSGA,
    tabs,
    darkMode
  };

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
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
        </div>

        {/* Navigation tabs */}
        <div className={`${themeClasses.card} rounded-lg border mb-6`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="relative">
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
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        index === activeTab
                          ? themeClasses.button.primary
                          : themeClasses.button.secondary
                      }`}
                      title="Kliknij dwukrotnie aby edytować nazwę"
                    >
                      {tab.name}
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
              <input
                type="text"
                value={calculationMeta.client}
                onChange={(e) => actions.updateCalculationMeta({ client: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                placeholder="Nazwa klienta..."
              />
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

          <button
            onClick={() => {
              // Zapisz kalkulację do katalogu
              const allItems = tabs.flatMap(tab =>
                tab.items.map(item => ({
                  ...item,
                  tabName: tab.name
                }))
              );

              // TODO: Oblicz revenue i profit
              catalogActions.addCalculation({
                ...calculationMeta,
                tabs: tabs,
                globalSGA: globalSGA,
                items: allItems,
                totalRevenue: 0,
                totalProfit: 0
              });

              alert('Kalkulacja zapisana w katalogu!');
            }}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.success} flex items-center gap-2`}
          >
            <Save size={16} />
            Zapisz do katalogu
          </button>
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
      </div>
    </div>
  );
}