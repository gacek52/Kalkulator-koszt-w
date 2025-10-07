import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { packagingApi } from '../services/api';

// Akcje dla reducer'a
const PACKAGING_ACTIONS = {
  ADD_PACKAGING_TYPE: 'ADD_PACKAGING_TYPE',
  UPDATE_PACKAGING_TYPE: 'UPDATE_PACKAGING_TYPE',
  REMOVE_PACKAGING_TYPE: 'REMOVE_PACKAGING_TYPE',
  ADD_COMPOSITION: 'ADD_COMPOSITION',
  UPDATE_COMPOSITION: 'UPDATE_COMPOSITION',
  REMOVE_COMPOSITION: 'REMOVE_COMPOSITION',
  SET_CALCULATION_PACKAGING: 'SET_CALCULATION_PACKAGING',
  UPDATE_PACKAGING_CALCULATION: 'UPDATE_PACKAGING_CALCULATION',
  LOAD_PACKAGING_DATA: 'LOAD_PACKAGING_DATA',
  RESET_PACKAGING_STATE: 'RESET_PACKAGING_STATE'
};

// Początkowe typy opakowań - standardowe opakowania
const defaultPackagingTypes = [
  {
    id: 1,
    name: 'Karton B1',
    dimensions: { length: 1200, width: 800, height: 1000 },
    cost: 9.6,
    volume: 0.96
  },
  {
    id: 2,
    name: 'Karton B2',
    dimensions: { length: 600, width: 800, height: 500 },
    cost: 3.6,
    volume: 0.24
  },
  {
    id: 3,
    name: 'Karton B4',
    dimensions: { length: 600, width: 400, height: 370 },
    cost: 1.6,
    volume: 0.0888
  }
];

// Początkowe kompozycje pakowania
const defaultCompositions = [
  {
    id: 1,
    name: 'Karton B1 pojedyńczy',
    packagingTypeId: 1,
    packagesPerPallet: 1,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 13.2
  },
  {
    id: 2,
    name: 'Karton B1 podwójny',
    packagingTypeId: 1,
    packagesPerPallet: 2,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 22.8
  },
  {
    id: 3,
    name: 'Paleta B2 standard',
    packagingTypeId: 2,
    packagesPerPallet: 8,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 32.4
  },
  {
    id: 4,
    name: 'Paleta B4 mała 2 stack',
    packagingTypeId: 3,
    packagesPerPallet: 12,
    palletsPerSpace: 2,
    palletCost: 3.6,
    compositionCost: 45.6
  },
  {
    id: 5,
    name: 'Paleta B4 mała 3 stack',
    packagingTypeId: 3,
    packagesPerPallet: 12,
    palletsPerSpace: 3,
    palletCost: 3.6,
    compositionCost: 68.4
  },
  {
    id: 6,
    name: 'Paleta B4 standard',
    packagingTypeId: 3,
    packagesPerPallet: 20,
    palletsPerSpace: 1,
    palletCost: 3.6,
    compositionCost: 35.6
  }
];

// Początkowy stan
const initialPackagingState = {
  packagingTypes: defaultPackagingTypes,
  nextPackagingId: 4,
  compositions: defaultCompositions,
  nextCompositionId: 7,
  calculations: {}, // { calculationId: { packaging, annualVolume, etc. } }
  transportCostPerPallet: 25.0 // € default transport cost
};

// Reducer dla zarządzania stanem pakowania
function packagingReducer(state, action) {
  switch (action.type) {
    case PACKAGING_ACTIONS.ADD_PACKAGING_TYPE:
      return {
        ...state,
        packagingTypes: [...state.packagingTypes, { ...action.payload, id: state.nextPackagingId }],
        nextPackagingId: state.nextPackagingId + 1
      };

    case PACKAGING_ACTIONS.UPDATE_PACKAGING_TYPE:
      return {
        ...state,
        packagingTypes: state.packagingTypes.map(pkg =>
          pkg.id === action.payload.id
            ? { ...pkg, ...action.payload.updates }
            : pkg
        )
      };

    case PACKAGING_ACTIONS.REMOVE_PACKAGING_TYPE:
      return {
        ...state,
        packagingTypes: state.packagingTypes.filter(pkg => pkg.id !== action.payload)
      };

    case PACKAGING_ACTIONS.ADD_COMPOSITION:
      return {
        ...state,
        compositions: [...state.compositions, { ...action.payload, id: state.nextCompositionId }],
        nextCompositionId: state.nextCompositionId + 1
      };

    case PACKAGING_ACTIONS.UPDATE_COMPOSITION:
      return {
        ...state,
        compositions: state.compositions.map(comp =>
          comp.id === action.payload.id
            ? { ...comp, ...action.payload.updates }
            : comp
        )
      };

    case PACKAGING_ACTIONS.REMOVE_COMPOSITION:
      return {
        ...state,
        compositions: state.compositions.filter(comp => comp.id !== action.payload)
      };

    case PACKAGING_ACTIONS.SET_CALCULATION_PACKAGING:
      return {
        ...state,
        calculations: {
          ...state.calculations,
          [action.payload.calculationId]: action.payload.packagingData
        }
      };

    case PACKAGING_ACTIONS.UPDATE_PACKAGING_CALCULATION:
      return {
        ...state,
        calculations: {
          ...state.calculations,
          [action.payload.calculationId]: {
            ...state.calculations[action.payload.calculationId],
            ...action.payload.updates
          }
        }
      };

    case PACKAGING_ACTIONS.LOAD_PACKAGING_DATA:
      return { ...action.payload };

    case PACKAGING_ACTIONS.RESET_PACKAGING_STATE:
      return { ...initialPackagingState };

    default:
      return state;
  }
}

