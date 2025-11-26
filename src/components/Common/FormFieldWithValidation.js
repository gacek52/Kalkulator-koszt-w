import React from 'react';
import './FormFieldWithValidation.css';

/**
 * FormFieldWithValidation - Input field with visual validation feedback
 *
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {function} onChange - Change handler
 * @param {string} error - Error message (if any)
 * @param {string} warning - Warning message (if any)
 * @param {string} type - Input type (default: 'text')
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Whether field is required
 * @param {string} className - Additional CSS classes
 */
const FormFieldWithValidation = ({
  label,
  value,
  onChange,
  error,
  warning,
  type = 'text',
  placeholder = '',
  required = false,
  className = '',
  ...rest
}) => {
  const hasError = error && error.length > 0;
  const hasWarning = warning && warning.length > 0;

  const fieldClassName = `form-field-with-validation ${className} ${
    hasError ? 'has-error' : hasWarning ? 'has-warning' : ''
  }`;

  return (
    <div className={fieldClassName}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="required-indicator"> *</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="field-input"
        aria-invalid={hasError}
        aria-describedby={hasError ? `${label}-error` : hasWarning ? `${label}-warning` : undefined}
        {...rest}
      />

      {hasError && (
        <div id={`${label}-error`} className="validation-message error-message">
          <span className="message-icon">⚠</span>
          <span className="message-text">{error}</span>
        </div>
      )}

      {!hasError && hasWarning && (
        <div id={`${label}-warning`} className="validation-message warning-message">
          <span className="message-icon">ⓘ</span>
          <span className="message-text">{warning}</span>
        </div>
      )}
    </div>
  );
};

export default FormFieldWithValidation;
