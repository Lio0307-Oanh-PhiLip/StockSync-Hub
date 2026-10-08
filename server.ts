import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

function cleanBarcode(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/[\s_\-\.\:\/]/g, '')
    .toUpperCase();
}

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'inventory_store.json');

// Interface types for server-side store
interface ServerInventoryItem {
  id: string;
  trangThai: string;
  cotSP: string;
  scCode: string;
  warehouseName: string;
  soRO: string;
  bhDv: 'IW' | 'OOW';
  maLK: string;
  productName: string;
  model: string;
  type: string;
  slg: number;
  daQuet: number;
  remark?: string;
  lastScannedAt?: string;
  scanHistory?: Array<{ timestamp: string; barcode: string; method?: string }>;
}

interface ServerSyncSourceInfo {
  name: string;
  sourceType: 'excel_file' | 'sample_data' | 'google_sheet' | 'api_endpoint' | 'cloud_drive';
  lastSyncedAt: string;
  rowCount: number;
  iwCount: number;
  oowCount: number;
  version: number;
  autoSyncEnabled?: boolean;
  autoSyncIntervalMinutes?: number;
  syncUrl?: string;
}

interface ServerState {
  version: number;
  lastModified: string;
  sourceInfo: ServerSyncSourceInfo;
  iw: ServerInventoryItem[];
  oow: ServerInventoryItem[];
}

