import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Akcje dla reducer'a
const PACKAGING_ACTIONS = {
  ADD_PACKAGING_TYPE: 'ADD_PACKAGING_TYPE',
  UPDATE_PACKAGING_TYPE: 'UPDATE_PACKAGING_TYPE',
  REMOVE_PACKAGING_TYPE: 'REMOVE_PACKAGING_TYPE',
  SET_CALCULATION_PACKAGING: 'SET_CALCULATION_PACKAGING',
  UPDATE_PACKAGING_CALCULATION: 'UPDATE_PACKAGING_CALCULATION',
  LOAD_PACKAGING_DATA: 'LOAD_PACKAGING_DATA',
  RESET_PACKAGING_STATE: 'RESET_PACKAGING_STATE'
};

// Początkowe typy opakowań
const defaultPackagingTypes = [
  {
    id: 1,
    name: 'Karton B2',
    dimensions: { length: 400, width: 300, height: 200 }, // mm
    volume: 0.024, // m³ (auto-calculated)
    cost: 1.50, // €
    packagesPerPallet: 12,
    maxStack: 2
  },
  {
    id: 2,
    name: 'Karton B1',
    dimensions: { length: 600, width: 400, height: 300 }, // mm
    volume: 0.072, // m³
    cost: 2.80, // €
    packagesPerPallet: 8,
    maxStack: 2
  }
];

// Początkowy stan
const initialPackagingState = {
  packagingTypes: defaultPackagingTypes,
  nextPackagingId: 3,
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

  // Synchronizacja z localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('packagingData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        dispatch({ type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA, payload: parsedData });
      } catch (error) {
        console.error('Błąd wczytywania danych pakowania z localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('packagingData', JSON.stringify(state));
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
    })
  };

  return (
    <PackagingContext.Provider value={{ state, actions, utils: packagingUtils }}>
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