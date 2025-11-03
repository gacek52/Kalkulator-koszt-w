import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Helper function to draw a simple table without autoTable
 */
const drawSimpleTable = (doc, startY, headers, rows, leftMargin = 15) => {
  const rowHeight = 8;
  const colWidths = [90, 90]; // Two columns
  let currentY = startY;

  // Draw header
  doc.setFillColor(100, 100, 100);
  doc.rect(leftMargin, currentY, colWidths[0] + colWidths[1], rowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(headers[0], leftMargin + 2, currentY + 6);
  doc.text(headers[1], leftMargin + colWidths[0] + 2, currentY + 6);
  currentY += rowHeight;

  // Draw rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  rows.forEach(row => {
    doc.rect(leftMargin, currentY, colWidths[0], rowHeight, 'S');
    doc.rect(leftMargin + colWidths[0], currentY, colWidths[1], rowHeight, 'S');
    doc.text(String(row[0]), leftMargin + 2, currentY + 6);
    doc.text(String(row[1]), leftMargin + colWidths[0] + 2, currentY + 6);
    currentY += rowHeight;
  });

  return currentY;
};

/**
 * Generuje PDF z Packaging Data Sheet dla elementu kalkulacji
 * @param {Object} item - Element z kalkulacji
 * @param {Object} calculationMeta - Metadane kalkulacji (klient, etc.)
 * @param {Object} packagingState - Stan kontekstu pakowania (compositions, types)
 * @returns {jsPDF} - Obiekt PDF gotowy do pobrania
 */
