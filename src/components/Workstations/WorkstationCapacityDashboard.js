import React, { useState, useMemo, useEffect } from 'react';
import { Activity, ArrowLeft, Sun, Moon, Filter, TrendingUp, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useWorkstation } from '../../context/WorkstationContext';
import { useCatalog, STATUS_LABELS } from '../../context/CatalogContext';
import { useMaterial } from '../../context/MaterialContext';
import {
  calculateWorkstationUtilization,
  filterUtilizationData,
  sortUtilizationData
} from '../../utils/workstationCapacity';
import { getAllWorkstationAssignments } from '../../services/workstationAssignments';
import { calculateWorkstationUtilizationFromAssignments } from '../../utils/workstationCapacityFromAssignments';

// Helper funkcja do obliczania dostępnych godzin stanowiska (skopiowana z workstationCapacityFromAssignments.js)
function calculateAvailableHours(workstation) {
  const {
    shiftsPerDay = 1,
    hoursPerShift = 8,
    workDaysPerWeek = 5,
    holidaysPerYear = 10,
    efficiency = 0.85
  } = workstation;

  const workDaysPerYear = (52 * workDaysPerWeek) - holidaysPerYear;
  const availableHours = workDaysPerYear * shiftsPerDay * hoursPerShift * efficiency;

  return Math.round(availableHours);
}

/**
 * Dashboard zajętości stanowisk produkcyjnych
 */
