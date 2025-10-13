import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { catalogApi } from '../services/api';
import { useAuth } from './AuthContext';

// Akcje dla reducer'a
const CATALOG_ACTIONS = {
  ADD_CALCULATION: 'ADD_CALCULATION',
  UPDATE_CALCULATION: 'UPDATE_CALCULATION',
  REMOVE_CALCULATION: 'REMOVE_CALCULATION',
  SET_FILTER: 'SET_FILTER',
  SET_SORT: 'SET_SORT',
  SET_CAPACITY_FILTERS: 'SET_CAPACITY_FILTERS',
  TOGGLE_CALCULATION_FOR_CAPACITY: 'TOGGLE_CALCULATION_FOR_CAPACITY',
  LOAD_CATALOG_DATA: 'LOAD_CATALOG_DATA',
  RESET_CATALOG_STATE: 'RESET_CATALOG_STATE'
};

// Status kalkulacji
export const CALCULATION_STATUS = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  SENT: 'sent',
  NOMINATED: 'nominated',
  NOT_NOMINATED: 'not_nominated'
};

export const STATUS_LABELS = {
  [CALCULATION_STATUS.DRAFT]: '-',
  [CALCULATION_STATUS.IN_PROGRESS]: 'W trakcie',
  [CALCULATION_STATUS.SENT]: 'Wysłane',
  [CALCULATION_STATUS.NOMINATED]: 'Nominacja',
  [CALCULATION_STATUS.NOT_NOMINATED]: 'Brak nominacji'
};

// Początkowy stan
const initialCatalogState = {
  calculations: [], // Array of calculation objects
  nextCalculationId: 1,
  filters: {
    client: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    partSearch: '', // Wyszukiwanie po ID części lub nazwie
    calculationId: '', // Wyszukiwanie po ID kalkulacji
    showOnlyWithNotes: false, // Pokaż tylko kalkulacje z notatkami
    showOnlyMine: true // Pokaż tylko moje kalkulacje (domyślnie włączone)
  },
  sortBy: 'date', // 'date', 'client', 'calculationId', 'status', 'revenue', 'profit'
  sortOrder: 'desc', // 'asc' or 'desc'
  capacityFilters: {
    includeDraft: false,
    includeInProgress: false,
    includeSent: false,
    includeNominated: true, // Domyślnie włączone
    includeNotNominated: false,
    customSelectedIds: [] // Ręcznie zaznaczone kalkulacje
  }
};

// Reducer dla zarządzania stanem katalogu
function catalogReducer(state, action) {
  switch (action.type) {
    case CATALOG_ACTIONS.ADD_CALCULATION:
      return {
        ...state,
        calculations: [...state.calculations, action.payload]
      };

    case CATALOG_ACTIONS.UPDATE_CALCULATION:
      return {
        ...state,
        calculations: state.calculations.map(calc =>
          calc.id === action.payload.id
            ? action.payload.updates
            : calc
        )
      };

    case CATALOG_ACTIONS.REMOVE_CALCULATION:
      return {
        ...state,
        calculations: state.calculations.filter(calc => calc.id !== action.payload)
      };

    case CATALOG_ACTIONS.SET_FILTER:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case CATALOG_ACTIONS.SET_SORT:
      return {
        ...state,
        sortBy: action.payload.sortBy || state.sortBy,
        sortOrder: action.payload.sortOrder || state.sortOrder
      };

    case CATALOG_ACTIONS.SET_CAPACITY_FILTERS:
      return {
        ...state,
        capacityFilters: { ...state.capacityFilters, ...action.payload }
      };

    case CATALOG_ACTIONS.TOGGLE_CALCULATION_FOR_CAPACITY:
      const calcId = action.payload;
      const customIds = state.capacityFilters.customSelectedIds;
      const isSelected = customIds.includes(calcId);

      return {
        ...state,
        capacityFilters: {
          ...state.capacityFilters,
          customSelectedIds: isSelected
            ? customIds.filter(id => id !== calcId)
            : [...customIds, calcId]
        }
      };

    case CATALOG_ACTIONS.LOAD_CATALOG_DATA:
      // Merguj z initialState żeby mieć pewność że capacityFilters istnieje
      return {
        ...initialCatalogState,
        ...action.payload,
        capacityFilters: action.payload.capacityFilters || initialCatalogState.capacityFilters
      };

    case CATALOG_ACTIONS.RESET_CATALOG_STATE:
      return { ...initialCatalogState };

    default:
      return state;
  }
}

