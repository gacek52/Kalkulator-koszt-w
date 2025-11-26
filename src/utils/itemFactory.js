/**
 * Factory functions dla tworzenia items i tabs
 *
 * Centralna definicja struktury - używana przy tworzeniu NOWYCH itemów.
 * Stare itemy pozostają nietknięte (backward compatibility).
 *
 * @module utils/itemFactory
 */

/**
 * Domyślna struktura itemu
 * UWAGA: Każda zmiana tutaj musi być backward compatible!
 */
export const DEFAULT_ITEM_STRUCTURE = {
  id: null,
  partId: '',
  description: '',
  annualVolume: '',

  // Volume forecast
  volumeForecast: {
    enabled: false,
    years: {}
  },

  // Weight mode
  weight: '',
  weightOption: 'netto',
  bruttoWeight: '',
  weightUnit: 'g',

  // Surface mode
  surfaceArea: '',
  surfaceUnit: 'mm2',
  thickness: '',
  density: '',
  surfaceWeight: '',
  surfaceCalcLocked: {
    thickness: true,
    density: true,
    surfaceWeight: false
  },
  sheetLength: '1000',
  sheetWidth: '1000',
  partsPerSheet: '',
  surfaceBrutto: '',

  // Volume mode
  volume: '',
  volumeUnit: 'mm3',
  dimensions: {
    length: '',
    width: '',
    height: ''
  },
  volumeWeightOption: 'brutto-auto',

  // Heatshield mode
  heatshield: {
    surfaceNettoInput: '',
    surfaceNetto: '',
    surfaceUnit: 'mm2',
    sheetThickness: '',
    sheetDensity: '',
    sheetPrice: '',
    sheetPriceUnit: 'kg',
    matThickness: '',
    matDensity: '',
    matPrice: '',
    matPriceUnit: 'm2',
    bendingCost: '',
    joiningCost: '0',
    gluingCost: '',
    surfaceBruttoSheet: '',
    surfaceNettoSheet: '',
    surfaceNettoMat: '',
    sheetWeight: '',
    matWeight: ''
  },

  // Multilayer mode
  multilayer: {
    layers: [{
      id: 1,
      name: 'Warstwa 1',
      thickness: '',
      density: '',
      priceUnit: 'kg',
      price: '',
      surfaceNettoInput: '',
      surfaceUnit: 'mm2',
      surfaceNetto: '',
      sheetLength: '',
      sheetWidth: '',
      partsPerSheet: '',
      surfaceBrutto: '',
      weightNetto: '',
      weightBrutto: '',
      curveScope: 'global',
      customCurveValues: {}
    }],
    nextLayerId: 2
  },

  // Common
  cleaningOption: 'scaled',
  manualCleaningTime: '45',
  margin: '',
  customValues: {},
  customCurveValues: {},
  results: null,
  unit: 'kg',

  // Workstations
  workstation: {
    id: null,
    efficiency: ''
  },
  workstations: [{
    id: 1,
    workstationId: null,
    efficiency: '',
    name: 'Stanowisko 1',
    costMode: 'auto',
    manualCost: ''
  }],
  nextWorkstationId: 2,

  // Packaging
  packaging: {
    partsPerLayer: '',
    layers: '',
    partsInBox: '',
    manualPartsInBox: false,
    compositionId: null,
    customPrice: ''
  }
};

/**
 * Tworzy nowy item z domyślnymi wartościami
 * @param {number} id - ID itemu
 * @param {object} overrides - Opcjonalne nadpisanie wartości domyślnych
 * @returns {object} Nowy item
 * @example
 * const item = createDefaultItem(1);
 * const itemWithData = createDefaultItem(2, { partId: 'ABC-123', weight: '500' });
 */
