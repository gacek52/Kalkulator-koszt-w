import React from 'react';
import { Wrench, Plus, Trash2 } from 'lucide-react';

/**
 * Sekcja narzędzi/toolingu dla elementu kalkulacji
 * Pozwala dodawać jednorazowe koszty narzędzi (formy, przyrządy, etc.)
 */
export function ToolingSection({ item, onUpdate, themeClasses, darkMode }) {
  const toolingEnabled = item.tooling?.enabled || false;
  const toolingItems = item.tooling?.items || [];

  // Włącz/wyłącz sekcję toolingu
  const handleToggleTooling = () => {
    onUpdate({
      tooling: {
        enabled: !toolingEnabled,
        items: toolingEnabled ? [] : []
      }
    });
  };

  // Dodaj nowe narzędzie
  const handleAddTool = () => {
    const newTool = {
      id: `tool-${Date.now()}`,
      name: '',
      cost: 0
    };

    onUpdate({
      tooling: {
        enabled: true,
        items: [...toolingItems, newTool]
      }
    });
  };

  // Usuń narzędzie
  const handleRemoveTool = (toolId) => {
    onUpdate({
      tooling: {
        enabled: true,
        items: toolingItems.filter(t => t.id !== toolId)
      }
    });
  };

  // Zaktualizuj narzędzie
  const handleUpdateTool = (toolId, field, value) => {
    onUpdate({
      tooling: {
        enabled: true,
        items: toolingItems.map(t =>
          t.id === toolId ? { ...t, [field]: value } : t
        )
      }
    });
  };

  // Oblicz sumę kosztów toolingu
  const totalToolingCost = toolingItems.reduce((sum, tool) => {
    return sum + (parseFloat(tool.cost) || 0);
  }, 0);

  return (
    <div className={`p-4 rounded-lg border ${themeClasses.card} mt-3`}>
      {/* Header z checkboxem */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench size={18} className={themeClasses.text.secondary} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={toolingEnabled}
              onChange={handleToggleTooling}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`font-semibold ${themeClasses.text.primary}`}>
              Narzędzia / Tooling
            </span>
          </label>
        </div>
        {toolingEnabled && toolingItems.length > 0 && (
          <div className={`text-sm font-medium ${themeClasses.text.primary}`}>
            Suma: <span className="text-blue-600">{totalToolingCost.toFixed(2)} €</span>
          </div>
        )}
      </div>

      {/* Lista narzędzi */}
      {toolingEnabled && (
        <div className="space-y-3">
          {toolingItems.length === 0 ? (
            <p className={`text-sm ${themeClasses.text.secondary} italic`}>
              Brak narzędzi. Kliknij "Dodaj narzędzie" aby dodać.
            </p>
          ) : (
            toolingItems.map((tool) => (
              <div
                key={tool.id}
                className={`p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex gap-3 items-start">
                  {/* Nazwa narzędzia */}
                  <div className="flex-1">
                    <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Nazwa narzędzia
                    </label>
                    <input
                      type="text"
                      value={tool.name}
                      onChange={(e) => handleUpdateTool(tool.id, 'name', e.target.value)}
                      placeholder="np. Forma wtryskowa, Przyrząd montażowy"
                      className={`w-full px-3 py-2 rounded border ${
                        darkMode
                          ? 'bg-gray-800 border-gray-600 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  {/* Koszt */}
                  <div className="w-32">
                    <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Koszt (€)
                    </label>
                    <input
                      type="number"
                      value={tool.cost}
                      onChange={(e) => handleUpdateTool(tool.id, 'cost', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                      className={`w-full px-3 py-2 rounded border ${
                        darkMode
                          ? 'bg-gray-800 border-gray-600 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>

                  {/* Przycisk usuń */}
                  <button
                    onClick={() => handleRemoveTool(tool.id)}
                    className="mt-6 p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 transition-colors"
                    title="Usuń narzędzie"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Przycisk dodaj narzędzie */}
          <button
            onClick={handleAddTool}
            className={`w-full py-2 px-4 rounded-lg border-2 border-dashed ${
              darkMode
                ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-700'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            } transition-colors flex items-center justify-center gap-2 ${themeClasses.text.secondary} hover:text-blue-600`}
          >
            <Plus size={16} />
            <span className="font-medium">Dodaj narzędzie</span>
          </button>

          {/* Info o toolingu */}
          <div className={`p-2 rounded text-xs ${darkMode ? 'bg-blue-900 bg-opacity-20 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
            ℹ️ Koszty toolingu są jednorazowe i nie wliczają się do ceny jednostkowej. Będą widoczne tylko w ofercie.
          </div>
        </div>
      )}
    </div>
  );
}
