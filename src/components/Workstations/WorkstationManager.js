import React, { useState } from 'react';
import { Wrench, Plus, Edit2, Trash2, Download, Upload, Sun, Moon, ArrowLeft, Copy } from 'lucide-react';
import { useWorkstation } from '../../context/WorkstationContext';

/**
 * Główny komponent zarządzania stanowiskami produkcyjnymi
 */
export function WorkstationManager({ darkMode, onToggleDarkMode, onBack, themeClasses }) {
  const { state, actions, utils } = useWorkstation();
  const [editingWorkstation, setEditingWorkstation] = useState(null);

  // Formularz stanowiska
  const [workstationForm, setWorkstationForm] = useState({
    name: '',
    type: 'Laser',
    shiftsPerDay: '3',
    hoursPerShift: '8',
    workDaysPerWeek: '5',
    holidaysPerYear: '10',
    efficiency: '85'
  });

  // Dodaj/edytuj stanowisko
  const handleSaveWorkstation = () => {
    if (!workstationForm.name || !workstationForm.type) {
      alert('Wypełnij przynajmniej nazwę i typ stanowiska');
      return;
    }

    const workstation = {
      name: workstationForm.name,
      type: workstationForm.type,
      shiftsPerDay: parseInt(workstationForm.shiftsPerDay) || 1,
      hoursPerShift: parseInt(workstationForm.hoursPerShift) || 8,
      workDaysPerWeek: parseInt(workstationForm.workDaysPerWeek) || 5,
      holidaysPerYear: parseInt(workstationForm.holidaysPerYear) || 10,
      efficiency: parseFloat(workstationForm.efficiency) / 100 || 0.85
    };

    if (editingWorkstation) {
      actions.updateWorkstation(editingWorkstation.id, workstation);
    } else {
      actions.addWorkstation(workstation);
    }

    // Reset formularza
    setWorkstationForm({
      name: '',
      type: 'Laser',
      shiftsPerDay: '3',
      hoursPerShift: '8',
      workDaysPerWeek: '5',
      holidaysPerYear: '10',
      efficiency: '85'
    });
    setEditingWorkstation(null);
  };

  // Rozpocznij edycję stanowiska
  const handleEditWorkstation = (ws) => {
    setEditingWorkstation(ws);
    setWorkstationForm({
      name: ws.name,
      type: ws.type,
      shiftsPerDay: ws.shiftsPerDay.toString(),
      hoursPerShift: ws.hoursPerShift.toString(),
      workDaysPerWeek: ws.workDaysPerWeek.toString(),
      holidaysPerYear: ws.holidaysPerYear.toString(),
      efficiency: (ws.efficiency * 100).toString()
    });
  };

  // Usuń stanowisko
  const handleDeleteWorkstation = (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć to stanowisko?')) {
      actions.removeWorkstation(id);
    }
  };

  // Anuluj edycję
  const handleCancelEdit = () => {
    setEditingWorkstation(null);
    setWorkstationForm({
      name: '',
      type: 'Laser',
      shiftsPerDay: '3',
      hoursPerShift: '8',
      workDaysPerWeek: '5',
      holidaysPerYear: '10',
      efficiency: '85'
    });
  };

  // Eksport do JSON
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      workstations: state.workstations
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `stanowiska_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Import z JSON
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (!importedData.workstations) {
          alert('Nieprawidłowy format pliku JSON.');
          return;
        }

        const shouldReplace = window.confirm(
          `Zaimportowano ${importedData.workstations.length} stanowisk.\n\nKliknij OK aby ZASTĄPIĆ istniejące dane, lub Anuluj aby DODAĆ do istniejących.`
        );

        if (shouldReplace) {
          const newState = {
            workstations: importedData.workstations,
            nextWorkstationId: Math.max(...importedData.workstations.map(w => w.id), 0) + 1
          };
          actions.loadWorkstationData(newState);
          alert('Dane zostały zastąpione!');
        } else {
          let addedCount = 0;
          importedData.workstations.forEach(ws => {
            const exists = state.workstations.some(w => w.name === ws.name);
            if (!exists) {
              actions.addWorkstation({
                name: ws.name,
                type: ws.type,
                shiftsPerDay: ws.shiftsPerDay,
                hoursPerShift: ws.hoursPerShift,
                workDaysPerWeek: ws.workDaysPerWeek,
                holidaysPerYear: ws.holidaysPerYear,
                efficiency: ws.efficiency
              });
              addedCount++;
            }
          });
          alert(`Dodano ${addedCount} nowych stanowisk (pominięto duplikaty).`);
        }

        event.target.value = '';
      } catch (error) {
        console.error('Błąd importu:', error);
        alert(`Błąd importu: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`${themeClasses.background} min-h-screen`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className={`${themeClasses.card} rounded-lg border p-6 mb-6`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
                  Zarządzanie stanowiskami produkcyjnymi
                </h1>
                <p className={`text-sm ${themeClasses.text.secondary}`}>
                  Definiuj parametry pracy stanowisk i obliczaj dostępną capacity
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

              <button
                onClick={handleExport}
                className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary} flex items-center gap-2`}
              >
                <Download size={16} />
                Eksportuj JSON
              </button>

              <label className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary} flex items-center gap-2 cursor-pointer`}>
                <Upload size={16} />
                Importuj JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`${themeClasses.card} rounded-lg border p-6`}>
          <div className="space-y-6">
            {/* Formularz dodawania/edycji */}
            <div className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className={`text-lg font-medium mb-4 ${themeClasses.text.primary}`}>
                {editingWorkstation ? 'Edytuj stanowisko' : 'Dodaj nowe stanowisko'}
              </h3>

              <div className="space-y-4">
                {/* Nazwa i typ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Nazwa stanowiska
                    </label>
                    <input
                      type="text"
                      value={workstationForm.name}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      placeholder="np. Laser 1000W"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Typ stanowiska
                    </label>
                    <select
                      value={workstationForm.type}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, type: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                    >
                      <option value="Laser">Laser</option>
                      <option value="Prasa">Prasa</option>
                      <option value="Ręczne">Ręczne</option>
                      <option value="Inne">Inne</option>
                    </select>
                  </div>
                </div>

                {/* Parametry pracy */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Liczba zmian/dzień
                    </label>
                    <input
                      type="number"
                      value={workstationForm.shiftsPerDay}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, shiftsPerDay: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="1"
                      max="3"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Godziny/zmianę
                    </label>
                    <input
                      type="number"
                      value={workstationForm.hoursPerShift}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, hoursPerShift: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="1"
                      max="12"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Dni robocze/tydzień
                    </label>
                    <input
                      type="number"
                      value={workstationForm.workDaysPerWeek}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, workDaysPerWeek: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="1"
                      max="7"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Święta/wolne (dni/rok)
                    </label>
                    <input
                      type="number"
                      value={workstationForm.holidaysPerYear}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, holidaysPerYear: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="0"
                      max="365"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                      Efektywność (%)
                    </label>
                    <input
                      type="number"
                      value={workstationForm.efficiency}
                      onChange={(e) => setWorkstationForm({ ...workstationForm, efficiency: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${themeClasses.input}`}
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                </div>

                {/* Kalkulacja capacity (podgląd) */}
                {workstationForm.shiftsPerDay && workstationForm.hoursPerShift && workstationForm.workDaysPerWeek && (
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                      📊 Dostępna capacity (podgląd):
                    </div>
                    <div className={`text-sm ${themeClasses.text.secondary}`}>
                      {(() => {
                        const shiftsPerDay = parseInt(workstationForm.shiftsPerDay) || 1;
                        const hoursPerShift = parseInt(workstationForm.hoursPerShift) || 8;
                        const workDaysPerWeek = parseInt(workstationForm.workDaysPerWeek) || 5;
                        const holidaysPerYear = parseInt(workstationForm.holidaysPerYear) || 10;
                        const efficiency = parseFloat(workstationForm.efficiency) / 100 || 0.85;

                        const workDaysPerYear = (52 * workDaysPerWeek) - holidaysPerYear;
                        const yearlyHours = Math.round(workDaysPerYear * shiftsPerDay * hoursPerShift * efficiency);
                        const monthlyHours = Math.round(yearlyHours / 12);

                        return `~${yearlyHours.toLocaleString('pl-PL')} h/rok (~${monthlyHours.toLocaleString('pl-PL')} h/miesiąc)`;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveWorkstation}
                  className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.primary}`}
                >
                  {editingWorkstation ? 'Zapisz zmiany' : 'Dodaj stanowisko'}
                </button>
                {editingWorkstation && (
                  <button
                    onClick={handleCancelEdit}
                    className={`px-4 py-2 rounded-lg font-medium ${themeClasses.button.secondary}`}
                  >
                    Anuluj
                  </button>
                )}
              </div>
            </div>

            {/* Lista stanowisk */}
            <div className="space-y-3">
              <h3 className={`text-lg font-medium ${themeClasses.text.primary}`}>
                Zdefiniowane stanowiska produkcyjne ({state.workstations.length})
              </h3>

              {state.workstations.length === 0 ? (
                <p className={themeClasses.text.secondary}>Brak zdefiniowanych stanowisk produkcyjnych</p>
              ) : (
                <div className="space-y-2">
                  {state.workstations.map((ws) => {
                    const yearlyCapacity = utils.calculateYearlyCapacity(ws);
                    const monthlyCapacity = utils.calculateMonthlyCapacity(ws);

                    return (
                      <div
                        key={ws.id}
                        className={`border rounded-lg p-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`font-medium ${themeClasses.text.primary}`}>{ws.name}</h4>
                              <span className={`px-2 py-0.5 text-xs rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${themeClasses.text.secondary}`}>
                                {ws.type}
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div>
                                <span className={themeClasses.text.secondary}>Zmiany:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>{ws.shiftsPerDay} × {ws.hoursPerShift}h</div>
                              </div>
                              <div>
                                <span className={themeClasses.text.secondary}>Dni/tydzień:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>{ws.workDaysPerWeek}</div>
                              </div>
                              <div>
                                <span className={themeClasses.text.secondary}>Święta:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>{ws.holidaysPerYear} dni</div>
                              </div>
                              <div>
                                <span className={themeClasses.text.secondary}>Efektywność:</span>
                                <div className={`font-mono ${themeClasses.text.primary}`}>{(ws.efficiency * 100).toFixed(0)}%</div>
                              </div>
                              <div>
                                <span className={themeClasses.text.secondary}>Capacity:</span>
                                <div className={`font-mono font-semibold text-blue-600 dark:text-blue-400`}>
                                  {yearlyCapacity.toLocaleString('pl-PL')} h/rok
                                </div>
                                <div className={`text-xs ${themeClasses.text.muted}`}>
                                  (~{monthlyCapacity.toLocaleString('pl-PL')} h/msc)
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditWorkstation(ws)}
                              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600`}
                              title="Edytuj"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => actions.duplicateWorkstation(ws.id)}
                              className={`p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600`}
                              title="Duplikuj"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteWorkstation(ws.id)}
                              className={`p-2 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600`}
                              title="Usuń"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
