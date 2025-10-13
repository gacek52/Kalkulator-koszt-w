const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/storage');
const { authenticate } = require('../middleware/auth');

/**
 * Clients Routes
 * Zarządza danymi klientów
 */

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/clients - Pobierz wszystkich klientów
router.get('/', async (req, res, next) => {
  try {
    const storage = getInstance();
    const clients = await storage.getAll('clients');

    res.json({
      success: true,
      data: clients,
      count: clients.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id - Pobierz klienta
router.get('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const client = await storage.getById('clients', req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client not found' }
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/clients - Stwórz nowego klienta
router.post('/', async (req, res, next) => {
  try {
    const storage = getInstance();

    if (!req.body.name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required field: name' }
      });
    }

    const newClient = await storage.create('clients', req.body);

    res.status(201).json({
      success: true,
      data: newClient,
      message: 'Client created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/clients/:id - Zaktualizuj klienta
router.put('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const updatedClient = await storage.update('clients', req.params.id, req.body);

    if (!updatedClient) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client not found' }
      });
    }

    res.json({
      success: true,
      data: updatedClient,
      message: 'Client updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/clients/:id - Usuń klienta
router.delete('/:id', async (req, res, next) => {
  try {
    const storage = getInstance();
    const deleted = await storage.delete('clients', req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Client not found' }
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
