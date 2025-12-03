import React from 'react';
import { Info } from 'lucide-react';

/**
 * ItemResults - Wyniki kalkulacji dla pojedynczego itemu
 *
 * Wyekstrahowany z ItemCard.js (linie 479-647, ~168 linii)
 * Cel: Redukcja wielkości ItemCard (~590 → ~440 linii)
 *
 * Odpowiedzialność:
 * - Wyświetlanie rozbicia kosztów (materiał, procesy, pakowanie, transport)
 * - Obsługa różnych trybów kalkulacji (heatshield vs standardowe)
 * - Wyświetlanie szczegółów stanowisk produkcyjnych
 * - Cena całkowita i DAP (Delivered At Place)
 *
 * @param {Object} item - Dane itemu z wynikami (item.results)
 * @param {Object} tab - Dane zakładki (calculationType, cleaningCost)
 * @param {Object} calculationMeta - Metadata kalkulacji (transport, client)
 * @param {Object} themeClasses - Klasy CSS dla motywu
 * @param {boolean} darkMode - Tryb ciemny
 * @param {Object} clientState - Stan klientów z contextu
 */
export function ItemResults({
  item,
  tab,
  calculationMeta,
  themeClasses,
  darkMode,
  clientState
}) {
  // Jeśli brak wyników - nie renderuj
  if (!item.results) {
    return null;
  }

  return (
    <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {/* Koszt materiału */}
        <div>
          <span className={themeClasses.text.secondary}>Materiał:</span>
          <div className="font-mono">{item.results.materialCost?.toFixed(2) || '0.00'} €</div>
        </div>

        {/* Wyświetl procesy w zależności od trybu */}
        {tab.calculationType === 'heatshield' ? (
          <>
            {/* Koszty stanowisk produkcyjnych */}
            {item.results.workstationsCost > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Stanowiska:</span>
                <div className="font-mono">{item.results.workstationsCost.toFixed(3)} €</div>
                {/* Szczegóły per stanowisko */}
                {item.results.workstationCosts && Object.keys(item.results.workstationCosts).length > 1 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs">
                      Szczegóły
                    </summary>
                    <div className="mt-1 pl-2 space-y-0.5">
                      {Object.entries(item.results.workstationCosts).map(([wsId, wsData]) => (
                        <div key={wsId} className={`text-xs ${themeClasses.text.secondary}`}>
                          • {wsData.name}: {wsData.cost.toFixed(3)} € ({wsData.mode === 'manual' ? 'ręczny' : 'auto'})
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {item.results.laserCost !== undefined && (
              <div>
                <span className={themeClasses.text.secondary}>Laser:</span>
                <div className="font-mono">{item.results.laserCost.toFixed(2)} €</div>
              </div>
            )}
            {item.results.bendingCost > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Gięcie:</span>
                <div className="font-mono">{item.results.bendingCost.toFixed(2)} €</div>
              </div>
            )}
            {item.results.joiningCost > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Łączenie:</span>
                <div className="font-mono">{item.results.joiningCost.toFixed(2)} €</div>
              </div>
            )}
            {item.results.gluingCost > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Klejenie:</span>
                <div className="font-mono">{item.results.gluingCost.toFixed(2)} €</div>
              </div>
            )}
          </>
        ) : (
          <>
            {item.results.bakingCost !== undefined && (
              <div>
                <span className={themeClasses.text.secondary}>Pieczenie:</span>
                <div className="font-mono">{item.results.bakingCost.toFixed(2)} €</div>
              </div>
            )}
            {item.results.cleaningCost !== undefined && parseFloat(tab.cleaningCost || 0) > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Czyszczenie:</span>
                <div className="font-mono">{item.results.cleaningCost.toFixed(2)} €</div>
              </div>
            )}
            {/* Koszty stanowisk produkcyjnych */}
            {item.results.workstationsCost > 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Stanowiska:</span>
                <div className="font-mono">{item.results.workstationsCost.toFixed(3)} €</div>
                {/* Szczegóły per stanowisko */}
                {item.results.workstationCosts && Object.keys(item.results.workstationCosts).length > 1 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-blue-500 hover:text-blue-700 text-xs">
                      Szczegóły
                    </summary>
                    <div className="mt-1 pl-2 space-y-0.5">
                      {Object.entries(item.results.workstationCosts).map(([wsId, wsData]) => (
                        <div key={wsId} className={`text-xs ${themeClasses.text.secondary}`}>
                          • {wsData.name}: {wsData.cost.toFixed(3)} € ({wsData.mode === 'manual' ? 'ręczny' : 'auto'})
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {/* Koszt obsługi - fallback gdy brak stanowisk */}
            {item.results.handlingCost > 0 && item.results.workstationsCost === 0 && (
              <div>
                <span className={themeClasses.text.secondary}>Obsługa:</span>
                <div className="font-mono">{item.results.handlingCost.toFixed(3)} €</div>
              </div>
            )}
          </>
        )}

        {item.results.customProcessesCost > 0 && (
          <div>
            <span className={themeClasses.text.secondary}>Procesy niestand.:</span>
            <div className="font-mono">{item.results.customProcessesCost.toFixed(3)} €</div>
          </div>
        )}
        {item.results.customCurvesCost > 0 && (
          <div>
            <span className={themeClasses.text.secondary}>Krzywe:</span>
            <div className="font-mono">{item.results.customCurvesCost.toFixed(2)} €</div>
          </div>
        )}
        {item.results.packagingCost > 0 && (
          <div>
            <span className={themeClasses.text.secondary}>Pakowanie:</span>
            <div className="font-mono">{item.results.packagingCost.toFixed(4)} €</div>
          </div>
        )}
        {item.results.transportCost > 0 && (
          <div>
            <span className={themeClasses.text.secondary}>Transport:</span>
            <div className="font-mono">{item.results.transportCost.toFixed(4)} €</div>
          </div>
        )}
        <div>
          <span className={themeClasses.text.secondary}>Całkowity:</span>
          <div className="font-mono font-bold">{item.results.finalTotalCost?.toFixed(2) || item.results.totalCost?.toFixed(2) || '0.00'} €</div>
        </div>
        {/* DAP Price (z transportem) */}
        {item.results.transportCost > 0 && (() => {
          const exwPrice = item.results.totalWithSGA || 0; // Cena EXW = cena bez transportu
          const dapPrice = item.results.finalTotalCost || (exwPrice + item.results.transportCost); // DAP = EXW + transport
          const client = calculationMeta.client
            ? clientState.clients.find(c => c.id === calculationMeta.client)
            : null;
          const cityName = client?.city ? ` ${client.city}` : '';

          return (
            <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-1">
                <span className={themeClasses.text.secondary}>Cena DAP{cityName}:</span>
                <div className="relative group">
                  <Info size={14} className={`${themeClasses.text.secondary} cursor-help`} />
                  <div className={`absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 rounded shadow-lg text-xs ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}>
                    <div className="font-semibold mb-1">Delivered At Place</div>
                    <div className="space-y-0.5">
                      <div>EXW: €{exwPrice.toFixed(4)}</div>
                      <div>Transport: €{item.results.transportCost.toFixed(4)}</div>
                      <div className="pt-1 border-t border-gray-400">
                        <strong>DAP: €{dapPrice.toFixed(4)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="font-mono font-bold text-green-600 dark:text-green-400">
                {dapPrice.toFixed(2)} €
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Export dla backward compatibility
export default ItemResults;
