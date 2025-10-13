const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Packaging Types Routes
 * Zarządza typami opakowań (Karton B1, B2, B4, itp.)
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/packaging-types - Pobierz wszystkie typy opakowań
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const packagingTypes = await storage.getAll('packagingTypes');

    res.json({
      success: true,
      data: packagingTypes,
      count: packagingTypes.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/packaging-types/:id - Pobierz typ opakowania
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const packagingType = await storage.getById('packagingTypes', req.params.id);

    if (!packagingType) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging type not found' }
      });
    }

    res.json({
      success: true,
      data: packagingType
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/packaging-types - Stwórz nowy typ opakowania
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Walidacja
    if (!req.body.name || !req.body.dimensions || req.body.cost === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: name, dimensions, cost' }
      });
    }

    const newPackagingType = await storage.create('packagingTypes', req.body);

    res.status(201).json({
      success: true,
      data: newPackagingType,
      message: 'Packaging type created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/packaging-types/:id - Zaktualizuj typ opakowania
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedPackagingType = await storage.update('packagingTypes', req.params.id, req.body);

    if (!updatedPackagingType) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging type not found' }
      });
    }

    res.json({
      success: true,
      data: updatedPackagingType,
      message: 'Packaging type updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/packaging-types/:id - Usuń typ opakowania
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('packagingTypes', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging type not found' }
      });
    }

    res.json({
      success: true,
      message: 'Packaging type deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
