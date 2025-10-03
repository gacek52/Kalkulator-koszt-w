import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Akcje dla reducer'a
const CALCULATOR_ACTIONS = {
  SET_GLOBAL_SGA: 'SET_GLOBAL_SGA',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  ADD_TAB: 'ADD_TAB',
  UPDATE_TAB: 'UPDATE_TAB',
  REMOVE_TAB: 'REMOVE_TAB',
  ADD_ITEM: 'ADD_ITEM',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  SET_DARK_MODE: 'SET_DARK_MODE',
  UPDATE_CALCULATION_META: 'UPDATE_CALCULATION_META',
  // Procesy niestandardowe
  ADD_CUSTOM_PROCESS: 'ADD_CUSTOM_PROCESS',
  UPDATE_CUSTOM_PROCESS: 'UPDATE_CUSTOM_PROCESS',
  REMOVE_CUSTOM_PROCESS: 'REMOVE_CUSTOM_PROCESS',
  // Krzywe użytkownika
  ADD_CUSTOM_CURVE: 'ADD_CUSTOM_CURVE',
  UPDATE_CUSTOM_CURVE: 'UPDATE_CUSTOM_CURVE',
  REMOVE_CUSTOM_CURVE: 'REMOVE_CUSTOM_CURVE',
  UPDATE_CURVE_POINT: 'UPDATE_CURVE_POINT',
  ADD_CURVE_POINT: 'ADD_CURVE_POINT',
  REMOVE_CURVE_POINT: 'REMOVE_CURVE_POINT',
  LOAD_DATA: 'LOAD_DATA',
  LOAD_CALCULATION: 'LOAD_CALCULATION',
  MARK_AS_SAVED: 'MARK_AS_SAVED',
  RESET_STATE: 'RESET_STATE'
};

