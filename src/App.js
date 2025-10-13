import React, { useState, useRef } from 'react';
import { CalculatorProvider, useCalculator } from './context/CalculatorContext';
import { SessionProvider } from './context/SessionContext';
import { PackagingProvider } from './context/PackagingContext';
import { MaterialProvider } from './context/MaterialContext';
import { ClientProvider } from './context/ClientContext';
import { ClientManualProvider } from './context/ClientManualContext';
import { WorkstationProvider } from './context/WorkstationContext';
import { CatalogProvider } from './context/CatalogContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CostCalculator } from './components/Calculator/CostCalculator';
import { CatalogView } from './components/Catalog/CatalogView';
import { PackagingManager } from './components/Packaging/PackagingManager';
import { MaterialManager } from './components/Materials/MaterialManager';
import { ClientManager } from './components/Clients/ClientManager';
import { ClientManualManager } from './components/ClientManual/ClientManualManager';
import { WorkstationManager } from './components/Workstations/WorkstationManager';
import { WorkstationCapacityDashboard } from './components/Workstations/WorkstationCapacityDashboard';
import LoginScreen from './components/Auth/LoginScreen';

function AppContent() {
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog', 'calculator', 'packaging', 'materials', 'clients', 'client-manual-settings', 'client-manual-preview', 'workstation-capacity'
  const [calculationToLoad, setCalculationToLoad] = useState(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { state, actions } = useCalculator();
  const { darkMode, hasUnsavedChanges } = state;
  const { currentUser, loading } = useAuth();
  const saveCalculationRef = useRef(null);

  // Show login screen if user is not authenticated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

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
  const handleSaveAndContinue = (asNewVariant = false) => {
    // Wywołaj funkcję zapisu z CostCalculator przez ref
    if (saveCalculationRef.current) {
      saveCalculationRef.current(asNewVariant);
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
        <ClientManualProvider>
          <MaterialProvider>
            <WorkstationProvider>
              <CatalogProvider>
              <div className="min-h-screen flex flex-col">
                {/* Main content */}
                <div className="flex-1">
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
                      onOpenWorkstations={() => setCurrentView('workstations')}
                      onOpenWorkstationCapacity={() => setCurrentView('workstation-capacity')}
                      onOpenClientManualSettings={() => setCurrentView('client-manual-settings')}
                      onOpenClientManualPreview={() => setCurrentView('client-manual-preview')}
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
                  ) : currentView === 'clients' ? (
                    <ClientManager
                      darkMode={darkMode}
                      themeClasses={themeClasses}
                      onClose={() => setCurrentView('catalog')}
                    />
                  ) : currentView === 'workstations' ? (
                    <WorkstationManager
                      darkMode={darkMode}
                      onToggleDarkMode={() => actions.setDarkMode(!darkMode)}
                      onBack={() => setCurrentView('catalog')}
                      themeClasses={themeClasses}
                    />
                  ) : currentView === 'workstation-capacity' ? (
                    <WorkstationCapacityDashboard
                      darkMode={darkMode}
                      onToggleDarkMode={() => actions.setDarkMode(!darkMode)}
                      onBack={() => setCurrentView('catalog')}
                      themeClasses={themeClasses}
                    />
                  ) : currentView === 'client-manual-settings' ? (
                    <ClientManualManager
                      darkMode={darkMode}
                      themeClasses={themeClasses}
                      onClose={() => setCurrentView('catalog')}
                      readOnly={false}
                    />
                  ) : currentView === 'client-manual-preview' ? (
                    <ClientManualManager
                      darkMode={darkMode}
                      themeClasses={themeClasses}
                      onClose={() => setCurrentView('catalog')}
                      readOnly={true}
                    />
                  ) : null}
                </div>

                {/* Footer with signature */}
                <footer className={`py-3 text-center border-t ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
                }`}>
                  <p className="text-xs">by Patryk Spławski</p>
                </footer>
              </div>

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
                    Masz niezapisane zmiany w obecnej kalkulacji. Co chcesz zrobić?
                  </p>
                </div>
                <div className={`flex flex-col gap-2 p-6 border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex justify-end gap-2">
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
                      Odrzuć zmiany
                    </button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleSaveAndContinue(true)}
                      className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Zapisz jako nowy
                    </button>
                    <button
                      onClick={() => handleSaveAndContinue(false)}
                      className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      Zapisz (nadpisz)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
              </CatalogProvider>
            </WorkstationProvider>
          </MaterialProvider>
        </ClientManualProvider>
      </ClientProvider>
    </PackagingProvider>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <CalculatorProvider>
          <SessionProvider>
            <AppContent />
          </SessionProvider>
        </CalculatorProvider>
      </AuthProvider>
    </div>
  );
}

export default App;