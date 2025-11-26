import React from 'react';
import './ConfirmDialog.css';

/**
 * ConfirmDialog - Modal confirmation dialog component
 *
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/question
 * @param {function} onConfirm - Callback when user confirms
 * @param {function} onCancel - Callback when user cancels
 * @param {string} confirmText - Text for confirm button (default: 'Potwierdź')
 * @param {string} cancelText - Text for cancel button (default: 'Anuluj')
 * @param {string} variant - Visual style: 'danger', 'warning', 'info' (default: 'info')
 */
const ConfirmDialog = ({
  isOpen,
  title = 'Potwierdź akcję',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  variant = 'info', // 'danger', 'warning', 'info'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'confirm-button-danger';
      case 'warning':
        return 'confirm-button-warning';
      case 'info':
      default:
        return 'confirm-button-info';
    }
  };

  const getIconForVariant = () => {
    switch (variant) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="confirm-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="confirm-dialog-container">
        <div className="confirm-dialog-header">
          <span className="confirm-dialog-icon">{getIconForVariant()}</span>
          <h2 className="confirm-dialog-title">{title}</h2>
        </div>

        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-footer">
          <button
            onClick={onCancel}
            className="confirm-dialog-button confirm-button-cancel"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`confirm-dialog-button ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