// Generate realistic default state matching OPPO SC VN001021
function generateInitialState(): ServerState {
  const scCode = 'VN001021';
  const makeRO = (day: number, seq: number) => {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const sStr = seq < 10 ? `000${seq}` : seq < 100 ? `00${seq}` : `0${seq}`;
    return `${scCode}-AS2608${dStr}${sStr}`;
  };

  const iwTemplates = [
    { maLK: '4905106', name: 'Màn hình A53 (Đen)', model: 'A53', type: 'LCD' },
    { maLK: '621029000174', name: 'Màn hình Reno11F 5G (Xanh)', model: 'Reno11F 5G', type: 'LCD' },
    { maLK: '4907894', name: 'Màn hình Reno6Z 5G (Bạc)', model: 'Reno6Z 5G', type: 'LCD' },
    { maLK: '4908900', name: 'Màn hình A58 4G (Đen)', model: 'A58', type: 'LCD' },
    { maLK: '621023001283', name: 'Bo mạch chính 8G 256G A78', model: 'A78', type: 'MAIN' },
    { maLK: '621023005541', name: 'Bo mạch chính 8G 128G Reno8', model: 'Reno8', type: 'MAIN' },
    { maLK: '4901234', name: 'Pin BLP805 5000mAh A16', model: 'A16', type: 'OTHERS' },
    { maLK: '4905678', name: 'Camera sau chính 50MP A78', model: 'A78', type: 'OTHERS' },
    { maLK: '4909988', name: 'Cáp sạc type-C SuperVOOC', model: 'Chung', type: 'OTHERS' },
    { maLK: '4903322', name: 'Loa ngoài A96 4G', model: 'A96', type: 'OTHERS' },
    { maLK: '4907711', name: 'Khay sim A53 (Đen)', model: 'A53', type: 'OTHERS' },
    { maLK: '4906655', name: 'Nắp lưng kính Reno8T 5G (Vàng)', model: 'Reno8T 5G', type: 'OTHERS' }
  ];

  const iw: ServerInventoryItem[] = iwTemplates.map((t, idx) => {
    const soRO = makeRO(idx + 2, idx + 1);
    return {
      id: `iw-init-${idx + 1}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}${t.maLK}`,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'IW',
      maLK: t.maLK,
      productName: t.name,
      model: t.model,
      type: t.type,
      slg: 1,
      daQuet: 0,
      remark: 'Bảo hành chính hãng'
    };
  });

  const screenShotROs4905106 = [
    'VN001021-AS2608120037',
    'VN001021-AS2608040004',
    'VN001021-AS2608120035',
    'VN001021-AS2608270018'
  ];

  const oowLCDTemplates = [
    { maLK: '4907894', name: 'Màn hình Reno6Z 5G', model: 'Reno6Z 5G', count: 12 },
    { maLK: '4905106', name: 'Màn hình A53', model: 'A53', count: 4, specificROs: screenShotROs4905106 },
    { maLK: '621029000059', name: 'Màn hình A78', model: 'A78', count: 18 },
    { maLK: '621029000174', name: 'Màn hình Reno11F 5G (Xanh đen)', model: 'Reno11F 5G', count: 24 },
    { maLK: '4909013', name: 'Màn hình A95 (Đen)', model: 'A95', count: 20 },
    { maLK: '4907272', name: 'Màn hình A15 / A15s', model: 'A15', count: 26 },
    { maLK: '621029000580', name: 'Màn hình Reno3', model: 'Reno3', count: 16 },
    { maLK: '621029000482', name: 'Màn hình gập Find N5 (Đen)', model: 'Find N5', count: 8 },
    { maLK: '621029000486', name: 'Màn hình ngoài Find N5', model: 'Find N5', count: 10 },
    { maLK: '621029000441', name: 'Màn hình A3', model: 'A3', count: 22 },
    { maLK: '4908120', name: 'Màn hình Reno8 5G', model: 'Reno8 5G', count: 20 },
    { maLK: '4908900', name: 'Màn hình A58 4G', model: 'A58', count: 18 }
  ];

  let oowIdx = 1;
  let scannedCount = 0;
  const oow: ServerInventoryItem[] = [];

  oowLCDTemplates.forEach(tpl => {
    for (let c = 0; c < tpl.count; c++) {
      const soRO = tpl.specificROs && tpl.specificROs[c] 
        ? tpl.specificROs[c] 
        : makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
      const cotSP = `${soRO}${tpl.maLK}`;
      const shouldBeScanned = (tpl.maLK === '4905106') || (scannedCount < 127);
      
      if (shouldBeScanned) {
        scannedCount++;
      }

      oow.push({
        id: `oow-init-${oowIdx}`,
        trangThai: shouldBeScanned ? 'Khớp, Trả Xác' : 'Chưa Scan',
        cotSP,
        scCode,
        warehouseName: 'OPPO Experience & Service Store Phú Lâm',
        soRO,
        bhDv: 'OOW',
        maLK: tpl.maLK,
        productName: tpl.name,
        model: tpl.model,
        type: 'LCD',
        slg: 1,
        daQuet: shouldBeScanned ? 1 : 0,
        remark: shouldBeScanned ? 'Đã thu hồi xác linh kiện' : '',
        lastScannedAt: shouldBeScanned ? '09:42:15' : undefined,
        scanHistory: shouldBeScanned ? [{ timestamp: '09:42:15', barcode: cotSP }] : []
      });
      oowIdx++;
    }
  });

  // MAIN (3 items)
  const mainTemplates = [
    { maLK: '621023001283', name: 'Bo mạch chính Reno8T 5G 8G 128G', model: 'Reno8T 5G' },
    { maLK: '621023004567', name: 'Bo mạch chính Find N3 Flip 12G 256G', model: 'Find N3 Flip' },
    { maLK: '621023009988', name: 'Bo mạch chính A79 5G 8G 256G', model: 'A79 5G' }
  ];
  mainTemplates.forEach(tpl => {
    const soRO = makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
    oow.push({
      id: `oow-init-${oowIdx}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}${tpl.maLK}`,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: tpl.maLK,
      productName: tpl.name,
      model: tpl.model,
      type: 'MAIN',
      slg: 1,
      daQuet: 0
    });
    oowIdx++;
  });

  // OTHERS (150 items)
  for (let c = 1; c <= 150; c++) {
    const soRO = makeRO(Math.floor(oowIdx / 15) + 1, (oowIdx % 50) + 1);
    oow.push({
      id: `oow-init-${oowIdx}`,
      trangThai: 'Chưa Scan',
      cotSP: `${soRO}4909${1000 + c}`,
      scCode,
      warehouseName: 'OPPO Experience & Service Store Phú Lâm',
      soRO,
      bhDv: 'OOW',
      maLK: `4909${1000 + c}`,
      productName: `Linh kiện phụ kiện loại ${c}`,
      model: 'Chung',
      type: 'OTHERS',
      slg: 1,
      daQuet: 0
    });
    oowIdx++;
  }

  const now = new Date().toLocaleTimeString('vi-VN');
  return {
    version: 1,
    lastModified: now,
    sourceInfo: {
      name: 'Kho xác chuẩn tháng 8/2026 (HCM 4 - 366 linh kiện)',
      sourceType: 'sample_data',
      lastSyncedAt: now,
      rowCount: iw.length + oow.length,
      iwCount: iw.length,
      oowCount: oow.length,
      version: 1
    },
    iw,
    oow
  };
}

// In-memory state and disk persistence
let serverState: ServerState;

