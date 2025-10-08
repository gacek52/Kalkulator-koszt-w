const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');

/**
 * Catalog Routes
 *
 * Zarządza zapisanymi kalkulacjami w katalogu
 *
 * Firebase migration: Te endpointy będą działać z Cloud Functions
 */

// GET /api/catalog - Pobierz metadata wszystkich kalkulacji
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    // Zwraca tylko metadata z catalog.json (szybkie)
    const calculations = await storage.getAll('catalog');

    res.json({
      success: true,
      data: calculations,
      count: calculations.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/:id - Pobierz pełną kalkulację
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    // Zwraca pełne dane z calculations/{id}.json
    const calculation = await storage.getCalculationFull(req.params.id);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calculation not found' }
      });
    }

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/catalog - Stwórz nową kalkulację
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Walidacja tylko że req.body nie jest pusty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Request body cannot be empty' }
      });
    }

    // Metadata wyciągnięte z req.body
    const metadata = {
      client: req.body.client,
      status: req.body.status,
      notes: req.body.notes,
      createdDate: req.body.createdDate,
      catalogId: req.body.catalogId,
      clientId: req.body.clientId,
      clientCity: req.body.clientCity,
      totalRevenue: req.body.totalRevenue,
      totalProfit: req.body.totalProfit
    };

    // Zapisz kalkulację (metadata + pełne dane)
    const savedMetadata = await storage.saveCalculation(metadata, req.body);

    res.status(201).json({
      success: true,
      data: savedMetadata,
      message: 'Calculation created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/catalog/:id - Zaktualizuj kalkulację
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Metadata wyciągnięte z req.body
    const metadata = {
      id: req.params.id, // Zachowaj ID
      client: req.body.client,
      status: req.body.status,
      notes: req.body.notes,
      createdDate: req.body.createdDate,
      catalogId: req.body.catalogId,
      clientId: req.body.clientId,
      clientCity: req.body.clientCity,
      totalRevenue: req.body.totalRevenue,
      totalProfit: req.body.totalProfit
    };

    // Zapisz kalkulację (nadpisz istniejące pliki)
    const savedMetadata = await storage.saveCalculation(metadata, req.body);

    res.json({
      success: true,
      data: savedMetadata,
      message: 'Calculation updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/catalog/:id - Usuń kalkulację (metadata + plik)
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Usuwa catalog.json metadata + calculations/{id}.json
    const deleted = await storage.deleteCalculation(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calculation not found' }
      });
    }

    res.json({
      success: true,
      message: 'Calculation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/search/:query - Wyszukaj kalkulacje
router.get('/search/:query', async (req, res, next) => {
  try {
    const storage = getInstance();
    const allCalculations = await storage.getAll('catalog');

    const query = req.params.query.toLowerCase();
    const filtered = allCalculations.filter(calc => {
      const meta = calc.calculationMeta || {};
      return (
        (meta.client && meta.client.toLowerCase().includes(query)) ||
        (meta.description && meta.description.toLowerCase().includes(query)) ||
        (meta.catalogId && meta.catalogId.toLowerCase().includes(query))
      );
    });

    res.json({
      success: true,
      data: filtered,
      count: filtered.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
