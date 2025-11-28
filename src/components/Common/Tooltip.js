import React, { useState } from 'react';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';
import './Tooltip.css';

/**
 * Tooltip - Enhanced informational tooltip component
 *
 * @param {string|ReactNode} content - Tooltip text content or JSX
 * @param {string} position - Tooltip position: 'top', 'bottom', 'left', 'right' (default: 'top')
 * @param {string} variant - Visual variant: 'default', 'info', 'warning', 'success' (default: 'default')
 * @param {number} delay - Delay in ms before showing tooltip (default: 0)
 * @param {number} maxWidth - Maximum width in pixels (default: 250)
 * @param {React.ReactNode} children - Element that triggers the tooltip
 * @param {string} className - Additional CSS classes
 */
const Tooltip = ({
  content,
  position = 'top',
  variant = 'default',
  delay = 0,
  maxWidth = 250,
  children,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  if (!content) {
    return <>{children}</>;
  }

  const showTooltip = () => {
    if (delay > 0) {
      const id = setTimeout(() => setIsVisible(true), delay);
      setTimeoutId(id);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  return (
    <div className={`tooltip-wrapper ${className}`}>
      <div
        className="tooltip-trigger"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={`tooltip-content tooltip-${position} tooltip-${variant}`}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          <div className="tooltip-text">{content}</div>
          <div className={`tooltip-arrow tooltip-arrow-${position}`}></div>
        </div>
      )}
    </div>
  );
};

/**
 * TooltipHelp - Help icon with tooltip (most common use case)
 *
 * @param {string|ReactNode} content - Help text
 * @param {string} position - Tooltip position
 */
export function TooltipHelp({ content, position = 'top', ...props }) {
  return (
    <Tooltip content={content} position={position} variant="info" {...props}>
      <span className="tooltip-icon-help">
        <HelpCircle size={16} />
      </span>
    </Tooltip>
  );
}

/**
 * TooltipInfo - Info icon with tooltip
 *
 * @param {string|ReactNode} content - Info text
 * @param {string} position - Tooltip position
 */
export function TooltipInfo({ content, position = 'top', ...props }) {
  return (
    <Tooltip content={content} position={position} variant="info" {...props}>
      <span className="tooltip-icon-info">
        <Info size={16} />
      </span>
    </Tooltip>
  );
}

/**
 * TooltipWarning - Warning icon with tooltip
 *
 * @param {string|ReactNode} content - Warning text
 * @param {string} position - Tooltip position
 */
export function TooltipWarning({ content, position = 'top', ...props }) {
  return (
    <Tooltip content={content} position={position} variant="warning" {...props}>
      <span className="tooltip-icon-warning">
        <AlertCircle size={16} />
      </span>
    </Tooltip>
  );
}

/**
 * InlineTooltip - Tooltip on inline text (dotted underline)
 *
 * @param {string} text - Text to display
 * @param {string|ReactNode} tooltip - Tooltip content
 */
export function InlineTooltip({ text, tooltip, ...props }) {
  return (
    <Tooltip content={tooltip} {...props}>
      <span className="inline-tooltip-text">{text}</span>
    </Tooltip>
  );
}

export default Tooltip;
