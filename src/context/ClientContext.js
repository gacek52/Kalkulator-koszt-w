import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { clientsApi } from '../services/api';
import { useAuth } from './AuthContext';

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

// Stan początkowy (puste - dane z Firestore)
const initialState = {
  clients: [],
  nextClientId: 1
};

// Reducer
function clientReducer(state, action) {
  switch (action.type) {
    case CLIENT_ACTIONS.ADD_CLIENT: {
      return {
        ...state,
        clients: [...state.clients, action.payload],
        nextClientId: state.nextClientId + 1
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
  // Znajdź klienta po ID (obsługuje string i number)
  getClientById: (state, clientId) => {
    return state.clients.find(c => c.id == clientId);
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
  const { currentUser, isAdmin } = useAuth();
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
        // API zwraca tablicę dokumentów - użyj jej bezpośrednio
        const clients = response.data;

        // Oblicz nextClientId na podstawie największego ID w bazie
        const maxId = clients.length > 0 ? Math.max(...clients.map(c => parseInt(c.id) || 0), 0) : 0;

        dispatch({
          type: CLIENT_ACTIONS.LOAD_CLIENTS,
          payload: {
            clients: clients,
            nextClientId: maxId + 1
          }
        });

        // Zapisz do localStorage jako backup
        localStorage.setItem('clientData', JSON.stringify({
          clients: clients,
          nextClientId: maxId + 1
        }));
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
          // Brak danych - pozostaw pusty state
          dispatch({
            type: CLIENT_ACTIONS.LOAD_CLIENTS,
            payload: {
              clients: [],
              nextClientId: 1
            }
          });
        }
      } else {
        // Brak danych w localStorage - pozostaw pusty state
        console.log('Brak danych klientów - załaduj z Firestore przez initializeDatabase');
      }
    } finally {
      setLoading(false);
    }
  };

  // Backup do localStorage (zawsze)
  useEffect(() => {
    const stateToSave = {
      clients: state.clients,
      nextClientId: state.nextClientId
    };

    if (state.clients.length > 0) {
      localStorage.setItem('clientData', JSON.stringify(stateToSave));
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

      // ADMIN - zapisz bezpośrednio do Firestore
      if (isAdmin) {
        try {
          const response = await clientsApi.create(clientData);
          if (response.success) {
            // Odśwież listę z API
            await loadClientsFromAPI();
            return response.data;
          }
        } catch (err) {
          console.error('Błąd dodawania klienta do API:', err);
          alert('Nie udało się dodać klienta do bazy danych');
          return false;
        }
      }

      // USER - zapisz tylko lokalnie (z nowym ID)
      const newClient = {
        ...clientData,
        id: `local-${state.nextClientId}`, // Prefix 'local-' dla rozróżnienia
        isLocal: true // Flaga że to dane lokalne
      };

      dispatch({
        type: CLIENT_ACTIONS.ADD_CLIENT,
        payload: newClient
      });

      return newClient;
    },

    updateClient: async (id, updates) => {
      // ADMIN - aktualizuj w Firestore (tylko jeśli nie jest lokalny)
      if (isAdmin && !id.toString().startsWith('local-')) {
        try {
          const response = await clientsApi.update(id, updates);
          if (response.success) {
            // Odśwież listę z API
            await loadClientsFromAPI();
            return;
          }
        } catch (err) {
          console.error('Błąd aktualizacji klienta w API:', err);
          alert('Nie udało się zaktualizować klienta w bazie danych');
        }
      }

      // USER lub klient lokalny - aktualizuj tylko w state
      dispatch({
        type: CLIENT_ACTIONS.UPDATE_CLIENT,
        payload: { id, updates: { ...updates, id } }
      });
    },

    removeClient: async (id) => {
      if (!window.confirm('Czy na pewno chcesz usunąć tego klienta?')) {
        return false;
      }

      // ADMIN - usuń z Firestore (tylko jeśli nie jest lokalny)
      if (isAdmin && !id.toString().startsWith('local-')) {
        try {
          const response = await clientsApi.delete(id);
          if (response.success) {
            // Odśwież listę z API
            await loadClientsFromAPI();
            return true;
          }
        } catch (err) {
          console.error('Błąd usuwania klienta z API:', err);
          alert('Nie udało się usunąć klienta z bazy danych');
          return false;
        }
      }

      // USER lub klient lokalny - usuń tylko z state
      dispatch({
        type: CLIENT_ACTIONS.REMOVE_CLIENT,
        payload: { id }
      });

      return true;
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
    },

    // Manualne pchnięcie danych do Firestore (tylko dla admin)
    pushToFirestore: async () => {
      if (!isAdmin) {
        throw new Error('Tylko admin może zapisywać do Firestore');
      }

      try {
        // Filtruj tylko klientów globalnych (bez prefix 'local-')
        const globalClients = state.clients.filter(client => !client.id.toString().startsWith('local-'));

        // Pobierz istniejące klienty z bazy
        const response = await clientsApi.getAll();
        const existingClients = response.success && response.data ? response.data : [];
        const existingIds = new Set(existingClients.map(c => c.id));

        let created = 0;
        let updated = 0;

        // Zapisz każdego klienta
        for (const client of globalClients) {
          if (existingIds.has(client.id)) {
            // Klient już istnieje - aktualizuj
            await clientsApi.update(client.id, client);
            updated++;
          } else {
            // Nowy klient - utwórz
            await clientsApi.create(client);
            created++;
          }
        }

        return {
          success: true,
          message: `Zapisano ${created + updated} klientów do Firestore (${created} nowych, ${updated} zaktualizowanych)`
        };
      } catch (error) {
        console.error('Błąd podczas pushowania klientów:', error);
        throw new Error('Nie udało się zapisać klientów do Firestore');
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
