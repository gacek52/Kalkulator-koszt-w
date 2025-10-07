import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, Eye, EyeOff, Download, Upload } from 'lucide-react';

/**
 * LocalStorageViewer - Narzędzie deweloperskie do podglądu localStorage
 *
 * Funkcje:
 * - Podgląd wszystkich kluczy localStorage
 * - Podgląd zawartości w formacie JSON
 * - Odświeżanie danych
 * - Czyszczenie poszczególnych kluczy
 * - Export/Import danych
 */

export function LocalStorageViewer({ darkMode, onClose }) {
  const [storageData, setStorageData] = useState({});
  const [expandedKeys, setExpandedKeys] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Załaduj dane z localStorage
  const loadStorageData = () => {
    const data = {};
    const keys = [
      'activeSession',
      'catalogData',
      'clientData',
      'packagingData',
      'materialData',
      'clientManualData'
    ];

    keys.forEach(key => {
      let item = null;
      try {
        item = localStorage.getItem(key);
        if (item) {
          data[key] = {
            raw: item,
            parsed: JSON.parse(item),
            size: new Blob([item]).size
          };
        }
      } catch (error) {
        data[key] = {
          raw: item,
          parsed: null,
          error: error.message,
          size: 0
        };
      }
    });

    setStorageData(data);
  };

  // Auto-refresh
  useEffect(() => {
    loadStorageData();

    if (autoRefresh) {
      const interval = setInterval(loadStorageData, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Toggle expanded
  const toggleExpanded = (key) => {
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Usuń klucz
  const handleDelete = (key) => {
    if (window.confirm(`Czy na pewno chcesz usunąć "${key}" z localStorage?`)) {
      localStorage.removeItem(key);
      loadStorageData();
    }
  };

  // Wyczyść wszystko
  const handleClearAll = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić CAŁĄ localStorage? Ta operacja jest nieodwracalna!')) {
      localStorage.clear();
      loadStorageData();
    }
  };

  // Export danych
  const handleExport = () => {
    const data = {};
    Object.keys(storageData).forEach(key => {
      if (storageData[key].parsed) {
        data[key] = storageData[key].parsed;
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import danych
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        loadStorageData();
        alert('Import zakończony pomyślnie!');
      } catch (error) {
        alert('Błąd importu: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Format rozmiaru
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Oblicz całkowity rozmiar
  const totalSize = Object.values(storageData).reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-6xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              <div>
                <h2 className="text-xl font-semibold">LocalStorage Viewer</h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Całkowity rozmiar: {formatSize(totalSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto-refresh */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Auto-refresh</span>
              </label>

              {/* Refresh */}
              <button
                onClick={loadStorageData}
                className={`p-2 rounded-lg ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title="Odśwież"
              >
                <RefreshCw size={16} />
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                className={`p-2 rounded-lg ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                title="Eksportuj"
              >
                <Download size={16} />
              </button>

              {/* Import */}
              <label className={`p-2 rounded-lg cursor-pointer ${
                darkMode
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-600 hover:bg-green-700'
              } text-white`} title="Importuj">
                <Upload size={16} />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {/* Clear all */}
              <button
                onClick={handleClearAll}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                title="Wyczyść wszystko"
              >
                <Trash2 size={16} />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg font-medium ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`overflow-y-auto max-h-[calc(90vh-80px)] p-4 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="space-y-4">
            {Object.keys(storageData).length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Brak danych w localStorage
              </div>
            ) : (
              Object.entries(storageData).map(([key, data]) => (
                <div
                  key={key}
                  className={`rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Key header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleExpanded(key)}
                        className={`p-1 rounded ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        {expandedKeys[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold">{key}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Rozmiar: {formatSize(data.size)}
                          {data.error && ` | Błąd: ${data.error}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(key)}
                      className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                      title="Usuń"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Expanded content */}
                  {expandedKeys[key] && (
                    <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <pre className={`p-4 rounded overflow-x-auto text-xs ${
                        darkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {data.parsed
                          ? JSON.stringify(data.parsed, null, 2)
                          : data.raw || 'Brak danych'}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
