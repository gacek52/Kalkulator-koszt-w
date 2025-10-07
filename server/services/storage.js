const fs = require('fs');
const path = require('path');

/**
 * Storage Service - Abstrakcja nad zapisem danych
 *
 * Obecnie używa JSON files, ale struktura jest zaprojektowana
 * tak aby łatwo zamienić na Firebase Firestore w przyszłości.
 *
 * Firebase Firestore migration notes:
 * - collection() → db.collection()
 * - getAll() → collection.get()
 * - getById() → collection.doc(id).get()
 * - create() → collection.add() lub doc().set()
 * - update() → collection.doc(id).update()
 * - delete() → collection.doc(id).delete()
 */

class StorageService {
  constructor(dataDir) {
    this.dataDir = dataDir;
  }

  /**
   * Odczytaj wszystkie dokumenty z kolekcji
   * @param {string} collection - Nazwa kolekcji (np. 'catalog', 'clients')
   * @returns {Array} - Tablica dokumentów
   */
  async getAll(collection) {
    try {
      const filePath = this._getFilePath(collection);
      const data = await this._readFile(filePath);
      return JSON.parse(data);
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
    const items = await this.getAll(collection);
    return items.find(item => item.id === id) || null;
  }

  /**
   * Stwórz nowy dokument w kolekcji
   * @param {string} collection - Nazwa kolekcji
   * @param {Object} data - Dane dokumentu (bez ID)
   * @returns {Object} - Stworzony dokument z ID
   */
  async create(collection, data) {
    const items = await this.getAll(collection);
    const newItem = {
      id: this._generateId(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    await this._saveAll(collection, items);
    return newItem;
  }

  /**
   * Zaktualizuj istniejący dokument
   * @param {string} collection - Nazwa kolekcji
   * @param {string} id - ID dokumentu
   * @param {Object} data - Nowe dane
   * @returns {Object|null} - Zaktualizowany dokument lub null
   */
  async update(collection, id, data) {
    const items = await this.getAll(collection);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      return null;
    }

    items[index] = {
      ...items[index],
      ...data,
      id, // Zachowaj oryginalne ID
      updatedAt: new Date().toISOString()
    };

    await this._saveAll(collection, items);
    return items[index];
  }

  /**
   * Usuń dokument
   * @param {string} collection - Nazwa kolekcji
   * @param {string} id - ID dokumentu
   * @returns {boolean} - true jeśli usunięto
   */
  async delete(collection, id) {
    const items = await this.getAll(collection);
    const filtered = items.filter(item => item.id !== id);

    if (filtered.length === items.length) {
      return false; // Nie znaleziono
    }

    await this._saveAll(collection, filtered);
    return true;
  }

  /**
   * Zapisz pojedynczy dokument (dla session)
   * @param {string} collection - Nazwa kolekcji
   * @param {Object} data - Dane do zapisu
   * @returns {Object} - Zapisane dane
   */
  async set(collection, data) {
    const filePath = this._getFilePath(collection);
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await this._writeFile(filePath, JSON.stringify(dataWithTimestamp, null, 2));
    return dataWithTimestamp;
  }

  /**
   * Odczytaj pojedynczy dokument (dla session)
   * @param {string} collection - Nazwa kolekcji
   * @returns {Object|null} - Dane lub null
   */
  async get(collection) {
    try {
      const filePath = this._getFilePath(collection);
      const data = await this._readFile(filePath);
      const parsed = JSON.parse(data);
      return parsed === null ? null : parsed;
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return null;
    }
  }

  // Private methods

  _getFilePath(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }

  _readFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  _writeFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async _saveAll(collection, items) {
    const filePath = this._getFilePath(collection);
    await this._writeFile(filePath, JSON.stringify(items, null, 2));
  }

  _generateId() {
    // Generuj ID podobne do Firebase (timestamp + random)
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  initialize: (dataDir) => {
    if (!instance) {
      instance = new StorageService(dataDir);
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
