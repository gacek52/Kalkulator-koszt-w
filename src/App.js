import React, { useState } from 'react';
import { CalculatorProvider } from './context/CalculatorContext';
import { PackagingProvider } from './context/PackagingContext';
import { CatalogProvider } from './context/CatalogContext';
import { CostCalculator } from './components/Calculator/CostCalculator';
import { CatalogView } from './components/Catalog/CatalogView';

function App() {
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' or 'calculator'

  return (
    <div className="App">
      <CalculatorProvider>
        <PackagingProvider>
          <CatalogProvider>
            {currentView === 'catalog' ? (
              <CatalogView
                themeClasses={{
                  background: 'bg-gray-50',
                  card: 'bg-white border-gray-200',
                  text: {
                    primary: 'text-gray-900',
                    secondary: 'text-gray-600'
                  },
                  input: 'bg-white border-gray-300 text-gray-900',
                  button: {
                    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
                    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
                    success: 'bg-green-600 hover:bg-green-700 text-white'
                  }
                }}
                onNewCalculation={() => setCurrentView('calculator')}
                onLoadCalculation={(calc) => {
                  // TODO: Wczytaj kalkulację do kontekstu
                  setCurrentView('calculator');
                }}
              />
            ) : (
              <CostCalculator
                onBackToCatalog={() => setCurrentView('catalog')}
              />
            )}
          </CatalogProvider>
        </PackagingProvider>
      </CalculatorProvider>
    </div>
  );
}

export default App;