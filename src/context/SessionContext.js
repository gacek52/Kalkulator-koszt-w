import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

/**
 * SessionContext - Zarządzanie sesją roboczą użytkownika
 *
 * Odpowiada za:
 * - Auto-save (co 30 sekund)
 * - Status zapisów
 * - Ochronę przed utratą danych
 * - Kontynuację sesji po zamknięciu aplikacji
 */

const SessionContext = createContext();

const AUTO_SAVE_INTERVAL = 30000; // 30 sekund

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'error'
  const autoSaveTimerRef = useRef(null);
  const lastStateRef = useRef(null);

  // Załaduj sesję przy starcie
  useEffect(() => {
    const savedSession = localStorage.getItem('activeSession');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setActiveSession(session);
        setLastAutoSave(session.lastAutoSave ? new Date(session.lastAutoSave) : null);
        lastStateRef.current = JSON.stringify(session.calculation);
      } catch (error) {
        console.error('Error loading active session:', error);
      }
    }
  }, []);

  // Auto-save timer
  useEffect(() => {
    if (!activeSession || !hasUnsavedChanges) {
      return;
    }

    // Ustaw timer auto-save
    autoSaveTimerRef.current = setInterval(() => {
      autoSaveSession();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [activeSession, hasUnsavedChanges]);

  // Funkcja auto-save
  const autoSaveSession = () => {
    if (!activeSession) return;

    try {
      setSaveStatus('saving');
      const sessionToSave = {
        ...activeSession,
        lastAutoSave: new Date().toISOString()
      };

      localStorage.setItem('activeSession', JSON.stringify(sessionToSave));
      setLastAutoSave(new Date());
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      lastStateRef.current = JSON.stringify(activeSession.calculation);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');
    }
  };

  // Funkcja do aktualizacji sesji
  const updateSession = (calculation) => {
    const newSession = {
      calculation,
      isDraft: true,
      linkedCalculationId: activeSession?.linkedCalculationId || null,
      lastModified: new Date().toISOString()
    };

    setActiveSession(newSession);

    // Sprawdź czy są zmiany
    const currentState = JSON.stringify(calculation);
    if (currentState !== lastStateRef.current) {
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
    }
  };

  // Funkcja do rozpoczęcia nowej sesji
  const startNewSession = (calculation = null) => {
    const newSession = {
      calculation: calculation || {
        globalSGA: '12',
        tabs: [],
        activeTab: 0,
        calculationMeta: {
          client: '',
          status: 'draft',
          notes: '',
          createdDate: new Date().toISOString()
        }
      },
      isDraft: true,
      linkedCalculationId: null,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    setActiveSession(newSession);
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    lastStateRef.current = JSON.stringify(newSession.calculation);
    autoSaveSession();
  };

  // Funkcja do załadowania kalkulacji do edycji
  const loadCalculationToSession = (calculation, calculationId) => {
    const newSession = {
      calculation: JSON.parse(JSON.stringify(calculation)), // deep copy
      isDraft: true,
      linkedCalculationId: calculationId,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    setActiveSession(newSession);
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    lastStateRef.current = JSON.stringify(newSession.calculation);
    autoSaveSession();
  };

  // Funkcja do czyszczenia sesji (po zapisie)
  const clearSession = () => {
    setActiveSession(null);
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    setLastAutoSave(null);
    lastStateRef.current = null;
    localStorage.removeItem('activeSession');
  };

  // Funkcja do wymuszenia zapisu
  const forceSave = () => {
    autoSaveSession();
  };

  const value = {
    // Stan
    activeSession,
    hasUnsavedChanges,
    saveStatus,
    lastAutoSave,

    // Akcje
    updateSession,
    startNewSession,
    loadCalculationToSession,
    clearSession,
    forceSave
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
