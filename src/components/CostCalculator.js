import React, { useState } from 'react';
import { Calculator, Plus, Trash2, Edit3, X, ChevronUp, ChevronDown, Save, Upload, FileText, Download, Eye, Settings } from 'lucide-react';

// KOMPLETNY DZIAŁAJĄCY KALKULATOR Z FUNKCJĄ ZAPISU I WCZYTYWANIA

const CostCalculator = () => {
  // Stan (skopiowany z oryginału)
  const [globalSGA, setGlobalSGA] = useState('15');
  const [activeTab, setActiveTab] = useState(0);
  const [nextTabId, setNextTabId] = useState(2);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [darkMode, setDarkMode] = useState(false);

  // NOWE STANY DLA ZARZĄDZANIA ZAPISAMI
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [showSavedCalculations, setShowSavedCalculations] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDescription, setSaveDescription] = useState('');

  // Domyślne skale czasów (w sekundach)
  const defaultBakingScale = [
    { weight: 0, time: 0 }, { weight: 100, time: 120 }, { weight: 120, time: 132 },
    { weight: 150, time: 150 }, { weight: 200, time: 180 }, { weight: 250, time: 198 },
    { weight: 300, time: 216 }, { weight: 350, time: 234 }, { weight: 400, time: 246 },
    { weight: 450, time: 258 }, { weight: 500, time: 270 }, { weight: 600, time: 288 },
    { weight: 700, time: 300 }, { weight: 800, time: 318 }, { weight: 900, time: 330 },
    { weight: 1000, time: 348 }, { weight: 1200, time: 372 }, { weight: 1400, time: 396 },
    { weight: 1600, time: 420 }, { weight: 1800, time: 444 }, { weight: 2000, time: 462 },
    { weight: 2200, time: 480 }, { weight: 2500, time: 510 }, { weight: 3000, time: 552 }
  ];

  const defaultCleaningScale = [
    { weight: 0, time: 0 }, { weight: 100, time: 30 }, { weight: 150, time: 35 },
    { weight: 200, time: 40 }, { weight: 250, time: 45 }, { weight: 350, time: 50 },
    { weight: 450, time: 52 }, { weight: 550, time: 55 }, { weight: 700, time: 60 },
    { weight: 900, time: 65 }, { weight: 1200, time: 70 }, { weight: 1500, time: 75 },
    { weight: 1800, time: 80 }, { weight: 2200, time: 85 }, { weight: 2600, time: 90 },
    { weight: 3000, time: 95 }
  ];

  // STANY DLA PANELU USTAWIEŃ
  const [showSettings, setShowSettings] = useState(false);
  const [editingSettings, setEditingSettings] = useState({
    globalSGA: '15',
    bakingScale: [...defaultBakingScale],
    cleaningScale: [...defaultCleaningScale]
  });

  // Stan zakładek (skopiowany z oryginału)
  const [tabs, setTabs] = useState([
    {
      id: 1,
      name: 'Materiał 1',
      materialCost: '2.0',
      bakingCost: '110',
      cleaningCost: '90',
      handlingCost: '0.08',
      customProcesses: [],
      nextProcessId: 1,
      showAdvanced: false,
      editingCurves: {
        baking: [...defaultBakingScale],
        cleaning: [...defaultCleaningScale]
      },
      items: [{
        id: 1,
        partId: '',
        weight: '',
        weightOption: 'netto',
        bruttoWeight: '',
        cleaningOption: 'scaled',
        manualCleaningTime: '45',
        margin: '',
        yearlyQuantity: '',
        results: null
      }],
      nextId: 2
    }
  ]);

  // Tooltips state
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [pinnedTooltips, setPinnedTooltips] = useState([]);
  const [editingTabId, setEditingTabId] = useState(null);
  const [tempTabName, setTempTabName] = useState('');

  const SHIFT_HOURS = 8;

  // WSZYSTKIE FUNKCJE SKOPIOWANE Z ORYGINAŁU
  const getCurrentTab = () => tabs[activeTab];

  const updateTab = (updates) => {
    const newTabs = [...tabs];
    newTabs[activeTab] = { ...newTabs[activeTab], ...updates };
    setTabs(newTabs);
  };

  const calculateBruttoWeight = (nettoWeightGrams) => {
    if (nettoWeightGrams < 500) return nettoWeightGrams * 1.15;
    else if (nettoWeightGrams <= 2500) return nettoWeightGrams * 1.10;
    else return nettoWeightGrams * 1.05;
  };

  const getTimeFromScale = (weightGrams, scale) => {
    if (weightGrams <= 0) return 0;

    for (let i = 0; i < scale.length - 1; i++) {
      const current = scale[i];
      const next = scale[i + 1];

      if (weightGrams >= current.weight && weightGrams <= next.weight) {
        const ratio = (weightGrams - current.weight) / (next.weight - current.weight);
        return current.time + ratio * (next.time - current.time);
      }
    }

    const lastEntry = scale[scale.length - 1];
    if (weightGrams > lastEntry.weight) {
      const ratio = weightGrams / lastEntry.weight;
      return lastEntry.time * Math.pow(ratio, scale === getCurrentTab().editingCurves.cleaning ? 0.5 : 0.7);
    }

    return scale[0].time;
  };

  const calculateItemCost = (item, tab = getCurrentTab()) => {
    const nettoWeightGrams = parseFloat(item.weight);
    if (!nettoWeightGrams || nettoWeightGrams <= 0) return null;

    const MATERIAL_COST_PER_KG = parseFloat(tab.materialCost) || 2.0;
    const BAKING_SHIFT_COST = parseFloat(tab.bakingCost) || 110;
    const CLEANING_SHIFT_COST = parseFloat(tab.cleaningCost) || 90;
    const HANDLING_COST = parseFloat(tab.handlingCost) || 0.08;

    let finalBruttoWeight;
    if (item.weightOption === 'netto') {
      finalBruttoWeight = nettoWeightGrams;
    } else if (item.weightOption === 'brutto-auto') {
      finalBruttoWeight = calculateBruttoWeight(nettoWeightGrams);
    } else {
      finalBruttoWeight = parseFloat(item.bruttoWeight) || nettoWeightGrams;
    }

    const bruttoWeightKg = finalBruttoWeight / 1000;
    const materialCostTotal = bruttoWeightKg * MATERIAL_COST_PER_KG;

    const bakingTimeSeconds = getTimeFromScale(nettoWeightGrams, tab.editingCurves.baking);
    const bakingCostTotal = (bakingTimeSeconds / 3600 / SHIFT_HOURS) * BAKING_SHIFT_COST;

    const cleaningTimeSeconds = item.cleaningOption === 'scaled'
      ? getTimeFromScale(nettoWeightGrams, tab.editingCurves.cleaning)
      : parseFloat(item.manualCleaningTime) || 45;
    const cleaningCostTotal = (cleaningTimeSeconds / 3600 / SHIFT_HOURS) * CLEANING_SHIFT_COST;

    let customProcessesCostTotal = 0;
    tab.customProcesses.forEach(process => {
      const processCost = parseFloat(process.cost) || 0;
      if (process.unit === 'euro/szt') {
        customProcessesCostTotal += processCost;
      } else if (process.unit === 'euro/kg') {
        customProcessesCostTotal += processCost * bruttoWeightKg;
      } else if (process.unit === 'euro/8h') {
        const efficiency = parseFloat(process.efficiency) || 1;
        customProcessesCostTotal += processCost / efficiency;
      } else if (process.unit === 'euro/h') {
        customProcessesCostTotal += (1 / 60) * processCost;
      }
    });

    const manufacturingCost = materialCostTotal + bakingCostTotal + cleaningCostTotal + HANDLING_COST + customProcessesCostTotal;

    const marginPercent = parseFloat(item.margin) || 0;
    const sgaPercent = parseFloat(globalSGA) || 0;

    const marginCost = manufacturingCost * (marginPercent / 100);
    const sgaCost = manufacturingCost * (sgaPercent / 100);
    const finalPrice = manufacturingCost + marginCost + sgaCost;

    return {
      nettoWeight: nettoWeightGrams,
      bruttoWeight: finalBruttoWeight,
      materialCost: materialCostTotal,
      bakingCost: bakingCostTotal,
      cleaningCost: cleaningCostTotal,
      customProcessesCost: customProcessesCostTotal,
      manufacturingCost,
      marginCost,
      sgaCost,
      finalPrice,
      tabName: tab.name
    };
  };

  const updateItem = (index, field, value) => {
    const currentTab = getCurrentTab();
    const newItems = [...currentTab.items];
    newItems[index] = { ...newItems[index], [field]: value };

    const shouldRecalculate = [
      'weight', 'margin', 'weightOption', 'bruttoWeight',
      'cleaningOption', 'manualCleaningTime'
    ].includes(field);

    if (shouldRecalculate && newItems[index].weight) {
      const results = calculateItemCost(newItems[index]);
      newItems[index].results = results;
    } else if (field === 'weight' && !value) {
      newItems[index].results = null;
    }

    updateTab({ items: newItems });
  };

  const addItem = () => {
    const currentTab = getCurrentTab();
    const newItems = [...currentTab.items, {
      id: currentTab.nextId,
      partId: '',
      weight: '',
      weightOption: 'netto',
      bruttoWeight: '',
      cleaningOption: 'scaled',
      manualCleaningTime: '45',
      margin: '',
      yearlyQuantity: '',
      results: null
    }];
    updateTab({
      items: newItems,
      nextId: currentTab.nextId + 1
    });
  };

  const removeItem = (index) => {
    const currentTab = getCurrentTab();
    if (currentTab.items.length > 1) {
      const newItems = currentTab.items.filter((_, i) => i !== index);
      updateTab({ items: newItems });
    }
  };

  const addTab = () => {
    const newTab = {
      id: nextTabId,
      name: `Materiał ${nextTabId}`,
      materialCost: '2.0',
      bakingCost: '110',
      cleaningCost: '90',
      handlingCost: '0.08',
      customProcesses: [],
      nextProcessId: 1,
      showAdvanced: false,
      editingCurves: {
        baking: [...defaultBakingScale],
        cleaning: [...defaultCleaningScale]
      },
      items: [{
        id: 1,
        partId: '',
        weight: '',
        weightOption: 'netto',
        bruttoWeight: '',
        cleaningOption: 'scaled',
        manualCleaningTime: '45',
        margin: '',
        yearlyQuantity: '',
        results: null
      }],
      nextId: 2
    };

    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
    setNextTabId(nextTabId + 1);
  };

  const removeTab = (tabIndex) => {
    if (tabs.length > 1) {
      const newTabs = tabs.filter((_, i) => i !== tabIndex);
      setTabs(newTabs);
      setActiveTab(Math.min(activeTab, newTabs.length - 1));
    }
  };

  const getAllItems = () => {
    return tabs.flatMap(tab =>
      tab.items
        .filter(item => item.results)
        .map(item => ({
          ...item,
          results: { ...item.results, tabName: tab.name }
        }))
    );
  };

  // NOWE FUNKCJE DLA ZAPISU/WCZYTYWANIA
  const saveCalculations = () => {
    const allItems = getAllItems();

    if (allItems.length === 0) {
      alert('Brak obliczeń do zapisania. Wprowadź dane w pozycjach.');
      return;
    }

    const calculation = {
      id: Date.now(),
      date: new Date().toISOString(),
      description: saveDescription || `Obliczenia z ${new Date().toLocaleDateString('pl-PL')}`,
      globalSGA: globalSGA,
      tabsCount: tabs.length,
      itemsCount: allItems.length,
      totalCost: allItems.reduce((sum, item) => sum + item.results.finalPrice, 0),
      items: allItems,
      tabs: tabs.map(tab => ({
        id: tab.id,
        name: tab.name,
        materialCost: tab.materialCost,
        bakingCost: tab.bakingCost,
        cleaningCost: tab.cleaningCost,
        handlingCost: tab.handlingCost,
        customProcesses: tab.customProcesses
      }))
    };

    setSavedCalculations(prev => [calculation, ...prev]);
    setSaveDialogOpen(false);
    setSaveDescription('');
    alert(`✅ Zapisano obliczenia: "${calculation.description}"`);
  };

  const exportToCSV = (calculation) => {
    const csvHeader = 'ID,Nazwa części,Zakładka,Waga netto [g],Waga brutto [g],Marża [%],Koszt materiału [€],Koszt pieczenia [€],Koszt czyszczenia [€],Procesy custom [€],Koszt wytworzenia [€],Marża [€],SG&A [€],Cena EXW [€],Ilość roczna [szt]\n';

    const csvRows = calculation.items.map(item => [
      item.id,
      `"${item.partId || `Pozycja ${item.id}`}"`,
      `"${item.results.tabName}"`,
      item.results.nettoWeight,
      item.results.bruttoWeight.toFixed(0),
      item.margin || 0,
      item.results.materialCost.toFixed(3),
      item.results.bakingCost.toFixed(3),
      item.results.cleaningCost.toFixed(3),
      item.results.customProcessesCost.toFixed(3),
      item.results.manufacturingCost.toFixed(3),
      item.results.marginCost.toFixed(3),
      item.results.sgaCost.toFixed(3),
      item.results.finalPrice.toFixed(3),
      item.yearlyQuantity || 0
    ].join(','));

    const csv = csvHeader + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `obliczenia_${calculation.description.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // TOOLTIP FUNCTIONS (skopiowane z oryginału)
  const handleMouseEnter = (item, event) => {
    if (item.results) {
      setHoveredItem(item);
      updateTooltipPosition(event);
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleMouseMove = (event) => {
    if (hoveredItem) {
      updateTooltipPosition(event);
    }
  };

  const updateTooltipPosition = (event) => {
    const tooltipWidth = 320;
    const tooltipHeight = Math.min(500, window.innerHeight * 0.8);
    const margin = 15;

    let x = event.clientX + margin;
    let y = event.clientY - margin;

    if (x + tooltipWidth > window.innerWidth) {
      x = event.clientX - tooltipWidth - margin;
    }

    if (y + tooltipHeight > window.innerHeight) {
      y = event.clientY - tooltipHeight - margin;
    }

    if (y < 0) {
      y = margin;
    }

    if (x < 0) {
      x = margin;
    }

    setMousePosition({ x, y });
  };

  const handleItemClick = (item, event) => {
    if (item.results) {
      event.preventDefault();
      event.stopPropagation();

      const isAlreadyPinned = pinnedTooltips.some(pinned => pinned.item.id === item.id);
      if (isAlreadyPinned) return;

      const tooltipWidth = 320;
      const existingCount = pinnedTooltips.length;
      let x = 50 + (existingCount * (tooltipWidth + 20));
      let y = 50 + (existingCount * 30);

      if (x + tooltipWidth > window.innerWidth) {
        x = 50;
        y += 420;
      }

      const newPinnedTooltip = {
        item: { ...item },
        position: { x, y },
        id: Date.now()
      };

      setPinnedTooltips([...pinnedTooltips, newPinnedTooltip]);
      setHoveredItem(null);
    }
  };

  const removePinnedTooltip = (tooltipId) => {
    setPinnedTooltips(pinnedTooltips.filter(tooltip => tooltip.id !== tooltipId));
  };

  // FUNKCJE USTAWIEŃ
  const openSettings = () => {
    setEditingSettings({
      globalSGA: globalSGA,
      bakingScale: [...defaultBakingScale],
      cleaningScale: [...defaultCleaningScale]
    });
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const saveSettings = () => {
    setGlobalSGA(editingSettings.globalSGA);
    // Tu moglibyśmy zapisać krzywe, ale obecnie są one przechowywane per zakładka
    setShowSettings(false);
  };

  const updateBakingScale = (index, field, value) => {
    const newScale = [...editingSettings.bakingScale];
    newScale[index][field] = parseFloat(value) || 0;
    setEditingSettings({ ...editingSettings, bakingScale: newScale });
  };

  const updateCleaningScale = (index, field, value) => {
    const newScale = [...editingSettings.cleaningScale];
    newScale[index][field] = parseFloat(value) || 0;
    setEditingSettings({ ...editingSettings, cleaningScale: newScale });
  };

  const addScalePoint = (scaleType) => {
    const newPoint = { weight: 0, time: 0 };
    if (scaleType === 'baking') {
      const newScale = [...editingSettings.bakingScale, newPoint];
      setEditingSettings({ ...editingSettings, bakingScale: newScale });
    } else {
      const newScale = [...editingSettings.cleaningScale, newPoint];
      setEditingSettings({ ...editingSettings, cleaningScale: newScale });
    }
  };

  const removeScalePoint = (scaleType, index) => {
    if (scaleType === 'baking') {
      const newScale = editingSettings.bakingScale.filter((_, i) => i !== index);
      setEditingSettings({ ...editingSettings, bakingScale: newScale });
    } else {
      const newScale = editingSettings.cleaningScale.filter((_, i) => i !== index);
      setEditingSettings({ ...editingSettings, cleaningScale: newScale });
    }
  };

  // Automatycznie włącz/wyłącz dark mode w HTML
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Klasy CSS dla motywów (skopiowane z oryginału)
  const themeClasses = {
    background: darkMode ? 'bg-gray-900 min-h-screen' : 'bg-gray-50 min-h-screen',
    card: darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800',
    input: darkMode ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-400 focus:border-blue-400' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    inputDisabled: darkMode ? 'disabled:bg-gray-800 disabled:text-gray-500' : 'disabled:bg-gray-100',
    text: {
      primary: darkMode ? 'text-gray-100' : 'text-gray-800',
      secondary: darkMode ? 'text-gray-300' : 'text-gray-600',
      muted: darkMode ? 'text-gray-400' : 'text-gray-500'
    },
    button: {
      primary: darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white',
      green: darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white',
      orange: darkMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white',
      red: darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white',
      gray: darkMode ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
    },
    itemRow: darkMode ? 'bg-gray-700' : 'bg-gray-50',
    section: darkMode ? 'bg-gray-700' : 'bg-gray-50',
    table: {
      header: darkMode ? 'bg-gray-700' : 'bg-gray-100',
      row: darkMode ? 'border-gray-600' : 'border-t',
      cell: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
    },
    tooltip: {
      main: darkMode ? 'bg-gray-800 border-blue-400 text-gray-100' : 'bg-white border-blue-200',
      pinned: darkMode ? 'bg-orange-900 border-orange-600' : 'bg-orange-50 border-orange-300'
    }
  };

  // KOMPONENT TOOLTIP (skopiowany z oryginału)
  const TooltipContent = ({ item, isPinned = false }) => {
    const themeClass = isPinned
      ? (darkMode ? 'text-orange-300 border-orange-600' : 'text-orange-800')
      : (darkMode ? 'text-blue-400 border-blue-600' : 'text-blue-800');

    return (
      <>
        <div className={`font-bold mb-2 border-b pb-1 ${themeClass}`}>
          {isPinned ? '📌' : '📊'} Rozklad kosztów: {item.partId || `Pozycja ${item.id}`}
          {!isPinned && (
            <div className={`text-xs font-normal mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              Kliknij aby przypiąć
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>🧱 Materiał:</span>
            <div className="text-right">
              <div className="font-medium">{item.results.materialCost.toFixed(3)} €</div>
              <div className={`text-xs ${themeClasses.text.muted}`}>
                {((item.results.materialCost / item.results.manufacturingCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>🔥 Pieczenie:</span>
            <div className="text-right">
              <div className="font-medium">{item.results.bakingCost.toFixed(3)} €</div>
              <div className={`text-xs ${themeClasses.text.muted}`}>
                {((item.results.bakingCost / item.results.manufacturingCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>🧽 Czyszczenie:</span>
            <div className="text-right">
              <div className="font-medium">{item.results.cleaningCost.toFixed(3)} €</div>
              <div className={`text-xs ${themeClasses.text.muted}`}>
                {((item.results.cleaningCost / item.results.manufacturingCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {item.results.customProcessesCost > 0 && (
            <div className="flex justify-between items-center">
              <span className={themeClasses.text.secondary}>⚙️ Procesy dodatkowe:</span>
              <div className="text-right">
                <div className="font-medium">{item.results.customProcessesCost.toFixed(3)} €</div>
                <div className={`text-xs ${themeClasses.text.muted}`}>
                  {((item.results.customProcessesCost / item.results.manufacturingCost) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className={themeClasses.text.secondary}>🛠️ Obsługa:</span>
            <div className="text-right">
              <div className="font-medium">0.080 €</div>
              <div className={`text-xs ${themeClasses.text.muted}`}>
                {((0.08 / item.results.manufacturingCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="border-t pt-1 mt-2">
            <div className="flex justify-between items-center font-semibold">
              <span className={themeClasses.text.primary}>💰 Koszt wytworzenia:</span>
              <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>{item.results.manufacturingCost.toFixed(3)} €</span>
            </div>
          </div>

          {(item.results.marginCost > 0 || item.results.sgaCost > 0) && (
            <>
              {item.results.marginCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className={themeClasses.text.secondary}>📈 Marża ({item.margin}%):</span>
                  <span className="font-medium">{item.results.marginCost.toFixed(3)} €</span>
                </div>
              )}

              {item.results.sgaCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className={themeClasses.text.secondary}>🏢 SG&A:</span>
                  <span className="font-medium">{item.results.sgaCost.toFixed(3)} €</span>
                </div>
              )}
            </>
          )}

          <div className="border-t pt-1 mt-2">
            <div className="flex justify-between items-center font-bold text-lg">
              <span className={themeClasses.text.primary}>🏷️ Cena EXW:</span>
              <span className={darkMode ? 'text-green-400' : 'text-green-600'}>{item.results.finalPrice.toFixed(3)} €</span>
            </div>
          </div>

          <div className={`text-xs mt-2 pt-1 border-t ${themeClasses.text.muted}`}>
            Waga: {item.results.nettoWeight}g netto
            {item.results.bruttoWeight !== item.results.nettoWeight && (
              <span> / {item.results.bruttoWeight.toFixed(0)}g brutto</span>
            )}
            <br />
            Zakładka: {item.results.tabName}
          </div>
        </div>
      </>
    );
  };

  const currentTab = getCurrentTab();
  const allItems = getAllItems();

  return (
    <div className={`max-w-7xl mx-auto p-6 ${themeClasses.background}`}>
      <div className={`rounded-lg shadow p-6 ${themeClasses.card}`}>

        {/* Header z przyciskami zapisu */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={openSettings}
            className={`p-2 rounded-lg transition-colors ${themeClasses.button.gray}`}
            title="Ustawienia aplikacji"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition-colors ${themeClasses.button.gray}`}
            title={darkMode ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calculator className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h1 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Kalkulator Kosztów</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${themeClasses.button.green}`}>
              <Plus className="w-4 h-4" />
              Dodaj pozycję
            </button>
            <button
              onClick={() => setSaveDialogOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${themeClasses.button.primary}`}
            >
              <Save className="w-4 h-4" />
              Zapisz obliczenia
            </button>
            <button
              onClick={() => setShowSavedCalculations(!showSavedCalculations)}
              className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${themeClasses.button.orange}`}
            >
              <FileText className="w-4 h-4" />
              Zapisane ({savedCalculations.length})
            </button>
          </div>
        </div>

        {/* Dialog zapisu */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${themeClasses.card} fade-in`}>
              <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text.primary}`}>
                Zapisz obliczenia
              </h3>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                  Opis obliczeń:
                </label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="np. Oferta dla Klienta ABC - 2024.01"
                  className={`w-full px-3 py-2 border rounded ${themeClasses.input}`}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  className={`px-4 py-2 rounded transition-colors ${themeClasses.button.gray}`}
                >
                  Anuluj
                </button>
                <button
                  onClick={saveCalculations}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${themeClasses.button.primary}`}
                >
                  <Save className="w-4 h-4" />
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KALKULATOR - PEŁNA FUNKCJONALNOŚĆ */}
        {!showSavedCalculations && (
          <>
            {/* Zakładki */}
            <div className="mb-6">
              <div className={`flex items-center gap-2 ${darkMode ? 'border-b border-gray-600' : 'border-b'} scrollable-content`}>
                {tabs.map((tab, index) => (
                  <div key={tab.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(index)}
                      className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${
                        activeTab === index
                          ? `${darkMode ? 'text-blue-400 border-b-2 border-blue-400' : 'text-blue-600 border-b-2 border-blue-600'}`
                          : `${themeClasses.text.secondary} hover:${themeClasses.text.primary}`
                      }`}
                    >
                      {tab.name}
                    </button>
                    {tabs.length > 1 && (
                      <button
                        onClick={() => removeTab(index)}
                        className={`ml-1 ${themeClasses.text.muted} hover:text-red-600`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTab}
                  className={`ml-2 px-3 py-1 text-sm rounded transition-colors whitespace-nowrap ${themeClasses.button.primary}`}
                >
                  + Zakładka
                </button>
              </div>
            </div>

            {/* Header tabeli */}
            <div className={`grid grid-cols-4 lg:grid-cols-11 gap-2 text-sm font-medium mb-2 px-2 ${themeClasses.text.secondary}`}>
              <div className="col-span-1">#</div>
              <div className="col-span-1 lg:col-span-2">ID Części</div>
              <div className="col-span-1">Waga netto [g]</div>
              <div className="hidden lg:block lg:col-span-2">Waga brutto (materiał)</div>
              <div className="hidden lg:block lg:col-span-2">Czas czyszczenia</div>
              <div className="col-span-1">Marża [%]</div>
              <div className="hidden lg:block lg:col-span-1">Koszt wytw. [€]</div>
              <div className="col-span-1">Cena EXW [€]</div>
              <div className="col-span-1"></div>
            </div>

            {/* Items */}
            {currentTab.items.map((item, index) => (
              <div key={item.id} className={`grid grid-cols-4 lg:grid-cols-11 gap-2 items-center py-2 px-2 rounded mb-2 ${themeClasses.itemRow}`}
                onMouseEnter={(e) => handleMouseEnter(item, e)}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                onClick={(e) => handleItemClick(item, e)}
              >
                <div className={`col-span-1 font-medium ${themeClasses.text.secondary}`}>{item.id}</div>

                <div className="col-span-1 lg:col-span-2">
                  <input
                    type="text"
                    value={item.partId}
                    onChange={(e) => updateItem(index, 'partId', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                    placeholder="np. ABC-123"
                  />
                </div>

                <div className="col-span-1">
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => updateItem(index, 'weight', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                    placeholder="000"
                    min="1"
                  />
                </div>

                <div className="hidden lg:block lg:col-span-2">
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center text-xs">
                      <input type="radio" value="netto" checked={item.weightOption === 'netto'}
                        onChange={(e) => updateItem(index, 'weightOption', e.target.value)} className="mr-1" />
                      Bez naddatku
                    </label>
                    <label className="flex items-center text-xs">
                      <input type="radio" value="brutto-auto" checked={item.weightOption === 'brutto-auto'}
                        onChange={(e) => updateItem(index, 'weightOption', e.target.value)} className="mr-1" />
                      Auto naddatek
                    </label>
                    <div className="flex items-center text-xs">
                      <input type="radio" value="brutto-manual" checked={item.weightOption === 'brutto-manual'}
                        onChange={(e) => updateItem(index, 'weightOption', e.target.value)} className="mr-1" />
                      Ręcznie:
                      <input type="number" value={item.bruttoWeight}
                        onChange={(e) => updateItem(index, 'bruttoWeight', e.target.value)}
                        disabled={item.weightOption !== 'brutto-manual'}
                        className={`ml-1 w-16 px-1 py-0 text-xs border rounded ${themeClasses.input} ${themeClasses.inputDisabled}`}
                        placeholder="000" />
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block lg:col-span-2">
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center text-xs">
                      <input type="radio" value="scaled" checked={item.cleaningOption === 'scaled'}
                        onChange={(e) => updateItem(index, 'cleaningOption', e.target.value)} className="mr-1" />
                      Auto skalowanie
                    </label>
                    <div className="flex items-center text-xs">
                      <input type="radio" value="manual" checked={item.cleaningOption === 'manual'}
                        onChange={(e) => updateItem(index, 'cleaningOption', e.target.value)} className="mr-1" />
                      Ręcznie (sek):
                      <input type="number" value={item.manualCleaningTime}
                        onChange={(e) => updateItem(index, 'manualCleaningTime', e.target.value)}
                        disabled={item.cleaningOption !== 'manual'}
                        className={`ml-1 w-12 px-1 py-0 text-xs border rounded ${themeClasses.input} ${themeClasses.inputDisabled}`}
                        placeholder="45" />
                    </div>
                  </div>
                </div>

                <div className="col-span-1">
                  <input
                    type="number"
                    value={item.margin}
                    onChange={(e) => updateItem(index, 'margin', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded ${themeClasses.input}`}
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div className="hidden lg:block lg:col-span-1 text-sm font-medium">
                  {item.results ? (
                    <div>
                      <div>{item.results.manufacturingCost.toFixed(2)}</div>
                      {item.results.bruttoWeight !== item.results.nettoWeight && (
                        <div className={`text-xs ${themeClasses.text.muted}`}>
                          brutto: {item.results.bruttoWeight.toFixed(0)}g
                        </div>
                      )}
                    </div>
                  ) : '-'}
                </div>

                <div className="col-span-1 text-sm font-medium">
                  {item.results ? `${item.results.finalPrice.toFixed(2)}` : '-'}
                </div>

                <div className="col-span-1">
                  {currentTab.items.length > 1 && (
                    <button onClick={() => removeItem(index)} className={`p-1 ${themeClasses.text.secondary} hover:text-red-600`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Parametry */}
            <div className={`mt-6 text-xs rounded p-3 ${themeClasses.section} ${themeClasses.text.secondary}`}>
              <div className={`mb-2 text-sm font-semibold ${themeClasses.text.primary}`}>
                Parametry dla zakładki: {currentTab.name}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <span className="font-bold block mb-2">Parametry podstawowe:</span>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-16">Materiał:</span>
                      <input
                        type="number"
                        value={currentTab.materialCost}
                        onChange={(e) => {
                          updateTab({ materialCost: e.target.value });
                          // Przelicz wszystkie pozycje
                          const newItems = currentTab.items.map(item => {
                            if (item.weight) {
                              const results = calculateItemCost(item);
                              return { ...item, results };
                            }
                            return item;
                          });
                          updateTab({ items: newItems });
                        }}
                        className={`w-16 px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                        min="0"
                        step="0.01"
                      />
                      <span>€/kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16">SG&A:</span>
                      <input
                        type="number"
                        value={globalSGA}
                        onChange={(e) => {
                          setGlobalSGA(e.target.value);
                          // Przelicz wszystkie pozycje we wszystkich zakładkach
                          const newTabs = tabs.map(tab => ({
                            ...tab,
                            items: tab.items.map(item => {
                              if (item.weight) {
                                const results = calculateItemCost(item, tab);
                                return { ...item, results };
                              }
                              return item;
                            })
                          }));
                          setTabs(newTabs);
                        }}
                        className={`w-16 px-2 py-1 text-xs border rounded ${themeClasses.input}`}
                        min="0"
                        step="0.1"
                      />
                      <span>% (globalny)</span>
                    </div>
                  </div>
                </div>

                {/* Podgląd parametrów niestandardowych */}
                {currentTab.customProcesses && currentTab.customProcesses.length > 0 && (
                  <div>
                    <span className="font-bold block mb-2">Parametry niestandardowe:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {currentTab.customProcesses.map((process, index) => (
                        <div key={process.id} className="flex items-center gap-2 text-xs">
                          <span className="w-24 truncate" title={process.name}>{process.name}:</span>
                          <span className="font-medium">{process.cost}</span>
                          <span>{process.unit}</span>
                          {process.unit === 'euro/8h' && process.efficiency && (
                            <span className="text-gray-500">({process.efficiency} szt/zmiana)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Zestawienie aktywnej zakładki */}
            {allItems.length > 0 && (
              <div className="mt-6">
                <h3 className={`text-lg font-semibold mb-2 ${themeClasses.text.primary}`}>
                  Zestawienie wszystkich pozycji ({allItems.length})
                </h3>
                <div className={`p-4 rounded ${themeClasses.section}`}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className={themeClasses.text.secondary}>Łączny koszt wytworzenia:</span>
                      <div className="font-semibold text-lg">
                        {allItems.reduce((sum, item) => sum + item.results.manufacturingCost, 0).toFixed(2)} €
                      </div>
                    </div>
                    <div>
                      <span className={themeClasses.text.secondary}>Łączna cena EXW:</span>
                      <div className="font-semibold text-lg">
                        {allItems.reduce((sum, item) => sum + item.results.finalPrice, 0).toFixed(2)} €
                      </div>
                    </div>
                    <div>
                      <span className={themeClasses.text.secondary}>Średni koszt/pozycja:</span>
                      <div className="font-semibold">
                        {(allItems.reduce((sum, item) => sum + item.results.finalPrice, 0) / allItems.length).toFixed(2)} €
                      </div>
                    </div>
                    <div>
                      <span className={themeClasses.text.secondary}>Zakładki z danymi:</span>
                      <div className="font-semibold">
                        {tabs.filter(tab => tab.items.some(item => item.results)).length}/{tabs.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Lista zapisanych obliczeń */}
        {showSavedCalculations && (
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${themeClasses.text.primary}`}>
              📁 Zapisane obliczenia ({savedCalculations.length})
            </h2>

            {savedCalculations.length === 0 ? (
              <div className="text-center py-8">
                <p className={`text-lg ${themeClasses.text.secondary}`}>
                  Brak zapisanych obliczeń
                </p>
                <p className={`mt-2 text-sm ${themeClasses.text.muted}`}>
                  Wykonaj obliczenia w kalkulatorze i zapisz je używając przycisku "Zapisz obliczenia"
                </p>
              </div>
            ) : (
              <div className="scrollable-content">
                {savedCalculations.map((calculation) => (
                  <div key={calculation.id} className={`mb-6 border rounded-lg ${themeClasses.card} fade-in`}>
                    {/* Header obliczeń */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <div>
                        <h3 className={`font-semibold ${themeClasses.text.primary}`}>
                          {calculation.description}
                        </h3>
                        <div className={`text-sm mt-1 ${themeClasses.text.secondary}`}>
                          <span>📅 {new Date(calculation.date).toLocaleDateString('pl-PL')} {new Date(calculation.date).toLocaleTimeString('pl-PL')}</span>
                          <span className="mx-2">•</span>
                          <span>📊 {calculation.itemsCount} pozycji</span>
                          <span className="mx-2">•</span>
                          <span>💰 {calculation.totalCost.toFixed(2)} €</span>
                          <span className="mx-2">•</span>
                          <span>🏢 SG&A: {calculation.globalSGA}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => exportToCSV(calculation)}
                          className={`p-2 rounded transition-colors ${themeClasses.button.green}`}
                          title="Export do CSV"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Czy na pewno chcesz usunąć te obliczenia?')) {
                              setSavedCalculations(prev => prev.filter(calc => calc.id !== calculation.id));
                            }
                          }}
                          className={`p-2 rounded transition-colors ${themeClasses.button.red}`}
                          title="Usuń obliczenia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tabela z tooltipami */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className={themeClasses.table.header}>
                          <tr>
                            <th className={`px-4 py-2 text-left ${themeClasses.table.cell}`}>ID części</th>
                            <th className={`px-4 py-2 text-left ${themeClasses.table.cell}`}>Zakładka</th>
                            <th className={`px-4 py-2 text-right ${themeClasses.table.cell}`}>Waga netto [g]</th>
                            <th className={`px-4 py-2 text-right ${themeClasses.table.cell}`}>Waga brutto [g]</th>
                            <th className={`px-4 py-2 text-right ${themeClasses.table.cell}`}>Marża [%]</th>
                            <th className={`px-4 py-2 text-right ${themeClasses.table.cell}`}>Koszt wytw. [€]</th>
                            <th className={`px-4 py-2 text-right ${themeClasses.table.cell}`}>Cena EXW [€]</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.items.map((item) => (
                            <tr key={`${item.results.tabName}-${item.id}`} className={themeClasses.table.row}>
                              <td
                                className="px-4 py-2 cursor-pointer"
                                onMouseEnter={(e) => handleMouseEnter(item, e)}
                                onMouseLeave={handleMouseLeave}
                                onMouseMove={handleMouseMove}
                                onClick={(e) => handleItemClick(item, e)}
                              >
                                <span className={`hover:underline select-none ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                                  {item.partId || `Pozycja ${item.id}`}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                                  {item.results.tabName}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">{item.results.nettoWeight}</td>
                              <td className="px-4 py-2 text-right">
                                {item.results.bruttoWeight.toFixed(0)}
                                {item.results.bruttoWeight !== item.results.nettoWeight && (
                                  <span className={`text-xs ml-1 ${themeClasses.text.muted}`}>
                                    (+{((item.results.bruttoWeight/item.results.nettoWeight-1)*100).toFixed(0)}%)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">{parseFloat(item.margin) || 0}</td>
                              <td className="px-4 py-2 text-right font-medium">{item.results.manufacturingCost.toFixed(3)}</td>
                              <td className="px-4 py-2 text-right font-bold">{item.results.finalPrice.toFixed(3)}</td>
                            </tr>
                          ))}
                          <tr className={`${themeClasses.table.row} ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} font-semibold`}>
                            <td className="px-4 py-2">RAZEM:</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-xs ${themeClasses.text.secondary}`}>{calculation.tabsCount} zakładek</span>
                            </td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">-</td>
                            <td className="px-4 py-2 text-right">
                              {calculation.items.reduce((sum, item) => sum + item.results.manufacturingCost, 0).toFixed(3)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {calculation.totalCost.toFixed(3)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tooltip z rozpisem kosztów - hover */}
        {hoveredItem && (
          <div
            className={`fixed z-40 border-2 rounded-lg shadow-xl p-4 text-sm tooltip-shadow ${themeClasses.tooltip.main}`}
            style={{
              left: mousePosition.x,
              top: mousePosition.y,
              width: '320px',
              maxHeight: '400px',
              pointerEvents: 'none'
            }}
          >
            <TooltipContent item={hoveredItem} isPinned={false} />
          </div>
        )}

        {/* Przypięte tooltips */}
        {pinnedTooltips.map((pinnedTooltip) => (
          <div
            key={pinnedTooltip.id}
            className={`fixed z-50 border-2 rounded-lg shadow-xl p-4 text-sm tooltip-shadow ${themeClasses.tooltip.pinned}`}
            style={{
              left: pinnedTooltip.position.x,
              top: pinnedTooltip.position.y,
              width: '320px',
              maxHeight: '400px'
            }}
          >
            <div className={`font-bold mb-2 border-b pb-1 flex justify-between items-center ${darkMode ? 'text-orange-300 border-orange-600' : 'text-orange-800'}`}>
              <span>📌 {pinnedTooltip.item.partId || `Pozycja ${pinnedTooltip.item.id}`}</span>
              <button
                onClick={() => removePinnedTooltip(pinnedTooltip.id)}
                className="font-normal text-lg leading-none text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>

            <TooltipContent item={pinnedTooltip.item} isPinned={true} />
          </div>
        ))}

        {/* Panel ustawień */}
        {showSettings && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className={`max-w-4xl w-full max-h-[80vh] overflow-y-auto rounded-lg shadow-xl ${themeClasses.card}`}>
              <div className="p-6">
                {/* Header panelu ustawień */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <Settings className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h2 className={`text-2xl font-bold ${themeClasses.text.primary}`}>Ustawienia</h2>
                  </div>
                  <button
                    onClick={closeSettings}
                    className={`p-2 rounded-lg transition-colors ${themeClasses.button.gray}`}
                    title="Zamknij ustawienia"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Globalne ustawienia */}
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text.primary}`}>🏢 Ustawienia globalne</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${themeClasses.text.secondary}`}>
                        SG&A (%)
                      </label>
                      <input
                        type="number"
                        value={editingSettings.globalSGA}
                        onChange={(e) => setEditingSettings({ ...editingSettings, globalSGA: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${themeClasses.input}`}
                        step="0.1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Ustawienia per zakładka */}
                <div className="mb-8">
                  <h3 className={`text-lg font-semibold mb-4 ${themeClasses.text.primary}`}>📊 Ustawienia materiałów</h3>
                  <div className="space-y-6">
                    {tabs.map((tab, tabIndex) => (
                      <div key={tab.id} className={`border rounded-lg p-4 ${themeClasses.table.cell}`}>
                        <h4 className={`font-medium mb-4 ${themeClasses.text.primary}`}>
                          🏷️ {tab.name}
                        </h4>

                        {/* Koszty podstawowe */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                              Koszt materiału (€/kg)
                            </label>
                            <input
                              type="number"
                              value={tab.materialCost}
                              onChange={(e) => {
                                const newTabs = [...tabs];
                                newTabs[tabIndex].materialCost = e.target.value;
                                setTabs(newTabs);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                              step="0.1"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                              Koszt pieczenia (€/8h)
                            </label>
                            <input
                              type="number"
                              value={tab.bakingCost}
                              onChange={(e) => {
                                const newTabs = [...tabs];
                                newTabs[tabIndex].bakingCost = e.target.value;
                                setTabs(newTabs);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                              step="1"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                              Koszt czyszczenia (€/8h)
                            </label>
                            <input
                              type="number"
                              value={tab.cleaningCost}
                              onChange={(e) => {
                                const newTabs = [...tabs];
                                newTabs[tabIndex].cleaningCost = e.target.value;
                                setTabs(newTabs);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                              step="1"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${themeClasses.text.secondary}`}>
                              Koszt obsługi (€/szt)
                            </label>
                            <input
                              type="number"
                              value={tab.handlingCost}
                              onChange={(e) => {
                                const newTabs = [...tabs];
                                newTabs[tabIndex].handlingCost = e.target.value;
                                setTabs(newTabs);
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>

                        {/* Parametry niestandardowe */}
                        <div className="mb-6">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className={`font-medium ${themeClasses.text.secondary}`}>⚙️ Parametry niestandardowe</h5>
                            <button
                              onClick={() => {
                                const newTabs = [...tabs];
                                newTabs[tabIndex].customProcesses.push({
                                  id: newTabs[tabIndex].nextProcessId,
                                  name: 'Nowy parametr',
                                  cost: '0',
                                  unit: 'euro/szt',
                                  efficiency: '1'
                                });
                                newTabs[tabIndex].nextProcessId += 1;
                                setTabs(newTabs);
                              }}
                              className={`text-xs px-2 py-1 rounded ${themeClasses.button.primary}`}
                            >
                              <Plus size={12} className="inline mr-1" /> Dodaj parametr
                            </button>
                          </div>
                          <div className="space-y-2">
                            {tab.customProcesses.map((process, processIndex) => (
                              <div key={process.id} className="grid grid-cols-7 gap-2 items-center">
                                <div className="col-span-2">
                                  <input
                                    type="text"
                                    value={process.name}
                                    onChange={(e) => {
                                      const newTabs = [...tabs];
                                      newTabs[tabIndex].customProcesses[processIndex].name = e.target.value;
                                      setTabs(newTabs);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                    placeholder="Nazwa parametru"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    value={process.cost}
                                    onChange={(e) => {
                                      const newTabs = [...tabs];
                                      newTabs[tabIndex].customProcesses[processIndex].cost = e.target.value;
                                      setTabs(newTabs);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                    step="0.01"
                                    min="0"
                                    placeholder="Koszt"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <select
                                    value={process.unit}
                                    onChange={(e) => {
                                      const newTabs = [...tabs];
                                      newTabs[tabIndex].customProcesses[processIndex].unit = e.target.value;
                                      setTabs(newTabs);
                                    }}
                                    className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                  >
                                    <option value="euro/szt">€/szt</option>
                                    <option value="euro/kg">€/kg</option>
                                    <option value="euro/8h">€/8h</option>
                                    <option value="euro/h">€/h</option>
                                  </select>
                                </div>
                                {process.unit === 'euro/8h' && (
                                  <div>
                                    <input
                                      type="number"
                                      value={process.efficiency || '1'}
                                      onChange={(e) => {
                                        const newTabs = [...tabs];
                                        newTabs[tabIndex].customProcesses[processIndex].efficiency = e.target.value;
                                        setTabs(newTabs);
                                      }}
                                      className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                      step="1"
                                      min="1"
                                      placeholder="szt/zmiana"
                                      title="Ile sztuk na zmianę"
                                    />
                                  </div>
                                )}
                                <div>
                                  <button
                                    onClick={() => {
                                      const newTabs = [...tabs];
                                      newTabs[tabIndex].customProcesses = newTabs[tabIndex].customProcesses.filter((_, i) => i !== processIndex);
                                      setTabs(newTabs);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs p-1"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {tab.customProcesses.length === 0 && (
                              <div className={`text-xs ${themeClasses.text.muted} italic`}>
                                Brak parametrów niestandardowych. Kliknij "Dodaj parametr" aby dodać.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Krzywe skalowania */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Krzywa pieczenia */}
                          <div>
                            <h5 className={`font-medium mb-3 ${themeClasses.text.secondary}`}>🔥 Krzywa pieczenia</h5>
                            <div className="max-h-60 overflow-y-auto border rounded p-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="text-left">Waga (g)</th>
                                    <th className="text-left">Czas (sek)</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tab.editingCurves.baking.map((point, index) => (
                                    <tr key={index}>
                                      <td className="pr-2">
                                        <input
                                          type="number"
                                          value={point.weight}
                                          onChange={(e) => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.baking[index].weight = parseFloat(e.target.value) || 0;
                                            setTabs(newTabs);
                                          }}
                                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                          min="0"
                                        />
                                      </td>
                                      <td className="pr-2">
                                        <input
                                          type="number"
                                          value={point.time}
                                          onChange={(e) => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.baking[index].time = parseFloat(e.target.value) || 0;
                                            setTabs(newTabs);
                                          }}
                                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                          step="1"
                                          min="0"
                                        />
                                      </td>
                                      <td>
                                        <button
                                          onClick={() => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.baking = newTabs[tabIndex].editingCurves.baking.filter((_, i) => i !== index);
                                            setTabs(newTabs);
                                          }}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                onClick={() => {
                                  const newTabs = [...tabs];
                                  newTabs[tabIndex].editingCurves.baking.push({ weight: 0, time: 0 });
                                  setTabs(newTabs);
                                }}
                                className={`mt-2 text-xs px-2 py-1 rounded ${themeClasses.button.primary}`}
                              >
                                <Plus size={12} className="inline mr-1" /> Dodaj punkt
                              </button>
                            </div>
                          </div>

                          {/* Krzywa czyszczenia */}
                          <div>
                            <h5 className={`font-medium mb-3 ${themeClasses.text.secondary}`}>🧽 Krzywa czyszczenia</h5>
                            <div className="max-h-60 overflow-y-auto border rounded p-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="text-left">Waga (g)</th>
                                    <th className="text-left">Czas (sek)</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tab.editingCurves.cleaning.map((point, index) => (
                                    <tr key={index}>
                                      <td className="pr-2">
                                        <input
                                          type="number"
                                          value={point.weight}
                                          onChange={(e) => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.cleaning[index].weight = parseFloat(e.target.value) || 0;
                                            setTabs(newTabs);
                                          }}
                                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                          min="0"
                                        />
                                      </td>
                                      <td className="pr-2">
                                        <input
                                          type="number"
                                          value={point.time}
                                          onChange={(e) => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.cleaning[index].time = parseFloat(e.target.value) || 0;
                                            setTabs(newTabs);
                                          }}
                                          className={`w-full px-2 py-1 border rounded text-xs ${themeClasses.input}`}
                                          step="1"
                                          min="0"
                                        />
                                      </td>
                                      <td>
                                        <button
                                          onClick={() => {
                                            const newTabs = [...tabs];
                                            newTabs[tabIndex].editingCurves.cleaning = newTabs[tabIndex].editingCurves.cleaning.filter((_, i) => i !== index);
                                            setTabs(newTabs);
                                          }}
                                          className="text-red-500 hover:text-red-700 text-xs"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                onClick={() => {
                                  const newTabs = [...tabs];
                                  newTabs[tabIndex].editingCurves.cleaning.push({ weight: 0, time: 0 });
                                  setTabs(newTabs);
                                }}
                                className={`mt-2 text-xs px-2 py-1 rounded ${themeClasses.button.primary}`}
                              >
                                <Plus size={12} className="inline mr-1" /> Dodaj punkt
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Przyciski */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    onClick={closeSettings}
                    className={`px-4 py-2 rounded-lg transition-colors ${themeClasses.button.gray}`}
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={saveSettings}
                    className={`px-4 py-2 rounded-lg transition-colors ${themeClasses.button.primary}`}
                  >
                    <Save size={16} className="inline mr-2" />
                    Zapisz ustawienia
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostCalculator;