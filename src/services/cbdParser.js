/**
 * CBD (Cost Breakdown) Excel Parser
 * Parsuje pliki CBD od klientów automotive (np. MAN, VW, etc.)
 * Wyciąga Part Number, Description, Volume Forecast, etc.
 */

import * as XLSX from 'xlsx';

/**
 * Parsuje liczbę z formatu europejskiego (spacja jako separator tysięcy)
 * @param {string} value - wartość do parsowania
 * @returns {number} - sparsowana liczba
 */
const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;

  // Usuń spacje (separator tysięcy w formacie europejskim)
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Czyści string z nadmiarowych białych znaków
 */
const cleanString = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\s+/g, ' ');
};

/**
 * Znajduje wiersze nagłówkowe z kolumnami danych
 * Szuka "Item #", "Part Number", "Description", etc.
 * Zwraca tablicę wierszy nagłówkowych (może być wiele sekcji)
 */
const findHeaderRows = (ws, maxRows = 100, debug = false) => {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const headerRows = [];

  if (debug) {
    console.log(`🔍 Searching for headers in ${maxRows} rows (range: ${ws['!ref']})...`);
    console.log(`📐 Columns available: ${range.e.c + 1} (0 to ${range.e.c})`);
  }

  for (let R = 0; R < Math.min(range.e.r, maxRows); R++) {
    // Sprawdź pierwsze 5 kolumn
    const cells = [];
    for (let C = 0; C < Math.min(5, range.e.c + 1); C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      cells.push(cell ? String(cell.v) : '');
    }

    // Loguj tylko wiersze które mają jakieś dane
    if (debug && cells.some(c => c !== '')) {
      const hasItem = cells.some(c => c.toLowerCase().includes('item'));
      const hasPart = cells.some(c => c.toLowerCase().includes('part'));

      if (hasItem || hasPart) {
        console.log(`  Row ${R}: [${cells.join(' | ')}]`);
      }
    }

    // Szukaj "Item" i "Part" w dowolnych kolumnach w tym wierszu (pierwsze 10 kolumn)
    let hasItem = false;
    let hasPart = false;
    let itemCol = -1;
    let partCol = -1;

    for (let C = 0; C < Math.min(10, range.e.c + 1); C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        const val = String(cell.v).toLowerCase().trim().replace(/\s+/g, ' ');

        if (val.includes('item') && val.includes('#')) {
          hasItem = true;
          itemCol = C;
        }
        if (val.includes('part') && val.includes('number')) {
          hasPart = true;
          partCol = C;
        }
      }
    }

    // Znaleziono nagłówek jeśli są oba pola w tym samym wierszu
    if (hasItem && hasPart) {
      headerRows.push(R);
      if (debug) {
        console.log(`  ✅ Found header at row ${R}: Item# at col ${itemCol}, Part Number at col ${partCol}`);
      }
    }
  }

  if (debug) {
    console.log(`📋 Found ${headerRows.length} header row(s):`, headerRows);
  }

  return headerRows;
};

/**
 * Parsuje nagłówek i zwraca mapę kolumn
 */
const parseHeader = (ws, headerRow) => {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const columnMap = {};

  for (let C = 0; C <= range.e.c; C++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c: C })];
    if (!cell || !cell.v) continue;

    const header = String(cell.v).toLowerCase().trim();

    // Mapuj kolumny na nasze pola
    if (header.includes('item')) columnMap.itemNo = C;
    else if (header.includes('part number') && !header.includes('previous')) columnMap.partNumber = C;
    else if (header.includes('previous part')) columnMap.previousPartNumber = C;
    else if (header.includes('description')) columnMap.description = C;
    else if (header.includes('gross weight')) columnMap.grossWeight = C;
    else if (header.includes('net weight')) columnMap.netWeight = C;
    else if (header.includes('annual peak')) columnMap.annualPeakVolume = C;
    else if (header.includes('average annual')) columnMap.averageAnnualVolume = C;
    else if (header.includes('volume over lifetime')) columnMap.lifetimeVolume = C;
    else if (!isNaN(parseInt(header))) {
      // Kolumny z latami (2025, 2026, etc.)
      const year = parseInt(header);
      if (year >= 2020 && year <= 2050) {
        if (!columnMap.years) columnMap.years = {};
        columnMap.years[year] = C;
      }
    }
  }

  return columnMap;
};

/**
 * Parsuje metadane projektu z górnej części arkusza
 */
