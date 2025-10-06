import React, { useState } from 'react';
import { useClient, clientUtils } from '../../context/ClientContext';
import { Plus, Edit2, Trash2, Search, Upload, Download, X, Check } from 'lucide-react';

/**
 * Komponent zarządzania klientami
 */
export function ClientManager({ themeClasses, darkMode, onClose }) {
  const { state, actions } = useClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Polska',
    notes: ''
  });

  // Wyszukiwanie klientów
  const filteredClients = clientUtils.searchClients(state, searchTerm);

  // Resetuj formularz
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      nip: '',
      address: '',
      postalCode: '',
      city: '',
      country: 'Polska',
      notes: ''
    });
    setEditingClient(null);
  };

  // Obsługa dodawania/edycji klienta
  const handleSubmit = () => {
    if (editingClient) {
      actions.updateClient(editingClient.id, formData);
      alert('Klient zaktualizowany!');
    } else {
      const success = actions.addClient(formData);
      if (success) {
        alert('Klient dodany!');
      }
    }
    resetForm();
  };

  // Obsługa edycji
  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      code: client.code || '',
      nip: client.nip || '',
      address: client.address || '',
      postalCode: client.postalCode || '',
      city: client.city || '',
      country: client.country || 'Polska',
      notes: client.notes || ''
    });
  };

  // Obsługa usuwania
  const handleDelete = (id) => {
    actions.removeClient(id);
  };

  // Eksport do JSON
  const handleExport = () => {
    const json = clientUtils.exportToJson(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import z JSON
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = clientUtils.importFromJson(e.target.result);
        actions.loadClients(data);
        alert(`Zaimportowano ${data.clients.length} klientów!`);
      } catch (error) {
        alert(`Błąd importu: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`${themeClasses.background} min-h-screen p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                Zarządzanie Klientami
              </h1>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Zarządzaj bazą klientów dla kalkulacji
              </p>
            </div>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${themeClasses.button.secondary}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Akcje */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              className={`px-4 py-2 rounded-lg ${themeClasses.button.secondary} flex items-center gap-2`}
            >
              <Download size={16} />
              Eksportuj
            </button>
            <label className={`px-4 py-2 rounded-lg ${themeClasses.button.secondary} flex items-center gap-2 cursor-pointer`}>
              <Upload size={16} />
              Importuj
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={actions.resetClients}
              className={`px-4 py-2 rounded-lg ${themeClasses.button.danger} flex items-center gap-2`}
            >
              Reset
            </button>
            <div className={`text-sm ${themeClasses.text.secondary} ml-auto flex items-center`}>
              Liczba klientów: <span className="font-bold ml-1">{state.clients.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formularz */}
          <div className={`${themeClasses.card} rounded-lg border p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${themeClasses.text.primary}`}>
              {editingClient ? 'Edytuj Klienta' : 'Dodaj Klienta'}
            </h2>

            <div className="space-y-4">
              {/* Nazwa */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Nazwa klienta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="Nazwa firmy"
                />
              </div>

              {/* Kod klienta */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Kod klienta (z Subiekt GT)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="np. KL-001"
                />
              </div>

              {/* NIP */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  NIP
                </label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="0000000000"
                />
              </div>

              {/* Adres */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Adres
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="ul. Przykładowa 1"
                />
              </div>

              {/* Kod pocztowy i miasto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                    placeholder="00-000"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                    placeholder="Warszawa"
                  />
                </div>
              </div>

              {/* Kraj */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Kraj
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="Polska"
                />
              </div>

              {/* Notatki */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                  Notatki
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${themeClasses.input}`}
                  rows="3"
                  placeholder="np. transport własny, odbiór osobisty"
                />
              </div>

              {/* Przyciski */}
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  className={`flex-1 px-4 py-2 rounded-lg ${themeClasses.button.primary} flex items-center justify-center gap-2`}
                >
                  <Check size={16} />
                  {editingClient ? 'Zapisz' : 'Dodaj'}
                </button>
                {editingClient && (
                  <button
                    onClick={resetForm}
                    className={`px-4 py-2 rounded-lg ${themeClasses.button.secondary}`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista klientów */}
          <div className={`${themeClasses.card} rounded-lg border p-6`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold mb-3 ${themeClasses.text.primary}`}>
                Lista Klientów
              </h2>

              {/* Wyszukiwarka */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 rounded-lg border ${themeClasses.input}`}
                  placeholder="Szukaj klienta..."
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className={`text-center py-8 ${themeClasses.text.secondary}`}>
                  Brak klientów
                </div>
              ) : (
                filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg border ${
                      darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`font-semibold ${themeClasses.text.primary}`}>
                          {client.name}
                        </div>
                        {client.code && (
                          <div className={`text-sm ${themeClasses.text.secondary}`}>
                            Kod: {client.code}
                          </div>
                        )}
                        {client.city && (
                          <div className={`text-sm ${themeClasses.text.secondary}`}>
                            📍 {client.city}
                            {client.postalCode && ` (${client.postalCode})`}
                          </div>
                        )}
                        {client.nip && (
                          <div className={`text-sm ${themeClasses.text.secondary}`}>
                            NIP: {client.nip}
                          </div>
                        )}
                        {client.notes && (
                          <div className={`text-xs mt-1 italic ${themeClasses.text.secondary}`}>
                            {client.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Edytuj"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Usuń"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
