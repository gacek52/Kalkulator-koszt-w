import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { materialsApi } from '../services/api';

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

// Początkowe typy materiałów (mata szklana + blacha)
const defaultMaterialTypes = [
  {
    id: 1,
    name: 'E-glass',
    pricePerKg: 1.75, // €/kg
    color: '#3B82F6' // niebieski
  },
  {
    id: 2,
    name: 'HT800',
    pricePerKg: 2.75, // €/kg
    color: '#EF4444' // czerwony
  },
  {
    id: 3,
    name: 'HT1000',
    pricePerKg: 6.4, // €/kg
    color: '#F59E0B' // pomarańczowy
  },
  {
    id: 4,
    name: 'Silicat',
    pricePerKg: 7.3, // €/kg
    color: '#10B981' // zielony
  },
  {
    id: 5,
    name: '1.4301 (bez ALS)',
    pricePerKg: 2.5, // €/kg
    color: '#4feb24' // zielony jasny
  }
];

// Początkowe kombinacje materiałów (typ + grubość + gęstość)
// Ciężar powierzchniowy oblicza się automatycznie: gęstość × grubość
const defaultMaterialCompositions = [
  // E-glass (materialTypeId: 1)
  { id: 1, materialTypeId: 1, thickness: 6, density: 120, name: '' },
  { id: 2, materialTypeId: 1, thickness: 6, density: 130, name: '' },
  { id: 3, materialTypeId: 1, thickness: 6, density: 150, name: '' },
  { id: 4, materialTypeId: 1, thickness: 6, density: 160, name: '' },
  { id: 5, materialTypeId: 1, thickness: 6, density: 165, name: '' },
  { id: 6, materialTypeId: 1, thickness: 8, density: 120, name: '' },
  { id: 7, materialTypeId: 1, thickness: 8, density: 130, name: '' },
  { id: 8, materialTypeId: 1, thickness: 8, density: 150, name: '' },
  { id: 9, materialTypeId: 1, thickness: 8, density: 160, name: '' },
  { id: 10, materialTypeId: 1, thickness: 8, density: 165, name: '' },
  { id: 11, materialTypeId: 1, thickness: 10, density: 120, name: '' },
  { id: 12, materialTypeId: 1, thickness: 10, density: 130, name: '' },
  { id: 13, materialTypeId: 1, thickness: 10, density: 150, name: '' },
  { id: 14, materialTypeId: 1, thickness: 10, density: 160, name: '' },
  { id: 15, materialTypeId: 1, thickness: 10, density: 165, name: '' },
  { id: 16, materialTypeId: 1, thickness: 12, density: 120, name: '' },
  { id: 17, materialTypeId: 1, thickness: 12, density: 130, name: '' },
  { id: 18, materialTypeId: 1, thickness: 12, density: 150, name: '' },
  { id: 19, materialTypeId: 1, thickness: 12, density: 160, name: '' },
  { id: 20, materialTypeId: 1, thickness: 12, density: 165, name: '' },
  { id: 21, materialTypeId: 1, thickness: 15, density: 120, name: '' },
  { id: 22, materialTypeId: 1, thickness: 15, density: 130, name: '' },
  { id: 23, materialTypeId: 1, thickness: 15, density: 150, name: '' },
  { id: 24, materialTypeId: 1, thickness: 15, density: 160, name: '' },
  { id: 25, materialTypeId: 1, thickness: 15, density: 165, name: '' },

  // HT800 (materialTypeId: 2)
  { id: 26, materialTypeId: 2, thickness: 6, density: 120, name: '' },
  { id: 27, materialTypeId: 2, thickness: 6, density: 130, name: '' },
  { id: 28, materialTypeId: 2, thickness: 6, density: 150, name: '' },
  { id: 29, materialTypeId: 2, thickness: 6, density: 160, name: '' },
  { id: 30, materialTypeId: 2, thickness: 6, density: 165, name: '' },
  { id: 31, materialTypeId: 2, thickness: 8, density: 120, name: '' },
  { id: 32, materialTypeId: 2, thickness: 8, density: 130, name: '' },
  { id: 33, materialTypeId: 2, thickness: 8, density: 150, name: '' },
  { id: 34, materialTypeId: 2, thickness: 8, density: 160, name: '' },
  { id: 35, materialTypeId: 2, thickness: 8, density: 165, name: '' },
  { id: 36, materialTypeId: 2, thickness: 10, density: 120, name: '' },
  { id: 37, materialTypeId: 2, thickness: 10, density: 130, name: '' },
  { id: 38, materialTypeId: 2, thickness: 10, density: 150, name: '' },
  { id: 39, materialTypeId: 2, thickness: 10, density: 160, name: '' },
  { id: 40, materialTypeId: 2, thickness: 10, density: 165, name: '' },
  { id: 41, materialTypeId: 2, thickness: 12, density: 120, name: '' },
  { id: 42, materialTypeId: 2, thickness: 12, density: 130, name: '' },
  { id: 43, materialTypeId: 2, thickness: 12, density: 150, name: '' },
  { id: 44, materialTypeId: 2, thickness: 12, density: 160, name: '' },
  { id: 45, materialTypeId: 2, thickness: 12, density: 165, name: '' },
  { id: 46, materialTypeId: 2, thickness: 15, density: 120, name: '' },
  { id: 47, materialTypeId: 2, thickness: 15, density: 130, name: '' },
  { id: 48, materialTypeId: 2, thickness: 15, density: 150, name: '' },
  { id: 49, materialTypeId: 2, thickness: 15, density: 160, name: '' },
  { id: 50, materialTypeId: 2, thickness: 15, density: 165, name: '' },

  // HT1000 (materialTypeId: 3)
  { id: 51, materialTypeId: 3, thickness: 6, density: 120, name: '' },
  { id: 52, materialTypeId: 3, thickness: 6, density: 130, name: '' },
  { id: 53, materialTypeId: 3, thickness: 6, density: 150, name: '' },
  { id: 54, materialTypeId: 3, thickness: 6, density: 160, name: '' },
  { id: 55, materialTypeId: 3, thickness: 6, density: 165, name: '' },
  { id: 56, materialTypeId: 3, thickness: 8, density: 120, name: '' },
  { id: 57, materialTypeId: 3, thickness: 8, density: 130, name: '' },
  { id: 58, materialTypeId: 3, thickness: 8, density: 150, name: '' },
  { id: 59, materialTypeId: 3, thickness: 8, density: 160, name: '' },
  { id: 60, materialTypeId: 3, thickness: 8, density: 165, name: '' },
  { id: 61, materialTypeId: 3, thickness: 10, density: 120, name: '' },
  { id: 62, materialTypeId: 3, thickness: 10, density: 130, name: '' },
  { id: 63, materialTypeId: 3, thickness: 10, density: 150, name: '' },
  { id: 64, materialTypeId: 3, thickness: 10, density: 160, name: '' },
  { id: 65, materialTypeId: 3, thickness: 10, density: 165, name: '' },
  { id: 66, materialTypeId: 3, thickness: 12, density: 120, name: '' },
  { id: 67, materialTypeId: 3, thickness: 12, density: 130, name: '' },
  { id: 68, materialTypeId: 3, thickness: 12, density: 150, name: '' },
  { id: 69, materialTypeId: 3, thickness: 12, density: 160, name: '' },
  { id: 70, materialTypeId: 3, thickness: 12, density: 165, name: '' },
  { id: 71, materialTypeId: 3, thickness: 15, density: 120, name: '' },
  { id: 72, materialTypeId: 3, thickness: 15, density: 130, name: '' },
  { id: 73, materialTypeId: 3, thickness: 15, density: 150, name: '' },
  { id: 74, materialTypeId: 3, thickness: 15, density: 160, name: '' },
  { id: 75, materialTypeId: 3, thickness: 15, density: 165, name: '' },

  // Silicat (materialTypeId: 4)
  { id: 76, materialTypeId: 4, thickness: 6, density: 120, name: '' },
  { id: 77, materialTypeId: 4, thickness: 6, density: 130, name: '' },
  { id: 78, materialTypeId: 4, thickness: 6, density: 150, name: '' },
  { id: 79, materialTypeId: 4, thickness: 6, density: 160, name: '' },
  { id: 80, materialTypeId: 4, thickness: 6, density: 165, name: '' },
  { id: 81, materialTypeId: 4, thickness: 8, density: 120, name: '' },
  { id: 82, materialTypeId: 4, thickness: 8, density: 130, name: '' },
  { id: 83, materialTypeId: 4, thickness: 8, density: 150, name: '' },
  { id: 84, materialTypeId: 4, thickness: 8, density: 160, name: '' },
  { id: 85, materialTypeId: 4, thickness: 8, density: 165, name: '' },
  { id: 86, materialTypeId: 4, thickness: 10, density: 120, name: '' },
  { id: 87, materialTypeId: 4, thickness: 10, density: 130, name: '' },
  { id: 88, materialTypeId: 4, thickness: 10, density: 150, name: '' },
  { id: 89, materialTypeId: 4, thickness: 10, density: 160, name: '' },
  { id: 90, materialTypeId: 4, thickness: 10, density: 165, name: '' },
  { id: 91, materialTypeId: 4, thickness: 12, density: 120, name: '' },
  { id: 92, materialTypeId: 4, thickness: 12, density: 130, name: '' },
  { id: 93, materialTypeId: 4, thickness: 12, density: 150, name: '' },
  { id: 94, materialTypeId: 4, thickness: 12, density: 160, name: '' },
  { id: 95, materialTypeId: 4, thickness: 12, density: 165, name: '' },
  { id: 96, materialTypeId: 4, thickness: 15, density: 120, name: '' },
  { id: 97, materialTypeId: 4, thickness: 15, density: 130, name: '' },
  { id: 98, materialTypeId: 4, thickness: 15, density: 150, name: '' },
  { id: 99, materialTypeId: 4, thickness: 15, density: 160, name: '' },
  { id: 100, materialTypeId: 4, thickness: 15, density: 165, name: '' },

  // 1.4301 (bez ALS) - blacha stalowa (materialTypeId: 5)
  { id: 101, materialTypeId: 5, thickness: 0.1, density: 7850, name: '' },
  { id: 102, materialTypeId: 5, thickness: 0.15, density: 7850, name: '' },
  { id: 103, materialTypeId: 5, thickness: 0.2, density: 7850, name: '' }
];

