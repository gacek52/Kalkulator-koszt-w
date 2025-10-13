import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { sessionApi } from '../services/api';
import { useAuth } from './AuthContext';

/**
 * SessionContext - Zarządzanie sesją roboczą użytkownika
 *
 * Odpowiada za:
 * - Auto-save (co 30 sekund) - zapisuje do backendu poprzez API
 * - Status zapisów
 * - Ochronę przed utratą danych
 * - Kontynuację sesji po zamknięciu aplikacji
 * - Synchronizacja między urządzeniami/kartami
 * - Sesje per użytkownik (każdy użytkownik ma swoją sesję)
 */

const SessionContext = createContext();

const AUTO_SAVE_INTERVAL = 30000; // 30 sekund

export function SessionProvider({ children }) {
  const { currentUser } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'error'
  const autoSaveTimerRef = useRef(null);
  const lastStateRef = useRef(null);

  // Załaduj sesję przy starcie z API (gdy użytkownik się zaloguje)
  useEffect(() => {
    if (currentUser) {
      loadSessionFromAPI();
    } else {
      // Wyczyść sesję gdy użytkownik się wyloguje
      setActiveSession(null);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    }
  }, [currentUser]);

  const loadSessionFromAPI = async () => {
    if (!currentUser) return;

    try {
      const response = await sessionApi.get(currentUser.uid);

      if (response.success && response.data) {
        const session = response.data;
        setActiveSession(session);
        setLastAutoSave(session.lastAutoSave ? new Date(session.lastAutoSave) : null);
        lastStateRef.current = JSON.stringify(session.calculation);
      }
    } catch (error) {
      console.error('Błąd wczytywania sesji z API:', error);

      // Fallback do localStorage (per user)
      const savedSession = localStorage.getItem(`activeSession_${currentUser.uid}`);
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          setActiveSession(session);
          setLastAutoSave(session.lastAutoSave ? new Date(session.lastAutoSave) : null);
          lastStateRef.current = JSON.stringify(session.calculation);
        } catch (err) {
          console.error('Błąd wczytywania z localStorage:', err);
        }
      }
    }
  };

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

  // Funkcja auto-save - zapisuje do API
  const autoSaveSession = async () => {
    if (!activeSession || !currentUser) return;

    try {
      setSaveStatus('saving');
      const sessionToSave = {
        ...activeSession,
        lastAutoSave: new Date().toISOString()
      };

      // Zapisz do API (per user)
      await sessionApi.save(currentUser.uid, sessionToSave);

      // Backup do localStorage (cache per user)
      localStorage.setItem(`activeSession_${currentUser.uid}`, JSON.stringify(sessionToSave));

      setLastAutoSave(new Date());
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      lastStateRef.current = JSON.stringify(activeSession.calculation);
    } catch (error) {
      console.error('Auto-save error:', error);
      setSaveStatus('error');

      // Spróbuj przynajmniej zapisać do localStorage
      try {
        localStorage.setItem(`activeSession_${currentUser.uid}`, JSON.stringify({
          ...activeSession,
          lastAutoSave: new Date().toISOString()
        }));
      } catch (localErr) {
        console.error('LocalStorage save error:', localErr);
      }
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

  // Funkcja do czyszczenia sesji (po zapisie) - usuwa z API i localStorage
  const clearSession = async () => {
    if (!currentUser) return;

    try {
      // Usuń z API
      await sessionApi.delete(currentUser.uid);
    } catch (error) {
      console.error('Błąd usuwania sesji z API:', error);
    }

    // Usuń z localStorage (per user)
    localStorage.removeItem(`activeSession_${currentUser.uid}`);

    // Zresetuj state
    setActiveSession(null);
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    setLastAutoSave(null);
    lastStateRef.current = null;
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
