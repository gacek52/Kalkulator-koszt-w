import React from 'react';
import { Scale, Square, Box, Shield, Layers } from 'lucide-react';

/**
 * Komponent do wyboru trybu kalkulacji
 */
export function CalculationTypeSelector({ calculationType, onChange, themeClasses, darkMode }) {
  const basicTypes = [
    {
      value: 'weight',
      label: 'Waga',
      icon: Scale,
      description: 'Kalkulacja na podstawie wagi netto/brutto'
    },
    {
      value: 'surface',
      label: 'Powierzchnia',
      icon: Square,
      description: 'Kalkulacja na podstawie powierzchni i grubości'
    },
    {
      value: 'volume',
      label: 'Objętość',
      icon: Box,
      description: 'Kalkulacja na podstawie objętości'
    }
  ];

  const advancedTypes = [
    {
      value: 'heatshield',
      label: 'Proste Heatshield\'y',
      icon: Shield,
      description: 'Blacha + mata, procesy standardowe'
    },
    {
      value: 'multilayer',
      label: 'Multilayer',
      icon: Layers,
      description: 'Wiele warstw materiałów'
    }
  ];

  const renderTypeButton = (type) => {
    const Icon = type.icon;
    const isSelected = calculationType === type.value;

    return (
      <button
        key={type.value}
        onClick={() => onChange(type.value)}
        className={`
          p-3 rounded-lg border-2 transition-all
          ${isSelected
            ? (darkMode
                ? 'border-blue-500 bg-blue-900/30 text-blue-200'
                : 'border-blue-500 bg-blue-50 text-blue-700')
            : (darkMode
                ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
          }
        `}
      >
        <div className="flex flex-col items-center space-y-2">
          <Icon size={24} className={isSelected ? (darkMode ? 'text-blue-400' : 'text-blue-600') : ''} />
          <div className="text-center">
            <div className="font-medium text-sm">{type.label}</div>
            <div className={`text-xs mt-1 ${themeClasses.text.muted}`}>
              {type.description}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tryby podstawowe */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${themeClasses.text.primary}`}>
          Tryby podstawowe
        </label>
        <div className="grid grid-cols-3 gap-3">
          {basicTypes.map(renderTypeButton)}
        </div>
      </div>

      {/* Tryby zaawansowane */}
      <div className="space-y-2">
        <label className={`block text-sm font-medium ${themeClasses.text.primary}`}>
          Tryby zaawansowane
        </label>
        <div className="grid grid-cols-2 gap-3">
          {advancedTypes.map(renderTypeButton)}
        </div>
      </div>
    </div>
  );
}
