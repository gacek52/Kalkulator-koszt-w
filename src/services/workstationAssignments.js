/**
 * Serwis do zarządzania przypisaniami stanowisk w Firestore
 * Używane przez dashboard do obliczania capacity
 */

import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'workstationAssignments';

/**
 * Zapisz lub zaktualizuj przypisanie stanowisk dla itema
 */
export async function saveWorkstationAssignment(data) {
  const {
    sessionId,
    calculationId,
    tabId,
    tabName,
    itemId,
    partId,
    annualVolume,
    workstations
  } = data;

  // ID dokumentu: sessionId_tabId_itemId (unikalny dla każdego itema)
  const docId = `${sessionId}_${tabId}_${itemId}`;

  try {
    const assignmentDoc = {
      sessionId,
      calculationId: calculationId || null, // Może być null jeśli jeszcze nie zapisane do katalogu
      tabId,
      tabName: tabName || '',
      itemId,
      partId: partId || '',
      annualVolume: parseFloat(annualVolume) || 0,
      workstations: workstations || [], // Array z pełnymi obiektami stanowisk
      updatedAt: serverTimestamp()
    };

    console.log(`📝 Przygotowuję dokument do zapisu:`, {
      docId,
      annualVolume: assignmentDoc.annualVolume,
      workstationsCount: assignmentDoc.workstations.length,
      workstations: assignmentDoc.workstations
    });

    await setDoc(doc(db, COLLECTION_NAME, docId), assignmentDoc);
    console.log(`✅ Zapisano workstationAssignment: ${docId}`);

    return { success: true, docId };
  } catch (error) {
    console.error('❌ Błąd zapisywania workstationAssignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Usuń przypisanie stanowisk dla itema
 */
export async function deleteWorkstationAssignment(sessionId, tabId, itemId) {
  const docId = `${sessionId}_${tabId}_${itemId}`;

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
    console.log(`🗑️ Usunięto workstationAssignment: ${docId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Błąd usuwania workstationAssignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Usuń wszystkie przypisania dla sesji (gdy kalkulacja jest zamykana)
 */
export async function deleteSessionAssignments(sessionId) {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(docSnap =>
      deleteDoc(doc(db, COLLECTION_NAME, docSnap.id))
    );

    await Promise.all(deletePromises);
    console.log(`🗑️ Usunięto ${snapshot.size} przypisań dla sesji ${sessionId}`);

    return { success: true, deletedCount: snapshot.size };
  } catch (error) {
    console.error('❌ Błąd usuwania przypisań sesji:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Usuń wszystkie przypisania dla kalkulacji (gdy kalkulacja jest usuwana z katalogu)
 */
export async function deleteCalculationAssignments(calculationId) {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('calculationId', '==', calculationId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map(docSnap =>
      deleteDoc(doc(db, COLLECTION_NAME, docSnap.id))
    );

    await Promise.all(deletePromises);
    console.log(`🗑️ Usunięto ${snapshot.size} przypisań dla kalkulacji ${calculationId}`);

    return { success: true, deletedCount: snapshot.size };
  } catch (error) {
    console.error('❌ Błąd usuwania przypisań kalkulacji:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Pobierz wszystkie przypisania stanowisk (dla dashboardu)
 */
export async function getAllWorkstationAssignments() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));

    const assignments = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    console.log(`📊 Pobrano ${assignments.length} przypisań stanowisk z Firestore`);

    return { success: true, assignments };
  } catch (error) {
    console.error('❌ Błąd pobierania przypisań:', error);
    return { success: false, error: error.message, assignments: [] };
  }
}

/**
 * Pobierz przypisania dla konkretnej kalkulacji
 */
export async function getCalculationAssignments(calculationId) {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('calculationId', '==', calculationId));
    const snapshot = await getDocs(q);

    const assignments = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    return { success: true, assignments };
  } catch (error) {
    console.error('❌ Błąd pobierania przypisań kalkulacji:', error);
    return { success: false, error: error.message, assignments: [] };
  }
}

/**
 * Aktualizuj calculationId dla wszystkich przypisań sesji
 * (wywoływane gdy kalkulacja jest zapisywana do katalogu)
 */
export async function updateSessionCalculationId(sessionId, calculationId) {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map(docSnap =>
      setDoc(doc(db, COLLECTION_NAME, docSnap.id), {
        ...docSnap.data(),
        calculationId,
        updatedAt: serverTimestamp()
      })
    );

    await Promise.all(updatePromises);
    console.log(`✅ Zaktualizowano calculationId dla ${snapshot.size} przypisań sesji ${sessionId}`);

    return { success: true, updatedCount: snapshot.size };
  } catch (error) {
    console.error('❌ Błąd aktualizacji calculationId:', error);
    return { success: false, error: error.message };
  }
}
