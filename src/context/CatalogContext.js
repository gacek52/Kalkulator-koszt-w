import React, { createContext, useContext, useReducer, useEffect } from 'react';

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
        calculations: [...state.calculations, { ...action.payload, id: state.nextCalculationId }],
        nextCalculationId: state.nextCalculationId + 1
      };

    case CATALOG_ACTIONS.UPDATE_CALCULATION:
      return {
        ...state,
        calculations: state.calculations.map(calc =>
          calc.id === action.payload.id
            ? { ...calc, ...action.payload.updates, modifiedDate: new Date().toISOString() }
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

  // Synchronizacja z localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('catalogData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        dispatch({ type: CATALOG_ACTIONS.LOAD_CATALOG_DATA, payload: parsedData });
      } catch (error) {
        console.error('Błąd wczytywania danych katalogu z localStorage:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('catalogData', JSON.stringify(state));
  }, [state]);

  // Action creators
  const actions = {
    addCalculation: (calculation) => {
      const newCalc = {
        ...calculation,
        createdDate: new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        status: calculation.status || CALCULATION_STATUS.DRAFT
      };
      dispatch({
        type: CATALOG_ACTIONS.ADD_CALCULATION,
        payload: newCalc
      });
    },

    updateCalculation: (id, updates) => dispatch({
      type: CATALOG_ACTIONS.UPDATE_CALCULATION,
      payload: { id, updates }
    }),

    removeCalculation: (id) => dispatch({
      type: CATALOG_ACTIONS.REMOVE_CALCULATION,
      payload: id
    }),

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

  // Oblicz sumaryczne wartości
  const summary = {
    totalRevenue: sortedCalculations.reduce((sum, calc) => sum + (calc.totalRevenue || 0), 0),
    totalProfit: sortedCalculations.reduce((sum, calc) => sum + (calc.totalProfit || 0), 0),
    count: sortedCalculations.length
  };

  return (
    <CatalogContext.Provider value={{ state, actions, utils: catalogUtils, filteredCalculations: sortedCalculations, summary }}>
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