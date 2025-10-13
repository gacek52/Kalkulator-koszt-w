import React, { useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useMaterial, materialUtils } from '../../context/MaterialContext';
import { useWorkstation } from '../../context/WorkstationContext';

/**
 * Pola wejściowe dla trybu kalkulacji MULTILAYER
 * Wielowarstwowe produkty z wieloma materiałami
 */
export function MultilayerModeFields({ item, tab, onUpdate, themeClasses, darkMode }) {
  const [expandedLayers, setExpandedLayers] = React.useState({});
  const [selectedMaterialTypes, setSelectedMaterialTypes] = React.useState({});
  const { state: materialState } = useMaterial();
  const { state: workstationState } = useWorkstation();

  const multilayer = item.multilayer || {
    layers: [
      {
        id: 1,
        name: 'Warstwa 1',
        thickness: '',
        density: '',
        priceUnit: 'kg',
        price: '',
        surfaceNettoInput: '',
        surfaceUnit: 'mm2',
        surfaceNetto: '',
        // Parametry arkusza
        sheetLength: '',
        sheetWidth: '',
        partsPerSheet: '',
        surfaceBrutto: '',
        weightNetto: '',
        weightBrutto: '',
        curveScope: 'global', // 'global' lub 'layer'
        customCurveValues: {} // wartości krzywych per-warstwa
      }
    ],
    nextLayerId: 2
  };

  // Auto-obliczanie powierzchni i wag dla każdej warstwy osobno
  useEffect(() => {
    let hasUpdates = false;
    const updatedLayers = multilayer.layers.map(layer => {
      const inputValue = parseFloat(layer.surfaceNettoInput) || 0;
      if (inputValue === 0) return layer;

      const unit = layer.surfaceUnit || 'mm2';
      let surfaceM2 = inputValue;
      if (unit === 'mm2') {
        surfaceM2 = inputValue / 1000000;
      }

      const thickness = parseFloat(layer.thickness) || 0;
      const density = parseFloat(layer.density) || 0;

      // Powierzchnia netto
      const surfaceNetto = surfaceM2;

      // Powierzchnia brutto z parametrów arkusza
      let surfaceBrutto = surfaceNetto;
      const sheetLength = parseFloat(layer.sheetLength) || 0;
      const sheetWidth = parseFloat(layer.sheetWidth) || 0;
      const partsPerSheet = parseFloat(layer.partsPerSheet) || 1;

      if (sheetLength > 0 && sheetWidth > 0 && partsPerSheet > 0) {
        const sheetSurfaceM2 = (sheetLength * sheetWidth) / 1000000; // mm² -> m²
        surfaceBrutto = sheetSurfaceM2 / partsPerSheet; // powierzchnia brutto dla pojedynczej części
      }

      // Waga tylko jeśli są grubość i gęstość
      let weightNetto = 0;
      let weightBrutto = 0;
      if (thickness > 0 && density > 0) {
        weightNetto = surfaceNetto * thickness * density;
        weightBrutto = surfaceBrutto * thickness * density;
      }

      hasUpdates = true;

      return {
        ...layer,
        surfaceNetto: surfaceNetto.toFixed(6),
        surfaceBrutto: surfaceBrutto.toFixed(6),
        weightNetto: weightNetto > 0 ? weightNetto.toFixed(1) : '',
        weightBrutto: weightBrutto > 0 ? weightBrutto.toFixed(1) : ''
      };
    });

    if (hasUpdates) {
      onUpdate({
        multilayer: {
          ...multilayer,
          layers: updatedLayers
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(multilayer.layers.map(l => ({
      surfaceNettoInput: l.surfaceNettoInput,
      surfaceUnit: l.surfaceUnit,
      thickness: l.thickness,
      density: l.density,
      sheetLength: l.sheetLength,
      sheetWidth: l.sheetWidth,
      partsPerSheet: l.partsPerSheet
    })))
  ]);

  const addLayer = () => {
    const newLayer = {
      id: multilayer.nextLayerId,
      name: `Warstwa ${multilayer.nextLayerId}`,
      thickness: '',
      density: '',
      priceUnit: 'kg',
      price: '',
      surfaceNettoInput: '',
      surfaceUnit: 'mm2',
      surfaceNetto: '',
      sheetLength: '',
      sheetWidth: '',
      partsPerSheet: '',
      surfaceBrutto: '',
      weightNetto: '',
      weightBrutto: '',
      curveScope: 'global',
      customCurveValues: {}
    };

    // Automatycznie rozwiń nowo dodaną warstwę
    setExpandedLayers(prev => ({
      ...prev,
      [multilayer.nextLayerId]: true
    }));

    onUpdate({
      multilayer: {
        ...multilayer,
        layers: [...multilayer.layers, newLayer],
        nextLayerId: multilayer.nextLayerId + 1
      }
    });
  };

  const removeLayer = (layerId) => {
    if (multilayer.layers.length <= 1) return;

    onUpdate({
      multilayer: {
        ...multilayer,
        layers: multilayer.layers.filter(l => l.id !== layerId)
      }
    });
  };

  const duplicateLayer = (layerId) => {
    const layerToDuplicate = multilayer.layers.find(l => l.id === layerId);
    if (!layerToDuplicate) return;

    const duplicatedLayer = {
      ...layerToDuplicate,
      id: multilayer.nextLayerId,
      name: `${layerToDuplicate.name} (kopia)`
    };

    onUpdate({
      multilayer: {
        ...multilayer,
        layers: [...multilayer.layers, duplicatedLayer],
        nextLayerId: multilayer.nextLayerId + 1
      }
    });
  };

  const updateLayer = (layerId, updates) => {
    onUpdate({
      multilayer: {
        ...multilayer,
        layers: multilayer.layers.map(l =>
          l.id === layerId ? { ...l, ...updates } : l
        )
      }
    });
  };

  const toggleLayer = (layerId) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  };

  const handleLayerMaterialSelect = (layerId, compositionId) => {
    if (!compositionId) return;

    const composition = materialUtils.getCompositionWithDetails(materialState, parseInt(compositionId));
    if (composition) {
      updateLayer(layerId, {
        selectedMaterialCompositionId: composition.id,
        thickness: composition.thickness.toString(),
        density: composition.density.toString(),
        price: composition.pricePerKg.toString(),
        priceUnit: 'kg'
      });
    }
  };

  const handleMaterialTypeChange = (layerId, materialTypeId) => {
    setSelectedMaterialTypes(prev => ({
      ...prev,
      [layerId]: materialTypeId
    }));
  };

  return (
    <div className="space-y-4">
      {/* Warstwy materiałów */}
      <div className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">📚 Warstwy materiałów</div>
          <button
            onClick={addLayer}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <Plus size={14} />
            Dodaj warstwę
          </button>
        </div>

        <div className="space-y-2">
          {multilayer.layers.map((layer, index) => (
            <div
              key={layer.id}
              className={`border rounded ${darkMode ? 'border-gray-600 bg-gray-900/30' : 'border-gray-300 bg-white'}`}
            >
              {/* Header warstwy */}
              <div
                className={`flex items-center justify-between p-2 cursor-pointer ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
                onClick={() => toggleLayer(layer.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedLayers[layer.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span className="text-sm font-medium">
                    {layer.name}
                  </span>
                  <span className={`text-xs ${themeClasses.text.secondary}`}>
                    ({layer.weightNetto ? `${parseFloat(layer.weightNetto).toFixed(0)}g` : 'nie obliczono'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateLayer(layer.id);
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Powiel warstwę"
                  >
                    <Copy size={14} />
                  </button>
                  {multilayer.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(layer.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Usuń warstwę"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Zawartość warstwy */}
              {expandedLayers[layer.id] && (
                <div className="p-3 border-t space-y-3">
                  {/* Nazwa warstwy */}
                  <div>
                    <label className={`block text-xs ${themeClasses.text.secondary}`}>
                      Nazwa warstwy
                    </label>
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      placeholder={`Warstwa ${index + 1}`}
                    />
                  </div>

                  {/* Wybór materiału dla warstwy */}
                  <div className={`p-3 rounded border ${darkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                    <div className={`text-xs font-medium mb-2 ${themeClasses.text.primary}`}>
                      🎯 Wybór materiału (opcjonalnie)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs ${themeClasses.text.secondary}`}>
                          Typ materiału
                        </label>
                        <select
                          value={selectedMaterialTypes[layer.id] || ''}
                          onChange={(e) => handleMaterialTypeChange(layer.id, e.target.value)}
                          className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        >
                          <option value="">-- Wybierz typ --</option>
                          {materialState.materialTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.name} ({type.pricePerKg.toFixed(2)} €/kg)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs ${themeClasses.text.secondary}`}>
                          Wariant (grubość × gęstość)
                        </label>
                        <select
                          value={layer.selectedMaterialCompositionId || ''}
                          onChange={(e) => handleLayerMaterialSelect(layer.id, e.target.value)}
                          disabled={!selectedMaterialTypes[layer.id]}
                          className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        >
                          <option value="">-- Wybierz wariant --</option>
                          {selectedMaterialTypes[layer.id] &&
                            materialUtils.getCompositionsByType(materialState, parseInt(selectedMaterialTypes[layer.id])).map(comp => (
                              <option key={comp.id} value={comp.id}>
                                {comp.thickness}mm × {comp.density} kg/m³ = {comp.surfaceWeight.toFixed(1)} g/m²
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Powierzchnia warstwy (z CAD/3D) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Powierzchnia (z CAD/3D)
                      </label>
                      <input
                        type="number"
                        value={layer.surfaceNettoInput || ''}
                        onChange={(e) => updateLayer(layer.id, { surfaceNettoInput: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Jednostka
                      </label>
                      <select
                        value={layer.surfaceUnit || 'mm2'}
                        onChange={(e) => updateLayer(layer.id, { surfaceUnit: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      >
                        <option value="mm2">mm²</option>
                        <option value="m2">m²</option>
                      </select>
                    </div>
                  </div>

                  {/* Parametry arkusza */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Długość arkusza [mm]
                      </label>
                      <input
                        type="number"
                        value={layer.sheetLength || ''}
                        onChange={(e) => updateLayer(layer.id, { sheetLength: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Szerokość arkusza [mm]
                      </label>
                      <input
                        type="number"
                        value={layer.sheetWidth || ''}
                        onChange={(e) => updateLayer(layer.id, { sheetWidth: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="0"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Detali na arkusz
                      </label>
                      <input
                        type="number"
                        value={layer.partsPerSheet || ''}
                        onChange={(e) => updateLayer(layer.id, { partsPerSheet: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="1"
                        step="1"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className={`text-xs ${themeClasses.text.secondary}`}>
                    Materiał brutto dla 1 detalu = (długość × szerokość) / ilość detali
                  </div>

                  {/* Parametry materiału */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Grubość [mm]
                      </label>
                      <input
                        type="number"
                        value={layer.thickness || ''}
                        onChange={(e) => updateLayer(layer.id, { thickness: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs ${themeClasses.text.secondary}`}>
                        Gęstość [kg/m³]
                      </label>
                      <input
                        type="number"
                        value={layer.density || ''}
                        onChange={(e) => updateLayer(layer.id, { density: e.target.value })}
                        className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                        placeholder="0"
                        step="1"
                      />
                    </div>
                  </div>

                  {/* Cena materiału */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className={`text-xs ${themeClasses.text.secondary}`}>
                        Cena materiału (€/{layer.priceUnit || 'kg'})
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateLayer(layer.id, { priceUnit: 'kg' })}
                          className={`px-2 py-0.5 text-xs rounded ${
                            layer.priceUnit === 'kg' || !layer.priceUnit
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          €/kg
                        </button>
                        <button
                          onClick={() => updateLayer(layer.id, { priceUnit: 'm2' })}
                          className={`px-2 py-0.5 text-xs rounded ${
                            layer.priceUnit === 'm2'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          €/m²
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={layer.price || ''}
                      onChange={(e) => updateLayer(layer.id, { price: e.target.value })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      placeholder="0"
                      step="0.01"
                    />
                  </div>

                  {/* Zakres krzywych */}
                  <div>
                    <label className={`block text-xs mb-1 ${themeClasses.text.secondary}`}>
                      Krzywe procesów
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateLayer(layer.id, { curveScope: 'global' })}
                        className={`flex-1 px-2 py-1 text-xs rounded ${
                          layer.curveScope === 'global'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Globalne
                      </button>
                      <button
                        onClick={() => updateLayer(layer.id, { curveScope: 'layer' })}
                        className={`flex-1 px-2 py-1 text-xs rounded ${
                          layer.curveScope === 'layer'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Per-warstwa
                      </button>
                    </div>
                    <div className={`text-xs mt-1 ${themeClasses.text.secondary}`}>
                      {layer.curveScope === 'global'
                        ? 'Używa globalnych krzywych z zakładki'
                        : 'Używa krzywych przypisanych do tej warstwy'}
                    </div>
                  </div>

                  {/* Krzywe niestandardowe per-warstwa */}
                  {layer.curveScope === 'layer' && tab.customCurves && tab.customCurves.length > 0 && (
                    <div className="space-y-2">
                      <h4 className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                        Krzywe niestandardowe (per warstwa)
                      </h4>
                      {tab.customCurves.map((curve) => {
                        const inputMode = curve.inputMode || 'x';
                        const curveValues = layer.customCurveValues?.[curve.id] || {};
                        const dataSource = curveValues.source || 'manual';

                        const inputLabel = inputMode === 'x'
                          ? `Wartość X (${curve.xUnit})`
                          : `Wartość Y (${curve.yUnit})`;
                        const outputUnit = inputMode === 'x' ? curve.yUnit : curve.xUnit;

                        // Odczytaj wyniki z item.results
                        const layerResults = item.results?.layerCurveCosts?.[layer.id]?.[curve.id];
                        const outputValue = inputMode === 'x' ? layerResults?.interpolatedY : layerResults?.interpolatedX;
                        const cost = layerResults?.cost;

                        return (
                          <div key={curve.id} className={`p-3 rounded border ${darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="text-sm font-medium mb-2">{curve.name}</div>
                            <div className="grid grid-cols-3 gap-2">
                              {/* Dropdown źródła danych */}
                              <div>
                                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                                  Źródło danych
                                </label>
                                <select
                                  value={dataSource}
                                  onChange={(e) => {
                                    const newCustomCurveValues = {
                                      ...(layer.customCurveValues || {}),
                                      [curve.id]: {
                                        ...curveValues,
                                        source: e.target.value
                                      }
                                    };
                                    updateLayer(layer.id, { customCurveValues: newCustomCurveValues });
                                  }}
                                  className={`w-full px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                                >
                                  <option value="manual">Ręczne</option>
                                  <option value="weightNetto">Waga netto</option>
                                  <option value="weightBrutto">Waga brutto</option>
                                  <option value="surfaceNetto">Powierzchnia netto</option>
                                  <option value="surfaceBrutto">Powierzchnia brutto</option>
                                </select>
                              </div>

                              {/* Pole input - disabled jeśli automatyczne */}
                              <div>
                                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                                  {inputLabel}
                                </label>
                                {dataSource === 'manual' ? (
                                  <input
                                    type="number"
                                    value={curveValues.input || ''}
                                    onChange={(e) => {
                                      const newCustomCurveValues = {
                                        ...(layer.customCurveValues || {}),
                                        [curve.id]: {
                                          ...curveValues,
                                          input: e.target.value
                                        }
                                      };
                                      updateLayer(layer.id, { customCurveValues: newCustomCurveValues });
                                    }}
                                    className={`w-full px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                                    step="0.1"
                                    placeholder="0"
                                  />
                                ) : (
                                  <div className={`w-full px-2 py-1 text-xs border rounded bg-gray-100 dark:bg-gray-700 ${themeClasses.text.secondary} flex items-center`}>
                                    <span className="text-green-600 mr-1">✓</span> Auto
                                  </div>
                                )}
                              </div>

                              {/* Wynik */}
                              <div>
                                <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                                  Wynik
                                </label>
                                <div className={`px-2 py-1 text-xs ${themeClasses.text.secondary}`}>
                                  {outputValue
                                    ? `${outputValue.toFixed(2)} ${outputUnit}`
                                    : '-'}
                                  <br />
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {cost
                                      ? `${cost.toFixed(3)} €`
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Podsumowanie warstwy */}
                  <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className={themeClasses.text.secondary}>Powierzchnia netto:</span>
                          <span className="ml-1 font-mono">
                            {layer.surfaceNetto ? `${parseFloat(layer.surfaceNetto).toFixed(4)} m²` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className={themeClasses.text.secondary}>Powierzchnia brutto:</span>
                          <span className="ml-1 font-mono">
                            {layer.surfaceBrutto ? `${parseFloat(layer.surfaceBrutto).toFixed(4)} m²` : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className={themeClasses.text.secondary}>Waga netto:</span>
                          <span className="ml-1 font-mono">
                            {layer.weightNetto ? `${parseFloat(layer.weightNetto).toFixed(0)} g` : '-'}
                          </span>
                        </div>
                        <div>
                          <span className={themeClasses.text.secondary}>Waga brutto:</span>
                          <span className="ml-1 font-mono">
                            {layer.weightBrutto ? `${parseFloat(layer.weightBrutto).toFixed(0)} g` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Podsumowanie całkowite */}
      {multilayer.layers.length > 0 && (
        <div className={`p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
          <div className="text-xs font-medium mb-2">📊 Podsumowanie</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className={themeClasses.text.secondary}>Liczba warstw:</span>
              <span className="ml-1 font-semibold">{multilayer.layers.length}</span>
            </div>
            <div>
              <span className={themeClasses.text.secondary}>Całkowita waga:</span>
              <span className="ml-1 font-mono font-semibold">
                {multilayer.layers
                  .reduce((sum, l) => sum + (parseFloat(l.weightNetto) || 0), 0)
                  .toFixed(0)} g
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stanowisko produkcyjne */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
        <div className={`text-sm font-medium mb-3 ${themeClasses.text.primary}`}>
          🏭 Stanowisko produkcyjne
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Stanowisko
            </label>
            <select
              value={item.workstation?.id || ''}
              onChange={(e) => onUpdate({
                workstation: {
                  ...item.workstation,
                  id: e.target.value ? parseInt(e.target.value) : null
                }
              })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
            >
              <option value="">-- Wybierz stanowisko --</option>
              {workstationState.workstations.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
              Wydajność (szt/8h)
            </label>
            <input
              type="number"
              value={item.workstation?.efficiency || ''}
              onChange={(e) => onUpdate({
                workstation: {
                  ...item.workstation,
                  efficiency: e.target.value
                }
              })}
              className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              min="0"
              step="1"
              placeholder="np. 100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
