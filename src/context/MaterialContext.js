import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { materialTypesApi, materialCompositionsApi } from '../services/api';
import { useAuth } from './AuthContext';

// Akcje dla reducer'a
const MATERIAL_ACTIONS = {
  ADD_MATERIAL_TYPE: 'ADD_MATERIAL_TYPE',
  UPDATE_MATERIAL_TYPE: 'UPDATE_MATERIAL_TYPE',
  REMOVE_MATERIAL_TYPE: 'REMOVE_MATERIAL_TYPE',
  ADD_MATERIAL_COMPOSITION: 'ADD_MATERIAL_COMPOSITION',
  UPDATE_MATERIAL_COMPOSITION: 'UPDATE_MATERIAL_COMPOSITION',
  REMOVE_MATERIAL_COMPOSITION: 'REMOVE_MATERIAL_COMPOSITION',
  LOAD_MATERIAL_DATA: 'LOAD_MATERIAL_DATA',
  RESET_MATERIAL_STATE: 'RESET_MATERIAL_STATE'
};

// Początkowy stan (puste - dane z Firestore)
const initialMaterialState = {
  materialTypes: [],
  nextMaterialTypeId: 1,
  materialCompositions: [],
  nextCompositionId: 1
};

// Reducer dla zarządzania stanem materiałów
function materialReducer(state, action) {
  switch (action.type) {
    case MATERIAL_ACTIONS.ADD_MATERIAL_TYPE:
      return {
        ...state,
        materialTypes: [...state.materialTypes, { ...action.payload, id: state.nextMaterialTypeId }],
        nextMaterialTypeId: state.nextMaterialTypeId + 1
      };

    case MATERIAL_ACTIONS.UPDATE_MATERIAL_TYPE:
      return {
        ...state,
        materialTypes: state.materialTypes.map(mat =>
          mat.id === action.payload.id
            ? { ...mat, ...action.payload.updates }
            : mat
        )
      };

    case MATERIAL_ACTIONS.REMOVE_MATERIAL_TYPE:
      return {
        ...state,
        materialTypes: state.materialTypes.filter(mat => mat.id !== action.payload)
      };

    case MATERIAL_ACTIONS.ADD_MATERIAL_COMPOSITION:
      return {
        ...state,
        materialCompositions: [...state.materialCompositions, { ...action.payload, id: state.nextCompositionId }],
        nextCompositionId: state.nextCompositionId + 1
      };

    case MATERIAL_ACTIONS.UPDATE_MATERIAL_COMPOSITION:
      return {
        ...state,
        materialCompositions: state.materialCompositions.map(comp =>
          comp.id === action.payload.id
            ? { ...comp, ...action.payload.updates }
            : comp
        )
      };

    case MATERIAL_ACTIONS.REMOVE_MATERIAL_COMPOSITION:
      return {
        ...state,
        materialCompositions: state.materialCompositions.filter(comp => comp.id !== action.payload)
      };

    case MATERIAL_ACTIONS.LOAD_MATERIAL_DATA:
      return { ...action.payload };

    case MATERIAL_ACTIONS.RESET_MATERIAL_STATE:
      return { ...initialMaterialState };

    default:
      return state;
  }
}