// Początkowy stan
const initialState = {
  globalSGA: '12',
  activeTab: 0,
  nextTabId: 2,
  darkMode: true,
  hasUnsavedChanges: false,
  lastSavedState: null,
  // Pola dla katalogu kalkulacji
  calculationMeta: {
    client: '',
    status: 'draft',
    notes: '',
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString(),
    catalogId: null
  },
  tabs: [{
    id: 1,
    name: 'Materiał 1',
    calculationType: 'weight', // 'weight', 'surface', 'volume'
    materialCost: '2.0',
    materialPriceUnit: 'kg', // 'kg' lub 'm2' (dla trybu surface)
    bakingCost: '110',
    cleaningCost: '90',
    handlingCost: '0.08',
    prepCost: '90', // Koszt przygotówki dla heatshield (€/8h)
    // Procesy niestandardowe
    customProcesses: [
      // { id: 1, name: 'Proces 1', cost: '10', unit: 'euro/szt', efficiency: '1' }
    ],
    nextProcessId: 1,
    showAdvanced: false,
    // Krzywe czasów dla pieczenia i czyszczenia
    editingCurves: {
      baking: [
        { x: 50, y: 45 },
        { x: 100, y: 55 },
        { x: 500, y: 70 },
        { x: 1000, y: 80 },
        { x: 2000, y: 90 },
        { x: 3000, y: 95 }
      ],
      cleaning: [
        { x: 50, y: 45 },
        { x: 100, y: 55 },
        { x: 500, y: 70 },
        { x: 1000, y: 80 },
        { x: 2000, y: 90 },
        { x: 3000, y: 95 }
      ],
      bruttoWeight: [
        { x: 50, y: 60 },    // netto 50g -> brutto 60g (20% więcej)
        { x: 100, y: 120 },  // netto 100g -> brutto 120g (20% więcej)
        { x: 500, y: 600 },  // netto 500g -> brutto 600g (20% więcej)
        { x: 1000, y: 1200 }, // netto 1kg -> brutto 1.2kg (20% więcej)
        { x: 2000, y: 2300 }, // netto 2kg -> brutto 2.3kg (15% więcej)
        { x: 3000, y: 3300 }  // netto 3kg -> brutto 3.3kg (10% więcej)
      ],
      // Krzywe dla heatshield
      heatshieldPrep: [
        { x: 0.01, y: 30 },   // 0.01 m² -> 30 sek
        { x: 0.05, y: 45 },   // 0.05 m² -> 45 sek
        { x: 0.1, y: 60 },    // 0.1 m² -> 60 sek
        { x: 0.5, y: 120 },   // 0.5 m² -> 120 sek
        { x: 1.0, y: 180 },   // 1 m² -> 180 sek
        { x: 2.0, y: 300 }    // 2 m² -> 300 sek
      ],
      heatshieldLaser: [
        // Krzywa z progami - powierzchnia [m²] -> cena [€]
        { x: 0.0, y: 5 },     // <0.01 m² -> 5 €
        { x: 0.01, y: 5 },    // 0.01 m² -> 5 €
        { x: 0.05, y: 8 },    // 0.05 m² -> 8 €
        { x: 0.1, y: 12 },    // 0.1 m² -> 12 €
        { x: 0.5, y: 25 },    // 0.5 m² -> 25 €
        { x: 1.0, y: 40 },    // 1 m² -> 40 €
        { x: 2.0, y: 70 }     // 2 m² -> 70 €
      ]
    },
    // Krzywe użytkownika (edytowalne)
    customCurves: [
      // {
      //   id: 1,
      //   name: 'Moja krzywa',
      //   points: [{ x: 0, y: 0 }, { x: 100, y: 50 }],
      //   xUnit: 'g',
      //   yUnit: 'sek',
      //   yCost: '50', // koszt na jednostkę Y (np. €/8h)
      //   interpolationType: 'linear'
      // }
    ],
    nextCurveId: 1,
    items: [{
      id: 1,
      partId: '',
      // Pola wspólne
      weight: '', // waga netto (obliczona lub wprowadzona)
      weightOption: 'netto', // 'netto', 'brutto-auto', 'brutto-manual'
      bruttoWeight: '', // waga brutto (obliczona lub wprowadzona)
      cleaningOption: 'scaled',
      manualCleaningTime: '45',
      margin: '', // marża per pozycja (%)
      customValues: {}, // wartości dla procesów niestandardowych
      results: null,
      annualVolume: '', // roczna ilość produkcji
      // Pola dla trybu WAGA
      weightUnit: 'g', // 'g', 'kg'
      // Pola dla trybu POWIERZCHNIA
      surfaceArea: '', // powierzchnia netto
      surfaceUnit: 'mm2', // 'mm2', 'm2'
      thickness: '', // grubość [mm]
      density: '', // gęstość [kg/m³]
      surfaceWeight: '', // ciężar powierzchniowy [g/m²]
      surfaceCalcLocked: { thickness: true, density: true, surfaceWeight: false }, // które pola są wypełniane (locked), które obliczane
      sheetLength: '1000', // długość arkusza [mm]
      sheetWidth: '1000', // szerokość arkusza [mm]
      partsPerSheet: '', // ilość detali na arkuszu
      surfaceBrutto: '', // powierzchnia brutto [m²] - obliczona
      // Pola dla trybu OBJĘTOŚĆ
      volume: '', // objętość [mm³, cm³, m³]
      volumeUnit: 'mm3', // 'mm3', 'cm3', 'm3'
      dimensions: { length: '', width: '', height: '' }, // wymiary dla auto-obliczania objętości
      volumeWeightOption: 'brutto-auto', // 'netto', 'brutto-auto', 'brutto-manual'
      // volumeDensity jest już w 'density' powyżej
      // Pola dla pakowania
      unit: 'kg', // jednostka: kg, g, m2, mm2, cm2, m3, cm3, g_m2
      packaging: {
        partsPerLayer: '', // części na warstwę
        layers: '', // ilość warstw
        partsInBox: '', // liczba elementów w kartonie (obliczana lub ręczna)
        manualPartsInBox: false, // checkbox - czy ręczne wprowadzanie
        compositionId: null, // ID wybranej kompozycji (null = niestandardowa)
        customPrice: '' // cena dla kompozycji niestandardowej (€)
      }
    }],
    nextItemId: 2
  }]
};

