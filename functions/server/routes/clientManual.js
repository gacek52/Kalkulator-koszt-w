const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Client Manual Routes
 * Zarządza danymi instrukcji klientów
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/client-manual - Pobierz wszystkie instrukcje
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const clientManual = await storage.getAll('clientManual');

    res.json({
      success: true,
      data: clientManual,
      count: clientManual.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/client-manual/:id - Pobierz instrukcję
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const manual = await storage.getById('clientManual', req.params.id);

    if (!manual) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client manual not found' }
      });
    }

    res.json({
      success: true,
      data: manual
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/client-manual - Stwórz nową instrukcję
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const newManual = await storage.create('clientManual', req.body);

    res.status(201).json({
      success: true,
      data: newManual,
      message: 'Client manual created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/client-manual/:id - Zaktualizuj instrukcję
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedManual = await storage.update('clientManual', req.params.id, req.body);

    if (!updatedManual) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client manual not found' }
      });
    }

    res.json({
      success: true,
      data: updatedManual,
      message: 'Client manual updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/client-manual/:id - Usuń instrukcję
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('clientManual', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client manual not found' }
      });
    }

    res.json({
      success: true,
      message: 'Client manual deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
