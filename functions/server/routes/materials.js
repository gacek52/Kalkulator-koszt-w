const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Materials Routes
 * Zarządza danymi materiałów
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/materials - Pobierz wszystkie materiały
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const materials = await storage.getAll('materials');

    res.json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/materials/:id - Pobierz materiał
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const material = await storage.getById('materials', req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material not found' }
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/materials - Stwórz nowy materiał
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required field: name' }
      });
    }

    const newMaterial = await storage.create('materials', req.body);

    res.status(201).json({
      success: true,
      data: newMaterial,
      message: 'Material created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/materials/:id - Zaktualizuj materiał
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedMaterial = await storage.update('materials', req.params.id, req.body);

    if (!updatedMaterial) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material not found' }
      });
    }

    res.json({
      success: true,
      data: updatedMaterial,
      message: 'Material updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/materials/:id - Usuń materiał
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('materials', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Material not found' }
      });
    }

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
