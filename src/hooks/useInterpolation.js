import { useMemo } from 'react';

/**
 * Hook do interpolacji krzywych XY
 * @param {Array} points - tablica punktów {x, y}
 * @param {string} interpolationType - typ interpolacji ('linear', 'spline')
 * @returns {function} - funkcja interpolująca
 */
export function useInterpolation(points, interpolationType = 'linear') {
  const interpolate = useMemo(() => {
    if (!points || points.length === 0) {
      return () => 0;
    }

    // Sortuj punkty według x
    const sortedPoints = [...points].sort((a, b) => a.x - b.x);

    return (x) => {
      // Ekstrapolacja poza zakresem - kontynuacja z trendem
      if (x <= sortedPoints[0].x && sortedPoints.length >= 2) {
        // Ekstrapolacja w lewo
        const x1 = sortedPoints[0].x;
        const y1 = sortedPoints[0].y;
        const x2 = sortedPoints[1].x;
        const y2 = sortedPoints[1].y;
        const slope = (y2 - y1) / (x2 - x1);
        return y1 + slope * (x - x1);
      }

      if (x >= sortedPoints[sortedPoints.length - 1].x && sortedPoints.length >= 2) {
        // Ekstrapolacja w prawo
        const n = sortedPoints.length;
        const x1 = sortedPoints[n - 2].x;
        const y1 = sortedPoints[n - 2].y;
        const x2 = sortedPoints[n - 1].x;
        const y2 = sortedPoints[n - 1].y;
        const slope = (y2 - y1) / (x2 - x1);
        return y2 + slope * (x - x2);
      }

      // Znajdź punkty do interpolacji
      let i = 0;
      while (i < sortedPoints.length - 1 && sortedPoints[i + 1].x < x) {
        i++;
      }

      const x1 = sortedPoints[i].x;
      const y1 = sortedPoints[i].y;
      const x2 = sortedPoints[i + 1].x;
      const y2 = sortedPoints[i + 1].y;

      if (interpolationType === 'linear') {
        // Interpolacja liniowa
        const t = (x - x1) / (x2 - x1);
        return y1 + t * (y2 - y1);
      } else if (interpolationType === 'spline') {
        // Uproszczona interpolacja kubiczna (Catmull-Rom)
        return catmullRomInterpolation(sortedPoints, i, x);
      }

      return y1; // fallback
    };
  }, [points, interpolationType]);

  return interpolate;
}

/**
 * Hook do odwrotnej interpolacji krzywych (Y→X)
 * @param {Array} points - tablica punktów {x, y}
 * @param {string} interpolationType - typ interpolacji ('linear', 'spline')
 * @returns {function} - funkcja interpolująca odwrotnie
 */
export function useReverseInterpolation(points, interpolationType = 'linear') {
  const interpolate = useMemo(() => {
    if (!points || points.length === 0) {
      return () => 0;
    }

    // Sortuj punkty według y (bo szukamy X dla danego Y)
    const sortedPoints = [...points].sort((a, b) => a.y - b.y);

    return (y) => {
      // Ekstrapolacja poza zakresem - kontynuacja z trendem
      if (y <= sortedPoints[0].y && sortedPoints.length >= 2) {
        // Ekstrapolacja w dół
        const y1 = sortedPoints[0].y;
        const x1 = sortedPoints[0].x;
        const y2 = sortedPoints[1].y;
        const x2 = sortedPoints[1].x;
        const slope = (x2 - x1) / (y2 - y1);
        return x1 + slope * (y - y1);
      }

      if (y >= sortedPoints[sortedPoints.length - 1].y && sortedPoints.length >= 2) {
        // Ekstrapolacja w górę
        const n = sortedPoints.length;
        const y1 = sortedPoints[n - 2].y;
        const x1 = sortedPoints[n - 2].x;
        const y2 = sortedPoints[n - 1].y;
        const x2 = sortedPoints[n - 1].x;
        const slope = (x2 - x1) / (y2 - y1);
        return x2 + slope * (y - y2);
      }

      // Znajdź punkty do interpolacji
      let i = 0;
      while (i < sortedPoints.length - 1 && sortedPoints[i + 1].y < y) {
        i++;
      }

      const y1 = sortedPoints[i].y;
      const x1 = sortedPoints[i].x;
      const y2 = sortedPoints[i + 1].y;
      const x2 = sortedPoints[i + 1].x;

      if (interpolationType === 'linear') {
        // Interpolacja liniowa odwrotna
        if (y2 === y1) return x1; // unikaj dzielenia przez zero
        const t = (y - y1) / (y2 - y1);
        return x1 + t * (x2 - x1);
      }

      return x1; // fallback
    };
  }, [points, interpolationType]);

  return interpolate;
}

/**
 * Interpolacja Catmull-Rom dla gładkich krzywych
 */
function catmullRomInterpolation(points, i, x) {
  // Pobierz 4 punkty kontrolne
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];

  // Normalizuj t względem segmentu p1-p2
  const t = (x - p1.x) / (p2.x - p1.x);
  const t2 = t * t;
  const t3 = t2 * t;

  // Współczynniki Catmull-Rom
  const c0 = -0.5 * t3 + t2 - 0.5 * t;
  const c1 = 1.5 * t3 - 2.5 * t2 + 1;
  const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
  const c3 = 0.5 * t3 - 0.5 * t2;

  return c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y;
}

/**
 * Hook do walidacji i naprawy punktów krzywej
 */
export function useCurveValidation() {
  const validatePoints = (points) => {
    if (!Array.isArray(points)) return [];

    return points
      .filter(point =>
        typeof point.x === 'number' &&
        typeof point.y === 'number' &&
        !isNaN(point.x) &&
        !isNaN(point.y)
      )
      .sort((a, b) => a.x - b.x);
  };

  const removeDuplicates = (points) => {
    const seen = new Set();
    return points.filter(point => {
      const key = `${point.x}-${point.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const ensureMinimumPoints = (points, minimum = 2) => {
    if (points.length < minimum) {
      const newPoints = [...points];
      while (newPoints.length < minimum) {
        const lastPoint = newPoints[newPoints.length - 1] || { x: 0, y: 0 };
        newPoints.push({ x: lastPoint.x + 100, y: lastPoint.y });
      }
      return newPoints;
    }
    return points;
  };

  return {
    validatePoints,
    removeDuplicates,
    ensureMinimumPoints
  };
}

/**
 * Hook do generowania punktów krzywej dla wyświetlania
 */
export function useCurveGeneration(points, interpolationType = 'linear', steps = 100) {
  const interpolate = useInterpolation(points, interpolationType);

  const generatedPoints = useMemo(() => {
    if (!points || points.length < 2) return [];

    const sortedPoints = [...points].sort((a, b) => a.x - b.x);
    const minX = sortedPoints[0].x;
    const maxX = sortedPoints[sortedPoints.length - 1].x;
    const stepSize = (maxX - minX) / steps;

    const generated = [];
    for (let i = 0; i <= steps; i++) {
      const x = minX + i * stepSize;
      const y = interpolate(x);
      generated.push({ x, y });
    }

    return generated;
  }, [points, steps, interpolate]);

  return generatedPoints;
}