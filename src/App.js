import React, { useState, useRef } from 'react';
import { CalculatorProvider, useCalculator } from './context/CalculatorContext';
import { PackagingProvider } from './context/PackagingContext';
import { MaterialProvider } from './context/MaterialContext';
import { ClientProvider } from './context/ClientContext';
import { CatalogProvider } from './context/CatalogContext';
import { CostCalculator } from './components/Calculator/CostCalculator';
import { CatalogView } from './components/Catalog/CatalogView';
import { PackagingManager } from './components/Packaging/PackagingManager';
import { MaterialManager } from './components/Materials/MaterialManager';
import { ClientManager } from './components/Clients/ClientManager';

function AppContent() {
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog', 'calculator', 'packaging', 'materials', or 'clients'
  const [calculationToLoad, setCalculationToLoad] = useState(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { state, actions } = useCalculator();
  const { darkMode, hasUnsavedChanges } = state;
  const saveCalculationRef = useRef(null);

  const handleLoadCalculation = (calc) => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'load', data: calc });
      setShowUnsavedChangesDialog(true);
    } else {
      setCalculationToLoad(calc);
      setCurrentView('calculator');
    }
  };

  const handleBackToCatalog = () => {
    setCurrentView('catalog');
  };

  const handleNewCalculation = () => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'new' });
      setShowUnsavedChangesDialog(true);
    } else {
      actions.resetState();
      setCalculationToLoad(null);
      setCurrentView('calculator');
    }
  };

  const handleBackToCalculator = () => {
    setCurrentView('calculator');
  };

  // Obsługa dialogu niezapisanych zmian
  const handleSaveAndContinue = () => {
    // Wywołaj funkcję zapisu z CostCalculator przez ref
    if (saveCalculationRef.current) {
      saveCalculationRef.current();
    }
    setShowUnsavedChangesDialog(false);
    executePendingAction(true);
  };

  const handleDiscardAndContinue = () => {
    setShowUnsavedChangesDialog(false);
    executePendingAction(false);
  };

  const handleCancelAction = () => {
    setShowUnsavedChangesDialog(false);
    setPendingAction(null);
  };

  const executePendingAction = (saved) => {
    if (!pendingAction) return;

    if (pendingAction.type === 'new') {
      actions.resetState();
      setCalculationToLoad(null);
      setCurrentView('calculator');
    } else if (pendingAction.type === 'load') {
      setCalculationToLoad(pendingAction.data);
      setCurrentView('calculator');
    }

    setPendingAction(null);
  };

  const themeClasses = darkMode ? {
    background: 'bg-gray-900',
    card: 'bg-gray-800 border-gray-700',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-400',
      muted: 'text-gray-500'
    },
    input: 'bg-gray-700 border-gray-600 text-white focus:border-blue-500',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white'
    }
  } : {
    background: 'bg-gray-50',
    card: 'bg-white border-gray-200',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      muted: 'text-gray-500'
    },
    input: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500',
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      success: 'bg-green-600 hover:bg-green-700 text-white'
    }
  };

  return (
    <PackagingProvider>
      <ClientProvider>
        <MaterialProvider>
          <CatalogProvider>
            {currentView === 'catalog' ? (
              <CatalogView
                themeClasses={themeClasses}
                darkMode={darkMode}
                onToggleDarkMode={() => actions.setDarkMode(!darkMode)}
                onNewCalculation={handleNewCalculation}
                onLoadCalculation={handleLoadCalculation}
                onBackToCalculator={handleBackToCalculator}
                onOpenPackaging={() => setCurrentView('packaging')}
                onOpenMaterials={() => setCurrentView('materials')}
                onOpenClients={() => setCurrentView('clients')}
                hasActiveCalculation={hasUnsavedChanges || state.calculationMeta?.catalogId}
              />
            ) : currentView === 'calculator' ? (
              <CostCalculator
                onBackToCatalog={handleBackToCatalog}
                calculationToLoad={calculationToLoad}
                onSaveRef={saveCalculationRef}
              />
            ) : currentView === 'packaging' ? (
              <PackagingManager
                darkMode={darkMode}
                onToggleDarkMode={() => actions.setDarkMode(!darkMode)}
                onBack={() => setCurrentView('catalog')}
                themeClasses={themeClasses}
              />
            ) : currentView === 'materials' ? (
              <MaterialManager
                darkMode={darkMode}
                onToggleDarkMode={() => actions.setDarkMode(!darkMode)}
                onBack={() => setCurrentView('catalog')}
                themeClasses={themeClasses}
              />
            ) : (
              <ClientManager
                darkMode={darkMode}
                themeClasses={themeClasses}
                onClose={() => setCurrentView('catalog')}
              />
            )}

          {/* Dialog niezapisanych zmian */}
          {showUnsavedChangesDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`w-full max-w-md rounded-lg shadow-xl ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className="text-xl font-semibold">Niezapisane zmiany</h2>
                </div>
                <div className="p-6">
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    Masz niezapisane zmiany w obecnej kalkulacji. Czy chcesz je zapisać przed kontynuowaniem?
                  </p>
                </div>
                <div className={`flex justify-end gap-3 p-6 border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <button
                    onClick={handleCancelAction}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleDiscardAndContinue}
                    className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Nie zapisuj
                  </button>
                  <button
                    onClick={handleSaveAndContinue}
                    className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </div>
          )}
          </CatalogProvider>
        </MaterialProvider>
      </ClientProvider>
    </PackagingProvider>
  );
}

function App() {
  return (
    <div className="App">
      <CalculatorProvider>
        <AppContent />
      </CalculatorProvider>
    </div>
  );
}

export default App;