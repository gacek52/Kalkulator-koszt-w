const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Material Compositions Routes
 * Zarządza kompozycjami materiałów (grubość + gęstość)
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/material-compositions - Pobierz wszystkie kompozycje
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const compositions = await storage.getAll('materialCompositions');

    res.json({
      success: true,
      data: compositions,
      count: compositions.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/material-compositions/:id - Pobierz kompozycję
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const composition = await storage.getById('materialCompositions', req.params.id);

    if (!composition) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material composition not found' }
      });
    }

    res.json({
      success: true,
      data: composition
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/material-compositions - Stwórz nową kompozycję
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Walidacja
    if (!req.body.materialTypeId || req.body.thickness === undefined || req.body.density === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: materialTypeId, thickness, density' }
      });
    }

    const newComposition = await storage.create('materialCompositions', req.body);

    res.status(201).json({
      success: true,
      data: newComposition,
      message: 'Material composition created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/material-compositions/:id - Zaktualizuj kompozycję
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedComposition = await storage.update('materialCompositions', req.params.id, req.body);

    if (!updatedComposition) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material composition not found' }
      });
    }

    res.json({
      success: true,
      data: updatedComposition,
      message: 'Material composition updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/material-compositions/:id - Usuń kompozycję
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('materialCompositions', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material composition not found' }
      });
    }

    res.json({
      success: true,
      message: 'Material composition deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
