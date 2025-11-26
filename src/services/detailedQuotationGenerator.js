import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Generator szczegółowej oferty technicznej w formacie PDF i Excel
 * Zawiera: dane techniczne (wagi netto/brutto, powierzchnie), kalkulację kosztów, kalendarz prognoz
 */

/**
 * Konwertuje polskie znaki do formatu który jsPDF może obsłużyć
 */
const fixPolishChars = (text) => {
  if (!text) return text;
  const polishMap = {
    'ą': 'a', 'Ą': 'A',
    'ć': 'c', 'Ć': 'C',
    'ę': 'e', 'Ę': 'E',
    'ł': 'l', 'Ł': 'L',
    'ń': 'n', 'Ń': 'N',
    'ó': 'o', 'Ó': 'O',
    'ś': 's', 'Ś': 'S',
    'ź': 'z', 'Ź': 'Z',
    'ż': 'z', 'Ż': 'Z'
  };

  return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, char => polishMap[char] || char);
};

/**
 * Formatuje walutę
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${parseFloat(value).toFixed(2)} €`;
};

/**
 * Formatuje wagę (g -> kg jeśli >= 1000g)
 */
const formatWeight = (grams) => {
  if (grams === null || grams === undefined || isNaN(grams)) return 'N/A';
  const g = parseFloat(grams);
  if (g >= 1000) {
    return `${(g / 1000).toFixed(3)} kg`;
  }
  return `${g.toFixed(2)} g`;
};

/**
 * Formatuje powierzchnię (zawsze w m²)
 */
const formatSurface = (m2) => {
  if (m2 === null || m2 === undefined || isNaN(m2)) return 'N/A';
  return `${parseFloat(m2).toFixed(4)} m²`;
};

/**
 * Pobiera dane pakowania dla elementu
 * @param {Object} item - Element kalkulacji
 * @param {Array} packagingTypes - Typy opakowań z calculation.packagingTypes
 * @param {Array} compositions - Kompozycje z calculation.compositions
 * @returns {Object|null} - Dane pakowania lub null jeśli brak
 */
const getPackagingInfo = (item, packagingTypes, compositions) => {
  if (!item.packaging || !item.packaging.compositionId) return null;

  // Niestandardowa kompozycja
  if (item.packaging.compositionId === 'custom') {
    const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
    const layers = parseFloat(item.packaging.layers) || 0;
    const partsInBox = item.packaging.manualPartsInBox
      ? parseFloat(item.packaging.partsInBox) || 0
      : partsPerLayer * layers;

    return {
      compositionName: 'Niestandardowa',
      partsPerLayer,
      layers,
      partsInBox,
      packagingTypeName: 'N/A',
      packagesPerPallet: 0,
      palletsPerSpace: 0,
      cartonWeight: 0,
      palletWeight: 0,
      cost: parseFloat(item.packaging.customPrice) || 0
    };
  }

  // Standardowa kompozycja
  const composition = compositions?.find(c => c.id == item.packaging.compositionId);
  if (!composition) return null;

  const packagingType = packagingTypes?.find(t => t.id === composition.packagingTypeId);

  const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
  const layers = parseFloat(item.packaging.layers) || 0;
  const partsInBox = item.packaging.manualPartsInBox
    ? parseFloat(item.packaging.partsInBox) || 0
    : partsPerLayer * layers;

  // Oblicz wagi
  const detailWeight = item.results?.nettoWeight || item.results?.bruttoWeight || 0;
  const cartonWeight = (packagingType?.weight || 0) + (detailWeight * partsInBox / 1000);
  const palletWeight = (composition.standardPalletWeight || 0) + (cartonWeight * composition.packagesPerPallet);

  return {
    compositionName: composition.name,
    partsPerLayer,
    layers,
    partsInBox,
    packagingTypeName: packagingType?.name || 'N/A',
    packagesPerPallet: composition.packagesPerPallet,
    palletsPerSpace: composition.palletsPerSpace,
    partsPerPallet: partsInBox * composition.packagesPerPallet,
    partsPerSpace: partsInBox * composition.packagesPerPallet * composition.palletsPerSpace,
    cartonWeight,
    palletWeight,
    cost: composition.compositionCost,
    palletCost: composition.palletCost,
    standardPalletWeight: composition.standardPalletWeight
  };
};

/**
 * Generuje PDF szczegółowej oferty dla kalkulacji
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane (klient, etc.)
 * @returns {jsPDF} - Obiekt PDF
 */
