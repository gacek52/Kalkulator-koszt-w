import React, { useState, useEffect } from 'react';
import { Calculator, Sun, Moon, ArrowLeft, Save, ChevronDown, X } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { useSession } from '../../context/SessionContext';
import { useCatalog, STATUS_LABELS } from '../../context/CatalogContext';
import { useClient } from '../../context/ClientContext';
import { useWorkstation } from '../../context/WorkstationContext';
import { useCurvePresets } from '../../context/CurvePresetContext';
import { CalculatorForm } from './CalculatorForm';
import { CalculatorResults } from './CalculatorResults';
import { SettingsPanel } from './SettingsPanel';
import { TransportCalculation } from './TransportCalculation';
import { SaveStatusIndicator } from '../Session/SaveStatusIndicator';
import { JsonExportButton } from '../Common/JsonExportButton';
import { JsonImportButton, validationSchemas } from '../Common/JsonImportButton';
import { updateSessionCalculationId, saveWorkstationAssignment, deleteCalculationAssignments } from '../../services/workstationAssignments';
import PendingPoolPanel from './PendingPoolPanel';
import CBDImportModal from './CBDImportModal';
// Feature flags i nowe utilities
import { FEATURE_FLAGS, logFeatureUsage } from '../../config/featureFlags';
import { createItemFromPending, createDefaultTabWithSettings } from '../../utils/itemFactory';
import notify from '../../utils/notifications';
import ConfirmDialog from '../Common/ConfirmDialog';

/**
 * Główny komponent kalkulatora kosztów
 */
