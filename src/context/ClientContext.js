import React, { createContext, useContext, useReducer, useEffect } from 'react';

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
      const newClient = {
        ...action.payload,
        id: state.nextClientId
      };
      return {
        ...state,
        clients: [...state.clients, newClient],
        nextClientId: state.nextClientId + 1
      };
    }

    case CLIENT_ACTIONS.UPDATE_CLIENT: {
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id
            ? { ...client, ...action.payload.updates }
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

  // Załaduj dane z localStorage przy starcie
  useEffect(() => {
    const savedData = localStorage.getItem('clientData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        dispatch({
          type: CLIENT_ACTIONS.LOAD_CLIENTS,
          payload: data
        });
      } catch (error) {
        console.error('Error loading client data:', error);
      }
    }
  }, []);

  // Zapisz dane do localStorage przy każdej zmianie
  useEffect(() => {
    localStorage.setItem('clientData', JSON.stringify({
      clients: state.clients,
      nextClientId: state.nextClientId
    }));
  }, [state]);

  // Akcje
  const actions = {
    addClient: (clientData) => {
      const errors = clientUtils.validateClient(clientData);
      if (errors.length > 0) {
        alert(`Błąd walidacji:\n${errors.join('\n')}`);
        return false;
      }
      dispatch({
        type: CLIENT_ACTIONS.ADD_CLIENT,
        payload: clientData
      });
      return true;
    },

    updateClient: (id, updates) => {
      dispatch({
        type: CLIENT_ACTIONS.UPDATE_CLIENT,
        payload: { id, updates }
      });
    },

    removeClient: (id) => {
      if (window.confirm('Czy na pewno chcesz usunąć tego klienta?')) {
        dispatch({
          type: CLIENT_ACTIONS.REMOVE_CLIENT,
          payload: { id }
        });
      }
    },

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
    <ClientContext.Provider value={{ state, actions, utils: clientUtils }}>
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