// Helper functions for material calculations
export const materialUtils = {
  // Oblicz ciężar powierzchniowy z gęstości i grubości
  // Wzór: g/m² = kg/m³ × mm (bo mm = m/1000, więc kg/m³ × m/1000 = kg/m² × 1000 = g/m²)
  calculateSurfaceWeight: (density, thickness) => {
    return density * thickness;
  },

  // Pobierz typ materiału po ID (obsługuje string i number)
  getMaterialType: (state, id) => {
    return state.materialTypes.find(m => m.id == id);
  },

  // Pobierz kompozycję po ID (obsługuje string i number)
  getComposition: (state, id) => {
    return state.materialCompositions.find(c => c.id == id);
  },

  // Pobierz kompozycję z pełnymi danymi (typ + obliczony ciężar + auto-nazwa)
  getCompositionWithDetails: (state, id) => {
    const composition = state.materialCompositions.find(c => c.id == id);
    if (!composition) return null;

    const materialType = materialUtils.getMaterialType(state, composition.materialTypeId);
    if (!materialType) return null;

    const surfaceWeight = materialUtils.calculateSurfaceWeight(composition.density, composition.thickness);
    const autoName = `${materialType.name} ${composition.thickness}mm (${composition.density} kg/m³)`;

    return {
      ...composition,
      materialType,
      surfaceWeight,
      displayName: composition.name || autoName,
      pricePerKg: materialType.pricePerKg,
      color: materialType.color
    };
  },

  // Pobierz wszystkie kompozycje z pełnymi danymi
  getAllCompositionsWithDetails: (state) => {
    return state.materialCompositions
      .map(comp => materialUtils.getCompositionWithDetails(state, comp.id))
      .filter(comp => comp !== null);
  },

  // Pobierz kompozycje dla danego typu materiału
  getCompositionsByType: (state, materialTypeId) => {
    return state.materialCompositions
      .filter(comp => comp.materialTypeId == materialTypeId)
      .map(comp => materialUtils.getCompositionWithDetails(state, comp.id))
      .filter(comp => comp !== null);
  }
};

// Context
const MaterialContext = createContext();

