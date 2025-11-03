import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Generator oferty handlowej w formacie PDF i Excel
 * Zawiera: elementy z cenami EXW/DAP, tooling, podsumowanie
 */

/**
 * Konwertuje polskie znaki do formatu który jsPDF może obsłużyć
 * jsPDF standard fonts nie obsługują UTF-8, więc używamy transliteracji
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
 * Rysuje prostą tabelę (bez jspdf-autotable)
 */
const drawSimpleTable = (doc, startY, headers, rows, leftMargin = 15, colWidths = null) => {
  const rowHeight = 8;
  const defaultColWidths = colWidths || [90, 90];
  let currentY = startY;

  // Header z ciemnym tłem
  doc.setFillColor(100, 100, 100);
  const totalWidth = defaultColWidths.reduce((sum, w) => sum + w, 0);
  doc.rect(leftMargin, currentY, totalWidth, rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(10);

  let currentX = leftMargin;
  headers.forEach((header, i) => {
    doc.text(String(header), currentX + 2, currentY + 6);
    currentX += defaultColWidths[i];
  });
  currentY += rowHeight;

  // Wiersze danych
  doc.setTextColor(0, 0, 0);
  doc.setFont('times', 'normal');

  rows.forEach(row => {
    currentX = leftMargin;
    row.forEach((cell, i) => {
      doc.rect(currentX, currentY, defaultColWidths[i], rowHeight, 'S');
      doc.text(String(cell), currentX + 2, currentY + 6);
      currentX += defaultColWidths[i];
    });
    currentY += rowHeight;
  });

  return currentY;
};

/**
 * Formatuje walutę
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${parseFloat(value).toFixed(2)} €`;
};

/**
 * Generuje PDF oferty dla kalkulacji
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane (klient, etc.)
 * @returns {jsPDF} - Obiekt PDF
 */
export const generateQuotationPDF = (calculation, calculationMeta) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Użyj TimesNewRoman z jawnym encodingiem
  // Standardowa czcionka z wsparciem dla polskich znaków

  // === NAGŁÓWEK ===
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.text('OFERTA HANDLOWA', 105, yPos, { align: 'center' });
  yPos += 15;

  // Linia separator
  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 10;

  // === INFORMACJE O OFERCIE ===
  doc.setFontSize(10);
  doc.setFont('times', 'normal');

  const offerDate = new Date().toLocaleDateString('pl-PL');
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL'); // +30 dni

  doc.text(fixPolishChars(`Klient: ${calculationMeta.client || 'N/A'}`), 15, yPos);
  yPos += 6;
  doc.text(fixPolishChars(`Data: ${offerDate}`), 15, yPos);
  yPos += 6;
  doc.text(fixPolishChars(`Waznosc oferty: ${validUntil} (30 dni)`), 15, yPos);
  yPos += 10;

  // Linia separator
  doc.line(15, yPos, 195, yPos);
  yPos += 10;

  // === ELEMENTY OBJETE OFER ===
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('ELEMENTY OBJETE OFERTA'), 15, yPos);
  yPos += 10;

  let totalToolingCost = 0;

  // Iteruj przez wszystkie elementy
  calculation.items.forEach((item, index) => {
    // Sprawdź czy jest miejsce na nowy element (co najmniej 40mm)
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Numer elementu
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text(fixPolishChars(`${index + 1}. Part ID: ${item.partId || 'N/A'}`), 15, yPos);
    yPos += 7;

    // Podstawowe info
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text(fixPolishChars(`   Material: ${item.tabName || 'N/A'}`), 15, yPos);
    yPos += 6;

    const annualVolume = parseFloat(item.annualVolume) || 0;
    doc.text(fixPolishChars(`   Ilosc roczna: ${annualVolume.toLocaleString('pl-PL')} szt`), 15, yPos);
    yPos += 8;

    // Ceny jednostkowe
    const exwPrice = item.results?.totalWithSGA || 0;
    const transportCost = item.results?.transportCost || 0;
    const dapPrice = exwPrice + transportCost;

    doc.setFont('times', 'bold');
    doc.text(fixPolishChars('   Ceny jednostkowe:'), 15, yPos);
    yPos += 6;
    doc.setFont('times', 'normal');
    doc.text(fixPolishChars(`   - Cena EXW:     ${formatCurrency(exwPrice)}/szt`), 15, yPos);
    yPos += 6;

    if (transportCost > 0) {
      doc.text(fixPolishChars(`   - Cena DAP:     ${formatCurrency(dapPrice)}/szt`), 15, yPos);
      yPos += 6;
    }
    yPos += 2;

    // Tooling jesli istnieje
    if (item.tooling?.enabled && item.tooling?.items?.length > 0) {
      doc.setFont('times', 'bold');
      doc.text(fixPolishChars('   Tooling (jednorazowo):'), 15, yPos);
      yPos += 6;
      doc.setFont('times', 'normal');

      let itemToolingTotal = 0;
      item.tooling.items.forEach(tool => {
        const toolCost = parseFloat(tool.cost) || 0;
        itemToolingTotal += toolCost;
        doc.text(fixPolishChars(`   - ${tool.name}`), 15, yPos);
        doc.text(formatCurrency(toolCost), 160, yPos, { align: 'right' });
        yPos += 6;
      });

      // Suma toolingu dla tego elementu
      doc.setLineWidth(0.3);
      doc.line(15, yPos, 195, yPos);
      yPos += 4;
      doc.setFont('times', 'bold');
      doc.text(fixPolishChars('   Tooling razem:'), 15, yPos);
      doc.text(formatCurrency(itemToolingTotal), 160, yPos, { align: 'right' });
      yPos += 2;

      totalToolingCost += itemToolingTotal;
    }

    yPos += 6;

    // Linia separator między elementami
    doc.setLineWidth(0.3);
    doc.line(15, yPos, 195, yPos);
    yPos += 8;
  });

  // === PODSUMOWANIE ===
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setLineWidth(0.5);
  doc.line(15, yPos, 195, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('PODSUMOWANIE'), 15, yPos);
  yPos += 10;

  doc.setFontSize(11);
  if (totalToolingCost > 0) {
    doc.text(fixPolishChars('Tooling (jednorazowo):'), 15, yPos);
    doc.text(formatCurrency(totalToolingCost), 160, yPos, { align: 'right' });
    yPos += 10;
  }

  // === STOPKA ===
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text(fixPolishChars('Wygenerowano przez Cost Calculator'), 105, 285, { align: 'center' });
  doc.text(offerDate, 105, 290, { align: 'center' });

  return doc;
};

