import React, { useState, useRef, useEffect } from 'react';
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
  const [draggingPoint, setDraggingPoint] = useState(null);
  const chartContainerRef = useRef(null);
  const chartDimensionsRef = useRef({ minX: 0, maxX: 100, minY: 0, maxY: 100, width: 0, height: 0 });

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

  // Obsługa kliknięcia na wykres (dodawanie punktu)
  const handleChartClick = (e) => {
    if (readonly || !e || !e.activeLabel || draggingPoint !== null) return;

    // Nie dodawaj punktu jeśli kliknięto na istniejący punkt
    const clickedX = parseFloat(e.activeLabel);
    const tolerance = 5; // tolerancja w jednostkach X
    const existingPoint = curveData.find(p => Math.abs(p.x - clickedX) < tolerance);

    if (existingPoint) return;

    // Dodaj nowy punkt w miejscu kliknięcia
    const interpolatedY = interpolate(clickedX);

    const newPoint = { x: Math.round(clickedX * 10) / 10, y: Math.round(interpolatedY * 10) / 10 };
    const newCurve = [...curveData, newPoint].sort((a, b) => a.x - b.x);

    onUpdateCurve(newCurve);
  };

  // Oblicz wymiary wykresu i zakresy
  useEffect(() => {
    if (curveData.length >= 2) {
      const sortedPoints = [...curveData].sort((a, b) => a.x - b.x);
      const minX = sortedPoints[0].x;
      const maxX = sortedPoints[sortedPoints.length - 1].x;
      const minY = Math.min(...curveData.map(p => p.y));
      const maxY = Math.max(...curveData.map(p => p.y));

      chartDimensionsRef.current = {
        minX,
        maxX: maxX + (maxX - minX) * 0.1, // dodaj 10% marginesu
        minY: Math.max(0, minY - (maxY - minY) * 0.1),
        maxY: maxY + (maxY - minY) * 0.1,
        width: 0,
        height: 0
      };
    }
  }, [curveData]);

  // Transformacja współrzędnych ekranu na współrzędne wykresu
  const screenToChartCoords = (clientX, clientY) => {
    if (!chartContainerRef.current) return null;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const margin = { left: 60, right: 30, top: 20, bottom: 50 };

    const chartWidth = rect.width - margin.left - margin.right;
    const chartHeight = rect.height - margin.top - margin.bottom;

    const relX = clientX - rect.left - margin.left;
    const relY = clientY - rect.top - margin.top;

    const { minX, maxX, minY, maxY } = chartDimensionsRef.current;

    const x = minX + (relX / chartWidth) * (maxX - minX);
    const y = maxY - (relY / chartHeight) * (maxY - minY);

    return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(0, y) };
  };

  // Obsługa ruchu myszy podczas przeciągania
  const handleMouseMove = (e) => {
    if (draggingPoint === null || readonly) return;

    const coords = screenToChartCoords(e.clientX, e.clientY);
    if (!coords) return;

    const newCurve = [...curveData];
    newCurve[draggingPoint] = {
      x: Math.round(coords.x * 10) / 10,
      y: Math.round(coords.y * 10) / 10
    };

    onUpdateCurve(newCurve);
  };

  // Obsługa rozpoczęcia przeciągania punktu
  const handlePointMouseDown = (index, e) => {
    if (readonly) return;
    e.stopPropagation();
    setDraggingPoint(index);
  };

  // Obsługa podwójnego kliknięcia na punkt (usuwanie)
  const handlePointDoubleClick = (index, e) => {
    if (readonly) return;
    e.preventDefault();
    e.stopPropagation();
    removePoint(index);
  };

  // Obsługa zakończenia przeciągania
  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  // Globalne event listenery dla przeciągania
  useEffect(() => {
    if (draggingPoint !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingPoint]); // eslint-disable-line react-hooks/exhaustive-deps

  // Custom dot component dla punktów kontrolnych
  const ControlPoint = (props) => {
    const { cx, cy, payload } = props;

    // Nie pokazuj punktów dla wygenerowanych danych
    if (payload.isGenerated) return null;

    const pointIndex = payload.index;

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={draggingPoint === pointIndex ? 8 : 6}
          fill={color}
          stroke={darkMode ? "#1F2937" : "#FFFFFF"}
          strokeWidth={2}
          style={{ cursor: readonly ? 'default' : (draggingPoint === pointIndex ? 'grabbing' : 'grab') }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handlePointMouseDown(pointIndex, e.nativeEvent || e);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handlePointDoubleClick(pointIndex, e.nativeEvent || e);
          }}
        />
      </g>
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

      {/* Wykres interaktywny - pełna szerokość */}
      <div
        ref={chartContainerRef}
        className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
        style={{ userSelect: 'none' }}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleChartClick}
            >
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
        {!readonly && (
          <div className={`text-xs mt-2 ${themeClasses.text?.secondary || 'text-gray-500'}`}>
            💡 Kliknij na wykres aby dodać punkt, podwójnie kliknij punkt aby usunąć, przeciągnij punkt aby go przesunąć
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