const parseMetadata = (ws, headerRow) => {
  const metadata = {
    bidNo: '',
    customer: '',
    platform: '',
    project: '',
    sop: '',
    category: ''
  };

  // Szukaj w pierwszych wierszach przed headerem
  for (let R = 0; R < headerRow; R++) {
    for (let C = 0; C < 10; C++) {
      const labelCell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      const valueCell = ws[XLSX.utils.encode_cell({ r: R, c: C + 1 })];

      if (!labelCell || !valueCell) continue;

      const label = String(labelCell.v).toLowerCase();
      const value = String(valueCell.v);

      if (label.includes('bid invitation')) metadata.bidNo = cleanString(value);
      else if (label.includes('customer')) metadata.customer = cleanString(value);
      else if (label.includes('platform')) metadata.platform = cleanString(value);
      else if (label.includes('project')) metadata.project = cleanString(value);
      else if (label.includes('sop')) metadata.sop = cleanString(value);
      else if (label.includes('prod. category') || label.includes('category')) metadata.category = cleanString(value);
    }
  }

  return metadata;
};

/**
 * Sprawdza czy wiersz jest pusty lub separatorem
 */
const isEmptyOrSeparatorRow = (ws, row, columnMap) => {
  // Sprawdź kolumnę Part Number
  const partNumberCell = ws[XLSX.utils.encode_cell({ r: row, c: columnMap.partNumber })];

  // Pusty wiersz
  if (!partNumberCell || !partNumberCell.v || String(partNumberCell.v).trim() === '') {
    return true;
  }

  // Wiersz z tekstem typu "click here to expand" lub nagłówkiem powtórzonym
  const value = String(partNumberCell.v).toLowerCase();
  if (value.includes('click here') || value.includes('item #') || value.includes('part number')) {
    return true;
  }

  return false;
};

/**
 * Parsuje pojedynczy wiersz z danymi części
 */
const parseItemRow = (ws, row, columnMap) => {
  const getCell = (col) => {
    if (col === undefined) return null;
    const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
    return cell ? cell.v : null;
  };

  const item = {
    itemNo: parseNumber(getCell(columnMap.itemNo)),
    partNumber: cleanString(getCell(columnMap.partNumber)),
    previousPartNumber: cleanString(getCell(columnMap.previousPartNumber)),
    description: cleanString(getCell(columnMap.description)),
    grossWeight: parseNumber(getCell(columnMap.grossWeight)),
    netWeight: parseNumber(getCell(columnMap.netWeight)),
    annualPeakVolume: parseNumber(getCell(columnMap.annualPeakVolume)),
    averageAnnualVolume: parseNumber(getCell(columnMap.averageAnnualVolume)),
    lifetimeVolume: parseNumber(getCell(columnMap.lifetimeVolume)),
    volumeForecast: {}
  };

  // Parsuj prognozy roczne
  if (columnMap.years) {
    Object.keys(columnMap.years).forEach(year => {
      const colIndex = columnMap.years[year];
      const value = parseNumber(getCell(colIndex));
      item.volumeForecast[year] = Math.round(value); // Zaokrąglij do pełnych liczb
    });
  }

  // Zaokrąglij wartości wolumenów do pełnych liczb
  item.annualPeakVolume = Math.round(item.annualPeakVolume);
  item.averageAnnualVolume = Math.round(item.averageAnnualVolume);
  item.lifetimeVolume = Math.round(item.lifetimeVolume);

  return item;
};

/**
 * Główna funkcja parsująca plik CBD Excel
 * @param {File} file - plik Excel do sparsowania
 * @returns {Promise<{metadata, items}>} - sparsowane dane
 */
