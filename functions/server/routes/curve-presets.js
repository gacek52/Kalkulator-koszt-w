const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticate } = require('../middleware/auth');

/**
 * API endpoints dla presetów krzywych
 *
 * Struktura presetu:
 * {
 *   id: string,
 *   name: string,
 *   description: string,
 *   curves: {
 *     editingCurves: { baking, cleaning, bruttoWeight, heatshieldPrep, heatshieldLaser },
 *     customCurves: Array
 *   },
 *   createdBy: string (uid),
 *   createdByName: string,
 *   createdAt: timestamp,
 *   isGlobal: boolean (tylko admin może tworzyć globalne)
 * }
 */

const db = admin.firestore();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/curve-presets - Pobierz wszystkie presety (globalne + użytkownika)
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.uid;

    // Pobierz presety: globalne lub utworzone przez użytkownika
    const snapshot = await db.collection('curvePresets')
      .where('isGlobal', '==', true)
      .get();

    const userSnapshot = await db.collection('curvePresets')
      .where('createdBy', '==', userId)
      .get();

    const presets = [];
    const seenIds = new Set();

    snapshot.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        presets.push({ id: doc.id, ...doc.data() });
        seenIds.add(doc.id);
      }
    });

    userSnapshot.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        presets.push({ id: doc.id, ...doc.data() });
        seenIds.add(doc.id);
      }
    });

    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/curve-presets/:id - Pobierz pojedynczy preset
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const doc = await db.collection('curvePresets').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Preset nie znaleziony'
      });
    }

    const preset = { id: doc.id, ...doc.data() };

    // Sprawdź uprawnienia - globalny lub własny
    if (!preset.isGlobal && preset.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień do tego presetu'
      });
    }

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/curve-presets - Utwórz nowy preset
router.post('/', async (req, res, next) => {
  try {
    const { name, description, curves, isGlobal } = req.body;
    const userId = req.user.uid;
    const userName = req.user.displayName || req.user.email || 'Unknown';
    const isAdmin = req.user.role === 'admin';

    // Walidacja
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nazwa presetu jest wymagana'
      });
    }

    if (!curves || typeof curves !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Krzywe są wymagane'
      });
    }

    // Tylko admin może tworzyć globalne presety
    const makeGlobal = isGlobal && isAdmin;

    const newPreset = {
      name: name.trim(),
      description: description?.trim() || '',
      curves,
      createdBy: userId,
      createdByName: userName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isGlobal: makeGlobal
    };

    const docRef = await db.collection('curvePresets').add(newPreset);
    const doc = await docRef.get();
    const savedPreset = { id: doc.id, ...doc.data() };

    res.status(201).json({
      success: true,
      data: savedPreset,
      message: `Preset "${name}" został utworzony`
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/curve-presets/:id - Aktualizuj preset
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, curves, isGlobal } = req.body;
    const userId = req.user.uid;
    const isAdmin = req.user.role === 'admin';

    // Pobierz istniejący preset
    const doc = await db.collection('curvePresets').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Preset nie znaleziony'
      });
    }

    const existingPreset = doc.data();

    // Sprawdź uprawnienia - właściciel lub admin
    if (existingPreset.createdBy !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień do edycji tego presetu'
      });
    }

    // Walidacja
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nazwa presetu nie może być pusta'
      });
    }

    const updates = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(curves && { curves }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Tylko admin może zmieniać isGlobal
    if (isAdmin && isGlobal !== undefined) {
      updates.isGlobal = isGlobal;
    }

    await db.collection('curvePresets').doc(id).update(updates);
    const updatedDoc = await db.collection('curvePresets').doc(id).get();
    const updatedPreset = { id: updatedDoc.id, ...updatedDoc.data() };

    res.json({
      success: true,
      data: updatedPreset,
      message: 'Preset zaktualizowany'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/curve-presets/:id - Usuń preset
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const isAdmin = req.user.role === 'admin';

    // Pobierz preset
    const doc = await db.collection('curvePresets').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Preset nie znaleziony'
      });
    }

    const preset = doc.data();

    // Sprawdź uprawnienia - właściciel lub admin
    if (preset.createdBy !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Brak uprawnień do usunięcia tego presetu'
      });
    }

    await db.collection('curvePresets').doc(id).delete();

    res.json({
      success: true,
      message: `Preset "${preset.name}" został usunięty`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