// Reducer dla zarządzania stanem
function calculatorReducer(state, action) {
  switch (action.type) {
    case CALCULATOR_ACTIONS.SET_GLOBAL_SGA:
      return { ...state, globalSGA: action.payload };

    case CALCULATOR_ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload };

    case CALCULATOR_ACTIONS.SET_DARK_MODE:
      return { ...state, darkMode: action.payload };

    case CALCULATOR_ACTIONS.UPDATE_CALCULATION_META:
      return {
        ...state,
        calculationMeta: {
          ...state.calculationMeta,
          ...action.payload,
          modifiedDate: new Date().toISOString()
        }
      };

    case CALCULATOR_ACTIONS.ADD_TAB:
      return {
        ...state,
        tabs: [...state.tabs, action.payload],
        nextTabId: state.nextTabId + 1
      };

    case CALCULATOR_ACTIONS.UPDATE_TAB:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.id ? { ...tab, ...action.payload.updates } : tab
        )
      };

    case CALCULATOR_ACTIONS.REMOVE_TAB:
      const newTabs = state.tabs.filter(tab => tab.id !== action.payload);
      return {
        ...state,
        tabs: newTabs,
        activeTab: state.activeTab >= newTabs.length ? newTabs.length - 1 : state.activeTab
      };

    case CALCULATOR_ACTIONS.ADD_ITEM:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                items: [...tab.items, action.payload.item],
                nextItemId: tab.nextItemId + 1
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.DUPLICATE_ITEM:
      return {
        ...state,
        tabs: state.tabs.map(tab => {
          if (tab.id === action.payload.tabId) {
            const itemToDuplicate = tab.items.find(item => item.id === action.payload.itemId);
            if (!itemToDuplicate) return tab;

            const duplicatedItem = {
              ...itemToDuplicate,
              id: tab.nextItemId,
              partId: itemToDuplicate.partId ? `${itemToDuplicate.partId} (kopia)` : '',
              results: null // Wyczyść wyniki, będą przeliczone automatycznie
            };

            return {
              ...tab,
              items: [...tab.items, duplicatedItem],
              nextItemId: tab.nextItemId + 1
            };
          }
          return tab;
        })
      };

    case CALCULATOR_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                items: tab.items.map(item =>
                  item.id === action.payload.itemId
                    ? { ...item, ...action.payload.updates }
                    : item
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                items: tab.items.filter(item => item.id !== action.payload.itemId)
              }
            : tab
        )
      };

    // Procesy niestandardowe
    case CALCULATOR_ACTIONS.ADD_CUSTOM_PROCESS:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customProcesses: [...tab.customProcesses, { ...action.payload.process, id: tab.nextProcessId }],
                nextProcessId: tab.nextProcessId + 1
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.UPDATE_CUSTOM_PROCESS:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customProcesses: tab.customProcesses.map(process =>
                  process.id === action.payload.processId
                    ? { ...process, ...action.payload.updates }
                    : process
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.REMOVE_CUSTOM_PROCESS:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customProcesses: tab.customProcesses.filter(process => process.id !== action.payload.processId)
              }
            : tab
        )
      };

    // Krzywe użytkownika
    case CALCULATOR_ACTIONS.ADD_CUSTOM_CURVE:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: [...tab.customCurves, { ...action.payload.curve, id: tab.nextCurveId }],
                nextCurveId: tab.nextCurveId + 1
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.UPDATE_CUSTOM_CURVE:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: tab.customCurves.map(curve =>
                  curve.id === action.payload.curveId
                    ? { ...curve, ...action.payload.updates }
                    : curve
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.REMOVE_CUSTOM_CURVE:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: tab.customCurves.filter(curve => curve.id !== action.payload.curveId)
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.ADD_CURVE_POINT:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: tab.customCurves.map(curve =>
                  curve.id === action.payload.curveId
                    ? { ...curve, points: [...curve.points, action.payload.point] }
                    : curve
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.UPDATE_CURVE_POINT:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: tab.customCurves.map(curve =>
                  curve.id === action.payload.curveId
                    ? {
                        ...curve,
                        points: curve.points.map((point, idx) =>
                          idx === action.payload.pointIndex
                            ? { ...point, ...action.payload.updates }
                            : point
                        )
                      }
                    : curve
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.REMOVE_CURVE_POINT:
      return {
        ...state,
        tabs: state.tabs.map(tab =>
          tab.id === action.payload.tabId
            ? {
                ...tab,
                customCurves: tab.customCurves.map(curve =>
                  curve.id === action.payload.curveId
                    ? { ...curve, points: curve.points.filter((_, idx) => idx !== action.payload.pointIndex) }
                    : curve
                )
              }
            : tab
        )
      };

    case CALCULATOR_ACTIONS.LOAD_DATA:
      return { ...action.payload, hasUnsavedChanges: false };

    case CALCULATOR_ACTIONS.LOAD_CALCULATION:
      // Deep copy kalkulacji z katalogu
      const loadedState = JSON.parse(JSON.stringify(action.payload));
      // Zachowaj darkMode z obecnej sesji, ale załaduj wszystko inne
      return {
        ...state, // Zachowaj obecną konfigurację (darkMode)
        ...loadedState, // Nadpisz danymi z katalogu
        darkMode: state.darkMode, // Zachowaj obecny tryb ciemny
        hasUnsavedChanges: false,
        lastSavedState: JSON.stringify(loadedState)
      };

    case CALCULATOR_ACTIONS.MARK_AS_SAVED:
      return {
        ...state,
        hasUnsavedChanges: false,
        lastSavedState: JSON.stringify(state)
      };

    case CALCULATOR_ACTIONS.RESET_STATE:
      return { ...initialState };

    default:
      // Oznacz jako zmienione po każdej akcji (oprócz wczytywania)
      if (action.type !== CALCULATOR_ACTIONS.SET_ACTIVE_TAB &&
          action.type !== CALCULATOR_ACTIONS.SET_DARK_MODE) {
        return { ...state, hasUnsavedChanges: true };
      }
      return state;
  }
}

// Context
const CalculatorContext = createContext();

// Provider component
export function CalculatorProvider({ children }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  // Synchronizacja z localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('calculatorData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);

        // Migracja danych - dodaj brakujące pola
        const migratedData = {
          ...parsedData,
          hasUnsavedChanges: parsedData.hasUnsavedChanges ?? false,
          lastSavedState: parsedData.lastSavedState ?? null,
          calculationMeta: parsedData.calculationMeta ?? {
            client: '',
            status: 'draft',
            notes: '',
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            catalogId: null
          }
        };

        dispatch({ type: CALCULATOR_ACTIONS.LOAD_DATA, payload: migratedData });
      } catch (error) {
        console.error('Błąd wczytywania danych z localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('calculatorData', JSON.stringify(state));
  }, [state]);

  // Action creators
  const actions = {
    setGlobalSGA: (value) => dispatch({ type: CALCULATOR_ACTIONS.SET_GLOBAL_SGA, payload: value }),
    setActiveTab: (index) => dispatch({ type: CALCULATOR_ACTIONS.SET_ACTIVE_TAB, payload: index }),
    setDarkMode: (value) => dispatch({ type: CALCULATOR_ACTIONS.SET_DARK_MODE, payload: value }),

    updateCalculationMeta: (meta) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_CALCULATION_META, payload: meta }),

    addTab: (tab) => dispatch({ type: CALCULATOR_ACTIONS.ADD_TAB, payload: tab }),
    updateTab: (id, updates) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_TAB, payload: { id, updates } }),
    removeTab: (id) => dispatch({ type: CALCULATOR_ACTIONS.REMOVE_TAB, payload: id }),

    addItem: (tabId, item) => dispatch({ type: CALCULATOR_ACTIONS.ADD_ITEM, payload: { tabId, item } }),
    duplicateItem: (tabId, itemId) => dispatch({ type: CALCULATOR_ACTIONS.DUPLICATE_ITEM, payload: { tabId, itemId } }),
    updateItem: (tabId, itemId, updates) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_ITEM, payload: { tabId, itemId, updates } }),
    removeItem: (tabId, itemId) => dispatch({ type: CALCULATOR_ACTIONS.REMOVE_ITEM, payload: { tabId, itemId } }),

    // Procesy niestandardowe
    addCustomProcess: (tabId, process) => dispatch({ type: CALCULATOR_ACTIONS.ADD_CUSTOM_PROCESS, payload: { tabId, process } }),
    updateCustomProcess: (tabId, processId, updates) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_CUSTOM_PROCESS, payload: { tabId, processId, updates } }),
    removeCustomProcess: (tabId, processId) => dispatch({ type: CALCULATOR_ACTIONS.REMOVE_CUSTOM_PROCESS, payload: { tabId, processId } }),

    // Krzywe użytkownika
    addCustomCurve: (tabId, curve) => dispatch({ type: CALCULATOR_ACTIONS.ADD_CUSTOM_CURVE, payload: { tabId, curve } }),
    updateCustomCurve: (tabId, curveId, updates) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_CUSTOM_CURVE, payload: { tabId, curveId, updates } }),
    removeCustomCurve: (tabId, curveId) => dispatch({ type: CALCULATOR_ACTIONS.REMOVE_CUSTOM_CURVE, payload: { tabId, curveId } }),
    addCurvePoint: (tabId, curveId, point) => dispatch({ type: CALCULATOR_ACTIONS.ADD_CURVE_POINT, payload: { tabId, curveId, point } }),
    updateCurvePoint: (tabId, curveId, pointIndex, updates) => dispatch({ type: CALCULATOR_ACTIONS.UPDATE_CURVE_POINT, payload: { tabId, curveId, pointIndex, updates } }),
    removeCurvePoint: (tabId, curveId, pointIndex) => dispatch({ type: CALCULATOR_ACTIONS.REMOVE_CURVE_POINT, payload: { tabId, curveId, pointIndex } }),

    loadData: (data) => dispatch({ type: CALCULATOR_ACTIONS.LOAD_DATA, payload: data }),
    loadCalculation: (calculation) => dispatch({ type: CALCULATOR_ACTIONS.LOAD_CALCULATION, payload: calculation }),
    markAsSaved: () => dispatch({ type: CALCULATOR_ACTIONS.MARK_AS_SAVED }),
    resetState: () => dispatch({ type: CALCULATOR_ACTIONS.RESET_STATE })
  };

  return (
    <CalculatorContext.Provider value={{ state, actions }}>
      {children}
    </CalculatorContext.Provider>
  );
}

// Hook do używania kontekstu
export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator musi być używane wewnątrz CalculatorProvider');
  }
  return context;
}

export { CALCULATOR_ACTIONS };