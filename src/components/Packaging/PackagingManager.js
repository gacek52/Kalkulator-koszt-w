import React, { useState } from 'react';
import { Package, Plus, Edit2, Trash2, Download, Sun, Moon, ArrowLeft } from 'lucide-react';
import { usePackaging } from '../../context/PackagingContext';

/**
 * Główny komponent zarządzania pakowaniem
 */
export function PackagingManager({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state, actions } = usePackaging();
  const [activeTab, setActiveTab] = useState('types'); // 'types' or 'compositions'
  const [editingType, setEditingType] = useState(null);
  const [editingComposition, setEditingComposition] = useState(null);

  // Formularz typu opakowania
  const [typeForm, setTypeForm] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    cost: ''
  });

  // Formularz kompozycji pakowania
  const [compositionForm, setCompositionForm] = useState({
    name: '',
    packagingTypeId: '',
    packagesPerPallet: '',
    palletsPerSpace: '',
    palletCost: '3.6'
  });

  // Dodaj/edytuj typ opakowania
  const handleSaveType = () => {
    if (!typeForm.name || !typeForm.length || !typeForm.width || !typeForm.height || !typeForm.cost) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const packagingType = {
      name: typeForm.name,
      dimensions: {
        length: parseFloat(typeForm.length),
        width: parseFloat(typeForm.width),
        height: parseFloat(typeForm.height)
      },
      cost: parseFloat(typeForm.cost)
    };

    if (editingType) {
      actions.updatePackagingType(editingType.id, packagingType);
    } else {
      actions.addPackagingType(packagingType);
    }

    // Reset formularza
    setTypeForm({ name: '', length: '', width: '', height: '', cost: '' });
    setEditingType(null);
  };

  // Rozpocznij edycję typu
  const handleEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      length: type.dimensions.length.toString(),
      width: type.dimensions.width.toString(),
      height: type.dimensions.height.toString(),
      cost: type.cost.toString()
    });
  };

  // Usuń typ opakowania
  const handleDeleteType = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten typ opakowania?')) {
      actions.removePackagingType(id);
    }
  };

  // Anuluj edycję typu
  const handleCancelTypeEdit = () => {
    setEditingType(null);
    setTypeForm({ name: '', length: '', width: '', height: '', cost: '' });
  };

  // Dodaj/edytuj kompozycję
  const handleSaveComposition = () => {
    if (!compositionForm.name || !compositionForm.packagingTypeId ||
        !compositionForm.packagesPerPallet || !compositionForm.palletsPerSpace ||
        !compositionForm.palletCost) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const packagingType = state.packagingTypes.find(t => t.id === parseInt(compositionForm.packagingTypeId));
    if (!packagingType) {
      alert('Nie znaleziono wybranego typu opakowania');
      return;
    }

    // Oblicz cenę kompozycji
    const packagesPerPallet = parseInt(compositionForm.packagesPerPallet);
    const palletsPerSpace = parseInt(compositionForm.palletsPerSpace);
    const palletCost = parseFloat(compositionForm.palletCost);

    // Cena = (cena opakowania × ilość opakowań na palecie + koszt palety) × ilość palet na miejsce paletowe
    const compositionCost = (packagingType.cost * packagesPerPallet + palletCost) * palletsPerSpace;

    const composition = {
      name: compositionForm.name,
      packagingTypeId: parseInt(compositionForm.packagingTypeId),
      packagesPerPallet: packagesPerPallet,
      palletsPerSpace: palletsPerSpace,
      palletCost: palletCost,
      compositionCost: compositionCost
    };

    if (editingComposition) {
      actions.updateComposition(editingComposition.id, composition);
    } else {
      actions.addComposition(composition);
    }

    // Reset formularza
    setCompositionForm({
      name: '',
      packagingTypeId: '',
      packagesPerPallet: '',
      palletsPerSpace: '',
      palletCost: '3.6'
    });
    setEditingComposition(null);
  };

  // Rozpocznij edycję kompozycji
  const handleEditComposition = (comp) => {
    setEditingComposition(comp);
    setCompositionForm({
      name: comp.name,
      packagingTypeId: comp.packagingTypeId.toString(),
      packagesPerPallet: comp.packagesPerPallet.toString(),
      palletsPerSpace: comp.palletsPerSpace.toString(),
      palletCost: comp.palletCost.toString()
    });
  };

  // Usuń kompozycję
  const handleDeleteComposition = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę kompozycję?')) {
      actions.removeComposition(id);
    }
  };

  // Anuluj edycję kompozycji
  const handleCancelCompositionEdit = () => {
    setEditingComposition(null);
    setCompositionForm({
      name: '',
      packagingTypeId: '',
      packagesPerPallet: '',
      palletsPerSpace: '',
      palletCost: '3.6'
    });
  };

  // Eksport do JSON
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      packagingTypes: state.packagingTypes,
      compositions: state.compositions || [],
      transportCostPerPallet: state.transportCostPerPallet
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `pakowanie_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${themeClasses.background} min-h-screen`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Zarządzanie pakowaniem
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Definiuj typy opakowań i kompozycje pakowania
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
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button
                onClick={handleExport}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
              >
                <Download size={16} />
                Eksportuj JSON
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`${themeClasses.card} rounded-lg border mb-6`}>
          <div className="flex border-b border-gray-200 dark:border-gray-600">
            <button
              onClick={() => setActiveTab('types')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'types'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : themeClasses.text.secondary
              }`}
            >
              Typy opakowań ({state.packagingTypes.length})
            </button>
            <button
              onClick={() => setActiveTab('compositions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'compositions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : themeClasses.text.secondary
              }`}
            >
              Kompozycje pakowania ({(state.compositions || []).length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'types' ? (
              <TypesTab
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
              />
            ) : (
              <CompositionsTab
                state={state}
                compositionForm={compositionForm}
                setCompositionForm={setCompositionForm}
                editingComposition={editingComposition}
                handleSaveComposition={handleSaveComposition}
                handleEditComposition={handleEditComposition}
                handleDeleteComposition={handleDeleteComposition}
                handleCancelCompositionEdit={handleCancelCompositionEdit}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab z typami opakowań
 */
function TypesTab({
  state,
  typeForm,
  setTypeForm,
  editingType,
  handleSaveType,
  handleEditType,
  handleDeleteType,
  handleCancelTypeEdit,
  themeClasses,
  darkMode
}) {
  return (
    <div className="space-y-6">
      {/* Formularz dodawania/edycji */}
      <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className={`text-lg font-medium mb-4 ${themeClasses.text.primary}`}>
          {editingType ? 'Edytuj typ opakowania' : 'Dodaj nowy typ opakowania'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Nazwa opakowania
            </label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="np. Karton B2"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Długość (mm)
            </label>
            <input
              type="number"
              value={typeForm.length}
              onChange={(e) => setTypeForm({ ...typeForm, length: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Szerokość (mm)
            </label>
            <input
              type="number"
              value={typeForm.width}
              onChange={(e) => setTypeForm({ ...typeForm, width: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Wysokość (mm)
            </label>
            <input
              type="number"
              value={typeForm.height}
              onChange={(e) => setTypeForm({ ...typeForm, height: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Koszt (€)
            </label>
            <input
              type="number"
              value={typeForm.cost}
              onChange={(e) => setTypeForm({ ...typeForm, cost: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveType}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
          >
            {editingType ? 'Zapisz zmiany' : 'Dodaj opakowanie'}
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

      {/* Lista typów */}
      <div className="space-y-3">
        <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
          Zdefiniowane typy opakowań
        </h3>

        {state.packagingTypes.length === 0 ? (
          <p className={themeClasses.text.secondary}>Brak zdefiniowanych typów opakowań</p>
        ) : (
          <div className="space-y-2">
            {state.packagingTypes.map((type) => (
              <div
                key={type.id}
                className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium ${themeClasses.text.primary}`}>{type.name}</h4>
                    <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                      Wymiary: {type.dimensions.length} × {type.dimensions.width} × {type.dimensions.height} mm
                    </p>
                    <p className={`text-sm ${themeClasses.text.secondary}`}>
                      Objętość: {type.volume.toFixed(4)} m³ | Koszt: €{type.cost.toFixed(2)}
                    </p>
                  </div>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tab z kompozycjami pakowania
 */
function CompositionsTab({
  state,
  compositionForm,
  setCompositionForm,
  editingComposition,
  handleSaveComposition,
  handleEditComposition,
  handleDeleteComposition,
  handleCancelCompositionEdit,
  themeClasses,
  darkMode
}) {
  const compositions = state.compositions || [];

  return (
    <div className="space-y-6">
      {/* Formularz dodawania/edycji */}
      <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className={`text-lg font-medium mb-4 ${themeClasses.text.primary}`}>
          {editingComposition ? 'Edytuj kompozycję pakowania' : 'Dodaj nową kompozycję pakowania'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Nazwa kompozycji
            </label>
            <input
              type="text"
              value={compositionForm.name}
              onChange={(e) => setCompositionForm({ ...compositionForm, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="np. Standard małe części"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Typ opakowania
            </label>
            <select
              value={compositionForm.packagingTypeId}
              onChange={(e) => setCompositionForm({ ...compositionForm, packagingTypeId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
            >
              <option value="">Wybierz...</option>
              {state.packagingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Opakowań na paletę
            </label>
            <input
              type="number"
              value={compositionForm.packagesPerPallet}
              onChange={(e) => setCompositionForm({ ...compositionForm, packagesPerPallet: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="1"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Palet na miejsce paletowe
            </label>
            <input
              type="number"
              value={compositionForm.palletsPerSpace}
              onChange={(e) => setCompositionForm({ ...compositionForm, palletsPerSpace: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="1"
              step="1"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Koszt palety (€)
            </label>
            <input
              type="number"
              value={compositionForm.palletCost}
              onChange={(e) => setCompositionForm({ ...compositionForm, palletCost: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveComposition}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
          >
            {editingComposition ? 'Zapisz zmiany' : 'Dodaj kompozycję'}
          </button>
          {editingComposition && (
            <button
              onClick={handleCancelCompositionEdit}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
            >
              Anuluj
            </button>
          )}
        </div>
      </div>

      {/* Lista kompozycji */}
      <div className="space-y-3">
        <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
          Zdefiniowane kompozycje pakowania
        </h3>

        {compositions.length === 0 ? (
          <p className={themeClasses.text.secondary}>Brak zdefiniowanych kompozycji pakowania</p>
        ) : (
          <div className="space-y-2">
            {compositions.map((comp) => {
              const packagingType = state.packagingTypes.find(t => t.id === comp.packagingTypeId);

              return (
                <div
                  key={comp.id}
                  className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium ${themeClasses.text.primary}`}>{comp.name}</h4>
                      <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                        Opakowanie: {packagingType?.name || 'NIEZNANE'} (€{packagingType?.cost.toFixed(2)})
                      </p>
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        {comp.packagesPerPallet} opak/pal. | {comp.palletsPerSpace} pal/miejsce | Koszt palety: €{comp.palletCost.toFixed(2)}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        Cena kompozycji: €{comp.compositionCost.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditComposition(comp)}
                        className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
                        title="Edytuj"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteComposition(comp.id)}
                        className={`p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600`}
                        title="Usuń"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
