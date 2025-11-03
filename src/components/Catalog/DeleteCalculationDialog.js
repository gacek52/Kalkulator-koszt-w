import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Dialog potwierdzenia usunięcia kalkulacji
 * Wymaga wpisania "TAK" aby potwierdzić operację
 */
export function DeleteCalculationDialog({ calculation, onConfirm, onCancel, darkMode }) {
  const [confirmText, setConfirmText] = useState('');

  const themeClasses = {
    background: darkMode ? 'bg-gray-900' : 'bg-white',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: {
      primary: darkMode ? 'text-gray-100' : 'text-gray-900',
      secondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    },
    input: darkMode
      ? 'bg-gray-700 border-gray-600 text-gray-100'
      : 'bg-white border-gray-300 text-gray-900',
    button: {
      secondary: darkMode
        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    }
  };

  const itemCount = calculation.items?.length || 0;
  const isConfirmValid = confirmText === 'TAK';

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isConfirmValid) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} rounded-lg shadow-xl max-w-md w-full`}>
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <AlertTriangle className="text-red-600" size={32} />
          <h2 className={`text-xl font-bold ${themeClasses.text.primary}`}>
            Potwierdź usunięcie kalkulacji
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className={`${themeClasses.text.primary}`}>
            Czy na pewno chcesz usunąć kalkulację?
          </p>

          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="space-y-2">
              <div>
                <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  ID kalkulacji:
                </span>
                <span className={`ml-2 ${themeClasses.text.primary} font-semibold`}>
                  #{calculation.id}
                </span>
              </div>
              <div>
                <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Klient:
                </span>
                <span className={`ml-2 ${themeClasses.text.primary} font-semibold`}>
                  {calculation.client || 'Brak danych'}
                </span>
              </div>
              <div>
                <span className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                  Liczba elementów:
                </span>
                <span className={`ml-2 ${themeClasses.text.primary} font-semibold`}>
                  {itemCount} {itemCount === 1 ? 'element' : itemCount < 5 ? 'elementy' : 'elementów'}
                </span>
              </div>
            </div>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900 bg-opacity-30' : 'bg-red-50'} border ${darkMode ? 'border-red-800' : 'border-red-200'}`}>
            <p className={`text-sm ${darkMode ? 'text-red-200' : 'text-red-800'}`}>
              ⚠️ Ta operacja jest nieodwracalna. Wszystkie dane kalkulacji zostaną trwale usunięte.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${themeClasses.text.primary} mb-2`}>
              Wpisz <span className="font-bold text-red-600">TAK</span> aby potwierdzić usunięcie:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              onKeyDown={handleKeyPress}
              placeholder="TAK"
              autoFocus
              className={`w-full px-4 py-2 border rounded-lg ${themeClasses.input} focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-center text-lg`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
          >
            Anuluj
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmValid}
            className={`px-4 py-2 rounded-lg font-medium ${
              isConfirmValid
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            Usuń kalkulację
          </button>
        </div>
      </div>
    </div>
  );
}
