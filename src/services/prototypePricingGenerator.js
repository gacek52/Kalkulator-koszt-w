import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx-js-style';

/**
 * Generator cennika prototypów
 * Kalkuluje ceny dla różnych wielkości batch na podstawie ceny EXW
 */

/**
 * Definicja batchów i ich kolejność
 */
const BATCH_SIZES = [1, 10, 25, 30, 40, 50, 75, 100, 150, 200, 500, 750, 1000];

/**
 * Oblicza ceny dla wszystkich batchów na podstawie ceny bazowej (EXW)
 * Formuła odwrotna - od największego batcha (1000) do najmniejszego (1)
 *
 * @param {number} basePrice - Cena bazowa EXW (dla batch 1000)
 * @returns {Object} - Obiekt z cenami dla każdego batcha (zaokrąglone do 2 miejsc)
 */
export const calculateBatchPrices = (basePrice) => {
  const prices = {};

  // Batch 1000 = cena bazowa
  prices[1000] = parseFloat(basePrice.toFixed(2));

  // Batch 750 = batch 1000 + 5%
  prices[750] = parseFloat((prices[1000] + (prices[1000] * 0.05)).toFixed(2));

  // Batch 500 = batch 750 + 5% od bazowej
  prices[500] = parseFloat((prices[750] + (prices[1000] * 0.05)).toFixed(2));

  // Batch 200 = batch 500 + 10% od bazowej
  prices[200] = parseFloat((prices[500] + (prices[1000] * 0.1)).toFixed(2));

  // Batch 150 = batch 200 + 10% od bazowej
  prices[150] = parseFloat((prices[200] + (prices[1000] * 0.1)).toFixed(2));

  // Batch 100 = batch 150 + 10% od bazowej
  prices[100] = parseFloat((prices[150] + (prices[1000] * 0.1)).toFixed(2));

  // Batch 75 = batch 100 + 10% od batch 150
  prices[75] = parseFloat((prices[100] + (prices[150] * 0.1)).toFixed(2));

  // Batch 50 = batch 75 + 10% od batch 100
  prices[50] = parseFloat((prices[75] + (prices[100] * 0.1)).toFixed(2));

  // Batch 40 = batch 50 + 10% od batch 75
  prices[40] = parseFloat((prices[50] + (prices[75] * 0.1)).toFixed(2));

  // Batch 30 = batch 40 + 10% od batch 50
  prices[30] = parseFloat((prices[40] + (prices[50] * 0.1)).toFixed(2));

  // Batch 25 = batch 30 + 10% od batch 40
  prices[25] = parseFloat((prices[30] + (prices[40] * 0.1)).toFixed(2));

  // Batch 10 = batch 25 + 10% od batch 30
  prices[10] = parseFloat((prices[25] + (prices[30] * 0.1)).toFixed(2));

  // Batch 1 = batch 10 + 10% od batch 25
  prices[1] = parseFloat((prices[10] + (prices[25] * 0.1)).toFixed(2));

  return prices;
};

/**
 * Formatuje walutę
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `€${parseFloat(value).toFixed(2)}`;
};

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
 * Generuje Excel z cennikiem prototypów
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane kalkulacji
 * @returns {Object} - Workbook Excel
 */
