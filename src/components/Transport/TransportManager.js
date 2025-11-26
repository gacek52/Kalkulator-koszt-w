import React, { useState } from 'react';
import { Truck, Plus, Edit2, Trash2, Download, Upload, Sun, Moon, ArrowLeft, Cloud } from 'lucide-react';
import { useTransport } from '../../context/TransportContext';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { PermissionGate } from '../Common/PermissionGate';

/**
 * Główny komponent zarządzania transportem
 */
export function TransportManager({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state, actions } = useTransport();
  const { currentUser } = useAuth();
  const { hasPermission } = useRole();
  const [editingType, setEditingType] = useState(null);
  const [isPushing, setIsPushing] = useState(false);

  // Formularz typu transportu
  const [typeForm, setTypeForm] = useState({
    name: '',
    loadCapacity: '',
    palletSpaces: '',
    maxLoadHeight: '',
    pricePerKm: ''
  });

  // Dodaj/edytuj typ transportu
  const handleSaveType = () => {
    if (!hasPermission('transport_edit')) {
      alert('Nie masz uprawnień do edycji transportu');
      return;
    }

    if (!typeForm.name || !typeForm.loadCapacity || !typeForm.palletSpaces ||
        !typeForm.maxLoadHeight || !typeForm.pricePerKm) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const transportType = {
      name: typeForm.name,
      loadCapacity: parseFloat(typeForm.loadCapacity),
      palletSpaces: parseInt(typeForm.palletSpaces),
      maxLoadHeight: parseFloat(typeForm.maxLoadHeight),
      pricePerKm: parseFloat(typeForm.pricePerKm)
    };

    if (editingType) {
      actions.updateTransportType(editingType.id, transportType);
    } else {
      actions.addTransportType(transportType);
    }

    // Reset formularza
    setTypeForm({ name: '', loadCapacity: '', palletSpaces: '', maxLoadHeight: '', pricePerKm: '' });
    setEditingType(null);
  };

  // Rozpocznij edycję typu
  const handleEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      loadCapacity: type.loadCapacity.toString(),
      palletSpaces: type.palletSpaces.toString(),
      maxLoadHeight: type.maxLoadHeight.toString(),
      pricePerKm: type.pricePerKm.toString()
    });
  };

  // Usuń typ transportu
  const handleDeleteType = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten typ transportu?')) {
      actions.removeTransportType(id);
    }
  };

  // Anuluj edycję typu
  const handleCancelTypeEdit = () => {
    setEditingType(null);
    setTypeForm({ name: '', loadCapacity: '', palletSpaces: '', maxLoadHeight: '', pricePerKm: '' });
  };

  // Eksport do JSON
  const handleExport = () => {
    const exportData = {
      transportTypes: state.transportTypes,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transport-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import z JSON
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        if (importData.transportTypes) {
          // Importuj typy transportu
          importData.transportTypes.forEach(type => {
            actions.addTransportType(type);
          });
          alert('Import zakończony pomyślnie!');
        }
      } catch (error) {
        alert('Błąd podczas importu: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  // Push do Firestore
  const handlePushToFirestore = async () => {
    if (!hasPermission('transport_sync')) {
      alert('Nie masz uprawnień do synchronizacji transportu z bazą.');
      return;
    }

    if (!window.confirm('Czy na pewno chcesz zsynchronizować transport z bazą Firestore?')) {
      return;
    }

    setIsPushing(true);
    try {
      const success = await actions.syncToFirestore();
      if (success) {
        alert('Transport zsynchronizowany z Firestore!');
      } else {
        alert('Wystąpił błąd podczas synchronizacji.');
      }
    } catch (error) {
      alert('Błąd: ' + error.message);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg shadow-lg mb-6`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Truck size={32} className="text-blue-500" />
                <div>
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                    Zarządzanie Transportem
                  </h1>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    {state.transportTypes.length} {state.transportTypes.length === 1 ? 'typ' : 'typów'} transportu
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                >
                  <ArrowLeft size={16} />
                  Powrót
                </button>

                <button
                  onClick={onToggleDarkMode}
                  className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                  title={darkMode ? 'Tryb jasny' : 'Tryb ciemny'}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {hasPermission('transport_sync') && (
                  <button
                    onClick={handlePushToFirestore}
                    disabled={isPushing}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      isPushing
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    } flex items-center gap-2`}
                    title="Synchronizuj transport z bazą Firestore"
                  >
                    <Cloud size={16} />
                    {isPushing ? 'Synchronizuję...' : 'Push to Database'}
                  </button>
                )}

                <PermissionGate permission="transport_export">
                  <button
                    onClick={handleExport}
                    className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
                  >
                    <Download size={16} />
                    Eksport JSON
                  </button>
                </PermissionGate>

                <PermissionGate permission="transport_import">
                  <label className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2 cursor-pointer`}>
                    <Upload size={16} />
                    Import JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </PermissionGate>
              </div>
            </div>
          </div>

          <div className="p-6">
            <TypesSection
              state={state}
              typeForm={typeForm}
              setTypeForm={setTypeForm}
              editingType={editingType}
              handleSaveType={handleSaveType}
              handleEditType={handleEditType}
              handleDeleteType={handleDeleteType}
              handleCancelTypeEdit={handleCancelTypeEdit}
              themeClasses={themeClasses}
              darkMode={darkMode}
              hasPermission={hasPermission}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sekcja typów transportu
 */
function TypesSection({
  state,
  typeForm,
  setTypeForm,
  editingType,
  handleSaveType,
  handleEditType,
  handleDeleteType,
  handleCancelTypeEdit,
  themeClasses,
  darkMode,
  hasPermission
}) {
  return (
    <div className="space-y-6">
      {/* Formularz dodawania/edycji */}
      {hasPermission('transport_edit') && (
      <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className={`text-lg font-medium mb-4 ${themeClasses.text.primary}`}>
          {editingType ? 'Edytuj typ transportu' : 'Dodaj nowy typ transportu'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Nazwa/Rodzaj transportu
            </label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="np. Ciężarówka 24t"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Ładowność (kg)
            </label>
            <input
              type="number"
              value={typeForm.loadCapacity}
              onChange={(e) => setTypeForm({ ...typeForm, loadCapacity: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="100"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Ilość miejsc paletowych
            </label>
            <input
              type="number"
              value={typeForm.palletSpaces}
              onChange={(e) => setTypeForm({ ...typeForm, palletSpaces: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="1"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Maks. wysokość załadunku (m)
            </label>
            <input
              type="number"
              value={typeForm.maxLoadHeight}
              onChange={(e) => setTypeForm({ ...typeForm, maxLoadHeight: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Kilometrówka (€/km)
            </label>
            <input
              type="number"
              value={typeForm.pricePerKm}
              onChange={(e) => setTypeForm({ ...typeForm, pricePerKm: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveType}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
          >
            <Plus size={16} />
            {editingType ? 'Zaktualizuj' : 'Dodaj'}
          </button>

          {editingType && (
            <button
              onClick={handleCancelTypeEdit}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
            >
              Anuluj
            </button>
          )}
        </div>
      </div>
      )}

      {/* Lista typów */}
      <div className="space-y-3">
        <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
          Zdefiniowane typy transportu
        </h3>

        {state.transportTypes.length === 0 ? (
          <div className={`text-center py-8 ${themeClasses.text.secondary}`}>
            Brak zdefiniowanych typów transportu. Dodaj pierwszy typ powyżej.
          </div>
        ) : (
          <div className="space-y-2">
            {state.transportTypes.map((type) => (
              <div
                key={type.id}
                className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium ${themeClasses.text.primary}`}>{type.name}</h4>
                    <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                      Ładowność: {type.loadCapacity} kg | Miejsca paletowe: {type.palletSpaces} | Maks. wys.: {type.maxLoadHeight} m
                    </p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>
                      Kilometrówka: €{type.pricePerKm.toFixed(2)}/km
                    </p>
                  </div>

                  {hasPermission('transport_edit') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditType(type)}
                        className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
                        title="Edytuj"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteType(type.id)}
                        className={`p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600`}
                        title="Usuń"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
