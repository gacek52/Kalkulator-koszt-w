import React from 'react';

/**
 * Uniwersalny komponent input liczbowy
 */
export function NumberInput({
  value,
  onChange,
  label,
  placeholder,
  min = 0,
  max,
  step = 0.01,
  unit,
  className = '',
  disabled = false,
  required = false,
  error,
  themeClasses = {}
}) {
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const inputClasses = `
    w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500
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
          {unit && <span className="text-gray-500 ml-1">({unit})</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          required={required}
          className={inputClasses}
        />

        {unit && !label && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`text-sm ${themeClasses.text?.secondary || 'text-gray-500'}`}>
              {unit}
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

/**
 * Komponent dla input z prefiksem/sufiksem
 */
export function NumberInputWithAddon({
  value,
  onChange,
  label,
  prefix,
  suffix,
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

      <div className="relative rounded-md shadow-sm">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`${props.themeClasses?.text?.secondary || 'text-gray-500'} sm:text-sm`}>
              {prefix}
            </span>
          </div>
        )}

        <NumberInput
          {...props}
          value={value}
          onChange={onChange}
          label={null}
          className={`
            ${prefix ? 'pl-8' : ''}
            ${suffix ? 'pr-12' : ''}
            ${props.className || ''}
          `}
        />

        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`${props.themeClasses?.text?.secondary || 'text-gray-500'} sm:text-sm`}>
              {suffix}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Komponent dla input z jednostkami do wyboru
 */
export function NumberInputWithUnitSelector({
  value,
  onChange,
  unit,
  onUnitChange,
  units = [],
  label,
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

      <div className="flex rounded-md shadow-sm">
        <NumberInput
          {...props}
          value={value}
          onChange={onChange}
          label={null}
          className="rounded-r-none border-r-0"
        />

        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className={`
            rounded-l-none border-l-0 px-3 py-2 border focus:ring-2 focus:ring-blue-500
            ${props.themeClasses?.input || ''}
          `}
        >
          {units.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}