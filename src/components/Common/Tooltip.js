import React, { useState } from 'react';
import './Tooltip.css';

/**
 * Tooltip - Informational tooltip component
 *
 * @param {string} content - Tooltip text content
 * @param {string} position - Tooltip position: 'top', 'bottom', 'left', 'right' (default: 'top')
 * @param {React.ReactNode} children - Element that triggers the tooltip
 */
const Tooltip = ({ content, position = 'top', children }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) {
    return <>{children}</>;
  }

  return (
    <div className="tooltip-wrapper">
      <div
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`tooltip-content tooltip-${position}`}>
          <div className="tooltip-text">{content}</div>
          <div className={`tooltip-arrow tooltip-arrow-${position}`}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
