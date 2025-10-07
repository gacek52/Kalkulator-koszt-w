import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Komponent do importu danych z JSON z walidacją
 */
export function JsonImportButton({
  onImport,
  validateData,
  label = 'Importuj JSON',
  className = '',
  disabled = false,
  themeClasses = {},
  acceptedFields = [] // pola które mają być zachowane podczas importu
}) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null); // 'success', 'error', 'loading'
  const [message, setMessage] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus('loading');
    setMessage('Wczytywanie pliku...');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Walidacja danych
        if (validateData) {
          const validation = validateData(data);
          if (!validation.isValid) {
            setStatus('error');
            setMessage(`Błąd walidacji: ${validation.errors.join(', ')}`);
            return;
          }
        }

        // Filtruj dane jeśli określono akceptowane pola
        const filteredData = acceptedFields.length > 0
          ? filterData(data, acceptedFields)
          : data;

        // Wywołaj callback importu
        onImport(filteredData);

        setStatus('success');
        setMessage('Dane zostały pomyślnie zaimportowane');

        // Wyczyść status po 3 sekundach
        setTimeout(() => {
          setStatus(null);
          setMessage('');
        }, 3000);

      } catch (error) {
        setStatus('error');
        setMessage('Błąd: Nieprawidłowy format pliku JSON');
        console.error('JSON import error:', error);
      }
    };

    reader.onerror = () => {
      setStatus('error');
      setMessage('Błąd: Nie można odczytać pliku');
    };

    reader.readAsText(file);

    // Wyczyść input
    event.target.value = '';
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const filterData = (data, fields) => {
    const filtered = {};
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        filtered[field] = data[field];
      }
    });
    return filtered;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'loading':
        return <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />;
      default:
        return <Upload size={16} />;
    }
  };

  const buttonClasses = `
    inline-flex items-center px-4 py-2 rounded-lg font-medium focus:ring-2 focus:ring-blue-500
    ${disabled || status === 'loading' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
    ${themeClasses.button?.secondary || 'bg-gray-600 text-white'}
    ${className}
  `.trim();

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        className={buttonClasses}
        title="Importuje dane kalkulatora z pliku JSON"
      >
        {getStatusIcon()}
        <span className="ml-2">{label}</span>
      </button>

      {message && (
        <div className={`
          text-sm p-2 rounded-md
          ${status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : ''}
          ${status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : ''}
          ${status === 'loading' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
        `}>
          {message}
        </div>
      )}
    </div>
  );
}

/**
 * Funkcje walidacji dla różnych typów danych
 */
export const validationSchemas = {
  calculator: (data) => {
    const errors = [];

    // Sprawdź czy to jest obiekt
    if (!data || typeof data !== 'object') {
      errors.push('Nieprawidłowy format danych');
      return { isValid: false, errors };
    }

    // Tabs są wymagane
    if (!data.tabs || !Array.isArray(data.tabs)) {
      errors.push('Brak prawidłowych danych zakładek');
    }

    if (data.tabs && data.tabs.length === 0) {
      errors.push('Musi istnieć przynajmniej jedna zakładka');
    }

    // Sprawdź strukturę zakładek
    data.tabs?.forEach((tab, index) => {
      if (!tab.id || !tab.name) {
        errors.push(`Zakładka ${index + 1}: brak ID lub nazwy`);
      }

      if (!tab.items || !Array.isArray(tab.items)) {
        errors.push(`Zakładka ${index + 1}: brak prawidłowych elementów`);
      }
    });

    // Ostrzeżenia (nie błędy) dla brakujących opcjonalnych pól
    const warnings = [];
    if (!data.globalSGA) warnings.push('Brak globalSGA - użyto wartości domyślnej');
    if (data.activeTab === undefined) warnings.push('Brak activeTab - użyto wartości domyślnej');
    if (!data.calculationMeta) warnings.push('Brak calculationMeta - użyto wartości domyślnych');

    if (warnings.length > 0) {
      console.warn('Ostrzeżenia importu:', warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  packaging: (data) => {
    const errors = [];

    if (!data.packagingTypes || !Array.isArray(data.packagingTypes)) {
      errors.push('Brak prawidłowych typów opakowań');
    }

    // Sprawdź strukturę typów opakowań
    data.packagingTypes?.forEach((pkg, index) => {
      if (!pkg.name || !pkg.dimensions || !pkg.cost) {
        errors.push(`Opakowanie ${index + 1}: brak wymaganych pól`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  catalog: (data) => {
    const errors = [];

    if (!data.calculations || !Array.isArray(data.calculations)) {
      errors.push('Brak prawidłowych kalkulacji w katalogu');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};