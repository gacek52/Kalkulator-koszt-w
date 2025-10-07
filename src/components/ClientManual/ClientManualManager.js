import React, { useState } from 'react';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';
import { useClientManual } from '../../context/ClientManualContext';
import { useClient } from '../../context/ClientContext';

/**
 * Komponent zarządzania manualnymi danymi klientów (stawki, koszty, marże)
 */
export function ClientManualManager({ darkMode, themeClasses, onClose, readOnly = false }) {
  const { state: manualState, actions: manualActions } = useClientManual();
  const { state: clientState } = useClient();
  const [selectedManualId, setSelectedManualId] = useState(null);
  const [editingManual, setEditingManual] = useState(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [newManual, setNewManual] = useState({
    clientId: '',
    clientName: '',
    laborCost: '',
    laborCostNotes: '',
    machineCost: '',
    machineCostNotes: ''
  });

  const selectedManual = manualState.manuals.find(m => m.id === selectedManualId);

  // Obsługa dodawania nowego manuala
  const handleAddManual = () => {
    if (!newManual.clientId) {
      alert('Wybierz klienta');
      return;
    }

    // Sprawdź czy manual dla tego klienta już istnieje
    const exists = manualState.manuals.find(m => m.clientId === parseInt(newManual.clientId));
    if (exists) {
      alert('Manual dla tego klienta już istnieje!');
      return;
    }

    const client = clientState.clients.find(c => c.id === parseInt(newManual.clientId));
    manualActions.addManual({
      ...newManual,
      clientId: parseInt(newManual.clientId),
      clientName: client.name
    });

    setNewManual({
      clientId: '',
      clientName: '',
      laborCost: '',
      laborCostNotes: '',
      machineCost: '',
      machineCostNotes: ''
    });
    setShowAddManual(false);
  };

  // Obsługa dodawania materiału
  const handleAddMaterial = () => {
    if (!selectedManual) return;
    manualActions.addMaterial(selectedManual.id, {
      type: '',
      costPerKg: '',
      notes: ''
    });
  };

  // Obsługa dodawania marży
  const handleAddMargin = () => {
    if (!selectedManual) return;
    manualActions.addMargin(selectedManual.id, {
      productType: '',
      margin: '',
      notes: ''
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Client Manual {readOnly && '(Podgląd)'}
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  {readOnly ? 'Podgląd stawek i kosztów dla klientów' : 'Baza stawek i kosztów dla klientów'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista manuali */}
          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                Klienci
              </h2>
              {!readOnly && (
                <button
                  onClick={() => setShowAddManual(true)}
                  className={`p-2 rounded-lg ${themeClasses.button.primary}`}
                  title="Dodaj manual"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {manualState.manuals.map(manual => (
                <button
                  key={manual.id}
                  onClick={() => setSelectedManualId(manual.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedManualId === manual.id
                      ? themeClasses.button.primary
                      : themeClasses.button.secondary
                  }`}
                >
                  <div className={`font-medium ${selectedManualId === manual.id ? 'text-white' : themeClasses.text.primary}`}>
                    {manual.clientName}
                  </div>
                  <div className={`text-sm ${selectedManualId === manual.id ? 'text-gray-200' : themeClasses.text.secondary}`}>
                    {manual.materials?.length || 0} materiałów, {manual.margins?.length || 0} marż
                  </div>
                </button>
              ))}

              {manualState.manuals.length === 0 && (
                <p className={`text-center py-4 ${themeClasses.text.secondary}`}>
                  Brak manuali. Dodaj pierwszy!
                </p>
              )}
            </div>
          </div>

          {/* Szczegóły manuala */}
          <div className="lg:col-span-2">
            {selectedManual ? (
              <div className="space-y-6">
                {/* Informacje podstawowe */}
                <div className={`${themeClasses.card} rounded-lg border p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                      {selectedManual.clientName}
                    </h2>
                    {!readOnly && (
                      <button
                        onClick={() => manualActions.removeManual(selectedManual.id)}
                        className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        title="Usuń manual"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                        Koszt pracownika (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedManual.laborCost}
                        onChange={(e) => manualActions.updateManual(selectedManual.id, { laborCost: e.target.value })}
                        disabled={readOnly}
                        className={`w-full px-3 py-2 border rounded ${
                          readOnly
                            ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                            : themeClasses.input
                        }`}
                        placeholder="0.00"
                      />
                      <textarea
                        value={selectedManual.laborCostNotes || ''}
                        onChange={(e) => manualActions.updateManual(selectedManual.id, { laborCostNotes: e.target.value })}
                        disabled={readOnly}
                        className={`w-full px-3 py-2 border rounded mt-2 ${
                          readOnly
                            ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                            : themeClasses.input
                        }`}
                        placeholder="Notatki..."
                        rows="2"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                        Koszt maszyn (€/h)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedManual.machineCost}
                        onChange={(e) => manualActions.updateManual(selectedManual.id, { machineCost: e.target.value })}
                        disabled={readOnly}
                        className={`w-full px-3 py-2 border rounded ${
                          readOnly
                            ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                            : themeClasses.input
                        }`}
                        placeholder="0.00"
                      />
                      <textarea
                        value={selectedManual.machineCostNotes || ''}
                        onChange={(e) => manualActions.updateManual(selectedManual.id, { machineCostNotes: e.target.value })}
                        disabled={readOnly}
                        className={`w-full px-3 py-2 border rounded mt-2 ${
                          readOnly
                            ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                            : themeClasses.input
                        }`}
                        placeholder="Notatki..."
                        rows="2"
                      />
                    </div>
                  </div>
                </div>

                {/* Materiały */}
                <div className={`${themeClasses.card} rounded-lg border p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                      Materiały
                    </h3>
                    {!readOnly && (
                      <button
                        onClick={handleAddMaterial}
                        className={`px-3 py-1 rounded-lg ${themeClasses.button.primary} flex items-center gap-2`}
                      >
                        <Plus size={16} />
                        Dodaj
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedManual.materials?.map(material => (
                      <div key={material.id} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                              Typ materiału
                            </label>
                            <input
                              type="text"
                              value={material.type}
                              onChange={(e) => manualActions.updateMaterial(selectedManual.id, material.id, { type: e.target.value })}
                              disabled={readOnly}
                              className={`w-full px-2 py-1 border rounded text-sm ${
                                readOnly
                                  ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                                  : themeClasses.input
                              }`}
                              placeholder="np. Stal, Aluminium"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                              Koszt (€/kg)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={material.costPerKg}
                              onChange={(e) => manualActions.updateMaterial(selectedManual.id, material.id, { costPerKg: e.target.value })}
                              disabled={readOnly}
                              className={`w-full px-2 py-1 border rounded text-sm ${
                                readOnly
                                  ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                                  : themeClasses.input
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {!readOnly && (
                            <div className="flex items-end">
                              <button
                                onClick={() => manualActions.removeMaterial(selectedManual.id, material.id)}
                                className="w-full px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                              >
                                Usuń
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea
                          value={material.notes || ''}
                          onChange={(e) => manualActions.updateMaterial(selectedManual.id, material.id, { notes: e.target.value })}
                          disabled={readOnly}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            readOnly
                              ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                              : themeClasses.input
                          }`}
                          placeholder="Notatki..."
                          rows="2"
                        />
                      </div>
                    ))}

                    {(!selectedManual.materials || selectedManual.materials.length === 0) && (
                      <p className={`text-center py-4 text-sm ${themeClasses.text.secondary}`}>
                        Brak materiałów. Dodaj pierwszy!
                      </p>
                    )}
                  </div>
                </div>

                {/* Marże */}
                <div className={`${themeClasses.card} rounded-lg border p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                      Standardowe marże
                    </h3>
                    {!readOnly && (
                      <button
                        onClick={handleAddMargin}
                        className={`px-3 py-1 rounded-lg ${themeClasses.button.primary} flex items-center gap-2`}
                      >
                        <Plus size={16} />
                        Dodaj
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedManual.margins?.map(margin => (
                      <div key={margin.id} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                              Typ produktu
                            </label>
                            <input
                              type="text"
                              value={margin.productType}
                              onChange={(e) => manualActions.updateMargin(selectedManual.id, margin.id, { productType: e.target.value })}
                              disabled={readOnly}
                              className={`w-full px-2 py-1 border rounded text-sm ${
                                readOnly
                                  ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                                  : themeClasses.input
                              }`}
                              placeholder="np. Prototypy, Seria"
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-medium ${themeClasses.text.secondary} mb-1`}>
                              Marża (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={margin.margin}
                              onChange={(e) => manualActions.updateMargin(selectedManual.id, margin.id, { margin: e.target.value })}
                              disabled={readOnly}
                              className={`w-full px-2 py-1 border rounded text-sm ${
                                readOnly
                                  ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                                  : themeClasses.input
                              }`}
                              placeholder="0.0"
                            />
                          </div>
                          {!readOnly && (
                            <div className="flex items-end">
                              <button
                                onClick={() => manualActions.removeMargin(selectedManual.id, margin.id)}
                                className="w-full px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                              >
                                Usuń
                              </button>
                            </div>
                          )}
                        </div>
                        <textarea
                          value={margin.notes || ''}
                          onChange={(e) => manualActions.updateMargin(selectedManual.id, margin.id, { notes: e.target.value })}
                          disabled={readOnly}
                          className={`w-full px-2 py-1 border rounded text-sm ${
                            readOnly
                              ? 'bg-gray-200 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed'
                              : themeClasses.input
                          }`}
                          placeholder="Notatki..."
                          rows="2"
                        />
                      </div>
                    ))}

                    {(!selectedManual.margins || selectedManual.margins.length === 0) && (
                      <p className={`text-center py-4 text-sm ${themeClasses.text.secondary}`}>
                        Brak marż. Dodaj pierwszą!
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${themeClasses.card} rounded-lg border p-8`}>
                <p className={`text-center ${themeClasses.text.secondary}`}>
                  Wybierz klienta z listy lub dodaj nowy manual
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dialog dodawania manuala */}
        {!readOnly && showAddManual && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`w-full max-w-md rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
                  Dodaj nowy manual
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Klient
                  </label>
                  <select
                    value={newManual.clientId}
                    onChange={(e) => setNewManual({ ...newManual, clientId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                  >
                    <option value="">-- Wybierz klienta --</option>
                    {clientState.clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.city && `(${client.city})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Koszt pracownika (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newManual.laborCost}
                    onChange={(e) => setNewManual({ ...newManual, laborCost: e.target.value })}
                    className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    Koszt maszyn (€/h)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newManual.machineCost}
                    onChange={(e) => setNewManual({ ...newManual, machineCost: e.target.value })}
                    className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className={`flex justify-end gap-3 p-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setShowAddManual(false)}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
                >
                  Anuluj
                </button>
                <button
                  onClick={handleAddManual}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
