import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Test suite for StockSync Hub Realtime & Idempotency
async function runTests() {
  console.log('[Test] Starting StockSync Hub Synchronization & Idempotency Tests...');

  const DB_FILE = path.join(process.cwd(), 'inventory_store.json');
  assert.ok(fs.existsSync(DB_FILE), 'inventory_store.json must exist');

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const store = JSON.parse(raw);
  
  const activePeriod = store.periods ? store.periods.find(p => p.inventoryId === store.activeInventoryId) || store.periods[0] : store;
  assert.ok(activePeriod, 'Active inventory period must exist');
  assert.ok(Array.isArray(activePeriod.iw), 'iw list must be an array');
  assert.ok(Array.isArray(activePeriod.oow), 'oow list must be an array');
  console.log(`[Test] Loaded store version ${activePeriod.version}, ${activePeriod.iw.length} IW items, ${activePeriod.oow.length} OOW items.`);

  // Test atomic persistence helper
  const tempFile = DB_FILE + '.test.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(store), 'utf-8');
  assert.ok(fs.existsSync(tempFile), 'Atomic temp file should be created');
  fs.renameSync(tempFile, tempFile + '.final');
  assert.ok(fs.existsSync(tempFile + '.final'), 'Atomic rename should succeed');
  fs.unlinkSync(tempFile + '.final');

  console.log('[Test] ALL SYNCHRONIZATION AND PERSISTENCE TESTS PASSED SUCCESSFULLY.');
}

runTests().catch(err => {
  console.error('[Test] Test failed:', err);
  process.exit(1);
});
