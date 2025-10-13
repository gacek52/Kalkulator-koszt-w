const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Material Types Routes
 * Zarządza typami materiałów (E-glass, HT800, itp.)
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/material-types - Pobierz wszystkie typy materiałów
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const materialTypes = await storage.getAll('materialTypes');

    res.json({
      success: true,
      data: materialTypes,
      count: materialTypes.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/material-types/:id - Pobierz typ materiału
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const materialType = await storage.getById('materialTypes', req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material type not found' }
      });
    }

    res.json({
      success: true,
      data: materialType
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/material-types - Stwórz nowy typ materiału
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Walidacja
    if (!req.body.name || req.body.pricePerKg === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: name, pricePerKg' }
      });
    }

    const newMaterialType = await storage.create('materialTypes', req.body);

    res.status(201).json({
      success: true,
      data: newMaterialType,
      message: 'Material type created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/material-types/:id - Zaktualizuj typ materiału
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedMaterialType = await storage.update('materialTypes', req.params.id, req.body);

    if (!updatedMaterialType) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material type not found' }
      });
    }

    res.json({
      success: true,
      data: updatedMaterialType,
      message: 'Material type updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/material-types/:id - Usuń typ materiału
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('materialTypes', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material type not found' }
      });
    }

    res.json({
      success: true,
      message: 'Material type deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
