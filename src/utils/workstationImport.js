/**
 * Utility do importu stanowisk produkcyjnych do Firestore
 * Może być wywołane przez admina z poziomu UI
 */

import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const defaultWorkstations = [
  {
    "name": "Prasa",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 1
  },
  {
    "name": "Prasa (rolsztanca) 1",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 2
  },
  {
    "name": "Prasa (rolsztanca) 2",
    "type": "Prasa",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 3
  },
  {
    "name": "Klejenie Scania 1",
    "type": "Ręczne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 4
  },
  {
    "name": "Klejenie Scania 2",
    "type": "Ręczne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 5
  },
  {
    "name": "Gilotyna",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 6
  },
  {
    "name": "Piec do kształtek",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.8,
    "costPer8h": 0,
    "id": 7
  },
  {
    "name": "Karuzela do kształtek",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 8
  },
  {
    "name": "Płyta grzewcza1",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 9
  },
  {
    "name": "Stanowisko przygotówki 1",
    "type": "Inne",
    "shiftsPerDay": 3,
    "hoursPerShift": 8,
    "workDaysPerWeek": 5,
    "holidaysPerYear": 10,
    "efficiency": 0.85,
    "costPer8h": 0,
    "id": 12
  }
];

/**
 * Importuje domyślne stanowiska do Firestore
 * Wymaga uprawnień admina
 */
export async function importDefaultWorkstations(onProgress) {
  const results = {
    success: 0,
    errors: 0,
    total: defaultWorkstations.length,
    details: []
  };

  for (const workstation of defaultWorkstations) {
    try {
      const docRef = doc(db, 'workstations', `ws_${workstation.id}`);
      await setDoc(docRef, workstation);

      results.success++;
      results.details.push({
        status: 'success',
        workstation: workstation.name,
        id: workstation.id
      });

      if (onProgress) {
        onProgress({
          current: results.success + results.errors,
          total: results.total,
          workstation: workstation.name
        });
      }
    } catch (error) {
      results.errors++;
      results.details.push({
        status: 'error',
        workstation: workstation.name,
        id: workstation.id,
        error: error.message
      });

      if (onProgress) {
        onProgress({
          current: results.success + results.errors,
          total: results.total,
          workstation: workstation.name,
          error: error.message
        });
      }
    }
  }

  return results;
}
