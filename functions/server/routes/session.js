const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Session Routes
 * Zarządza sesją roboczą użytkownika
 *
 * Sesje są per-user - każdy użytkownik ma swoją sesję w sessions/{userId}
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/session?userId=xxx - Pobierz aktywną sesję dla użytkownika
router.get('/', async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId parameter' }
      });
    }

    // Sprawdź, czy użytkownik próbuje pobrać swoją sesję
    if (userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied - can only access your own session' }
      });
    }

    const storage = getInstance();
    const session = await storage.getById('sessions', userId);

    res.json({
      success: true,
      data: session,
      hasSession: session !== null
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/session - Zapisz/zaktualizuj sesję (userId w body)
router.post('/', async (req, res, next) => {
  try {
    const { userId, ...sessionData } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId in request body' }
      });
    }

    // Sprawdź, czy użytkownik próbuje zapisać swoją sesję
    if (userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied - can only save your own session' }
      });
    }

    const storage = getInstance();

    // Użyj create/update zamiast set, aby mieć kontrolę nad ID
    const existingSession = await storage.getById('sessions', userId);

    let session;
    if (existingSession) {
      // Update
      session = await storage.update('sessions', userId, sessionData);
    } else {
      // Create - force ID to be userId
      session = await storage.db.collection('sessions').doc(userId).set({
        ...sessionData,
        createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp(),
        updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
      });

      const doc = await storage.db.collection('sessions').doc(userId).get();
      session = {
        id: doc.id,
        ...doc.data()
      };
    }

    res.json({
      success: true,
      data: session,
      message: 'Session saved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/session?userId=xxx - Usuń sesję użytkownika
router.delete('/', async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing userId parameter' }
      });
    }

    // Sprawdź, czy użytkownik próbuje usunąć swoją sesję
    if (userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied - can only delete your own session' }
      });
    }

    const storage = getInstance();
    await storage.delete('sessions', userId);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