export const parseCBDExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log('📚 Available sheets:', workbook.SheetNames);

        // Znajdź arkusz z danymi - szukaj arkusza który ma nagłówki Item # i Part Number
        let worksheet = null;
        let sheetName = null;

        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          console.log(`\n🔎 Checking sheet: "${name}"`);
          const headerRows = findHeaderRows(ws, 100, true); // Enable debug mode

          if (headerRows.length > 0) {
            worksheet = ws;
            sheetName = name;
            console.log(`✅ Found data in sheet: "${sheetName}"`);
            break;
          } else {
            console.log(`❌ No headers found in "${name}"`);
          }
        }

        if (!worksheet) {
          reject(new Error('Nie znaleziono arkusza z danymi części (Item #, Part Number, etc.). Sprawdź czy plik zawiera poprawne dane CBD.'));
          return;
        }

        console.log('📊 Parsing CBD Excel - Sheet:', sheetName);

        // Znajdź wiersze nagłówkowe (może być wiele sekcji)
        const headerRows = findHeaderRows(worksheet);
        if (headerRows.length === 0) {
          reject(new Error('Nie znaleziono wiersza nagłówkowego (Item #, Part Number, etc.)'));
          return;
        }

        console.log('📋 Header rows found at:', headerRows);

        // Użyj pierwszego nagłówka do parsowania metadanych
        const firstHeaderRow = headerRows[0];
        const metadata = parseMetadata(worksheet, firstHeaderRow);
        console.log('ℹ️ Metadata:', metadata);

        // Parsuj wszystkie sekcje z danymi
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const items = [];

        headerRows.forEach((headerRow, sectionIndex) => {
          console.log(`\n📦 Processing section ${sectionIndex + 1} starting at row ${headerRow}`);

          // Parsuj nagłówek dla tej sekcji
          const columnMap = parseHeader(worksheet, headerRow);
          console.log('📍 Column mapping:', columnMap);

          // Określ zakres danych dla tej sekcji
          // Jeśli jest następna sekcja, parsuj do niej, w przeciwnym razie do końca
          const nextHeaderRow = headerRows[sectionIndex + 1];
          const endRow = nextHeaderRow ? nextHeaderRow - 1 : range.e.r;

          // Parsuj wiersze z danymi dla tej sekcji
          for (let R = headerRow + 1; R <= endRow; R++) {
            // Pomiń puste wiersze i separatory
            if (isEmptyOrSeparatorRow(worksheet, R, columnMap)) {
              continue;
            }

            const item = parseItemRow(worksheet, R, columnMap);

            // Dodaj tylko jeśli ma Part Number
            if (item.partNumber && item.partNumber !== '') {
              items.push(item);
              console.log(`  ✓ Item ${item.itemNo}: ${item.partNumber} - ${item.description}`);
            }
          }
        });

        console.log(`\n✅ Parsed ${items.length} items from ${headerRows.length} section(s)`);

        resolve({
          metadata,
          items
        });

      } catch (error) {
        console.error('❌ Error parsing CBD Excel:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Waliduje sparsowane dane CBD
 */
export const validateCBDData = (parsedData) => {
  const errors = [];
  const warnings = [];

  if (!parsedData.items || parsedData.items.length === 0) {
    errors.push('Nie znaleziono żadnych pozycji w pliku CBD');
  }

  parsedData.items.forEach((item, index) => {
    if (!item.partNumber) {
      errors.push(`Pozycja ${index + 1}: Brak Part Number`);
    }

    if (!item.description) {
      warnings.push(`${item.partNumber}: Brak opisu`);
    }

    if (!item.averageAnnualVolume && !item.annualPeakVolume) {
      warnings.push(`${item.partNumber}: Brak danych o wolumenie rocznym`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Konwertuje sparsowane dane CBD na format pending pool
 */
export const convertToPendingPool = (parsedData) => {
  return parsedData.items.map((item, index) => {
    // Użyj average annual volume jako domyślnego, fallback na peak
    const annualVolume = item.averageAnnualVolume || item.annualPeakVolume || 0;

    // Sformatuj Part ID z previous part number jeśli istnieje
    let displayPartId = item.partNumber;
    if (item.previousPartNumber && item.previousPartNumber !== '') {
      displayPartId = `${item.partNumber} (prev: ${item.previousPartNumber})`;
    }

    // Sprawdź czy są prognozy roczne
    const hasVolumeForecast = item.volumeForecast && Object.keys(item.volumeForecast).length > 0;

    return {
      id: `pending_${Date.now()}_${index}`,
      partId: item.partNumber,
      displayPartId: displayPartId,
      previousPartId: item.previousPartNumber || null,
      description: item.description,
      annualVolume: annualVolume,
      volumeForecast: item.volumeForecast,
      hasVolumeForecast: hasVolumeForecast, // Flaga czy ma kalendarz
      status: 'pending',
      assignedToTab: null,
      metadata: {
        itemNo: item.itemNo,
        grossWeight: item.grossWeight,
        netWeight: item.netWeight,
        annualPeakVolume: item.annualPeakVolume,
        lifetimeVolume: item.lifetimeVolume,
        bidNo: parsedData.metadata.bidNo,
        customer: parsedData.metadata.customer,
        platform: parsedData.metadata.platform,
        project: parsedData.metadata.project,
        sop: parsedData.metadata.sop,
        category: parsedData.metadata.category
      }
    };
  });
};