export const generatePDS = (item, calculationMeta, packagingState) => {
  const doc = new jsPDF();

  // Nagłówek
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Packaging Data Sheet', 105, 20, { align: 'center' });

  let yPos = 35;

  // === PART INFORMATION ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Part Information', 15, yPos);
  yPos += 8;

  // Part Weight - suma wag netto wszystkich elementów w tym item (jeśli jest wielokrotny)
  const partWeightKg = item.results?.nettoWeight ? (item.results.nettoWeight / 1000).toFixed(3) : 'N/A';

  const partData = [
    ['Part Number', item.partId || 'N/A'],
    ['Part Weight (kg)', partWeightKg]
  ];

  yPos = drawSimpleTable(doc, yPos, ['Field', 'Value'], partData);
  yPos += 10;

  // === PACKAGING INFORMATION ===
  if (item.packaging) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Packaging Information', 15, yPos);
    yPos += 8;

    // Pobierz dane kompozycji
    const composition = packagingState.compositions?.find(
      c => c.id === item.packaging.compositionId
    );

    // Pobierz typ opakowania (karton/KLT) z composition
    const packagingType = composition && packagingState.packagingTypes?.find(
      t => t.id == composition.packagingTypeId  // Użyj == zamiast === dla porównania ID (może być number vs string)
    );

    // Pobierz typ palety (standardowa paleta) - zakładam że ID=1 to standardowa paleta
    const palletType = packagingState.packagingTypes?.find(
      t => t.type === 'Pallet' || t.name?.toLowerCase().includes('paleta')
    );

    // Oblicz metryki pakowania
    // Parts per Carton - ilość w kartonie
    // Jeśli manualPartsInBox jest zaznaczone, użyj wartości partsInBox
    // W przeciwnym razie oblicz: partsPerLayer × layers
    const calculatePartsInBox = () => {
      if (!item.packaging) return 0;
      const partsPerLayer = parseFloat(item.packaging.partsPerLayer) || 0;
      const layers = parseFloat(item.packaging.layers) || 0;
      return partsPerLayer * layers;
    };

    const partsInBox = item.packaging.manualPartsInBox
      ? parseFloat(item.packaging.partsInBox) || 0
      : calculatePartsInBox();

    // Totes/KLTs/Cartons per Layer - liczba opakowań na palecie (z kompozycji)
    const packagesPerPallet = composition?.packagesPerPallet || 0;

    // Layers per Pallet - liczba warstw na palecie (z kompozycji, pole "layers")
    const layersPerPallet = composition?.layers || 0;

    // Parts per Loading Unit - ilość detali na miejsce paletowe
    const partsPerLoadingUnit = partsInBox * packagesPerPallet;

    // Wagi
    const detailNettoWeight = item.results?.nettoWeight || 0; // waga netto w gramach

    // Packaging Tare Weight - waga pustego kartonu/KLT (z packagingType.weight!)
    const packagingTareWeight = packagingType?.weight || 0;

    // Total weight per Tote/KLT/Carton - waga kartonu + detale w środku (netto)
    const cartonTotalWeight = packagingTareWeight + (detailNettoWeight * partsInBox / 1000);

    // Total Weight per Loading Unit - waga całego miejsca paletowego
    const palletWeight = (composition?.standardPalletWeight || 0);
    const loadingUnitWeight = palletWeight + (cartonTotalWeight * packagesPerPallet);

    const packagingData = [
      ['Packaging Type', composition?.name || 'N/A'],
      ['Packaging Tare Weight (kg)', packagingTareWeight ? packagingTareWeight.toFixed(2) : 'N/A'],
      ['Layers per Pallet', layersPerPallet || 'N/A'],
      ['Totes/KLTs/Cartons per Layer', packagesPerPallet || 'N/A'],
      ['Parts per Carton', partsInBox || 'N/A'],
      ['Parts per Loading Unit', partsPerLoadingUnit || 'N/A'],
      ['Total weight per Tote/KLT/Carton (kg)', cartonTotalWeight.toFixed(2)],
      ['Total Weight per Loading Unit (kg)', loadingUnitWeight.toFixed(2)]
    ];

    yPos = drawSimpleTable(doc, yPos, ['Field', 'Value'], packagingData);
    yPos += 10;
  }

  // === SUPPLIER INFORMATION ===
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier Information', 15, yPos);
  yPos += 8;

  const supplierData = [
    ['Supplier Name', calculationMeta.client || 'N/A'],
    ['Supplier City', calculationMeta.clientCity || 'N/A']
  ];

  yPos = drawSimpleTable(doc, yPos, ['Field', 'Value'], supplierData);
  yPos += 10;

  // === ACCESSORIES ===
  if (yPos < 230) { // Jeśli jest miejsce na tej samej stronie
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Rack / Container / Tote/KLT - Dunnage Accessories', 15, yPos);
    yPos += 8;

    // Pobierz dane kompozycji - użyj już wcześniej pobranych zmiennych
    const composition = item.packaging && packagingState.compositions?.find(
      c => c.id === item.packaging.compositionId
    );

    const packagingType = composition && packagingState.packagingTypes?.find(
      t => t.id == composition.packagingTypeId
    );

    // Paleta - domyślne wymiary 1200x800x150, waga z composition.standardPalletWeight
    const palletDimensions = '1200 x 800 x 150';
    const palletWeight = composition?.standardPalletWeight?.toFixed(2) || 'N/A';

    // Karton/KLT - wymiary z packagingType, waga z packagingType.weight
    const packagingDimensions = packagingType?.dimensions
      ? `${packagingType.dimensions.length || 0} x ${packagingType.dimensions.width || 0} x ${packagingType.dimensions.height || 0}`
      : 'N/A';
    const packagingWeight = packagingType?.weight?.toFixed(2) || 'N/A';
    const packagingDescription = packagingType?.name || 'KLT';

    // Draw accessories table with 4 columns
    const accessoriesData = [
      ['Description', 'Dimensions (mm)', 'Tare Weight (kg)', 'N° per LU'],
      ['Pallet', palletDimensions, palletWeight, '1'],
      [packagingDescription, packagingDimensions, packagingWeight, String(composition?.packagesPerPallet || 'N/A')]
    ];

    const colWidths = [45, 45, 45, 45];
    let currentY = yPos;
    const leftMargin = 15;
    const rowHeight = 8;

    // Draw header row
    doc.setFillColor(100, 100, 100);
    doc.rect(leftMargin, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    accessoriesData[0].forEach((header, i) => {
      const xPos = leftMargin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(header, xPos + 2, currentY + 6);
    });
    currentY += rowHeight;

    // Draw data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    accessoriesData.slice(1).forEach(row => {
      row.forEach((cell, i) => {
        const xPos = leftMargin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.rect(xPos, currentY, colWidths[i], rowHeight, 'S');
        doc.text(String(cell), xPos + 2, currentY + 6);
      });
      currentY += rowHeight;
    });
  }

  // Stopka
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0, 0, 0);
  doc.text('Generated by Cost Calculator', 105, 285, { align: 'center' });
  doc.text(new Date().toLocaleDateString('pl-PL'), 105, 290, { align: 'center' });

  return doc;
};

/**
 * Generuje i pobiera PDF dla pojedynczego elementu
 */
export const downloadPDS = (item, calculationMeta, packagingState) => {
  const doc = generatePDS(item, calculationMeta, packagingState);
  const fileName = `PDS_${item.partId || item.id}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generuje PDFy dla wielu elementów (zip lub osobne pliki)
 */
export const downloadMultiplePDS = (items, calculationMeta, packagingState) => {
  items.forEach(item => {
    downloadPDS(item, calculationMeta, packagingState);
  });
};
