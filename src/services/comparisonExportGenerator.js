import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx-js-style';

/**
 * Generator eksportów porównań wariantów
 * Zawiera: porównanie boku do boku kalkulacji, różnice, metryki finansowe
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
  return `€${parseFloat(value).toFixed(2)}`;
};

/**
 * Formatuje datę
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

/**
 * Oblicza różnicę procentową względem bazowej wartości
 */
const calculatePercentDiff = (baseValue, currentValue) => {
  const base = parseFloat(baseValue) || 0;
  const current = parseFloat(currentValue) || 0;

  if (base === 0) return '-';

  const diff = ((current - base) / base) * 100;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
};

/**
 * Oblicza totale dla kalkulacji
 */
const calculateTotals = (calc) => {
  const items = calc.items || [];

  const totalRevenueEXW = items.reduce((sum, item) => {
    const annualVolume = parseFloat(item.annualVolume || 0);
    const exwPrice = item.results?.totalWithSGA || 0;
    return sum + (annualVolume * exwPrice);
  }, 0);

  const totalRevenueDAP = items.reduce((sum, item) => {
    const annualVolume = parseFloat(item.annualVolume || 0);
    const exwPrice = item.results?.totalWithSGA || 0;
    const transportCost = item.results?.transportCost || 0;
    const unitCost = exwPrice + transportCost;
    return sum + (annualVolume * unitCost);
  }, 0);

  const totalProfit = items.reduce((sum, item) => {
    const annualVolume = parseFloat(item.annualVolume || 0);
    const marginPercent = parseFloat(item.margin || 0);
    const unitMargin = item.results?.totalCost ? (item.results.totalCost * (marginPercent / 100)) : 0;
    return sum + (annualVolume * unitMargin);
  }, 0);

  const totalParts = items.length;

  const avgMargin = items.length > 0
    ? items.reduce((sum, item) => sum + parseFloat(item.margin || 0), 0) / items.length
    : 0;

  return {
    totalRevenueEXW,
    totalRevenueDAP,
    totalProfit,
    totalParts,
    avgMargin
  };
};

/**
 * Generuje PDF porównania
 * @param {Array} comparisonData - Tablica pełnych danych kalkulacji
 * @returns {jsPDF} - Obiekt PDF
 */
