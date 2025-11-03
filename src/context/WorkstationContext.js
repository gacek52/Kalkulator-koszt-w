import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
  const [loading, setLoading] = React.useState(true);

  // Załaduj dane z Firestore i nasłuchuj zmian w czasie rzeczywistym
  useEffect(() => {
    const workstationsRef = collection(db, 'workstations');

    // Real-time listener
    const unsubscribe = onSnapshot(workstationsRef, (snapshot) => {
      const workstationsData = [];
      let maxId = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        workstationsData.push(data);
        if (data.id > maxId) {
          maxId = data.id;
        }
      });

      // Sortuj po id
      workstationsData.sort((a, b) => a.id - b.id);

      dispatch({
        type: WORKSTATION_ACTIONS.LOAD_WORKSTATION_DATA,
        payload: {
          workstations: workstationsData,
          nextWorkstationId: maxId + 1
        }
      });

      setLoading(false);
    }, (error) => {
      console.error('Error loading workstations from Firestore:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Action creators with Firestore sync
  const actions = {
    addWorkstation: async (workstation) => {
      const newId = state.nextWorkstationId;
      const newWorkstation = { ...workstation, id: newId };

      try {
        // Zapisz do Firestore (używamy id jako document ID)
        await setDoc(doc(db, 'workstations', `ws_${newId}`), newWorkstation);

        // Dispatch zostanie wywołane automatycznie przez onSnapshot listener
      } catch (error) {
        console.error('Error adding workstation to Firestore:', error);
        throw error;
      }
    },

    updateWorkstation: async (id, updates) => {
      try {
        // Znajdź stanowisko do aktualizacji
        const workstation = state.workstations.find(ws => ws.id === id);
        if (!workstation) {
          throw new Error(`Workstation with id ${id} not found`);
        }

        const updatedWorkstation = { ...workstation, ...updates };

        // Aktualizuj w Firestore
        await setDoc(doc(db, 'workstations', `ws_${id}`), updatedWorkstation);

        // Dispatch zostanie wywołane automatycznie przez onSnapshot listener
      } catch (error) {
        console.error('Error updating workstation in Firestore:', error);
        throw error;
      }
    },

    removeWorkstation: async (id) => {
      try {
        // Usuń z Firestore
        await deleteDoc(doc(db, 'workstations', `ws_${id}`));

        // Dispatch zostanie wywołane automatycznie przez onSnapshot listener
      } catch (error) {
        console.error('Error removing workstation from Firestore:', error);
        throw error;
      }
    },

    duplicateWorkstation: async (id) => {
      const workstationToDuplicate = state.workstations.find(ws => ws.id === id);
      if (!workstationToDuplicate) return;

      const newId = state.nextWorkstationId;
      const duplicatedWorkstation = {
        ...workstationToDuplicate,
        id: newId,
        name: `${workstationToDuplicate.name} (kopia)`
      };

      try {
        // Zapisz do Firestore
        await setDoc(doc(db, 'workstations', `ws_${newId}`), duplicatedWorkstation);

        // Dispatch zostanie wywołane automatycznie przez onSnapshot listener
      } catch (error) {
        console.error('Error duplicating workstation in Firestore:', error);
        throw error;
      }
    },

    loadWorkstationData: (data) => {
      // Ta funkcja jest teraz używana tylko przez onSnapshot listener
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
      utils: workstationUtils,
      loading
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