/**
 * Generuje i pobiera PDF oferty
 */
export const downloadQuotationPDF = (calculation, calculationMeta) => {
  const doc = generateQuotationPDF(calculation, calculationMeta);
  const fileName = `Oferta_${calculationMeta.client || 'Klient'}_${calculation.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generuje ofertę w formacie Excel
 * @param {Object} calculation - Kalkulacja z katalogu
 * @param {Object} calculationMeta - Metadane (klient, etc.)
 * @returns {Object} - Workbook Excel
 */
export const generateQuotationExcel = (calculation, calculationMeta) => {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // === NAGŁÓWEK ===
  wsData.push(['OFERTA HANDLOWA']);
  wsData.push([]);

  // === INFORMACJE O OFERCIE ===
  const offerDate = new Date().toLocaleDateString('pl-PL');
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL');

  wsData.push(['Klient:', calculationMeta.client || 'N/A']);
  wsData.push(['Data:', offerDate]);
  wsData.push(['Ważność oferty:', `${validUntil} (30 dni)`]);
  wsData.push([]);

  // === ELEMENTY OBJĘTE OFERTĄ ===
  wsData.push(['ELEMENTY OBJĘTE OFERTĄ']);
  wsData.push([]);

  let totalToolingCost = 0;

  // Iteruj przez wszystkie elementy
  calculation.items.forEach((item, index) => {
    // Numer elementu
    wsData.push([`${index + 1}. Part ID: ${item.partId || 'N/A'}`]);

    // Podstawowe info
    wsData.push(['   Materiał:', item.tabName || 'N/A']);

    const annualVolume = parseFloat(item.annualVolume) || 0;
    wsData.push(['   Ilość roczna:', `${annualVolume.toLocaleString('pl-PL')} szt`]);

    // Ceny jednostkowe
    const exwPrice = item.results?.totalWithSGA || 0;
    const transportCost = item.results?.transportCost || 0;
    const dapPrice = exwPrice + transportCost;

    wsData.push(['   Ceny jednostkowe:']);
    wsData.push(['   - Cena EXW:', `${formatCurrency(exwPrice)}/szt`]);

    if (transportCost > 0) {
      wsData.push(['   - Cena DAP:', `${formatCurrency(dapPrice)}/szt`]);
    }

    // Tooling jeśli istnieje
    if (item.tooling?.enabled && item.tooling?.items?.length > 0) {
      wsData.push(['   Tooling (jednorazowo):']);

      let itemToolingTotal = 0;
      item.tooling.items.forEach(tool => {
        const toolCost = parseFloat(tool.cost) || 0;
        itemToolingTotal += toolCost;
        wsData.push(['   - ' + tool.name, formatCurrency(toolCost)]);
      });

      // Suma toolingu dla tego elementu
      wsData.push(['   Tooling razem:', formatCurrency(itemToolingTotal)]);

      totalToolingCost += itemToolingTotal;
    }

    wsData.push([]);
  });

  // === PODSUMOWANIE ===
  wsData.push(['PODSUMOWANIE']);
  wsData.push([]);

  if (totalToolingCost > 0) {
    wsData.push(['Tooling (jednorazowo):', formatCurrency(totalToolingCost)]);
  }

  wsData.push([]);
  wsData.push(['Wygenerowano przez Cost Calculator']);
  wsData.push([offerDate]);

  // Tworzenie arkusza
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Stylizacja nagłówka (szerokość kolumn)
  ws['!cols'] = [
    { wch: 30 }, // Kolumna A - nazwy
    { wch: 20 }  // Kolumna B - wartości
  ];

  // Dodaj arkusz do workbooka
  XLSX.utils.book_append_sheet(wb, ws, 'Oferta');

  return wb;
};

/**
 * Generuje i pobiera Excel oferty
 */
export const downloadQuotationExcel = (calculation, calculationMeta) => {
  const wb = generateQuotationExcel(calculation, calculationMeta);
  const fileName = `Oferta_${calculationMeta.client || 'Klient'}_${calculation.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