// Provider component
export function MaterialProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  const [state, dispatch] = useReducer(materialReducer, initialMaterialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pobierz dane z API przy starcie
  useEffect(() => {
    loadMaterialsFromAPI();
  }, []);

  const loadMaterialsFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      // Pobierz typy materiałów i kompozycje z osobnych kolekcji
      const [typesResponse, compositionsResponse] = await Promise.all([
        materialTypesApi.getAll(),
        materialCompositionsApi.getAll()
      ]);

      if (typesResponse.success && compositionsResponse.success) {
        const materialTypes = typesResponse.data || [];
        const materialCompositions = compositionsResponse.data || [];

        // Oblicz nextIds na podstawie największych ID w bazie
        const maxTypeId = materialTypes.length > 0 ? Math.max(...materialTypes.map(t => parseInt(t.id) || 0), 0) : 0;
        const maxCompositionId = materialCompositions.length > 0 ? Math.max(...materialCompositions.map(c => parseInt(c.id) || 0), 0) : 0;

        const loadedState = {
          materialTypes: materialTypes,
          materialCompositions: materialCompositions,
          nextMaterialTypeId: maxTypeId + 1,
          nextCompositionId: maxCompositionId + 1
        };

        dispatch({ type: MATERIAL_ACTIONS.LOAD_MATERIAL_DATA, payload: loadedState });

        // Backup do localStorage
        localStorage.setItem('materialData', JSON.stringify(loadedState));
      }
    } catch (err) {
      console.error('Błąd wczytywania materiałów z API:', err);
      setError(err.message || 'Nie udało się załadować materiałów');

      // Fallback do localStorage
      const savedData = localStorage.getItem('materialData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          dispatch({ type: MATERIAL_ACTIONS.LOAD_MATERIAL_DATA, payload: parsedData });
        } catch (error) {
          console.error('Błąd wczytywania z localStorage:', error);
          // Brak danych - pozostaw pusty state
          dispatch({ type: MATERIAL_ACTIONS.LOAD_MATERIAL_DATA, payload: {
            materialTypes: [],
            materialCompositions: [],
            nextMaterialTypeId: 1,
            nextCompositionId: 1
          }});
        }
      } else {
        // Brak danych w localStorage - pozostaw pusty state
        console.log('Brak danych materiałów - załaduj z Firestore przez initializeDatabase');
      }
    } finally {
      setLoading(false);
    }
  };

  // Backup do localStorage (zawsze)
  // Nie zapisujemy automatycznie do Firestore - tylko na żądanie przez pushToFirestore
  useEffect(() => {
    localStorage.setItem('materialData', JSON.stringify(state));
  }, [state]);

  // Action creators
  const actions = {
    addMaterialType: (materialType) => dispatch({
      type: MATERIAL_ACTIONS.ADD_MATERIAL_TYPE,
      payload: materialType
    }),

    updateMaterialType: (id, updates) => dispatch({
      type: MATERIAL_ACTIONS.UPDATE_MATERIAL_TYPE,
      payload: { id, updates }
    }),

    removeMaterialType: (id) => dispatch({
      type: MATERIAL_ACTIONS.REMOVE_MATERIAL_TYPE,
      payload: id
    }),

    addMaterialComposition: (composition) => dispatch({
      type: MATERIAL_ACTIONS.ADD_MATERIAL_COMPOSITION,
      payload: composition
    }),

    updateMaterialComposition: (id, updates) => dispatch({
      type: MATERIAL_ACTIONS.UPDATE_MATERIAL_COMPOSITION,
      payload: { id, updates }
    }),

    removeMaterialComposition: (id) => dispatch({
      type: MATERIAL_ACTIONS.REMOVE_MATERIAL_COMPOSITION,
      payload: id
    }),

    loadMaterialData: (data) => dispatch({
      type: MATERIAL_ACTIONS.LOAD_MATERIAL_DATA,
      payload: data
    }),

    resetMaterialState: () => dispatch({
      type: MATERIAL_ACTIONS.RESET_MATERIAL_STATE
    }),

    refreshMaterials: loadMaterialsFromAPI,

    // Manualne pchnięcie danych do Firestore (tylko dla admin)
    pushToFirestore: async () => {
      if (!isAdmin) {
        throw new Error('Tylko admin może zapisywać do Firestore');
      }

      try {
        // Pobierz istniejące dane z Firestore
        const [existingTypesResponse, existingCompositionsResponse] = await Promise.all([
          materialTypesApi.getAll(),
          materialCompositionsApi.getAll()
        ]);

        const existingTypes = existingTypesResponse.success ? (existingTypesResponse.data || []) : [];
        const existingCompositions = existingCompositionsResponse.success ? (existingCompositionsResponse.data || []) : [];

        const existingTypeIds = new Set(existingTypes.map(t => t.id));
        const existingCompositionIds = new Set(existingCompositions.map(c => c.id));

        let typesCreated = 0;
        let typesUpdated = 0;
        let compositionsCreated = 0;
        let compositionsUpdated = 0;

        // Zapisz typy materiałów
        for (const materialType of state.materialTypes) {
          if (existingTypeIds.has(materialType.id)) {
            // Aktualizuj istniejący
            await materialTypesApi.update(materialType.id, materialType);
            typesUpdated++;
          } else {
            // Utwórz nowy
            await materialTypesApi.create({ ...materialType, id: materialType.id });
            typesCreated++;
          }
        }

        // Zapisz kompozycje materiałów
        for (const composition of state.materialCompositions) {
          if (existingCompositionIds.has(composition.id)) {
            // Aktualizuj istniejący
            await materialCompositionsApi.update(composition.id, composition);
            compositionsUpdated++;
          } else {
            // Utwórz nowy
            await materialCompositionsApi.create({ ...composition, id: composition.id });
            compositionsCreated++;
          }
        }

        const message = `Synchronizacja zakończona!\n\nTypy materiałów: ${typesCreated} nowych, ${typesUpdated} zaktualizowanych\nKompozycje: ${compositionsCreated} nowych, ${compositionsUpdated} zaktualizowanych`;
        return { success: true, message };
      } catch (error) {
        console.error('Błąd podczas pushowania materiałów:', error);
        throw new Error('Nie udało się zapisać materiałów do Firestore');
      }
    }
  };

  return (
    <MaterialContext.Provider value={{
      state,
      actions,
      utils: materialUtils,
      loading,
      error
    }}>
      {children}
    </MaterialContext.Provider>
  );
}

// Hook do używania kontekstu materiałów
export function useMaterial() {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error('useMaterial musi być używane wewnątrz MaterialProvider');
  }
  return context;
}

export { MATERIAL_ACTIONS };