export const generateDetailedQuotationPDF = (calculation, calculationMeta) => {
  const doc = new jsPDF();
  let yPos = 20;

  // === NAGŁÓWEK ===
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.text('OFERTA SZCZEGOLOWA - DANE TECHNICZNE', 105, yPos, { align: 'center' });
  yPos += 15;

  // Linia separator
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 10;

  // === INFORMACJE O OFERCIE ===
  doc.setFontSize(10);
  doc.setFont('times', 'normal');

  const offerDate = new Date().toLocaleDateString('pl-PL');
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL');

  doc.text(fixPolishChars(`Klient: ${calculationMeta.client || 'N/A'}`), 15, yPos);
  yPos += 6;
  doc.text(fixPolishChars(`Data: ${offerDate}`), 15, yPos);
  yPos += 6;
  doc.text(fixPolishChars(`Waznosc oferty: ${validUntil} (30 dni)`), 15, yPos);
  yPos += 10;

  // Linia separator
  doc.line(15, yPos, 195, yPos);
  yPos += 10;

  // === ELEMENTY ===
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('ELEMENTY Z DANYMI TECHNICZNYMI'), 15, yPos);
  yPos += 10;

  // Iteruj przez wszystkie elementy
  calculation.items.forEach((item, index) => {
    // Sprawdź czy jest miejsce na nowy element (co najmniej 80mm)
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // Numer elementu i Part ID
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(fixPolishChars(`${index + 1}. Part ID: ${item.partId || 'N/A'}`), 15, yPos);
    yPos += 7;

    // Materiał
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text(fixPolishChars(`   Material: ${item.tabName || 'N/A'}`), 15, yPos);
    yPos += 6;

    // Typ kalkulacji
    const calcType = item.calculationType || 'weight';
    let calcTypeLabel = 'Waga';
    if (calcType === 'surface') calcTypeLabel = 'Powierzchnia';
    else if (calcType === 'volume') calcTypeLabel = 'Objetosc';
    else if (calcType === 'heatshield') calcTypeLabel = 'Heatshield';
    else if (calcType === 'multilayer') calcTypeLabel = 'Multilayer';

    doc.text(fixPolishChars(`   Typ kalkulacji: ${calcTypeLabel}`), 15, yPos);
    yPos += 8;

    // === DANE TECHNICZNE ===
    doc.setFont('times', 'bold');
    doc.text(fixPolishChars('   DANE TECHNICZNE:'), 15, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');

    // Zależnie od typu kalkulacji
    if (calcType === 'weight' || calcType === 'volume') {
      // Wagi
      const weightNetto = parseFloat(item.weight) || 0;
      const weightBrutto = parseFloat(item.bruttoWeight) || weightNetto;

      doc.text(fixPolishChars(`   - Waga netto:   ${formatWeight(weightNetto)}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Waga brutto:  ${formatWeight(weightBrutto)}`), 15, yPos);
      yPos += 5;

      if (calcType === 'volume') {
        const volume = parseFloat(item.volume) || 0;
        const volumeUnit = item.volumeUnit || 'mm3';
        doc.text(fixPolishChars(`   - Objetosc:     ${volume.toFixed(2)} ${volumeUnit}`), 15, yPos);
        yPos += 5;
      }
    } else if (calcType === 'surface') {
      // Powierzchnie
      const surfaceNetto = parseFloat(item.surfaceArea) || 0;
      const surfaceUnit = item.surfaceUnit || 'mm2';
      const surfaceNettoM2 = surfaceUnit === 'mm2' ? surfaceNetto / 1000000 : surfaceNetto;
      const surfaceBruttoM2 = parseFloat(item.surfaceBrutto) || surfaceNettoM2;

      doc.text(fixPolishChars(`   - Powierzchnia netto:  ${formatSurface(surfaceNettoM2)}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Powierzchnia brutto: ${formatSurface(surfaceBruttoM2)}`), 15, yPos);
      yPos += 5;

      // Wagi (jeśli są obliczone)
      const weightNetto = parseFloat(item.weight) || 0;
      const weightBrutto = parseFloat(item.bruttoWeight) || weightNetto;
      if (weightNetto > 0) {
        doc.text(fixPolishChars(`   - Waga netto:   ${formatWeight(weightNetto)}`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`   - Waga brutto:  ${formatWeight(weightBrutto)}`), 15, yPos);
        yPos += 5;
      }
    } else if (calcType === 'heatshield') {
      // Heatshield - szczegóły blachy i maty
      const heatshield = item.heatshield || {};
      const surfaceNettoSheet = parseFloat(heatshield.surfaceNettoSheet) || 0;
      const surfaceBruttoSheet = parseFloat(heatshield.surfaceBruttoSheet) || 0;
      const surfaceNettoMat = parseFloat(heatshield.surfaceNettoMat) || 0;

      doc.text(fixPolishChars('   BLACHA:'), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Powierzchnia netto:  ${formatSurface(surfaceNettoSheet)}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Powierzchnia brutto: ${formatSurface(surfaceBruttoSheet)}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Waga:                ${formatWeight(heatshield.sheetWeight)}`), 15, yPos);
      yPos += 5;

      doc.text(fixPolishChars('   MATA:'), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Powierzchnia netto:  ${formatSurface(surfaceNettoMat)}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Waga:                ${formatWeight(heatshield.matWeight)}`), 15, yPos);
      yPos += 5;
    } else if (calcType === 'multilayer') {
      // Multilayer - każda warstwa osobno
      const layers = item.multilayer?.layers || [];
      doc.text(fixPolishChars(`   WARSTWY (${layers.length}):`), 15, yPos);
      yPos += 5;

      layers.forEach((layer, layerIdx) => {
        // Sprawdź czy jest miejsce
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(fixPolishChars(`   ${layerIdx + 1}. ${layer.name || `Warstwa ${layerIdx + 1}`}:`), 15, yPos);
        yPos += 5;

        const surfaceNetto = parseFloat(layer.surfaceNetto) || 0;
        const surfaceBrutto = parseFloat(layer.surfaceBrutto) || surfaceNetto;
        const weightNetto = parseFloat(layer.weightNetto) || 0;
        const weightBrutto = parseFloat(layer.weightBrutto) || weightNetto;

        doc.text(fixPolishChars(`      - Powierzchnia netto:  ${formatSurface(surfaceNetto)}`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`      - Powierzchnia brutto: ${formatSurface(surfaceBrutto)}`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`      - Waga netto:          ${formatWeight(weightNetto)}`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`      - Waga brutto:         ${formatWeight(weightBrutto)}`), 15, yPos);
        yPos += 5;
      });
    }

    yPos += 3;

    // === WOLUMEN I CENY ===
    const annualVolume = parseFloat(item.annualVolume) || 0;
    doc.text(fixPolishChars(`   Ilosc roczna: ${annualVolume.toLocaleString('pl-PL')} szt`), 15, yPos);
    yPos += 8;

    const exwPrice = item.results?.totalWithSGA || 0;
    const transportCost = item.results?.transportCost || 0;
    const dapPrice = exwPrice + transportCost;

    doc.setFont('times', 'bold');
    doc.text(fixPolishChars('   CENY:'), 15, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text(fixPolishChars(`   - Cena EXW:     ${formatCurrency(exwPrice)}/szt`), 15, yPos);
    yPos += 5;

    if (transportCost > 0) {
      doc.text(fixPolishChars(`   - Cena DAP:     ${formatCurrency(dapPrice)}/szt`), 15, yPos);
      yPos += 5;
    }

    // === KALENDARZ PROGNOZ (jeśli istnieje) ===
    if (item.volumeForecast?.enabled && item.volumeForecast?.years) {
      const years = item.volumeForecast.years;
      const sortedYears = Object.keys(years).map(y => parseInt(y)).sort((a, b) => a - b);

      if (sortedYears.length > 0) {
        yPos += 3;

        // Sprawdź czy jest miejsce (potrzeba ~40mm dla kalendarza)
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont('times', 'bold');
        doc.text(fixPolishChars('   KALENDARZ PROGNOZ:'), 15, yPos);
        yPos += 6;
        doc.setFont('times', 'normal');

        sortedYears.forEach(year => {
          const volume = years[year] || 0;
          doc.text(fixPolishChars(`   - ${year}:  ${volume.toLocaleString('pl-PL')} szt`), 15, yPos);
          yPos += 5;
        });

        // Suma
        const totalForecast = sortedYears.reduce((sum, year) => sum + (years[year] || 0), 0);
        doc.setFont('times', 'bold');
        doc.text(fixPolishChars(`   SUMA: ${totalForecast.toLocaleString('pl-PL')} szt`), 15, yPos);
        doc.setFont('times', 'normal');
        yPos += 5;
      }
    }

    // === PAKOWANIE (jeśli istnieje) ===
    const packagingInfo = getPackagingInfo(item, calculation.packagingTypes, calculation.compositions);
    if (packagingInfo) {
      yPos += 3;

      // Sprawdź czy jest miejsce
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('times', 'bold');
      doc.text(fixPolishChars('   PAKOWANIE:'), 15, yPos);
      yPos += 6;
      doc.setFont('times', 'normal');

      doc.text(fixPolishChars(`   Kompozycja: ${packagingInfo.compositionName}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   Typ opakowania: ${packagingInfo.packagingTypeName}`), 15, yPos);
      yPos += 5;

      doc.setFont('times', 'bold');
      doc.text(fixPolishChars('   Uklad w kartonie:'), 15, yPos);
      yPos += 5;
      doc.setFont('times', 'normal');

      doc.text(fixPolishChars(`   - Czesci na warstwe: ${packagingInfo.partsPerLayer} szt`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Ilosc warstw: ${packagingInfo.layers}`), 15, yPos);
      yPos += 5;
      doc.text(fixPolishChars(`   - Czesci w kartonie: ${packagingInfo.partsInBox} szt`), 15, yPos);
      yPos += 5;

      if (packagingInfo.packagesPerPallet > 0) {
        yPos += 2;
        doc.setFont('times', 'bold');
        doc.text(fixPolishChars('   Uklad na palecie:'), 15, yPos);
        yPos += 5;
        doc.setFont('times', 'normal');

        doc.text(fixPolishChars(`   - Kartonow na palete: ${packagingInfo.packagesPerPallet} szt`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`   - Palet na miejsce paletowe: ${packagingInfo.palletsPerSpace} szt`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`   - Czesci na palete: ${packagingInfo.partsPerPallet} szt`), 15, yPos);
        yPos += 5;
        doc.text(fixPolishChars(`   - Czesci na miejsce paletowe: ${packagingInfo.partsPerSpace} szt`), 15, yPos);
        yPos += 5;

        if (packagingInfo.cartonWeight > 0) {
          yPos += 2;
          doc.setFont('times', 'bold');
          doc.text(fixPolishChars('   Wagi:'), 15, yPos);
          yPos += 5;
          doc.setFont('times', 'normal');

          doc.text(fixPolishChars(`   - Waga kartonu (z czesciami): ${packagingInfo.cartonWeight.toFixed(2)} kg`), 15, yPos);
          yPos += 5;
          doc.text(fixPolishChars(`   - Waga palety (z kartonami): ${packagingInfo.palletWeight.toFixed(2)} kg`), 15, yPos);
          yPos += 5;
        }
      }

      yPos += 2;
      doc.setFont('times', 'bold');
      doc.text(fixPolishChars(`   Koszt kompozycji: ${formatCurrency(packagingInfo.cost)}`), 15, yPos);
      doc.setFont('times', 'normal');
      yPos += 5;
    }

    yPos += 6;

    // Linia separator między elementami
    doc.setLineWidth(0.3);
    doc.line(15, yPos, 195, yPos);
    yPos += 8;
  });

  // === STOPKA ===
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(128, 128, 128);
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(fixPolishChars('Oferta szczegolowa - wygenerowano przez Cost Calculator'), 105, 285, { align: 'center' });
    doc.text(`${offerDate} | Strona ${i} z ${pageCount}`, 105, 290, { align: 'center' });
  }

  return doc;
};

/**
 * Generuje i pobiera PDF szczegółowej oferty
 */
export const downloadDetailedQuotationPDF = (calculation, calculationMeta) => {
  const doc = generateDetailedQuotationPDF(calculation, calculationMeta);
  const fileName = `Oferta_Szczegolowa_${calculationMeta.client || 'Klient'}_${calculation.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generuje szczegółową ofertę w formacie Excel
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane (klient, etc.)
 * @returns {Object} - Workbook Excel
 */
export const generateDetailedQuotationExcel = (calculation, calculationMeta) => {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // === NAGŁÓWEK ===
  wsData.push(['OFERTA SZCZEGÓŁOWA - DANE TECHNICZNE']);
  wsData.push([]);

  // === INFORMACJE O OFERCIE ===
  const offerDate = new Date().toLocaleDateString('pl-PL');
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL');

  wsData.push(['Klient:', calculationMeta.client || 'N/A']);
  wsData.push(['Data:', offerDate]);
  wsData.push(['Ważność oferty:', `${validUntil} (30 dni)`]);
  wsData.push([]);

  // === ELEMENTY ===
  wsData.push(['ELEMENTY Z DANYMI TECHNICZNYMI']);
  wsData.push([]);

  // Iteruj przez wszystkie elementy
  calculation.items.forEach((item, index) => {
    // Numer elementu i Part ID
    wsData.push([`${index + 1}. Part ID: ${item.partId || 'N/A'}`]);

    // Materiał
    wsData.push(['   Materiał:', item.tabName || 'N/A']);

    // Typ kalkulacji
    const calcType = item.calculationType || 'weight';
    let calcTypeLabel = 'Waga';
    if (calcType === 'surface') calcTypeLabel = 'Powierzchnia';
    else if (calcType === 'volume') calcTypeLabel = 'Objętość';
    else if (calcType === 'heatshield') calcTypeLabel = 'Heatshield';
    else if (calcType === 'multilayer') calcTypeLabel = 'Multilayer';

    wsData.push(['   Typ kalkulacji:', calcTypeLabel]);
    wsData.push([]);

    // === DANE TECHNICZNE ===
    wsData.push(['   DANE TECHNICZNE:']);

    // Zależnie od typu kalkulacji
    if (calcType === 'weight' || calcType === 'volume') {
      // Wagi
      const weightNetto = parseFloat(item.weight) || 0;
      const weightBrutto = parseFloat(item.bruttoWeight) || weightNetto;

      wsData.push(['   - Waga netto:', formatWeight(weightNetto)]);
      wsData.push(['   - Waga brutto:', formatWeight(weightBrutto)]);

      if (calcType === 'volume') {
        const volume = parseFloat(item.volume) || 0;
        const volumeUnit = item.volumeUnit || 'mm3';
        wsData.push(['   - Objętość:', `${volume.toFixed(2)} ${volumeUnit}`]);
      }
    } else if (calcType === 'surface') {
      // Powierzchnie
      const surfaceNetto = parseFloat(item.surfaceArea) || 0;
      const surfaceUnit = item.surfaceUnit || 'mm2';
      const surfaceNettoM2 = surfaceUnit === 'mm2' ? surfaceNetto / 1000000 : surfaceNetto;
      const surfaceBruttoM2 = parseFloat(item.surfaceBrutto) || surfaceNettoM2;

      wsData.push(['   - Powierzchnia netto:', formatSurface(surfaceNettoM2)]);
      wsData.push(['   - Powierzchnia brutto:', formatSurface(surfaceBruttoM2)]);

      // Wagi (jeśli są obliczone)
      const weightNetto = parseFloat(item.weight) || 0;
      const weightBrutto = parseFloat(item.bruttoWeight) || weightNetto;
      if (weightNetto > 0) {
        wsData.push(['   - Waga netto:', formatWeight(weightNetto)]);
        wsData.push(['   - Waga brutto:', formatWeight(weightBrutto)]);
      }
    } else if (calcType === 'heatshield') {
      // Heatshield
      const heatshield = item.heatshield || {};

      wsData.push(['   BLACHA:']);
      wsData.push(['   - Powierzchnia netto:', formatSurface(heatshield.surfaceNettoSheet)]);
      wsData.push(['   - Powierzchnia brutto:', formatSurface(heatshield.surfaceBruttoSheet)]);
      wsData.push(['   - Waga:', formatWeight(heatshield.sheetWeight)]);

      wsData.push(['   MATA:']);
      wsData.push(['   - Powierzchnia netto:', formatSurface(heatshield.surfaceNettoMat)]);
      wsData.push(['   - Waga:', formatWeight(heatshield.matWeight)]);
    } else if (calcType === 'multilayer') {
      // Multilayer
      const layers = item.multilayer?.layers || [];
      wsData.push([`   WARSTWY (${layers.length}):`]);

      layers.forEach((layer, layerIdx) => {
        wsData.push([`   ${layerIdx + 1}. ${layer.name || `Warstwa ${layerIdx + 1}`}:`]);

        const surfaceNetto = parseFloat(layer.surfaceNetto) || 0;
        const surfaceBrutto = parseFloat(layer.surfaceBrutto) || surfaceNetto;
        const weightNetto = parseFloat(layer.weightNetto) || 0;
        const weightBrutto = parseFloat(layer.weightBrutto) || weightNetto;

        wsData.push(['      - Powierzchnia netto:', formatSurface(surfaceNetto)]);
        wsData.push(['      - Powierzchnia brutto:', formatSurface(surfaceBrutto)]);
        wsData.push(['      - Waga netto:', formatWeight(weightNetto)]);
        wsData.push(['      - Waga brutto:', formatWeight(weightBrutto)]);
      });
    }

    wsData.push([]);

    // === WOLUMEN I CENY ===
    const annualVolume = parseFloat(item.annualVolume) || 0;
    wsData.push(['   Ilość roczna:', `${annualVolume.toLocaleString('pl-PL')} szt`]);
    wsData.push([]);

    const exwPrice = item.results?.totalWithSGA || 0;
    const transportCost = item.results?.transportCost || 0;
    const dapPrice = exwPrice + transportCost;

    wsData.push(['   CENY:']);
    wsData.push(['   - Cena EXW:', `${formatCurrency(exwPrice)}/szt`]);

    if (transportCost > 0) {
      wsData.push(['   - Cena DAP:', `${formatCurrency(dapPrice)}/szt`]);
    }

    // === KALENDARZ PROGNOZ (jeśli istnieje) ===
    if (item.volumeForecast?.enabled && item.volumeForecast?.years) {
      const years = item.volumeForecast.years;
      const sortedYears = Object.keys(years).map(y => parseInt(y)).sort((a, b) => a - b);

      if (sortedYears.length > 0) {
        wsData.push([]);
        wsData.push(['   KALENDARZ PROGNOZ:']);

        sortedYears.forEach(year => {
          const volume = years[year] || 0;
          wsData.push([`   - ${year}:`, `${volume.toLocaleString('pl-PL')} szt`]);
        });

        // Suma
        const totalForecast = sortedYears.reduce((sum, year) => sum + (years[year] || 0), 0);
        wsData.push(['   SUMA:', `${totalForecast.toLocaleString('pl-PL')} szt`]);
      }
    }

    // === PAKOWANIE (jeśli istnieje) ===
    const packagingInfo = getPackagingInfo(item, calculation.packagingTypes, calculation.compositions);
    if (packagingInfo) {
      wsData.push([]);
      wsData.push(['   PAKOWANIE:']);
      wsData.push(['   Kompozycja:', packagingInfo.compositionName]);
      wsData.push(['   Typ opakowania:', packagingInfo.packagingTypeName]);

      wsData.push(['   Układ w kartonie:']);
      wsData.push(['   - Części na warstwę:', `${packagingInfo.partsPerLayer} szt`]);
      wsData.push(['   - Ilość warstw:', packagingInfo.layers]);
      wsData.push(['   - Części w kartonie:', `${packagingInfo.partsInBox} szt`]);

      if (packagingInfo.packagesPerPallet > 0) {
        wsData.push(['   Układ na palecie:']);
        wsData.push(['   - Kartonów na paletę:', `${packagingInfo.packagesPerPallet} szt`]);
        wsData.push(['   - Palet na miejsce paletowe:', `${packagingInfo.palletsPerSpace} szt`]);
        wsData.push(['   - Części na paletę:', `${packagingInfo.partsPerPallet} szt`]);
        wsData.push(['   - Części na miejsce paletowe:', `${packagingInfo.partsPerSpace} szt`]);

        if (packagingInfo.cartonWeight > 0) {
          wsData.push(['   Wagi:']);
          wsData.push(['   - Waga kartonu (z częściami):', `${packagingInfo.cartonWeight.toFixed(2)} kg`]);
          wsData.push(['   - Waga palety (z kartonami):', `${packagingInfo.palletWeight.toFixed(2)} kg`]);
        }
      }

      wsData.push(['   Koszt kompozycji:', formatCurrency(packagingInfo.cost)]);
    }

    wsData.push([]);
    wsData.push(['-----------------------------------']);
    wsData.push([]);
  });

  // Stopka
  wsData.push([]);
  wsData.push(['Oferta szczegółowa - wygenerowano przez Cost Calculator']);
  wsData.push([offerDate]);

  // Tworzenie arkusza
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Stylizacja (szerokość kolumn)
  ws['!cols'] = [
    { wch: 35 }, // Kolumna A - nazwy
    { wch: 20 }  // Kolumna B - wartości
  ];

  // Dodaj arkusz do workbooka
  XLSX.utils.book_append_sheet(wb, ws, 'Oferta Szczegółowa');

  return wb;
};

/**
 * Generuje i pobiera Excel szczegółowej oferty
 */
export const downloadDetailedQuotationExcel = (calculation, calculationMeta) => {
  const wb = generateDetailedQuotationExcel(calculation, calculationMeta);
  const fileName = `Oferta_Szczegolowa_${calculationMeta.client || 'Klient'}_${calculation.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
