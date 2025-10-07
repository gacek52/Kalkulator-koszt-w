const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');

/**
 * Packaging Routes
 * Zarządza danymi opakowań
 */

// GET /api/packaging - Pobierz wszystkie opakowania
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const packaging = await storage.getAll('packaging');

    res.json({
      success: true,
      data: packaging,
      count: packaging.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/packaging/:id - Pobierz opakowanie
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const pkg = await storage.getById('packaging', req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging not found' }
      });
    }

    res.json({
      success: true,
      data: pkg
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/packaging - Stwórz nowe opakowanie
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required field: name' }
      });
    }

    const newPackaging = await storage.create('packaging', req.body);

    res.status(201).json({
      success: true,
      data: newPackaging,
      message: 'Packaging created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/packaging/:id - Zaktualizuj opakowanie
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedPackaging = await storage.update('packaging', req.params.id, req.body);

    if (!updatedPackaging) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging not found' }
      });
    }

    res.json({
      success: true,
      data: updatedPackaging,
      message: 'Packaging updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/packaging/:id - Usuń opakowanie
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('packaging', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Packaging not found' }
      });
    }

    res.json({
      success: true,
      message: 'Packaging deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
