import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { catalogApi } from '../services/api';

// Akcje dla reducer'a
const CATALOG_ACTIONS = {
  ADD_CALCULATION: 'ADD_CALCULATION',
  UPDATE_CALCULATION: 'UPDATE_CALCULATION',
  REMOVE_CALCULATION: 'REMOVE_CALCULATION',
  SET_FILTER: 'SET_FILTER',
  SET_SORT: 'SET_SORT',
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
    dateTo: ''
  },
  sortBy: 'date', // 'date', 'client', 'calculationId', 'status', 'revenue', 'profit'
  sortOrder: 'desc' // 'asc' or 'desc'
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

    case CATALOG_ACTIONS.LOAD_CATALOG_DATA:
      return { ...action.payload };

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
  filterCalculations: (calculations, filters) => {
    return calculations.filter(calc => {
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
      return true;
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
          sortOrder: initialCatalogState.sortOrder
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
          status: calculation.status || CALCULATION_STATUS.DRAFT
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

        const response = await catalogApi.update(id, updates);

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

    loadCatalogData: (data) => dispatch({
      type: CATALOG_ACTIONS.LOAD_CATALOG_DATA,
      payload: data
    }),

    resetCatalogState: () => dispatch({
      type: CATALOG_ACTIONS.RESET_CATALOG_STATE
    })
  };

  // Oblicz filtrowane i posortowane kalkulacje
  const filteredCalculations = catalogUtils.filterCalculations(state.calculations, state.filters);
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