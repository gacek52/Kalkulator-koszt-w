import React from 'react';
import { Clock, Trash2, PlayCircle } from 'lucide-react';

/**
 * SessionRestoreDialog - Dialog przywracania ostatniej sesji
 *
 * Pokazuje się przy starcie aplikacji jeśli istnieje aktywna sesja
 * Pozwala na kontynuację pracy lub rozpoczęcie nowej sesji
 */

export function SessionRestoreDialog({ session, onRestore, onDiscard, onCancel, darkMode }) {
  if (!session) return null;

  // Oblicz ile czasu minęło od ostatniej modyfikacji
  const getTimeSinceLastModified = () => {
    if (!session.lastModified) return 'nieznany czas';

    const now = new Date();
    const lastModified = new Date(session.lastModified);
    const diffMs = now - lastModified;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} ${diffDays === 1 ? 'dzień' : 'dni'} temu`;
    } else if (diffHours > 0) {
      return `${diffHours} ${diffHours === 1 ? 'godzinę' : 'godzin'} temu`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minutę' : 'minut'} temu`;
    } else {
      return 'przed chwilą';
    }
  };

  // Pobierz informacje o sesji
  const calculation = session.calculation || {};
  const tabsCount = calculation.tabs?.length || 0;
  const timeSince = getTimeSinceLastModified();
  const clientName = calculation.calculationMeta?.client || 'Nieokreślony klient';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-lg rounded-lg shadow-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Clock className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold">Kontynuuj ostatnią sesję?</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Znaleziono niezakończoną sesję roboczą. Czy chcesz kontynuować pracę?
          </p>

          {/* Session info */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Klient:
                </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                  {clientName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Liczba zakładek:
                </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                  {tabsCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Ostatnia modyfikacja:
                </span>
                <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                  {timeSince}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex flex-col gap-3 p-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onRestore}
            className="w-full px-4 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle size={20} />
            Kontynuuj sesję
          </button>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              Anuluj
            </button>
            <button
              onClick={onDiscard}
              className="flex-1 px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Odrzuć sesję
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
