import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Download, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useMaterial, materialUtils } from '../../context/MaterialContext';

/**
 * Główny komponent zarządzania materiałami
 */
export function MaterialManager({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state, actions } = useMaterial();
  const [activeTab, setActiveTab] = useState('types'); // 'types' or 'compositions'
  const [editingType, setEditingType] = useState(null);
  const [editingComposition, setEditingComposition] = useState(null);
  const [showBulkHelper, setShowBulkHelper] = useState(false);

  // Formularz typu materiału
  const [typeForm, setTypeForm] = useState({
    name: '',
    pricePerKg: '',
    color: '#3B82F6'
  });

  // Formularz kompozycji materiału
  const [compositionForm, setCompositionForm] = useState({
    materialTypeId: '',
    thickness: '',
    density: '',
    name: '' // opcjonalna nazwa własna
  });

  // Formularz masowego tworzenia
  const [bulkForm, setBulkForm] = useState({
    materialTypeId: '',
    thicknesses: '', // po przecinku: 6, 10, 13
    densities: ''    // po przecinku: 150, 200, 250
  });

  // Dodaj/edytuj typ materiału
  const handleSaveType = () => {
    if (!typeForm.name || !typeForm.pricePerKg) {
      alert('Wypełnij wszystkie pola');
      return;
    }

    const materialType = {
      name: typeForm.name,
      pricePerKg: parseFloat(typeForm.pricePerKg),
      color: typeForm.color
    };

    if (editingType) {
      actions.updateMaterialType(editingType.id, materialType);
    } else {
      actions.addMaterialType(materialType);
    }

    // Reset formularza
    setTypeForm({ name: '', pricePerKg: '', color: '#3B82F6' });
    setEditingType(null);
  };

  // Rozpocznij edycję typu
  const handleEditType = (type) => {
    setEditingType(type);
    setTypeForm({
      name: type.name,
      pricePerKg: type.pricePerKg.toString(),
      color: type.color
    });
  };

  // Usuń typ materiału
  const handleDeleteType = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten typ materiału?')) {
      actions.removeMaterialType(id);
    }
  };

  // Anuluj edycję typu
  const handleCancelTypeEdit = () => {
    setEditingType(null);
    setTypeForm({ name: '', pricePerKg: '', color: '#3B82F6' });
  };

  // Dodaj/edytuj kompozycję
  const handleSaveComposition = () => {
    if (!compositionForm.materialTypeId || !compositionForm.thickness || !compositionForm.density) {
      alert('Wypełnij wszystkie wymagane pola (typ materiału, grubość, gęstość)');
      return;
    }

    const composition = {
      materialTypeId: parseInt(compositionForm.materialTypeId),
      thickness: parseFloat(compositionForm.thickness),
      density: parseFloat(compositionForm.density),
      name: compositionForm.name.trim()
    };

    if (editingComposition) {
      actions.updateMaterialComposition(editingComposition.id, composition);
    } else {
      actions.addMaterialComposition(composition);
    }

    // Reset formularza
    setCompositionForm({ materialTypeId: '', thickness: '', density: '', name: '' });
    setEditingComposition(null);
  };

  // Rozpocznij edycję kompozycji
  const handleEditComposition = (comp) => {
    setEditingComposition(comp);
    setCompositionForm({
      materialTypeId: comp.materialTypeId.toString(),
      thickness: comp.thickness.toString(),
      density: comp.density.toString(),
      name: comp.name || ''
    });
  };

  // Usuń kompozycję
  const handleDeleteComposition = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę kompozycję materiału?')) {
      actions.removeMaterialComposition(id);
    }
  };

  // Anuluj edycję kompozycji
  const handleCancelCompositionEdit = () => {
    setEditingComposition(null);
    setCompositionForm({ materialTypeId: '', thickness: '', density: '', name: '' });
  };

  // Masowe tworzenie kombinacji
  const handleBulkCreate = () => {
    if (!bulkForm.materialTypeId || !bulkForm.thicknesses || !bulkForm.densities) {
      alert('Wypełnij wszystkie pola (typ materiału, grubości, gęstości)');
      return;
    }

    // Parsuj grubości i gęstości
    const thicknesses = bulkForm.thicknesses.split(',').map(t => parseFloat(t.trim())).filter(t => !isNaN(t));
    const densities = bulkForm.densities.split(',').map(d => parseFloat(d.trim())).filter(d => !isNaN(d));

    if (thicknesses.length === 0 || densities.length === 0) {
      alert('Nieprawidłowy format grubości lub gęstości. Użyj formatu: 6, 10, 13');
      return;
    }

    // Sprawdź duplikaty i usuń stare przed dodaniem nowych
    const materialTypeId = parseInt(bulkForm.materialTypeId);
    let createdCount = 0;
    let updatedCount = 0;

    thicknesses.forEach(thickness => {
      densities.forEach(density => {
        // Szukaj istniejącej kompozycji z tymi samymi parametrami
        const existingComposition = state.materialCompositions.find(
          comp => comp.materialTypeId === materialTypeId &&
                  comp.thickness === thickness &&
                  comp.density === density
        );

        if (existingComposition) {
          // Duplikat - usuń stary
          actions.removeMaterialComposition(existingComposition.id);
          updatedCount++;
        }

        // Dodaj nową kompozycję
        const composition = {
          materialTypeId,
          thickness,
          density,
          name: '' // auto-generowana nazwa
        };
        actions.addMaterialComposition(composition);
        createdCount++;
      });
    });

    const message = updatedCount > 0
      ? `Utworzono ${createdCount} kombinacji (${updatedCount} nadpisano duplikaty)`
      : `Utworzono ${createdCount} kombinacji`;
    alert(message);

    // NIE resetuj thicknesses i densities, tylko wyczyść materialTypeId
    setBulkForm({ ...bulkForm, materialTypeId: '' });
  };

  // Eksport do JSON
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      materialTypes: state.materialTypes,
      materialCompositions: state.materialCompositions
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `materialy_${new Date().toISOString().split('T')[0]}.json`;
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
              <Layers className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Zarządzanie materiałami
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Definiuj typy materiałów i warianty grubości
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
              Typy materiałów ({state.materialTypes.length})
            </button>
            <button
              onClick={() => setActiveTab('compositions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'compositions'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : themeClasses.text.secondary
              }`}
            >
              Kombinacje materiałów ({state.materialCompositions.length})
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
                showBulkHelper={showBulkHelper}
                setShowBulkHelper={setShowBulkHelper}
                bulkForm={bulkForm}
                setBulkForm={setBulkForm}
                handleBulkCreate={handleBulkCreate}
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
 * Tab z typami materiałów
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
          {editingType ? 'Edytuj typ materiału' : 'Dodaj nowy typ materiału'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Nazwa materiału
            </label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="np. E-glass"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Cena (€/kg)
            </label>
            <input
              type="number"
              value={typeForm.pricePerKg}
              onChange={(e) => setTypeForm({ ...typeForm, pricePerKg: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Kolor (wizualizacja)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={typeForm.color}
                onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                className="w-16 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={typeForm.color}
                onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                className={`flex-1 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                placeholder="#3B82F6"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveType}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
          >
            {editingType ? 'Zapisz zmiany' : 'Dodaj materiał'}
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
          Zdefiniowane typy materiałów
        </h3>

        {state.materialTypes.length === 0 ? (
          <p className={themeClasses.text.secondary}>Brak zdefiniowanych typów materiałów</p>
        ) : (
          <div className="space-y-2">
            {state.materialTypes.map((type) => (
              <div
                key={type.id}
                className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: type.color }}
                      title={type.color}
                    />
                    <div>
                      <h4 className={`font-medium ${themeClasses.text.primary}`}>{type.name}</h4>
                      <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                        Cena: €{type.pricePerKg.toFixed(2)}/kg
                      </p>
                    </div>
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
 * Tab z kombinacjami materiałów
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
  showBulkHelper,
  setShowBulkHelper,
  bulkForm,
  setBulkForm,
  handleBulkCreate,
  themeClasses,
  darkMode
}) {
  const compositionsWithDetails = materialUtils.getAllCompositionsWithDetails(state);

  return (
    <div className="space-y-6">
      {/* Przycisk szybkiego tworzenia */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowBulkHelper(!showBulkHelper)}
          className={`px-4 py-2 rounded-lg font-medium ${
            showBulkHelper ? themeClasses.button.secondary : themeClasses.button.primary
          } flex items-center gap-2`}
        >
          <Plus size={16} />
          {showBulkHelper ? 'Ukryj masowe tworzenie' : 'Szybkie tworzenie kombinacji'}
        </button>
      </div>

      {/* Helper masowego tworzenia */}
      {showBulkHelper && (
        <div className={`border-2 rounded-lg p-4 ${darkMode ? 'border-blue-600 bg-blue-900/20' : 'border-blue-400 bg-blue-50'}`}>
          <h3 className={`text-lg font-medium mb-3 ${themeClasses.text.primary}`}>
            🚀 Szybkie tworzenie wielu kombinacji
          </h3>
          <p className={`text-sm mb-4 ${themeClasses.text.secondary}`}>
            Utwórz wiele kombinacji jednocześnie. Zostaną utworzone wszystkie możliwe kombinacje grubość × gęstość.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                Typ materiału *
              </label>
              <select
                value={bulkForm.materialTypeId}
                onChange={(e) => setBulkForm({ ...bulkForm, materialTypeId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              >
                <option value="">Wybierz...</option>
                {state.materialTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                Grubości (mm) - po przecinku *
              </label>
              <input
                type="text"
                value={bulkForm.thicknesses}
                onChange={(e) => setBulkForm({ ...bulkForm, thicknesses: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                placeholder="6, 10, 13, 20, 25"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                Gęstości (kg/m³) - po przecinku *
              </label>
              <input
                type="text"
                value={bulkForm.densities}
                onChange={(e) => setBulkForm({ ...bulkForm, densities: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                placeholder="150, 200, 250"
              />
            </div>
          </div>

          {/* Podgląd liczby kombinacji */}
          {bulkForm.thicknesses && bulkForm.densities && (
            <div className={`mt-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Liczba kombinacji do utworzenia:{' '}
                <span className="font-semibold">
                  {bulkForm.thicknesses.split(',').filter(t => t.trim()).length} grubości ×{' '}
                  {bulkForm.densities.split(',').filter(d => d.trim()).length} gęstości ={' '}
                  {bulkForm.thicknesses.split(',').filter(t => t.trim()).length *
                   bulkForm.densities.split(',').filter(d => d.trim()).length} kombinacji
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleBulkCreate}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
            >
              Utwórz wszystkie kombinacje
            </button>
            <button
              onClick={() => {
                setBulkForm({ materialTypeId: '', thicknesses: '', densities: '' });
                setShowBulkHelper(false);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Formularz dodawania/edycji */}
      <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className={`text-lg font-medium mb-4 ${themeClasses.text.primary}`}>
          {editingComposition ? 'Edytuj kombinację materiału' : 'Dodaj nową kombinację materiału'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Typ materiału *
            </label>
            <select
              value={compositionForm.materialTypeId}
              onChange={(e) => setCompositionForm({ ...compositionForm, materialTypeId: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
            >
              <option value="">Wybierz...</option>
              {state.materialTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Grubość (mm) *
            </label>
            <input
              type="number"
              value={compositionForm.thickness}
              onChange={(e) => setCompositionForm({ ...compositionForm, thickness: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="0.1"
              placeholder="6"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Gęstość (kg/m³) *
            </label>
            <input
              type="number"
              value={compositionForm.density}
              onChange={(e) => setCompositionForm({ ...compositionForm, density: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="1"
              placeholder="150"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Ciężar pow. (g/m²)
            </label>
            <input
              type="number"
              value={compositionForm.thickness && compositionForm.density ?
                materialUtils.calculateSurfaceWeight(parseFloat(compositionForm.density), parseFloat(compositionForm.thickness)).toFixed(1) :
                ''}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input} bg-gray-100 dark:bg-gray-700`}
              disabled
              placeholder="Auto"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Nazwa własna (opcja)
            </label>
            <input
              type="text"
              value={compositionForm.name}
              onChange={(e) => setCompositionForm({ ...compositionForm, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              placeholder="np. Standard"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveComposition}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
          >
            {editingComposition ? 'Zapisz zmiany' : 'Dodaj kombinację'}
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

      {/* Lista kombinacji */}
      <div className="space-y-3">
        <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
          Zdefiniowane kombinacje materiałów
        </h3>

        {compositionsWithDetails.length === 0 ? (
          <p className={themeClasses.text.secondary}>Brak zdefiniowanych kombinacji materiałów</p>
        ) : (
          <div className="space-y-2">
            {compositionsWithDetails.map((comp) => (
              <div
                key={comp.id}
                className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: comp.color }}
                      title={comp.materialType.name}
                    />
                    <div>
                      <h4 className={`font-medium ${themeClasses.text.primary}`}>
                        {comp.displayName}
                      </h4>
                      <p className={`text-sm ${themeClasses.text.secondary} mt-1`}>
                        Grubość: {comp.thickness}mm | Gęstość: {comp.density} kg/m³ | Ciężar pow.: {comp.surfaceWeight.toFixed(1)} g/m²
                      </p>
                      <p className={`text-sm ${themeClasses.text.secondary}`}>
                        Cena: {comp.pricePerKg.toFixed(2)} €/kg
                      </p>
                    </div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
