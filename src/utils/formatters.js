/**
 * Formatowanie liczb, walut i jednostek
 *
 * Centralne funkcje formatujące dla spójnego wyświetlania wartości.
 *
 * @module utils/formatters
 */

/**
 * Formatuje liczbę z określoną liczbą miejsc po przecinku
 * @param {number|string} value - Wartość do sformatowania
 * @param {number} decimals - Liczba miejsc po przecinku
 * @param {string} defaultValue - Wartość zwracana jeśli input niepoprawny
 * @returns {string}
 * @example
 * formatNumber(123.456, 2) // "123.46"
 * formatNumber('abc', 2, '0.00') // "0.00"
 */
export const formatNumber = (value, decimals = 2, defaultValue = '0.00') => {
  const num = parseFloat(value);
  if (isNaN(num)) return defaultValue;
  return num.toFixed(decimals);
};

/**
 * Formatuje walutę (Euro)
 * @param {number|string} value - Wartość do sformatowania
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 * @example
 * formatCurrency(1234.56) // "€1,234.56"
 * formatCurrency(0) // "€0.00"
 */
export const formatCurrency = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '€0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Formatuje walutę (uproszczona wersja bez symbolu)
 * @param {number|string} value - Wartość do sformatowania
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 * @example
 * formatCurrencySimple(1234.56) // "1,234.56"
 */
export const formatCurrencySimple = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return formatNumber(0, decimals);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Formatuje procent
 * @param {number|string} value - Wartość do sformatowania (0-100)
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 * @example
 * formatPercent(12.5) // "12.50%"
 * formatPercent(100) // "100.00%"
 */
export const formatPercent = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00%';
  return `${num.toFixed(decimals)}%`;
};

/**
 * Formatuje wagę z jednostką
 * @param {number|string} value - Wartość wagi
 * @param {string} unit - Jednostka (g, kg)
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 * @example
 * formatWeight(500, 'g') // "500.00 g"
 * formatWeight(1.5, 'kg') // "1.50 kg"
 */
export const formatWeight = (value, unit = 'g', decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return `0.00 ${unit}`;
  return `${num.toFixed(decimals)} ${unit}`;
};

/**
 * Formatuje powierzchnię z jednostką
 * @param {number|string} value - Wartość powierzchni
 * @param {string} unit - Jednostka (mm2, cm2, m2)
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 */
export const formatArea = (value, unit = 'mm2', decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return `0.00 ${unit}`;
  return `${formatNumber(num, decimals)} ${unit}`;
};

/**
 * Formatuje objętość z jednostką
 * @param {number|string} value - Wartość objętości
 * @param {string} unit - Jednostka (mm3, cm3, m3)
 * @param {number} decimals - Liczba miejsc po przecinku
 * @returns {string}
 */
export const formatVolume = (value, unit = 'mm3', decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num)) return `0.00 ${unit}`;
  return `${formatNumber(num, decimals)} ${unit}`;
};

/**
 * Formatuje czas (sekundy na minuty:sekundy lub godziny:minuty)
 * @param {number|string} seconds - Czas w sekundach
 * @param {string} format - Format ('mm:ss'|'hh:mm'|'seconds')
 * @returns {string}
 * @example
 * formatTime(125, 'mm:ss') // "02:05"
 * formatTime(3665, 'hh:mm') // "01:01"
 * formatTime(60, 'seconds') // "60 s"
 */
export const formatTime = (seconds, format = 'mm:ss') => {
  const sec = parseFloat(seconds);
  if (isNaN(sec)) return '00:00';

  switch (format) {
    case 'seconds':
      return `${Math.round(sec)} s`;

    case 'hh:mm': {
      const hours = Math.floor(sec / 3600);
      const minutes = Math.floor((sec % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    case 'mm:ss':
    default: {
      const minutes = Math.floor(sec / 60);
      const secs = Math.floor(sec % 60);
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }
};

/**
 * Formatuje liczbę całkowitą (bez miejsc po przecinku)
 * @param {number|string} value - Wartość do sformatowania
 * @returns {string}
 * @example
 * formatInteger(1234.56) // "1,235"
 * formatInteger(1000) // "1,000"
 */
export const formatInteger = (value) => {
  const num = Math.round(parseFloat(value));
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Skraca długi tekst z elipsą
 * @param {string} text - Tekst do skrócenia
 * @param {number} maxLength - Maksymalna długość
 * @returns {string}
 * @example
 * truncateText('Very long description text', 10) // "Very long..."
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Parsuje wartość numeryczną (usuwa spacje, przecinki)
 * @param {string|number} value - Wartość do sparsowania
 * @param {number} defaultValue - Wartość domyślna
 * @returns {number}
 * @example
 * parseNumericValue('1,234.56') // 1234.56
 * parseNumericValue('1 234,56') // 1234.56
 * parseNumericValue('abc', 0) // 0
 */
export const parseNumericValue = (value, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  if (!value) return defaultValue;

  // Usuń spacje i zamień przecinki na kropki
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Formatuje Part ID (uppercase, trim)
 * @param {string} partId - Part ID do sformatowania
 * @returns {string}
 * @example
 * formatPartId('abc-123 ') // "ABC-123"
 */
export const formatPartId = (partId) => {
  if (!partId || typeof partId !== 'string') return '';
  return partId.trim().toUpperCase();
};

/**
 * Formatuje datę
 * @param {Date|string} date - Data do sformatowania
 * @param {string} format - Format ('short'|'long'|'iso')
 * @returns {string}
 * @example
 * formatDate(new Date(), 'short') // "25/11/2024"
 * formatDate(new Date(), 'long') // "25 listopada 2024"
 * formatDate(new Date(), 'iso') // "2024-11-25"
 */
export const formatDate = (date, format = 'short') => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'iso':
      return d.toISOString().split('T')[0];

    case 'long':
      return new Intl.DateTimeFormat('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);

    case 'short':
    default:
      return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(d);
  }
};

/**
 * Konwertuje jednostki wagi
 * @param {number} value - Wartość do konwersji
 * @param {string} fromUnit - Jednostka źródłowa (g, kg)
 * @param {string} toUnit - Jednostka docelowa (g, kg)
 * @returns {number}
 * @example
 * convertWeight(1000, 'g', 'kg') // 1
 * convertWeight(1.5, 'kg', 'g') // 1500
 */
export const convertWeight = (value, fromUnit, toUnit) => {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;

  if (fromUnit === toUnit) return num;

  // g -> kg
  if (fromUnit === 'g' && toUnit === 'kg') {
    return num / 1000;
  }

  // kg -> g
  if (fromUnit === 'kg' && toUnit === 'g') {
    return num * 1000;
  }

  return num;
};

export default {
  formatNumber,
  formatCurrency,
  formatCurrencySimple,
  formatPercent,
  formatWeight,
  formatArea,
  formatVolume,
  formatTime,
  formatInteger,
  truncateText,
  parseNumericValue,
  formatPartId,
  formatDate,
  convertWeight
};
