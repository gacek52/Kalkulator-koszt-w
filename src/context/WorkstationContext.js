import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Akcje dla reducer'a
const WORKSTATION_ACTIONS = {
  ADD_WORKSTATION: 'ADD_WORKSTATION',
  UPDATE_WORKSTATION: 'UPDATE_WORKSTATION',
  REMOVE_WORKSTATION: 'REMOVE_WORKSTATION',
  DUPLICATE_WORKSTATION: 'DUPLICATE_WORKSTATION',
  LOAD_WORKSTATION_DATA: 'LOAD_WORKSTATION_DATA',
  RESET_WORKSTATION_STATE: 'RESET_WORKSTATION_STATE'
};

// Początkowy stan
const initialWorkstationState = {
  workstations: [],
  nextWorkstationId: 1
};

// Reducer dla zarządzania stanem stanowisk
function workstationReducer(state, action) {
  switch (action.type) {
    case WORKSTATION_ACTIONS.ADD_WORKSTATION:
      return {
        ...state,
        workstations: [...state.workstations, { ...action.payload, id: state.nextWorkstationId }],
        nextWorkstationId: state.nextWorkstationId + 1
      };

    case WORKSTATION_ACTIONS.UPDATE_WORKSTATION:
      return {
        ...state,
        workstations: state.workstations.map(ws =>
          ws.id === action.payload.id
            ? { ...ws, ...action.payload.updates }
            : ws
        )
      };

    case WORKSTATION_ACTIONS.REMOVE_WORKSTATION:
      return {
        ...state,
        workstations: state.workstations.filter(ws => ws.id !== action.payload)
      };

    case WORKSTATION_ACTIONS.DUPLICATE_WORKSTATION:
      const workstationToDuplicate = state.workstations.find(ws => ws.id === action.payload);
      if (!workstationToDuplicate) return state;

      const duplicatedWorkstation = {
        ...workstationToDuplicate,
        id: state.nextWorkstationId,
        name: `${workstationToDuplicate.name} (kopia)`
      };

      return {
        ...state,
        workstations: [...state.workstations, duplicatedWorkstation],
        nextWorkstationId: state.nextWorkstationId + 1
      };

    case WORKSTATION_ACTIONS.LOAD_WORKSTATION_DATA:
      return { ...action.payload };

    case WORKSTATION_ACTIONS.RESET_WORKSTATION_STATE:
      return { ...initialWorkstationState };

    default:
      return state;
  }
}

// Helper functions for workstation calculations
export const workstationUtils = {
  // Oblicz dostępną capacity w godzinach na rok
  calculateYearlyCapacity: (workstation) => {
    const { shiftsPerDay = 1, hoursPerShift = 8, workDaysPerWeek = 5, holidaysPerYear = 10, efficiency = 0.85 } = workstation;

    // (52 tygodnie * dni robocze - święta) * zmiany * godziny/zmianę * efektywność
    const workDaysPerYear = (52 * workDaysPerWeek) - holidaysPerYear;
    const availableHours = workDaysPerYear * shiftsPerDay * hoursPerShift * efficiency;

    return Math.round(availableHours);
  },

  // Oblicz dostępną capacity miesięczną
  calculateMonthlyCapacity: (workstation) => {
    const yearlyCapacity = workstationUtils.calculateYearlyCapacity(workstation);
    return Math.round(yearlyCapacity / 12);
  },

  // Oblicz wykorzystanie capacity (w przyszłości)
  calculateUtilization: (workstation, usedHours) => {
    const availableHours = workstationUtils.calculateYearlyCapacity(workstation);
    if (availableHours === 0) return 0;
    return (usedHours / availableHours) * 100;
  }
};

// Context
const WorkstationContext = createContext();

// Provider component
export function WorkstationProvider({ children }) {
  const [state, dispatch] = useReducer(workstationReducer, initialWorkstationState);

  // Załaduj dane z localStorage przy starcie
  useEffect(() => {
    const savedData = localStorage.getItem('workstationData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        dispatch({ type: WORKSTATION_ACTIONS.LOAD_WORKSTATION_DATA, payload: parsedData });
      } catch (error) {
        console.error('Błąd wczytywania stanowisk z localStorage:', error);
      }
    }
  }, []);

  // Zapisz do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem('workstationData', JSON.stringify(state));
  }, [state]);

  // Action creators
  const actions = {
    addWorkstation: (workstation) => {
      dispatch({
        type: WORKSTATION_ACTIONS.ADD_WORKSTATION,
        payload: workstation
      });
    },

    updateWorkstation: (id, updates) => {
      dispatch({
        type: WORKSTATION_ACTIONS.UPDATE_WORKSTATION,
        payload: { id, updates }
      });
    },

    removeWorkstation: (id) => {
      dispatch({
        type: WORKSTATION_ACTIONS.REMOVE_WORKSTATION,
        payload: id
      });
    },

    duplicateWorkstation: (id) => {
      dispatch({
        type: WORKSTATION_ACTIONS.DUPLICATE_WORKSTATION,
        payload: id
      });
    },

    loadWorkstationData: (data) => {
      dispatch({
        type: WORKSTATION_ACTIONS.LOAD_WORKSTATION_DATA,
        payload: data
      });
    },

    resetWorkstationState: () => {
      dispatch({
        type: WORKSTATION_ACTIONS.RESET_WORKSTATION_STATE
      });
    }
  };

  return (
    <WorkstationContext.Provider value={{
      state,
      actions,
      utils: workstationUtils
    }}>
      {children}
    </WorkstationContext.Provider>
  );
}

// Hook do używania kontekstu stanowisk
export function useWorkstation() {
  const context = useContext(WorkstationContext);
  if (!context) {
    throw new Error('useWorkstation musi być używane wewnątrz WorkstationProvider');
  }
  return context;
}

export { WORKSTATION_ACTIONS };
