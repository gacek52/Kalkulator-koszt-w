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
    // Generuj ID w formacie: RRMMDD-NN (np. 251008-01)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 2025 -> 25
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Znajdź najwyższy numer dla dzisiejszego dnia
    try {
      const catalogPath = path.join(this.dataDir, 'catalog.json');
      let existingIds = [];

      if (fs.existsSync(catalogPath)) {
        const data = fs.readFileSync(catalogPath, 'utf8');
        const catalog = JSON.parse(data);
        existingIds = catalog
          .map(item => item.id)
          .filter(id => id && id.startsWith(datePrefix));
      }

      // Znajdź najwyższy numer
      let maxNumber = 0;
      existingIds.forEach(id => {
        const match = id.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });

      const nextNumber = String(maxNumber + 1).padStart(2, '0');
      return `${datePrefix}-${nextNumber}`;
    } catch (error) {
      console.error('Error generating ID, using fallback:', error);
      // Fallback: użyj timestamp jeśli coś pójdzie nie tak
      return `${datePrefix}-${Date.now().toString().slice(-4)}`;
    }
  }

  /**
   * CALCULATION-SPECIFIC METHODS
   * Kalkulacje przechowywane są w dwóch miejscach:
   * - catalog.json - metadata (ID, klient, status, obrót, przychód, items)
   * - calculations/{id}.json - pełna kalkulacja (tabs, curves, itp.)
   */

  /**
   * Zapisz kalkulację (metadata + pełne dane)
   */
  async saveCalculation(metadata, fullData) {
    const id = metadata.id || this._generateId();

    // Metadata do catalog.json
    const metadataToSave = {
      id,
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
      items: fullData.items || [], // Items do wyświetlenia w katalogu
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Pełne dane do calculations/{id}.json
    const fullDataToSave = {
      id,
      ...fullData,
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Zapisz metadata do catalog.json
    const catalogItems = await this.getAll('catalog');
    const existingIndex = catalogItems.findIndex(item => item.id === id);

    if (existingIndex >= 0) {
      catalogItems[existingIndex] = metadataToSave;
    } else {
      catalogItems.push(metadataToSave);
    }

    await this._saveAll('catalog', catalogItems);

    // Zapisz pełne dane do calculations/{id}.json
    const calculationPath = path.join(this.dataDir, 'calculations', `${id}.json`);
    await this._writeFile(calculationPath, JSON.stringify(fullDataToSave, null, 2));

    return metadataToSave;
  }

  /**
   * Pobierz pełną kalkulację
   */
  async getCalculationFull(id) {
    try {
      const calculationPath = path.join(this.dataDir, 'calculations', `${id}.json`);
      const data = await this._readFile(calculationPath);
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading calculation ${id}:`, error);
      return null;
    }
  }

  /**
   * Usuń kalkulację (metadata + pełne dane)
   */
  async deleteCalculation(id) {
    // Usuń z catalog.json
    const catalogItems = await this.getAll('catalog');
    const filtered = catalogItems.filter(item => item.id !== id);

    if (filtered.length === catalogItems.length) {
      return false; // Nie znaleziono
    }

    await this._saveAll('catalog', filtered);

    // Usuń plik calculations/{id}.json
    try {
      const calculationPath = path.join(this.dataDir, 'calculations', `${id}.json`);
      await new Promise((resolve, reject) => {
        fs.unlink(calculationPath, (err) => {
          if (err && err.code !== 'ENOENT') reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.error(`Error deleting calculation file ${id}:`, error);
    }

    return true;
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
