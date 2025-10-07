import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { clientsApi } from '../services/api';

/**
 * Kontekst zarządzania klientami
 */

// Typy akcji
const CLIENT_ACTIONS = {
  ADD_CLIENT: 'ADD_CLIENT',
  UPDATE_CLIENT: 'UPDATE_CLIENT',
  REMOVE_CLIENT: 'REMOVE_CLIENT',
  LOAD_CLIENTS: 'LOAD_CLIENTS',
  RESET_CLIENTS: 'RESET_CLIENTS'
};

// Domyślni klienci (przykładowe dane)
const defaultClients = [
  {
    id: 1,
    name: 'Tenneco Polska',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Rybnik',
    country: 'Polska',
    notes: ''
  },
  {
    id: 2,
    name: 'Tenneco Edenkoben',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Edenkoben',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: 3,
    name: 'Tenneco Edenkoben Prototypy',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Edenkoben',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: 4,
    name: 'Tenneco Zwickau',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Zwickau',
    country: 'Niemcy',
    notes: ''
  },
  {
    id: 5,
    name: 'Purem Tondela',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Tondela',
    country: 'Portugalia',
    notes: ''
  },
  {
    id: 6,
    name: 'Purem Rakovnik',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Rakovnik',
    country: 'Czechy',
    notes: ''
  },
  {
    id: 7,
    name: 'Purem Neunkirchen',
    code: '',
    nip: '',
    address: '',
    postalCode: '',
    city: 'Neunkirchen',
    country: 'Niemcy',
    notes: ''
  }
];

// Stan początkowy
const initialState = {
  clients: defaultClients,
  nextClientId: 8
};

// Reducer
function clientReducer(state, action) {
  switch (action.type) {
    case CLIENT_ACTIONS.ADD_CLIENT: {
      return {
        ...state,
        clients: [...state.clients, action.payload]
      };
    }

    case CLIENT_ACTIONS.UPDATE_CLIENT: {
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id
            ? action.payload.updates
            : client
        )
      };
    }

    case CLIENT_ACTIONS.REMOVE_CLIENT: {
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload.id)
      };
    }

    case CLIENT_ACTIONS.LOAD_CLIENTS: {
      return {
        ...state,
        clients: action.payload.clients,
        nextClientId: action.payload.nextClientId
      };
    }

    case CLIENT_ACTIONS.RESET_CLIENTS: {
      return initialState;
    }

    default:
      return state;
  }
}

// Utility functions
export const clientUtils = {
  // Znajdź klienta po ID
  getClientById: (state, clientId) => {
    return state.clients.find(c => c.id === clientId);
  },

  // Znajdź klienta po kodzie
  getClientByCode: (state, code) => {
    return state.clients.find(c => c.code === code);
  },

  // Wyszukaj klientów
  searchClients: (state, searchTerm) => {
    if (!searchTerm) return state.clients;
    const term = searchTerm.toLowerCase();
    return state.clients.filter(client =>
      client.name?.toLowerCase().includes(term) ||
      client.code?.toLowerCase().includes(term) ||
      client.city?.toLowerCase().includes(term)
    );
  },

  // Walidacja klienta
  validateClient: (client) => {
    const errors = [];
    if (!client.name || client.name.trim() === '') {
      errors.push('Nazwa klienta jest wymagana');
    }
    return errors;
  },

  // Eksport danych do JSON
  exportToJson: (state) => {
    return JSON.stringify({
      clients: state.clients,
      nextClientId: state.nextClientId,
      exportDate: new Date().toISOString()
    }, null, 2);
  },

  // Import danych z JSON
  importFromJson: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      return {
        clients: data.clients || [],
        nextClientId: data.nextClientId || (data.clients?.length || 0) + 1
      };
    } catch (error) {
      throw new Error('Nieprawidłowy format JSON');
    }
  }
};

// Kontekst
const ClientContext = createContext();

// Provider
export function ClientProvider({ children }) {
  const [state, dispatch] = useReducer(clientReducer, initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pobierz dane z API przy starcie
  useEffect(() => {
    loadClientsFromAPI();
  }, []);

  const loadClientsFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await clientsApi.getAll();

      if (response.success && response.data) {
        dispatch({
          type: CLIENT_ACTIONS.LOAD_CLIENTS,
          payload: {
            clients: response.data,
            nextClientId: Math.max(...response.data.map(c => parseInt(c.id) || 0), 0) + 1
          }
        });
      }
    } catch (err) {
      console.error('Błąd wczytywania klientów z API:', err);
      setError(err.message || 'Nie udało się załadować klientów');

      // Fallback do localStorage
      const savedData = localStorage.getItem('clientData');
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          dispatch({
            type: CLIENT_ACTIONS.LOAD_CLIENTS,
            payload: data
          });
        } catch (error) {
          console.error('Błąd wczytywania z localStorage:', error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Backup do localStorage (cache)
  useEffect(() => {
    if (state.clients.length > 0) {
      localStorage.setItem('clientData', JSON.stringify({
        clients: state.clients,
        nextClientId: state.nextClientId
      }));
    }
  }, [state]);

  // Akcje
  const actions = {
    addClient: async (clientData) => {
      const errors = clientUtils.validateClient(clientData);
      if (errors.length > 0) {
        alert(`Błąd walidacji:\n${errors.join('\n')}`);
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await clientsApi.create(clientData);

        if (response.success && response.data) {
          dispatch({
            type: CLIENT_ACTIONS.ADD_CLIENT,
            payload: response.data
          });
          return response.data;
        }
      } catch (err) {
        console.error('Błąd dodawania klienta:', err);
        setError(err.message || 'Nie udało się dodać klienta');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    updateClient: async (id, updates) => {
      try {
        setLoading(true);
        setError(null);

        const response = await clientsApi.update(id, updates);

        if (response.success && response.data) {
          dispatch({
            type: CLIENT_ACTIONS.UPDATE_CLIENT,
            payload: { id, updates: response.data }
          });
          return response.data;
        }
      } catch (err) {
        console.error('Błąd aktualizacji klienta:', err);
        setError(err.message || 'Nie udało się zaktualizować klienta');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    removeClient: async (id) => {
      if (!window.confirm('Czy na pewno chcesz usunąć tego klienta?')) {
        return false;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await clientsApi.delete(id);

        if (response.success) {
          dispatch({
            type: CLIENT_ACTIONS.REMOVE_CLIENT,
            payload: { id }
          });
          return true;
        }
      } catch (err) {
        console.error('Błąd usuwania klienta:', err);
        setError(err.message || 'Nie udało się usunąć klienta');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    refreshClients: loadClientsFromAPI,

    loadClients: (data) => {
      dispatch({
        type: CLIENT_ACTIONS.LOAD_CLIENTS,
        payload: data
      });
    },

    resetClients: () => {
      if (window.confirm('Czy na pewno chcesz zresetować wszystkich klientów do wartości domyślnych?')) {
        dispatch({
          type: CLIENT_ACTIONS.RESET_CLIENTS
        });
      }
    }
  };

  return (
    <ClientContext.Provider value={{
      state,
      actions,
      utils: clientUtils,
      loading,
      error
    }}>
      {children}
    </ClientContext.Provider>
  );
}

// Hook do używania kontekstu
export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient musi być używane wewnątrz ClientProvider');
  }
  return context;
}
