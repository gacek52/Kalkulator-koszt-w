import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Komponent tooltipa z rozpisem kosztów
 */
export function CostTooltip({ item, position, isPinned = false, onClose, themeClasses, darkMode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);

  const handleMouseDown = (e) => {
    if (!isPinned) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y
    });
  };

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging) return;
    setCurrentPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  React.useEffect(() => {
    if (!isPinned) {
      setCurrentPosition(position);
    }
  }, [position, isPinned]);

  if (!item?.results) return null;

  const tooltipStyle = isPinned
    ? {
        position: 'fixed',
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      }
    : {
        position: 'fixed',
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        zIndex: 1000,
        pointerEvents: 'none'
      };

  const themeClass = isPinned
    ? (darkMode ? 'bg-orange-900 border-orange-600 text-orange-100' : 'bg-orange-50 border-orange-300')
    : (darkMode ? 'bg-gray-800 border-blue-400 text-gray-100' : 'bg-white border-blue-200');

  const headerClass = isPinned
    ? (darkMode ? 'text-orange-300 border-orange-600' : 'text-orange-800 border-orange-300')
    : (darkMode ? 'text-blue-400 border-blue-600' : 'text-blue-800 border-blue-200');

  return (
    <div
      style={tooltipStyle}
      className={`w-80 rounded-lg shadow-xl border-2 p-4 ${themeClass}`}
      onMouseDown={handleMouseDown}
    >
      {/* Header z przyciskiem zamknięcia */}
      <div className={`flex items-start justify-between mb-2 pb-2 border-b ${headerClass}`}>
        <div className="flex-1">
          <div className="font-bold">
            {isPinned ? '📌' : '📊'} Rozkład kosztów
          </div>
          <div className="text-sm font-semibold mt-1">
            {item.partId || `Pozycja ${item.id}`}
          </div>
          {!isPinned && (
            <div className={`text-xs font-normal mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              Kliknij aby przypiąć
            </div>
          )}
        </div>
        {isPinned && onClose && (
          <button
            onClick={onClose}
            className={`ml-2 p-1 rounded hover:bg-gray-700 transition-colors`}
            style={{ pointerEvents: 'auto' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Zawartość tooltipa */}
      <div className="space-y-1 text-sm">
        {/* Materiał */}
        <div className="flex justify-between items-center">
          <span className={themeClasses.text.secondary}>🧱 Materiał:</span>
          <div className="text-right">
            <div className="font-medium">{item.results.materialCost.toFixed(3)} €</div>
            <div className={`text-xs ${themeClasses.text.muted}`}>
              {((item.results.materialCost / item.results.totalCost) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Pieczenie */}
        <div className="flex justify-between items-center">
          <span className={themeClasses.text.secondary}>🔥 Pieczenie:</span>
          <div className="text-right">
            <div className="font-medium">{item.results.bakingCost.toFixed(3)} €</div>
            <div className={`text-xs ${themeClasses.text.muted}`}>
              {((item.results.bakingCost / item.results.totalCost) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Czyszczenie */}
        <div className="flex justify-between items-center">
          <span className={themeClasses.text.secondary}>🧽 Czyszczenie:</span>
          <div className="text-right">
            <div className="font-medium">{item.results.cleaningCost.toFixed(3)} €</div>
            <div className={`text-xs ${themeClasses.text.muted}`}>
              {((item.results.cleaningCost / item.results.totalCost) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Procesy niestandardowe */}
        {item.results.customProcessesCost > 0 && (
          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>⚙️ Procesy dodatkowe:</span>
            <div className="text-right">
              <div className="font-medium">{item.results.customProcessesCost.toFixed(3)} €</div>
              <div className={`text-xs ${themeClasses.text.muted}`}>
                {((item.results.customProcessesCost / item.results.totalCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Obsługa */}
        <div className="flex justify-between items-center">
          <span className={themeClasses.text.secondary}>🛠️ Obsługa:</span>
          <div className="text-right">
            <div className="font-medium">{item.results.handlingCost.toFixed(3)} €</div>
            <div className={`text-xs ${themeClasses.text.muted}`}>
              {((item.results.handlingCost / item.results.totalCost) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Koszt wytworzenia */}
        <div className="border-t pt-1 mt-2">
          <div className="flex justify-between items-center font-semibold">
            <span className={themeClasses.text.primary}>💰 Koszt wytworzenia:</span>
            <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>
              {item.results.totalCost.toFixed(3)} €
            </span>
          </div>
        </div>

        {/* Marża */}
        {item.margin && parseFloat(item.margin) > 0 && (
          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>📈 Marża ({item.margin}%):</span>
            <span className="font-medium">
              {(item.results.totalCost * (parseFloat(item.margin) / 100)).toFixed(3)} €
            </span>
          </div>
        )}

        {/* SG&A */}
        {item.results.totalWithSGA && item.results.totalWithSGA > item.results.totalCost && (
          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>🏢 SG&A:</span>
            <span className="font-medium">
              {(item.results.totalWithSGA - item.results.totalCost).toFixed(3)} €
            </span>
          </div>
        )}

        {/* Cena finalna */}
        {item.results.totalWithSGA && (
          <div className="border-t pt-1 mt-2">
            <div className="flex justify-between items-center font-bold text-base">
              <span className={themeClasses.text.primary}>🏷️ Cena EXW:</span>
              <span className={darkMode ? 'text-green-400' : 'text-green-600'}>
                {item.results.totalWithSGA.toFixed(3)} €
              </span>
            </div>
          </div>
        )}

        {/* Informacje o wadze */}
        <div className={`text-xs mt-2 pt-2 border-t space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="flex justify-between">
            <span>⚖️ Waga netto:</span>
            <span className="font-medium">{parseFloat(item.weight || 0).toFixed(0)} g</span>
          </div>
          {item.bruttoWeight && (
            <div className="flex justify-between">
              <span>📦 Waga brutto:</span>
              <span className="font-medium">{parseFloat(item.bruttoWeight).toFixed(0)} g</span>
            </div>
          )}
          {item.annualVolume && parseFloat(item.annualVolume) > 0 && (
            <div className="flex justify-between pt-1 border-t border-dashed">
              <span>📅 Roczne zapotrzebowanie:</span>
              <span className="font-medium">
                {((parseFloat(item.bruttoWeight || item.weight || 0) * parseFloat(item.annualVolume)) / 1000).toFixed(1)} kg/rok
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook do zarządzania tooltipami
 */
export function useTooltips() {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [pinnedTooltips, setPinnedTooltips] = useState([]);

  const handleMouseEnter = (item, event) => {
    if (item.results) {
      setHoveredItem(item);
      updateTooltipPosition(event);
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleMouseMove = (event) => {
    if (hoveredItem) {
      updateTooltipPosition(event);
    }
  };

  const updateTooltipPosition = (event) => {
    const tooltipWidth = 320;
    const tooltipHeight = 400;
    const margin = 15;

    let x = event.clientX + margin;
    let y = event.clientY - margin;

    if (x + tooltipWidth > window.innerWidth) {
      x = event.clientX - tooltipWidth - margin;
    }

    if (y + tooltipHeight > window.innerHeight) {
      y = event.clientY - tooltipHeight - margin;
    }

    if (y < 0) {
      y = margin;
    }

    if (x < 0) {
      x = margin;
    }

    setMousePosition({ x, y });
  };

  const handleItemClick = (item, event) => {
    if (item.results) {
      event.preventDefault();
      event.stopPropagation();

      const isAlreadyPinned = pinnedTooltips.some(pinned => pinned.item.id === item.id);
      if (isAlreadyPinned) return;

      const tooltipWidth = 320;
      const existingCount = pinnedTooltips.length;
      let x = 50 + (existingCount * 30);
      let y = 50 + (existingCount * 30);

      if (x + tooltipWidth > window.innerWidth) {
        x = 50;
        y += 100;
      }

      const newPinnedTooltip = {
        item: { ...item },
        position: { x, y },
        id: Date.now()
      };

      setPinnedTooltips([...pinnedTooltips, newPinnedTooltip]);
      setHoveredItem(null);
    }
  };

  const removePinnedTooltip = (tooltipId) => {
    setPinnedTooltips(pinnedTooltips.filter(tooltip => tooltip.id !== tooltipId));
  };

  return {
    hoveredItem,
    mousePosition,
    pinnedTooltips,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    handleItemClick,
    removePinnedTooltip
  };
}