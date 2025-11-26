import React, { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { parseCBDExcel, validateCBDData, convertToPendingPool } from '../../services/cbdParser';
import './CBDImportModal.css';

/**
 * Modal do importu plików CBD (Cost Breakdown)
 * Obsługuje upload, parsing, walidację i preview
 */
const CBDImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: upload, 2: preview

  if (!isOpen) return null;

  // Handle file selection
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
    ];

    if (!allowedTypes.includes(selectedFile.type) &&
        !selectedFile.name.endsWith('.xlsx') &&
        !selectedFile.name.endsWith('.xls') &&
        !selectedFile.name.endsWith('.xlsm')) {
      setError('Please select a valid Excel file (.xlsx, .xls, or .xlsm)');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);

    try {
      // Parse Excel file
      console.log('🔄 Parsing CBD file:', selectedFile.name);
      const parsed = await parseCBDExcel(selectedFile);

      // Validate parsed data
      const validationResult = validateCBDData(parsed);

      setParsedData(parsed);
      setValidation(validationResult);
      setStep(2); // Move to preview step

      console.log('✅ CBD parsed successfully:', parsed);

    } catch (err) {
      console.error('❌ Error parsing CBD:', err);
      setError(err.message || 'Failed to parse CBD file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle import confirmation
  const handleConfirmImport = () => {
    if (!parsedData) return;

    // Convert to pending pool format
    const pendingItems = convertToPendingPool(parsedData);

    // Call parent import handler
    onImport(pendingItems);

    // Close modal
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setValidation(null);
    setError(null);
    setStep(1);
    setIsProcessing(false);
    onClose();
  };

  // Handle drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Create a fake event object for handleFileSelect
      handleFileSelect({ target: { files: [droppedFile] } });
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="cbd-import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <FileSpreadsheet size={24} />
            <h2>Import CBD File</h2>
          </div>
          <button className="btn-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {step === 1 && (
            <UploadStep
              file={file}
              isProcessing={isProcessing}
              error={error}
              onFileSelect={handleFileSelect}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          )}

          {step === 2 && parsedData && validation && (
            <PreviewStep
              parsedData={parsedData}
              validation={validation}
              onBack={() => setStep(1)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          {step === 2 && validation?.isValid && (
            <button
              className="btn-primary"
              onClick={handleConfirmImport}
            >
              Import {parsedData.items.length} Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Step 1: Upload file
 */
const UploadStep = ({ file, isProcessing, error, onFileSelect, onDragOver, onDrop }) => {
  return (
    <div className="upload-step">
      <div
        className={`upload-zone ${isProcessing ? 'processing' : ''}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <input
          type="file"
          id="cbd-file-input"
          accept=".xlsx,.xls,.xlsm"
          onChange={onFileSelect}
          disabled={isProcessing}
          style={{ display: 'none' }}
        />
        <label htmlFor="cbd-file-input" className="upload-label">
          <Upload size={48} />
          {isProcessing ? (
            <>
              <h3>Processing...</h3>
              <p>Parsing CBD file</p>
            </>
          ) : (
            <>
              <h3>Drop CBD file here or click to browse</h3>
              <p>Supports .xlsx, .xls, and .xlsm formats</p>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {file && !isProcessing && !error && (
        <div className="file-info">
          <FileSpreadsheet size={20} />
          <span>{file.name}</span>
          <span className="file-size">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
      )}

      <div className="upload-help">
        <h4>Expected CBD Format:</h4>
        <ul>
          <li>First sheet contains part data</li>
          <li>Columns: Item #, Part Number, Description, Annual Volume, etc.</li>
          <li>Yearly forecasts (2025, 2026, ...)</li>
          <li>Standard automotive CBD format (MAN, VW, etc.)</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Step 2: Preview and validate
 */
const PreviewStep = ({ parsedData, validation, onBack }) => {
  const { metadata, items } = parsedData;
  const { isValid, errors, warnings } = validation;

  return (
    <div className="preview-step">
      {/* Validation Status */}
      <div className={`validation-status ${isValid ? 'success' : 'error'}`}>
        {isValid ? (
          <>
            <CheckCircle size={20} />
            <span>CBD file is valid and ready to import</span>
          </>
        ) : (
          <>
            <AlertCircle size={20} />
            <span>Validation errors found</span>
          </>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="validation-messages errors">
          <h4>Errors:</h4>
          <ul>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="validation-messages warnings">
          <h4>Warnings:</h4>
          <ul>
            {warnings.map((warn, idx) => (
              <li key={idx}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="metadata-section">
        <h4>Project Information:</h4>
        <div className="metadata-grid">
          {metadata.bidNo && (
            <div className="meta-item">
              <span className="meta-label">Bid No:</span>
              <span className="meta-value">{metadata.bidNo}</span>
            </div>
          )}
          {metadata.customer && (
            <div className="meta-item">
              <span className="meta-label">Customer:</span>
              <span className="meta-value">{metadata.customer}</span>
            </div>
          )}
          {metadata.platform && (
            <div className="meta-item">
              <span className="meta-label">Platform:</span>
              <span className="meta-value">{metadata.platform}</span>
            </div>
          )}
          {metadata.category && (
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{metadata.category}</span>
            </div>
          )}
          {metadata.sop && (
            <div className="meta-item">
              <span className="meta-label">SOP:</span>
              <span className="meta-value">{metadata.sop}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Preview */}
      <div className="items-preview">
        <h4>Parts to Import ({items.length}):</h4>
        <div className="items-table-container">
          <table className="items-table">
            <thead>
              <tr>
                <th>Item #</th>
                <th>Part Number</th>
                <th>Description</th>
                <th>Annual Volume</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 10).map((item, idx) => (
                <tr key={idx}>
                  <td>{item.itemNo}</td>
                  <td>
                    {item.partNumber}
                    {item.previousPartNumber && (
                      <span className="prev-part"> (prev: {item.previousPartNumber})</span>
                    )}
                  </td>
                  <td>{item.description}</td>
                  <td>{item.averageAnnualVolume?.toLocaleString() || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 10 && (
            <div className="table-more">
              ... and {items.length - 10} more items
            </div>
          )}
        </div>
      </div>

      <button className="btn-back" onClick={onBack}>
        ← Back to Upload
      </button>
    </div>
  );
};

export default CBDImportModal;