// Helper functions for catalog
export const catalogUtils = {
  // Oblicz całkowity obrót (revenue) z detali
  calculateTotalRevenue: (items) => {
    return items.reduce((sum, item) => {
      if (item.results && item.annualVolume) {
        const unitRevenue = item.results.totalWithSGA || 0;
        return sum + (unitRevenue * parseFloat(item.annualVolume || 0));
      }
      return sum;
    }, 0);
  },

  // Oblicz całkowity przychód (profit = revenue - costs)
  calculateTotalProfit: (items, marginPercent = 0) => {
    const revenue = catalogUtils.calculateTotalRevenue(items);
    // Profit is calculated from margin percentage
    return revenue * (parseFloat(marginPercent) / 100);
  },

  // Filtrowanie kalkulacji
  filterCalculations: (calculations, filters, currentUserId = null) => {
    return calculations.filter(calc => {
      if (filters.calculationId && !calc.id?.toString().toLowerCase().includes(filters.calculationId.toLowerCase())) {
        return false;
      }
      if (filters.client && !calc.client?.toLowerCase().includes(filters.client.toLowerCase())) {
        return false;
      }
      if (filters.status && calc.status !== filters.status) {
        return false;
      }
      if (filters.dateFrom) {
        const calcDate = new Date(calc.createdDate);
        const filterDate = new Date(filters.dateFrom);
        if (calcDate < filterDate) return false;
      }
      if (filters.dateTo) {
        const calcDate = new Date(calc.createdDate);
        const filterDate = new Date(filters.dateTo);
        if (calcDate > filterDate) return false;
      }
      // Filtrowanie po ID części lub nazwie zakładki
      if (filters.partSearch) {
        const searchLower = filters.partSearch.toLowerCase();
        const hasMatchingPart = calc.items?.some(item =>
          item.partId?.toLowerCase().includes(searchLower) ||
          item.tabName?.toLowerCase().includes(searchLower)
        );
        if (!hasMatchingPart) return false;
      }
      // Filtrowanie - tylko z notatkami
      if (filters.showOnlyWithNotes) {
        if (!calc.notes || calc.notes.trim() === '') {
          return false;
        }
      }
      // Filtrowanie - tylko moje kalkulacje
      if (filters.showOnlyMine && currentUserId) {
        if (calc.ownerId !== currentUserId) {
          return false;
        }
      }
      return true;
    });
  },

  // Filtrowanie kalkulacji dla capacity dashboard
  filterCalculationsForCapacity: (calculations, capacityFilters) => {
    return calculations.filter(calc => {
      // Jeśli jest w customSelectedIds, zawsze włącz
      if (capacityFilters.customSelectedIds.includes(calc.id)) {
        return true;
      }

      // W przeciwnym razie sprawdź status
      switch (calc.status) {
        case CALCULATION_STATUS.DRAFT:
          return capacityFilters.includeDraft;
        case CALCULATION_STATUS.IN_PROGRESS:
          return capacityFilters.includeInProgress;
        case CALCULATION_STATUS.SENT:
          return capacityFilters.includeSent;
        case CALCULATION_STATUS.NOMINATED:
          return capacityFilters.includeNominated;
        case CALCULATION_STATUS.NOT_NOMINATED:
          return capacityFilters.includeNotNominated;
        default:
          return false;
      }
    });
  },

  // Sortowanie kalkulacji
  sortCalculations: (calculations, sortBy, sortOrder) => {
    const sorted = [...calculations].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.modifiedDate || a.createdDate);
          bVal = new Date(b.modifiedDate || b.createdDate);
          break;
        case 'client':
          aVal = (a.client || '').toLowerCase();
          bVal = (b.client || '').toLowerCase();
          break;
        case 'calculationId':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'revenue':
          aVal = a.totalRevenue || 0;
          bVal = b.totalRevenue || 0;
          break;
        case 'profit':
          aVal = a.totalProfit || 0;
          bVal = b.totalProfit || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }
};

// Context
const CatalogContext = createContext();

