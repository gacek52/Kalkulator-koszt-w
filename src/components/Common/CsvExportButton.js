import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Komponent do eksportu danych do CSV
 */
export function CsvExportButton({
  data,
  filename = 'export',
  label = 'Eksportuj CSV',
  columns = [],
  className = '',
  disabled = false,
  themeClasses = {}
}) {
  const handleExport = () => {
    try {
      if (!data || data.length === 0) {
        alert('Brak danych do eksportu');
        return;
      }

      // Przygotuj nagłówki CSV
      const headers = columns.length > 0
        ? columns.map(col => col.header || col.key)
        : Object.keys(data[0]);

      // Przygotuj dane CSV
      const csvData = data.map(row => {
        if (columns.length > 0) {
          return columns.map(col => {
            const value = col.accessor ? col.accessor(row) : row[col.key];
            return formatCsvValue(value);
          });
        } else {
          return Object.values(row).map(formatCsvValue);
        }
      });

      // Składaj plik CSV
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n');

      // Dodaj BOM dla poprawnego kodowania w Excel
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Błąd eksportu CSV:', error);
      alert('Wystąpił błąd podczas eksportu danych.');
    }
  };

  const formatCsvValue = (value) => {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // Jeśli wartość zawiera przecinek, cudzysłów lub nową linię, otoczyć cudzysłowami
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  };

  const buttonClasses = `
    inline-flex items-center px-4 py-2 rounded-lg font-medium focus:ring-2 focus:ring-green-500
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
    ${themeClasses.button?.success || 'bg-green-600 text-white'}
    ${className}
  `.trim();

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className={buttonClasses}
      title="Eksportuje dane do pliku CSV (Excel)"
    >
      <FileText size={16} className="mr-2" />
      {label}
    </button>
  );
}

/**
 * Hook do przygotowania danych kalkulatora do eksportu CSV
 */
export function useCalculatorCsvExport() {
  const prepareCalculatorData = (tabs) => {
    const data = [];

    tabs.forEach(tab => {
      tab.items.forEach(item => {
        if (item.results) {
          data.push({
            'Zakładka': tab.name,
            'ID części': item.partId || '-',
            'Waga (g)': item.weight || '-',
            'Typ wagi': item.weightOption === 'netto' ? 'Netto' : 'Brutto',
            'Materiał (€)': item.results.materialCost?.toFixed(2) || '-',
            'Pieczenie (€)': item.results.bakingCost?.toFixed(2) || '-',
            'Czyszczenie (€)': item.results.cleaningCost?.toFixed(2) || '-',
            'Obsługa (€)': item.results.handlingCost?.toFixed(2) || '-',
            'Procesy niestandardowe (€)': item.results.customProcessesCost?.toFixed(2) || '-',
            'Koszt całkowity (€)': item.results.totalCost?.toFixed(2) || '-',
            'Z marżą (€)': item.results.totalWithMargin?.toFixed(2) || '-',
            'Z SG&A (€)': item.results.finalPrice?.toFixed(2) || '-'
          });
        }
      });
    });

    return data;
  };

  const preparePackagingData = (calculations) => {
    const data = [];

    Object.entries(calculations).forEach(([calcId, calc]) => {
      if (calc.packaging) {
        data.push({
          'ID kalkulacji': calcId,
          'Opakowanie': calc.packaging.name,
          'Roczna objętość': calc.annualVolume || '-',
          'Pakowania rocznie': calc.packagesNeeded || '-',
          'Palety rocznie': calc.palletsNeeded || '-',
          'Miejsca paletowe': calc.palletSpaces || '-',
          'Koszt pakowania (€)': calc.costs?.packaging?.toFixed(2) || '-',
          'Koszt transportu (€)': calc.costs?.transport?.toFixed(2) || '-',
          'Koszt całkowity (€)': calc.costs?.total?.toFixed(2) || '-'
        });
      }
    });

    return data;
  };

  return {
    prepareCalculatorData,
    preparePackagingData
  };
}

/**
 * Komponent do eksportu kalkulacji z dodatkowymi opcjami
 */
export function CalculatorCsvExportButton({
  tabs,
  globalSGA,
  filename = 'kalkulacja',
  ...props
}) {
  const { prepareCalculatorData } = useCalculatorCsvExport();

  const data = prepareCalculatorData(tabs);

  const columns = [
    { key: 'Zakładka', header: 'Zakładka' },
    { key: 'ID części', header: 'ID części' },
    { key: 'Waga (g)', header: 'Waga (g)' },
    { key: 'Typ wagi', header: 'Typ wagi' },
    { key: 'Materiał (€)', header: 'Materiał (€)' },
    { key: 'Pieczenie (€)', header: 'Pieczenie (€)' },
    { key: 'Czyszczenie (€)', header: 'Czyszczenie (€)' },
    { key: 'Obsługa (€)', header: 'Obsługa (€)' },
    { key: 'Procesy niestandardowe (€)', header: 'Procesy niestandardowe (€)' },
    { key: 'Koszt całkowity (€)', header: 'Koszt całkowity (€)' },
    { key: 'Z marżą (€)', header: 'Z marżą (€)' },
    { key: 'Z SG&A (€)', header: `Z SG&A ${globalSGA}% (€)` }
  ];

  return (
    <CsvExportButton
      data={data}
      columns={columns}
      filename={filename}
      {...props}
    />
  );
}