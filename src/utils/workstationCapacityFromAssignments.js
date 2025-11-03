/**
 * Funkcje obliczeniowe dla zajętości stanowisk na podstawie workstationAssignments
 * To jest nowa implementacja która czyta bezpośrednio z Firestore zamiast z catalogItems
 */

/**
 * Oblicz wymagane godziny dla pojedynczego produktu
 * @param {number} annualVolume - Roczna ilość (szt)
 * @param {number} efficiency - Wydajność (szt/8h)
 * @returns {number} Wymagane godziny rocznie
 */
function calculateRequiredHours(annualVolume, efficiency) {
  if (!annualVolume || !efficiency || efficiency === 0) return 0;

  // Wymagane godziny = (roczna ilość / wydajność) * 8h
  return (annualVolume / efficiency) * 8;
}

/**
 * Oblicz dostępną capacity w godzinach na rok dla stanowiska
 * @param {Object} workstation - Obiekt stanowiska
 * @returns {number} Dostępne godziny rocznie
 */
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
 * Oblicz wykorzystanie stanowisk na podstawie workstationAssignments z Firestore
 * @param {Array} assignments - Tablica przypisań z Firestore workstationAssignments
 * @param {Array} workstations - Tablica stanowisk z WorkstationContext (z Firestore)
 * @returns {Object} Obiekt z obliczoną zajętością dla każdego stanowiska
 */
export function calculateWorkstationUtilizationFromAssignments(assignments, workstations) {
  // Krok 1: Inicjalizuj obiekt z danymi dla KAŻDEGO stanowiska z Firestore
  const utilizationData = {};

  if (!workstations || !Array.isArray(workstations)) {
    console.error('❌ [ASSIGNMENTS] workstations is not an array:', workstations);
    return utilizationData;
  }

  // Stwórz wpis dla każdego stanowiska z Firestore
  workstations.forEach(ws => {
    utilizationData[ws.id] = {
      workstation: ws,
      products: [],
      totalRequiredHours: 0,
      availableHours: calculateAvailableHours(ws),
      utilizationPercent: 0
    };
  });

  console.log(`📊 [ASSIGNMENTS] Zainicjalizowano ${Object.keys(utilizationData).length} stanowisk z Firestore`);

  if (!assignments || !Array.isArray(assignments)) {
    console.error('❌ [ASSIGNMENTS] assignments is not an array:', assignments);
    return utilizationData;
  }

  console.log(`📊 [ASSIGNMENTS] Mam ${assignments.length} przypisań do przetworzenia`);

  // Krok 2: Przejdź przez wszystkie przypisania i zlicz godziny
  let processedCount = 0;
  let skippedCount = 0;

  assignments.forEach((assignment, index) => {
    console.log(`\n📋 [ASSIGNMENTS] Przypisanie ${index + 1}/${assignments.length}:`, assignment.id);

    const annualVolume = parseFloat(assignment.annualVolume);

    if (!annualVolume || annualVolume <= 0) {
      console.warn(`⚠️ [ASSIGNMENTS] Przypisanie bez annualVolume - pomijam`, assignment.id);
      skippedCount++;
      return;
    }

    if (!assignment.workstations || assignment.workstations.length === 0) {
      console.warn(`⚠️ [ASSIGNMENTS] Przypisanie bez workstations - pomijam`, assignment.id);
      skippedCount++;
      return;
    }

    // ITERUJ PRZEZ WSZYSTKIE STANOWISKA W PRZYPISANIU
    assignment.workstations.forEach((ws, wsIndex) => {
      const workstationId = ws.workstationId;
      const efficiency = parseFloat(ws.efficiency);

      console.log(`  🔧 [ASSIGNMENTS][${wsIndex + 1}/${assignment.workstations.length}] workstationId=${workstationId}, efficiency=${efficiency}`);

      if (!workstationId || !efficiency || efficiency <= 0) {
        console.warn(`    ⚠️ [ASSIGNMENTS] Brak wymaganych danych - pomijam`);
        skippedCount++;
        return;
      }

      // Sprawdź czy stanowisko istnieje w Firestore
      if (!utilizationData[workstationId]) {
        console.warn(`    ⚠️ [ASSIGNMENTS] Stanowisko ${workstationId} nie istnieje w Firestore - pomijam`);
        skippedCount++;
        return;
      }

      // Oblicz wymagane godziny
      const requiredHours = calculateRequiredHours(annualVolume, efficiency);

      // Dodaj produkt do listy stanowiska
      utilizationData[workstationId].products.push({
        catalogId: assignment.calculationId || assignment.sessionId,
        catalogName: assignment.calculationId || `Sesja: ${assignment.sessionId}`,
        tabName: assignment.tabName,
        partId: assignment.partId || 'Brak ID',
        workstationName: ws.name || 'Stanowisko',
        annualVolume,
        efficiency,
        requiredHours
      });

      // Dodaj godziny do sumy
      utilizationData[workstationId].totalRequiredHours += requiredHours;

      console.log(`    ✅ [ASSIGNMENTS] Dodano ${requiredHours.toFixed(0)}h do stanowiska ${workstationId}. Nowa suma: ${utilizationData[workstationId].totalRequiredHours.toFixed(0)}h`);

      processedCount++;
    });
  });

  // Krok 3: Oblicz % wykorzystania dla każdego stanowiska
  Object.keys(utilizationData).forEach(wsId => {
    const data = utilizationData[wsId];
    if (data.availableHours > 0) {
      data.utilizationPercent = (data.totalRequiredHours / data.availableHours) * 100;
    }
  });

  console.log(`\n✅ [ASSIGNMENTS] Przetworzono ${processedCount} przypisań stanowisk, pominięto ${skippedCount}`);
  console.log('📊 [ASSIGNMENTS] Podsumowanie wykorzystania stanowisk:');
  Object.values(utilizationData).forEach(data => {
    console.log(`  - ${data.workstation.name}: ${data.totalRequiredHours.toFixed(0)}h / ${data.availableHours}h (${data.utilizationPercent.toFixed(1)}%)`);
  });

  return utilizationData;
}
