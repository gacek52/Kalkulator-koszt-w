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
 * Zbierz wszystkie kalkulacje z katalogu i pogrupuj według stanowisk
 * @param {Array} catalogItems - Tablica kalkulacji z katalogu
 * @param {Array} workstations - Tablica stanowisk z WorkstationContext (z Firestore)
 * @returns {Object} Obiekt z obliczoną zajętością dla każdego stanowiska
 */
export function calculateWorkstationUtilization(catalogItems, workstations) {
  // Krok 1: Inicjalizuj obiekt z danymi dla KAŻDEGO stanowiska z Firestore
  const utilizationData = {};

  if (!workstations || !Array.isArray(workstations)) {
    console.error('❌ workstations is not an array:', workstations);
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

  console.log(`📊 Zainicjalizowano ${Object.keys(utilizationData).length} stanowisk z Firestore:`, Object.keys(utilizationData));

  if (!catalogItems || !Array.isArray(catalogItems)) {
    console.error('❌ catalogItems is not an array:', catalogItems);
    alert(`BŁĄD: catalogItems nie jest tablicą! Typ: ${typeof catalogItems}`);
    return utilizationData;
  }

  alert(`DEBUG: Mam ${catalogItems.length} kalkulacji do przetworzenia, ${Object.keys(utilizationData).length} stanowisk`);

  // Krok 2: Przejdź przez wszystkie kalkulacje i zlicz godziny
  let processedCount = 0;
  let skippedCount = 0;

  catalogItems.forEach((calculation, calcIndex) => {
    console.log(`\n📋 Kalkulacja ${calcIndex + 1}/${catalogItems.length}: ${calculation.id}`);

    // Nowa struktura: calculation.tabs[].items[]
    if (calculation.tabs && Array.isArray(calculation.tabs)) {
      console.log(`  ✅ Ma tabs[], ilość: ${calculation.tabs.length}`);

      calculation.tabs.forEach((tab, tabIndex) => {
        console.log(`    📑 Tab ${tabIndex + 1}: ${tab.name}, items: ${tab.items?.length || 0}`);

        alert(`📑 TAB: ${tab.name}, ma items? ${!!tab.items}, jest array? ${Array.isArray(tab.items)}, długość: ${tab.items?.length || 0}`);

        if (!tab.items || !Array.isArray(tab.items)) {
          console.warn(`    ⚠️ Tab nie ma items[] - pomijam`);
          alert(`⚠️ TAB NIE MA ITEMS - POMIJAM`);
          return;
        }

        if (tab.items.length === 0) {
          alert(`⚠️ TAB MA 0 ITEMS - POMIJAM`);
          return;
        }

        alert(`✅ Zaczynam pętlę przez ${tab.items.length} items w tabie ${tab.name}`);

        // Przejdź przez wszystkie items w zakładce
        tab.items.forEach((item, itemIndex) => {
          alert(`🔍 ITEM ${itemIndex + 1}/${tab.items.length}: partId=${item.partId}, annualVolume=${item.annualVolume}`);

          const annualVolume = parseFloat(item.annualVolume);

          if (!annualVolume || annualVolume <= 0) {
            console.warn(`⚠️ Item bez annualVolume - pomijam`, {
              calcId: calculation.id,
              tabName: tab.name,
              partId: item.partId
            });
            alert(`⚠️ ITEM ${item.partId} - BRAK annualVolume (${item.annualVolume}) - POMIJAM`);
            return;
          }

          // Debug: sprawdź strukturę item
          console.log(`Item structure:`, {
            hasWorkstations: !!item.workstations,
            isArray: Array.isArray(item.workstations),
            length: item.workstations?.length,
            workstations: item.workstations
          });

          // TYLKO nowa struktura: item.workstations[] (array)
          if (item.workstations && Array.isArray(item.workstations) && item.workstations.length > 0) {

            console.log(`\n🔍 Processing item: calcId=${calculation.id}, tab=${tab.name}, partId=${item.partId}, annualVolume=${annualVolume}, workstations count=${item.workstations.length}`);
            alert(`✅ ITEM OK: partId=${item.partId}, annualVolume=${annualVolume}, workstations=${item.workstations.length}`);

            // ITERUJ PRZEZ WSZYSTKIE STANOWISKA W ITEM
            item.workstations.forEach((ws, wsIndex) => {
              const workstationId = ws.workstationId;
              const efficiency = parseFloat(ws.efficiency);

              console.log(`  🔧 [Workstation ${wsIndex + 1}/${item.workstations.length}]`, {
                name: ws.name,
                workstationId,
                efficiency,
                hasValidData: workstationId && efficiency > 0,
                existsInFirestore: !!utilizationData[workstationId]
              });

              // Sprawdź czy ma wszystkie wymagane dane
              if (!workstationId || !efficiency || efficiency <= 0) {
                console.warn(`    ⚠️ Brak wymaganych danych - pomijam:`, {
                  workstationId,
                  efficiency,
                  name: ws.name
                });
                skippedCount++;
                return;
              }

              // Sprawdź czy stanowisko istnieje w Firestore
              if (!utilizationData[workstationId]) {
                console.warn(`    ⚠️ Stanowisko ${workstationId} (${ws.name}) nie istnieje w Firestore - pomijam`);
                skippedCount++;
                return;
              }

              // Oblicz wymagane godziny
              const requiredHours = calculateRequiredHours(annualVolume, efficiency);

              // Dodaj produkt do listy stanowiska
              utilizationData[workstationId].products.push({
                catalogId: calculation.id,
                catalogName: calculation.client || 'Bez nazwy',
                tabName: tab.name,
                partId: item.partId || 'Brak ID',
                workstationName: ws.name || 'Stanowisko',
                annualVolume,
                efficiency,
                requiredHours
              });

              // Dodaj godziny do sumy
              utilizationData[workstationId].totalRequiredHours += requiredHours;

              console.log(`    ✅ Dodano ${requiredHours.toFixed(0)}h do stanowiska ${workstationId} (${utilizationData[workstationId].workstation.name}). Nowa suma: ${utilizationData[workstationId].totalRequiredHours.toFixed(0)}h`);

              processedCount++;
            });
          } else {
            // Item nie ma workstations[] - pomiń
            const reason = !item.workstations ? 'brak pola workstations' :
                          !Array.isArray(item.workstations) ? 'workstations nie jest array' :
                          'workstations.length === 0';

            console.warn(`⚠️ Item nie ma workstations[] array - pomijam`, {
              calcId: calculation.id,
              tabName: tab.name,
              partId: item.partId,
              reason,
              hasOldWorkstation: !!item.workstation
            });

            alert(`❌ POMINIĘTO ITEM: ${reason}, partId=${item.partId}, hasWorkstations=${!!item.workstations}, isArray=${Array.isArray(item.workstations)}, length=${item.workstations?.length}`);

            skippedCount++;
          }
        });
      });
    } else {
      // Kalkulacja nie ma tabs[] - pomiń (stara struktura)
      console.warn(`⚠️ Kalkulacja nie ma tabs[] - pomijam (stara struktura?)`, {
        calcId: calculation.id,
        hasOldItems: !!calculation.items
      });
    }
  });

  // Krok 3: Oblicz % wykorzystania dla każdego stanowiska
  Object.keys(utilizationData).forEach(wsId => {
    const data = utilizationData[wsId];
    if (data.availableHours > 0) {
      data.utilizationPercent = (data.totalRequiredHours / data.availableHours) * 100;
    }
  });

  console.log(`\n✅ Przetworzono ${processedCount} przypisań stanowisk, pominięto ${skippedCount}`);
  console.log('📊 Podsumowanie wykorzystania stanowisk:');
  Object.values(utilizationData).forEach(data => {
    console.log(`  - ${data.workstation.name}: ${data.totalRequiredHours.toFixed(0)}h / ${data.availableHours}h (${data.utilizationPercent.toFixed(1)}%)`);
  });

  return utilizationData;
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
    maxUtilization = 200
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
