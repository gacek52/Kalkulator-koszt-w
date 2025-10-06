import React from 'react';
import { Download } from 'lucide-react';

/**
 * Komponent do eksportu danych do JSON
 */
export function JsonExportButton({
  data,
  filename = 'export',
  label = 'Eksportuj JSON',
  className = '',
  disabled = false,
  themeClasses = {}
}) {
  const handleExport = () => {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Błąd eksportu JSON:', error);
      alert('Wystąpił błąd podczas eksportu danych.');
    }
  };

  const buttonClasses = `
    inline-flex items-center px-4 py-2 rounded-lg font-medium focus:ring-2 focus:ring-blue-500
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
    ${themeClasses.button?.primary || 'bg-blue-600 text-white'}
    ${className}
  `.trim();

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data}
      className={buttonClasses}
      title="Eksportuje wszystkie dane kalkulatora do pliku JSON"
    >
      <Download size={16} className="mr-2" />
      {label}
    </button>
  );
}

/**
 * Komponent do eksportu wybranych danych
 */
export function SelectiveJsonExportButton({
  getData,
  filename = 'export',
  label = 'Eksportuj wybrane',
  options = [],
  ...props
}) {
  const [selectedOptions, setSelectedOptions] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleExport = () => {
    try {
      const data = getData(selectedOptions);
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (error) {
      console.error('Błąd eksportu JSON:', error);
      alert('Wystąpił błąd podczas eksportu danych.');
    }
  };

  const toggleOption = (option) => {
    setSelectedOptions(prev =>
      prev.includes(option)
        ? prev.filter(o => o !== option)
        : [...prev, option]
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={props.disabled}
        className={`
          inline-flex items-center px-4 py-2 rounded-lg font-medium focus:ring-2 focus:ring-blue-500
          ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
          ${props.themeClasses?.button?.primary || 'bg-blue-600 text-white'}
          ${props.className || ''}
        `}
      >
        <Download size={16} className="mr-2" />
        {label}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          <div className="p-3">
            <h4 className="font-medium mb-2">Wybierz dane do eksportu:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {options.map((option) => (
                <label key={option.key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.key)}
                    onChange={() => toggleOption(option.key)}
                    className="mr-2"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-3 pt-2 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Anuluj
              </button>
              <button
                onClick={handleExport}
                disabled={selectedOptions.length === 0}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Eksportuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}