export const generateComparisonPDF = (comparisonData) => {
  const doc = new jsPDF('landscape'); // Landscape dla większej liczby kolumn
  let yPos = 15;
  const pageWidth = 297; // A4 landscape width
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // === NAGŁÓWEK ===
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('PORÓWNANIE WARIANTÓW KALKULACJI'), pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  const exportDate = new Date().toLocaleDateString('pl-PL');
  doc.text(`Data eksportu: ${exportDate}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Separator
  doc.setLineWidth(0.5);
  doc.line(leftMargin, yPos, pageWidth - rightMargin, yPos);
  yPos += 8;

  // === PODSTAWOWE INFORMACJE ===
  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('PODSTAWOWE INFORMACJE'), leftMargin, yPos);
  yPos += 7;

  doc.setFontSize(8);
  doc.setFont('times', 'normal');

  // Kolumny: parametr + wartości dla każdej kalkulacji
  const colWidth = Math.min(50, contentWidth / (comparisonData.length + 1));

  const basicInfoRows = [
    ['Nazwa', ...comparisonData.map(c => c.catalogName || '-')],
    ['Status', ...comparisonData.map(c => c.status || '-')],
    ['Klient', ...comparisonData.map(c => c.clientName || '-')],
    ['SGA', ...comparisonData.map(c => `${c.globalSGA || 0}%`)],
    ['Data utworzenia', ...comparisonData.map(c => formatDate(c.createdAt))],
    ['Liczba części', ...comparisonData.map(c => (c.items?.length || 0).toString())]
  ];

  basicInfoRows.forEach(row => {
    let xPos = leftMargin;

    // Pierwsza kolumna (parametr) - pogrubiony
    doc.setFont('times', 'bold');
    doc.text(fixPolishChars(row[0]), xPos, yPos);
    xPos += colWidth;

    // Wartości
    doc.setFont('times', 'normal');
    for (let i = 1; i < row.length; i++) {
      const text = fixPolishChars(row[i]);
      doc.text(text, xPos, yPos);
      xPos += colWidth;
    }

    yPos += 5;
  });

  yPos += 5;

  // === PODSUMOWANIE FINANSOWE ===
  if (yPos > 170) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('PODSUMOWANIE FINANSOWE'), leftMargin, yPos);
  yPos += 7;

  doc.setFontSize(8);
  doc.setFont('times', 'normal');

  const totals = comparisonData.map(calculateTotals);
  const baseTotals = totals[0]; // Pierwsza kalkulacja jako baza

  const financialRows = [
    ['Przychód EXW', ...totals.map(t => formatCurrency(t.totalRevenueEXW))],
    ['Przychód DAP', ...totals.map(t => formatCurrency(t.totalRevenueDAP))],
    ['Marża', ...totals.map(t => formatCurrency(t.totalProfit))],
    ['Średnia marża %', ...totals.map(t => `${t.avgMargin.toFixed(1)}%`)]
  ];

  financialRows.forEach(row => {
    let xPos = leftMargin;

    doc.setFont('times', 'bold');
    doc.text(fixPolishChars(row[0]), xPos, yPos);
    xPos += colWidth;

    doc.setFont('times', 'normal');
    for (let i = 1; i < row.length; i++) {
      const text = fixPolishChars(row[i]);
      doc.text(text, xPos, yPos);
      xPos += colWidth;
    }

    yPos += 5;
  });

  yPos += 5;

  // === RÓŻNICE WZGLĘDEM BAZOWEJ ===
  if (comparisonData.length > 1) {
    if (yPos > 170) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text(fixPolishChars('RÓŻNICE WZGLĘDEM BAZOWEJ (%)'), leftMargin, yPos);
    yPos += 7;

    doc.setFontSize(8);
    doc.setFont('times', 'normal');

    const diffRows = [
      ['Przychód EXW', '-', ...totals.slice(1).map(t =>
        calculatePercentDiff(baseTotals.totalRevenueEXW, t.totalRevenueEXW)
      )],
      ['Przychód DAP', '-', ...totals.slice(1).map(t =>
        calculatePercentDiff(baseTotals.totalRevenueDAP, t.totalRevenueDAP)
      )],
      ['Marża', '-', ...totals.slice(1).map(t =>
        calculatePercentDiff(baseTotals.totalProfit, t.totalProfit)
      )]
    ];

    diffRows.forEach(row => {
      let xPos = leftMargin;

      doc.setFont('times', 'bold');
      doc.text(fixPolishChars(row[0]), xPos, yPos);
      xPos += colWidth;

      doc.setFont('times', 'normal');
      for (let i = 1; i < row.length; i++) {
        const text = fixPolishChars(row[i]);
        doc.text(text, xPos, yPos);
        xPos += colWidth;
      }

      yPos += 5;
    });
  }

  // === NOTATKI ===
  yPos += 5;
  if (yPos > 170) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.text(fixPolishChars('NOTATKI'), leftMargin, yPos);
  yPos += 7;

  doc.setFontSize(8);
  doc.setFont('times', 'normal');

  comparisonData.forEach((calc, idx) => {
    if (calc.notes && calc.notes.trim()) {
      doc.text(`[${idx + 1}] ${fixPolishChars(calc.notes)}`, leftMargin, yPos);
      yPos += 5;
    }
  });

  // === STOPKA ===
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(fixPolishChars('Wygenerowano przez Cost Calculator - Porównanie Wariantów'), pageWidth / 2, 200, { align: 'center' });
  doc.text(exportDate, pageWidth / 2, 204, { align: 'center' });

  return doc;
};

/**
 * Pobiera PDF porównania
 * @param {Array} comparisonData - Tablica pełnych danych kalkulacji
 */
export const downloadComparisonPDF = (comparisonData) => {
  const doc = generateComparisonPDF(comparisonData);
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Porownanie_Wariantow_${timestamp}.pdf`;
  doc.save(fileName);
};

/**
 * Generuje Excel porównania
 * @param {Array} comparisonData - Tablica pełnych danych kalkulacji
 * @returns {Object} - Workbook Excel
 */
export const generateComparisonExcel = (comparisonData) => {
  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Style definitions
  const headerStyle = {
    fill: { fgColor: { rgb: '4F81BD' } },
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  const paramStyle = {
    font: { name: 'Calibri', sz: 11, bold: true },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  const valueStyle = {
    font: { name: 'Calibri', sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  const currencyStyle = {
    font: { name: 'Calibri', sz: 11 },
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right', vertical: 'center' }
  };

  // === NAGŁÓWEK ===
  wsData.push(['PORÓWNANIE WARIANTÓW KALKULACJI']);
  wsData.push([`Data eksportu: ${new Date().toLocaleDateString('pl-PL')}`]);
  wsData.push([]);

  // === PODSTAWOWE INFORMACJE ===
  wsData.push(['PODSTAWOWE INFORMACJE']);
  wsData.push([]);

  const basicInfoRows = [
    ['Parametr', ...comparisonData.map((c, idx) => `Wariant ${idx + 1}`)],
    ['Nazwa', ...comparisonData.map(c => c.catalogName || '-')],
    ['Status', ...comparisonData.map(c => c.status || '-')],
    ['Klient', ...comparisonData.map(c => c.clientName || '-')],
    ['SGA', ...comparisonData.map(c => `${c.globalSGA || 0}%`)],
    ['Data utworzenia', ...comparisonData.map(c => formatDate(c.createdAt))],
    ['Liczba części', ...comparisonData.map(c => c.items?.length || 0)]
  ];

  basicInfoRows.forEach(row => wsData.push(row));
  wsData.push([]);

  // === PODSUMOWANIE FINANSOWE ===
  wsData.push(['PODSUMOWANIE FINANSOWE']);
  wsData.push([]);

  const totals = comparisonData.map(calculateTotals);

  wsData.push(['Parametr', ...comparisonData.map((c, idx) => `Wariant ${idx + 1}`)]);
  wsData.push(['Przychód EXW (€)', ...totals.map(t => t.totalRevenueEXW)]);
  wsData.push(['Przychód DAP (€)', ...totals.map(t => t.totalRevenueDAP)]);
  wsData.push(['Marża (€)', ...totals.map(t => t.totalProfit)]);
  wsData.push(['Liczba części', ...totals.map(t => t.totalParts)]);
  wsData.push(['Średnia marża (%)', ...totals.map(t => t.avgMargin)]);
  wsData.push([]);

  // === RÓŻNICE WZGLĘDEM BAZOWEJ ===
  if (comparisonData.length > 1) {
    wsData.push(['RÓŻNICE WZGLĘDEM BAZOWEJ (%)']);
    wsData.push([]);

    const baseTotals = totals[0];

    wsData.push(['Parametr', 'Bazowa', ...comparisonData.slice(1).map((c, idx) => `Wariant ${idx + 2}`)]);
    wsData.push(['Przychód EXW', '-', ...totals.slice(1).map(t =>
      calculatePercentDiff(baseTotals.totalRevenueEXW, t.totalRevenueEXW)
    )]);
    wsData.push(['Przychód DAP', '-', ...totals.slice(1).map(t =>
      calculatePercentDiff(baseTotals.totalRevenueDAP, t.totalRevenueDAP)
    )]);
    wsData.push(['Marża', '-', ...totals.slice(1).map(t =>
      calculatePercentDiff(baseTotals.totalProfit, t.totalProfit)
    )]);
    wsData.push([]);
  }

  // === NOTATKI ===
  wsData.push(['NOTATKI']);
  wsData.push([]);

  comparisonData.forEach((calc, idx) => {
    wsData.push([`Wariant ${idx + 1}:`, calc.notes || 'Brak notatek']);
  });

  // Tworzenie arkusza
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Stylizacja szerokości kolumn
  const colWidths = [{ wch: 25 }]; // Pierwsza kolumna - parametry
  comparisonData.forEach(() => colWidths.push({ wch: 20 })); // Kolumny z danymi
  ws['!cols'] = colWidths;

  // Dodanie arkusza do workbooka
  XLSX.utils.book_append_sheet(wb, ws, 'Porównanie');

  return wb;
};

/**
 * Pobiera Excel porównania
 * @param {Array} comparisonData - Tablica pełnych danych kalkulacji
 */
export const downloadComparisonExcel = (comparisonData) => {
  const wb = generateComparisonExcel(comparisonData);
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Porownanie_Wariantow_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
