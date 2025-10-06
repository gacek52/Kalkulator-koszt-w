import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Modal ostrzegawczy przy zmianie trybu kalkulacji gdy są wprowadzone dane
 */
export function CalculationTypeSwitchModal({ isOpen, onConfirm, onCancel, newType, darkMode }) {
  if (!isOpen) return null;

  const typeNames = {
    weight: 'Waga',
    surface: 'Powierzchnia',
    volume: 'Objętość',
    heatshield: 'Proste Heatshield\'y',
    multilayer: 'Multilayer'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-md rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Zmiana trybu kalkulacji</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
            Zmiana trybu kalkulacji na <strong>{typeNames[newType]}</strong> spowoduje
            utratę wszystkich wprowadzonych danych w tej zakładce.
          </p>
          <p className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
            Czy na pewno chcesz kontynuować?
          </p>
        </div>

        {/* Buttons */}
        <div className={`flex justify-end gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
          >
            Potwierdź i wyczyść dane
          </button>
        </div>
      </div>
    </div>
  );
}
