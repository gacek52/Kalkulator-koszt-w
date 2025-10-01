import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Uniwersalny komponent select
 */
export function SelectInput({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Wybierz opcję...',
  className = '',
  disabled = false,
  required = false,
  error,
  themeClasses = {}
}) {
  const selectClasses = `
    w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none
    ${error ? 'border-red-500' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${themeClasses.input || ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      {label && (
        <label className={`block text-sm font-medium ${themeClasses.text?.secondary || ''}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={selectClasses}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

/**
 * Komponent dla select z grupowanymi opcjami
 */
export function GroupedSelectInput({
  value,
  onChange,
  groups = [],
  label,
  placeholder = 'Wybierz opcję...',
  ...props
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className={`block text-sm font-medium ${props.themeClasses?.text?.secondary || ''}`}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={props.disabled}
          required={props.required}
          className={`
            w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none
            ${props.error ? 'border-red-500' : ''}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${props.themeClasses?.input || ''}
            ${props.className || ''}
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {props.error && (
        <p className="text-sm text-red-500">{props.error}</p>
      )}
    </div>
  );
}

/**
 * Multi-select component z checkboxami
 */
export function MultiSelectInput({
  value = [],
  onChange,
  options = [],
  label,
  placeholder = 'Wybierz opcje...',
  maxDisplayed = 3,
  ...props
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const displayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length <= maxDisplayed) {
      return value
        .map(v => options.find(opt => opt.value === v)?.label || v)
        .join(', ');
    }
    return `${value.length} opcji wybranych`;
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className={`block text-sm font-medium ${props.themeClasses?.text?.secondary || ''}`}>
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-left
            ${props.error ? 'border-red-500' : ''}
            ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${props.themeClasses?.input || ''}
            ${props.className || ''}
          `}
          disabled={props.disabled}
        >
          <span className="block truncate">{displayText()}</span>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label key={option.value} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  className="mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {props.error && (
        <p className="text-sm text-red-500">{props.error}</p>
      )}
    </div>
  );
}