export function CostCalculator({ onBackToCatalog, calculationToLoad, onSaveRef }) {
  const { state, actions } = useCalculator();
  const { tabs, activeTab, globalSGA, darkMode, calculationMeta, hasUnsavedChanges } = state;
  const { state: catalogState, actions: catalogActions } = useCatalog();
  const { state: clientState } = useClient();
  const { state: workstationState } = useWorkstation();
  const { presets } = useCurvePresets();
  const { updateSession, activeSession, startNewSession, clearSession } = useSession();
  const [editingTabId, setEditingTabId] = React.useState(null);
  const [editingTabName, setEditingTabName] = React.useState('');
  const [showSettings, setShowSettings] = React.useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadConfirmDialog, setShowLoadConfirmDialog] = useState(false);
  const [pendingCalculationToLoad, setPendingCalculationToLoad] = useState(null);
  const [showCBDImportModal, setShowCBDImportModal] = useState(false);
  const [pendingPool, setPendingPool] = useState(state.pendingPool || []);

  // Konfiguracja motywów
  const themeClasses = {
    background: darkMode ? 'bg-gray-900' : 'bg-gray-50',
    card: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: {
      primary: darkMode ? 'text-white' : 'text-gray-900',
      secondary: darkMode ? 'text-gray-300' : 'text-gray-600'
    },
    input: darkMode
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-gray-300 text-gray-900',
    button: {
      primary: darkMode
        ? 'bg-blue-600 hover:bg-blue-700 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: darkMode
        ? 'bg-gray-600 hover:bg-gray-700 text-white'
        : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      success: darkMode
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'bg-green-600 hover:bg-green-700 text-white'
    }
  };

  const currentTab = tabs[activeTab];

  // Funkcja deep copy dla bezpiecznego klonowania danych
  const deepCopy = (obj) => {
    // structuredClone() zachowuje poprawnie znaki Unicode (emoji, polskie znaki)
    return structuredClone(obj);
  };

  // Znajdź istniejącą kalkulację powiązaną z obecną sesją (jeśli istnieje)
  const linkedCalculationId = calculationMeta.catalogId;
  const existingCalculation = linkedCalculationId
    ? catalogState.calculations.find(calc => calc.id === linkedCalculationId)
    : null;

  // Funkcja ładowania kalkulacji z katalogu
  React.useEffect(() => {
    if (calculationToLoad) {
      if (hasUnsavedChanges) {
        // Pokaż dialog potwierdzenia
        setPendingCalculationToLoad(calculationToLoad);
        setShowLoadConfirmDialog(true);
      } else {
        // Załaduj bez pytania
        loadCalculationFromCatalog(calculationToLoad);
      }
    }
  }, [calculationToLoad]);

  // Synchronizacja zmian ze SessionContext (auto-save)
  React.useEffect(() => {
    // Aktualizuj sesję przy każdej zmianie stanu kalkulatora
    if (tabs.length > 0) {
      const calculationData = {
        globalSGA,
        tabs,
        activeTab,
        calculationMeta
      };
      updateSession(calculationData);
    }
  }, [tabs, activeTab, globalSGA, calculationMeta]);

  // Inicjalizacja sesji przy starcie (jeśli nie ma aktywnej sesji)
  React.useEffect(() => {
    if (!activeSession && tabs.length > 0) {
      startNewSession({
        globalSGA,
        tabs,
        activeTab,
        calculationMeta
      });
    }
  }, []); // Tylko przy pierwszym renderowaniu

  // Inicjalizacja domyślnego presetu dla pierwszej zakładki (jeśli nie ma curvePresetId)
  React.useEffect(() => {
    // Sprawdź tylko przy pierwszym renderze i tylko jeśli presets są już załadowane
    if (tabs.length > 0 && presets && presets.length > 0 && !tabs[0].curvePresetId) {
      const defaultPreset = presets.find(p => p.isDefault === true);
      if (defaultPreset) {
        actions.updateTab(tabs[0].id, { curvePresetId: defaultPreset.id });
      }
    }
  }, [presets]); // Wykonaj gdy presets się załadują

  const loadCalculationFromCatalog = (calculation) => {
    actions.loadCalculation(calculation);
    setShowLoadConfirmDialog(false);
    setPendingCalculationToLoad(null);
  };

  const cancelLoad = () => {
    setShowLoadConfirmDialog(false);
    setPendingCalculationToLoad(null);
    if (onBackToCatalog) {
      onBackToCatalog();
    }
  };

  // Funkcja zapisywania kalkulacji
  const saveCalculation = async (asNewVariant = false) => {
    const allItems = tabs.flatMap(tab =>
      tab.items.map(item => ({
        ...item,
        tabName: tab.name
      }))
    );

    // Deep copy danych aby uniknąć referencji
    // WAŻNE: Zachowaj strukturę z calculationMeta jako osobnym obiektem
    const calculationData = {
      calculationMeta: deepCopy(calculationMeta), // Zachowaj jako osobny obiekt!
      tabs: deepCopy(tabs),
      globalSGA: globalSGA,
      items: deepCopy(allItems),
      totalRevenue: 0,
      totalProfit: 0,
      // Snapshot stanowisk produkcyjnych (pełne dane dla późniejszego podglądu)
      workstationsSnapshot: deepCopy(workstationState.workstations),
      // Dla kompatybilności wstecznej, dodaj też pola bezpośrednio (spread)
      ...deepCopy(calculationMeta)
    };

    let calculationId;

    if (!asNewVariant && existingCalculation) {
      // Nadpisz istniejącą kalkulację
      catalogActions.updateCalculation(linkedCalculationId, calculationData);
      calculationId = linkedCalculationId;
    } else {
      // Zapisz jako nowy wpis
      const newId = catalogState.nextCalculationId;
      catalogActions.addCalculation(calculationData);
      calculationId = newId;

      // Zapisz ID w metadanych aby pamiętać powiązanie
      actions.updateCalculationMeta({ catalogId: newId });
    }

    // WAŻNE: Zapisz/zaktualizuj workstation assignments dla WSZYSTKICH itemów
    console.log('🔍 DEBUG activeSession:', activeSession);
    console.log('🔍 DEBUG calculationId:', calculationId);

    if (activeSession && activeSession.createdAt) {
      // NAJPIERW usuń wszystkie stare assignments dla tej kalkulacji (aby uniknąć duplikatów)
      console.log(`🗑️ Usuwam stare assignments dla kalkulacji ${calculationId}...`);
      try {
        const deleteResult = await deleteCalculationAssignments(calculationId.toString());
        if (deleteResult.success) {
          console.log(`✅ Usunięto ${deleteResult.deletedCount} starych przypisań`);
        }
      } catch (error) {
        console.error('❌ Błąd usuwania starych assignments:', error);
      }

      // TERAZ zapisz nowe assignments
      console.log(`📝 Zapisuję workstation assignments dla kalkulacji ${calculationId}...`);

      const savePromises = [];

      tabs.forEach((tab, tabIndex) => {
        tab.items.forEach((item, itemIndex) => {
          // Zapisz tylko jeśli item ma workstations i annualVolume
          if (item.workstations && item.workstations.length > 0 && item.annualVolume && parseFloat(item.annualVolume) > 0) {
            const assignmentData = {
              sessionId: activeSession.createdAt,
              calculationId: calculationId.toString(),
              tabId: tab.id,
              tabName: tab.name,
              itemId: item.id,
              partId: item.partId || '',
              annualVolume: item.annualVolume,
              workstations: item.workstations
            };

            savePromises.push(
              saveWorkstationAssignment(assignmentData)
                .then(() => console.log(`  ✅ Zapisano stanowiska dla ${tab.name} / ${item.partId || item.id}`))
                .catch(err => console.error(`  ❌ Błąd zapisu dla ${tab.name} / ${item.partId || item.id}:`, err))
            );
          }
        });
      });

      // Poczekaj na wszystkie zapisy
      try {
        await Promise.all(savePromises);
        console.log(`✅ Zapisano ${savePromises.length} przypisań stanowisk dla kalkulacji ${calculationId}`);
      } catch (error) {
        console.error('❌ Błąd podczas zapisywania przypisań stanowisk:', error);
      }
    } else {
      console.warn('⚠️ Nie można zapisać workstation assignments - brak activeSession lub createdAt');
      console.log('activeSession:', activeSession);
    }

    // Oznacz jako zapisane
    actions.markAsSaved();

    // Wyczyść sesję roboczą po pomyślnym zapisie
    clearSession();

    // Pokaż toast notification DOPIERO po zapisaniu wszystkiego (na końcu!)
    if (!asNewVariant && existingCalculation) {
      notify.success('Kalkulacja zaktualizowana w katalogu!');
    } else {
      notify.success(asNewVariant ? 'Zapisano jako nowy wariant!' : 'Kalkulacja zapisana w katalogu!');
    }

    setShowSaveMenu(false);
  };

  // Udostępnij funkcję zapisu przez ref
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = (asNewVariant = false) => saveCalculation(asNewVariant);
    }
  }, [onSaveRef, saveCalculation]);

  // Obsługa dodawania nowej zakładki
  const handleAddTab = () => {
    // Feature flag: użyj nowego createDefaultTabWithSettings lub starego inline kodu
    const newTab = FEATURE_FLAGS.USE_NEW_ITEM_FACTORY
      ? (() => {
          logFeatureUsage('USE_NEW_ITEM_FACTORY', 'handleAddTab');

          // Domyślne krzywe (fallback jeśli nie ma domyślnego presetu)
          const defaultCurves = {
            baking: [
              { x: 50, y: 45 }, { x: 100, y: 55 }, { x: 500, y: 70 },
              { x: 1000, y: 80 }, { x: 2000, y: 90 }, { x: 3000, y: 95 }
            ],
            cleaning: [
              { x: 50, y: 45 }, { x: 100, y: 55 }, { x: 500, y: 70 },
              { x: 1000, y: 80 }, { x: 2000, y: 90 }, { x: 3000, y: 95 }
            ],
            bruttoWeight: [
              { x: 50, y: 60 }, { x: 100, y: 120 }, { x: 500, y: 600 },
              { x: 1000, y: 1200 }, { x: 2000, y: 2300 }, { x: 3000, y: 3300 }
            ],
            heatshieldPrep: [
              { x: 0.01, y: 30 }, { x: 0.05, y: 45 }, { x: 0.1, y: 60 },
              { x: 0.5, y: 120 }, { x: 1.0, y: 180 }, { x: 2.0, y: 300 }
            ],
            heatshieldLaser: [
              { x: 0.0, y: 5 }, { x: 0.01, y: 5 }, { x: 0.05, y: 8 },
              { x: 0.1, y: 12 }, { x: 0.5, y: 25 }, { x: 1.0, y: 40 }, { x: 2.0, y: 70 }
            ]
          };

          const defaultPreset = presets && presets.length > 0
            ? presets.find(p => p.isDefault === true)
            : null;

          return createDefaultTabWithSettings(tabs.length, {
            defaultPresetId: defaultPreset?.id || null,
            defaultCurves
          });
        })()
      : {
          // OLD CODE (fallback) - zachowaj istniejący kod dla bezpieczeństwa
          id: Date.now(),
          name: `Materiał ${tabs.length + 1}`,
          calculationType: 'weight',
          materialCost: '2.0',
          materialPriceUnit: 'kg',
          bakingCost: '110',
          cleaningCost: '90',
          handlingCost: '0.08',
          prepCost: '90',
          customProcesses: [],
          nextProcessId: 1,
          showAdvanced: false,
          curvePresetId: (() => {
            const defaultPreset = presets && presets.length > 0
              ? presets.find(p => p.isDefault === true)
              : null;
            return defaultPreset?.id || null;
          })(),
          editingCurves: {
            baking: [
              { x: 50, y: 45 }, { x: 100, y: 55 }, { x: 500, y: 70 },
              { x: 1000, y: 80 }, { x: 2000, y: 90 }, { x: 3000, y: 95 }
            ],
            cleaning: [
              { x: 50, y: 45 }, { x: 100, y: 55 }, { x: 500, y: 70 },
              { x: 1000, y: 80 }, { x: 2000, y: 90 }, { x: 3000, y: 95 }
            ],
            bruttoWeight: [
              { x: 50, y: 60 }, { x: 100, y: 120 }, { x: 500, y: 600 },
              { x: 1000, y: 1200 }, { x: 2000, y: 2300 }, { x: 3000, y: 3300 }
            ],
            heatshieldPrep: [
              { x: 0.01, y: 30 }, { x: 0.05, y: 45 }, { x: 0.1, y: 60 },
              { x: 0.5, y: 120 }, { x: 1.0, y: 180 }, { x: 2.0, y: 300 }
            ],
            heatshieldLaser: [
              { x: 0.0, y: 5 }, { x: 0.01, y: 5 }, { x: 0.05, y: 8 },
              { x: 0.1, y: 12 }, { x: 0.5, y: 25 }, { x: 1.0, y: 40 }, { x: 2.0, y: 70 }
            ]
          },
          customCurves: [],
          nextCurveId: 1,
          items: [{
            id: 1,
            partId: '',
            weight: '',
            weightOption: 'netto',
            bruttoWeight: '',
            cleaningOption: 'scaled',
            manualCleaningTime: '45',
            margin: '',
            customValues: {},
            customCurveValues: {},
            results: null,
            annualVolume: '',
            volumeForecast: {
              enabled: false,
              years: {}
            },
            workstation: {
              id: null,
              efficiency: ''
            },
            workstations: [{
              id: 1,
              workstationId: null,
              efficiency: '',
              name: 'Stanowisko 1',
              costMode: 'auto',
              manualCost: ''
            }],
            nextWorkstationId: 2,
            weightUnit: 'g',
            surfaceArea: '',
            surfaceUnit: 'mm2',
            thickness: '',
            density: '',
            surfaceWeight: '',
            surfaceCalcLocked: { thickness: true, density: true, surfaceWeight: false },
            sheetLength: '1000',
            sheetWidth: '1000',
            partsPerSheet: '',
            surfaceBrutto: '',
            volume: '',
            volumeUnit: 'mm3',
            dimensions: { length: '', width: '', height: '' },
            volumeWeightOption: 'brutto-auto',
            heatshield: {
              surfaceNettoInput: '',
              surfaceNetto: '',
              surfaceUnit: 'mm2',
              sheetThickness: '',
              sheetDensity: '',
              sheetPrice: '',
              sheetPriceUnit: 'kg',
              matThickness: '',
              matDensity: '',
              matPrice: '',
              matPriceUnit: 'm2',
              bendingCost: '',
              joiningCost: '0',
              gluingCost: '',
              surfaceBruttoSheet: '',
              surfaceNettoSheet: '',
              surfaceNettoMat: '',
              sheetWeight: '',
              matWeight: ''
            },
            multilayer: {
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
                  sheetLength: '',
                  sheetWidth: '',
                  partsPerSheet: '',
                  surfaceBrutto: '',
                  weightNetto: '',
                  weightBrutto: '',
                  curveScope: 'global',
                  customCurveValues: {}
                }
              ],
              nextLayerId: 2
            },
            unit: 'kg',
            packaging: {
              partsPerLayer: '',
              layers: '',
              partsInBox: '',
              manualPartsInBox: false,
              compositionId: null,
              customPrice: ''
            }
          }],
          nextItemId: 2
        };

    actions.addTab(newTab);
    actions.setActiveTab(tabs.length);
  };

  // Obsługa usuwania zakładki
  const handleRemoveTab = (tabId, tabIndex) => {
    if (tabs.length <= 1) {
      notify.error('Nie możesz usunąć ostatniej zakładki!');
      return;
    }

    if (window.confirm('Czy na pewno chcesz usunąć tę zakładkę?')) {
      actions.removeTab(tabId);

      // Ustaw aktywną zakładkę na poprzednią lub następną
      if (tabIndex === activeTab) {
        // Jeśli usuwamy aktywną zakładkę
        if (tabIndex > 0) {
          actions.setActiveTab(tabIndex - 1);
        } else {
          actions.setActiveTab(0);
        }
      } else if (tabIndex < activeTab) {
        // Jeśli usuwamy zakładkę przed aktywną, zmniejsz indeks aktywnej
        actions.setActiveTab(activeTab - 1);
      }
    }
  };

  // Obsługa importu danych z migracją
  const handleImport = (data) => {
    // Migracja danych - dodaj brakujące pola z domyślnymi wartościami
    const migratedData = {
      globalSGA: data.globalSGA || '12',
      tabs: data.tabs || [],
      activeTab: data.activeTab ?? 0,
      nextTabId: data.nextTabId ?? (data.tabs?.length + 1 || 2),
      darkMode: data.darkMode ?? true,
      calculationMeta: {
        client: data.calculationMeta?.client || '',
        clientId: data.calculationMeta?.clientId || null,
        clientCity: data.calculationMeta?.clientCity || '',
        status: data.calculationMeta?.status || 'draft',
        notes: data.calculationMeta?.notes || '',
        createdDate: data.calculationMeta?.createdDate || new Date().toISOString(),
        modifiedDate: data.calculationMeta?.modifiedDate || new Date().toISOString(),
        catalogId: data.calculationMeta?.catalogId || null,
        sharedAccess: data.calculationMeta?.sharedAccess || false,
        // Migracja transportu - dodaj jeśli nie istnieje
        transport: data.calculationMeta?.transport || {
          enabled: false,
          transportTypeId: null,
          distanceSource: 'client',
          clientDistance: '',
          manualDistance: ''
        }
      },
      hasUnsavedChanges: false
    };

    // Migracja tabs - dodaj pole transport do zakładek, które go nie mają (stary format)
    migratedData.tabs = migratedData.tabs.map(tab => ({
      ...tab,
      transport: tab.transport || {
        enabled: false,
        transportTypeId: null,
        distanceSource: 'client',
        manualDistance: '',
        clientDistance: ''
      }
    }));

    // Migracja pól annualVolume - zamień yearlyDemand na annualVolume
    migratedData.tabs = migratedData.tabs.map(tab => ({
      ...tab,
      items: tab.items.map(item => {
        // Jeśli item ma yearlyDemand ale nie ma annualVolume, przekopiuj wartość
        if (item.yearlyDemand !== undefined && item.annualVolume === undefined) {
          const { yearlyDemand, ...rest } = item;
          return { ...rest, annualVolume: yearlyDemand };
        }
        return item;
      })
    }));

    actions.loadData(migratedData);
    notify.success('Dane zostały pomyślnie zaimportowane!');
  };

  // Obsługa edycji nazwy zakładki
  const handleStartEditTabName = (tab) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleSaveTabName = (tabId) => {
    if (editingTabName.trim()) {
      actions.updateTab(tabId, { name: editingTabName, isCustomName: true });
    }
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleCancelEditTabName = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  // === CBD Import Handlers ===

  // Handler importu CBD
  const handleImportCBD = () => {
    setShowCBDImportModal(true);
  };

  // Handler potwierdzenia importu z modala
  const handleCBDImportConfirm = (pendingItems) => {
    // Dodaj do pending pool
    setPendingPool(prev => [...prev, ...pendingItems]);

    // Aktualizuj sesję
    const calculationData = {
      globalSGA,
      tabs,
      activeTab,
      pendingPool: [...pendingPool, ...pendingItems],
      calculationMeta
    };
    updateSession(calculationData);

    console.log(`✅ Imported ${pendingItems.length} items to pending pool`);
  };

  // Handler przypisania pozycji do zakładki
  const handleAssignToTab = (pendingItemId, tabId) => {
    const pendingItem = pendingPool.find(p => p.id === pendingItemId);
    if (!pendingItem) return;

    const targetTab = tabs.find(t => t.id === tabId);
    if (!targetTab) return;

    // Feature flag: użyj nowego itemFactory lub starego inline kodu
    const newItem = FEATURE_FLAGS.USE_NEW_ITEM_FACTORY
      ? (() => {
          logFeatureUsage('USE_NEW_ITEM_FACTORY', 'handleAssignToTab');
          return createItemFromPending(pendingItem, targetTab.nextItemId);
        })()
      : {
          // OLD CODE (fallback) - zachowaj istniejący kod dla bezpieczeństwa
          id: targetTab.nextItemId,
          partId: pendingItem.partId,
          description: pendingItem.description || '',
          annualVolume: pendingItem.annualVolume.toString(),
          // Włącz kalendarz prognoz jeśli pending item go ma
          // UWAGA: Struktura volumeForecast musi być { enabled: bool, years: {} }
          volumeForecast: pendingItem.hasVolumeForecast ? {
            enabled: true,
            years: pendingItem.volumeForecast || {}
          } : {
            enabled: false,
            years: {}
          },
          // Domyślne wartości dla nowego itemu (zależnie od trybu)
          weight: '',
          weightOption: 'netto',
          bruttoWeight: '',
          cleaningOption: 'scaled',
          manualCleaningTime: '45',
          margin: '',
          customValues: {},
          customCurveValues: {},
          results: null,
          workstation: {
            id: null,
            efficiency: ''
          },
          workstations: [{
            id: 1,
            workstationId: null,
            efficiency: '',
            name: 'Stanowisko 1',
            costMode: 'auto',
            manualCost: ''
          }],
          nextWorkstationId: 2,
          weightUnit: 'g',
          surfaceArea: '',
          surfaceUnit: 'mm2',
          thickness: '',
          density: '',
          surfaceWeight: '',
          surfaceCalcLocked: { thickness: true, density: true, surfaceWeight: false },
          sheetLength: '1000',
          sheetWidth: '1000',
          partsPerSheet: '',
          surfaceBrutto: '',
          volume: '',
          volumeUnit: 'mm3',
          dimensions: { length: '', width: '', height: '' },
          volumeWeightOption: 'brutto-auto',
          heatshield: {
            surfaceNettoInput: '',
            surfaceNetto: '',
            surfaceUnit: 'mm2',
            sheetThickness: '',
            sheetDensity: '',
            sheetPrice: '',
            sheetPriceUnit: 'kg',
            matThickness: '',
            matDensity: '',
            matPrice: '',
            matPriceUnit: 'm2',
            bendingCost: '',
            joiningCost: '0',
            gluingCost: '',
            surfaceBruttoSheet: '',
            surfaceNettoSheet: '',
            surfaceNettoMat: '',
            sheetWeight: '',
            matWeight: ''
          },
          multilayer: {
            layers: [{
              id: 1,
              name: 'Warstwa 1',
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
            }],
            nextLayerId: 2
          },
          unit: 'kg',
          packaging: {
            partsPerLayer: '',
            layers: '',
            partsInBox: '',
            manualPartsInBox: false,
            compositionId: null,
            customPrice: ''
          }
        };

    // Dodaj item do zakładki
    const updatedTabs = tabs.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          items: [...tab.items, newItem],
          nextItemId: tab.nextItemId + 1
        };
      }
      return tab;
    });

    // Oznacz pending item jako assigned
    const updatedPool = pendingPool.map(p => {
      if (p.id === pendingItemId) {
        return {
          ...p,
          status: 'assigned',
          assignedToTab: tabId
        };
      }
      return p;
    });

    // Aktualizuj stan
    actions.loadData({ ...state, tabs: updatedTabs });
    setPendingPool(updatedPool);

    // Aktualizuj sesję
    const calculationData = {
      globalSGA,
      tabs: updatedTabs,
      activeTab,
      pendingPool: updatedPool,
      calculationMeta
    };
    updateSession(calculationData);

    console.log(`✅ Assigned ${pendingItem.partId} to tab ${targetTab.name}`);
  };

  // Handler masowego przypisania wielu pozycji do zakładki (bulk assign)
  const handleBulkAssignToTab = (pendingItemIds, tabId) => {
    if (!pendingItemIds || pendingItemIds.length === 0) return;

    const targetTab = tabs.find(t => t.id === tabId);
    if (!targetTab) return;

    // Zbierz wszystkie pending items do przypisania
    const itemsToAssign = pendingItemIds
      .map(id => pendingPool.find(p => p.id === id))
      .filter(item => item && item.status === 'pending');

    if (itemsToAssign.length === 0) return;

    // Utwórz nowe itemy dla wszystkich pending items
    let currentNextItemId = targetTab.nextItemId;
    const newItems = itemsToAssign.map(pendingItem => {
      // Feature flag: użyj nowego itemFactory lub starego inline kodu
      const newItem = FEATURE_FLAGS.USE_NEW_ITEM_FACTORY
        ? (() => {
            logFeatureUsage('USE_NEW_ITEM_FACTORY', 'handleBulkAssignToTab');
            return createItemFromPending(pendingItem, currentNextItemId++);
          })()
        : {
            // OLD CODE (fallback) - zachowaj istniejący kod dla bezpieczeństwa
            id: currentNextItemId++,
            partId: pendingItem.partId,
            description: pendingItem.description || '',
            annualVolume: pendingItem.annualVolume.toString(),
            volumeForecast: pendingItem.hasVolumeForecast ? {
              enabled: true,
              years: pendingItem.volumeForecast || {}
            } : {
              enabled: false,
              years: {}
            },
            weight: '',
            weightOption: 'netto',
            bruttoWeight: '',
            cleaningOption: 'scaled',
            manualCleaningTime: '45',
            margin: '',
            customValues: {},
            customCurveValues: {},
            results: null,
            workstation: { id: null, efficiency: '' },
            workstations: [{
              id: 1,
              workstationId: null,
              efficiency: '',
              name: 'Stanowisko 1',
              costMode: 'auto',
              manualCost: ''
            }],
            nextWorkstationId: 2,
            weightUnit: 'g',
            surfaceArea: '',
            surfaceUnit: 'mm2',
            thickness: '',
            density: '',
            surfaceWeight: '',
            surfaceCalcLocked: { thickness: true, density: true, surfaceWeight: false },
            sheetLength: '1000',
            sheetWidth: '1000',
            partsPerSheet: '',
            surfaceBrutto: '',
            volume: '',
            volumeUnit: 'mm3',
            dimensions: { length: '', width: '', height: '' },
            volumeWeightOption: 'brutto-auto',
            heatshield: {
              surfaceNettoInput: '', surfaceNetto: '', surfaceUnit: 'mm2',
              sheetThickness: '', sheetDensity: '', sheetPrice: '', sheetPriceUnit: 'kg',
              matThickness: '', matDensity: '', matPrice: '', matPriceUnit: 'm2',
              bendingCost: '', joiningCost: '0', gluingCost: '',
              surfaceBruttoSheet: '', surfaceNettoSheet: '', surfaceNettoMat: '',
              sheetWeight: '', matWeight: ''
            },
            multilayer: {
              layers: [{
                id: 1, name: 'Warstwa 1', thickness: '', density: '', priceUnit: 'kg', price: '',
                surfaceNettoInput: '', surfaceUnit: 'mm2', surfaceNetto: '',
                sheetLength: '', sheetWidth: '', partsPerSheet: '', surfaceBrutto: '',
                weightNetto: '', weightBrutto: '', curveScope: 'global', customCurveValues: {}
              }],
              nextLayerId: 2
            },
            unit: 'kg',
            packaging: {
              partsPerLayer: '', layers: '', partsInBox: '',
              manualPartsInBox: false, compositionId: null, customPrice: ''
            }
          };
      return newItem;
    });

    // Zaktualizuj zakładkę - dodaj wszystkie nowe itemy naraz
    const updatedTabs = tabs.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          items: [...tab.items, ...newItems],
          nextItemId: currentNextItemId
        };
      }
      return tab;
    });

    // Oznacz wszystkie pending items jako assigned
    const assignedIds = new Set(pendingItemIds);
    const updatedPool = pendingPool.map(p => {
      if (assignedIds.has(p.id)) {
        return {
          ...p,
          status: 'assigned',
          assignedToTab: tabId
        };
      }
      return p;
    });

    // Aktualizuj stan - JEDEN raz dla wszystkich zmian
    actions.loadData({ ...state, tabs: updatedTabs });
    setPendingPool(updatedPool);

    // Aktualizuj sesję
    const calculationData = {
      globalSGA,
      tabs: updatedTabs,
      activeTab,
      pendingPool: updatedPool,
      calculationMeta
    };
    updateSession(calculationData);

    console.log(`✅ Bulk assigned ${itemsToAssign.length} items to tab ${targetTab.name}`);
  };

  // Handler duplikacji pozycji
  const handleDuplicatePendingItem = (pendingItemId) => {
    const itemToDuplicate = pendingPool.find(p => p.id === pendingItemId);
    if (!itemToDuplicate) return;

    // Zlicz ile duplikatów już istnieje
    const duplicates = pendingPool.filter(p =>
      p.partId === itemToDuplicate.partId && p.isDuplicate
    );
    const variantNumber = duplicates.length + 1;

    // Utwórz duplikat
    const duplicate = {
      ...deepCopy(itemToDuplicate),
      id: `pending_${Date.now()}_${Math.random()}`,
      displayPartId: `${itemToDuplicate.partId} (Variant ${variantNumber})`,
      description: `${itemToDuplicate.description} (Variant ${variantNumber})`,
      isDuplicate: true,
      originalId: itemToDuplicate.partId,
      status: 'pending',
      assignedToTab: null
    };

    // Dodaj do pool
    const updatedPool = [...pendingPool, duplicate];
    setPendingPool(updatedPool);

    // Aktualizuj sesję
    const calculationData = {
      globalSGA,
      tabs,
      activeTab,
      pendingPool: updatedPool,
      calculationMeta
    };
    updateSession(calculationData);

    console.log(`✅ Created duplicate of ${itemToDuplicate.partId} as Variant ${variantNumber}`);
  };

  // Handler usuwania pozycji z pool
  const handleRemovePendingItem = (pendingItemId) => {
    const updatedPool = pendingPool.filter(p => p.id !== pendingItemId);
    setPendingPool(updatedPool);

    // Aktualizuj sesję
    const calculationData = {
      globalSGA,
      tabs,
      activeTab,
      pendingPool: updatedPool,
      calculationMeta
    };
    updateSession(calculationData);
  };

  // Przygotuj dane do eksportu - wszystkie dane potrzebne do pełnego odtworzenia stanu
  const exportData = {
    version: '2.2', // Updated: transport in calculationMeta, annualVolume field
    exportDate: new Date().toISOString(),
    globalSGA,
    tabs,
    activeTab,
    nextTabId: state.nextTabId,
    darkMode,
    calculationMeta
  };

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col gap-4">
            {/* Top row: Title and buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                    Kalkulator Kosztów Produkcyjnych
                  </h1>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    Kompleksowa kalkulacja kosztów materiałów i procesów
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
              {/* Przycisk powrotu do katalogu */}
              {onBackToCatalog && (
                <button
                  onClick={onBackToCatalog}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
                  title="Powrót do katalogu"
                >
                  <ArrowLeft size={16} />
                  Katalog
                </button>
              )}

              {/* Przełącznik motywu */}
              <button
                onClick={() => actions.setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Przyciski eksportu/importu */}
              <JsonExportButton
                data={exportData}
                filename="kalkulator-kosztow"
                themeClasses={themeClasses}
              />

              <JsonImportButton
                onImport={handleImport}
                validateData={validationSchemas.calculator}
                themeClasses={themeClasses}
              />
            </div>
            </div>

            {/* Save Status Indicator */}
            <SaveStatusIndicator darkMode={darkMode} />
          </div>
        </div>

        {/* Pending Pool Panel - CBD Import */}
        <PendingPoolPanel
          pendingPool={pendingPool}
          tabs={tabs}
          activeTab={tabs[activeTab]?.id}
          onImportCBD={handleImportCBD}
          onAssignToTab={handleAssignToTab}
          onBulkAssignToTab={handleBulkAssignToTab}
          onDuplicate={handleDuplicatePendingItem}
          onRemove={handleRemovePendingItem}
        />

        {/* CBD Import Modal */}
        <CBDImportModal
          isOpen={showCBDImportModal}
          onClose={() => setShowCBDImportModal(false)}
          onImport={handleCBDImportConfirm}
        />

        {/* Navigation tabs */}
        <div className={`${themeClasses.card} rounded-lg border mb-6`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab, index) => (
                <div key={tab.id} className="group relative">
                  {editingTabId === tab.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTabName(tab.id);
                          if (e.key === 'Escape') handleCancelEditTabName();
                        }}
                        onBlur={() => handleSaveTabName(tab.id)}
                        autoFocus
                        className={`px-3 py-2 rounded-lg border ${themeClasses.input} w-40`}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => actions.setActiveTab(index)}
                      onDoubleClick={() => handleStartEditTabName(tab)}
                      className={`relative px-4 py-2 pr-8 rounded-lg font-medium transition-colors ${
                        index === activeTab
                          ? themeClasses.button.primary
                          : themeClasses.button.secondary
                      }`}
                      title="Kliknij dwukrotnie aby edytować nazwę"
                    >
                      {tab.name}
                      {tabs.length > 1 && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTab(tab.id, index);
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}
                          title="Usuń zakładkę"
                        >
                          <X size={14} />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleAddTab}
              className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
            >
              + Nowa zakładka
            </button>
          </div>

          {/* Global SG&A */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              <label className={`text-sm font-medium ${themeClasses.text.secondary}`}>
                Globalny SG&A (%):
              </label>
              <input
                type="number"
                value={globalSGA}
                onChange={(e) => actions.setGlobalSGA(e.target.value)}
                className={`w-20 px-2 py-1 border rounded ${themeClasses.input}`}
                step="0.1"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Transport - dla całej kalkulacji */}
        <TransportCalculation
          tabs={tabs}
          calculationMeta={calculationMeta}
          onUpdate={(updates) => actions.updateCalculationMeta(updates)}
          themeClasses={themeClasses}
          darkMode={darkMode}
        />

        {/* Metadane kalkulacji */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6 mt-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Klient
              </label>
              <select
                value={calculationMeta.clientId || ''}
                onChange={(e) => {
                  const clientId = e.target.value;
                  if (!clientId) {
                    actions.updateCalculationMeta({ clientId: null, client: '', clientCity: '' });
                  } else {
                    const selectedClient = clientState.clients.find(c => c.id == clientId);
                    if (selectedClient) {
                      actions.updateCalculationMeta({
                        clientId: selectedClient.id,
                        client: selectedClient.name,
                        clientCity: selectedClient.city
                      });
                    }
                  }
                }}
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
                Status
              </label>
              <select
                value={calculationMeta.status}
                onChange={(e) => actions.updateCalculationMeta({ status: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                Notatki
              </label>
              <input
                type="text"
                value={calculationMeta.notes}
                onChange={(e) => actions.updateCalculationMeta({ notes: e.target.value })}
                className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                placeholder="Dodatkowe informacje..."
              />
            </div>
          </div>

          {/* Checkbox dla współdzielenia */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="sharedAccess"
              checked={calculationMeta.sharedAccess || false}
              onChange={(e) => actions.updateCalculationMeta({ sharedAccess: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sharedAccess" className={`text-sm ${themeClasses.text.secondary} cursor-pointer`}>
              Odblokowany do ingerencji (inni użytkownicy mogą edytować tę kalkulację)
            </label>
          </div>

          <div className="relative flex">
            <button
              onClick={() => saveCalculation(false)}
              className={`px-4 py-2 rounded-l-lg font-medium ${themeClasses.button.success} flex items-center gap-2`}
            >
              <Save size={16} />
              {existingCalculation ? 'Nadpisz kalkulację' : 'Zapisz do katalogu'}
            </button>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className={`px-2 py-2 rounded-r-lg font-medium ${themeClasses.button.success} border-l ${darkMode ? 'border-green-700' : 'border-green-600'}`}
            >
              <ChevronDown size={16} />
            </button>

            {showSaveMenu && (
              <div className={`absolute top-full left-0 mt-1 ${themeClasses.card} rounded-lg border shadow-lg z-10 min-w-[200px]`}>
                <button
                  onClick={() => saveCalculation(true)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.primary} rounded-t-lg`}
                >
                  Zapisz jako nowy wariant
                </button>
                <button
                  onClick={() => setShowSaveMenu(false)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${themeClasses.text.secondary} rounded-b-lg border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  Anuluj
                </button>
              </div>
            )}
          </div>
        </div>

        {currentTab && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Formularz kalkulacji */}
            <div className="xl:col-span-2">
              <CalculatorForm
                tab={currentTab}
                tabs={tabs}
                tabIndex={activeTab}
                globalSGA={globalSGA}
                calculationMeta={calculationMeta}
                themeClasses={themeClasses}
                darkMode={darkMode}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            {/* Wyniki */}
            <div>
              <CalculatorResults
                tabs={tabs}
                currentTabId={currentTab.id}
                globalSGA={globalSGA}
                calculationMeta={calculationMeta}
                themeClasses={themeClasses}
                darkMode={darkMode}
              />
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && currentTab && (
          <SettingsPanel
            tab={currentTab}
            tabId={currentTab.id}
            themeClasses={themeClasses}
            darkMode={darkMode}
            actions={actions}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Dialog potwierdzenia ładowania */}
        {showLoadConfirmDialog && pendingCalculationToLoad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${themeClasses.card} rounded-lg border p-6 max-w-md mx-4`}>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text.primary}`}>
                Niezapisane zmiany
              </h3>
              <p className={`mb-6 ${themeClasses.text.secondary}`}>
                Masz niezapisane zmiany w aktualnej kalkulacji. Czy chcesz je zapisać przed załadowaniem innej kalkulacji?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    saveCalculation(false);
                    loadCalculationFromCatalog(pendingCalculationToLoad);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.success}`}
                >
                  Zapisz i załaduj
                </button>
                <button
                  onClick={() => loadCalculationFromCatalog(pendingCalculationToLoad)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
                >
                  Załaduj bez zapisu
                </button>
                <button
                  onClick={cancelLoad}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}