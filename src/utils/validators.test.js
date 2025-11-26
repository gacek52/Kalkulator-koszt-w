/**
 * Testy dla validators
 */

import { validators } from './validators';

describe('validators', () => {
  describe('isValidNumber', () => {
    test('akceptuje poprawne liczby', () => {
      expect(validators.isValidNumber(10)).toBe(true);
      expect(validators.isValidNumber('10')).toBe(true);
      expect(validators.isValidNumber('10.5')).toBe(true);
      expect(validators.isValidNumber(0)).toBe(true);
    });

    test('odrzuca niepoprawne wartości', () => {
      expect(validators.isValidNumber('')).toBe(false);
      expect(validators.isValidNumber('abc')).toBe(false);
      expect(validators.isValidNumber(null)).toBe(false);
      expect(validators.isValidNumber(undefined)).toBe(false);
      expect(validators.isValidNumber(NaN)).toBe(false);
    });

    test('sprawdza minimum', () => {
      expect(validators.isValidNumber(-5, 0)).toBe(false);
      expect(validators.isValidNumber(5, 0)).toBe(true);
      expect(validators.isValidNumber(0, 0)).toBe(true);
      expect(validators.isValidNumber(10, 15)).toBe(false);
    });
  });

  describe('isValidWeight', () => {
    test('akceptuje poprawne wagi', () => {
      expect(validators.isValidWeight(500, 'g')).toBe(true);
      expect(validators.isValidWeight(1.5, 'kg')).toBe(true);
      expect(validators.isValidWeight('250.5', 'g')).toBe(true);
    });

    test('odrzuca niepoprawne wagi', () => {
      expect(validators.isValidWeight(-5, 'g')).toBe(false);
      expect(validators.isValidWeight('abc', 'g')).toBe(false);
      expect(validators.isValidWeight('', 'g')).toBe(false);
    });

    test('sprawdza limity dla jednostek', () => {
      expect(validators.isValidWeight(15000, 'kg')).toBe(false); // Zbyt duża waga
      expect(validators.isValidWeight(5000, 'kg')).toBe(true);
      expect(validators.isValidWeight(15000000, 'g')).toBe(false); // Zbyt duża waga
    });
  });

  describe('isValidArea', () => {
    test('akceptuje poprawne powierzchnie', () => {
      expect(validators.isValidArea(1000, 'mm2')).toBe(true);
      expect(validators.isValidArea(150, 'cm2')).toBe(true);
      expect(validators.isValidArea(2, 'm2')).toBe(true);
    });

    test('odrzuca niepoprawne powierzchnie', () => {
      expect(validators.isValidArea(-10, 'mm2')).toBe(false);
      expect(validators.isValidArea('abc', 'mm2')).toBe(false);
    });
  });

  describe('isValidPartId', () => {
    test('akceptuje poprawne Part ID', () => {
      expect(validators.isValidPartId('ABC-123')).toBe(true);
      expect(validators.isValidPartId('TEST_001')).toBe(true);
      expect(validators.isValidPartId('123')).toBe(true);
    });

    test('odrzuca niepoprawne Part ID', () => {
      expect(validators.isValidPartId('')).toBe(false);
      expect(validators.isValidPartId('   ')).toBe(false); // Tylko spacje
      expect(validators.isValidPartId(null)).toBe(false);
      expect(validators.isValidPartId(123)).toBe(false); // Nie string
    });

    test('sprawdza długość', () => {
      const longId = 'A'.repeat(101);
      expect(validators.isValidPartId(longId)).toBe(false);
      expect(validators.isValidPartId('A'.repeat(100))).toBe(true);
    });
  });

  describe('isValidEfficiency', () => {
    test('akceptuje poprawne wartości 0-100', () => {
      expect(validators.isValidEfficiency(0)).toBe(true);
      expect(validators.isValidEfficiency(50)).toBe(true);
      expect(validators.isValidEfficiency(100)).toBe(true);
      expect(validators.isValidEfficiency('75.5')).toBe(true);
    });

    test('odrzuca wartości poza zakresem', () => {
      expect(validators.isValidEfficiency(-5)).toBe(false);
      expect(validators.isValidEfficiency(101)).toBe(false);
      expect(validators.isValidEfficiency(150)).toBe(false);
    });
  });

  describe('isValidItem', () => {
    test('waliduje item w trybie weight', () => {
      const validItem = {
        partId: 'TEST-001',
        annualVolume: '5000',
        weight: '500',
        weightUnit: 'g'
      };
      const result = validators.isValidItem(validItem, 'weight');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('zwraca błędy dla niepoprawnego itemu', () => {
      const invalidItem = {
        partId: '',
        annualVolume: 'abc',
        weight: '-10',
        weightUnit: 'g'
      };
      const result = validators.isValidItem(invalidItem, 'weight');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('waliduje item w trybie surface', () => {
      const validItem = {
        partId: 'TEST-002',
        annualVolume: '3000',
        surfaceArea: '5000',
        surfaceUnit: 'mm2',
        thickness: '2.5',
        density: '2.7'
      };
      const result = validators.isValidItem(validItem, 'surface');
      expect(result.valid).toBe(true);
    });

    test('waliduje workstations', () => {
      const item = {
        partId: 'TEST-003',
        annualVolume: '1000',
        weight: '500',
        workstations: [
          { efficiency: '75' },
          { efficiency: '150' } // Niepoprawna wydajność
        ]
      };
      const result = validators.isValidItem(item, 'weight');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Stanowisko 2'))).toBe(true);
    });
  });

  describe('sanitizeNumber', () => {
    test('zwraca wartość domyślną dla NaN', () => {
      expect(validators.sanitizeNumber('abc', 0)).toBe(0);
      expect(validators.sanitizeNumber('', 10)).toBe(10);
      expect(validators.sanitizeNumber(null, 5)).toBe(5);
    });

    test('stosuje min/max', () => {
      expect(validators.sanitizeNumber(150, 0, 0, 100)).toBe(100);
      expect(validators.sanitizeNumber(-10, 0, 0, 100)).toBe(0);
      expect(validators.sanitizeNumber(50, 0, 0, 100)).toBe(50);
    });

    test('parsuje stringi', () => {
      expect(validators.sanitizeNumber('42.5')).toBe(42.5);
      expect(validators.sanitizeNumber('100')).toBe(100);
    });
  });

  describe('formatNumber', () => {
    test('formatuje liczby poprawnie', () => {
      expect(validators.formatNumber(123.456, 2)).toBe('123.46');
      expect(validators.formatNumber(100, 0)).toBe('100');
      expect(validators.formatNumber('50.1', 1)).toBe('50.1');
    });

    test('obsługuje niepoprawne wartości', () => {
      expect(validators.formatNumber('abc', 2)).toBe('0.00');
      expect(validators.formatNumber(null, 2)).toBe('0.00');
    });
  });
});
