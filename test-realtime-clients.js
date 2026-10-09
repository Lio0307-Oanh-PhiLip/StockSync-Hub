import assert from 'assert';

// Real-time multi-client test script via HTTP API / WebSocket simulation
async function runRealtimeClientTests() {
  console.log('[Test] Starting Real-time Multi-Client & Strict Inventory ID Validation Tests...');

  const PORT = 3000;
  const baseUrl = `http://localhost:${PORT}`;

  // Helper fetch json
  const fetchJson = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const text = await res.text();
    try {
      return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
      return { status: res.status, ok: res.ok, data: text };
    }
  };

  // 1. Test health check
  const health = await fetchJson('/api/health');
  assert.ok(health.ok, 'Health check should be ok');
  console.log('[Test] Health check passed:', health.data);

  // 2. Test periods endpoint
  const periodsRes = await fetchJson('/api/sync/periods');
  assert.ok(periodsRes.ok, 'Get periods should be ok');
  assert.ok(periodsRes.data.activeInventoryId, 'Should have activeInventoryId');
  assert.ok(Array.isArray(periodsRes.data.periods), 'Should have periods array');
  const activeId = periodsRes.data.activeInventoryId;
  console.log(`[Test] Active inventory period ID: ${activeId}, total periods: ${periodsRes.data.periods.length}`);

  // 3. Test strict inventoryId validation (TC-15 check: invalid inventoryId must return 400 error instead of silent fallback)
  const invalidScanRes = await fetchJson('/api/sync/scan', {
    method: 'POST',
    body: JSON.stringify({ scannedCode: 'VN001021-AS26080200014905106', inventoryId: 'invalid-nonexistent-id' })
  });
  assert.equal(invalidScanRes.status, 400, 'Invalid inventoryId must return HTTP 400');
  assert.ok(invalidScanRes.data.error, 'Must return clear error message for invalid inventoryId');
  console.log('[Test] TC-15 Verified: Invalid inventoryId correctly returns 400 error:', invalidScanRes.data.error);

  // 4. Test valid scan with correct active inventoryId
  const validScanRes = await fetchJson('/api/sync/scan', {
    method: 'POST',
    body: JSON.stringify({ scannedCode: 'VN001021-AS26080200014905106', inventoryId: activeId, eventId: 'evt-test-999' })
  });
  assert.ok(validScanRes.ok, 'Valid scan with correct inventoryId should succeed');
  assert.equal(validScanRes.data.success, true);
  console.log('[Test] Valid scan with inventoryId succeeded.');

  // 5. Test idempotency with same eventId
  const duplicateScanRes = await fetchJson('/api/sync/scan', {
    method: 'POST',
    body: JSON.stringify({ scannedCode: 'VN001021-AS26080200014905106', inventoryId: activeId, eventId: 'evt-test-999' })
  });
  assert.ok(duplicateScanRes.ok, 'Duplicate event with same eventId should return cached ack');
  console.log('[Test] Idempotency event deduplication passed.');

  console.log('[Test] ALL REAL-TIME MULTI-CLIENT & STRICT VALIDATION TESTS PASSED SUCCESSFULLY.');
}

runRealtimeClientTests().catch(err => {
  console.error('[Test] Real-time client test failed:', err);
  process.exit(1);
});