export const createDefaultItem = (id, overrides = {}) => {
  return {
    ...DEFAULT_ITEM_STRUCTURE,
    id,
    ...overrides,
    // Deep merge dla zagnieżdżonych obiektów
    volumeForecast: {
      ...DEFAULT_ITEM_STRUCTURE.volumeForecast,
      ...(overrides.volumeForecast || {})
    },
    heatshield: {
      ...DEFAULT_ITEM_STRUCTURE.heatshield,
      ...(overrides.heatshield || {})
    },
    multilayer: {
      ...DEFAULT_ITEM_STRUCTURE.multilayer,
      ...(overrides.multilayer || {}),
      layers: overrides.multilayer?.layers || DEFAULT_ITEM_STRUCTURE.multilayer.layers
    },
    workstation: {
      ...DEFAULT_ITEM_STRUCTURE.workstation,
      ...(overrides.workstation || {})
    },
    workstations: overrides.workstations || DEFAULT_ITEM_STRUCTURE.workstations,
    packaging: {
      ...DEFAULT_ITEM_STRUCTURE.packaging,
      ...(overrides.packaging || {})
    },
    dimensions: {
      ...DEFAULT_ITEM_STRUCTURE.dimensions,
      ...(overrides.dimensions || {})
    },
    surfaceCalcLocked: {
      ...DEFAULT_ITEM_STRUCTURE.surfaceCalcLocked,
      ...(overrides.surfaceCalcLocked || {})
    },
    customValues: overrides.customValues || {},
    customCurveValues: overrides.customCurveValues || {}
  };
};

/**
 * Tworzy nową zakładkę z domyślnymi wartościami
 * @param {number} id - ID zakładki
 * @param {string} name - Nazwa zakładki
 * @param {string} mode - Tryb kalkulacji (weight, surface, volume, heatshield, multilayer)
 * @returns {object} Nowa zakładka
 * @example
 * const tab = createDefaultTab(1, 'Aluminum Parts', 'weight');
 */
export const createDefaultTab = (id, name, mode = 'weight') => {
  return {
    id,
    name: name || `Material ${id}`,
    calculationType: mode,
    items: [],
    nextItemId: 1
  };
};

/**
 * Tworzy item z pending pool (CBD import)
 * @param {object} pendingItem - Item z pending pool
 * @param {number} itemId - ID do przypisania
 * @returns {object} Nowy item
 * @example
 * const pendingItem = { partId: 'ABC-123', annualVolume: 5000, volumeForecast: {...} };
 * const item = createItemFromPending(pendingItem, 1);
 */
export const createItemFromPending = (pendingItem, itemId) => {
  return createDefaultItem(itemId, {
    partId: pendingItem.partId,
    description: pendingItem.description || '',
    annualVolume: pendingItem.annualVolume?.toString() || '',
    volumeForecast: pendingItem.hasVolumeForecast ? {
      enabled: true,
      years: pendingItem.volumeForecast || {}
    } : {
      enabled: false,
      years: {}
    }
  });
};

/**
 * Klonuje istniejący item (deep copy)
 * @param {object} item - Item do sklonowania
 * @param {number} newId - Nowe ID dla klona
 * @returns {object} Sklonowany item
 * @example
 * const clone = cloneItem(existingItem, 5);
 */
export const cloneItem = (item, newId) => {
  // Deep copy
  const cloned = JSON.parse(JSON.stringify(item));
  cloned.id = newId;
  cloned.results = null; // Reset wyników dla klona
  return cloned;
};

/**
 * Sprawdza czy item jest pusty (nie ma wprowadzonych danych)
 * @param {object} item - Item do sprawdzenia
 * @returns {boolean}
 */
export const isEmptyItem = (item) => {
  return !item.partId &&
         !item.description &&
         !item.weight &&
         !item.surfaceArea &&
         !item.volume &&
         !item.annualVolume;
};

/**
 * Pobiera domyślny item dla danego trybu
 * @param {number} id - ID itemu
 * @param {string} mode - Tryb (weight, surface, volume, heatshield, multilayer)
 * @returns {object}
 */
export const getDefaultItemForMode = (id, mode) => {
  const baseItem = createDefaultItem(id);

  // Opcjonalnie możemy dodać mode-specific defaults
  switch (mode) {
    case 'surface':
      return {
        ...baseItem,
        sheetLength: '1000',
        sheetWidth: '1000'
      };
    case 'heatshield':
      return {
        ...baseItem,
        heatshield: {
          ...baseItem.heatshield,
          joiningCost: '0'
        }
      };
    default:
      return baseItem;
  }
};

export default {
  DEFAULT_ITEM_STRUCTURE,
  createDefaultItem,
  createDefaultTab,
  createItemFromPending,
  cloneItem,
  isEmptyItem,
  getDefaultItemForMode
};
