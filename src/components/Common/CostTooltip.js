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

  // Mapowanie nazw kosztów na czytelne etykiety i ikony
  const getCostLabel = (key) => {
    const labels = {
      materialCost: { label: 'Materiał', icon: '🧱' },
      bakingCost: { label: 'Pieczenie', icon: '🔥' },
      cleaningCost: { label: 'Czyszczenie', icon: '🧽' },
      handlingCost: { label: 'Obsługa', icon: '🛠️' },
      customProcessesCost: { label: 'Procesy dodatkowe', icon: '⚙️' },
      customCurvesCost: { label: 'Krzywe niestandardowe', icon: '📈' },
      packagingCost: { label: 'Pakowanie', icon: '📦' },
      prepCost: { label: 'Przygotówka', icon: '🔧' },
      laserCost: { label: 'Cięcie laserowe', icon: '⚡' },
      bendingCost: { label: 'Gięcie', icon: '↪️' },
      joiningCost: { label: 'Łączenie', icon: '🔗' },
      gluingCost: { label: 'Klejenie', icon: '🧴' }
    };
    return labels[key] || { label: key, icon: '💵' };
  };

  // Zbierz wszystkie koszty (pomijając sumy i wagi)
  const costItems = Object.entries(item.results).filter(([key, value]) => {
    // Pomijamy pola które nie są kosztami jednostkowymi
    if (key === 'totalCost' || key === 'totalWithMargin' || key === 'totalWithSGA' ||
        key === 'nettoWeight' || key === 'bruttoWeight' ||
        key === 'bakingTime' || key === 'cleaningTime' || key === 'prepTime') {
      return false;
    }
    const numValue = parseFloat(value) || 0;
    return numValue > 0;
  });

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

  const themeClass = darkMode
    ? 'bg-gray-800 border-blue-400 text-gray-100'
    : 'bg-white border-blue-200';

  const headerClass = darkMode
    ? 'text-blue-400 border-blue-600'
    : 'text-blue-800 border-blue-200';

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
        {/* Dynamiczne wyświetlanie wszystkich kosztów */}
        {costItems.map(([key, value]) => {
          const costInfo = getCostLabel(key);
          const percentage = ((parseFloat(value) / item.results.totalCost) * 100).toFixed(1);

          return (
            <div key={key} className="flex justify-between items-center">
              <span className={themeClasses.text.secondary}>
                {costInfo.icon} {costInfo.label}:
              </span>
              <div className="text-right">
                <div className="font-medium">{parseFloat(value).toFixed(3)} €</div>
                <div className={`text-xs ${themeClasses.text.muted}`}>
                  {percentage}%
                </div>
              </div>
            </div>
          );
        })}

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

        {/* Informacje o wadze / powierzchni */}
        <div className={`text-xs mt-2 pt-2 border-t space-y-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {/* Dla heatshield - informacje o blachy i macie */}
          {item.heatshield && item.results && (
            <>
              {item.results.nettoWeight && (
                <div className="flex justify-between">
                  <span>⚖️ Waga blachy brutto:</span>
                  <span className="font-medium">{parseFloat(item.results.nettoWeight).toFixed(0)} g</span>
                </div>
              )}
              {item.results.bruttoWeight && (
                <div className="flex justify-between">
                  <span>📦 Waga maty brutto:</span>
                  <span className="font-medium">{parseFloat(item.results.bruttoWeight).toFixed(0)} g</span>
                </div>
              )}
              {item.annualVolume && parseFloat(item.annualVolume) > 0 && (
                <>
                  {item.results.nettoWeight && (
                    <div className="flex justify-between pt-1 border-t border-dashed">
                      <span>📅 Blacha brutto rocznie:</span>
                      <span className="font-medium">
                        {((parseFloat(item.results.nettoWeight) * parseFloat(item.annualVolume)) / 1000).toFixed(1)} kg/rok
                      </span>
                    </div>
                  )}
                  {item.results.bruttoWeight && (
                    <div className="flex justify-between">
                      <span>📅 Mata brutto rocznie:</span>
                      <span className="font-medium">
                        {((parseFloat(item.results.bruttoWeight) * parseFloat(item.annualVolume)) / 1000).toFixed(1)} kg/rok
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Dla standardowych trybów - informacje o wadze */}
          {!item.heatshield && (
            <>
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
            </>
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