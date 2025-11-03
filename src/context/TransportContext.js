import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const TransportContext = createContext();

// Akcje dla reducer'a
const TRANSPORT_ACTIONS = {
  ADD_TRANSPORT_TYPE: 'ADD_TRANSPORT_TYPE',
  UPDATE_TRANSPORT_TYPE: 'UPDATE_TRANSPORT_TYPE',
  REMOVE_TRANSPORT_TYPE: 'REMOVE_TRANSPORT_TYPE',
  LOAD_TRANSPORT_DATA: 'LOAD_TRANSPORT_DATA',
  RESET_TRANSPORT_STATE: 'RESET_TRANSPORT_STATE'
};

// Początkowy stan
const initialTransportState = {
  transportTypes: [],
  nextTransportId: 1
};

// Reducer dla zarządzania stanem transportu
function transportReducer(state, action) {
  switch (action.type) {
    case TRANSPORT_ACTIONS.ADD_TRANSPORT_TYPE:
      return {
        ...state,
        transportTypes: [...state.transportTypes, { ...action.payload, id: state.nextTransportId }],
        nextTransportId: state.nextTransportId + 1
      };

    case TRANSPORT_ACTIONS.UPDATE_TRANSPORT_TYPE:
      return {
        ...state,
        transportTypes: state.transportTypes.map(transport =>
          transport.id === action.payload.id
            ? { ...transport, ...action.payload.updates }
            : transport
        )
      };

    case TRANSPORT_ACTIONS.REMOVE_TRANSPORT_TYPE:
      return {
        ...state,
        transportTypes: state.transportTypes.filter(transport => transport.id !== action.payload)
      };

    case TRANSPORT_ACTIONS.LOAD_TRANSPORT_DATA:
      return { ...action.payload };

    case TRANSPORT_ACTIONS.RESET_TRANSPORT_STATE:
      return { ...initialTransportState };

    default:
      return state;
  }
}

// Helper functions
export const transportUtils = {
  // Oblicz koszt transportu na podstawie odległości
  calculateTransportCost: (transportType, distance) => {
    if (!transportType || !distance) return 0;
    return transportType.pricePerKm * distance;
  },

  // Oblicz koszt miejsca paletowego
  calculateCostPerPalletSpace: (transportType, distance) => {
    if (!transportType || !distance || !transportType.palletSpaces) return 0;
    const totalCost = transportType.pricePerKm * distance;
    return totalCost / transportType.palletSpaces;
  },

  // Oblicz koszt na detal
  calculateCostPerDetail: (transportType, distance, detailsPerPalletSpace) => {
    if (!detailsPerPalletSpace || detailsPerPalletSpace <= 0) return 0;
    const costPerSpace = transportUtils.calculateCostPerPalletSpace(transportType, distance);
    return costPerSpace / detailsPerPalletSpace;
  },

  // Sprawdź czy transport może unieść ładunek
  canCarryLoad: (transportType, totalWeight) => {
    if (!transportType || !totalWeight) return true;
    return totalWeight <= transportType.loadCapacity;
  },

  // Sprawdź czy wysokość mieści się w limicie
  canFitHeight: (transportType, totalHeight) => {
    if (!transportType || !totalHeight) return true;
    // totalHeight w mm, maxLoadHeight w m - konwersja
    return totalHeight <= (transportType.maxLoadHeight * 1000);
  }
};

export function TransportProvider({ children }) {
  const [state, dispatch] = useReducer(transportReducer, initialTransportState);
  const { currentUser } = useAuth();

  // Załaduj dane z Firestore przy montowaniu
  useEffect(() => {
    const loadTransportData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'transport'));
        const transportTypes = [];
        let maxId = 0;

        snapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          transportTypes.push(data);
          if (typeof doc.id === 'number' && doc.id > maxId) {
            maxId = doc.id;
          }
        });

        dispatch({
          type: TRANSPORT_ACTIONS.LOAD_TRANSPORT_DATA,
          payload: {
            transportTypes,
            nextTransportId: maxId + 1
          }
        });
      } catch (error) {
        console.error('Error loading transport data from Firestore:', error);
      }
    };

    loadTransportData();

    // Real-time listener
    const unsubscribe = onSnapshot(collection(db, 'transport'), (snapshot) => {
      const transportTypes = [];
      let maxId = 0;

      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        transportTypes.push(data);
        if (typeof doc.id === 'number' && doc.id > maxId) {
          maxId = doc.id;
        }
      });

      dispatch({
        type: TRANSPORT_ACTIONS.LOAD_TRANSPORT_DATA,
        payload: {
          transportTypes,
          nextTransportId: maxId + 1
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Akcje
  const actions = {
    addTransportType: (transportType) => {
      dispatch({
        type: TRANSPORT_ACTIONS.ADD_TRANSPORT_TYPE,
        payload: transportType
      });
    },

    updateTransportType: async (id, updates) => {
      dispatch({
        type: TRANSPORT_ACTIONS.UPDATE_TRANSPORT_TYPE,
        payload: { id, updates }
      });

      // Aktualizuj w Firestore
      try {
        await setDoc(doc(db, 'transport', id.toString()), {
          ...state.transportTypes.find(t => t.id === id),
          ...updates
        });
      } catch (error) {
        console.error('Error updating transport in Firestore:', error);
      }
    },

    removeTransportType: async (id) => {
      dispatch({
        type: TRANSPORT_ACTIONS.REMOVE_TRANSPORT_TYPE,
        payload: id
      });

      // Usuń z Firestore
      try {
        await deleteDoc(doc(db, 'transport', id.toString()));
      } catch (error) {
        console.error('Error removing transport from Firestore:', error);
      }
    },

    // Synchronizuj wszystkie typy transportu z Firestore
    syncToFirestore: async () => {
      try {
        for (const transport of state.transportTypes) {
          await setDoc(doc(db, 'transport', transport.id.toString()), transport);
        }
        return true;
      } catch (error) {
        console.error('Error syncing transport to Firestore:', error);
        return false;
      }
    }
  };

  const value = {
    state: {
      ...state,
      types: state.transportTypes // Alias dla kompatybilności
    },
    actions
  };

  return (
    <TransportContext.Provider value={value}>
      {children}
    </TransportContext.Provider>
  );
}

export function useTransport() {
  const context = useContext(TransportContext);
  if (!context) {
    throw new Error('useTransport must be used within TransportProvider');
  }
  return context;
}

export default TransportContext;
