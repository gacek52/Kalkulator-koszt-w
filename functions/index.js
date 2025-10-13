const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

// Import Firestore storage service
const storageService = require('./server/services/storage-firestore');

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, { query: req.query, body: req.body });
  next();
});

// Initialize Firestore storage service
storageService.initialize();

// API Routes (bez prefiksu /api bo URL już go zawiera)
// Firebase Functions URL: https://.../api/catalog
app.use('/catalog', require('./server/routes/catalog'));
app.use('/clients', require('./server/routes/clients'));
app.use('/materials', require('./server/routes/materials'));
app.use('/packaging', require('./server/routes/packaging'));
app.use('/client-manual', require('./server/routes/clientManual'));
app.use('/session', require('./server/routes/session'));

// New modular routes for materials and packaging
app.use('/material-types', require('./server/routes/material-types'));
app.use('/material-compositions', require('./server/routes/material-compositions'));
app.use('/packaging-types', require('./server/routes/packaging-types'));
app.use('/packaging-compositions', require('./server/routes/packaging-compositions'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware (musi być na końcu!)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Export Express app as Firebase Function
exports.api = functions.https.onRequest(app);

// One-time initialization function
// Call once: https://us-central1-kalkulator-produkcyjny---alpha.cloudfunctions.net/initializeDatabase
exports.initializeDatabase = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();

    // Import default data (will be moved to a separate file later if needed)
    const {
      defaultClients,
      defaultMaterialTypes,
      defaultMaterialCompositions,
      defaultPackagingTypes,
      defaultPackagingCompositions
    } = require('./init-data-source');

    const results = {
      clients: 0,
      materialTypes: 0,
      materialCompositions: 0,
      packagingTypes: 0,
      packagingCompositions: 0
    };

    // 1. Klienci
    const clientsRef = db.collection('clients');
    const existingClients = await clientsRef.limit(1).get();
    if (existingClients.empty) {
      for (const client of defaultClients) {
        await clientsRef.doc(client.id).set({
          ...client,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        results.clients++;
      }
    }

    // 2. Typy materiałów
    const materialTypesRef = db.collection('materialTypes');
    const existingMaterialTypes = await materialTypesRef.limit(1).get();
    if (existingMaterialTypes.empty) {
      for (const materialType of defaultMaterialTypes) {
        await materialTypesRef.doc(materialType.id).set({
          ...materialType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        results.materialTypes++;
      }
    }

    // 3. Kompozycje materiałów (batch write)
    const materialCompositionsRef = db.collection('materialCompositions');
    const existingCompositions = await materialCompositionsRef.limit(1).get();
    if (existingCompositions.empty) {
      let batch = db.batch();
      let operationCount = 0;
      const BATCH_SIZE = 500;

      for (const composition of defaultMaterialCompositions) {
        const docRef = materialCompositionsRef.doc(composition.id);
        batch.set(docRef, {
          ...composition,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;
        results.materialCompositions++;

        if (operationCount === BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }
    }

    // 4. Typy opakowań
    const packagingTypesRef = db.collection('packagingTypes');
    const existingPackagingTypes = await packagingTypesRef.limit(1).get();
    if (existingPackagingTypes.empty) {
      for (const packagingType of defaultPackagingTypes) {
        await packagingTypesRef.doc(packagingType.id).set({
          ...packagingType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        results.packagingTypes++;
      }
    }

    // 5. Kompozycje pakowania
    const packagingCompositionsRef = db.collection('packagingCompositions');
    const existingPackagingCompositions = await packagingCompositionsRef.limit(1).get();
    if (existingPackagingCompositions.empty) {
      for (const composition of defaultPackagingCompositions) {
        await packagingCompositionsRef.doc(composition.id).set({
          ...composition,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        results.packagingCompositions++;
      }
    }

    res.json({
      success: true,
      message: 'Database initialized successfully',
      results
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
