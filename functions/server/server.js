const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const storageService = require('./services/storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data files if they don't exist
const initializeDataFiles = () => {
  const files = {
    'catalog.json': '[]',
    'clients.json': '[]',
    'materials.json': '[]',
    'packaging.json': '[]',
    'clientManual.json': '[]',
    'session.json': 'null'
  };

  Object.entries(files).forEach(([filename, defaultContent]) => {
    const filepath = path.join(dataDir, filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, defaultContent, 'utf8');
      console.log(`✓ Created ${filename}`);
    }
  });
};

initializeDataFiles();

// Initialize storage service
storageService.initialize(dataDir);

// API Routes
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/packaging', require('./routes/packaging'));
app.use('/api/client-manual', require('./routes/clientManual'));
app.use('/api/session', require('./routes/session'));

// New modular routes for materials and packaging
app.use('/api/material-types', require('./routes/material-types'));
app.use('/api/material-compositions', require('./routes/material-compositions'));
app.use('/api/packaging-types', require('./routes/packaging-types'));
app.use('/api/packaging-compositions', require('./routes/packaging-compositions'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dataDir: dataDir
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Error handling middleware
app.use(require('./middleware/errorHandler'));

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 Cost Calculator Backend Server                        ║
║                                                            ║
║  📍 Server running on: http://localhost:${PORT}            ║
║  📁 Data directory: ${dataDir}         ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}                     ║
║                                                            ║
║  API Endpoints:                                            ║
║    • GET  /api/health                                      ║
║    • *    /api/catalog                                     ║
║    • *    /api/clients                                     ║
║    • *    /api/materials                                   ║
║    • *    /api/packaging                                   ║
║    • *    /api/client-manual                               ║
║    • *    /api/session                                     ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
