const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');

/**
 * Session Routes
 * Zarządza sesją roboczą użytkownika
 *
 * W przeciwieństwie do innych kolekcji, session przechowuje
 * tylko jedną sesję na raz (nie tablicę)
 */

// GET /api/session - Pobierz aktywną sesję
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const session = await storage.get('session');

    res.json({
      success: true,
      data: session,
      hasSession: session !== null
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/session - Zapisz/zaktualizuj sesję
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const session = await storage.set('session', req.body);

    res.json({
      success: true,
      data: session,
      message: 'Session saved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/session - Usuń sesję
router.delete('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    await storage.set('session', null);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
