import * as XLSX from 'xlsx-js-style';

/**
 * Generator interaktywnego arkusza Excel z formułami
 * Każdy element kalkulacji = osobny arkusz z żywymi obliczeniami
 * PRZEPISANE Z DOKŁADNYM ŚLEDZENIEM WIERSZY - KAŻDY WIERSZ LICZONY RĘCZNIE
 */

/**
 * Style definitions for Excel cells
 */
const CELL_STYLES = {
  // Parametry wejściowe (edytowalne) - jasnoniebieski
  INPUT: {
    fill: { fgColor: { rgb: 'DAEEF3' } },
    font: { name: 'Calibri', sz: 11 }
  },
  INPUT_COST: {
    fill: { fgColor: { rgb: 'DAEEF3' } },
    font: { name: 'Calibri', sz: 11 },
    numFmt: '0.00'
  },
  // Formuły (obliczenia automatyczne) - jasnoszary
  FORMULA: {
    fill: { fgColor: { rgb: 'E7E6E6' } },
    font: { name: 'Calibri', sz: 11, color: { rgb: '404040' } }
  },
  FORMULA_COST: {
    fill: { fgColor: { rgb: 'E7E6E6' } },
    font: { name: 'Calibri', sz: 11, color: { rgb: '404040' } },
    numFmt: '0.00'
  },
  // Nagłówki sekcji - ciemny niebieski z białym tekstem
  HEADER: {
    fill: { fgColor: { rgb: '4F81BD' } },
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  // Wyniki końcowe (EXW, DAP) - zielony
  RESULT: {
    fill: { fgColor: { rgb: 'C6EFCE' } },
    font: { name: 'Calibri', sz: 11, bold: true },
    numFmt: '0.00'
  },
  // Nagłówek główny
  TITLE: {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '1F4E78' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  }
};

/**
 * Aplikuje formatowanie liczb i kolory do komórek arkusza
 * @param {Object} ws - Arkusz Excel
 */
const applyNumberFormatting = (ws) => {
  if (!ws['!ref']) return;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddr];

      if (!cell) continue;

      // Sprawdź czy komórka A (etykieta) zawiera różne kategorie
      const labelAddr = XLSX.utils.encode_cell({ r: R, c: 0 });
      const labelCell = ws[labelAddr];

      if (labelCell && labelCell.v) {
        const label = String(labelCell.v).toLowerCase();

        // Sprawdź czy to nagłówek sekcji (zawiera "---" lub "===")
        const isHeader = label.includes('---') || label.includes('===');

        // Sprawdź czy to pole kosztowe
        const isCost = label.includes('€') || label.includes('koszt') ||
                      label.includes('marża') || label.includes('cena') ||
                      label.includes('przychód') || label.includes('obrót');

        // Sprawdź czy to pole EXW/DAP (wyniki końcowe)
        const isResult = label.includes('exw') || label.includes('dap') || label.includes('razem');

        // Jeśli to nagłówek - ciemnoniebieski z białym tekstem
        if (isHeader && C === 0) {
          cell.s = {
            fill: { fgColor: { rgb: '4F81BD' } },
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
        // Jeśli to komórka B (wartość) w wierszu kosztowym
        else if (C === 1 && isCost) {
          // Dla wyników końcowych (EXW, DAP, RAZEM) - zielone tło
          if (isResult) {
            cell.s = {
              fill: { fgColor: { rgb: 'C6EFCE' } },
              font: { name: 'Calibri', sz: 11, bold: true },
              numFmt: '#,##0.00'
            };
            cell.z = '#,##0.00';
          }
          // Dla formuł - szare tło
          else if (cell.f) {
            cell.s = {
              fill: { fgColor: { rgb: 'E7E6E6' } },
              font: { name: 'Calibri', sz: 11, color: { rgb: '404040' } },
              numFmt: '#,##0.00'
            };
            cell.z = '#,##0.00';
          }
          // Dla wartości edytowalnych - niebieskie tło
          else if (cell.t === 'n') {
            cell.s = {
              fill: { fgColor: { rgb: 'DAEEF3' } },
              font: { name: 'Calibri', sz: 11 },
              numFmt: '#,##0.00'
            };
            cell.z = '#,##0.00';
          }
        }
        // Etykiety w kolumnie A (bez kosztów)
        else if (C === 0 && !isHeader) {
          cell.s = {
            font: { name: 'Calibri', sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
    }
  }
};

/**
 * Aplikuje specjalne formatowanie dla arkusza Summary
 * @param {Object} ws - Arkusz Summary
 */
const applySummaryFormatting = (ws) => {
  if (!ws['!ref']) return;

  const range = XLSX.utils.decode_range(ws['!ref']);

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddr];

      if (!cell) continue;

      const cellValue = cell.v ? String(cell.v).toLowerCase() : '';

      // Wiersz 1: Główny tytuł "PODSUMOWANIE KALKULACJI"
      if (R === 0 && C === 0) {
        cell.s = {
          font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: '1F4E78' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
      // Wiersze z tytułami tabel (OBRÓT EXW, OBRÓT DAP, PRZYCHÓD)
      else if (C === 0 && (cellValue.includes('obrót') || cellValue.includes('przychód'))) {
        cell.s = {
          fill: { fgColor: { rgb: '4F81BD' } },
          font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
      // Wiersz nagłówka (Part ID, Cena EXW, etc.)
      else if (R === 2 || (C === 0 && cellValue === 'part id')) {
        cell.s = {
          fill: { fgColor: { rgb: 'D9E1F2' } },
          font: { name: 'Calibri', sz: 11, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            bottom: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      // Wiersz RAZEM (podsumowania)
      else if (C === 0 && cellValue === 'razem') {
        // Cała linia RAZEM
        cell.s = {
          fill: { fgColor: { rgb: 'FFC000' } },
          font: { name: 'Calibri', sz: 11, bold: true },
          alignment: { horizontal: 'left', vertical: 'center' }
        };
      }
      // Komórki z formułami w wierszu RAZEM
      else if (cell.f) {
        const rowCellA = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        const isRazemRow = rowCellA && String(rowCellA.v).toLowerCase() === 'razem';

        if (isRazemRow) {
          cell.s = {
            fill: { fgColor: { rgb: 'FFC000' } },
            font: { name: 'Calibri', sz: 11, bold: true },
            numFmt: '#,##0.00'
          };
          cell.z = '#,##0.00';
        } else {
          // Normalne formuły (ceny EXW/DAP, obroty)
          cell.s = {
            font: { name: 'Calibri', sz: 11 },
            numFmt: '#,##0.00'
          };
          cell.z = '#,##0.00';
        }
      }
      // Liczby (prognozy wolumenów)
      else if (cell.t === 'n') {
        cell.s = {
          font: { name: 'Calibri', sz: 11 },
          numFmt: '#,##0',
          alignment: { horizontal: 'right', vertical: 'center' }
        };
      }
      // Zwykły tekst
      else if (cell.t === 's') {
        if (!cell.s) {
          cell.s = {
            font: { name: 'Calibri', sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }
      }
    }
  }
};

/**
 * Pobiera koszt transportu na miejsce paletowe z zapisanego stanu
 * @param {Object} calculationMeta - Metadane kalkulacji zawierające ustawienia transportu
 * @returns {number} Koszt transportu na miejsce paletowe w EUR, lub 0 jeśli brak transportu
 */
const calculateTransportCostPerSpace = (calculationMeta) => {
  // Jeśli transport nie jest włączony
  if (!calculationMeta?.transport || !calculationMeta.transport.enabled) {
    return 0;
  }

  // Pobierz zapisany koszt transportu na miejsce paletowe
  // Ten koszt jest obliczany i zapisywany przez TransportCalculation komponent
  const costPerSpace = parseFloat(calculationMeta.transport.calculatedCostPerSpace) || 0;

  return costPerSpace;
};

/**
 * Pobiera pełne dane pakowania dla elementu
 */
const getPackagingInfo = (item, packagingTypes, compositions) => {
  console.log('🔍 getPackagingInfo called:');
  console.log('  item.packaging:', item.packaging);
  console.log('  packagingTypes:', packagingTypes);
  console.log('  compositions:', compositions);

  if (!item.packaging || !item.packaging.compositionId) {
    console.log('  ❌ No packaging or compositionId, returning null');
    return null;
  }

  if (item.packaging.compositionId === 'custom') {
    const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
    const layers = parseFloat(item.packaging.layers) || 0;
    const partsInBox = partsPerLayer * layers;
    return {
      partsPerLayer, layers, partsInBox,
      packagingTypeName: 'Niestandardowe',
      packagesPerPallet: 0, palletsPerSpace: 0,
      partsPerPallet: 0, partsPerSpace: 0,
      emptyCartonWeight: 0, emptyPalletWeight: 0,
      cartonCost: 0, palletCost: 0,
      cost: parseFloat(item.packaging.customPrice) || 0
    };
  }

  const composition = compositions?.find(c => c.id == item.packaging.compositionId);
  console.log('  Looking for composition with ID:', item.packaging.compositionId);
  console.log('  Found composition:', composition);

  if (!composition) {
    console.log('  ❌ Composition not found, returning null');
    return null;
  }

  const packagingType = packagingTypes?.find(t => t.id == composition.packagingTypeId);
  console.log('  Looking for packagingType with ID:', composition.packagingTypeId);
  console.log('  Found packagingType:', packagingType);

  if (!packagingType) {
    console.warn(`  ⚠️ PackagingType ID ${composition.packagingTypeId} not found in database! Using default values.`);
  }

  const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
  const layers = parseFloat(item.packaging.layers) || 0;
  const partsInBox = partsPerLayer * layers;

  console.log('  partsPerLayer:', partsPerLayer, 'layers:', layers);

  const partsPerPallet = partsInBox * composition.packagesPerPallet;
  const partsPerSpace = partsPerPallet * composition.palletsPerSpace;

  const result = {
    partsPerLayer, layers, partsInBox,
    packagingTypeName: packagingType?.name || 'N/A',
    packagesPerPallet: composition.packagesPerPallet,
    palletsPerSpace: composition.palletsPerSpace,
    partsPerPallet, partsPerSpace,
    emptyCartonWeight: packagingType?.weight ?? 0, // WAGA PUSTEGO KARTONU
    emptyPalletWeight: composition.standardPalletWeight ?? 0, // WAGA PUSTEJ PALETY
    cartonCost: packagingType?.cost ?? 0,
    palletCost: composition.palletCost ?? 0, // KOSZT PALETY
    cost: composition.compositionCost
  };

  console.log('  ✅ Returning packagingInfo:', result);
  return result;
};

/**
 * Tworzy arkusz z formułami dla trybu surface
 * KAŻDY WIERSZ JEST DOKŁADNIE ŚLEDZONY - NUMERACJA RĘCZNA
 */
const createSurfaceModeSheet = (item, tab, globalSGA, packagingTypes, compositions, calculationMeta, transportTypes) => {
  const ws = [];

  // Pobierz pełne dane pakowania
  const packagingInfo = getPackagingInfo(item, packagingTypes, compositions);

  // Parametry materiału
  const density = parseFloat(item.density) || parseFloat(item.customValues?.density) || parseFloat(tab.density) || 0;
  const materialPriceUnit = tab.materialPriceUnit || 'kg';
  const surfaceUnit = item.surfaceUnit || 'm2';
  const workstationsCost = item.results?.workstationsCost || 0;
  const curvesCost = item.results?.customCurvesCost || 0;

  // Oblicz koszt transportu na miejsce paletowe
  const transportCostPerSpace = calculateTransportCostPerSpace(calculationMeta);

  console.log('🔧 Surface mode - checking values:');
  console.log('  workstationsCost:', workstationsCost);
  console.log('  curvesCost:', curvesCost);
  console.log('  item.results:', item.results);
  console.log('  item.packaging:', item.packaging);

  // Sprawdź czy pakowanie jest ręczne
  const isManualPackaging = item.packaging?.manualPartsInBox || false;
  const manualPartsInBox = isManualPackaging ? (parseFloat(item.packaging?.partsInBox) || 0) : 0;

  console.log('  isManualPackaging:', isManualPackaging);
  console.log('  manualPartsInBox:', manualPartsInBox);

  // === NAGŁÓWEK === (wiersze 1-4)
  ws.push([`KALKULACJA: ${item.partId || 'N/A'}`]); // 1
  ws.push([`Materiał: ${tab.name || 'N/A'}`]); // 2
  ws.push([`Tryb: Powierzchnia`]); // 3
  ws.push([]); // 4

  // === PARAMETRY WEJŚCIOWE === (wiersze 5-43)
  ws.push(['=== PARAMETRY WEJŚCIOWE (można edytować) ===']); // 5
  ws.push([]); // 6

  ws.push(['Powierzchnia netto', parseFloat(item.surfaceArea) || 0, surfaceUnit]); // 7
  ws.push([]); // 8

  ws.push(['--- Arkusz materiału ---']); // 9
  ws.push(['Długość arkusza (mm)', parseFloat(item.sheetLength) || 0]); // 10
  ws.push(['Szerokość arkusza (mm)', parseFloat(item.sheetWidth) || 0]); // 11
  ws.push(['Ilość detali na arkusz', parseFloat(item.partsPerSheet) || 1]); // 12
  ws.push([]); // 13

  ws.push(['--- Parametry materiału ---']); // 14
  ws.push(['Gęstość materiału (kg/m³)', density]); // 15
  ws.push(['Grubość (mm)', parseFloat(item.thickness) || 0]); // 16
  ws.push([]); // 17

  ws.push(['--- Koszty podstawowe ---']); // 18
  ws.push(['Jednostka ceny materiału', materialPriceUnit]); // 19
  ws.push([`Koszt materiału (€/${materialPriceUnit})`, parseFloat(tab.materialCost) || 0]); // 20
  ws.push(['Koszt pieczenia (€/8h)', parseFloat(tab.bakingCost) || 0]); // 21
  ws.push(['Koszt czyszczenia (€/8h)', parseFloat(tab.cleaningCost) || 0]); // 22
  ws.push(['Koszt obsługi (€/szt)', parseFloat(tab.handlingCost) || 0]); // 23
  ws.push(['Koszt stanowisk (€/szt)', workstationsCost]); // 24
  ws.push(['Koszt krzywych (€/szt)', curvesCost]); // 25
  ws.push([]); // 26

  ws.push(['--- Marże i koszty dodatkowe ---']); // 27
  ws.push(['SGA (%)', globalSGA || 0]); // 28
  ws.push(['Marża dodatkowa (%)', parseFloat(item.margin) || 0]); // 29
  ws.push([]); // 30

  ws.push(['--- Pakowanie (kompozycja) ---']); // 31
  if (isManualPackaging) {
    // Dla ręcznego pakowania: warstwy=1, części na warstwę=ręczna wartość
    ws.push(['Części na warstwę (RĘCZNE)', manualPartsInBox]); // 32
    ws.push(['Ilość warstw w kartonie (RĘCZNE)', 1]); // 33
  } else {
    ws.push(['Części na warstwę', packagingInfo?.partsPerLayer || 0]); // 32
    ws.push(['Ilość warstw w kartonie', packagingInfo?.layers || 1]); // 33
  }
  ws.push([]); // 34

  ws.push(['Typ opakowania (karton)', packagingInfo?.packagingTypeName || 'N/A']); // 35
  ws.push(['Koszt kartonu (€/szt)', packagingInfo?.cartonCost || 0]); // 36
  ws.push(['Waga kartonu pustego (kg)', packagingInfo?.emptyCartonWeight || 0]); // 37
  ws.push([]); // 38

  ws.push(['Kartonów na paletę', packagingInfo?.packagesPerPallet || 0]); // 39
  ws.push(['Koszt palety (€)', packagingInfo?.palletCost || 0]); // 40
  ws.push(['Waga palety pustej (kg)', packagingInfo?.emptyPalletWeight || 0]); // 41
  ws.push([]); // 42

  ws.push(['Palet na miejsce paletowe', packagingInfo?.palletsPerSpace || 1]); // 43
  ws.push(['Koszt transportu miejsca (€)', transportCostPerSpace]); // 44

  // === OBLICZENIA === (wiersze 45+)
  ws.push([]); // 45
  ws.push(['=== OBLICZENIA (automatyczne) ===']); // 46
  ws.push([]); // 47

  // Konwersja powierzchni
  ws.push(['Powierzchnia netto (m²)', { f: 'IF(C7="mm2", B7/1000000, B7)' }]); // 48
  ws.push(['Powierzchnia arkusza (m²)', { f: '(B10/1000)*(B11/1000)' }]); // 49
  ws.push(['Powierzchnia brutto (m²)', { f: 'B49/B12' }]); // 50
  ws.push([]); // 51

  // Wagi
  ws.push(['Waga netto (g)', { f: 'B48*B15*(B16/1000)*1000' }]); // 52
  ws.push(['Waga brutto (g)', { f: 'B50*B15*(B16/1000)*1000' }]); // 53
  ws.push(['Waga dla procesów (g)', { f: 'MAX(B52, B53)' }]); // 54
  ws.push([]); // 55

  // Koszty materiału - zależy od jednostki ceny
  let currentRow = 56;
  if (materialPriceUnit === 'm2') {
    ws.push(['Powierzchnia dla kosztu (m²)', { f: 'MAX(B48, B50)' }]); // 56
    ws.push(['Koszt materiału (€)', { f: 'B56*B20' }]); // 57
    currentRow = 58;
  } else {
    ws.push(['Koszt materiału (€)', { f: '(B53/1000)*B20' }]); // 56
    currentRow = 57;
  }

  // Procesy - pieczenie i czyszczenie
  ws.push(['Czas pieczenia (s)', { f: 'B54*3.6' }]); // 57 lub 58
  const bakingTimeRow = currentRow;
  currentRow++;

  ws.push(['Koszt pieczenia (€)', { f: `(B${bakingTimeRow}/3600)*(B21/8)` }]); // 58 lub 59
  const bakingCostRow = currentRow;
  currentRow++;

  ws.push(['Czas czyszczenia (s)', { f: 'B54*2.0' }]); // 59 lub 60
  const cleaningTimeRow = currentRow;
  currentRow++;

  ws.push(['Koszt czyszczenia (€)', { f: `(B${cleaningTimeRow}/3600)*(B22/8)` }]); // 60 lub 61
  const cleaningCostRow = currentRow;
  currentRow++;

  ws.push([]); // 61 lub 62
  currentRow++;

  // === PAKOWANIE (obliczenia) ===
  ws.push(['=== PAKOWANIE (obliczenia) ===']); // 62 lub 63
  currentRow++;

  ws.push([]); // 63 lub 64
  currentRow++;

  ws.push(['Części w kartonie', { f: 'B32*B33' }]); // 64 lub 65
  const partsInBoxRow = currentRow;
  currentRow++;

  ws.push(['Części na paletę', { f: `B${partsInBoxRow}*B39` }]); // 65 lub 66
  const partsPerPalletRow = currentRow;
  currentRow++;

  ws.push(['Części na miejsce paletowe', { f: `B${partsPerPalletRow}*B43` }]); // 66 lub 67
  const partsPerSpaceRow = currentRow;
  currentRow++;

  ws.push([]); // 67 lub 68
  currentRow++;

  ws.push(['Waga kartonu z częściami (kg)', { f: `B37+(B${partsInBoxRow}*B53/1000)` }]); // 68 lub 69
  const fullCartonWeightRow = currentRow;
  currentRow++;

  ws.push(['Waga palety z kartonami (kg)', { f: `B41+(B${fullCartonWeightRow}*B39)` }]); // 69 lub 70
  currentRow++;

  ws.push([]); // 70 lub 71
  currentRow++;

  ws.push(['Koszt kompozycji (€)', { f: '(B36*B39)+(B40*B43)' }]); // 71 lub 72
  const compositionCostRow = currentRow;
  currentRow++;

  ws.push(['Koszt pakowania / część (€)', { f: `B${compositionCostRow}/B${partsPerSpaceRow}` }]); // 72 lub 73
  const packagingCostPerPartRow = currentRow;
  currentRow++;

  // === TRANSPORT ===
  ws.push([]); // 73 lub 74
  currentRow++;

  ws.push(['=== TRANSPORT (obliczenia) ===']); // 74 lub 75
  currentRow++;

  ws.push([]); // 75 lub 76
  currentRow++;

  ws.push(['Koszt transportu / część (€)', { f: `B44/B${partsPerSpaceRow}` }]); // 76 lub 77
  const transportCostPerPartRow = currentRow;
  currentRow++;

  // === PODSUMOWANIE ===
  ws.push([]); // 77 lub 78
  currentRow++;

  ws.push(['=== PODSUMOWANIE ===']); // 78 lub 79
  currentRow++;

  ws.push([]); // 79 lub 80
  currentRow++;

  // Koszt produkcji - dodajemy też koszty krzywych
  const materialCostRow = materialPriceUnit === 'm2' ? 57 : 56;
  ws.push(['Koszt produkcji (€)', {
    f: `B${materialCostRow}+B${bakingCostRow}+B${cleaningCostRow}+IF(B24>0,B24,B23)+IF(B25>0,B25,0)+B${packagingCostPerPartRow}`
  }]); // 80 lub 81
  const productionCostRow = currentRow;
  currentRow++;

  // Marża SGA
  ws.push(['Marża SGA (€)', { f: `B${productionCostRow}*(B28/100)` }]); // 81 lub 82
  const sgaMarginRow = currentRow;
  currentRow++;

  ws.push(['Koszt po SGA (€)', { f: `B${productionCostRow}+B${sgaMarginRow}` }]); // 82 lub 83
  const costAfterSGARow = currentRow;
  currentRow++;

  // Marża dodatkowa
  ws.push(['Marża dodatkowa (€)', { f: `B${costAfterSGARow}*(B29/100)` }]); // 83 lub 84
  const additionalMarginRow = currentRow;
  currentRow++;

  ws.push(['Koszt po marży (EXW) (€)', { f: `B${costAfterSGARow}+B${additionalMarginRow}` }]); // 83 lub 84
  const costAfterMarginRow = currentRow;
  currentRow++;

  // Transport
  ws.push(['Koszt transportu (€)', { f: `B${transportCostPerPartRow}` }]); // 84 lub 85
  const transportTotalRow = currentRow;
  currentRow++;

  // Koszt całkowity
  ws.push(['Koszt całkowity / część (DAP) (€)', { f: `B${costAfterMarginRow}+B${transportTotalRow}` }]); // 85 lub 86
  const totalCostPerPartRow = currentRow;
  currentRow++;

  ws.push([]); // 86 lub 87
  currentRow++;

  ws.push(['Ilość roczna (szt)', parseFloat(item.annualVolume) || 0]); // 87 lub 88
  const annualVolumeRow = currentRow;
  currentRow++;

  ws.push(['Koszt roczny (€)', { f: `B${totalCostPerPartRow}*B${annualVolumeRow}` }]); // 88 lub 89

  return {
    data: ws,
    exwRow: costAfterMarginRow,
    dapRow: totalCostPerPartRow,
    additionalMarginRow: additionalMarginRow
  };
};

/**
 * Tworzy arkusz z formułami dla trybu weight/volume
 * PRZEPISANE ABY ZAWIERAŁO WSZYSTKIE ELEMENTY JAK SURFACE MODE
 */
const createWeightModeSheet = (item, tab, globalSGA, packagingTypes, compositions, calculationMeta, transportTypes) => {
  const ws = [];

  // Pobierz pełne dane pakowania
  const packagingInfo = getPackagingInfo(item, packagingTypes, compositions);

  const workstationsCost = item.results?.workstationsCost || 0;
  const curvesCost = item.results?.customCurvesCost || 0;

  // Oblicz koszt transportu na miejsce paletowe
  const transportCostPerSpace = calculateTransportCostPerSpace(calculationMeta);

  // Sprawdź czy pakowanie jest ręczne
  const isManualPackaging = item.packaging?.manualPartsInBox || false;
  const manualPartsInBox = isManualPackaging ? (parseFloat(item.packaging?.partsInBox) || 0) : 0;

  // === NAGŁÓWEK === (wiersze 1-4)
  ws.push([`KALKULACJA: ${item.partId || 'N/A'}`]); // 1
  ws.push([`Materiał: ${tab.name || 'N/A'}`]); // 2
  ws.push([`Tryb: Waga`]); // 3
  ws.push([]); // 4

  // === PARAMETRY WEJŚCIOWE === (wiersze 5-)
  ws.push(['=== PARAMETRY WEJŚCIOWE (można edytować) ===']); // 5
  ws.push([]); // 6

  // Wagi
  ws.push(['Waga netto (g)', parseFloat(item.weight) || 0]); // 7
  const nettoWeightRow = 7;

  const weightOption = item.weightOption || 'netto';
  ws.push(['Opcja wagi brutto', weightOption]); // 8

  // Dla brutto-manual: waga z pola bruttoWeight
  // Dla brutto-auto: waga z wyników (obliczona krzywą)
  // Dla netto: waga równa netto
  let bruttoWeightValue = 0;
  if (weightOption === 'brutto-manual') {
    bruttoWeightValue = parseFloat(item.bruttoWeight) || 0;
    ws.push(['Waga brutto (g) - ręczna', bruttoWeightValue]); // 9
  } else if (weightOption === 'brutto-auto') {
    bruttoWeightValue = item.results?.bruttoWeight || parseFloat(item.weight) || 0;
    ws.push(['Waga brutto (g) - z krzywej', bruttoWeightValue]); // 9
  } else {
    bruttoWeightValue = parseFloat(item.weight) || 0;
    ws.push(['Waga brutto (g) - netto', bruttoWeightValue]); // 9
  }
  const bruttoWeightRow = 9;

  ws.push([]); // 10

  // Szczegóły materiału
  ws.push(['--- Szczegóły materiału ---']); // 11
  const density = parseFloat(item.density) || parseFloat(item.customValues?.density) || parseFloat(tab.density) || 0;
  ws.push(['Gęstość materiału (kg/m³)', density]); // 12
  ws.push(['Grubość (mm)', parseFloat(item.thickness) || 0]); // 13
  ws.push([]); // 14

  // Ceny materiałów i procesów
  ws.push(['--- Koszty podstawowe ---']); // 15
  const materialPriceUnit = tab.materialPriceUnit || 'kg';
  ws.push(['Jednostka ceny materiału', materialPriceUnit]); // 16
  ws.push([`Koszt materiału (€/${materialPriceUnit})`, parseFloat(tab.materialCost) || 0]); // 17
  const materialCostRow = 17;

  ws.push(['Koszt pieczenia (€/8h)', parseFloat(tab.bakingCost) || 0]); // 18
  const bakingCostRow = 18;

  ws.push(['Koszt czyszczenia (€/8h)', parseFloat(tab.cleaningCost) || 0]); // 19
  const cleaningCostRow = 19;

  ws.push(['Koszt obsługi (€/szt)', parseFloat(tab.handlingCost) || 0]); // 20
  ws.push(['Koszt stanowisk (€/szt)', workstationsCost]); // 21
  ws.push(['Koszt krzywych (€/szt)', curvesCost]); // 22
  ws.push([]); // 23

  // Marże
  ws.push(['--- Marże i koszty dodatkowe ---']); // 24
  ws.push(['SGA (%)', globalSGA || 0]); // 25
  const sgaRow = 25;
  ws.push(['Marża dodatkowa (%)', parseFloat(item.margin) || 0]); // 26
  ws.push([]); // 27

  // Pakowanie
  ws.push(['--- Pakowanie (kompozycja) ---']); // 28
  if (isManualPackaging) {
    ws.push(['Części na warstwę (RĘCZNE)', manualPartsInBox]); // 29
    ws.push(['Ilość warstw w kartonie (RĘCZNE)', 1]); // 30
  } else {
    ws.push(['Części na warstwę', packagingInfo?.partsPerLayer || 0]); // 29
    ws.push(['Ilość warstw w kartonie', packagingInfo?.layers || 1]); // 30
  }
  ws.push([]); // 31

  ws.push(['Typ opakowania (karton)', packagingInfo?.packagingTypeName || 'N/A']); // 32
  ws.push(['Koszt kartonu (€/szt)', packagingInfo?.cartonCost || 0]); // 33
  ws.push(['Waga kartonu pustego (kg)', packagingInfo?.emptyCartonWeight || 0]); // 34
  ws.push([]); // 35

  ws.push(['Kartonów na paletę', packagingInfo?.packagesPerPallet || 0]); // 36
  ws.push(['Koszt palety (€)', packagingInfo?.palletCost || 0]); // 37
  ws.push(['Waga palety pustej (kg)', packagingInfo?.emptyPalletWeight || 0]); // 38
  ws.push([]); // 39

  ws.push(['Palet na miejsce paletowe', packagingInfo?.palletsPerSpace || 1]); // 40
  ws.push(['Koszt transportu miejsca (€)', transportCostPerSpace]); // 41

  // === OBLICZENIA === (wiersze 42+)
  ws.push([]); // 42
  ws.push(['=== OBLICZENIA (automatyczne) ===']); // 43
  ws.push([]); // 44

  // Waga brutto do obliczeń - po prostu odczytujemy z wiersza 9
  ws.push(['Waga brutto do obliczeń (g)', { f: `B${bruttoWeightRow}` }]); // 45
  const bruttoCalcRow = 45;

  // Waga dla procesów
  ws.push(['Waga dla procesów (g)', { f: `MAX(B${nettoWeightRow}, B${bruttoCalcRow})` }]); // 46
  const weightForProcessesRow = 46;

  ws.push([]); // 47

  // Koszt materiału
  ws.push(['Koszt materiału (€)', { f: `(B${bruttoCalcRow}/1000)*B${materialCostRow}` }]); // 48
  const materialCostTotalRow = 48;

  // Czas pieczenia
  ws.push(['Czas pieczenia (s)', { f: `B${weightForProcessesRow}*3.6` }]); // 49
  const bakingTimeRow = 49;

  ws.push(['Koszt pieczenia (€)', { f: `(B${bakingTimeRow}/3600)*(B${bakingCostRow}/8)` }]); // 50
  const bakingCostTotalRow = 50;

  // Czas czyszczenia
  const cleaningOption = item.cleaningOption || 'scaled';
  if (cleaningOption === 'scaled') {
    ws.push(['Czas czyszczenia (s)', { f: `B${weightForProcessesRow}*2.0` }]); // 51
  } else {
    ws.push(['Czas czyszczenia (s) - ręczny', parseFloat(item.manualCleaningTime) || 0]); // 51
  }
  const cleaningTimeRow = 51;

  ws.push(['Koszt czyszczenia (€)', { f: `(B${cleaningTimeRow}/3600)*(B${cleaningCostRow}/8)` }]); // 52
  const cleaningCostTotalRow = 52;

  ws.push([]); // 53

  // === PAKOWANIE (obliczenia) ===
  ws.push(['=== PAKOWANIE (obliczenia) ===']); // 54
  ws.push([]); // 55

  ws.push(['Części w kartonie', { f: 'B29*B30' }]); // 56
  const partsInBoxRow = 56;

  ws.push(['Części na paletę', { f: `B${partsInBoxRow}*B36` }]); // 57
  const partsPerPalletRow = 57;

  ws.push(['Części na miejsce paletowe', { f: `B${partsPerPalletRow}*B40` }]); // 58
  const partsPerSpaceRow = 58;

  ws.push([]); // 59

  ws.push(['Waga kartonu z częściami (kg)', { f: `B34+(B${partsInBoxRow}*B${bruttoCalcRow}/1000)` }]); // 60
  const fullCartonWeightRow = 60;

  ws.push(['Waga palety z kartonami (kg)', { f: `B38+(B${fullCartonWeightRow}*B36)` }]); // 61

  ws.push([]); // 62

  ws.push(['Koszt kompozycji (€)', { f: '(B33*B36)+(B37*B40)' }]); // 63
  const compositionCostRow = 63;

  ws.push(['Koszt pakowania / część (€)', { f: `B${compositionCostRow}/B${partsPerSpaceRow}` }]); // 64
  const packagingCostPerPartRow = 64;

  // === TRANSPORT ===
  ws.push([]); // 65
  ws.push(['=== TRANSPORT (obliczenia) ===']); // 66
  ws.push([]); // 67

  ws.push(['Koszt transportu / część (€)', { f: `B41/B${partsPerSpaceRow}` }]); // 68
  const transportCostPerPartRow = 68;

  // === PODSUMOWANIE ===
  ws.push([]); // 69
  ws.push(['=== PODSUMOWANIE ===']); // 70
  ws.push([]); // 71

  // Koszt produkcji
  ws.push(['Koszt produkcji (€)', {
    f: `B${materialCostTotalRow}+B${bakingCostTotalRow}+B${cleaningCostTotalRow}+IF(B21>0,B21,B20)+IF(B22>0,B22,0)+B${packagingCostPerPartRow}`
  }]); // 72
  const productionCostRow = 72;

  // Marża SGA
  ws.push(['Marża SGA (€)', { f: `B${productionCostRow}*(B${sgaRow}/100)` }]); // 73
  const sgaMarginRow = 73;

  ws.push(['Koszt po SGA (€)', { f: `B${productionCostRow}+B${sgaMarginRow}` }]); // 74
  const costAfterSGARow = 74;

  // Marża dodatkowa
  ws.push(['Marża dodatkowa (€)', { f: `B${costAfterSGARow}*(B26/100)` }]); // 75
  const additionalMarginRow = 75;

  ws.push(['Koszt po marży (EXW) (€)', { f: `B${costAfterSGARow}+B${additionalMarginRow}` }]); // 76
  const costAfterMarginRow = 76;

  // Transport
  ws.push(['Koszt transportu (€)', { f: `B${transportCostPerPartRow}` }]); // 77
  const transportTotalRow = 77;

  // Koszt całkowity
  ws.push(['Koszt całkowity / część (DAP) (€)', { f: `B${costAfterMarginRow}+B${transportTotalRow}` }]); // 78
  const totalCostPerPartRow = 78;

  ws.push([]); // 79
  ws.push(['Ilość roczna (szt)', parseFloat(item.annualVolume) || 0]); // 80
  const annualVolumeRow = 80;

  ws.push(['Koszt roczny (€)', { f: `B${totalCostPerPartRow}*B${annualVolumeRow}` }]); // 81

  return {
    data: ws,
    exwRow: costAfterMarginRow,
    dapRow: totalCostPerPartRow,
    additionalMarginRow: additionalMarginRow
  };
};

/**
 * Tworzy arkusz z formułami dla trybu multilayer
 * Każda warstwa liczona jak powierzchnia (surface mode)
 */
const createMultilayerModeSheet = (item, tab, globalSGA, packagingTypes, compositions, calculationMeta, transportTypes) => {
  const ws = [];
  const multilayer = item.multilayer || { layers: [] };
  const packagingInfo = getPackagingInfo(item, packagingTypes, compositions);
  const workstationsCost = item.results?.workstationsCost || 0;
  const curvesCost = item.results?.customCurvesCost || 0;

  // Oblicz koszt transportu na miejsce paletowe
  const transportCostPerSpace = calculateTransportCostPerSpace(calculationMeta);

  console.log('🔧 Multilayer mode - checking values:');
  console.log('  workstationsCost:', workstationsCost);
  console.log('  curvesCost:', curvesCost);
  console.log('  item.results:', item.results);
  console.log('  item.packaging:', item.packaging);

  // Sprawdź czy pakowanie jest ręczne
  const isManualPackaging = item.packaging?.manualPartsInBox || false;
  const manualPartsInBox = isManualPackaging ? (parseFloat(item.packaging?.partsInBox) || 0) : 0;

  console.log('  isManualPackaging:', isManualPackaging);
  console.log('  manualPartsInBox:', manualPartsInBox);

  // === NAGŁÓWEK ===
  ws.push([`KALKULACJA: ${item.partId || 'N/A'}`]); // 1
  ws.push([`Materiał: Multilayer (${multilayer.layers.length} warstw)`]); // 2
  ws.push([`Tryb: Wielowarstwowy`]); // 3
  ws.push([]); // 4

  // === PARAMETRY GLOBALNE ===
  ws.push(['=== PARAMETRY GLOBALNE ===']); // 5
  ws.push([]); // 6

  ws.push(['SGA (%)', globalSGA || 0]); // 7
  ws.push(['Marża dodatkowa (%)', parseFloat(item.margin) || 0]); // 8
  ws.push(['Koszt stanowisk (€/szt)', workstationsCost]); // 9
  ws.push(['Koszt krzywych (€/szt)', curvesCost]); // 10
  ws.push([]); // 11

  // === PAKOWANIE ===
  ws.push(['--- Pakowanie (kompozycja) ---']); // 12
  if (isManualPackaging) {
    // Dla ręcznego pakowania: warstwy=1, części na warstwę=ręczna wartość
    ws.push(['Części na warstwę (RĘCZNE)', manualPartsInBox]); // 13
    ws.push(['Ilość warstw w kartonie (RĘCZNE)', 1]); // 14
  } else {
    ws.push(['Części na warstwę', packagingInfo?.partsPerLayer || 0]); // 13
    ws.push(['Ilość warstw w kartonie', packagingInfo?.layers || 1]); // 14
  }
  ws.push(['Typ opakowania (karton)', packagingInfo?.packagingTypeName || 'N/A']); // 15
  ws.push(['Koszt kartonu (€/szt)', packagingInfo?.cartonCost || 0]); // 16
  ws.push(['Waga kartonu pustego (kg)', packagingInfo?.emptyCartonWeight || 0]); // 17
  ws.push(['Kartonów na paletę', packagingInfo?.packagesPerPallet || 0]); // 18
  ws.push(['Koszt palety (€)', packagingInfo?.palletCost || 0]); // 19
  ws.push(['Waga palety pustej (kg)', packagingInfo?.emptyPalletWeight || 0]); // 20
  ws.push(['Palet na miejsce paletowe', packagingInfo?.palletsPerSpace || 1]); // 21
  ws.push(['Koszt transportu miejsca (€)', transportCostPerSpace]); // 22
  ws.push([]); // 23

  let currentRow = 24;
  const layerCostRows = [];
  const layerWeightRows = [];

  // === WARSTWY ===
  multilayer.layers.forEach((layer, layerIndex) => {
    ws.push([`=== WARSTWA ${layerIndex + 1}: ${layer.name} ===`]); // currentRow
    currentRow++;
    ws.push([]); // currentRow
    currentRow++;

    // Parametry warstwy
    const layerStartRow = currentRow;
    ws.push(['Powierzchnia netto (m²)', parseFloat(layer.surfaceNetto) || 0]); // currentRow
    const surfaceNettoRow = currentRow;
    currentRow++;

    ws.push(['Powierzchnia brutto (m²)', parseFloat(layer.surfaceBrutto) || 0]); // currentRow
    const surfaceBruttoRow = currentRow;
    currentRow++;

    ws.push(['Grubość (mm)', parseFloat(layer.thickness) || 0]); // currentRow
    const thicknessRow = currentRow;
    currentRow++;

    ws.push(['Gęstość (kg/m³)', parseFloat(layer.density) || 0]); // currentRow
    const densityRow = currentRow;
    currentRow++;

    const priceUnit = layer.priceUnit || 'kg';
    ws.push(['Jednostka ceny', priceUnit]); // currentRow
    const priceUnitRow = currentRow;
    currentRow++;

    ws.push([`Cena materiału (€/${priceUnit})`, parseFloat(layer.price) || 0]); // currentRow
    const priceRow = currentRow;
    currentRow++;

    ws.push(['Koszt pieczenia (€/8h)', parseFloat(tab.bakingCost) || 0]); // currentRow
    const bakingCostHourRow = currentRow;
    currentRow++;

    ws.push(['Koszt czyszczenia (€/8h)', parseFloat(tab.cleaningCost) || 0]); // currentRow
    const cleaningCostHourRow = currentRow;
    currentRow++;

    ws.push([]); // currentRow
    currentRow++;

    // Obliczenia warstwy
    ws.push(['--- Obliczenia warstwy ---']); // currentRow
    currentRow++;

    ws.push(['Waga netto (g)', { f: `B${surfaceNettoRow}*B${densityRow}*(B${thicknessRow}/1000)*1000` }]); // currentRow
    const weightNettoRow = currentRow;
    layerWeightRows.push(weightNettoRow);
    currentRow++;

    ws.push(['Waga brutto (g)', { f: `B${surfaceBruttoRow}*B${densityRow}*(B${thicknessRow}/1000)*1000` }]); // currentRow
    const weightBruttoRow = currentRow;
    currentRow++;

    ws.push(['Waga dla procesów (g)', { f: `MAX(B${weightNettoRow}, B${weightBruttoRow})` }]); // currentRow
    const weightForProcessesRow = currentRow;
    currentRow++;

    // Koszt materiału
    if (priceUnit === 'm2') {
      ws.push(['Powierzchnia dla kosztu (m²)', { f: `MAX(B${surfaceNettoRow}, B${surfaceBruttoRow})` }]); // currentRow
      const surfaceForCostRow = currentRow;
      currentRow++;

      ws.push(['Koszt materiału (€)', { f: `B${surfaceForCostRow}*B${priceRow}` }]); // currentRow
      const materialCostRow = currentRow;
      currentRow++;
    } else {
      ws.push(['Koszt materiału (€)', { f: `(B${weightBruttoRow}/1000)*B${priceRow}` }]); // currentRow
      const materialCostRow = currentRow;
      currentRow++;
    }
    const materialCostRow = currentRow - 1;

    // Procesy
    ws.push(['Czas pieczenia (s)', { f: `B${weightForProcessesRow}*3.6` }]); // currentRow
    const bakingTimeRow = currentRow;
    currentRow++;

    ws.push(['Koszt pieczenia (€)', { f: `(B${bakingTimeRow}/3600)*(B${bakingCostHourRow}/8)` }]); // currentRow
    const bakingCostRow = currentRow;
    currentRow++;

    ws.push(['Czas czyszczenia (s)', { f: `B${weightForProcessesRow}*2.0` }]); // currentRow
    const cleaningTimeRow = currentRow;
    currentRow++;

    ws.push(['Koszt czyszczenia (€)', { f: `(B${cleaningTimeRow}/3600)*(B${cleaningCostHourRow}/8)` }]); // currentRow
    const cleaningCostRow = currentRow;
    currentRow++;

    ws.push(['Koszt warstwy (€)', { f: `B${materialCostRow}+B${bakingCostRow}+B${cleaningCostRow}` }]); // currentRow
    const layerTotalCostRow = currentRow;
    layerCostRows.push(layerTotalCostRow);
    currentRow++;

    ws.push([]); // currentRow
    currentRow++;
  });

  // === PAKOWANIE (obliczenia) ===
  ws.push(['=== PAKOWANIE (obliczenia) ===']); // currentRow
  currentRow++;
  ws.push([]); // currentRow
  currentRow++;

  ws.push(['Części w kartonie', { f: 'B13*B14' }]); // currentRow
  const partsInBoxRow = currentRow;
  currentRow++;

  ws.push(['Części na paletę', { f: `B${partsInBoxRow}*B18` }]); // currentRow - B18 = Kartonów na paletę
  const partsPerPalletRow = currentRow;
  currentRow++;

  ws.push(['Części na miejsce paletowe', { f: `B${partsPerPalletRow}*B21` }]); // currentRow - B21 = Palet na miejsce
  const partsPerSpaceRow = currentRow;
  currentRow++;

  ws.push([]); // currentRow
  currentRow++;

  // Suma wag wszystkich warstw
  const weightSumFormula = layerWeightRows.map(r => `B${r}`).join('+');
  ws.push(['Waga całkowita netto (g)', { f: weightSumFormula }]); // currentRow
  const totalWeightRow = currentRow;
  currentRow++;

  ws.push(['Waga kartonu z częściami (kg)', { f: `B17+(B${partsInBoxRow}*B${totalWeightRow}/1000)` }]); // currentRow - B17 = Waga kartonu pustego
  const fullCartonWeightRow = currentRow;
  currentRow++;

  ws.push(['Waga palety z kartonami (kg)', { f: `B20+(B${fullCartonWeightRow}*B18)` }]); // currentRow - B20 = Waga palety pustej, B18 = Kartonów na paletę
  currentRow++;

  ws.push([]); // currentRow
  currentRow++;

  ws.push(['Koszt kompozycji (€)', { f: '(B16*B18)+(B19*B21)' }]); // currentRow - (koszt kartonu * kartony na paletę) + (koszt palety * palety na miejsce)
  const compositionCostRow = currentRow;
  currentRow++;

  ws.push(['Koszt pakowania / część (€)', { f: `B${compositionCostRow}/B${partsPerSpaceRow}` }]); // currentRow
  const packagingCostPerPartRow = currentRow;
  currentRow++;

  // === TRANSPORT ===
  ws.push([]); // currentRow
  currentRow++;

  ws.push(['=== TRANSPORT (obliczenia) ===']); // currentRow
  currentRow++;
  ws.push([]); // currentRow
  currentRow++;

  ws.push(['Koszt transportu / część (€)', { f: `B22/B${partsPerSpaceRow}` }]); // currentRow - B22 = Koszt transportu miejsca
  const transportCostPerPartRow = currentRow;
  currentRow++;

  // === PODSUMOWANIE ===
  ws.push([]); // currentRow
  currentRow++;

  ws.push(['=== PODSUMOWANIE ===']); // currentRow
  currentRow++;
  ws.push([]); // currentRow
  currentRow++;

  // Suma kosztów wszystkich warstw
  const layerCostSumFormula = layerCostRows.map(r => `B${r}`).join('+');
  ws.push(['Koszt wszystkich warstw (€)', { f: layerCostSumFormula }]); // currentRow
  const allLayersCostRow = currentRow;
  currentRow++;

  ws.push(['Koszt produkcji (€)', { f: `B${allLayersCostRow}+IF(B9>0,B9,0)+IF(B10>0,B10,0)+B${packagingCostPerPartRow}` }]); // currentRow - Dodano koszty stanowisk (B9) i krzywych (B10)
  const productionCostRow = currentRow;
  currentRow++;

  // Marża SGA
  ws.push(['Marża SGA (€)', { f: `B${productionCostRow}*(B7/100)` }]); // currentRow
  const sgaMarginRow = currentRow;
  currentRow++;

  ws.push(['Koszt po SGA (€)', { f: `B${productionCostRow}+B${sgaMarginRow}` }]); // currentRow
  const costAfterSGARow = currentRow;
  currentRow++;

  // Marża dodatkowa
  ws.push(['Marża dodatkowa (€)', { f: `B${costAfterSGARow}*(B8/100)` }]); // currentRow
  const additionalMarginRow = currentRow;
  currentRow++;

  ws.push(['Koszt po marży (EXW) (€)', { f: `B${costAfterSGARow}+B${additionalMarginRow}` }]); // currentRow
  const costAfterMarginRow = currentRow;
  currentRow++;

  // Transport
  ws.push(['Koszt transportu (€)', { f: `B${transportCostPerPartRow}` }]); // currentRow
  const transportTotalRow = currentRow;
  currentRow++;

  // Koszt całkowity
  ws.push(['Koszt całkowity / część (DAP) (€)', { f: `B${costAfterMarginRow}+B${transportTotalRow}` }]); // currentRow
  const totalCostPerPartRow = currentRow;
  currentRow++;

  ws.push([]); // currentRow
  currentRow++;

  ws.push(['Ilość roczna (szt)', parseFloat(item.annualVolume) || 0]); // currentRow
  const annualVolumeRow = currentRow;
  currentRow++;

  ws.push(['Koszt roczny (€)', { f: `B${totalCostPerPartRow}*B${annualVolumeRow}` }]); // currentRow

  return {
    data: ws,
    exwRow: costAfterMarginRow,
    dapRow: totalCostPerPartRow,
    additionalMarginRow: additionalMarginRow
  };
};

/**
 * Tworzy arkusz z formułami dla trybu heatshield
 * Heatshield ma dwa materiały: blachę (sheet) i matę izolacyjną (mat)
 */
const createHeatshieldModeSheet = (item, tab, globalSGA, packagingTypes, compositions, calculationMeta, transportTypes) => {
  const ws = [];
  const h = item.heatshield || {};

  // Pobierz pełne dane pakowania
  const packagingInfo = getPackagingInfo(item, packagingTypes, compositions);

  const workstationsCost = item.results?.workstationsCost || 0;
  const curvesCost = item.results?.customCurvesCost || 0;
  const laserCost = item.results?.laserCost || 0;

  // Oblicz koszt transportu na miejsce paletowe
  const transportCostPerSpace = calculateTransportCostPerSpace(calculationMeta);

  // Sprawdź czy pakowanie jest ręczne
  const isManualPackaging = item.packaging?.manualPartsInBox || false;
  const manualPartsInBox = isManualPackaging ? (parseFloat(item.packaging?.partsInBox) || 0) : 0;

  // === NAGŁÓWEK === (wiersze 1-4)
  ws.push([`KALKULACJA: ${item.partId || 'N/A'}`]); // 1
  ws.push([`Materiał: Heatshield (blacha + mata)`]); // 2
  ws.push([`Tryb: Heatshield`]); // 3
  ws.push([]); // 4

  // === PARAMETRY WEJŚCIOWE === (wiersze 5-)
  ws.push(['=== PARAMETRY WEJŚCIOWE (można edytować) ===']); // 5
  ws.push([]); // 6

  ws.push(['--- Powierzchnia ---']); // 7
  const surfaceUnit = h.surfaceUnit || 'mm2';
  ws.push(['Powierzchnia netto (m²)', parseFloat(h.surfaceNetto) || 0, surfaceUnit]); // 8
  ws.push([]); // 9

  ws.push(['--- Blacha (Sheet) ---']); // 10
  ws.push(['Grubość blachy (mm)', parseFloat(h.sheetThickness) || 0]); // 11
  ws.push(['Gęstość blachy (kg/m³)', parseFloat(h.sheetDensity) || 0]); // 12
  ws.push(['Powierzchnia brutto blachy (m²)', parseFloat(h.surfaceBruttoSheet) || 0]); // 13
  ws.push(['Powierzchnia netto blachy (m²)', parseFloat(h.surfaceNettoSheet) || 0]); // 14
  ws.push(['Waga blachy (g)', parseFloat(h.sheetWeight) || 0]); // 15
  const sheetPriceUnit = h.sheetPriceUnit || 'kg';
  ws.push(['Jednostka ceny blachy', sheetPriceUnit]); // 16
  ws.push([`Cena blachy (€/${sheetPriceUnit})`, parseFloat(h.sheetPrice) || 0]); // 17
  ws.push([]); // 18

  ws.push(['--- Mata izolacyjna (Mat) ---']); // 19
  ws.push(['Grubość maty (mm)', parseFloat(h.matThickness) || 0]); // 20
  ws.push(['Gęstość maty (kg/m³)', parseFloat(h.matDensity) || 0]); // 21
  ws.push(['Powierzchnia netto maty (m²)', parseFloat(h.surfaceNettoMat) || 0]); // 22
  ws.push(['Waga maty (g)', parseFloat(h.matWeight) || 0]); // 23
  const matPriceUnit = h.matPriceUnit || 'm2';
  ws.push(['Jednostka ceny maty', matPriceUnit]); // 24
  ws.push([`Cena maty (€/${matPriceUnit})`, parseFloat(h.matPrice) || 0]); // 25
  ws.push([]); // 26

  ws.push(['--- Koszty procesów ---']); // 27
  ws.push(['Koszt lasera (€/szt)', laserCost]); // 28
  ws.push(['Koszt gięcia (€/szt)', parseFloat(h.bendingCost) || 0]); // 29
  ws.push(['Koszt łączenia (€/szt)', parseFloat(h.joiningCost) || 0]); // 30
  ws.push(['Koszt klejenia (€/szt)', parseFloat(h.gluingCost) || 0]); // 31
  ws.push(['Koszt stanowisk (€/szt)', workstationsCost]); // 32
  ws.push(['Koszt krzywych (€/szt)', curvesCost]); // 33
  ws.push([]); // 34

  ws.push(['--- Marże i koszty dodatkowe ---']); // 35
  ws.push(['SGA (%)', globalSGA || 0]); // 36
  ws.push(['Marża dodatkowa (%)', parseFloat(item.margin) || 0]); // 37
  ws.push([]); // 38

  ws.push(['--- Pakowanie (kompozycja) ---']); // 39
  if (isManualPackaging) {
    ws.push(['Części na warstwę (RĘCZNE)', manualPartsInBox]); // 40
    ws.push(['Ilość warstw w kartonie (RĘCZNE)', 1]); // 41
  } else {
    ws.push(['Części na warstwę', packagingInfo?.partsPerLayer || 0]); // 40
    ws.push(['Ilość warstw w kartonie', packagingInfo?.layers || 1]); // 41
  }
  ws.push([]); // 42

  ws.push(['Typ opakowania (karton)', packagingInfo?.packagingTypeName || 'N/A']); // 43
  ws.push(['Koszt kartonu (€/szt)', packagingInfo?.cartonCost || 0]); // 44
  ws.push(['Waga kartonu pustego (kg)', packagingInfo?.emptyCartonWeight || 0]); // 45
  ws.push([]); // 46

  ws.push(['Kartonów na paletę', packagingInfo?.packagesPerPallet || 0]); // 47
  ws.push(['Koszt palety (€)', packagingInfo?.palletCost || 0]); // 48
  ws.push(['Waga palety pustej (kg)', packagingInfo?.emptyPalletWeight || 0]); // 49
  ws.push([]); // 50

  ws.push(['Palet na miejsce paletowe', packagingInfo?.palletsPerSpace || 1]); // 51
  ws.push(['Koszt transportu miejsca (€)', transportCostPerSpace]); // 52

  // === OBLICZENIA === (wiersze 53+)
  ws.push([]); // 53
  ws.push(['=== OBLICZENIA (automatyczne) ===']); // 54
  ws.push([]); // 55

  ws.push(['--- Koszty materiałów ---']); // 56

  // Koszt blachy
  if (sheetPriceUnit === 'kg') {
    ws.push(['Koszt blachy (€)', { f: '(B15/1000)*B17' }]); // 57
  } else {
    ws.push(['Koszt blachy (€)', { f: 'B13*B17' }]); // 57 - powierzchnia brutto * cena
  }
  const sheetCostRow = 57;

  // Koszt maty
  if (matPriceUnit === 'kg') {
    ws.push(['Koszt maty (€)', { f: '(B23/1000)*B25' }]); // 58
  } else {
    ws.push(['Koszt maty (€)', { f: 'B22*B25' }]); // 58 - powierzchnia netto * cena
  }
  const matCostRow = 58;

  ws.push(['Koszt materiałów łącznie (€)', { f: `B${sheetCostRow}+B${matCostRow}` }]); // 59
  const totalMaterialCostRow = 59;

  ws.push([]); // 60

  ws.push(['--- Koszty procesów ---']); // 61
  ws.push(['Koszt lasera (€)', { f: 'B28' }]); // 62
  ws.push(['Koszt gięcia (€)', { f: 'B29' }]); // 63
  ws.push(['Koszt łączenia (€)', { f: 'B30' }]); // 64
  ws.push(['Koszt klejenia (€)', { f: 'B31' }]); // 65
  ws.push(['Koszt stanowisk (€)', { f: 'B32' }]); // 66
  ws.push(['Koszt krzywych (€)', { f: 'B33' }]); // 67

  ws.push([]); // 68

  // === PAKOWANIE (obliczenia) ===
  ws.push(['=== PAKOWANIE (obliczenia) ===']); // 69
  ws.push([]); // 70

  ws.push(['Części w kartonie', { f: 'B40*B41' }]); // 71
  const partsInBoxRow = 71;

  ws.push(['Części na paletę', { f: `B${partsInBoxRow}*B47` }]); // 72
  const partsPerPalletRow = 72;

  ws.push(['Części na miejsce paletowe', { f: `B${partsPerPalletRow}*B51` }]); // 73
  const partsPerSpaceRow = 73;

  ws.push([]); // 74

  // Waga całkowita (blacha + mata)
  ws.push(['Waga całkowita (g)', { f: 'B15+B23' }]); // 75
  const totalWeightRow = 75;

  ws.push(['Waga kartonu z częściami (kg)', { f: `B45+(B${partsInBoxRow}*B${totalWeightRow}/1000)` }]); // 76
  const fullCartonWeightRow = 76;

  ws.push(['Waga palety z kartonami (kg)', { f: `B49+(B${fullCartonWeightRow}*B47)` }]); // 77

  ws.push([]); // 78

  ws.push(['Koszt kompozycji (€)', { f: '(B44*B47)+(B48*B51)' }]); // 79
  const compositionCostRow = 79;

  ws.push(['Koszt pakowania / część (€)', { f: `B${compositionCostRow}/B${partsPerSpaceRow}` }]); // 80
  const packagingCostPerPartRow = 80;

  // === TRANSPORT ===
  ws.push([]); // 81
  ws.push(['=== TRANSPORT (obliczenia) ===']); // 82
  ws.push([]); // 83

  ws.push(['Koszt transportu / część (€)', { f: `B52/B${partsPerSpaceRow}` }]); // 84
  const transportCostPerPartRow = 84;

  // === PODSUMOWANIE ===
  ws.push([]); // 85
  ws.push(['=== PODSUMOWANIE ===']); // 86
  ws.push([]); // 87

  // Koszt produkcji
  ws.push(['Koszt produkcji (€)', {
    f: `B${totalMaterialCostRow}+B62+B63+B64+B65+B66+B67+B${packagingCostPerPartRow}`
  }]); // 88
  const productionCostRow = 88;

  // Marża SGA
  ws.push(['Marża SGA (€)', { f: `B${productionCostRow}*(B36/100)` }]); // 89
  const sgaMarginRow = 89;

  ws.push(['Koszt po SGA (€)', { f: `B${productionCostRow}+B${sgaMarginRow}` }]); // 90
  const costAfterSGARow = 90;

  // Marża dodatkowa
  ws.push(['Marża dodatkowa (€)', { f: `B${costAfterSGARow}*(B37/100)` }]); // 91
  const additionalMarginRow = 91;

  ws.push(['Koszt po marży (EXW) (€)', { f: `B${costAfterSGARow}+B${additionalMarginRow}` }]); // 92
  const costAfterMarginRow = 92;

  // Transport
  ws.push(['Koszt transportu (€)', { f: `B${transportCostPerPartRow}` }]); // 93
  const transportTotalRow = 93;

  // Koszt całkowity
  ws.push(['Koszt całkowity / część (DAP) (€)', { f: `B${costAfterMarginRow}+B${transportTotalRow}` }]); // 94
  const totalCostPerPartRow = 94;

  ws.push([]); // 95
  ws.push(['Ilość roczna (szt)', parseFloat(item.annualVolume) || 0]); // 96
  const annualVolumeRow = 96;

  ws.push(['Koszt roczny (€)', { f: `B${totalCostPerPartRow}*B${annualVolumeRow}` }]); // 97

  return {
    data: ws,
    exwRow: costAfterMarginRow,
    dapRow: totalCostPerPartRow,
    additionalMarginRow: additionalMarginRow
  };
};
/**
 * Tworzy arkusz summary z podsumowaniem wszystkich elementów
 * @param {Array} itemsWithRows - Tablica obiektów { item, sheetName, exwRow, dapRow }
 */
const createSummarySheet = (itemsWithRows) => {
  const ws = [];

  ws.push(['PODSUMOWANIE KALKULACJI']);
  ws.push([]);

  // Nagłówek: Part ID | Cena EXW (€) | Cena DAP (€) | [Lata prognozy jeśli dostępne]
  const header = ['Part ID', 'Cena EXW (€)', 'Cena DAP (€)'];

  // Sprawdź czy którykolwiek item ma kalendarz prognoz
  const hasForecast = itemsWithRows.some(({ item }) => item.volumeForecast?.enabled);

  if (hasForecast) {
    // Znajdź wszystkie lata z prognoz
    const allYears = new Set();
    itemsWithRows.forEach(({ item }) => {
      if (item.volumeForecast?.enabled && item.volumeForecast.years) {
        Object.keys(item.volumeForecast.years).forEach(year => allYears.add(parseInt(year)));
      }
    });

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    sortedYears.forEach(year => header.push(`${year} (szt)`));
    header.push('Suma prognoz (szt)');
  }

  ws.push(header);

  itemsWithRows.forEach(({ item, sheetName, exwRow, dapRow }, index) => {
    const exwFormula = { f: `'${sheetName}'!B${exwRow}` };
    const dapFormula = { f: `'${sheetName}'!B${dapRow}` };

    const row = [
      item.partId || `Element ${index + 1}`,
      exwFormula,
      dapFormula
    ];

    // Dodaj prognozy jeśli są dostępne
    if (hasForecast) {
      const forecastYears = item.volumeForecast?.enabled ? item.volumeForecast.years : {};
      const allYears = new Set();
      itemsWithRows.forEach(({ item }) => {
        if (item.volumeForecast?.enabled && item.volumeForecast.years) {
          Object.keys(item.volumeForecast.years).forEach(year => allYears.add(parseInt(year)));
        }
      });

      const sortedYears = Array.from(allYears).sort((a, b) => a - b);
      let forecastSum = 0;
      sortedYears.forEach(year => {
        const volume = forecastYears[year] || 0;
        row.push(volume);
        forecastSum += volume;
      });
      row.push(forecastSum);
    }

    ws.push(row);
  });

  ws.push([]);

  // Wiersz sumy
  if (hasForecast) {
    const sumRow = ['RAZEM', { f: `SUM(B4:B${ws.length})` }, { f: `SUM(C4:C${ws.length})` }];
    // Dodaj sumy dla każdego roku prognozy
    const allYears = new Set();
    itemsWithRows.forEach(({ item }) => {
      if (item.volumeForecast?.enabled && item.volumeForecast.years) {
        Object.keys(item.volumeForecast.years).forEach(year => allYears.add(parseInt(year)));
      }
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);
    sortedYears.forEach((year, idx) => {
      const col = String.fromCharCode(68 + idx); // D, E, F, ...
      sumRow.push({ f: `SUM(${col}4:${col}${ws.length})` });
    });
    // Suma wszystkich prognoz
    const lastCol = String.fromCharCode(68 + sortedYears.length);
    sumRow.push({ f: `SUM(${lastCol}4:${lastCol}${ws.length})` });
    ws.push(sumRow);
  } else {
    ws.push(['RAZEM', { f: `SUM(B4:B${ws.length})` }, { f: `SUM(C4:C${ws.length})` }]);
  }

  // === DODATKOWE TABELE Z KALENDARZEM PROGNOZ ===
  if (hasForecast) {
    // Zbierz wszystkie lata
    const allYears = new Set();
    itemsWithRows.forEach(({ item }) => {
      if (item.volumeForecast?.enabled && item.volumeForecast.years) {
        Object.keys(item.volumeForecast.years).forEach(year => allYears.add(parseInt(year)));
      }
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    // === TABELA 1: OBRÓT EXW (€) ===
    ws.push([]);
    ws.push([]);
    ws.push(['OBRÓT EXW (€)']);
    ws.push([]);

    const exwHeader = ['Part ID'];
    sortedYears.forEach(year => exwHeader.push(`${year} (€)`));
    exwHeader.push('Suma (€)');
    ws.push(exwHeader);

    const exwStartRow = ws.length + 1;
    itemsWithRows.forEach(({ item }, index) => {
      const row = [item.partId || `Element ${index + 1}`];
      const dataRow = 4 + index; // Wiersz w pierwszej tabeli z cenami

      sortedYears.forEach((year, yearIdx) => {
        const volumeCol = String.fromCharCode(68 + yearIdx); // D, E, F, ...
        // Obrót EXW = Cena EXW * Wolumen
        row.push({ f: `B${dataRow}*${volumeCol}${dataRow}` });
      });

      // Suma obrotu EXW dla tego elementu
      const firstYearCol = 'B';
      const lastYearCol = String.fromCharCode(66 + sortedYears.length - 1);
      row.push({ f: `SUM(${firstYearCol}${ws.length + 1}:${lastYearCol}${ws.length + 1})` });
      ws.push(row);
    });

    // Suma całkowita dla każdego roku
    ws.push([]);
    const exwSumRow = ['RAZEM'];
    sortedYears.forEach((year, idx) => {
      const col = String.fromCharCode(66 + idx); // B, C, D, ...
      exwSumRow.push({ f: `SUM(${col}${exwStartRow}:${col}${ws.length - 1})` });
    });
    // Suma całkowita wszystkich lat
    const exwFirstCol = 'B';
    const exwLastCol = String.fromCharCode(66 + sortedYears.length - 1);
    exwSumRow.push({ f: `SUM(${exwFirstCol}${ws.length + 1}:${exwLastCol}${ws.length + 1})` });
    ws.push(exwSumRow);

    // === TABELA 2: OBRÓT DAP (€) ===
    ws.push([]);
    ws.push([]);
    ws.push(['OBRÓT DAP (€)']);
    ws.push([]);

    const dapHeader = ['Part ID'];
    sortedYears.forEach(year => dapHeader.push(`${year} (€)`));
    dapHeader.push('Suma (€)');
    ws.push(dapHeader);

    const dapStartRow = ws.length + 1;
    itemsWithRows.forEach(({ item }, index) => {
      const row = [item.partId || `Element ${index + 1}`];
      const dataRow = 4 + index; // Wiersz w pierwszej tabeli z cenami

      sortedYears.forEach((year, yearIdx) => {
        const volumeCol = String.fromCharCode(68 + yearIdx); // D, E, F, ...
        // Obrót DAP = Cena DAP * Wolumen
        row.push({ f: `C${dataRow}*${volumeCol}${dataRow}` });
      });

      // Suma obrotu DAP dla tego elementu
      const firstYearCol = 'B';
      const lastYearCol = String.fromCharCode(66 + sortedYears.length - 1);
      row.push({ f: `SUM(${firstYearCol}${ws.length + 1}:${lastYearCol}${ws.length + 1})` });
      ws.push(row);
    });

    // Suma całkowita dla każdego roku
    ws.push([]);
    const dapSumRow = ['RAZEM'];
    sortedYears.forEach((year, idx) => {
      const col = String.fromCharCode(66 + idx); // B, C, D, ...
      dapSumRow.push({ f: `SUM(${col}${dapStartRow}:${col}${ws.length - 1})` });
    });
    // Suma całkowita wszystkich lat
    const dapFirstCol = 'B';
    const dapLastCol = String.fromCharCode(66 + sortedYears.length - 1);
    dapSumRow.push({ f: `SUM(${dapFirstCol}${ws.length + 1}:${dapLastCol}${ws.length + 1})` });
    ws.push(dapSumRow);

    // === TABELA 3: PRZYCHÓD (€) - Marża dodatkowa × Wolumen ===
    ws.push([]);
    ws.push([]);
    ws.push(['PRZYCHÓD (€) = Marża dodatkowa × Wolumen']);
    ws.push([]);

    const revenueHeader = ['Part ID'];
    sortedYears.forEach(year => revenueHeader.push(`${year} (€)`));
    revenueHeader.push('Suma (€)');
    ws.push(revenueHeader);

    const revenueStartRow = ws.length + 1;
    itemsWithRows.forEach(({ item, sheetName, additionalMarginRow }, index) => {
      const row = [item.partId || `Element ${index + 1}`];
      const dataRow = 4 + index; // Wiersz w pierwszej tabeli z cenami i wolumenami

      sortedYears.forEach((year, yearIdx) => {
        const volumeCol = String.fromCharCode(68 + yearIdx); // D, E, F, ...

        // Jeśli brak marży dodatkowej (weight mode), przychód = 0
        if (additionalMarginRow === null) {
          row.push(0);
        } else {
          // Przychód = Marża dodatkowa * Wolumen
          row.push({ f: `'${sheetName}'!B${additionalMarginRow}*${volumeCol}${dataRow}` });
        }
      });

      // Suma przychodu dla tego elementu
      const firstYearCol = 'B';
      const lastYearCol = String.fromCharCode(66 + sortedYears.length - 1);
      row.push({ f: `SUM(${firstYearCol}${ws.length + 1}:${lastYearCol}${ws.length + 1})` });
      ws.push(row);
    });

    // Suma całkowita dla każdego roku
    ws.push([]);
    const revenueSumRow = ['RAZEM'];
    sortedYears.forEach((year, idx) => {
      const col = String.fromCharCode(66 + idx); // B, C, D, ...
      revenueSumRow.push({ f: `SUM(${col}${revenueStartRow}:${col}${ws.length - 1})` });
    });
    // Suma całkowita wszystkich lat
    const revenueFirstCol = 'B';
    const revenueLastCol = String.fromCharCode(66 + sortedYears.length - 1);
    revenueSumRow.push({ f: `SUM(${revenueFirstCol}${ws.length + 1}:${revenueLastCol}${ws.length + 1})` });
    ws.push(revenueSumRow);
  }

  return ws;
};

const getModeLabel = (mode) => {
  const labels = {
    'weight': 'Waga',
    'surface': 'Powierzchnia',
    'volume': 'Objętość',
    'heatshield': 'Heatshield',
    'multilayer': 'Multilayer'
  };
  return labels[mode] || 'N/A';
};

/**
 * Generuje interaktywny workbook Excel z formułami
 */
export const generateInteractiveExcel = (calculation, calculationMeta) => {
  const wb = XLSX.utils.book_new();

  // Pobierz globalSGA
  const globalSGA = calculation.globalSGA || 0;

  console.log('📊 generateInteractiveExcel:');
  console.log('calculation.tabs:', calculation.tabs);
  console.log('calculation.packagingTypes:', calculation.packagingTypes);
  console.log('calculation.compositions:', calculation.compositions);

  // Dla każdego elementu utwórz osobny arkusz i zbierz informacje o wierszach
  const itemsWithRows = [];

  calculation.items.forEach((item, index) => {
    // Znajdź odpowiedni tab
    let tab = null;

    if (item.tabIndex !== undefined && calculation.tabs?.[item.tabIndex]) {
      tab = calculation.tabs[item.tabIndex];
    } else if (item.tabName && calculation.tabs) {
      tab = calculation.tabs.find(t => t.name === item.tabName);
    } else if (item.tabId && calculation.tabs) {
      tab = calculation.tabs.find(t => t.id === item.tabId);
    }

    if (!tab && calculation.tabs && calculation.tabs.length > 0) {
      tab = calculation.tabs[0];
    }

    if (!tab) {
      tab = {};
    }

    const mode = tab.calculationType || 'weight';

    console.log(`\n📄 Item ${index}:`, {
      partId: item.partId,
      tabName: item.tabName,
      tabFound: tab.name,
      mode: mode
    });

    let sheetResult;

    // Utwórz odpowiedni arkusz w zależności od trybu
    switch (mode) {
      case 'surface':
        sheetResult = createSurfaceModeSheet(item, tab, globalSGA, calculation.packagingTypes, calculation.compositions, calculationMeta, calculation.transportTypes);
        break;
      case 'multilayer':
        sheetResult = createMultilayerModeSheet(item, tab, globalSGA, calculation.packagingTypes, calculation.compositions, calculationMeta, calculation.transportTypes);
        break;
      case 'heatshield':
        sheetResult = createHeatshieldModeSheet(item, tab, globalSGA, calculation.packagingTypes, calculation.compositions, calculationMeta, calculation.transportTypes);
        break;
      case 'weight':
      case 'volume':
      default:
        sheetResult = createWeightModeSheet(item, tab, globalSGA, calculation.packagingTypes, calculation.compositions, calculationMeta, calculation.transportTypes);
        break;
    }

    // Konwertuj dane do arkusza
    const ws = XLSX.utils.aoa_to_sheet(sheetResult.data);

    // Apply number formatting to cost cells
    applyNumberFormatting(ws);

    // Stylizacja
    ws['!cols'] = [
      { wch: 35 }, // Kolumna A - etykiety
      { wch: 20 }, // Kolumna B - wartości
      { wch: 10 }  // Kolumna C - jednostki
    ];

    // Nazwa arkusza (max 31 znaków dla Excel)
    let sheetName = item.partId || `Element_${index + 1}`;
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);
    }
    // Usuń niedozwolone znaki
    sheetName = sheetName.replace(/[:\\/\?\*\[\]]/g, '_');

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Zapisz informacje o wierszach dla Summary
    itemsWithRows.push({
      item,
      sheetName,
      exwRow: sheetResult.exwRow,
      dapRow: sheetResult.dapRow,
      additionalMarginRow: sheetResult.additionalMarginRow
    });
  });

  // Dodaj arkusz Summary
  const summaryData = createSummarySheet(itemsWithRows);
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

  // Apply special formatting for Summary sheet
  applySummaryFormatting(summaryWs);

  // Dynamiczne szerokości kolumn w zależności od obecności kalendarza prognoz
  const hasForecast = calculation.items.some(item => item.volumeForecast?.enabled);
  const cols = [
    { wch: 20 }, // Part ID
    { wch: 15 }, // Cena EXW
    { wch: 15 }  // Cena DAP
  ];

  if (hasForecast) {
    // Znajdź wszystkie lata z prognoz
    const allYears = new Set();
    calculation.items.forEach(item => {
      if (item.volumeForecast?.enabled && item.volumeForecast.years) {
        Object.keys(item.volumeForecast.years).forEach(year => allYears.add(parseInt(year)));
      }
    });
    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    // Dodaj kolumny dla każdego roku
    sortedYears.forEach(() => cols.push({ wch: 12 })); // Rok (szt)
    cols.push({ wch: 15 }); // Suma prognoz
  }

  summaryWs['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  return wb;
};

/**
 * Generuje i pobiera interaktywny Excel
 */
export const downloadInteractiveExcel = (calculation, calculationMeta) => {
  const wb = generateInteractiveExcel(calculation, calculationMeta);
  const fileName = `Kalkulacja_Interaktywna_${calculationMeta.client || 'Klient'}_${calculation.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
