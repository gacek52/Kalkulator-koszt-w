import React, { useState } from 'react';
import { Upload, ChevronDown, ChevronUp, ExternalLink, Copy } from 'lucide-react';
import './PendingPoolPanel.css';

/**
 * Panel z pulą oczekujących pozycji zaimportowanych z CBD
 * Wyświetlany nad zakładkami kalkulacji
 */
const PendingPoolPanel = ({
  pendingPool = [],
  tabs = [],
  activeTab,
  onImportCBD,
  onAssignToTab,
  onBulkAssignToTab,
  onDuplicate,
  onRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  // Filtruj tylko pending items
  const pendingItems = pendingPool.filter(item => item.status === 'pending');
  const assignedItems = pendingPool.filter(item => item.status === 'assigned');

  // Toggle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Toggle selection
  const toggleSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Select all
  const selectAll = () => {
    setSelectedItems(pendingItems.map(item => item.id));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Assign selected items - używa bulk assign dla wielu itemów
  const handleAssignSelected = () => {
    if (selectedItems.length === 0) return;

    // Użyj funkcji bulk assign jeśli dostępna, w przeciwnym razie fallback na pojedyncze przypisania
    if (onBulkAssignToTab) {
      onBulkAssignToTab(selectedItems, activeTab);
    } else {
      // Fallback - pojedyncze przypisania (może nie działać poprawnie dla wielu itemów)
      selectedItems.forEach(itemId => {
        onAssignToTab(itemId, activeTab);
      });
    }

    clearSelection();
  };

  // Get tab name by ID
  const getTabName = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? tab.name : 'Unknown Tab';
  };

  if (pendingItems.length === 0 && assignedItems.length === 0) {
    return (
      <div className="pending-pool-panel empty">
        <div className="pool-header">
          <div className="pool-title">
            <Upload size={18} />
            <span>Import CBD</span>
          </div>
          <button
            className="btn-import-cbd"
            onClick={onImportCBD}
          >
            <Upload size={16} />
            Import CBD File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pending-pool-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="pool-header" onClick={toggleExpand}>
        <div className="pool-title">
          <Upload size={18} />
          <span>Imported Parts Pool</span>
          <span className="badge pending">{pendingItems.length} pending</span>
          {assignedItems.length > 0 && (
            <span className="badge assigned">{assignedItems.length} assigned</span>
          )}
        </div>
        <div className="pool-actions">
          <button
            className="btn-import-cbd"
            onClick={(e) => {
              e.stopPropagation();
              onImportCBD();
            }}
          >
            <Upload size={16} />
            Import More
          </button>
          <button className="btn-toggle" onClick={toggleExpand}>
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pool-content">
          {/* Bulk Actions */}
          {pendingItems.length > 0 && (
            <div className="bulk-actions">
              <div className="selection-controls">
                <button onClick={selectAll} className="btn-select">
                  Select All
                </button>
                {selectedItems.length > 0 && (
                  <>
                    <button onClick={clearSelection} className="btn-select">
                      Clear ({selectedItems.length})
                    </button>
                    <button
                      onClick={handleAssignSelected}
                      className="btn-assign-selected"
                    >
                      Assign {selectedItems.length} to Current Tab
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pending Items List */}
          {pendingItems.length > 0 && (
            <div className="items-section">
              <div className="section-header">Pending Items</div>
              <div className="items-list">
                {pendingItems.map(item => (
                  <PendingPoolItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItems.includes(item.id)}
                    onToggleSelect={() => toggleSelection(item.id)}
                    onAssign={onAssignToTab}
                    onDuplicate={onDuplicate}
                    onRemove={onRemove}
                    tabs={tabs}
                    activeTab={activeTab}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assigned Items List */}
          {assignedItems.length > 0 && (
            <div className="items-section">
              <div className="section-header">Assigned Items</div>
              <div className="items-list">
                {assignedItems.map(item => (
                  <div key={item.id} className="pool-item assigned">
                    <div className="item-checkbox">
                      <input type="checkbox" disabled checked={false} />
                    </div>
                    <div className="item-info">
                      <div className="item-header">
                        <span className="part-id">{item.displayPartId}</span>
                        <span className="volume">{item.annualVolume.toLocaleString()} pcs/year</span>
                      </div>
                      <div className="item-description">{item.description}</div>
                      <div className="item-meta">
                        Assigned to: <strong>{getTabName(item.assignedToTab)}</strong>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn-icon"
                        title="Go to tab"
                        onClick={() => {
                          // TODO: Switch to tab
                        }}
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Pojedyncza pozycja w pending pool
 */
const PendingPoolItem = ({
  item,
  isSelected,
  onToggleSelect,
  onAssign,
  onDuplicate,
  onRemove,
  tabs,
  activeTab
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`pool-item ${isSelected ? 'selected' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="item-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
        />
      </div>

      <div className="item-info">
        <div className="item-header">
          <span className="part-id">{item.displayPartId}</span>
          <span className="volume">{item.annualVolume.toLocaleString()} pcs/year</span>
        </div>
        <div className="item-description">{item.description}</div>

        {item.metadata && (
          <div className="item-meta">
            {item.metadata.customer && <span>Customer: {item.metadata.customer}</span>}
            {item.metadata.platform && <span>Platform: {item.metadata.platform}</span>}
            {Object.keys(item.volumeForecast || {}).length > 0 && (
              <span>Forecast: {Object.keys(item.volumeForecast).length} years</span>
            )}
          </div>
        )}
      </div>

      <div className="item-actions">
        {showActions && (
          <>
            <button
              className="btn-icon"
              title="Duplicate for comparison"
              onClick={() => onDuplicate(item.id)}
            >
              <Copy size={16} />
            </button>
            <button
              className="btn-assign"
              onClick={() => onAssign(item.id, activeTab)}
            >
              Assign to Current Tab
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PendingPoolPanel;
