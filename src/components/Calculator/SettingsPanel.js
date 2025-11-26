import React, { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2, Save } from 'lucide-react';
import { EditableCurve } from '../Graphs/EditableCurve';
import { useCurvePresets } from '../../context/CurvePresetContext';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { useDynamicCurves } from '../../hooks/useDynamicCurves';

/**
 * Panel ustawień z edycją krzywych i procesów
 */
export function SettingsPanel({ tab, tabId, themeClasses, darkMode, actions, onClose }) {
  const [activeSection, setActiveSection] = useState('curves'); // 'curves' | 'customCurves'
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [makeGlobal, setMakeGlobal] = useState(false);
  // Użyj curvePresetId z zakładki jako początkowej wartości
  const [selectedPresetId, setSelectedPresetId] = useState(tab.curvePresetId || 'custom');

  const { presets, actions: presetActions, loading } = useCurvePresets();
  const { isAdminOrSuper } = useRole();

  // DYNAMICZNE ŁADOWANIE KRZYWYCH z presetu
  // Zamiast używać tab.editingCurves bezpośrednio, ładujemy krzywe z presetu
  const { editingCurves, customCurves } = useDynamicCurves(
    tab.curvePresetId,
    tab.editingCurves, // fallback dla starych kalkulacji
    tab.customCurves   // fallback dla starych kalkulacji
  );

  // Funkcja porównująca krzywe (deep equality)
  const compareCurves = (curves1, curves2) => {
    return JSON.stringify(curves1) === JSON.stringify(curves2);
  };

  // Synchronizuj selectedPresetId ze stanem zakładki
  useEffect(() => {
    if (tab.curvePresetId !== selectedPresetId) {
      setSelectedPresetId(tab.curvePresetId || 'custom');
    }
  }, [tab.curvePresetId]);

  // Obsługa aktualizacji krzywej pieczenia
  const handleBakingCurveUpdate = async (newCurveData) => {
    const newBakingCurve = newCurveData.map(point => ({ x: point.x, y: point.y }));

    // Jeśli mamy wybrany preset, aktualizuj go
    if (tab.curvePresetId && tab.curvePresetId !== 'custom') {
      try {
        const preset = presetActions.getById(tab.curvePresetId);
        if (preset) {
          await presetActions.update(tab.curvePresetId, {
            curves: {
              ...preset.curves,
              editingCurves: {
                ...preset.curves.editingCurves,
                baking: newBakingCurve
              }
            }
          });
          // Preset został zaktualizowany - useDynamicCurves automatycznie pobierze nowe dane
        }
      } catch (error) {
        console.error('Error updating preset:', error);
        alert('Błąd podczas aktualizacji presetu: ' + error.message);
      }
    } else {
      // Brak presetu - zaktualizuj lokalne krzywe (stary sposób, kompatybilność wsteczna)
      const updates = {
        editingCurves: {
          ...editingCurves,
          baking: newBakingCurve
        }
      };

      const updatedItems = tab.items.map(item => {
        if (item.weight) {
          const results = calculateItemCost(item, { ...tab, editingCurves: updates.editingCurves });
          return { ...item, results };
        }
        return item;
      });

      actions.updateTab(tabId, { ...updates, items: updatedItems });
    }
  };

  // Obsługa aktualizacji krzywej czyszczenia
  const handleCleaningCurveUpdate = async (newCurveData) => {
    const newCleaningCurve = newCurveData.map(point => ({ x: point.x, y: point.y }));

    // Jeśli mamy wybrany preset, aktualizuj go
    if (tab.curvePresetId && tab.curvePresetId !== 'custom') {
      try {
        const preset = presetActions.getById(tab.curvePresetId);
        if (preset) {
          await presetActions.update(tab.curvePresetId, {
            curves: {
              ...preset.curves,
              editingCurves: {
                ...preset.curves.editingCurves,
                cleaning: newCleaningCurve
              }
            }
          });
        }
      } catch (error) {
        console.error('Error updating preset:', error);
        alert('Błąd podczas aktualizacji presetu: ' + error.message);
      }
    } else {
      // Brak presetu - zaktualizuj lokalne krzywe
      const updates = {
        editingCurves: {
          ...editingCurves,
          cleaning: newCleaningCurve
        }
      };

      const updatedItems = tab.items.map(item => {
        if (item.weight) {
          const results = calculateItemCost(item, { ...tab, editingCurves: updates.editingCurves });
          return { ...item, results };
        }
        return item;
      });

      actions.updateTab(tabId, { ...updates, items: updatedItems });
    }
  };

  // Funkcja kalkulacji kosztów (uproszczona wersja)
  const calculateItemCost = (item, tabData) => {
    const weight = parseFloat(item.weight) || 0;
    if (weight === 0) return null;

    const materialCost = parseFloat(tabData.materialCost) || 0;
    const bakingCost = parseFloat(tabData.bakingCost) || 0;
    const cleaningCost = parseFloat(tabData.cleaningCost) || 0;
    const handlingCost = parseFloat(tabData.handlingCost) || 0;

    const materialCost_total = (weight / 1000) * materialCost;
    const bakingTime = interpolateFromCurve(weight, tabData.editingCurves.baking);
    const bakingCost_total = (bakingTime / 3600) * (bakingCost / 8);

    let cleaningCost_total = 0;
    if (item.cleaningOption === 'scaled') {
      const cleaningTime = interpolateFromCurve(weight, tabData.editingCurves.cleaning);
      cleaningCost_total = (cleaningTime / 3600) * (cleaningCost / 8);
    } else {
      const manualTime = parseFloat(item.manualCleaningTime) || 0;
      cleaningCost_total = (manualTime / 3600) * (cleaningCost / 8);
    }

    const handlingCost_total = handlingCost;

    let customProcessesCost = 0;
    tabData.customProcesses.forEach(process => {
      const processValue = parseFloat(item.customValues[process.id]) || 0;
      const processCost = parseFloat(process.cost) || 0;
      const efficiency = parseFloat(process.efficiency) || 1;

      switch (process.unit) {
        case 'euro/szt':
          customProcessesCost += processCost * efficiency;
          break;
        case 'euro/kg':
          customProcessesCost += processCost * (weight / 1000) * efficiency;
          break;
        case 'euro/8h':
          // Dla euro/8h: efficiency = ile części na zmianę, więc koszt = processCost / efficiency
          if (efficiency > 0) {
            customProcessesCost += processCost / efficiency;
          }
          break;
        default:
          customProcessesCost += processCost * efficiency;
          break;
      }
    });

    const totalCost = materialCost_total + bakingCost_total + cleaningCost_total + handlingCost_total + customProcessesCost;
    const margin = parseFloat(item.margin) || 0;
    const totalWithMargin = totalCost * (1 + margin / 100);

    return {
      materialCost: materialCost_total,
      bakingCost: bakingCost_total,
      cleaningCost: cleaningCost_total,
      handlingCost: handlingCost_total,
      customProcessesCost,
      totalCost,
      totalWithMargin,
      bakingTime,
      cleaningTime: item.cleaningOption === 'scaled'
        ? interpolateFromCurve(weight, tabData.editingCurves.cleaning)
        : parseFloat(item.manualCleaningTime) || 0
    };
  };

  const interpolateFromCurve = (weight, curve) => {
    if (!curve || curve.length === 0) return 0;

    const sortedCurve = [...curve].sort((a, b) => a.x - b.x);

    if (weight <= sortedCurve[0].x) return sortedCurve[0].y;
    if (weight >= sortedCurve[sortedCurve.length - 1].x) return sortedCurve[sortedCurve.length - 1].y;

    for (let i = 0; i < sortedCurve.length - 1; i++) {
      if (weight >= sortedCurve[i].x && weight <= sortedCurve[i + 1].x) {
        const x1 = sortedCurve[i].x;
        const y1 = sortedCurve[i].y;
        const x2 = sortedCurve[i + 1].x;
        const y2 = sortedCurve[i + 1].y;

        const t = (weight - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
      }
    }

    return 0;
  };

  // Handler do wczytania presetu
  const handleLoadPreset = async (presetId) => {
    if (presetId === 'custom') {
      // Wyłącz preset - ustaw curvePresetId na null
      actions.updateTab(tabId, { curvePresetId: null });
      setSelectedPresetId('custom');
      return;
    }

    const preset = presetActions.getById(presetId);
    if (!preset || !preset.curves) {
      alert('Nie znaleziono presetu lub preset nie zawiera krzywych');
      return;
    }

    // KLUCZOWA ZMIANA: Ustaw curvePresetId zamiast kopiować krzywe
    // useDynamicCurves hook automatycznie załaduje krzywe z presetu
    actions.updateTab(tabId, { curvePresetId: presetId });
    setSelectedPresetId(presetId);
  };

  // Handler do zapisania presetu
  const handleSavePreset = () => {
    setShowSavePresetModal(true);
  };

  // Handler do potwierdzenia zapisu presetu
  const handleSavePresetConfirm = async () => {
    if (!presetName.trim()) {
      alert('Wprowadź nazwę presetu');
      return;
    }

    try {
      const presetData = {
        name: presetName.trim(),
        description: presetDescription.trim(),
        curves: {
          editingCurves: editingCurves, // Użyj dynamicznie załadowanych krzywych
          customCurves: customCurves
        },
        isGlobal: makeGlobal && isAdminOrSuper(),
        isDefault: false // Nowe presety nie są domyślne
      };

      const savedPreset = await presetActions.create(presetData);

      // Po zapisaniu nowego presetu, ustaw go jako aktywny dla tej zakładki
      actions.updateTab(tabId, { curvePresetId: savedPreset.id });
      setSelectedPresetId(savedPreset.id);

      setShowSavePresetModal(false);
      setPresetName('');
      setPresetDescription('');
      setMakeGlobal(false);
    } catch (error) {
      console.error('Error saving preset:', error);
      alert('Błąd podczas zapisywania presetu: ' + error.message);
    }
  };

  // Handler do edycji presetu (nadpisanie)
  const handleEditPreset = async () => {
    if (selectedPresetId === 'custom') {
      alert('Wybierz preset do edycji');
      return;
    }

    const currentPreset = presetActions.getById(selectedPresetId);
    if (!currentPreset) {
      alert('Nie znaleziono presetu');
      return;
    }

    const confirmEdit = window.confirm(`Czy na pewno chcesz nadpisać preset "${currentPreset.name}"?\n\nUWAGA: To zaktualizuje preset dla WSZYSTKICH kalkulacji, które go używają.`);
    if (!confirmEdit) return;

    try {
      const updates = {
        curves: {
          editingCurves: editingCurves, // Użyj dynamicznie załadowanych krzywych
          customCurves: customCurves
        }
      };

      await presetActions.update(selectedPresetId, updates);
      alert('Preset został zaktualizowany. Wszystkie kalkulacje używające tego presetu zostaną automatycznie zaktualizowane.');
    } catch (error) {
      console.error('Error updating preset:', error);
      alert('Błąd podczas aktualizacji presetu: ' + error.message);
    }
  };

  // Handler do usuwania presetu
  const handleDeletePreset = () => {
    if (selectedPresetId === 'custom') {
      alert('Wybierz preset do usunięcia');
      return;
    }

    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  // Handler do potwierdzenia usunięcia presetu
  const handleDeletePresetConfirm = async () => {
    if (deleteConfirmText !== 'TAK') {
      alert('Wpisz "TAK" aby potwierdzić usunięcie');
      return;
    }

    try {
      await presetActions.delete(selectedPresetId);
      setSelectedPresetId('custom');
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      alert('Preset został usunięty');
    } catch (error) {
      console.error('Error deleting preset:', error);
      alert('Błąd podczas usuwania presetu: ' + error.message);
    }
  };

  // Handler do ustawiania presetu jako domyślny
  const handleSetDefault = async () => {
    if (selectedPresetId === 'custom') {
      alert('Wybierz preset aby ustawić go jako domyślny');
      return;
    }

    const currentPreset = presetActions.getById(selectedPresetId);
    if (!currentPreset) {
      alert('Nie znaleziono presetu');
      return;
    }

    try {
      // Odznacz isDefault dla wszystkich innych presetów NAJPIERW
      for (const preset of presets) {
        if (preset.id !== selectedPresetId && preset.isDefault) {
          await presetActions.update(preset.id, { isDefault: false });
        }
      }

      // Ustaw wybrany preset jako domyślny
      await presetActions.update(selectedPresetId, { isDefault: true });

      // Odśwież listę presetów, aby zobaczyć zmiany
      await presetActions.refresh();

      alert(`Preset "${currentPreset.name}" został ustawiony jako domyślny`);
    } catch (error) {
      console.error('Error setting default preset:', error);
      alert('Błąd podczas ustawiania domyślnego presetu: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${themeClasses.card} rounded-lg border max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3 flex-1">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className={`text-xl font-semibold ${themeClasses.text.primary}`}>
              Ustawienia zakładki: {tab.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preset selector */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 space-y-3">
          {/* Pierwszy wiersz: label, select i przycisk Zapisz */}
          <div className="flex items-center gap-3">
            <label className={`text-sm font-medium ${themeClasses.text.secondary} whitespace-nowrap`}>
              Preset krzywych:
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className={`flex-1 px-3 py-2 text-sm border rounded-lg ${themeClasses.input}`}
              disabled={loading}
            >
              <option value="custom">(Niestandardowy)</option>
              {presets && presets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.isDefault ? '⭐ ' : ''}{preset.name} {preset.isGlobal ? '(Globalny)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleSavePreset}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2 whitespace-nowrap`}
              disabled={loading}
              title="Zapisz obecne krzywe jako nowy preset"
            >
              <Save size={16} />
              Zapisz preset
            </button>
          </div>

          {/* Drugi wiersz: przyciski akcji dla wybranego presetu */}
          {selectedPresetId !== 'custom' && (
            <div className="flex items-center gap-2 pl-32">
              <button
                onClick={handleEditPreset}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2 whitespace-nowrap`}
                disabled={loading}
                title="Nadpisz wybrany preset obecnymi krzywymi"
              >
                <Save size={14} />
                Nadpisz
              </button>
              <button
                onClick={handleSetDefault}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2 whitespace-nowrap`}
                disabled={loading}
                title="Ustaw ten preset jako domyślny dla nowych kalkulacji"
              >
                ⭐
                Ustaw jako domyślny
              </button>
              <button
                onClick={handleDeletePreset}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium ${themeClasses.button.danger} text-white flex items-center gap-2 whitespace-nowrap`}
                disabled={loading}
                title="Usuń wybrany preset"
              >
                <Trash2 size={14} />
                Usuń
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-600">
          <button
            onClick={() => setActiveSection('curves')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'curves'
                ? themeClasses.button.primary
                : themeClasses.button.secondary
            }`}
          >
            Krzywe skalowania
          </button>
          <button
            onClick={() => setActiveSection('customCurves')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'customCurves'
                ? themeClasses.button.primary
                : themeClasses.button.secondary
            }`}
          >
            Krzywe niestandardowe
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'curves' && (
            <div className="space-y-8">
              {/* Krzywe dla trybów podstawowych */}
              {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
                <>
                  {/* Krzywa pieczenia */}
                  <EditableCurve
                    curveData={editingCurves.baking.map(point => ({ x: point.x, y: point.y }))}
                    onUpdateCurve={handleBakingCurveUpdate}
                    title="🔥 Krzywa pieczenia"
                    color="#EF4444"
                    themeClasses={themeClasses}
                    darkMode={darkMode}
                    xLabel="Waga (g)"
                    yLabel="Czas (sek)"
                    interpolationType="linear"
                  />

                  {/* Krzywa czyszczenia */}
                  <EditableCurve
                    curveData={editingCurves.cleaning.map(point => ({ x: point.x, y: point.y }))}
                    onUpdateCurve={handleCleaningCurveUpdate}
                    title="🧽 Krzywa czyszczenia"
                    color="#10B981"
                    themeClasses={themeClasses}
                    darkMode={darkMode}
                    xLabel="Waga (g)"
                    yLabel="Czas (sek)"
                    interpolationType="linear"
                  />
                </>
              )}

              {/* Krzywa wagi brutto - tylko dla trybów podstawowych */}
              {tab.calculationType !== 'heatshield' && tab.calculationType !== 'multilayer' && (
                <EditableCurve
                  curveData={editingCurves.bruttoWeight.map(point => ({ x: point.x, y: point.y }))}
                  onUpdateCurve={async (newCurveData) => {
                    const newBruttoCurve = newCurveData.map(point => ({ x: point.x, y: point.y }));

                    // Jeśli mamy wybrany preset, aktualizuj go
                    if (tab.curvePresetId && tab.curvePresetId !== 'custom') {
                      try {
                        const preset = presetActions.getById(tab.curvePresetId);
                        if (preset) {
                          await presetActions.update(tab.curvePresetId, {
                            curves: {
                              ...preset.curves,
                              editingCurves: {
                                ...preset.curves.editingCurves,
                                bruttoWeight: newBruttoCurve
                              }
                            }
                          });
                        }
                      } catch (error) {
                        console.error('Error updating preset:', error);
                        alert('Błąd podczas aktualizacji presetu: ' + error.message);
                      }
                    } else {
                      // Brak presetu - zaktualizuj lokalne krzywe
                      const updates = {
                        editingCurves: {
                          ...editingCurves,
                          bruttoWeight: newBruttoCurve
                        }
                      };
                      const updatedItems = tab.items.map(item => {
                        if (item.weight) {
                          const results = calculateItemCost(item, { ...tab, editingCurves: updates.editingCurves });
                          return { ...item, results };
                        }
                        return item;
                      });
                      actions.updateTab(tabId, { ...updates, items: updatedItems });
                    }
                  }}
                  title="⚖️ Krzywa wagi brutto"
                  color="#F59E0B"
                  themeClasses={themeClasses}
                  darkMode={darkMode}
                  xLabel="Waga netto (g)"
                  yLabel="Waga brutto (g)"
                  interpolationType="linear"
                />
              )}

              {/* Krzywe dla trybu heatshield */}
              {tab.calculationType === 'heatshield' && (
                <>
                  <EditableCurve
                    curveData={(editingCurves.heatshieldPrep || []).map(point => ({ x: point.x, y: point.y }))}
                    onUpdateCurve={async (newCurveData) => {
                      const newPrepCurve = newCurveData.map(point => ({ x: point.x, y: point.y }));

                      if (tab.curvePresetId && tab.curvePresetId !== 'custom') {
                        try {
                          const preset = presetActions.getById(tab.curvePresetId);
                          if (preset) {
                            await presetActions.update(tab.curvePresetId, {
                              curves: {
                                ...preset.curves,
                                editingCurves: {
                                  ...preset.curves.editingCurves,
                                  heatshieldPrep: newPrepCurve
                                }
                              }
                            });
                          }
                        } catch (error) {
                          console.error('Error updating preset:', error);
                          alert('Błąd podczas aktualizacji presetu: ' + error.message);
                        }
                      } else {
                        const updates = {
                          editingCurves: {
                            ...editingCurves,
                            heatshieldPrep: newPrepCurve
                          }
                        };
                        actions.updateTab(tabId, updates);
                      }
                    }}
                    title="🔧 Krzywa przygotówki"
                    color="#F59E0B"
                    themeClasses={themeClasses}
                    darkMode={darkMode}
                    xLabel="Powierzchnia (m²)"
                    yLabel="Czas (sek)"
                    interpolationType="linear"
                  />

                  <EditableCurve
                    curveData={(editingCurves.heatshieldLaser || []).map(point => ({ x: point.x, y: point.y }))}
                    onUpdateCurve={async (newCurveData) => {
                      const newLaserCurve = newCurveData.map(point => ({ x: point.x, y: point.y }));

                      if (tab.curvePresetId && tab.curvePresetId !== 'custom') {
                        try {
                          const preset = presetActions.getById(tab.curvePresetId);
                          if (preset) {
                            await presetActions.update(tab.curvePresetId, {
                              curves: {
                                ...preset.curves,
                                editingCurves: {
                                  ...preset.curves.editingCurves,
                                  heatshieldLaser: newLaserCurve
                                }
                              }
                            });
                          }
                        } catch (error) {
                          console.error('Error updating preset:', error);
                          alert('Błąd podczas aktualizacji presetu: ' + error.message);
                        }
                      } else {
                        const updates = {
                          editingCurves: {
                            ...editingCurves,
                            heatshieldLaser: newLaserCurve
                          }
                        };
                        actions.updateTab(tabId, updates);
                      }
                    }}
                    title="⚡ Krzywa cięcia laserowego"
                    color="#8B5CF6"
                    themeClasses={themeClasses}
                    darkMode={darkMode}
                    xLabel="Powierzchnia (m²)"
                    yLabel="Cena (€)"
                    interpolationType="linear"
                  />
                </>
              )}
            </div>
          )}

          {activeSection === 'customCurves' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                    Krzywe niestandardowe
                  </h3>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Definiuj własne krzywe XY do użycia w kalkulacjach
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newCurve = {
                      name: 'Nowa krzywa',
                      points: [
                        { x: 0, y: 0 },
                        { x: 100, y: 50 },
                        { x: 200, y: 80 }
                      ],
                      xUnit: 'g',
                      yUnit: 'sek',
                      yCost: '50',
                      interpolationType: 'linear',
                      inputMode: 'x', // 'x' lub 'y'
                      autoBindSource: 'manual' // 'manual', 'weight', 'bruttoWeight'
                    };
                    actions.addCustomCurve(tabId, newCurve);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
                >
                  <Plus size={16} />
                  Dodaj krzywą
                </button>
              </div>

              {customCurves && customCurves.length > 0 ? (
                <div className="space-y-6">
                  {customCurves.map((curve) => (
                    <div key={curve.id} className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Nazwa krzywej
                              </label>
                              <input
                                type="text"
                                value={curve.name}
                                onChange={(e) => actions.updateCustomCurve(tabId, curve.id, { name: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded ${themeClasses.input}`}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Jednostka X
                              </label>
                              <select
                                value={curve.xUnit}
                                onChange={(e) => actions.updateCustomCurve(tabId, curve.id, { xUnit: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded ${themeClasses.input}`}
                              >
                                <option value="g">g (gramy)</option>
                                <option value="kg">kg (kilogramy)</option>
                                <option value="szt">szt (sztuki)</option>
                                <option value="m2">m² (metry kwadratowe)</option>
                                <option value="cm2">cm² (centymetry kwadratowe)</option>
                                <option value="mm2">mm² (milimetry kwadratowe)</option>
                                <option value="m3">m³ (metry sześcienne)</option>
                                <option value="cm3">cm³ (centymetry sześcienne)</option>
                              </select>
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Jednostka Y
                              </label>
                              <select
                                value={curve.yUnit}
                                onChange={(e) => actions.updateCustomCurve(tabId, curve.id, { yUnit: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded ${themeClasses.input}`}
                              >
                                <option value="sek">sek (sekundy)</option>
                                <option value="min">min (minuty)</option>
                                <option value="h">h (godziny)</option>
                                <option value="g">g (gramy)</option>
                                <option value="kg">kg (kilogramy)</option>
                                <option value="szt">szt (sztuki)</option>
                                <option value="m2">m² (metry kwadratowe)</option>
                                <option value="cm2">cm² (centymetry kwadratowe)</option>
                              </select>
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Koszt (€/jednostka Y)
                              </label>
                              <input
                                type="number"
                                value={curve.yCost}
                                onChange={(e) => actions.updateCustomCurve(tabId, curve.id, { yCost: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded ${themeClasses.input}`}
                                step="0.01"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Wartość wejściowa
                              </label>
                              <select
                                value={curve.inputMode || 'x'}
                                onChange={(e) => actions.updateCustomCurve(tabId, curve.id, { inputMode: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded ${themeClasses.input}`}
                              >
                                <option value="x">Podajesz X → obliczam Y</option>
                                <option value="y">Podajesz Y → obliczam X</option>
                              </select>
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${themeClasses.text.secondary}`}>
                                Źródło danych
                              </label>
                              <div className={`w-full px-3 py-2 text-sm border rounded bg-gray-100 dark:bg-gray-700 ${themeClasses.text.secondary}`}>
                                Ustawiasz per element
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => actions.removeCustomCurve(tabId, curve.id)}
                          className="ml-2 text-red-500 hover:text-red-700 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Punkty krzywej */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                            Punkty krzywej
                          </label>
                          <button
                            onClick={() => {
                              const lastPoint = curve.points[curve.points.length - 1] || { x: 0, y: 0 };
                              actions.addCurvePoint(tabId, curve.id, { x: lastPoint.x + 100, y: lastPoint.y + 10 });
                            }}
                            className={`px-2 py-1 text-xs rounded ${themeClasses.button.secondary}`}
                          >
                            <Plus size={12} className="inline mr-1" />
                            Dodaj punkt
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {curve.points.map((point, idx) => (
                            <div key={idx} className={`flex gap-2 items-center p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <div className="flex-1">
                                <label className={`block text-xs ${themeClasses.text.secondary}`}>
                                  X ({curve.xUnit})
                                </label>
                                <input
                                  type="number"
                                  value={point.x}
                                  onChange={(e) => actions.updateCurvePoint(tabId, curve.id, idx, { x: parseFloat(e.target.value) || 0 })}
                                  className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                                />
                              </div>
                              <div className="flex-1">
                                <label className={`block text-xs ${themeClasses.text.secondary}`}>
                                  Y ({curve.yUnit})
                                </label>
                                <input
                                  type="number"
                                  value={point.y}
                                  onChange={(e) => actions.updateCurvePoint(tabId, curve.id, idx, { y: parseFloat(e.target.value) || 0 })}
                                  className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                                />
                              </div>
                              {curve.points.length > 2 && (
                                <button
                                  onClick={() => actions.removeCurvePoint(tabId, curve.id, idx)}
                                  className="text-red-500 hover:text-red-700 mt-4"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Wykres krzywej */}
                        {curve.points.length >= 2 && (
                          <div className="mt-4">
                            <EditableCurve
                              curveData={curve.points}
                              onUpdateCurve={(newPoints) => {
                                actions.updateCustomCurve(tabId, curve.id, { points: newPoints });
                              }}
                              title={`📊 ${curve.name}`}
                              color="#8B5CF6"
                              themeClasses={themeClasses}
                              darkMode={darkMode}
                              xLabel={curve.xUnit}
                              yLabel={curve.yUnit}
                              interpolationType={curve.interpolationType || 'linear'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Brak krzywych niestandardowych. Dodaj pierwszą krzywą powyżej.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Modal zapisywania presetu */}
      {showSavePresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className={`${themeClasses.card} rounded-lg border max-w-md w-full mx-4`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                Zapisz preset krzywych
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Nazwa presetu *
                </label>
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="np. Moje niestandardowe krzywe"
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Opis (opcjonalnie)
                </label>
                <textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Krótki opis tego presetu..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                />
              </div>

              {isAdminOrSuper() && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="makeGlobal"
                    checked={makeGlobal}
                    onChange={(e) => setMakeGlobal(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="makeGlobal" className={`text-sm ${themeClasses.text.secondary}`}>
                    Udostępnij globalnie (widoczny dla wszystkich użytkowników)
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetName('');
                  setPresetDescription('');
                  setMakeGlobal(false);
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
              >
                Anuluj
              </button>
              <button
                onClick={handleSavePresetConfirm}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.success}`}
                disabled={!presetName.trim()}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal usuwania presetu */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className={`${themeClasses.card} rounded-lg border max-w-md w-full mx-4`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-600">
              <h3 className={`text-lg font-semibold text-red-600`}>
                Usuń preset krzywych
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className={`text-sm ${themeClasses.text.primary}`}>
                Czy na pewno chcesz usunąć preset <strong>{presetActions.getById(selectedPresetId)?.name}</strong>?
              </p>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Ta operacja jest nieodwracalna.
              </p>
              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Wpisz <strong>TAK</strong> aby potwierdzić usunięcie:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="TAK"
                  className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
              >
                Anuluj
              </button>
              <button
                onClick={handleDeletePresetConfirm}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.danger} text-white`}
                disabled={deleteConfirmText !== 'TAK'}
              >
                Usuń preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}