// Helper functions for packaging calculations
export const packagingUtils = {
  // Oblicz objętość opakowania z wymiarów (mm -> m³)
  calculateVolume: (dimensions) => {
    return (dimensions.length * dimensions.width * dimensions.height) / 1000000000; // mm³ to m³
  },

  // Oblicz liczbę opakowań potrzebnych na podstawie objętości
  calculatePackagesNeeded: (partVolume, annualVolume, packagingVolume, partsPerPackage = null) => {
    if (partsPerPackage) {
      // Ręczne ustawienie
      return Math.ceil(annualVolume / partsPerPackage);
    } else {
      // Automatyczne obliczenie
      const partsPerPackageAuto = Math.floor(packagingVolume / partVolume);
      return Math.ceil(annualVolume / Math.max(1, partsPerPackageAuto));
    }
  },

  // Oblicz liczbę palet
  calculatePalletsNeeded: (packagesNeeded, packagesPerPallet) => {
    return Math.ceil(packagesNeeded / packagesPerPallet);
  },

  // Oblicz liczbę miejsc paletowych (z uwzględnieniem stackowania)
  calculatePalletSpaces: (palletsNeeded, maxStack) => {
    return Math.ceil(palletsNeeded / maxStack);
  },

  // Oblicz koszty pakowania
  calculatePackagingCosts: (packagesNeeded, palletsNeeded, packagingCost, transportCostPerPallet = 0) => {
    const packagingCost_total = packagesNeeded * packagingCost;
    const transportCost = palletsNeeded * transportCostPerPallet;
    return {
      packaging: packagingCost_total,
      transport: transportCost,
      total: packagingCost_total + transportCost
    };
  }
};

// Context
const PackagingContext = createContext();

// Provider component
export function PackagingProvider({ children }) {
  const [state, dispatch] = useReducer(packagingReducer, initialPackagingState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pobierz dane z API przy starcie
  useEffect(() => {
    loadPackagingFromAPI();
  }, []);

  const loadPackagingFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await packagingApi.getAll();

      if (response.success && response.data && response.data.length > 0) {
        const packagingState = response.data[0];
        dispatch({ type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA, payload: packagingState });
      }
    } catch (err) {
      console.error('Błąd wczytywania opakowań z API:', err);
      setError(err.message || 'Nie udało się załadować opakowań');

      // Fallback do localStorage
      const savedData = localStorage.getItem('packagingData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          dispatch({ type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA, payload: parsedData });
        } catch (error) {
          console.error('Błąd wczytywania z localStorage:', error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const savePackagingToAPI = async (packagingState) => {
    try {
      const response = await packagingApi.getAll();

      if (response.success && response.data && response.data.length > 0) {
        await packagingApi.update(response.data[0].id, packagingState);
      } else {
        await packagingApi.create(packagingState);
      }
    } catch (err) {
      console.error('Błąd zapisu opakowań:', err);
    }
  };

  // Backup do localStorage i sync z API
  useEffect(() => {
    localStorage.setItem('packagingData', JSON.stringify(state));
    savePackagingToAPI(state);
  }, [state]);

  // Action creators
  const actions = {
    addPackagingType: (packagingType) => {
      const volume = packagingUtils.calculateVolume(packagingType.dimensions);
      dispatch({
        type: PACKAGING_ACTIONS.ADD_PACKAGING_TYPE,
        payload: { ...packagingType, volume }
      });
    },

    updatePackagingType: (id, updates) => {
      if (updates.dimensions) {
        updates.volume = packagingUtils.calculateVolume(updates.dimensions);
      }
      dispatch({
        type: PACKAGING_ACTIONS.UPDATE_PACKAGING_TYPE,
        payload: { id, updates }
      });
    },

    removePackagingType: (id) => dispatch({
      type: PACKAGING_ACTIONS.REMOVE_PACKAGING_TYPE,
      payload: id
    }),

    addComposition: (composition) => dispatch({
      type: PACKAGING_ACTIONS.ADD_COMPOSITION,
      payload: composition
    }),

    updateComposition: (id, updates) => dispatch({
      type: PACKAGING_ACTIONS.UPDATE_COMPOSITION,
      payload: { id, updates }
    }),

    removeComposition: (id) => dispatch({
      type: PACKAGING_ACTIONS.REMOVE_COMPOSITION,
      payload: id
    }),

    setCalculationPackaging: (calculationId, packagingData) => dispatch({
      type: PACKAGING_ACTIONS.SET_CALCULATION_PACKAGING,
      payload: { calculationId, packagingData }
    }),

    updatePackagingCalculation: (calculationId, updates) => dispatch({
      type: PACKAGING_ACTIONS.UPDATE_PACKAGING_CALCULATION,
      payload: { calculationId, updates }
    }),

    loadPackagingData: (data) => dispatch({
      type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA,
      payload: data
    }),

    resetPackagingState: () => dispatch({
      type: PACKAGING_ACTIONS.RESET_PACKAGING_STATE
    }),

    refreshPackaging: loadPackagingFromAPI
  };

  return (
    <PackagingContext.Provider value={{
      state,
      actions,
      utils: packagingUtils,
      loading,
      error
    }}>
      {children}
    </PackagingContext.Provider>
  );
}

// Hook do używania kontekstu pakowania
export function usePackaging() {
  const context = useContext(PackagingContext);
  if (!context) {
    throw new Error('usePackaging musi być używane wewnątrz PackagingProvider');
  }
  return context;
}

export { PACKAGING_ACTIONS };