function loadPersistedState(): ServerState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.iw) && Array.isArray(parsed.oow)) {
        console.log(`[Storage] Loaded ${parsed.iw.length + parsed.oow.length} items from disk (version ${parsed.version})`);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Storage] Could not load persisted store:', err);
  }

  const initial = generateInitialState();
  saveStateToDisk(initial);
  return initial;
}

function saveStateToDisk(state: ServerState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving to disk:', err);
  }
}

serverState = loadPersistedState();

// Connected Server-Sent Events (SSE) clients (PC)
const sseClients = new Set<Response>();

// Connected WebSocket clients (Mobile APK)
const wsClients = new Set<WebSocket>();

function broadcastSync(event: { type: string; payload: any; version: number }) {
  // Broadcast to SSE (PC)
  const sseData = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(sseData);
    } catch (e) {
      sseClients.delete(client);
    }
  });

  // Broadcast to WebSockets (Mobile APK)
  const wsData = JSON.stringify({ ...event, timestamp: Date.now() });
  wsClients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(wsData);
      }
    } catch (e) {
      wsClients.delete(client);
    }
  });
}

function processScan(rawCode: string, clientId: string = 'system') {
  const clean = cleanBarcode(rawCode);
  if (!clean) return { error: 'Mã vạch không hợp lệ!' };

  let matchedItem: ServerInventoryItem | null = null;
  let listType: 'IW' | 'OOW' = 'OOW';

  // Search in OOW first, then IW
  for (const item of serverState.oow) {
    const k1 = cleanBarcode(item.cotSP);
    const k2 = cleanBarcode(`${item.soRO}${item.maLK}`);
    const soROClean = cleanBarcode(item.soRO);
    const maLKClean = cleanBarcode(item.maLK);

    if (clean === k1 || clean === k2 || clean === soROClean || clean === maLKClean || (k1.includes(clean) && clean.length >= 6)) {
      matchedItem = item;
      listType = 'OOW';
      break;
    }
  }

  if (!matchedItem) {
    for (const item of serverState.iw) {
      const k1 = cleanBarcode(item.cotSP);
      const k2 = cleanBarcode(`${item.soRO}${item.maLK}`);
      const soROClean = cleanBarcode(item.soRO);
      const maLKClean = cleanBarcode(item.maLK);

      if (clean === k1 || clean === k2 || clean === soROClean || clean === maLKClean || (k1.includes(clean) && clean.length >= 6)) {
        matchedItem = item;
        listType = 'IW';
        break;
      }
    }
  }

  if (!matchedItem) return { error: 'Không tìm thấy linh kiện!' };

  // Update scan count
  matchedItem.daQuet = Math.min(matchedItem.slg, matchedItem.daQuet + 1);
  matchedItem.trangThai = 'Khớp, Trả Xác';
  matchedItem.lastScannedAt = new Date().toLocaleTimeString('vi-VN');
  if (!matchedItem.scanHistory) matchedItem.scanHistory = [];
  matchedItem.scanHistory.push({
    timestamp: matchedItem.lastScannedAt,
    barcode: rawCode,
    method: clientId
  });

  serverState.version += 1;
  serverState.lastModified = new Date().toLocaleTimeString('vi-VN');
  saveStateToDisk(serverState);

  broadcastSync({
    type: 'SCAN_PERFORMED',
    payload: { item: matchedItem, listType, version: serverState.version },
    version: serverState.version
  });

  return { success: true, item: matchedItem, version: serverState.version };
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Setup WebSocket Server for Mobile APK
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat ping interval to keep connection alive on Cloud Run & mobile networks
  setInterval(() => {
    const pingMsg = JSON.stringify({ type: 'PING', timestamp: Date.now() });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(pingMsg); } catch (_) {}
      }
    });
  }, 15000);

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Mobile client connected. Total clients:', wsClients.size + 1);
    wsClients.add(ws);

    // Send full initial state to mobile on connect
    try {
      ws.send(JSON.stringify({
        type: 'INIT_STATE',
        payload: serverState,
        version: serverState.version,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('[WebSocket] Error sending INIT_STATE:', err);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Received event:', data.type);

        if (data.type === 'SCAN_EVENT') {
          const barcode = data.barcode || data.scannedCode;
          if (barcode) {
            const scanResult = processScan(barcode, 'mobile_apk');
            try {
              ws.send(JSON.stringify({
                type: 'SCAN_ACK',
                barcode,
                success: !scanResult.error,
                error: scanResult.error,
                item: scanResult.item,
                version: serverState.version,
                timestamp: Date.now()
              }));
            } catch (_) {}
          }
        } else if (data.type === 'REQUEST_FULL_STATE' || data.type === 'REQUEST_STATE') {
          try {
            ws.send(JSON.stringify({
              type: 'SYNC_FULL_STATE',
              payload: serverState,
              version: serverState.version,
              timestamp: Date.now()
            }));
          } catch (_) {}
        } else if (data.type === 'TOGGLE_SCAN' || data.type === 'MANUAL_SCAN') {
          const barcode = data.barcode || data.cotSP || data.soRO;
          if (barcode) {
            processScan(barcode, 'mobile_manual');
          }
        } else if (data.type === 'REMOVE_SCAN') {
          const itemId = data.itemId;
          let foundItem: ServerInventoryItem | null = null;
          [...serverState.iw, ...serverState.oow].forEach(it => {
            if (it.id === itemId) {
              it.daQuet = 0;
              it.trangThai = 'Chưa Scan';
              it.lastScannedAt = undefined;
              it.scanHistory = [];
              foundItem = it;
            }
          });

          if (foundItem) {
            serverState.version += 1;
            serverState.lastModified = new Date().toLocaleTimeString('vi-VN');
            saveStateToDisk(serverState);
            broadcastSync({
              type: 'SCAN_REMOVED',
              payload: { itemId, item: foundItem, version: serverState.version },
              version: serverState.version
            });
          }
        }
      } catch (e) {
        console.error('[WebSocket] Error processing message:', e);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Mobile client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Mobile client error:', err);
      wsClients.delete(ws);
    });
  });

  // Permissive CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-client-id');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '50mb' }));

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: serverState.version,
      onlineSSE: sseClients.size,
      onlineWS: wsClients.size
    });
  });

  app.get('/api/sync/state', (req, res) => res.json(serverState));

  app.get('/api/sync/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: serverState.version })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });

  app.post('/api/sync/upload', (req, res) => {
    const { iw, oow, sourceInfo } = req.body;
    if (!Array.isArray(iw) || !Array.isArray(oow)) return res.status(400).json({ error: 'Invalid list' });

    serverState.version += 1;
    serverState.lastModified = new Date().toLocaleTimeString('vi-VN');
    serverState.sourceInfo = { ...sourceInfo, lastSyncedAt: serverState.lastModified, version: serverState.version };
    serverState.iw = iw;
    serverState.oow = oow;

    saveStateToDisk(serverState);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: serverState, version: serverState.version });
    res.json({ success: true, version: serverState.version });
  });

  app.post('/api/sync/scan', (req, res) => {
    const result = processScan(req.body.scannedCode || req.body.barcode, req.body.clientId || 'pc_web');
    if (result.error) return res.status(400).json(result);
    res.json(result);
  });

  app.post('/api/sync/remove-scan', (req, res) => {
    const { itemId } = req.body;
    let foundItem: ServerInventoryItem | null = null;
    [...serverState.iw, ...serverState.oow].forEach(it => {
      if (it.id === itemId) {
        it.daQuet = 0;
        it.trangThai = 'Chưa Scan';
        it.lastScannedAt = undefined;
        it.scanHistory = [];
        foundItem = it;
      }
    });

    if (!foundItem) return res.status(404).json({ error: 'Item not found' });

    serverState.version += 1;
    serverState.lastModified = new Date().toLocaleTimeString('vi-VN');
    saveStateToDisk(serverState);

    broadcastSync({ type: 'SCAN_REMOVED', payload: { itemId, item: foundItem, version: serverState.version }, version: serverState.version });
    res.json({ success: true, version: serverState.version });
  });

  app.post('/api/sync/clear-scans', (req, res) => {
    [...serverState.iw, ...serverState.oow].forEach(it => {
      it.daQuet = 0;
      it.trangThai = 'Chưa Scan';
      it.lastScannedAt = undefined;
      it.scanHistory = [];
    });
    serverState.version += 1;
    saveStateToDisk(serverState);
    broadcastSync({ type: 'SCANS_CLEARED', payload: { version: serverState.version }, version: serverState.version });
    res.json({ success: true });
  });

  app.post('/api/sync/reset-default', (req, res) => {
    serverState = generateInitialState();
    saveStateToDisk(serverState);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: serverState, version: serverState.version });
    res.json({ success: true });
  });

  // Serve VITE app
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] StockSync Realtime Hub running on port ${PORT} (SSE + WebSocket)`);
  });
}

startServer();

