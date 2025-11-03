import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { curvePresetsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useRole } from './RoleContext';

// Akcje dla reducer'a
const CURVE_PRESET_ACTIONS = {
  LOAD_PRESETS: 'LOAD_PRESETS',
  ADD_PRESET: 'ADD_PRESET',
  UPDATE_PRESET: 'UPDATE_PRESET',
  REMOVE_PRESET: 'REMOVE_PRESET',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

// Początkowy stan
const initialState = {
  presets: [], // Presety z bazy (nie zawierają wbudowanych)
  loading: false,
  error: null
};

// Reducer
function curvePresetReducer(state, action) {
  switch (action.type) {
    case CURVE_PRESET_ACTIONS.LOAD_PRESETS:
      return {
        ...state,
        presets: action.payload,
        loading: false,
        error: null
      };

    case CURVE_PRESET_ACTIONS.ADD_PRESET:
      return {
        ...state,
        presets: [...state.presets, action.payload]
      };

    case CURVE_PRESET_ACTIONS.UPDATE_PRESET:
      return {
        ...state,
        presets: state.presets.map(preset =>
          preset.id === action.payload.id ? action.payload : preset
        )
      };

    case CURVE_PRESET_ACTIONS.REMOVE_PRESET:
      return {
        ...state,
        presets: state.presets.filter(preset => preset.id !== action.payload)
      };

    case CURVE_PRESET_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case CURVE_PRESET_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    default:
      return state;
  }
}

// Context
const CurvePresetContext = createContext();

// Provider
export function CurvePresetProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(curvePresetReducer, initialState);

  // Pobierz presety z API przy starcie
  useEffect(() => {
    if (currentUser) {
      loadPresets();
    }
  }, [currentUser]);

  // Funkcja ładowania presetów
  const loadPresets = async () => {
    try {
      dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: true });

      const response = await curvePresetsApi.getAll();

      if (response.success && response.data) {
        dispatch({ type: CURVE_PRESET_ACTIONS.LOAD_PRESETS, payload: response.data });
      }
    } catch (error) {
      console.error('Error loading curve presets:', error);
      dispatch({ type: CURVE_PRESET_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Wszystkie presety (tylko z bazy)
  const getAllPresets = () => {
    return state.presets;
  };

  // Actions
  const actions = {
    // Pobierz wszystkie presety z bazy
    getAll: getAllPresets,

    // Pobierz preset po ID
    getById: (id) => {
      return state.presets.find(p => p.id === id);
    },

    // Utwórz nowy preset
    create: async (presetData) => {
      try {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: true });

        const response = await curvePresetsApi.create(presetData);

        if (response.success && response.data) {
          dispatch({ type: CURVE_PRESET_ACTIONS.ADD_PRESET, payload: response.data });
          return response.data;
        }
      } catch (error) {
        console.error('Error creating preset:', error);
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: false });
      }
    },

    // Aktualizuj preset
    update: async (id, updates) => {
      try {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: true });

        const response = await curvePresetsApi.update(id, updates);

        if (response.success && response.data) {
          dispatch({ type: CURVE_PRESET_ACTIONS.UPDATE_PRESET, payload: response.data });
          return response.data;
        }
      } catch (error) {
        console.error('Error updating preset:', error);
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: false });
      }
    },

    // Usuń preset
    delete: async (id) => {
      try {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: true });

        const response = await curvePresetsApi.delete(id);

        if (response.success) {
          dispatch({ type: CURVE_PRESET_ACTIONS.REMOVE_PRESET, payload: id });
          return true;
        }
      } catch (error) {
        console.error('Error deleting preset:', error);
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: CURVE_PRESET_ACTIONS.SET_LOADING, payload: false });
      }
    },

    // Odśwież listę presetów
    refresh: loadPresets
  };

  return (
    <CurvePresetContext.Provider value={{
      presets: getAllPresets(),
      loading: state.loading,
      error: state.error,
      actions
    }}>
      {children}
    </CurvePresetContext.Provider>
  );
}

// Hook
export function useCurvePresets() {
  const context = useContext(CurvePresetContext);
  if (!context) {
    throw new Error('useCurvePresets must be used within CurvePresetProvider');
  }
  return context;
}

export { CURVE_PRESET_ACTIONS };
