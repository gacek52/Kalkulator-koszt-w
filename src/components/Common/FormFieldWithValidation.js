import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import './FormFieldWithValidation.css';

/**
 * FormFieldWithValidation - Enhanced input field with visual validation feedback
 *
 * @param {string} label - Field label
 * @param {string} value - Current value
 * @param {function} onChange - Change handler
 * @param {string} error - Error message (if any)
 * @param {string} warning - Warning message (if any)
 * @param {string} success - Success message (if any)
 * @param {string} hint - Helpful hint text
 * @param {string} tooltip - Tooltip text (shows on hover)
 * @param {string} variant - Field variant: 'input', 'textarea', 'select' (default: 'input')
 * @param {string} type - Input type (default: 'text')
 * @param {string} placeholder - Placeholder text
 * @param {boolean} required - Whether field is required
 * @param {boolean} disabled - Whether field is disabled
 * @param {array} options - Options for select variant [{value, label}]
 * @param {number} rows - Number of rows for textarea (default: 3)
 * @param {string} className - Additional CSS classes
 */
const FormFieldWithValidation = ({
  label,
  value,
  onChange,
  error,
  warning,
  success,
  hint,
  tooltip,
  variant = 'input',
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  options = [],
  rows = 3,
  className = '',
  ...rest
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasError = error && error.length > 0;
  const hasWarning = !hasError && warning && warning.length > 0;
  const hasSuccess = !hasError && !hasWarning && success && success.length > 0;

  const fieldClassName = `form-field-with-validation ${className} ${
    hasError ? 'has-error' : hasWarning ? 'has-warning' : hasSuccess ? 'has-success' : ''
  }`;

  const renderInput = () => {
    const commonProps = {
      value,
      onChange,
      placeholder,
      disabled,
      className: 'field-input',
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${label}-error` : hasWarning ? `${label}-warning` : undefined,
      ...rest
    };

    switch (variant) {
      case 'textarea':
        return <textarea {...commonProps} rows={rows} />;

      case 'select':
        return (
          <select {...commonProps}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt, idx) => (
              <option key={idx} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'input':
      default:
        return <input type={type} {...commonProps} />;
    }
  };

  return (
    <div className={fieldClassName}>
      {label && (
        <div className="field-label-container">
          <label className="field-label">
            {label}
            {required && <span className="required-indicator"> *</span>}
          </label>

          {tooltip && (
            <div
              className="tooltip-trigger"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <HelpCircle size={16} className="tooltip-icon" />
              {showTooltip && (
                <div className="tooltip-content">
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hint && !hasError && !hasWarning && (
        <div className="field-hint">{hint}</div>
      )}

      {renderInput()}

      {hasError && (
        <div id={`${label}-error`} className="validation-message error-message">
          <span className="message-icon">⚠</span>
          <span className="message-text">{error}</span>
        </div>
      )}

      {hasWarning && (
        <div id={`${label}-warning`} className="validation-message warning-message">
          <span className="message-icon">ⓘ</span>
          <span className="message-text">{warning}</span>
        </div>
      )}

      {hasSuccess && (
        <div className="validation-message success-message">
          <span className="message-icon">✓</span>
          <span className="message-text">{success}</span>
        </div>
      )}
    </div>
  );
};

export default FormFieldWithValidation;
