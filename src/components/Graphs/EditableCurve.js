import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useInterpolation, useCurveValidation } from '../../hooks/useInterpolation';

/**
 * Komponent edytowalnej krzywej z interpolacją
 */
export function EditableCurve({
  curveData,
  onUpdateCurve,
  title,
  color = "#3B82F6",
  themeClasses,
  darkMode,
  xLabel = "X",
  yLabel = "Y",
  interpolationType = 'linear',
  showTable = true,
  readonly = false
}) {
  const { validatePoints, removeDuplicates, ensureMinimumPoints } = useCurveValidation();
  const interpolate = useInterpolation(curveData, interpolationType);

  // Przygotuj dane dla wykresu
  const chartData = curveData
    .map((point, index) => ({ ...point, index }))
    .sort((a, b) => a.x - b.x);

  const handlePointUpdate = (index, field, value) => {
    const newCurve = [...curveData];
    newCurve[index] = { ...newCurve[index], [field]: parseFloat(value) || 0 };

    // Walidacja i czyszczenie danych
    const validatedCurve = validatePoints(newCurve);
    const cleanedCurve = removeDuplicates(validatedCurve);
    const finalCurve = ensureMinimumPoints(cleanedCurve, 2);

    onUpdateCurve(finalCurve);
  };

  const addPoint = () => {
    if (readonly) return;

    // Znajdź odpowiednie miejsce dla nowego punktu
    const lastPoint = curveData[curveData.length - 1] || { x: 0, y: 0 };
    const newPoint = { x: lastPoint.x + 100, y: lastPoint.y };

    onUpdateCurve([...curveData, newPoint]);
  };

  const removePoint = (index) => {
    if (readonly || curveData.length <= 2) return;

    const newCurve = curveData.filter((_, i) => i !== index);
    onUpdateCurve(newCurve);
  };

  // Generuj dodatkowe punkty dla gładkiej krzywej
  const generateSmoothCurve = () => {
    if (curveData.length < 2) return chartData;

    const sortedPoints = [...curveData].sort((a, b) => a.x - b.x);
    const minX = sortedPoints[0].x;
    const maxX = sortedPoints[sortedPoints.length - 1].x;
    const steps = 50;
    const stepSize = (maxX - minX) / steps;

    const smoothPoints = [];
    for (let i = 0; i <= steps; i++) {
      const x = minX + i * stepSize;
      const y = interpolate(x);
      smoothPoints.push({ x, y, isGenerated: true });
    }

    return [...chartData, ...smoothPoints];
  };

  const displayData = interpolationType === 'spline' ? generateSmoothCurve() : chartData;

  // Custom dot component dla punktów kontrolnych
  const ControlPoint = (props) => {
    const { cx, cy, payload } = props;

    // Nie pokazuj punktów dla wygenerowanych danych
    if (payload.isGenerated) return null;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke={darkMode ? "#1F2937" : "#FFFFFF"}
        strokeWidth={2}
        style={{ cursor: readonly ? 'default' : 'grab' }}
        className={readonly ? '' : 'hover:r-8 transition-all'}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5" style={{ color }} />
        <h5 className={`font-medium ${themeClasses.text?.secondary || ''}`}>{title}</h5>
        {interpolationType === 'spline' && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Interpolacja kubiczna
          </span>
        )}
      </div>

      <div className={`grid grid-cols-1 ${showTable ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Wykres interaktywny */}
        <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#E5E7EB"} />
                <XAxis
                  dataKey="x"
                  stroke={darkMode ? "#9CA3AF" : "#6B7280"}
                  label={{ value: xLabel, position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  stroke={darkMode ? "#9CA3AF" : "#6B7280"}
                  label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1F2937" : "#FFFFFF",
                    border: `1px solid ${darkMode ? "#374151" : "#E5E7EB"}`,
                    borderRadius: "6px",
                    color: darkMode ? "#F9FAFB" : "#111827"
                  }}
                  formatter={(value, name) => [value.toFixed(2), yLabel]}
                  labelFormatter={(x) => `${xLabel}: ${x}`}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={color}
                  strokeWidth={2}
                  dot={<ControlPoint />}
                  activeDot={{ r: 8, stroke: color, strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela z danymi */}
        {showTable && (
          <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ backgroundColor: darkMode ? "#1F2937" : "#FFFFFF" }}>
                  <tr>
                    <th className="text-left pb-2">{xLabel}</th>
                    <th className="text-left pb-2">{yLabel}</th>
                    {!readonly && <th className="w-8 pb-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {curveData.map((point, index) => (
                    <tr key={index} className="border-t border-gray-200 dark:border-gray-600">
                      <td className="pr-2 py-1">
                        <input
                          type="number"
                          value={point.x}
                          onChange={(e) => handlePointUpdate(index, 'x', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input || ''}`}
                          min="0"
                          disabled={readonly}
                        />
                      </td>
                      <td className="pr-2 py-1">
                        <input
                          type="number"
                          value={point.y}
                          onChange={(e) => handlePointUpdate(index, 'y', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input || ''}`}
                          step="1"
                          min="0"
                          disabled={readonly}
                        />
                      </td>
                      {!readonly && (
                        <td className="py-1">
                          {curveData.length > 2 && (
                            <button
                              onClick={() => removePoint(index)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!readonly && (
                <button
                  onClick={addPoint}
                  className={`mt-2 text-xs px-2 py-1 rounded ${themeClasses.button?.primary || 'bg-blue-600 text-white'}`}
                >
                  <Plus size={12} className="inline mr-1" /> Dodaj punkt
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Informacje o krzywej */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Punkty kontrolne: {curveData.length}</div>
        {curveData.length >= 2 && (
          <div>
            Zakres: {Math.min(...curveData.map(p => p.x)).toFixed(1)} - {Math.max(...curveData.map(p => p.x)).toFixed(1)} {xLabel.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}