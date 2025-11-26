import React from 'react';
import Tooltip from './Tooltip';
import './HelpIcon.css';

/**
 * HelpIcon - Question mark icon with tooltip
 *
 * @param {string} content - Tooltip help text
 * @param {string} position - Tooltip position: 'top', 'bottom', 'left', 'right'
 */
const HelpIcon = ({ content, position = 'top' }) => {
  return (
    <Tooltip content={content} position={position}>
      <span className="help-icon" tabIndex="0" role="button" aria-label="Pomoc">
        ?
      </span>
    </Tooltip>
  );
};

export default HelpIcon;
