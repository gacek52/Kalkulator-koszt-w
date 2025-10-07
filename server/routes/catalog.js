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

// GET /api/catalog - Pobierz wszystkie kalkulacje
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
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

// GET /api/catalog/:id - Pobierz konkretną kalkulację
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const calculation = await storage.getById('catalog', req.params.id);

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

    // Walidacja podstawowych pól
    if (!req.body.calculationMeta || !req.body.tabs) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: calculationMeta, tabs' }
      });
    }

    const newCalculation = await storage.create('catalog', req.body);

    res.status(201).json({
      success: true,
      data: newCalculation,
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

    const updatedCalculation = await storage.update('catalog', req.params.id, req.body);

    if (!updatedCalculation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calculation not found' }
      });
    }

    res.json({
      success: true,
      data: updatedCalculation,
      message: 'Calculation updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/catalog/:id - Usuń kalkulację
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();

    const deleted = await storage.delete('catalog', req.params.id);

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
