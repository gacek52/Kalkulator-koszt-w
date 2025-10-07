import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { Save, AlertCircle, Clock, CheckCircle } from 'lucide-react';

/**
 * SaveStatusIndicator - Komponent wyświetlający status zapisu sesji
 *
 * Funkcje:
 * - Wyświetla aktualny status zapisu (zapisano, niezapisane, zapisywanie, błąd)
 * - Pokazuje czas od ostatniego auto-save
 * - Pozwala na manualne wymuszenie zapisu
 * - Automatycznie odświeża wyświetlany czas
 */

export function SaveStatusIndicator({ darkMode, compact = false }) {
  const { saveStatus, lastAutoSave, hasUnsavedChanges, forceSave } = useSession();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Odświeżaj czas co sekundę dla dokładnego wyświetlania "X sekund temu"
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Oblicz ile czasu minęło od ostatniego zapisu
  const getTimeSinceLastSave = () => {
    if (!lastAutoSave) return null;

    const diffMs = currentTime - lastAutoSave;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);

    if (diffMinutes > 60) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} godz. temu`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} min temu`;
    } else if (diffSeconds > 5) {
      return `${diffSeconds} sek temu`;
    } else {
      return 'przed chwilą';
    }
  };

  // Określ status i wygląd
  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: Clock,
          text: 'Zapisywanie...',
          color: darkMode ? 'text-blue-400' : 'text-blue-600',
          bgColor: darkMode ? 'bg-blue-900 bg-opacity-20' : 'bg-blue-100',
          borderColor: darkMode ? 'border-blue-700' : 'border-blue-300',
          showSpinner: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Błąd zapisu',
          color: darkMode ? 'text-red-400' : 'text-red-600',
          bgColor: darkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-100',
          borderColor: darkMode ? 'border-red-700' : 'border-red-300',
          showSpinner: false
        };
      case 'unsaved':
        return {
          icon: AlertCircle,
          text: 'Zmiany niezapisane',
          color: darkMode ? 'text-yellow-400' : 'text-yellow-600',
          bgColor: darkMode ? 'bg-yellow-900 bg-opacity-20' : 'bg-yellow-100',
          borderColor: darkMode ? 'border-yellow-700' : 'border-yellow-300',
          showSpinner: false
        };
      case 'saved':
      default:
        return {
          icon: CheckCircle,
          text: 'Zapisano',
          color: darkMode ? 'text-green-400' : 'text-green-600',
          bgColor: darkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-100',
          borderColor: darkMode ? 'border-green-700' : 'border-green-300',
          showSpinner: false
        };
    }
  };

  const config = getStatusConfig();
  const timeSince = getTimeSinceLastSave();
  const IconComponent = config.icon;

  // Obsługa manualnego zapisu
  const handleManualSave = () => {
    if (hasUnsavedChanges) {
      forceSave();
    }
  };

  // Wersja kompaktowa (tylko ikona i status)
  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded border ${config.bgColor} ${config.borderColor}`}>
        <IconComponent size={14} className={config.color} />
        <span className={`text-xs font-medium ${config.color}`}>
          {config.text}
        </span>
      </div>
    );
  }

  // Pełna wersja
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} transition-all duration-300`}>
      {/* Ikona statusu */}
      <div className="relative">
        <IconComponent
          size={20}
          className={`${config.color} ${config.showSpinner ? 'animate-spin' : ''}`}
        />
      </div>

      {/* Tekst statusu i czas */}
      <div className="flex flex-col flex-1">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
        {timeSince && saveStatus === 'saved' && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Ostatni zapis: {timeSince}
          </span>
        )}
        {saveStatus === 'error' && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Spróbuj ponownie
          </span>
        )}
      </div>

      {/* Przycisk manualnego zapisu (tylko gdy są niezapisane zmiany) */}
      {hasUnsavedChanges && saveStatus !== 'saving' && (
        <button
          onClick={handleManualSave}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          title="Zapisz teraz"
        >
          <Save size={14} />
        </button>
      )}
    </div>
  );
}
