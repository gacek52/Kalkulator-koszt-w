const admin = require('firebase-admin');

/**
 * Storage Service - Firestore Implementation
 *
 * Pełna implementacja używająca Firebase Firestore zamiast lokalnych plików JSON.
 * API pozostaje identyczne z wersją JSON-ową dla zachowania kompatybilności.
 */

class FirestoreStorageService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Odczytaj wszystkie dokumenty z kolekcji
   * @param {string} collection - Nazwa kolekcji (np. 'catalog', 'clients')
   * @returns {Array} - Tablica dokumentów
   */
  async getAll(collection) {
    try {
      const snapshot = await this.db.collection(collection).get();
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return documents;
    } catch (error) {
      console.error(`Error reading collection ${collection}:`, error);
      return [];
    }
  }

  /**
   * Znajdź dokument po ID
   * @param {string} collection - Nazwa kolekcji
   * @param {string} id - ID dokumentu
   * @returns {Object|null} - Znaleziony dokument lub null
   */
  async getById(collection, id) {
    try {
      const doc = await this.db.collection(collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error reading document ${id} from ${collection}:`, error);
      return null;
    }
  }

  /**
   * Stwórz nowy dokument w kolekcji
   * @param {string} collection - Nazwa kolekcji
   * @param {Object} data - Dane dokumentu (bez ID)
   * @returns {Object} - Stworzony dokument z ID
   */
  async create(collection, data) {
    try {
      const newItem = {
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.db.collection(collection).add(newItem);
      const doc = await docRef.get();

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Zaktualizuj istniejący dokument
   * @param {string} collection - Nazwa kolekcji
   * @param {string} id - ID dokumentu
   * @param {Object} data - Nowe dane
   * @returns {Object|null} - Zaktualizowany dokument lub null
   */
  async update(collection, id, data) {
    try {
      const docRef = this.db.collection(collection).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      const updateData = {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.update(updateData);

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data()
      };
    } catch (error) {
      console.error(`Error updating document ${id} in ${collection}:`, error);
      return null;
    }
  }

  /**
   * Usuń dokument
   * @param {string} collection - Nazwa kolekcji
   * @param {string} id - ID dokumentu
   * @returns {boolean} - true jeśli usunięto
   */
  async delete(collection, id) {
    try {
      const docRef = this.db.collection(collection).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return false;
      }

      await docRef.delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collection}:`, error);
      return false;
    }
  }

  /**
   * Zapisz pojedynczy dokument (dla session)
   * @param {string} collection - Nazwa kolekcji
   * @param {Object} data - Dane do zapisu
   * @returns {Object} - Zapisane dane
   */
  async set(collection, data) {
    try {
      const docRef = this.db.collection(collection).doc('current');
      const dataWithTimestamp = {
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await docRef.set(dataWithTimestamp, { merge: true });

      const doc = await docRef.get();
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error setting document in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Odczytaj pojedynczy dokument (dla session)
   * @param {string} collection - Nazwa kolekcji
   * @returns {Object|null} - Dane lub null
   */
  async get(collection) {
    try {
      const doc = await this.db.collection(collection).doc('current').get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return null;
    }
  }

  /**
   * CALCULATION-SPECIFIC METHODS
   * Kalkulacje przechowywane są w dwóch miejscach:
   * - catalog collection - metadata (ID, klient, status, obrót, przychód, items)
   * - calculations collection - pełna kalkulacja (tabs, curves, itp.)
   */

  /**
   * Zapisz kalkulację (metadata + pełne dane)
   */
  async saveCalculation(metadata, fullData) {
    try {
      const id = metadata.id || this._generateId();

      // Metadata do catalog collection
      const metadataToSave = {
        client: metadata.client || '',
        status: metadata.status || 'draft',
        notes: metadata.notes || '',
        createdDate: metadata.createdDate || new Date().toISOString(),
        modifiedDate: new Date().toISOString(),
        catalogId: metadata.catalogId || null,
        clientId: metadata.clientId || null,
        clientCity: metadata.clientCity || '',
        totalRevenue: metadata.totalRevenue || 0,
        totalProfit: metadata.totalProfit || 0,
        items: fullData.items || [],
        ownerId: metadata.ownerId || null, // ID właściciela z Firebase Auth
        ownerName: metadata.ownerName || null, // Nazwa właściciela (nickname)
        sharedAccess: metadata.sharedAccess || false, // Czy kalkulacja jest współdzielona
        createdAt: metadata.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Pełne dane do calculations collection
      const fullDataToSave = {
        ...fullData,
        createdAt: metadata.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Zapisz metadata do catalog
      await this.db.collection('catalog').doc(id).set(metadataToSave, { merge: true });

      // Zapisz pełne dane do calculations
      await this.db.collection('calculations').doc(id).set(fullDataToSave, { merge: true });

      return {
        id,
        ...metadataToSave
      };
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw error;
    }
  }

  /**
   * Pobierz pełną kalkulację
   */
  async getCalculationFull(id) {
    try {
      const doc = await this.db.collection('calculations').doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error reading calculation ${id}:`, error);
      return null;
    }
  }

  /**
   * Usuń kalkulację (metadata + pełne dane)
   */
  async deleteCalculation(id) {
    try {
      const batch = this.db.batch();

      const catalogRef = this.db.collection('catalog').doc(id);
      const calculationRef = this.db.collection('calculations').doc(id);

      // Sprawdź czy istnieje
      const catalogDoc = await catalogRef.get();
      if (!catalogDoc.exists) {
        return false;
      }

      batch.delete(catalogRef);
      batch.delete(calculationRef);

      await batch.commit();
      return true;
    } catch (error) {
      console.error(`Error deleting calculation ${id}:`, error);
      return false;
    }
  }

  /**
   * Generuj ID w formacie RRMMDD-NN
   */
  _generateId() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Używamy timestamp jako unikalnego sufiksu
    // W production można to ulepszyć używając Firestore counter
    const uniqueSuffix = String(Date.now()).slice(-4);

    return `${datePrefix}-${uniqueSuffix}`;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  initialize: () => {
    if (!instance) {
      instance = new FirestoreStorageService();
    }
    return instance;
  },
  getInstance: () => {
    if (!instance) {
      throw new Error('Storage service not initialized. Call initialize() first.');
    }
    return instance;
  }
};
