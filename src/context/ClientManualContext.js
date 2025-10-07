import React, { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Kontekst zarządzania manualnymi danymi klientów (stawki, koszty, marże)
 */

// Typy akcji
const CLIENT_MANUAL_ACTIONS = {
  ADD_MANUAL: 'ADD_MANUAL',
  UPDATE_MANUAL: 'UPDATE_MANUAL',
  REMOVE_MANUAL: 'REMOVE_MANUAL',
  ADD_MATERIAL: 'ADD_MATERIAL',
  UPDATE_MATERIAL: 'UPDATE_MATERIAL',
  REMOVE_MATERIAL: 'REMOVE_MATERIAL',
  ADD_MARGIN: 'ADD_MARGIN',
  UPDATE_MARGIN: 'UPDATE_MARGIN',
  REMOVE_MARGIN: 'REMOVE_MARGIN',
  LOAD_MANUALS: 'LOAD_MANUALS',
  RESET_MANUALS: 'RESET_MANUALS'
};

// Stan początkowy
const initialState = {
  manuals: [], // Lista manuali dla różnych klientów
  nextManualId: 1
};

// Reducer
function clientManualReducer(state, action) {
  switch (action.type) {
    case CLIENT_MANUAL_ACTIONS.ADD_MANUAL: {
      const newManual = {
        ...action.payload,
        id: state.nextManualId,
        materials: [],
        nextMaterialId: 1,
        margins: [],
        nextMarginId: 1
      };
      return {
        ...state,
        manuals: [...state.manuals, newManual],
        nextManualId: state.nextManualId + 1
      };
    }

    case CLIENT_MANUAL_ACTIONS.UPDATE_MANUAL: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.id
            ? { ...manual, ...action.payload.updates }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.REMOVE_MANUAL: {
      return {
        ...state,
        manuals: state.manuals.filter(manual => manual.id !== action.payload.id)
      };
    }

    case CLIENT_MANUAL_ACTIONS.ADD_MATERIAL: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                materials: [...manual.materials, { ...action.payload.material, id: manual.nextMaterialId }],
                nextMaterialId: manual.nextMaterialId + 1
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.UPDATE_MATERIAL: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                materials: manual.materials.map(material =>
                  material.id === action.payload.materialId
                    ? { ...material, ...action.payload.updates }
                    : material
                )
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.REMOVE_MATERIAL: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                materials: manual.materials.filter(material => material.id !== action.payload.materialId)
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.ADD_MARGIN: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                margins: [...manual.margins, { ...action.payload.margin, id: manual.nextMarginId }],
                nextMarginId: manual.nextMarginId + 1
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.UPDATE_MARGIN: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                margins: manual.margins.map(margin =>
                  margin.id === action.payload.marginId
                    ? { ...margin, ...action.payload.updates }
                    : margin
                )
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.REMOVE_MARGIN: {
      return {
        ...state,
        manuals: state.manuals.map(manual =>
          manual.id === action.payload.manualId
            ? {
                ...manual,
                margins: manual.margins.filter(margin => margin.id !== action.payload.marginId)
              }
            : manual
        )
      };
    }

    case CLIENT_MANUAL_ACTIONS.LOAD_MANUALS: {
      return {
        ...state,
        manuals: action.payload.manuals,
        nextManualId: action.payload.nextManualId
      };
    }

    case CLIENT_MANUAL_ACTIONS.RESET_MANUALS: {
      return initialState;
    }

    default:
      return state;
  }
}

// Utility functions
export const clientManualUtils = {
  // Znajdź manual po ID klienta
  getManualByClientId: (state, clientId) => {
    return state.manuals.find(m => m.clientId === clientId);
  },

  // Eksport danych do JSON
  exportToJson: (state) => {
    return JSON.stringify({
      manuals: state.manuals,
      nextManualId: state.nextManualId,
      exportDate: new Date().toISOString()
    }, null, 2);
  },

  // Import danych z JSON
  importFromJson: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      return {
        manuals: data.manuals || [],
        nextManualId: data.nextManualId || (data.manuals?.length || 0) + 1
      };
    } catch (error) {
      throw new Error('Nieprawidłowy format JSON');
    }
  }
};

// Kontekst
const ClientManualContext = createContext();

// Provider
export function ClientManualProvider({ children }) {
  const [state, dispatch] = useReducer(clientManualReducer, initialState);

  // Załaduj dane z localStorage przy starcie
  useEffect(() => {
    const savedData = localStorage.getItem('clientManualData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        dispatch({
          type: CLIENT_MANUAL_ACTIONS.LOAD_MANUALS,
          payload: data
        });
      } catch (error) {
        console.error('Error loading client manual data:', error);
      }
    }
  }, []);

  // Zapisz dane do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem('clientManualData', JSON.stringify({
      manuals: state.manuals,
      nextManualId: state.nextManualId
    }));
  }, [state]);

  // Akcje
  const actions = {
    addManual: (manualData) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.ADD_MANUAL,
        payload: manualData
      });
    },

    updateManual: (id, updates) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.UPDATE_MANUAL,
        payload: { id, updates }
      });
    },

    removeManual: (id) => {
      if (window.confirm('Czy na pewno chcesz usunąć ten manual?')) {
        dispatch({
          type: CLIENT_MANUAL_ACTIONS.REMOVE_MANUAL,
          payload: { id }
        });
      }
    },

    // Materiały
    addMaterial: (manualId, material) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.ADD_MATERIAL,
        payload: { manualId, material }
      });
    },

    updateMaterial: (manualId, materialId, updates) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.UPDATE_MATERIAL,
        payload: { manualId, materialId, updates }
      });
    },

    removeMaterial: (manualId, materialId) => {
      if (window.confirm('Czy na pewno chcesz usunąć ten materiał?')) {
        dispatch({
          type: CLIENT_MANUAL_ACTIONS.REMOVE_MATERIAL,
          payload: { manualId, materialId }
        });
      }
    },

    // Marże
    addMargin: (manualId, margin) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.ADD_MARGIN,
        payload: { manualId, margin }
      });
    },

    updateMargin: (manualId, marginId, updates) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.UPDATE_MARGIN,
        payload: { manualId, marginId, updates }
      });
    },

    removeMargin: (manualId, marginId) => {
      if (window.confirm('Czy na pewno chcesz usunąć tę marżę?')) {
        dispatch({
          type: CLIENT_MANUAL_ACTIONS.REMOVE_MARGIN,
          payload: { manualId, marginId }
        });
      }
    },

    loadManuals: (data) => {
      dispatch({
        type: CLIENT_MANUAL_ACTIONS.LOAD_MANUALS,
        payload: data
      });
    },

    resetManuals: () => {
      if (window.confirm('Czy na pewno chcesz zresetować wszystkie manualne dane?')) {
        dispatch({
          type: CLIENT_MANUAL_ACTIONS.RESET_MANUALS
        });
      }
    }
  };

  return (
    <ClientManualContext.Provider value={{ state, actions, utils: clientManualUtils }}>
      {children}
    </ClientManualContext.Provider>
  );
}

// Hook do używania kontekstu
export function useClientManual() {
  const context = useContext(ClientManualContext);
  if (!context) {
    throw new Error('useClientManual musi być używane wewnątrz ClientManualProvider');
  }
  return context;
}
