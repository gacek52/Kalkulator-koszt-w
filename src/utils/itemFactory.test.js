/**
 * Testy dla itemFactory
 */

import {
  createDefaultItem,
  createDefaultTab,
  createItemFromPending,
  cloneItem,
  isEmptyItem,
  DEFAULT_ITEM_STRUCTURE
} from './itemFactory';

describe('itemFactory', () => {
  describe('createDefaultItem', () => {
    test('tworzy item z domyślnymi wartościami', () => {
      const item = createDefaultItem(1);

      expect(item.id).toBe(1);
      expect(item.partId).toBe('');
      expect(item.weight).toBe('');
      expect(item.annualVolume).toBe('');
      expect(item.volumeForecast).toEqual({ enabled: false, years: {} });
      expect(item.workstations).toHaveLength(1);
    });

    test('nadpisuje wartości domyślne', () => {
      const item = createDefaultItem(2, {
        partId: 'TEST-001',
        weight: '500',
        description: 'Test item'
      });

      expect(item.id).toBe(2);
      expect(item.partId).toBe('TEST-001');
      expect(item.weight).toBe('500');
      expect(item.description).toBe('Test item');
    });

    test('deep merge dla zagnieżdżonych obiektów', () => {
      const item = createDefaultItem(3, {
        volumeForecast: {
          enabled: true,
          years: { 2025: 1000, 2026: 1500 }
        }
      });

      expect(item.volumeForecast.enabled).toBe(true);
      expect(item.volumeForecast.years).toEqual({ 2025: 1000, 2026: 1500 });
    });

    test('zachowuje wszystkie domyślne pola', () => {
      const item = createDefaultItem(4);
      const requiredFields = [
        'id', 'partId', 'description', 'annualVolume', 'weight',
        'volumeForecast', 'heatshield', 'multilayer', 'workstations',
        'packaging', 'margin', 'results'
      ];

      requiredFields.forEach(field => {
        expect(item).toHaveProperty(field);
      });
    });
  });

  describe('createDefaultTab', () => {
    test('tworzy tab z domyślnymi wartościami', () => {
      const tab = createDefaultTab(1, 'Test Tab', 'weight');

      expect(tab.id).toBe(1);
      expect(tab.name).toBe('Test Tab');
      expect(tab.calculationType).toBe('weight');
      expect(tab.items).toEqual([]);
      expect(tab.nextItemId).toBe(1);
    });

    test('używa domyślnej nazwy jeśli nie podano', () => {
      const tab = createDefaultTab(5, null, 'surface');

      expect(tab.name).toBe('Material 5');
    });

    test('domyślny tryb to weight', () => {
      const tab = createDefaultTab(2, 'Tab');

      expect(tab.calculationType).toBe('weight');
    });
  });

  describe('createItemFromPending', () => {
    test('tworzy item z pending pool', () => {
      const pendingItem = {
        partId: 'CBD-001',
        description: 'Imported part',
        annualVolume: 5000,
        hasVolumeForecast: false
      };

      const item = createItemFromPending(pendingItem, 10);

      expect(item.id).toBe(10);
      expect(item.partId).toBe('CBD-001');
      expect(item.description).toBe('Imported part');
      expect(item.annualVolume).toBe('5000');
      expect(item.volumeForecast.enabled).toBe(false);
    });

    test('włącza volume forecast jeśli są dane', () => {
      const pendingItem = {
        partId: 'CBD-002',
        description: 'Part with forecast',
        annualVolume: 3000,
        hasVolumeForecast: true,
        volumeForecast: {
          2025: 1000,
          2026: 1500,
          2027: 2000
        }
      };

      const item = createItemFromPending(pendingItem, 11);

      expect(item.volumeForecast.enabled).toBe(true);
      expect(item.volumeForecast.years).toEqual({
        2025: 1000,
        2026: 1500,
        2027: 2000
      });
    });

    test('obsługuje brak description', () => {
      const pendingItem = {
        partId: 'CBD-003',
        annualVolume: 2000,
        hasVolumeForecast: false
      };

      const item = createItemFromPending(pendingItem, 12);

      expect(item.description).toBe('');
    });
  });

  describe('cloneItem', () => {
    test('tworzy głęboką kopię itemu', () => {
      const original = createDefaultItem(1, {
        partId: 'ORIG-001',
        weight: '500',
        volumeForecast: {
          enabled: true,
          years: { 2025: 1000 }
        }
      });

      const clone = cloneItem(original, 2);

      expect(clone.id).toBe(2);
      expect(clone.partId).toBe('ORIG-001');
      expect(clone.weight).toBe('500');

      // Sprawdź czy to deep copy
      expect(clone).not.toBe(original);
      expect(clone.volumeForecast).not.toBe(original.volumeForecast);
      expect(clone.volumeForecast.years).not.toBe(original.volumeForecast.years);
    });

    test('resetuje wyniki dla klona', () => {
      const original = createDefaultItem(1, {
        results: { totalCost: 100, materialCost: 50 }
      });

      const clone = cloneItem(original, 2);

      expect(original.results).toBeTruthy();
      expect(clone.results).toBeNull();
    });
  });

  describe('isEmptyItem', () => {
    test('zwraca true dla pustego itemu', () => {
      const emptyItem = createDefaultItem(1);

      expect(isEmptyItem(emptyItem)).toBe(true);
    });

    test('zwraca false jeśli partId jest wypełniony', () => {
      const item = createDefaultItem(1, { partId: 'TEST-001' });

      expect(isEmptyItem(item)).toBe(false);
    });

    test('zwraca false jeśli weight jest wypełniony', () => {
      const item = createDefaultItem(1, { weight: '500' });

      expect(isEmptyItem(item)).toBe(false);
    });

    test('zwraca false jeśli surfaceArea jest wypełniona', () => {
      const item = createDefaultItem(1, { surfaceArea: '1000' });

      expect(isEmptyItem(item)).toBe(false);
    });

    test('zwraca false jeśli volume jest wypełniona', () => {
      const item = createDefaultItem(1, { volume: '5000' });

      expect(isEmptyItem(item)).toBe(false);
    });

    test('zwraca false jeśli annualVolume jest wypełniony', () => {
      const item = createDefaultItem(1, { annualVolume: '1000' });

      expect(isEmptyItem(item)).toBe(false);
    });
  });

  describe('DEFAULT_ITEM_STRUCTURE', () => {
    test('ma wszystkie wymagane pola dla weight mode', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('weight');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('weightOption');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('weightUnit');
    });

    test('ma wszystkie wymagane pola dla surface mode', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('surfaceArea');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('thickness');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('density');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('sheetLength');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('sheetWidth');
    });

    test('ma wszystkie wymagane pola dla volume mode', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('volume');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('dimensions');
      expect(DEFAULT_ITEM_STRUCTURE.dimensions).toHaveProperty('length');
      expect(DEFAULT_ITEM_STRUCTURE.dimensions).toHaveProperty('width');
      expect(DEFAULT_ITEM_STRUCTURE.dimensions).toHaveProperty('height');
    });

    test('ma wszystkie wymagane pola dla heatshield mode', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('heatshield');
      expect(DEFAULT_ITEM_STRUCTURE.heatshield).toHaveProperty('sheetThickness');
      expect(DEFAULT_ITEM_STRUCTURE.heatshield).toHaveProperty('matThickness');
    });

    test('ma wszystkie wymagane pola dla multilayer mode', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('multilayer');
      expect(DEFAULT_ITEM_STRUCTURE.multilayer).toHaveProperty('layers');
      expect(DEFAULT_ITEM_STRUCTURE.multilayer.layers).toHaveLength(1);
    });

    test('ma pola wspólne', () => {
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('partId');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('description');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('annualVolume');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('volumeForecast');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('workstations');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('packaging');
      expect(DEFAULT_ITEM_STRUCTURE).toHaveProperty('margin');
    });
  });
});
