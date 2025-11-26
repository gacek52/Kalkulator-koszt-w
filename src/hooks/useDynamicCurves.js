import { useMemo } from 'react';
import { useCurvePresets } from '../context/CurvePresetContext';

/**
 * Hook do dynamicznego ładowania krzywych z presetów
 *
 * Zwraca krzywe na podstawie curvePresetId zapisanego w zakładce.
 * Jeśli preset zostanie edytowany, wszystkie kalkulacje używające go automatycznie zobaczą zmiany.
 *
 * @param {string|null} curvePresetId - ID presetu krzywych
 * @param {object|null} legacyEditingCurves - Stare krzywe dla kompatybilności wstecznej
 * @param {array|null} legacyCustomCurves - Stare krzywe niestandardowe dla kompatybilności wstecznej
 * @returns {object} - Obiekt z editingCurves i customCurves
 */
export function useDynamicCurves(curvePresetId, legacyEditingCurves = null, legacyCustomCurves = null) {
  const { presets, actions: presetActions } = useCurvePresets();

  const curves = useMemo(() => {
    // Jeśli jest curvePresetId, załaduj krzywe z presetu
    if (curvePresetId) {
      const preset = presetActions.getById(curvePresetId);

      if (preset && preset.curves) {
        return {
          editingCurves: preset.curves.editingCurves || getDefaultCurves(),
          customCurves: preset.curves.customCurves || []
        };
      }
    }

    // Fallback - jeśli nie ma presetu, użyj starych krzywych (kompatybilność wsteczna)
    if (legacyEditingCurves) {
      return {
        editingCurves: legacyEditingCurves,
        customCurves: legacyCustomCurves || []
      };
    }

    // Ostateczny fallback - domyślne krzywe
    return {
      editingCurves: getDefaultCurves(),
      customCurves: []
    };
  }, [curvePresetId, presets, legacyEditingCurves, legacyCustomCurves]);

  return curves;
}

/**
 * Zwraca domyślne krzywe (hardcoded fallback)
 */
function getDefaultCurves() {
  return {
    baking: [
      { x: 50, y: 45 },
      { x: 100, y: 55 },
      { x: 500, y: 70 },
      { x: 1000, y: 80 },
      { x: 2000, y: 90 },
      { x: 3000, y: 95 }
    ],
    cleaning: [
      { x: 50, y: 45 },
      { x: 100, y: 55 },
      { x: 500, y: 70 },
      { x: 1000, y: 80 },
      { x: 2000, y: 90 },
      { x: 3000, y: 95 }
    ],
    bruttoWeight: [
      { x: 50, y: 60 },
      { x: 100, y: 120 },
      { x: 500, y: 600 },
      { x: 1000, y: 1200 },
      { x: 2000, y: 2300 },
      { x: 3000, y: 3300 }
    ],
    heatshieldPrep: [
      { x: 0.01, y: 30 },
      { x: 0.05, y: 45 },
      { x: 0.1, y: 60 },
      { x: 0.5, y: 120 },
      { x: 1.0, y: 180 },
      { x: 2.0, y: 300 }
    ],
    heatshieldLaser: [
      { x: 0.0, y: 5 },
      { x: 0.01, y: 5 },
      { x: 0.05, y: 8 },
      { x: 0.1, y: 12 },
      { x: 0.5, y: 25 },
      { x: 1.0, y: 40 },
      { x: 2.0, y: 70 }
    ]
  };
}
