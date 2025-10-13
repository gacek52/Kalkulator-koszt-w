import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { packagingTypesApi, packagingCompositionsApi } from '../services/api';
import { useAuth } from './AuthContext';

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

// Początkowy stan (puste - dane z Firestore)
const initialPackagingState = {
  packagingTypes: [],
  nextPackagingId: 1,
  compositions: [],
  nextCompositionId: 1,
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
  const { currentUser, isAdmin } = useAuth();
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

      // Pobierz typy opakowań i kompozycje z osobnych kolekcji
      const [typesResponse, compositionsResponse] = await Promise.all([
        packagingTypesApi.getAll(),
        packagingCompositionsApi.getAll()
      ]);

      if (typesResponse.success && compositionsResponse.success) {
        const packagingTypes = typesResponse.data || [];
        const compositions = compositionsResponse.data || [];

        // Oblicz nextIds na podstawie największych ID w bazie
        const maxTypeId = packagingTypes.length > 0 ? Math.max(...packagingTypes.map(t => parseInt(t.id) || 0), 0) : 0;
        const maxCompositionId = compositions.length > 0 ? Math.max(...compositions.map(c => parseInt(c.id) || 0), 0) : 0;

        const loadedState = {
          packagingTypes: packagingTypes,
          compositions: compositions,
          nextPackagingId: maxTypeId + 1,
          nextCompositionId: maxCompositionId + 1,
          calculations: {},
          transportCostPerPallet: 25.0
        };

        dispatch({ type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA, payload: loadedState });

        // Backup do localStorage
        localStorage.setItem('packagingData', JSON.stringify(loadedState));
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
          // Brak danych - pozostaw pusty state
          dispatch({ type: PACKAGING_ACTIONS.LOAD_PACKAGING_DATA, payload: {
            packagingTypes: [],
            compositions: [],
            nextPackagingId: 1,
            nextCompositionId: 1,
            calculations: {},
            transportCostPerPallet: 25.0
          }});
        }
      } else {
        // Brak danych w localStorage - pozostaw pusty state
        console.log('Brak danych opakowań - załaduj z Firestore przez initializeDatabase');
      }
    } finally {
      setLoading(false);
    }
  };

  // Backup do localStorage (zawsze)
  // Nie zapisujemy automatycznie do Firestore - tylko na żądanie przez pushToFirestore
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

    refreshPackaging: loadPackagingFromAPI,

    // Manualne pchnięcie danych do Firestore (tylko dla admin)
    pushToFirestore: async () => {
      if (!isAdmin) {
        throw new Error('Tylko admin może zapisywać do Firestore');
      }

      try {
        // Pobierz istniejące dane z Firestore
        const [existingTypesResponse, existingCompositionsResponse] = await Promise.all([
          packagingTypesApi.getAll(),
          packagingCompositionsApi.getAll()
        ]);

        const existingTypes = existingTypesResponse.success ? (existingTypesResponse.data || []) : [];
        const existingCompositions = existingCompositionsResponse.success ? (existingCompositionsResponse.data || []) : [];

        const existingTypeIds = new Set(existingTypes.map(t => t.id));
        const existingCompositionIds = new Set(existingCompositions.map(c => c.id));

        let typesCreated = 0;
        let typesUpdated = 0;
        let compositionsCreated = 0;
        let compositionsUpdated = 0;

        // Zapisz typy opakowań
        for (const packagingType of state.packagingTypes) {
          if (existingTypeIds.has(packagingType.id)) {
            // Aktualizuj istniejący
            await packagingTypesApi.update(packagingType.id, packagingType);
            typesUpdated++;
          } else {
            // Utwórz nowy
            await packagingTypesApi.create({ ...packagingType, id: packagingType.id });
            typesCreated++;
          }
        }

        // Zapisz kompozycje opakowań
        for (const composition of state.compositions) {
          if (existingCompositionIds.has(composition.id)) {
            // Aktualizuj istniejący
            await packagingCompositionsApi.update(composition.id, composition);
            compositionsUpdated++;
          } else {
            // Utwórz nowy
            await packagingCompositionsApi.create({ ...composition, id: composition.id });
            compositionsCreated++;
          }
        }

        const message = `Synchronizacja zakończona!\n\nTypy opakowań: ${typesCreated} nowych, ${typesUpdated} zaktualizowanych\nKompozycje: ${compositionsCreated} nowych, ${compositionsUpdated} zaktualizowanych`;
        return { success: true, message };
      } catch (error) {
        console.error('Błąd podczas pushowania opakowań:', error);
        throw new Error('Nie udało się zapisać opakowań do Firestore');
      }
    }
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