export function WorkstationCapacityDashboard({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state: workstationState } = useWorkstation();
  const { state: catalogState, utils: catalogUtils, actions: catalogActions } = useCatalog();
  const { state: materialState, utils: materialUtils } = useMaterial();

  // Stan aktywnej zakładki
  const [activeTab, setActiveTab] = useState('simple'); // 'simple' | 'timeline' | 'materials'

  // Stan zakresu lat dla timeline
  const currentYear = new Date().getFullYear();
  const [timelineYearRange, setTimelineYearRange] = useState({
    from: currentYear,
    to: currentYear + 10
  });

  // Stan filtrów
  const [filters, setFilters] = useState({
    showOnlyOverloaded: false,
    workstationType: '',
    minUtilization: 0,
    maxUtilization: 200
  });

  // Stan sortowania
  const [sortBy, setSortBy] = useState('utilization');
  const [sortOrder, setSortOrder] = useState('desc');

  // Stan rozwinięć
  const [expandedWorkstations, setExpandedWorkstations] = useState({});

  // Stan widoczności stanowisk na wykresie Timeline (wszystkie domyślnie zaznaczone)
  const [visibleWorkstationsOnChart, setVisibleWorkstationsOnChart] = useState({});

  // Lokalna historia zaznaczonych kalkulacji (pozostaje dopóki użytkownik nie wyjdzie z dashboardu)
  const [localSelectedHistory, setLocalSelectedHistory] = useState([]);

  // Stan dla workstation assignments z Firestore
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // Załaduj assignments z Firestore (tylko przy montowaniu lub zmianie filtrów)
  useEffect(() => {
    async function loadAssignments() {
      setAssignmentsLoading(true);
      try {
        const result = await getAllWorkstationAssignments();
        if (result.success) {
          setAssignments(result.assignments);
          console.log(`✅ Załadowano ${result.assignments.length} przypisań z Firestore`);
        } else {
          console.error('❌ Błąd ładowania przypisań:', result.error);
          setAssignments([]);
        }
      } catch (error) {
        console.error('❌ Wyjątek podczas ładowania przypisań:', error);
        setAssignments([]);
      } finally {
        setAssignmentsLoading(false);
      }
    }

    loadAssignments();

    // USUNIĘTO auto-refresh - odświeża się tylko przy zmianie filtrów capacity
  }, [catalogState.capacityFilters]);

  // Aktualizuj lokalną historię gdy zmienia się customSelectedIds
  React.useEffect(() => {
    const currentIds = catalogState.capacityFilters.customSelectedIds || [];

    // Dodaj nowe ID do historii (zachowując kolejność dodawania)
    setLocalSelectedHistory(prev => {
      const newIds = currentIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [catalogState.capacityFilters.customSelectedIds]);

  // Funkcja do usunięcia kalkulacji z lokalnej historii
  const removeFromHistory = (calcId) => {
    setLocalSelectedHistory(prev => prev.filter(id => id !== calcId));
    // Jeśli kalkulacja jest jeszcze zaznaczona w globalnym stanie, odznacz ją
    if (catalogState.capacityFilters.customSelectedIds.includes(calcId)) {
      catalogActions.toggleCalculationForCapacity(calcId);
    }
  };

  // Oblicz wykorzystanie stanowisk z assignments (NOWA IMPLEMENTACJA)
  const utilizationData = useMemo(() => {
    try {
      if (!workstationState || !workstationState.workstations) {
        console.warn('workstationState or workstations is undefined');
        return {};
      }

      if (assignmentsLoading) {
        console.log('⏳ Assignments się ładują...');
        return {};
      }

      if (!assignments || assignments.length === 0) {
        console.log('📭 Brak assignments do przetworzenia');
        return {};
      }

      // Filtruj assignments według capacity filters
      // WAŻNE: Dashboard capacity porównuje TYLKO zapisane kalkulacje, NIE sesje!
      const filteredAssignments = assignments.filter(assignment => {
        const filters = catalogState.capacityFilters;

        // IGNORUJ sesje (bez calculationId) - dashboard jest tylko dla zapisanych kalkulacji
        if (!assignment.calculationId) {
          console.log(`⏭️ Pomijam sesję (brak calculationId):`, assignment.sessionId);
          return false;
        }

        // Sprawdź czy kalkulacja istnieje w katalogu
        const calculation = catalogState.calculations.find(c => c.id === assignment.calculationId);
        if (!calculation) {
          console.log(`⚠️ Kalkulacja ${assignment.calculationId} nie istnieje w katalogu - pomijam`);
          return false;
        }

        // NOWA LOGIKA: checkboxy są "on top" filtrów statusów
        // Jeśli kalkulacja jest w customSelectedIds i jest zaznaczona, wliczaj ją niezależnie od statusu
        const isCustomSelected = filters.customSelectedIds &&
                                 filters.customSelectedIds.length > 0 &&
                                 filters.customSelectedIds.includes(assignment.calculationId);

        if (isCustomSelected) {
          // Checkbox jest zaznaczony - wliczaj bez względu na status
          return true;
        }

        // Sprawdź status filters (tylko dla kalkulacji NIE zaznaczonych checkboxem)
        if (!filters.includeDraft && calculation.status === 'draft') return false;
        if (!filters.includeInProgress && calculation.status === 'in_progress') return false;
        if (!filters.includeSent && calculation.status === 'sent') return false;
        if (!filters.includeNominated && calculation.status === 'nominated') return false;
        if (!filters.includeNotNominated && calculation.status === 'not_nominated') return false;

        return true;
      });

      console.log(`📊 Przetwarzam ${filteredAssignments.length}/${assignments.length} przypisań (po filtrach)`);

      return calculateWorkstationUtilizationFromAssignments(filteredAssignments, workstationState.workstations);
    } catch (error) {
      console.error('Error calculating workstation utilization:', error);
      return {};
    }
  }, [assignments, assignmentsLoading, catalogState, workstationState]);

  // Zastosuj filtry
  const filteredData = useMemo(() => {
    return filterUtilizationData(utilizationData, filters);
  }, [utilizationData, filters]);

  // Sortuj dane
  const sortedData = useMemo(() => {
    return sortUtilizationData(filteredData, sortBy, sortOrder);
  }, [filteredData, sortBy, sortOrder]);

  // Pobierz unikalne typy stanowisk
  const workstationTypes = useMemo(() => {
    const types = new Set();
    workstationState.workstations.forEach(ws => types.add(ws.type));
    return Array.from(types);
  }, [workstationState.workstations]);

  // Przełącz rozwinięcie stanowiska
  const toggleWorkstation = (wsId) => {
    setExpandedWorkstations(prev => ({
      ...prev,
      [wsId]: !prev[wsId]
    }));
  };

  // Oblicz statystyki
  const stats = useMemo(() => {
    const totalWorkstations = workstationState.workstations.length;
    const overloadedCount = Object.values(utilizationData).filter(d => d.utilizationPercent > 100).length;
    const underutilizedCount = Object.values(utilizationData).filter(d => d.utilizationPercent < 50).length;
    const totalAvailableHours = Object.values(utilizationData).reduce((sum, d) => sum + d.availableHours, 0);
    const totalRequiredHours = Object.values(utilizationData).reduce((sum, d) => sum + d.totalRequiredHours, 0);
    const avgUtilization = totalAvailableHours > 0 ? (totalRequiredHours / totalAvailableHours) * 100 : 0;

    return {
      totalWorkstations,
      overloadedCount,
      underutilizedCount,
      avgUtilization,
      totalAvailableHours,
      totalRequiredHours
    };
  }, [utilizationData, workstationState.workstations]);

  // Oblicz dane timeline (wykorzystanie stanowisk rok po roku)
  const timelineData = useMemo(() => {
    try {
      if (!workstationState || !workstationState.workstations) {
        return { years: [], workstations: {}, financialData: {} };
      }

      if (assignmentsLoading || !assignments || assignments.length === 0) {
        return { years: [], workstations: {}, financialData: {} };
      }

      // Debug: Zaloguj wszystkie assignments i calculations
      console.log('🔍 Timeline Debug - Assignments:', {
        totalAssignments: assignments.length,
        firstThreeAssignments: assignments.slice(0, 3),
        capacityFilters: catalogState.capacityFilters,
        totalCalculations: catalogState.calculations.length,
        calculationsWithVolumeForecast: catalogState.calculations.filter(c =>
          c.items?.some(i => i.volumeForecast?.enabled)
        ).map(c => ({
          id: c.id,
          status: c.status,
          catalogName: c.catalogName,
          itemsWithForecast: c.items.filter(i => i.volumeForecast?.enabled).map(i => ({
            id: i.id,
            tabName: i.tabName,
            partId: i.partId,
            forecastYears: i.volumeForecast?.years ? Object.keys(i.volumeForecast.years) : [],
            forecastData: i.volumeForecast?.years || {}
          }))
        }))
      });

      // DEBUG: Znajdź kalkulację 251030-1677 i pokaż WSZYSTKIE jej items
      const calc251030 = catalogState.calculations.find(c => c.id === '251030-1677');
      if (calc251030) {
        console.log('🔍 DEBUG Kalkulacja 251030-1677 - WSZYSTKIE items:', {
          id: calc251030.id,
          totalItems: calc251030.items?.length || 0,
          allItems: calc251030.items?.map(i => ({
            id: i.id,
            partId: i.partId,
            tabName: i.tabName,
            hasVolumeForecast: !!i.volumeForecast,
            volumeForecastEnabled: i.volumeForecast?.enabled,
            forecastYears: i.volumeForecast?.years ? Object.keys(i.volumeForecast.years) : []
          }))
        });

        // Pokaż assignments dla tej kalkulacji
        const assignmentsFor251030 = assignments.filter(a => a.calculationId === '251030-1677');
        console.log('🔍 DEBUG Assignments dla 251030-1677:', {
          count: assignmentsFor251030.length,
          assignments: assignmentsFor251030.map(a => ({
            id: a.id,
            itemId: a.itemId,
            partId: a.partId,
            tabName: a.tabName,
            annualVolume: a.annualVolume,
            workstationsCount: a.workstations?.length || 0
          }))
        });
      } else {
        console.log('⚠️ Kalkulacja 251030-1677 NIE ZNALEZIONA w catalogState.calculations');
      }

      // Filtruj assignments według capacity filters + wymóg volumeForecast
      const filteredAssignments = assignments.filter((assignment, idx) => {
        const filters = catalogState.capacityFilters;

        // Debug każdy krok filtrowania dla pierwszych 5 assignmentów
        const shouldLog = idx < 5;

        if (shouldLog) console.log(`🔍 Assignment #${idx}:`, assignment);

        if (!assignment.calculationId) {
          if (shouldLog) console.log(`  ❌ Brak calculationId`);
          return false;
        }

        const calculation = catalogState.calculations.find(c => c.id === assignment.calculationId);
        if (!calculation) {
          // Nie loguj dla starych assignmentów - po prostu je ignoruj
          // To są stare assignments dla usuniętych kalkulacji
          return false;
        }

        if (shouldLog) console.log(`  ✅ Kalkulacja znaleziona:`, {
          id: calculation.id,
          status: calculation.status,
          itemsCount: calculation.items?.length
        });

        // Sprawdź czy item ma włączony volumeForecast - WYMAGANE dla Timeline
        const item = calculation.items?.find(i => i.id === assignment.itemId);
        if (!item) {
          if (shouldLog) console.log(`  ❌ Item ${assignment.itemId} nie znaleziony w kalkulacji`);
          return false;
        }

        if (shouldLog) console.log(`  ✅ Item znaleziony:`, {
          id: item.id,
          tabName: item.tabName,
          partId: item.partId,
          volumeForecastEnabled: item.volumeForecast?.enabled,
          volumeForecastYears: item.volumeForecast?.years ? Object.keys(item.volumeForecast.years) : [],
          volumeForecastData: item.volumeForecast?.years || {}
        });

        // NIE filtrujemy tutaj po volumeForecast - to zrobimy później przy obliczaniu danych per rok
        // Dzięki temu assignment przejdzie przez filtry tak samo jak w Podgląd

        // Teraz sprawdź filtry capacity (tak samo jak w simple view)
        const isCustomSelected = filters.customSelectedIds &&
                                 filters.customSelectedIds.length > 0 &&
                                 filters.customSelectedIds.includes(assignment.calculationId);

        if (shouldLog) console.log(`  🎯 Sprawdzam filtry capacity:`, {
          isCustomSelected,
          calculationStatus: calculation.status,
          includeDraft: filters.includeDraft,
          includeInProgress: filters.includeInProgress,
          includeSent: filters.includeSent,
          includeNominated: filters.includeNominated,
          includeNotNominated: filters.includeNotNominated
        });

        if (isCustomSelected) {
          if (shouldLog) console.log(`  ✅ Zaznaczony checkboxem - PASS`);
          return true;
        }

        if (!filters.includeDraft && calculation.status === 'draft') {
          if (shouldLog) console.log(`  ❌ Draft nie włączony`);
          return false;
        }
        if (!filters.includeInProgress && calculation.status === 'in_progress') {
          if (shouldLog) console.log(`  ❌ In Progress nie włączony`);
          return false;
        }
        if (!filters.includeSent && calculation.status === 'sent') {
          if (shouldLog) console.log(`  ❌ Sent nie włączony`);
          return false;
        }
        if (!filters.includeNominated && calculation.status === 'nominated') {
          if (shouldLog) console.log(`  ❌ Nominated nie włączony`);
          return false;
        }
        if (!filters.includeNotNominated && calculation.status === 'not_nominated') {
          if (shouldLog) console.log(`  ❌ Not Nominated nie włączony`);
          return false;
        }

        if (shouldLog) console.log(`  ✅ Wszystkie filtry PASS`);
        return true;
      });

      // Generuj lata w zakresie
      const years = [];
      for (let year = timelineYearRange.from; year <= timelineYearRange.to; year++) {
        years.push(year);
      }

      // Struktura: { workstationId: { year: { requiredHours, products: [] } } }
      const workstationsByYear = {};

      // Struktura dla danych finansowych per rok: { year: { revenue, revenueDAP, profit } }
      const financialDataByYear = {};

      // Inicjalizuj strukturę dla każdego stanowiska
      workstationState.workstations.forEach(ws => {
        workstationsByYear[ws.id] = {};
        years.forEach(year => {
          workstationsByYear[ws.id][year] = {
            requiredHours: 0,
            products: []
          };
        });
      });

      // Inicjalizuj strukturę finansową dla każdego roku
      years.forEach(year => {
        financialDataByYear[year] = {
          revenue: 0,        // Obrót EXW (volume * totalCost) - koszt produkcji
          revenueDAP: 0,     // Obrót DAP (volume * totalWithMargin) - cena sprzedaży z marżą
          profit: 0          // Przychód/Zysk (marża - transport) - to co nam zostaje
        };
      });

      // Przetwórz assignments i wyciągnij volumeForecast dla każdego roku
      filteredAssignments.forEach(assignment => {
        const calculation = catalogState.calculations.find(c => c.id === assignment.calculationId);
        if (!calculation) return;

        // Znajdź item w kalkulacji
        const item = calculation.items?.find(i => i.id === assignment.itemId);
        if (!item) return;

        // Sprawdź czy item ma volumeForecast
        if (!item.volumeForecast?.enabled || !item.volumeForecast?.years) {
          // Item nie ma volumeForecast - pomiń (nie można obliczyć danych per rok)
          return;
        }

        const forecastYears = item.volumeForecast.years;

        // WAŻNE: Assignment może mieć WIELE stanowisk, iteruj przez wszystkie
        if (!assignment.workstations || assignment.workstations.length === 0) {
          console.warn('Assignment bez workstations:', assignment.id);
          return;
        }

        assignment.workstations.forEach(ws => {
          const workstationId = ws.workstationId;
          const efficiency = parseFloat(ws.efficiency) || 1;

          if (!workstationId || efficiency <= 0) {
            console.warn('Nieprawidłowe dane workstation:', ws);
            return;
          }

          // Dla każdego roku w zakresie timeline
          years.forEach(year => {
            const volume = parseFloat(forecastYears[year]) || 0;

            if (volume > 0) {
              // Oblicz wymagane godziny: requiredHours = (volume / efficiency) * 8
              // efficiency to szt/8h, więc 8h powinno być w liczniku: (volume * 8) / efficiency
              const requiredHours = (volume * 8) / efficiency;

              if (workstationsByYear[workstationId] && workstationsByYear[workstationId][year]) {
                workstationsByYear[workstationId][year].requiredHours += requiredHours;
                workstationsByYear[workstationId][year].products.push({
                  calculationId: assignment.calculationId,
                  catalogName: calculation.catalogName || `Kalkulacja #${assignment.calculationId}`,
                  client: calculation.client,
                  tabName: item.tabName || 'N/A',
                  partId: item.partId || 'N/A',
                  volume: volume,
                  efficiency: efficiency,
                  requiredHours: requiredHours
                });
              }

              // Oblicz wartości finansowe (tylko raz per item per rok, nie per stanowisko)
              // Sprawdź czy już dodaliśmy dane finansowe dla tego item w tym roku
              if (ws === assignment.workstations[0]) { // Tylko dla pierwszego stanowiska żeby nie duplikować
                if (item.results) {
                  // Obrót EXW = cena sprzedaży bez transportu (z marżą i SG&A)
                  const exwPrice = parseFloat(item.results.totalWithSGA) || 0;

                  // Obrót DAP = cena sprzedaży z transportem (finalTotalCost = totalWithSGA + transport)
                  const dapPrice = parseFloat(item.results.finalTotalCost) || exwPrice;

                  // Koszt produkcji (bez marży, bez SG&A)
                  const productionCost = parseFloat(item.results.totalCost) || 0;

                  financialDataByYear[year].revenue += volume * exwPrice;
                  financialDataByYear[year].revenueDAP += volume * dapPrice;

                  // Przychód = zysk po odjęciu kosztów produkcji od ceny sprzedaży DAP
                  const profit = (dapPrice - productionCost) * volume;
                  financialDataByYear[year].profit += profit;
                } else {
                  console.warn(`⚠️ Item ${item.id} (${item.partId}) nie ma results - pomijam dane finansowe. Mode: ${item.mode}, Tab: ${item.tabName}`);
                }
              }
            }
          });
        });
      });

      // Oblicz utilization dla każdego stanowiska w każdym roku
      const workstationsData = {};
      workstationState.workstations.forEach(ws => {
        // Użyj funkcji calculateAvailableHours tak jak w Podglądzie
        const availableHoursPerYear = calculateAvailableHours(ws);

        workstationsData[ws.id] = {
          workstation: ws,
          annualCapacity: availableHoursPerYear, // Dodaj obliczoną capacity do danych
          years: {}
        };

        years.forEach(year => {
          const yearData = workstationsByYear[ws.id][year];
          const utilizationPercent = availableHoursPerYear > 0
            ? (yearData.requiredHours / availableHoursPerYear) * 100
            : 0;

          workstationsData[ws.id].years[year] = {
            requiredHours: yearData.requiredHours,
            availableHours: availableHoursPerYear,
            utilizationPercent: utilizationPercent,
            products: yearData.products
          };
        });
      });

      console.log('📅 Timeline data calculated:', {
        years,
        workstationsCount: Object.keys(workstationsData).length,
        filteredAssignmentsCount: filteredAssignments.length,
        sampleWorkstation: Object.values(workstationsData)[0]
      });

      return {
        years,
        workstations: workstationsData,
        financialData: financialDataByYear
      };
    } catch (error) {
      console.error('Error calculating timeline data:', error);
      return { years: [], workstations: {}, financialData: {} };
    }
  }, [assignments, assignmentsLoading, catalogState, workstationState, timelineYearRange]);

  // Oblicz zapotrzebowanie materiałowe (agregacja z assignments + volumeForecast)
  const materialConsumptionData = useMemo(() => {
    try {
      if (assignmentsLoading || !assignments || assignments.length === 0) {
        return { materials: {}, years: [] };
      }

      console.log('🧱 [MATERIALS] Start - obliczam zapotrzebowanie materiałowe');

      // Filtruj assignments tak samo jak w Timeline (używamy tych samych filtrów)
      const filteredAssignments = assignments.filter(assignment => {
        const filters = catalogState.capacityFilters;

        if (!assignment.calculationId) return false;

        const calculation = catalogState.calculations.find(c => c.id === assignment.calculationId);
        if (!calculation) return false;

        const isCustomSelected = filters.customSelectedIds &&
                                 filters.customSelectedIds.length > 0 &&
                                 filters.customSelectedIds.includes(assignment.calculationId);

        if (isCustomSelected) return true;

        if (!filters.includeDraft && calculation.status === 'draft') return false;
        if (!filters.includeInProgress && calculation.status === 'in_progress') return false;
        if (!filters.includeSent && calculation.status === 'sent') return false;
        if (!filters.includeNominated && calculation.status === 'nominated') return false;
        if (!filters.includeNotNominated && calculation.status === 'not_nominated') return false;

        return true;
      });

      console.log(`🧱 [MATERIALS] Przetwarzam ${filteredAssignments.length} assignments`);

      // Generuj lata w zakresie
      const years = [];
      for (let year = timelineYearRange.from; year <= timelineYearRange.to; year++) {
        years.push(year);
      }

      // Struktura: { materialKey: { displayName, materialType, thickness, surfaceWeight, color, years: { year: { total, Q1-Q4, totalM2 } } } }
      const materials = {};

      /**
       * Funkcja pomocnicza do identyfikacji materiału na podstawie item i mode
       * Zwraca tablicę materiałów (bo może być wiele warstw w multilayer)
       */
      const identifyMaterials = (item) => {
        const mode = item.mode;
        const materialsFound = [];

        if (mode === 'surface') {
          // SURFACE mode: tabName jako nazwa materiału
          const tabName = item.tabName || 'Unknown';

          // Próbujemy znaleźć composition po nazwie tabName (sprawdzamy czy tabName to displayName kompozycji)
          const allCompositions = materialUtils.getAllCompositionsWithDetails(materialState);
          const matchingComp = allCompositions.find(comp => comp.displayName === tabName);

          if (matchingComp) {
            // Znaleziono composition - używamy dokładnych danych
            const materialKey = `${matchingComp.materialType.name}-${matchingComp.thickness}mm-${Math.round(matchingComp.surfaceWeight)}g/m²`;
            materialsFound.push({
              key: materialKey,
              displayName: materialKey,
              materialType: matchingComp.materialType.name,
              thickness: matchingComp.thickness,
              surfaceWeight: matchingComp.surfaceWeight, // g/m²
              color: matchingComp.materialType.color || '#808080',
              // Dane do obliczenia zużycia
              surfaceNetto: parseFloat(item.surfaceNetto) || 0, // m²
              surfaceBrutto: parseFloat(item.surfaceBrutto) || 0 // m²
            });
          } else {
            // Nie znaleziono composition - używamy tabName jako fallback
            console.warn(`⚠️ [MATERIALS] Nie znaleziono composition dla tabName="${tabName}" - pomijam`);
            // Nie dodajemy materiału jeśli nie znamy jego parametrów
          }

        } else if (mode === 'multilayer' && item.multilayer && item.multilayer.layers) {
          // MULTILAYER mode: każda warstwa osobno
          item.multilayer.layers.forEach((layer, layerIdx) => {
            if (!layer.materialType || !layer.thickness || !layer.surfaceWeight) {
              console.warn(`⚠️ [MATERIALS] Warstwa ${layerIdx + 1} w multilayer nie ma wymaganych danych - pomijam`);
              return;
            }

            const materialKey = `${layer.materialType}-${layer.thickness}mm-${Math.round(layer.surfaceWeight)}g/m²`;

            // Znajdź kolor z materialState
            const materialType = materialState.materialTypes.find(mt => mt.name === layer.materialType);
            const color = materialType?.color || '#808080';

            materialsFound.push({
              key: materialKey,
              displayName: materialKey,
              materialType: layer.materialType,
              thickness: parseFloat(layer.thickness),
              surfaceWeight: parseFloat(layer.surfaceWeight), // g/m²
              color: color,
              // Dane do obliczenia zużycia
              surfaceNetto: parseFloat(layer.surfaceNetto) || 0,
              surfaceBrutto: parseFloat(layer.surfaceBrutto) || 0
            });
          });

        } else if (mode === 'heatshield' && item.heatshield) {
          // HEATSHIELD mode: blacha + mata osobno
          const hs = item.heatshield;

          // Blacha (sheet)
          if (hs.sheetMaterial && hs.sheetThickness && hs.sheetSurfaceWeight) {
            const sheetKey = `${hs.sheetMaterial}-${hs.sheetThickness}mm-${Math.round(hs.sheetSurfaceWeight)}g/m²`;
            const sheetMaterialType = materialState.materialTypes.find(mt => mt.name === hs.sheetMaterial);

            materialsFound.push({
              key: sheetKey,
              displayName: sheetKey,
              materialType: hs.sheetMaterial,
              thickness: parseFloat(hs.sheetThickness),
              surfaceWeight: parseFloat(hs.sheetSurfaceWeight),
              color: sheetMaterialType?.color || '#808080',
              surfaceNetto: parseFloat(hs.surfaceNetto) || 0,
              surfaceBrutto: parseFloat(hs.surfaceBrutto) || 0
            });
          }

          // Mata (mat)
          if (hs.matMaterial && hs.matThickness && hs.matSurfaceWeight) {
            const matKey = `${hs.matMaterial}-${hs.matThickness}mm-${Math.round(hs.matSurfaceWeight)}g/m²`;
            const matMaterialType = materialState.materialTypes.find(mt => mt.name === hs.matMaterial);

            materialsFound.push({
              key: matKey,
              displayName: matKey,
              materialType: hs.matMaterial,
              thickness: parseFloat(hs.matThickness),
              surfaceWeight: parseFloat(hs.matSurfaceWeight),
              color: matMaterialType?.color || '#808080',
              surfaceNetto: parseFloat(hs.surfaceNetto) || 0,
              surfaceBrutto: parseFloat(hs.surfaceBrutto) || 0
            });
          }
        }
        // Mode 'weight' i 'volume' - pomijamy (brak danych materiałowych)

        return materialsFound;
      };

      // Przetwórz assignments i wyciągnij materiały + volumeForecast
      filteredAssignments.forEach(assignment => {
        const calculation = catalogState.calculations.find(c => c.id === assignment.calculationId);
        if (!calculation) return;

        const item = calculation.items?.find(i => i.id === assignment.itemId);
        if (!item) return;

        // Sprawdź czy item ma volumeForecast
        if (!item.volumeForecast?.enabled || !item.volumeForecast?.years) {
          return; // Pomijamy items bez volumeForecast (tak samo jak w Timeline)
        }

        const forecastYears = item.volumeForecast.years;

        // Identyfikuj materiały w tym item
        const itemMaterials = identifyMaterials(item);

        if (itemMaterials.length === 0) {
          console.log(`⚠️ [MATERIALS] Brak materiałów w item ${item.partId} (mode: ${item.mode})`);
          return;
        }

        // Dla każdego materiału
        itemMaterials.forEach(mat => {
          // Inicjalizuj strukturę materiału jeśli nie istnieje
          if (!materials[mat.key]) {
            materials[mat.key] = {
              displayName: mat.displayName,
              materialType: mat.materialType,
              thickness: mat.thickness,
              surfaceWeight: mat.surfaceWeight,
              color: mat.color,
              years: {}
            };

            // Inicjalizuj lata
            years.forEach(year => {
              materials[mat.key].years[year] = {
                total: 0, // kg
                Q1: 0, Q2: 0, Q3: 0, Q4: 0,
                totalM2: 0 // m²
              };
            });
          }

          // Dla każdego roku w volumeForecast
          years.forEach(year => {
            const volume = parseFloat(forecastYears[year]) || 0;
            if (volume <= 0) return;

            // Oblicz zużycie materiału
            // Używamy surfaceBrutto (faktyczne zużycie z odpaddami)
            const surfaceBrutto = mat.surfaceBrutto; // m² per szt
            const totalSurfaceM2 = surfaceBrutto * volume; // m² rocznie

            // Przelicz na kg: kg = m² * (g/m² / 1000)
            const totalWeightKg = totalSurfaceM2 * (mat.surfaceWeight / 1000);

            // Dodaj do roku
            materials[mat.key].years[year].total += totalWeightKg;
            materials[mat.key].years[year].totalM2 += totalSurfaceM2;

            // Rozłóż równomiernie na kwartały
            const quarterWeight = totalWeightKg / 4;
            materials[mat.key].years[year].Q1 += quarterWeight;
            materials[mat.key].years[year].Q2 += quarterWeight;
            materials[mat.key].years[year].Q3 += quarterWeight;
            materials[mat.key].years[year].Q4 += quarterWeight;
          });
        });
      });

      console.log(`🧱 [MATERIALS] Znaleziono ${Object.keys(materials).length} unikalnych materiałów`);
      console.log(`🧱 [MATERIALS] Materiały:`, Object.keys(materials));

      return { materials, years };
    } catch (error) {
      console.error('Error calculating material consumption:', error);
      return { materials: {}, years: [] };
    }
  }, [assignments, assignmentsLoading, catalogState, materialState, timelineYearRange, materialUtils]);

  // Przygotuj dane dla wykresu Recharts + inicjalizuj widoczność stanowisk
  const chartData = useMemo(() => {
    // Filtruj tylko stanowiska z danymi
    const workstationsWithData = Object.values(timelineData.workstations).filter(wsData => {
      return Object.values(wsData.years || {}).some(yearData =>
        yearData.products && yearData.products.length > 0
      );
    });

    // Inicjalizuj widoczność (wszystkie domyślnie zaznaczone)
    const initialVisibility = {};
    workstationsWithData.forEach(wsData => {
      if (visibleWorkstationsOnChart[wsData.workstation.id] === undefined) {
        initialVisibility[wsData.workstation.id] = true;
      }
    });
    if (Object.keys(initialVisibility).length > 0) {
      setVisibleWorkstationsOnChart(prev => ({ ...prev, ...initialVisibility }));
    }

    // Przekształć dane do formatu Recharts: [{ year: 2025, 'Stanowisko 1': 45.2, 'Stanowisko 2': 78.3, ... }, ...]
    const chartDataArray = timelineData.years.map(year => {
      const dataPoint = { year };
      workstationsWithData.forEach(wsData => {
        const yearData = wsData.years?.[year];
        if (yearData) {
          dataPoint[wsData.workstation.name] = yearData.utilizationPercent;
        }
      });
      return dataPoint;
    });

    return {
      data: chartDataArray,
      workstations: workstationsWithData
    };
  }, [timelineData, visibleWorkstationsOnChart]);

  // Funkcja do uzyskania koloru dla % wykorzystania
  const getUtilizationColor = (percent) => {
    if (percent > 100) return darkMode ? 'text-red-400' : 'text-red-600';
    if (percent > 80) return darkMode ? 'text-yellow-400' : 'text-yellow-600';
    if (percent < 50) return darkMode ? 'text-blue-400' : 'text-blue-600';
    return darkMode ? 'text-green-400' : 'text-green-600';
  };

  const getUtilizationBgColor = (percent) => {
    if (percent > 100) return darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
    if (percent > 80) return darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
    if (percent < 50) return darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200';
    return darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
  };

  return (
    <div className={`${themeClasses.background} min-h-screen`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Dashboard zajętości stanowisk
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Analiza wykorzystania capacity stanowisk produkcyjnych
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2`}
              >
                <ArrowLeft size={16} />
                Powrót
              </button>

              <button
                onClick={onToggleDarkMode}
                className={`p-2 rounded-lg ${themeClasses.button.secondary}`}
                title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Wszystkie stanowiska</p>
                <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>{stats.totalWorkstations}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Przeciążone (>100%)</p>
                <p className={`text-2xl font-bold text-red-600 dark:text-red-400`}>{stats.overloadedCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Niewykorzystane (&lt;50%)</p>
                <p className={`text-2xl font-bold text-blue-600 dark:text-blue-400`}>{stats.underutilizedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className={`${themeClasses.card} rounded-lg border p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${themeClasses.text.secondary}`}>Średnie wykorzystanie</p>
                <p className={`text-2xl font-bold ${getUtilizationColor(stats.avgUtilization)}`}>
                  {stats.avgUtilization.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('simple')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'simple'
                  ? 'bg-blue-600 text-white shadow-md'
                  : themeClasses.button.secondary
              }`}
            >
              📊 Podgląd
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'bg-blue-600 text-white shadow-md'
                  : themeClasses.button.secondary
              }`}
            >
              📅 Timeline
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'materials'
                  ? 'bg-blue-600 text-white shadow-md'
                  : themeClasses.button.secondary
              }`}
            >
              🧱 Materiały
            </button>
          </div>
        </div>

        {/* Filtry kalkulacji dla capacity - wspólne dla obu widoków */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${themeClasses.text.primary}`}>Które kalkulacje wliczyć do capacity?</h3>
          </div>

          <div className="space-y-3">
            <p className={`text-sm ${themeClasses.text.secondary}`}>
              Wybierz według statusu lub zaznacz ręcznie w katalogu:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => catalogActions.setCapacityFilters({ includeDraft: !catalogState.capacityFilters.includeDraft })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeDraft
                    ? 'bg-gray-600 hover:bg-gray-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Szkice
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeInProgress: !catalogState.capacityFilters.includeInProgress })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeInProgress
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                W trakcie
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeSent: !catalogState.capacityFilters.includeSent })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeSent
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Wysłane
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeNominated: !catalogState.capacityFilters.includeNominated })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeNominated
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Nominacja ✓
              </button>

              <button
                onClick={() => catalogActions.setCapacityFilters({ includeNotNominated: !catalogState.capacityFilters.includeNotNominated })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  catalogState.capacityFilters.includeNotNominated
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 opacity-60'
                }`}
              >
                Brak nominacji
              </button>
            </div>

            {localSelectedHistory.length > 0 && (
              <div className={`mt-3 p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${themeClasses.text.primary}`}>
                    Kalkulacje do porównania ({localSelectedHistory.length})
                  </p>
                  <p className={`text-xs ${themeClasses.text.secondary}`}>
                    Zaznaczone wliczane do capacity: {catalogState.capacityFilters.customSelectedIds.length}
                  </p>
                </div>
                <div className="space-y-2">
                  {localSelectedHistory.map(calcId => {
                    const calculation = catalogState.calculations.find(c => c.id === calcId);
                    if (!calculation) return null;

                    const isActive = catalogState.capacityFilters.customSelectedIds.includes(calcId);

                    return (
                      <div
                        key={calcId}
                        className={`flex items-center justify-between p-2 rounded ${
                          isActive
                            ? (darkMode ? 'bg-gray-800/50' : 'bg-white')
                            : (darkMode ? 'bg-gray-900/30 opacity-60' : 'bg-gray-100 opacity-60')
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => catalogActions.toggleCalculationForCapacity(calcId)}
                            className="rounded cursor-pointer"
                            title={isActive ? "Odznacz - przestanie być wliczana do capacity" : "Zaznacz - będzie wliczana do capacity"}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${themeClasses.text.primary}`}>
                                #{calcId}
                              </span>
                              {calculation.client && (
                                <span className={`text-sm ${themeClasses.text.secondary}`}>
                                  - {calculation.client}
                                </span>
                              )}
                              {calculation.status && (
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  calculation.status === 'nominated'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : calculation.status === 'sent'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : calculation.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {STATUS_LABELS[calculation.status]}
                                </span>
                              )}
                              {!isActive && (
                                <span className={`text-xs italic ${themeClasses.text.secondary}`}>
                                  (nie wliczana)
                                </span>
                              )}
                            </div>
                            {calculation.items && calculation.items.length > 0 && (
                              <div className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                                {calculation.items.length} {calculation.items.length === 1 ? 'zakładka' : 'zakładek'}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromHistory(calcId)}
                          className={`p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400`}
                          title="Usuń całkowicie z listy porównania"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conditional rendering based on active tab */}
        {activeTab === 'simple' ? (
          <>
            {/* Filtry stanowisk i sortowanie */}
        <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${themeClasses.text.primary}`}>Filtry stanowisk i sortowanie</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Typ stanowiska */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>Typ stanowiska</label>
              <select
                value={filters.workstationType}
                onChange={(e) => setFilters({ ...filters, workstationType: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
              >
                <option value="">Wszystkie</option>
                {workstationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Wykorzystanie min */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>
                Wykorzystanie min (%)
              </label>
              <input
                type="number"
                value={filters.minUtilization}
                onChange={(e) => setFilters({ ...filters, minUtilization: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                max="200"
                step="10"
              />
            </div>

            {/* Wykorzystanie max */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>
                Wykorzystanie max (%)
              </label>
              <input
                type="number"
                value={filters.maxUtilization}
                onChange={(e) => setFilters({ ...filters, maxUtilization: parseFloat(e.target.value) || 200 })}
                className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                min="0"
                max="200"
                step="10"
              />
            </div>

            {/* Sortowanie */}
            <div>
              <label className={`block text-sm mb-1 ${themeClasses.text.secondary}`}>Sortuj według</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                >
                  <option value="name">Nazwa</option>
                  <option value="utilization">Wykorzystanie</option>
                  <option value="available">Dostępna</option>
                  <option value="required">Wymagana</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`px-3 py-2 border rounded-lg ${themeClasses.button.secondary}`}
                  title={sortOrder === 'asc' ? 'Rosnąco' : 'Malejąco'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Tylko przeciążone */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showOnlyOverloaded}
                onChange={(e) => setFilters({ ...filters, showOnlyOverloaded: e.target.checked })}
                className="rounded"
              />
              <span className={`text-sm ${themeClasses.text.secondary}`}>
                Pokaż tylko przeciążone stanowiska (>100%)
              </span>
            </label>
          </div>
        </div>

        {/* Lista stanowisk */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
            Stanowiska ({sortedData.length})
          </h3>

          {sortedData.length === 0 ? (
            <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
              <p className={themeClasses.text.secondary}>
                Brak stanowisk spełniających kryteria filtrowania
              </p>
            </div>
          ) : (
            sortedData.map((data) => {
              const ws = data.workstation;
              const isExpanded = expandedWorkstations[ws.id];

              return (
                <div
                  key={ws.id}
                  className={`rounded-lg border p-4 ${getUtilizationBgColor(data.utilizationPercent)}`}
                >
                  {/* Header stanowiska */}
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleWorkstation(ws.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold text-lg ${themeClasses.text.primary}`}>
                            {ws.name}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${themeClasses.text.secondary}`}>
                            {ws.type}
                          </span>
                        </div>

                        {/* Parametry stanowiska */}
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className={themeClasses.text.secondary}>Dostępna:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {data.availableHours.toLocaleString('pl-PL')} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wymagana:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {data.totalRequiredHours.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wolna:</span>
                            <div className={`font-mono ${themeClasses.text.primary}`}>
                              {Math.max(0, data.availableHours - data.totalRequiredHours).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} h/rok
                            </div>
                          </div>
                          <div>
                            <span className={themeClasses.text.secondary}>Wykorzystanie:</span>
                            <div className={`font-mono font-semibold ${getUtilizationColor(data.utilizationPercent)}`}>
                              {data.utilizationPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {/* Pasek postępu */}
                        <div className="mt-3">
                          <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className={`h-full transition-all ${
                                data.utilizationPercent > 100
                                  ? 'bg-red-600'
                                  : data.utilizationPercent > 80
                                  ? 'bg-yellow-600'
                                  : data.utilizationPercent < 50
                                  ? 'bg-blue-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(100, data.utilizationPercent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="ml-4">
                        <button className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}>
                          {isExpanded ? '▼' : '►'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista produktów */}
                  {isExpanded && data.products.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                        Przypisane produkty ({data.products.length})
                      </h5>
                      <div className="space-y-1">
                        {data.products.map((product, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded text-sm ${darkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}
                          >
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Kalkulacja:</span>
                                <div className={themeClasses.text.primary}>{product.catalogName}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Zakładka:</span>
                                <div className={themeClasses.text.primary}>{product.tabName}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Part ID:</span>
                                <div className={themeClasses.text.primary}>{product.partId}</div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Ilość/Wydajność:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>
                                  {product.annualVolume.toLocaleString('pl-PL')} / {product.efficiency} szt/8h
                                </div>
                              </div>
                              <div>
                                <span className={`${themeClasses.text.secondary} text-xs`}>Wymagane h:</span>
                                <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                                  {product.requiredHours.toFixed(0)} h/rok
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
          </>
        ) : (
          /* Timeline View */
          <>
            {/* Year Range Selector */}
            <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
              <h3 className={`font-semibold ${themeClasses.text.primary} mb-3`}>Zakres lat</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className={`text-sm ${themeClasses.text.secondary}`}>Od:</label>
                  <input
                    type="number"
                    value={timelineYearRange.from}
                    onChange={(e) => setTimelineYearRange(prev => ({ ...prev, from: parseInt(e.target.value) || prev.from }))}
                    className={`w-24 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-sm ${themeClasses.text.secondary}`}>Do:</label>
                  <input
                    type="number"
                    value={timelineYearRange.to}
                    onChange={(e) => setTimelineYearRange(prev => ({ ...prev, to: parseInt(e.target.value) || prev.to }))}
                    className={`w-24 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className={`text-sm ${themeClasses.text.secondary}`}>
                  ({timelineYearRange.to - timelineYearRange.from + 1} lat)
                </div>
              </div>
            </div>

            {/* Chart with Legend */}
            {timelineData.years.length === 0 ? (
              <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
                <p className={themeClasses.text.secondary}>
                  Brak danych timeline. Upewnij się że:
                </p>
                <ul className={`mt-4 text-sm ${themeClasses.text.secondary} space-y-1`}>
                  <li>• Kalkulacje zostały zaznaczone w filtrach capacity</li>
                  <li>• Elementy w kalkulacjach mają włączony "Kalendarz prognoz wolumenu"</li>
                  <li>• Prognozy zawierają dane dla wybranego zakresu lat</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Karty finansowe - podsumowanie */}
                {timelineData.financialData && Object.keys(timelineData.financialData).length > 0 && (() => {
                  // Oblicz sumy ze wszystkich lat
                  const totalRevenue = Object.values(timelineData.financialData).reduce((sum, year) => sum + year.revenue, 0);
                  const totalRevenueDAP = Object.values(timelineData.financialData).reduce((sum, year) => sum + year.revenueDAP, 0);
                  const totalProfit = Object.values(timelineData.financialData).reduce((sum, year) => sum + year.profit, 0);

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className={`${themeClasses.card} rounded-lg border p-4`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm ${themeClasses.text.secondary}`}>📊 Obrót (EXW)</p>
                            <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                              €{totalRevenue.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                              Suma lat {timelineYearRange.from}-{timelineYearRange.to}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`${themeClasses.card} rounded-lg border p-4`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm ${themeClasses.text.secondary}`}>💰 Obrót DAP</p>
                            <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                              €{totalRevenueDAP.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                              Suma lat {timelineYearRange.from}-{timelineYearRange.to}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`${themeClasses.card} rounded-lg border p-4`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm ${themeClasses.text.secondary}`}>💚 Przychód</p>
                            <p className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                              €{totalProfit.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
                            </p>
                            <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                              Suma lat {timelineYearRange.from}-{timelineYearRange.to}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Wykres finansowy */}
                {timelineData.financialData && Object.keys(timelineData.financialData).length > 0 && (() => {
                  // Przygotuj dane dla wykresu finansowego
                  const financialChartData = timelineData.years.map(year => ({
                    year,
                    'Obrót EXW': (timelineData.financialData[year]?.revenue || 0) / 1000, // w tysiącach €
                    'Obrót DAP': (timelineData.financialData[year]?.revenueDAP || 0) / 1000,
                    'Przychód': (timelineData.financialData[year]?.profit || 0) / 1000
                  }));

                  return (
                    <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
                      <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>
                        Wykres finansowy (w tys. €)
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={financialChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                          <XAxis
                            dataKey="year"
                            stroke={darkMode ? '#9ca3af' : '#6b7280'}
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            label={{ value: 'Wartość (tys. €)', angle: -90, position: 'insideLeft' }}
                            stroke={darkMode ? '#9ca3af' : '#6b7280'}
                            style={{ fontSize: '12px' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: darkMode ? '#f3f4f6' : '#111827'
                            }}
                            formatter={(value) => `€${Number(value).toLocaleString('pl-PL', { maximumFractionDigits: 0 })}k`}
                          />
                          <Line type="monotone" dataKey="Obrót EXW" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Obrót DAP" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="Przychód" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* Recharts Line Chart + Legend */}
                {chartData.workstations.length > 0 && (
                  <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
                    <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>
                      Wykres wykorzystania capacity ({chartData.workstations.length} stanowisk)
                    </h3>

                    <div className="flex gap-6">
                      {/* Wykres */}
                      <div className="flex-1" style={{ minHeight: '400px' }}>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={chartData.data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                            <XAxis
                              dataKey="year"
                              stroke={darkMode ? '#9ca3af' : '#6b7280'}
                              style={{ fontSize: '12px' }}
                            />
                            <YAxis
                              label={{ value: 'Wykorzystanie (%)', angle: -90, position: 'insideLeft' }}
                              stroke={darkMode ? '#9ca3af' : '#6b7280'}
                              style={{ fontSize: '12px' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                                border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                color: darkMode ? '#f3f4f6' : '#111827'
                              }}
                              formatter={(value) => `${Number(value).toFixed(1)}%`}
                            />
                            {chartData.workstations.map((wsData, index) => {
                              const isVisible = visibleWorkstationsOnChart[wsData.workstation.id] !== false;
                              if (!isVisible) return null;

                              // Generuj unikalny kolor dla każdego stanowiska
                              const colors = [
                                '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                                '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                              ];
                              const color = colors[index % colors.length];

                              return (
                                <Line
                                  key={wsData.workstation.id}
                                  type="monotone"
                                  dataKey={wsData.workstation.name}
                                  stroke={color}
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                  activeDot={{ r: 6 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legenda z checkboxami */}
                      <div className="w-64 border-l pl-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h4 className={`text-sm font-semibold ${themeClasses.text.primary} mb-3`}>
                          Stanowiska
                        </h4>
                        <div className="space-y-2">
                          {chartData.workstations.map((wsData, index) => {
                            const colors = [
                              '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                              '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
                            ];
                            const color = colors[index % colors.length];
                            const isVisible = visibleWorkstationsOnChart[wsData.workstation.id] !== false;

                            return (
                              <label
                                key={wsData.workstation.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isVisible}
                                  onChange={() => {
                                    setVisibleWorkstationsOnChart(prev => ({
                                      ...prev,
                                      [wsData.workstation.id]: !isVisible
                                    }));
                                  }}
                                  className="rounded"
                                />
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: color }}
                                />
                                <span className={`text-sm ${themeClasses.text.primary}`}>
                                  {wsData.workstation.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Szczegółowe karty stanowisk */}
                {(() => {
                  const workstationsWithData = Object.values(timelineData.workstations)
                    .filter(wsData => {
                      // Pokaż tylko stanowiska które mają jakiekolwiek produkty w jakimkolwiek roku
                      return Object.values(wsData.years || {}).some(yearData =>
                        yearData.products && yearData.products.length > 0
                      );
                    });

                  return (
                    <>
                      <h3 className={`text-lg font-semibold ${themeClasses.text.primary}`}>
                        Szczegółowe dane stanowisk ({workstationsWithData.length} stanowisk z danymi)
                      </h3>

                      {workstationsWithData.length === 0 ? (
                        <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
                          <p className={themeClasses.text.secondary}>
                            Brak stanowisk z danymi volumeForecast dla wybranego zakresu lat i filtrów capacity.
                          </p>
                        </div>
                      ) : (
                        workstationsWithData.map(wsData => {
                  const ws = wsData?.workstation;
                  if (!ws) return null;

                  const isExpanded = expandedWorkstations[ws.id];

                  return (
                    <div
                      key={ws.id}
                      className={`${themeClasses.card} rounded-lg border p-4`}
                    >
                      {/* Header stanowiska */}
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleWorkstation(ws.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-lg ${themeClasses.text.primary}`}>
                              {ws.name}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${themeClasses.text.secondary}`}>
                              {ws.type}
                            </span>
                            <span className={`text-sm ${themeClasses.text.secondary}`}>
                              Capacity: {(wsData.annualCapacity || 0).toLocaleString()} h/rok
                            </span>
                          </div>
                          <button className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700`}>
                            {isExpanded ? '▼' : '►'}
                          </button>
                        </div>

                        {/* Timeline bars */}
                        <div className="space-y-2">
                          {timelineData.years.map(year => {
                            const yearData = wsData.years?.[year];
                            if (!yearData) return null;

                            const utilization = yearData.utilizationPercent;

                            return (
                              <div key={year} className="grid grid-cols-12 gap-2 items-center">
                                <div className={`col-span-1 text-right text-sm font-medium ${themeClasses.text.primary}`}>
                                  {year}
                                </div>
                                <div className="col-span-11">
                                  <div className={`h-8 rounded overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} relative`}>
                                    <div
                                      className={`h-full transition-all ${
                                        utilization > 100
                                          ? 'bg-red-600'
                                          : utilization > 80
                                          ? 'bg-yellow-600'
                                          : utilization < 50
                                          ? 'bg-blue-600'
                                          : 'bg-green-600'
                                      }`}
                                      style={{ width: `${Math.min(100, utilization)}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center px-2">
                                      <span className={`text-xs font-medium ${utilization > 50 ? 'text-white' : themeClasses.text.primary}`}>
                                        {yearData.requiredHours.toFixed(0)} h ({utilization.toFixed(1)}%)
                                        {yearData.products.length > 0 && ` - ${yearData.products.length} produktów`}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Szczegóły produktów per rok */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-300 dark:border-gray-700">
                          <h5 className={`text-sm font-semibold ${themeClasses.text.primary}`}>
                            Szczegóły produktów per rok
                          </h5>
                          {timelineData.years.map(year => {
                            const yearData = wsData.years[year];
                            if (yearData.products.length === 0) return null;

                            return (
                              <div key={year} className={`p-3 rounded ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                                <div className={`font-medium text-sm ${themeClasses.text.primary} mb-2`}>
                                  {year} - {yearData.products.length} produktów
                                </div>
                                <div className="space-y-1">
                                  {yearData.products.map((product, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-white'}`}
                                    >
                                      <div className="grid grid-cols-5 gap-2">
                                        <div>
                                          <span className={themeClasses.text.secondary}>Kalkulacja:</span>
                                          <div className={themeClasses.text.primary}>{product.catalogName}</div>
                                        </div>
                                        <div>
                                          <span className={themeClasses.text.secondary}>Zakładka:</span>
                                          <div className={themeClasses.text.primary}>{product.tabName}</div>
                                        </div>
                                        <div>
                                          <span className={themeClasses.text.secondary}>Part ID:</span>
                                          <div className={themeClasses.text.primary}>{product.partId}</div>
                                        </div>
                                        <div>
                                          <span className={themeClasses.text.secondary}>Wolumen:</span>
                                          <div className={`font-mono ${themeClasses.text.primary}`}>
                                            {product.volume.toLocaleString()} szt
                                          </div>
                                        </div>
                                        <div>
                                          <span className={themeClasses.text.secondary}>Wymagane h:</span>
                                          <div className={`font-mono font-semibold ${themeClasses.text.primary}`}>
                                            {product.requiredHours.toFixed(0)} h
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                        })
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </>
        ) : activeTab === 'materials' ? (
          /* Materials View */
          <>
            {/* Year Range Selector - used same state as Timeline */}
            <div className={`${themeClasses.card} rounded-lg border p-4 mb-6`}>
              <h3 className={`font-semibold ${themeClasses.text.primary} mb-3`}>Zakres lat</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className={`text-sm ${themeClasses.text.secondary}`}>Od:</label>
                  <input
                    type="number"
                    value={timelineYearRange.from}
                    onChange={(e) => setTimelineYearRange(prev => ({ ...prev, from: parseInt(e.target.value) || prev.from }))}
                    className={`w-24 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-sm ${themeClasses.text.secondary}`}>Do:</label>
                  <input
                    type="number"
                    value={timelineYearRange.to}
                    onChange={(e) => setTimelineYearRange(prev => ({ ...prev, to: parseInt(e.target.value) || prev.to }))}
                    className={`w-24 px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className={`text-sm ${themeClasses.text.secondary}`}>
                  ({timelineYearRange.to - timelineYearRange.from + 1} lat)
                </div>
              </div>
            </div>

            {Object.keys(materialConsumptionData.materials).length === 0 ? (
              <div className={`${themeClasses.card} rounded-lg border p-8 text-center`}>
                <p className={themeClasses.text.secondary}>
                  Brak danych o materiałach. Upewnij się że:
                </p>
                <ul className={`mt-4 text-sm ${themeClasses.text.secondary} space-y-1`}>
                  <li>• Kalkulacje zostały zaznaczone w filtrach capacity</li>
                  <li>• Elementy w kalkulacjach mają włączony "Kalendarz prognoz wolumenu"</li>
                  <li>• Elementy używają trybu z danymi materiałowymi (surface, multilayer, heatshield)</li>
                </ul>
              </div>
            ) : (() => {
              // Sortuj materiały: grupuj po materialType, potem według thickness (rosnąco)
              const sortedMaterials = Object.entries(materialConsumptionData.materials).sort((a, b) => {
                const [keyA, matA] = a;
                const [keyB, matB] = b;

                // Najpierw porównaj typ materiału (alfabetycznie)
                if (matA.materialType !== matB.materialType) {
                  return matA.materialType.localeCompare(matB.materialType);
                }

                // Potem porównaj grubość (rosnąco)
                return matA.thickness - matB.thickness;
              });

              // Oblicz sumy dla całego zakresu lat
              const grandTotals = {
                kg: 0,
                m2: 0
              };

              sortedMaterials.forEach(([key, mat]) => {
                materialConsumptionData.years.forEach(year => {
                  grandTotals.kg += mat.years[year]?.total || 0;
                  grandTotals.m2 += mat.years[year]?.totalM2 || 0;
                });
              });

              return (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`${themeClasses.card} rounded-lg border p-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm ${themeClasses.text.secondary}`}>🧱 Liczba materiałów</p>
                          <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                            {sortedMaterials.length}
                          </p>
                          <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                            Dla zakresu lat {timelineYearRange.from}-{timelineYearRange.to}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`${themeClasses.card} rounded-lg border p-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm ${themeClasses.text.secondary}`}>📦 Całkowite zapotrzebowanie</p>
                          <p className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                            {Math.round(grandTotals.kg).toLocaleString('pl-PL')} kg
                          </p>
                          <p className={`text-xs ${themeClasses.text.secondary} mt-1`}>
                            ({Math.round(grandTotals.m2).toLocaleString('pl-PL')} m²) - lata {timelineYearRange.from}-{timelineYearRange.to}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Materials Table */}
                  <div className={`${themeClasses.card} rounded-lg border p-6 mb-6 overflow-x-auto`}>
                    <h3 className={`text-lg font-semibold ${themeClasses.text.primary} mb-4`}>
                      Zapotrzebowanie materiałowe per rok
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b-2 ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                            <th className={`text-left py-3 px-2 ${themeClasses.text.primary} font-semibold`}>Materiał</th>
                            {materialConsumptionData.years.map(year => (
                              <th key={year} className={`text-right py-3 px-2 ${themeClasses.text.primary} font-semibold`}>
                                {year}
                              </th>
                            ))}
                            <th className={`text-right py-3 px-2 ${themeClasses.text.primary} font-semibold`}>SUMA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMaterials.map(([key, mat]) => {
                            // Oblicz sumę dla tego materiału
                            let materialSum = 0;
                            let materialSumM2 = 0;
                            materialConsumptionData.years.forEach(year => {
                              materialSum += mat.years[year]?.total || 0;
                              materialSumM2 += mat.years[year]?.totalM2 || 0;
                            });

                            return (
                              <tr key={key} className={`border-b ${darkMode ? 'border-gray-800 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <td className={`py-3 px-2 ${themeClasses.text.primary}`}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded flex-shrink-0"
                                      style={{ backgroundColor: mat.color }}
                                      title={`Kolor: ${mat.color}`}
                                    />
                                    <span className="font-medium">{mat.displayName}</span>
                                  </div>
                                </td>
                                {materialConsumptionData.years.map(year => {
                                  const yearData = mat.years[year];
                                  const kg = yearData?.total || 0;
                                  const m2 = yearData?.totalM2 || 0;

                                  return (
                                    <td key={year} className={`text-right py-3 px-2 font-mono ${themeClasses.text.primary}`}>
                                      {kg > 0 ? (
                                        <>
                                          <div className="font-semibold">{Math.round(kg).toLocaleString('pl-PL')} kg</div>
                                          <div className={`text-xs ${themeClasses.text.secondary}`}>
                                            ({Math.round(m2).toLocaleString('pl-PL')} m²)
                                          </div>
                                        </>
                                      ) : (
                                        <span className={themeClasses.text.secondary}>-</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className={`text-right py-3 px-2 font-mono font-bold ${themeClasses.text.primary}`}>
                                  <div className="text-blue-600 dark:text-blue-400">
                                    {Math.round(materialSum).toLocaleString('pl-PL')} kg
                                  </div>
                                  <div className={`text-xs ${themeClasses.text.secondary}`}>
                                    ({Math.round(materialSumM2).toLocaleString('pl-PL')} m²)
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Grand Total Row */}
                          <tr className={`border-t-2 ${darkMode ? 'border-gray-600 bg-gray-800/70' : 'border-gray-400 bg-gray-100'}`}>
                            <td className={`py-3 px-2 font-bold ${themeClasses.text.primary}`}>SUMA WSZYSTKICH MATERIAŁÓW</td>
                            {materialConsumptionData.years.map(year => {
                              let yearTotal = 0;
                              let yearTotalM2 = 0;
                              sortedMaterials.forEach(([key, mat]) => {
                                yearTotal += mat.years[year]?.total || 0;
                                yearTotalM2 += mat.years[year]?.totalM2 || 0;
                              });

                              return (
                                <td key={year} className={`text-right py-3 px-2 font-mono font-bold text-blue-600 dark:text-blue-400`}>
                                  <div>{Math.round(yearTotal).toLocaleString('pl-PL')} kg</div>
                                  <div className={`text-xs ${themeClasses.text.secondary}`}>
                                    ({Math.round(yearTotalM2).toLocaleString('pl-PL')} m²)
                                  </div>
                                </td>
                              );
                            })}
                            <td className={`text-right py-3 px-2 font-mono font-bold text-blue-600 dark:text-blue-400`}>
                              <div>{Math.round(grandTotals.kg).toLocaleString('pl-PL')} kg</div>
                              <div className={`text-xs ${themeClasses.text.secondary}`}>
                                ({Math.round(grandTotals.m2).toLocaleString('pl-PL')} m²)
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : null}
      </div>
    </div>
  );
}
