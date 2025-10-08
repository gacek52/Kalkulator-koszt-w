const fs = require('fs');
const path = require('path');

/**
 * Skrypt migracji catalog.json do nowej struktury:
 * - catalog.json → tylko metadata
 * - calculations/{id}.json → pełne kalkulacje
 */

const dataDir = path.join(__dirname, 'data');
const catalogPath = path.join(dataDir, 'catalog.json');
const calculationsDir = path.join(dataDir, 'calculations');

console.log('🔄 Migracja catalog.json...\n');

// Stwórz folder calculations jeśli nie istnieje
if (!fs.existsSync(calculationsDir)) {
  fs.mkdirSync(calculationsDir);
  console.log('✅ Utworzono folder calculations/');
}

// Wczytaj istniejący catalog.json
let catalog = [];
try {
  const data = fs.readFileSync(catalogPath, 'utf8');
  catalog = JSON.parse(data);
  console.log(`📂 Wczytano ${catalog.length} kalkulacji z catalog.json\n`);
} catch (error) {
  console.error('❌ Błąd wczytywania catalog.json:', error);
  process.exit(1);
}

if (catalog.length === 0) {
  console.log('ℹ️  Brak kalkulacji do migracji');
  process.exit(0);
}

// Metadata do zachowania w catalog.json
const newCatalog = [];

// Migruj każdą kalkulację
catalog.forEach((calc, index) => {
  const id = calc.id;

  console.log(`${index + 1}. Migruję kalkulację ID: ${id}`);

  // Metadata
  const metadata = {
    id,
    client: calc.client || '',
    status: calc.status || 'draft',
    notes: calc.notes || '',
    createdDate: calc.createdDate || calc.createdAt,
    modifiedDate: calc.modifiedDate || calc.updatedAt,
    catalogId: calc.catalogId || null,
    clientId: calc.clientId || null,
    clientCity: calc.clientCity || '',
    totalRevenue: calc.totalRevenue || 0,
    totalProfit: calc.totalProfit || 0,
    items: calc.items || [],
    createdAt: calc.createdAt,
    updatedAt: calc.updatedAt
  };

  newCatalog.push(metadata);

  // Pełne dane do calculations/{id}.json
  const calculationPath = path.join(calculationsDir, `${id}.json`);
  fs.writeFileSync(calculationPath, JSON.stringify(calc, null, 2), 'utf8');
  console.log(`   ✅ Zapisano calculations/${id}.json`);
});

// Zapisz nowy catalog.json (tylko metadata)
fs.writeFileSync(catalogPath, JSON.stringify(newCatalog, null, 2), 'utf8');
console.log(`\n✅ Zaktualizowano catalog.json (tylko metadata)\n`);

console.log('🎉 Migracja zakończona pomyślnie!');
console.log(`   • catalog.json: ${newCatalog.length} metadata`);
console.log(`   • calculations/: ${newCatalog.length} pełnych kalkulacji`);