// Początkowy stan
const initialMaterialState = {
  materialTypes: defaultMaterialTypes,
  nextMaterialTypeId: 6,
  materialCompositions: defaultMaterialCompositions,
  nextCompositionId: 104
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

  // Pobierz typ materiału po ID
  getMaterialType: (state, id) => {
    return state.materialTypes.find(m => m.id === id);
  },

  // Pobierz kompozycję po ID
  getComposition: (state, id) => {
    return state.materialCompositions.find(c => c.id === id);
  },

  // Pobierz kompozycję z pełnymi danymi (typ + obliczony ciężar + auto-nazwa)
  getCompositionWithDetails: (state, id) => {
    const composition = state.materialCompositions.find(c => c.id === id);
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
      .filter(comp => comp.materialTypeId === materialTypeId)
      .map(comp => materialUtils.getCompositionWithDetails(state, comp.id))
      .filter(comp => comp !== null);
  }
};

// Context
const MaterialContext = createContext();

// Provider component
export function MaterialProvider({ children }) {
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

      const response = await materialsApi.getAll();

      if (response.success && response.data && response.data.length > 0) {
        // Zakładamy że pierwszy element to cały stan materiałów
        const materialState = response.data[0];
        dispatch({ type: MATERIAL_ACTIONS.LOAD_MATERIAL_DATA, payload: materialState });
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
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Zapisz do API po każdej zmianie (debounced by reducer)
  const saveMaterialsToAPI = async (materialState) => {
    try {
      // Sprawdź czy już istnieje dokument
      const response = await materialsApi.getAll();

      if (response.success && response.data && response.data.length > 0) {
        // Update istniejącego
        await materialsApi.update(response.data[0].id, materialState);
      } else {
        // Create nowego
        await materialsApi.create(materialState);
      }
    } catch (err) {
      console.error('Błąd zapisu materiałów:', err);
    }
  };

  // Backup do localStorage i sync z API
  useEffect(() => {
    localStorage.setItem('materialData', JSON.stringify(state));
    saveMaterialsToAPI(state);
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

    refreshMaterials: loadMaterialsFromAPI
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
