import React from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkstation } from '../../context/WorkstationContext';
// import { useSession } from '../../context/SessionContext'; // Wyłączony auto-save
// import { useCalculator } from '../../context/CalculatorContext'; // Wyłączony auto-save
// import { saveWorkstationAssignment } from '../../services/workstationAssignments'; // Wyłączony auto-save

/**
 * Komponent do zarządzania wieloma stanowiskami produkcyjnymi dla elementu
 * Obsługuje backward compatibility ze starą strukturą workstation
 * Auto-save do Firestore workstationAssignments dla dashboard capacity
 */
export function WorkstationFields({ item, onUpdate, themeClasses, darkMode }) {
  const { state: workstationState } = useWorkstation();
  // const { activeSession } = useSession(); // Wyłączony auto-save
  // const { state: calculatorState } = useCalculator(); // Wyłączony auto-save
  const [expandedWorkstations, setExpandedWorkstations] = React.useState({});

  // WYŁĄCZONY Auto-save - tylko manual save przy kliknięciu "Zapisz do katalogu"
  // Auto-save gryzie się z manual save, więc stanowiska są zapisywane tylko podczas zapisu kalkulacji
  // React.useEffect(() => {
  //   // Zapisz tylko jeśli item ma workstations i annualVolume
  //   if (!item.workstations || item.workstations.length === 0) return;
  //   if (!item.annualVolume || parseFloat(item.annualVolume) <= 0) return;
  //
  //   // Potrzebujemy activeSession i activeTab
  //   if (!activeSession || calculatorState.activeTab === null) return;
  //
  //   // Znajdź aktywny tab
  //   const tab = calculatorState.tabs[calculatorState.activeTab];
  //   if (!tab) return;
  //
  //   // Wygeneruj sessionId (używamy createdAt jako unikalny identyfikator sesji)
  //   const sessionId = activeSession.createdAt || new Date().toISOString();
  //
  //   // calculationId może być null jeśli nie zapisano do katalogu
  //   const calculationId = activeSession.linkedCalculationId || null;
  //
  //   // Zapisz do Firestore
  //   const assignmentData = {
  //     sessionId,
  //     calculationId,
  //     tabId: tab.id,
  //     tabName: tab.name,
  //     itemId: item.id,
  //     partId: item.partId || '',
  //     annualVolume: item.annualVolume,
  //     workstations: item.workstations
  //   };
  //
  //   // Debounce - zapisz po 500ms od ostatniej zmiany
  //   const timeoutId = setTimeout(async () => {
  //     console.log('🔵 Wywołuję saveWorkstationAssignment z danymi:', assignmentData);
  //     const result = await saveWorkstationAssignment(assignmentData);
  //     console.log('🔵 Wynik zapisu:', result);
  //   }, 500);
  //
  //   return () => clearTimeout(timeoutId);
  // }, [item.workstations, item.annualVolume, item.partId, activeSession, calculatorState.activeTab, calculatorState.tabs]);

  // Migruj ze starej struktury jeśli potrzeba (backward compatibility)
  React.useEffect(() => {
    // Jeśli istnieje stara struktura workstation, ale nie ma workstations, migruj
    if (item.workstation && item.workstation.id && (!item.workstations || item.workstations.length === 0)) {
      const migratedWorkstation = {
        id: 1,
        workstationId: item.workstation.id,
        efficiency: item.workstation.efficiency || '',
        name: 'Stanowisko 1',
        costMode: 'auto',
        manualCost: ''
      };
      onUpdate({
        workstations: [migratedWorkstation],
        nextWorkstationId: 2
      });
    }
    // Jeśli nie ma ani workstation ani workstations, inicjalizuj pustą tablicę
    else if (!item.workstations) {
      onUpdate({
        workstations: [],
        nextWorkstationId: 1
      });
    }
    // Dodaj brakujące pola costMode/manualCost do istniejących stanowisk
    else if (item.workstations && item.workstations.length > 0) {
      const hasUpdates = item.workstations.some(ws => ws.costMode === undefined);
      if (hasUpdates) {
        const updatedWorkstations = item.workstations.map(ws => ({
          ...ws,
          costMode: ws.costMode || 'auto',
          manualCost: ws.manualCost || ''
        }));
        onUpdate({ workstations: updatedWorkstations });
      }
    }
  }, []);

  const workstations = item.workstations || [];
  const nextWorkstationId = item.nextWorkstationId || 1;

  const addWorkstation = () => {
    const newWorkstation = {
      id: nextWorkstationId,
      workstationId: null,
      efficiency: '',
      name: `Stanowisko ${nextWorkstationId}`,
      costMode: 'auto', // 'auto' lub 'manual'
      manualCost: '' // €/szt (gdy costMode = 'manual')
    };

    // Automatycznie rozwiń nowo dodane stanowisko
    setExpandedWorkstations(prev => ({
      ...prev,
      [nextWorkstationId]: true
    }));

    onUpdate({
      workstations: [...workstations, newWorkstation],
      nextWorkstationId: nextWorkstationId + 1
    });
  };

  const removeWorkstation = (wsId) => {
    if (workstations.length <= 1) return;

    const updatedWorkstations = workstations.filter(ws => ws.id !== wsId);
    onUpdate({
      workstations: updatedWorkstations
    });
  };

  const duplicateWorkstation = (wsId) => {
    const wsToDuplicate = workstations.find(ws => ws.id === wsId);
    if (!wsToDuplicate) return;

    const duplicatedWs = {
      ...wsToDuplicate,
      id: nextWorkstationId,
      name: `${wsToDuplicate.name} (kopia)`
    };

    onUpdate({
      workstations: [...workstations, duplicatedWs],
      nextWorkstationId: nextWorkstationId + 1
    });
  };

  const updateWorkstation = (wsId, updates) => {
    const updatedWorkstations = workstations.map(ws =>
      ws.id === wsId ? { ...ws, ...updates } : ws
    );

    // Debug: pokaż co zapisujemy
    const workstationIds = updatedWorkstations.map(w => w.workstationId);
    console.log(`💾 Zapisuję workstations, IDs:`, workstationIds);

    onUpdate({
      workstations: updatedWorkstations
    });
  };

  const toggleWorkstation = (wsId) => {
    setExpandedWorkstations(prev => ({
      ...prev,
      [wsId]: !prev[wsId]
    }));
  };

  // Oblicz automatyczny koszt dla stanowiska
  const calculateAutoCost = (ws) => {
    if (!ws.workstationId || !ws.efficiency) return 0;

    const workstation = workstationState.workstations.find(w => w.id === ws.workstationId);
    if (!workstation) return 0;

    const efficiency = parseFloat(ws.efficiency) || 0;
    const costPer8h = parseFloat(workstation.costPer8h) || 0;

    // Koszt per sztuka = koszt stanowiska / wydajność
    return efficiency > 0 ? (costPer8h / efficiency) : 0;
  };

  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`text-sm font-medium ${themeClasses.text.primary}`}>
          🏭 Stanowiska produkcyjne
        </div>
        <button
          onClick={addWorkstation}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
          title="Dodaj stanowisko"
        >
          <Plus size={14} />
          Dodaj stanowisko
        </button>
      </div>

      {workstations.length === 0 ? (
        <div className={`text-sm ${themeClasses.text.secondary} text-center py-4 border-2 border-dashed rounded ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
          Brak stanowisk. Kliknij "Dodaj stanowisko" aby rozpocząć.
        </div>
      ) : (
        <div className="space-y-2">
          {workstations.map((ws, index) => (
            <div
              key={ws.id}
              className={`border rounded ${darkMode ? 'border-gray-600 bg-gray-900/30' : 'border-gray-300 bg-white'}`}
            >
              {/* Header stanowiska */}
              <div
                className={`flex items-center justify-between p-2 cursor-pointer ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
                onClick={() => toggleWorkstation(ws.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedWorkstations[ws.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span className="text-sm font-medium">
                    {ws.name}
                  </span>
                  {ws.workstationId && (
                    <span className={`text-xs ${themeClasses.text.secondary}`}>
                      ({workstationState.workstations.find(w => w.id === ws.workstationId)?.name || 'Nieznane'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateWorkstation(ws.id);
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Powiel stanowisko"
                  >
                    <Copy size={14} />
                  </button>
                  {workstations.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWorkstation(ws.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Usuń stanowisko"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Zawartość stanowiska */}
              {expandedWorkstations[ws.id] && (
                <div className="p-3 border-t space-y-3">
                  {/* Nazwa stanowiska */}
                  <div>
                    <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                      Nazwa stanowiska
                    </label>
                    <input
                      type="text"
                      value={ws.name}
                      onChange={(e) => updateWorkstation(ws.id, { name: e.target.value })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      placeholder={`Stanowisko ${index + 1}`}
                    />
                  </div>

                  {/* Wybór stanowiska produkcyjnego */}
                  <div>
                    <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                      Wybierz stanowisko produkcyjne
                    </label>
                    <select
                      value={ws.workstationId || ''}
                      onChange={(e) => updateWorkstation(ws.id, {
                        workstationId: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                    >
                      <option value="">-- Wybierz stanowisko --</option>
                      {workstationState.workstations.map(wstation => (
                        <option key={wstation.id} value={wstation.id}>
                          {wstation.name} ({wstation.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Wydajność */}
                  <div>
                    <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                      Wydajność (szt/8h)
                    </label>
                    <input
                      type="number"
                      value={ws.efficiency || ''}
                      onChange={(e) => updateWorkstation(ws.id, { efficiency: e.target.value })}
                      className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                      min="0"
                      step="1"
                      placeholder="np. 100"
                    />
                  </div>

                  {/* Koszt stanowiska */}
                  <div className={`p-3 rounded border ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="mb-2">
                      <label className={`block text-xs font-medium ${themeClasses.text.primary} mb-2`}>
                        💰 Koszt stanowiska
                      </label>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`costMode-${ws.id}`}
                            checked={ws.costMode !== 'manual'}
                            onChange={() => updateWorkstation(ws.id, { costMode: 'auto' })}
                            className="text-blue-500"
                          />
                          <span className="text-xs">Auto</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`costMode-${ws.id}`}
                            checked={ws.costMode === 'manual'}
                            onChange={() => updateWorkstation(ws.id, { costMode: 'manual' })}
                            className="text-blue-500"
                          />
                          <span className="text-xs">Ręczny</span>
                        </label>
                      </div>
                    </div>

                    {ws.costMode === 'manual' ? (
                      <>
                        {/* Ręczny koszt */}
                        <div>
                          <label className={`block text-xs ${themeClasses.text.secondary} mb-1`}>
                            Koszt (€/szt)
                          </label>
                          <input
                            type="number"
                            value={ws.manualCost || ''}
                            onChange={(e) => updateWorkstation(ws.id, { manualCost: e.target.value })}
                            className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                            min="0"
                            step="0.001"
                            placeholder="0.000"
                          />
                        </div>
                        {/* Podpowiedź auto */}
                        {ws.workstationId && ws.efficiency && (
                          <div className={`mt-2 text-xs ${themeClasses.text.secondary}`}>
                            💡 Auto: {calculateAutoCost(ws).toFixed(3)} €/szt
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Wyliczony koszt auto */}
                        {ws.workstationId && ws.efficiency ? (
                          <div className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
                            <div className={`font-medium ${themeClasses.text.primary} mb-1`}>
                              💡 Wyliczony: {calculateAutoCost(ws).toFixed(3)} €/szt
                            </div>
                            <div className={themeClasses.text.secondary}>
                              Koszt: {workstationState.workstations.find(w => w.id === ws.workstationId)?.costPer8h || 0} €/8h
                              ÷ Wydajność: {ws.efficiency} szt/8h
                            </div>
                          </div>
                        ) : (
                          <div className={`text-xs ${themeClasses.text.secondary} italic`}>
                            Wybierz stanowisko i podaj wydajność
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