// Provider component
export function CatalogProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, dispatch] = useReducer(catalogReducer, initialCatalogState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pobierz dane z API przy starcie
  useEffect(() => {
    loadCalculationsFromAPI();
  }, []);

  // Funkcja do pobierania danych z API
  const loadCalculationsFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await catalogApi.getAll();

      if (response.success && response.data) {
        // Przekształć dane z API do formatu state
        const catalogState = {
          calculations: response.data,
          nextCalculationId: Math.max(...response.data.map(c => parseInt(c.id) || 0), 0) + 1,
          filters: initialCatalogState.filters,
          sortBy: initialCatalogState.sortBy,
          sortOrder: initialCatalogState.sortOrder,
          capacityFilters: initialCatalogState.capacityFilters
        };

        dispatch({ type: CATALOG_ACTIONS.LOAD_CATALOG_DATA, payload: catalogState });
      }
    } catch (err) {
      console.error('Błąd wczytywania katalogu z API:', err);
      setError(err.message || 'Nie udało się załadować katalogu');

      // Fallback do localStorage jeśli API nie działa
      const savedData = localStorage.getItem('catalogData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          dispatch({ type: CATALOG_ACTIONS.LOAD_CATALOG_DATA, payload: parsedData });
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
    if (state.calculations.length > 0) {
      localStorage.setItem('catalogData', JSON.stringify(state));
    }
  }, [state]);

  // Action creators
  const actions = {
    addCalculation: async (calculation) => {
      try {
        setLoading(true);
        setError(null);

        const newCalc = {
          ...calculation,
          status: calculation.status || CALCULATION_STATUS.DRAFT,
          ownerId: currentUser?.uid || null,
          ownerName: currentUser?.displayName || currentUser?.email || 'Nieznany użytkownik'
        };

        const response = await catalogApi.create(newCalc);

        if (response.success && response.data) {
          dispatch({
            type: CATALOG_ACTIONS.ADD_CALCULATION,
            payload: response.data
          });
          return response.data;
        }
      } catch (err) {
        console.error('Błąd dodawania kalkulacji:', err);
        setError(err.message || 'Nie udało się dodać kalkulacji');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    updateCalculation: async (id, updates) => {
      try {
        setLoading(true);
        setError(null);

        // Dodaj ownerId jeśli go nie ma (dla kompatybilności wstecznej)
        const updatedCalc = {
          ...updates,
          ownerId: updates.ownerId || currentUser?.uid || null,
          ownerName: updates.ownerName || currentUser?.displayName || currentUser?.email || 'Nieznany użytkownik'
        };

        const response = await catalogApi.update(id, updatedCalc);

        if (response.success && response.data) {
          dispatch({
            type: CATALOG_ACTIONS.UPDATE_CALCULATION,
            payload: { id, updates: response.data }
          });
          return response.data;
        }
      } catch (err) {
        console.error('Błąd aktualizacji kalkulacji:', err);
        setError(err.message || 'Nie udało się zaktualizować kalkulacji');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    removeCalculation: async (id) => {
      try {
        setLoading(true);
        setError(null);

        const response = await catalogApi.delete(id);

        if (response.success) {
          dispatch({
            type: CATALOG_ACTIONS.REMOVE_CALCULATION,
            payload: id
          });
          return true;
        }
      } catch (err) {
        console.error('Błąd usuwania kalkulacji:', err);
        setError(err.message || 'Nie udało się usunąć kalkulacji');
        throw err;
      } finally {
        setLoading(false);
      }
    },

    refreshCatalog: loadCalculationsFromAPI,

    setFilter: (filters) => dispatch({
      type: CATALOG_ACTIONS.SET_FILTER,
      payload: filters
    }),

    setSort: (sortBy, sortOrder) => dispatch({
      type: CATALOG_ACTIONS.SET_SORT,
      payload: { sortBy, sortOrder }
    }),

    setCapacityFilters: (filters) => dispatch({
      type: CATALOG_ACTIONS.SET_CAPACITY_FILTERS,
      payload: filters
    }),

    toggleCalculationForCapacity: (calcId) => dispatch({
      type: CATALOG_ACTIONS.TOGGLE_CALCULATION_FOR_CAPACITY,
      payload: calcId
    }),

    loadCatalogData: (data) => dispatch({
      type: CATALOG_ACTIONS.LOAD_CATALOG_DATA,
      payload: data
    }),

    resetCatalogState: () => dispatch({
      type: CATALOG_ACTIONS.RESET_CATALOG_STATE
    })
  };

  // Oblicz filtrowane i posortowane kalkulacje (z uwzględnieniem currentUser)
  const filteredCalculations = catalogUtils.filterCalculations(
    state.calculations,
    state.filters,
    currentUser?.uid
  );
  const sortedCalculations = catalogUtils.sortCalculations(filteredCalculations, state.sortBy, state.sortOrder);

  // Oblicz sumaryczne wartości - zsumuj obrót i przychód z każdej kalkulacji
  const summary = sortedCalculations.reduce((acc, calc) => {
    calc.items.forEach(item => {
      const annualVolume = parseFloat(item.annualVolume || 0);
      const unitCost = item.results?.totalWithSGA || 0;
      const marginPercent = parseFloat(item.margin || 0);
      const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;

      acc.totalRevenue += annualVolume * unitCost;
      acc.totalProfit += annualVolume * unitMargin;
    });
    return acc;
  }, {
    totalRevenue: 0,
    totalProfit: 0,
    count: sortedCalculations.length
  });

  return (
    <CatalogContext.Provider value={{
      state,
      actions,
      utils: catalogUtils,
      filteredCalculations: sortedCalculations,
      summary,
      loading,
      error
    }}>
      {children}
    </CatalogContext.Provider>
  );
}

// Hook do używania kontekstu katalogu
export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog musi być używane wewnątrz CatalogProvider');
  }
  return context;
}

export { CATALOG_ACTIONS };