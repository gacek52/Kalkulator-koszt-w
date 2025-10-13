const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Packaging Compositions Routes
 * Zarządza kompozycjami pakowania (opakowania per paleta, palety per przestrzeń, itp.)
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/packaging-compositions - Pobierz wszystkie kompozycje
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const compositions = await storage.getAll('packagingCompositions');

    res.json({
      success: true,
      data: compositions,
      count: compositions.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/packaging-compositions/:id - Pobierz kompozycję
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const composition = await storage.getById('packagingCompositions', req.params.id);

    if (!composition) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging composition not found' }
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

// POST /api/packaging-compositions - Stwórz nową kompozycję
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    // Walidacja
    if (!req.body.name || !req.body.packagingTypeId ||
        req.body.packagesPerPallet === undefined ||
        req.body.palletsPerSpace === undefined) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: name, packagingTypeId, packagesPerPallet, palletsPerSpace' }
      });
    }

    const newComposition = await storage.create('packagingCompositions', req.body);

    res.status(201).json({
      success: true,
      data: newComposition,
      message: 'Packaging composition created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/packaging-compositions/:id - Zaktualizuj kompozycję
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedComposition = await storage.update('packagingCompositions', req.params.id, req.body);

    if (!updatedComposition) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging composition not found' }
      });
    }

    res.json({
      success: true,
      data: updatedComposition,
      message: 'Packaging composition updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/packaging-compositions/:id - Usuń kompozycję
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('packagingCompositions', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging composition not found' }
      });
    }

    res.json({
      success: true,
      message: 'Packaging composition deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
