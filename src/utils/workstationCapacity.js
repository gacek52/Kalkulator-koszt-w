/**
 * Funkcje obliczeniowe dla zajętości stanowisk produkcyjnych
 */

/**
 * Oblicz wymagane godziny dla pojedynczego produktu
 * @param {number} annualVolume - Roczna ilość (szt)
 * @param {number} efficiency - Wydajność (szt/8h)
 * @returns {number} Wymagane godziny rocznie
 */
export function calculateRequiredHours(annualVolume, efficiency) {
  if (!annualVolume || !efficiency || efficiency === 0) return 0;

  // Wymagane godziny = (roczna ilość / wydajność) * 8h
  return (annualVolume / efficiency) * 8;
}

/**
 * Zbierz wszystkie kalkulacje z katalogu i pogrupuj według stanowisk
 * @param {Array} catalogItems - Tablica kalkulacji z katalogu
 * @param {Array} workstations - Tablica stanowisk
 * @returns {Object} Obiekt z obliczoną zajętością dla każdego stanowiska
 */
export function calculateWorkstationUtilization(catalogItems, workstations) {
  // Inicjalizuj obiekt z danymi o stanowiskach
  const utilizationData = {};

  // Zabezpieczenie przed undefined/null
  if (!workstations || !Array.isArray(workstations)) {
    console.warn('workstations is not an array:', workstations);
    return utilizationData;
  }

  workstations.forEach(ws => {
    utilizationData[ws.id] = {
      workstation: ws,
      products: [],
      totalRequiredHours: 0,
      availableHours: calculateAvailableHours(ws),
      utilizationPercent: 0
    };
  });

  // Zabezpieczenie przed undefined/null catalogItems
  if (!catalogItems || !Array.isArray(catalogItems)) {
    console.warn('catalogItems is not an array:', catalogItems);
    return utilizationData;
  }

  // Przejdź przez wszystkie kalkulacje
  catalogItems.forEach(calculation => {
    // Sprawdź czy to kalkulacja z zakładkami (nowa struktura) czy z items (stara struktura)
    if (calculation.tabs && Array.isArray(calculation.tabs)) {
      // Nowa struktura: calculation.tabs[].items[]
      calculation.tabs.forEach(tab => {
        if (!tab.items) return;

        // Przejdź przez wszystkie items w zakładce
        tab.items.forEach(item => {
          const workstationId = item.workstation?.id;
          const efficiency = parseFloat(item.workstation?.efficiency);
          const annualVolume = parseFloat(item.annualVolume);

          // Sprawdź czy item ma przypisane stanowisko i wszystkie wymagane dane
          if (workstationId && efficiency > 0 && annualVolume > 0) {
            const requiredHours = calculateRequiredHours(annualVolume, efficiency);

            // Dodaj do danych stanowiska
            if (utilizationData[workstationId]) {
              utilizationData[workstationId].products.push({
                catalogId: calculation.id,
                catalogName: calculation.client || 'Bez nazwy',
                tabName: tab.name,
                partId: item.partId || 'Brak ID',
                annualVolume,
                efficiency,
                requiredHours
              });

              utilizationData[workstationId].totalRequiredHours += requiredHours;
            }
          }
        });
      });
    } else if (calculation.items && Array.isArray(calculation.items)) {
      // Stara struktura: calculation.items[] (bez tabs)
      calculation.items.forEach(item => {
        const workstationId = item.workstation?.id;
        const efficiency = parseFloat(item.workstation?.efficiency);
        const annualVolume = parseFloat(item.annualVolume);

        // Sprawdź czy item ma przypisane stanowisko i wszystkie wymagane dane
        if (workstationId && efficiency > 0 && annualVolume > 0) {
          const requiredHours = calculateRequiredHours(annualVolume, efficiency);

          // Dodaj do danych stanowiska
          if (utilizationData[workstationId]) {
            utilizationData[workstationId].products.push({
              catalogId: calculation.id,
              catalogName: calculation.client || 'Bez nazwy',
              tabName: item.tabName || '-',
              partId: item.partId || 'Brak ID',
              annualVolume,
              efficiency,
              requiredHours
            });

            utilizationData[workstationId].totalRequiredHours += requiredHours;
          }
        }
      });
    }
  });

  // Oblicz % wykorzystania dla każdego stanowiska
  Object.keys(utilizationData).forEach(wsId => {
    const data = utilizationData[wsId];
    if (data.availableHours > 0) {
      data.utilizationPercent = (data.totalRequiredHours / data.availableHours) * 100;
    }
  });

  return utilizationData;
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
 * Filtruj dane wykorzystania według kryteriów
 * @param {Object} utilizationData - Dane wykorzystania stanowisk
 * @param {Object} filters - Filtry (showOnlyOverloaded, workstationType, minUtilization, maxUtilization)
 * @returns {Object} Przefiltrowane dane
 */
export function filterUtilizationData(utilizationData, filters = {}) {
  const {
    showOnlyOverloaded = false,
    workstationType = '',
    minUtilization = 0,
    maxUtilization = 100
  } = filters;

  const filtered = {};

  Object.keys(utilizationData).forEach(wsId => {
    const data = utilizationData[wsId];
    const ws = data.workstation;

    // Sprawdź filtry
    if (showOnlyOverloaded && data.utilizationPercent <= 100) return;
    if (workstationType && ws.type !== workstationType) return;
    if (data.utilizationPercent < minUtilization) return;
    if (data.utilizationPercent > maxUtilization) return;

    filtered[wsId] = data;
  });

  return filtered;
}

/**
 * Sortuj stanowiska według różnych kryteriów
 * @param {Object} utilizationData - Dane wykorzystania stanowisk
 * @param {string} sortBy - Kryterium sortowania ('name', 'utilization', 'available', 'required')
 * @param {string} sortOrder - Kolejność ('asc' lub 'desc')
 * @returns {Array} Posortowana tablica danych stanowisk
 */
export function sortUtilizationData(utilizationData, sortBy = 'utilization', sortOrder = 'desc') {
  const dataArray = Object.values(utilizationData);

  dataArray.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = a.workstation.name.localeCompare(b.workstation.name);
        break;
      case 'utilization':
        compareValue = a.utilizationPercent - b.utilizationPercent;
        break;
      case 'available':
        compareValue = a.availableHours - b.availableHours;
        break;
      case 'required':
        compareValue = a.totalRequiredHours - b.totalRequiredHours;
        break;
      default:
        compareValue = 0;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return dataArray;
}