export const generatePrototypePricingExcel = (calculation, calculationMeta) => {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Style definitions
  const headerStyle = {
    fill: { fgColor: { rgb: '4F81BD' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const titleStyle = {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '1F4E78' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  const currencyStyle = {
    font: { name: 'Calibri', sz: 11 },
    numFmt: '€#,##0.00',
    alignment: { horizontal: 'right', vertical: 'center' }
  };

  // === NAGŁÓWEK ===
  wsData.push(['CENNIK PROTOTYPÓW']);
  wsData.push([`Klient: ${calculationMeta.client || 'N/A'}`]);
  wsData.push([`Data: ${new Date().toLocaleDateString('pl-PL')}`]);
  wsData.push([]);

  // === NAGŁÓWKI KOLUMN ===
  const headers = ['SAP', 'Material', ...BATCH_SIZES.map(b => `Batch ${b}`)];
  wsData.push(headers);

  // === DANE DLA KAŻDEGO ELEMENTU ===
  calculation.items.forEach((item) => {
    const exwPrice = item.results?.totalWithSGA || 0;
    const batchPrices = calculateBatchPrices(exwPrice);

    // Pobierz nazwę materiału z taba
    let materialName = 'N/A';
    if (item.tabIndex !== undefined && calculation.tabs?.[item.tabIndex]) {
      materialName = calculation.tabs[item.tabIndex].name || 'N/A';
    } else if (item.tabName) {
      materialName = item.tabName;
    }

    const row = [
      item.partId || 'N/A',
      materialName,
      ...BATCH_SIZES.map(batchSize => batchPrices[batchSize])
    ];

    wsData.push(row);
  });

  // Tworzenie arkusza
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Stylizacja szerokości kolumn
  const colWidths = [
    { wch: 15 }, // SAP
    { wch: 25 }, // Material
    ...BATCH_SIZES.map(() => ({ wch: 12 })) // Batch columns
  ];
  ws['!cols'] = colWidths;

  // Dodanie arkusza do workbooka
  XLSX.utils.book_append_sheet(wb, ws, 'Cennik Prototypów');

  return wb;
};

/**
 * Pobiera Excel cennika prototypów
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane kalkulacji
 */
export const downloadPrototypePricingExcel = (calculation, calculationMeta) => {
  const wb = generatePrototypePricingExcel(calculation, calculationMeta);
  const timestamp = new Date().toISOString().split('T')[0];
  const clientName = calculationMeta.client || 'Klient';
  const fileName = `Cennik_Prototypow_${clientName}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Generuje PDF cennika prototypów
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane kalkulacji
 * @returns {jsPDF} - Obiekt PDF
 */
export const generatePrototypePricingPDF = (calculation, calculationMeta) => {
  const doc = new jsPDF('landscape'); // A4 landscape dla szerszej tabeli
  let yPos = 15;
  const pageWidth = 297;
  const leftMargin = 15;

  // === NAGŁÓWEK ===
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('CENNIK PROTOTYPÓW'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Klient: ${fixPolishChars(calculationMeta.client || 'N/A')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Data: ${new Date().toLocaleDateString('pl-PL')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Separator
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - leftMargin, yPos);
  yPos += 8;

  // === TABELA ===
  doc.setFontSize(7);

  // Szerokości kolumn (w mm)
  const colWidths = {
    sap: 30,
    material: 35,
    batch: 14 // każdy batch - zwiększone bo mamy więcej miejsca
  };

  // Nagłówki
  doc.setFont('times', 'bold');
  doc.setFillColor(79, 129, 189);
  doc.setTextColor(255, 255, 255);

  let xPos = leftMargin;
  const rowHeight = 6;

  // Rysuj header
  doc.rect(xPos, yPos, colWidths.sap, rowHeight, 'F');
  doc.text('SAP', xPos + 2, yPos + 4);
  xPos += colWidths.sap;

  doc.rect(xPos, yPos, colWidths.material, rowHeight, 'F');
  doc.text('Material', xPos + 2, yPos + 4);
  xPos += colWidths.material;

  // Batch headers
  BATCH_SIZES.forEach(batch => {
    doc.rect(xPos, yPos, colWidths.batch, rowHeight, 'F');
    doc.text(`B${batch}`, xPos + 1, yPos + 4);
    xPos += colWidths.batch;
  });

  yPos += rowHeight;

  // Dane
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);

  calculation.items.forEach((item) => {
    // Sprawdź czy mieścimy się na stronie
    if (yPos > 180) {
      doc.addPage();
      yPos = 15;
    }

    const exwPrice = item.results?.totalWithSGA || 0;
    const batchPrices = calculateBatchPrices(exwPrice);

    // Pobierz nazwę materiału
    let materialName = 'N/A';
    if (item.tabIndex !== undefined && calculation.tabs?.[item.tabIndex]) {
      materialName = calculation.tabs[item.tabIndex].name || 'N/A';
    } else if (item.tabName) {
      materialName = item.tabName;
    }

    xPos = leftMargin;

    // SAP
    doc.rect(xPos, yPos, colWidths.sap, rowHeight, 'S');
    doc.text(fixPolishChars(item.partId || 'N/A'), xPos + 2, yPos + 4);
    xPos += colWidths.sap;

    // Material
    doc.rect(xPos, yPos, colWidths.material, rowHeight, 'S');
    doc.text(fixPolishChars(materialName.substring(0, 25)), xPos + 2, yPos + 4);
    xPos += colWidths.material;

    // Batch prices
    BATCH_SIZES.forEach(batch => {
      doc.rect(xPos, yPos, colWidths.batch, rowHeight, 'S');
      const price = batchPrices[batch].toFixed(2);
      doc.text(price, xPos + colWidths.batch - 2, yPos + 4, { align: 'right' });
      xPos += colWidths.batch;
    });

    yPos += rowHeight;
  });

  // === STOPKA ===
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(fixPolishChars('Wygenerowano przez Cost Calculator - Cennik Prototypów'), pageWidth / 2, 200, { align: 'center' });

  return doc;
};

/**
 * Pobiera PDF cennika prototypów
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane kalkulacji
 */
export const downloadPrototypePricingPDF = (calculation, calculationMeta) => {
  const doc = generatePrototypePricingPDF(calculation, calculationMeta);
  const timestamp = new Date().toISOString().split('T')[0];
  const clientName = calculationMeta.client || 'Klient';
  const fileName = `Cennik_Prototypow_${clientName}_${timestamp}.pdf`;
  doc.save(fileName);
};
