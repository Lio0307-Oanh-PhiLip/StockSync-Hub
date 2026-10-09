import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

function getLocalIpList(): string[] {
  const interfaces = os.networkInterfaces();
  const results: string[] = [];
  for (const devName of Object.keys(interfaces)) {
    const ifaceList = interfaces[devName];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        results.push(iface.address);
      }
    }
  }
  return results;
}

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

// Multi-Period Store Types
interface InventoryPeriod {
  inventoryId: string;
  name: string;
  period: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  version: number;
  sourceInfo: ServerSyncSourceInfo;
  iw: ServerInventoryItem[];
  oow: ServerInventoryItem[];
}

interface MultiPeriodStore {
  activeInventoryId: string;
  periods: InventoryPeriod[];
}

function loadPersistedMultiStore(): MultiPeriodStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.periods) && parsed.activeInventoryId) {
        console.log(`[Storage] Loaded multi-period store with ${parsed.periods.length} periods.`);
        return parsed;
      }
      if (parsed && Array.isArray(parsed.iw) && Array.isArray(parsed.oow)) {
        console.log(`[Storage] Migrating flat store (${parsed.iw.length + parsed.oow.length} items) to multi-period...`);
        try {
          fs.copyFileSync(DB_FILE, DB_FILE + '.bak');
          console.log('[Storage] Created backup at inventory_store.json.bak');
        } catch (e) {}
        const defaultPeriod: InventoryPeriod = {
          inventoryId: 'inv-default-01',
          name: parsed.sourceInfo?.name || 'Kho xác chuẩn tháng 8/2026',
          period: 'Tháng 8/2026',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
          version: parsed.version || 1,
          sourceInfo: parsed.sourceInfo || { name: 'Default', sourceType: 'sample_data', rowCount: parsed.iw.length + parsed.oow.length, version: 1 },
          iw: parsed.iw,
          oow: parsed.oow
        };
        const multi: MultiPeriodStore = {
          activeInventoryId: 'inv-default-01',
          periods: [defaultPeriod]
        };
        saveStoreToDisk(multi);
        return multi;
      }
    }
  } catch (err) {
    console.warn('[Storage] Could not load persisted store:', err);
  }

  const initial = generateInitialState();
  const defaultPeriod: InventoryPeriod = {
    inventoryId: 'inv-default-01',
    name: initial.sourceInfo.name,
    period: 'Tháng 8/2026',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    version: initial.version,
    sourceInfo: initial.sourceInfo,
    iw: initial.iw,
    oow: initial.oow
  };
  const multi: MultiPeriodStore = {
    activeInventoryId: 'inv-default-01',
    periods: [defaultPeriod]
  };
  saveStoreToDisk(multi);
  return multi;
}

function saveStoreToDisk(store: MultiPeriodStore) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Storage] Error saving store to disk atomically:', err);
  }
}

let multiStore: MultiPeriodStore = loadPersistedMultiStore();

function getActivePeriod(): InventoryPeriod {
  let p = multiStore.periods.find(item => item.inventoryId === multiStore.activeInventoryId);
  if (!p && multiStore.periods.length > 0) {
    p = multiStore.periods[0];
    multiStore.activeInventoryId = p.inventoryId;
  }
  return p!;
}

function getPeriodById(inventoryId?: string): { period?: InventoryPeriod; error?: string } {
  if (!inventoryId) {
    return { period: getActivePeriod() };
  }
  const found = multiStore.periods.find(p => p.inventoryId === inventoryId);
  if (!found) {
    return { error: `Kỳ kiểm kê với ID "${inventoryId}" không tồn tại hoặc không hợp lệ.` };
  }
  return { period: found };
}

// Compatibility proxy for serverState
const serverState = new Proxy({} as ServerState, {
  get(_target, prop) {
    const active = getActivePeriod();
    return (active as any)[prop];
  },
  set(_target, prop, value) {
    const active = getActivePeriod();
    (active as any)[prop] = value;
    return true;
  }
});

// Connected Server-Sent Events (SSE) clients (PC)
const sseClients = new Set<Response>();

// Connected WebSocket clients (Mobile APK)
const wsClients = new Set<WebSocket>();

// Idempotency event tracking for deduplication
const processedEvents = new Map<string, { timestamp: number; result: any }>();

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

function processScan(rawCode: string, clientId: string = 'system', eventId?: string, inventoryId?: string) {
  const pCheck = getPeriodById(inventoryId);
  if (pCheck.error) return { error: pCheck.error };
  const targetPeriod = pCheck.period!;

  if (eventId && processedEvents.has(eventId)) {
    console.log(`[Idempotency] Duplicate event skipped: ${eventId}`);
    return processedEvents.get(eventId)!.result;
  }

  const clean = cleanBarcode(rawCode);
  if (!clean) return { error: 'Mã vạch không hợp lệ!' };

  let matchedItem: ServerInventoryItem | null = null;
  let listType: 'IW' | 'OOW' = 'OOW';

  // Search in OOW first, then IW
  for (const item of targetPeriod.oow) {
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
    for (const item of targetPeriod.iw) {
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

  if (!matchedItem) return { error: 'Không tìm thấy linh kiện trong kỳ này!' };

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

  targetPeriod.version += 1;
  targetPeriod.updatedAt = new Date().toISOString();
  saveStoreToDisk(multiStore);

  broadcastSync({
    type: 'SCAN_PERFORMED',
    payload: { item: matchedItem, listType, version: targetPeriod.version, inventoryId: targetPeriod.inventoryId },
    version: targetPeriod.version
  });

  const resObj = { success: true, item: matchedItem, version: targetPeriod.version, inventoryId: targetPeriod.inventoryId };
  if (eventId) {
    processedEvents.set(eventId, { timestamp: Date.now(), result: resObj });
    if (processedEvents.size > 1000) {
      const now = Date.now();
      for (const [key, val] of processedEvents.entries()) {
        if (now - val.timestamp > 300000) processedEvents.delete(key);
      }
    }
  }

  return resObj;
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
          const eventId = data.eventId || data.idempotencyKey;
          if (barcode) {
            const scanResult = processScan(barcode, 'mobile_apk', eventId);
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
        } else if (data.type === 'CHECK_VERSION') {
          const clientVer = Number(data.version) || 0;
          if (clientVer >= serverState.version) {
            try {
              ws.send(JSON.stringify({
                type: 'VERSION_OK',
                version: serverState.version,
                timestamp: Date.now()
              }));
            } catch (_) {}
          } else {
            try {
              ws.send(JSON.stringify({
                type: 'SYNC_FULL_STATE',
                payload: serverState,
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

  // Static download handlers for Desktop (.exe, .deb) and Android (.apk)
  app.get(['/download/:filename', '/:filename'], (req, res, next) => {
    const filename = req.params.filename;
    if (filename && (filename.endsWith('.apk') || filename.endsWith('.exe') || filename.endsWith('.deb') || filename.endsWith('.zip'))) {
      const publicPath = path.join(process.cwd(), 'public', 'download', filename);
      const fallbackPublic = path.join(process.cwd(), 'public', filename);
      const targetPath = fs.existsSync(publicPath) ? publicPath : fs.existsSync(fallbackPublic) ? fallbackPublic : null;
      if (targetPath) {
        const stat = fs.statSync(targetPath);
        let contentType = 'application/octet-stream';
        if (filename.endsWith('.apk')) contentType = 'application/vnd.android.package-archive';
        if (filename.endsWith('.exe')) contentType = 'application/vnd.microsoft.portable-executable';
        if (filename.endsWith('.deb')) contentType = 'application/vnd.debian.binary-package';
        if (filename.endsWith('.zip')) contentType = 'application/zip';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return fs.createReadStream(targetPath).pipe(res);
      }
    }
    next();
  });

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      version: serverState.version,
      onlineSSE: sseClients.size,
      onlineWS: wsClients.size
    });
  });

  app.get('/api/network-info', (req, res) => {
    const ips = getLocalIpList();
    const host = req.get('host') || 'localhost:3000';
    res.json({
      port: PORT,
      host,
      localIps: ips,
      preferredWsUrl: ips.length > 0 ? `ws://${ips[0]}:${PORT}/ws` : `ws://${host}/ws`
    });
  });

  app.get('/api/sync/state', (req, res) => res.json(serverState));

  // Proxy endpoint to fetch remote Google Sheets / CSV without CORS issues
  app.get('/api/proxy-sheet', async (req: Request, res: Response) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Thiếu tham số url' });
    }

    try {
      let targetUrl = rawUrl.trim();
      const sheetMatch = targetUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetMatch && sheetMatch[1]) {
        const sheetId = sheetMatch[1];
        const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain, */*'
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Máy chủ từ xa trả về mã lỗi HTTP ${response.status}: ${response.statusText}`
        });
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      const arrayBuf = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).json({
        error: `Không thể kết nối đến URL: ${err?.message || 'Lỗi mạng hoặc liên kết không hợp lệ'}`
      });
    }
  });

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

  app.get('/api/sync/periods', (req, res) => {
    res.json({
      activeInventoryId: multiStore.activeInventoryId,
      periods: multiStore.periods.map(p => ({
        inventoryId: p.inventoryId,
        name: p.name,
        period: p.period,
        status: p.status,
        version: p.version,
        rowCount: p.iw.length + p.oow.length,
        updatedAt: p.updatedAt
      }))
    });
  });

  app.post('/api/sync/periods', (req, res) => {
    const { name, period } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên kỳ kiểm kê không được để trống' });

    const newId = `inv-${Date.now()}`;
    const newPeriod: InventoryPeriod = {
      inventoryId: newId,
      name: name.trim(),
      period: period || 'Đợt mới',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      version: 1,
      sourceInfo: { name: name.trim(), sourceType: 'sample_data', lastSyncedAt: new Date().toLocaleTimeString('vi-VN'), rowCount: 0, iwCount: 0, oowCount: 0, version: 1 },
      iw: [],
      oow: []
    };

    multiStore.periods.push(newPeriod);
    multiStore.activeInventoryId = newId;
    saveStoreToDisk(multiStore);
    broadcastSync({ type: 'PERIOD_CREATED', payload: newPeriod, version: newPeriod.version });
    res.json({ success: true, activeInventoryId: multiStore.activeInventoryId, periods: multiStore.periods });
  });

  app.put('/api/sync/periods/active', (req, res) => {
    const { inventoryId } = req.body;
    const pCheck = getPeriodById(inventoryId);
    if (pCheck.error) return res.status(400).json({ error: pCheck.error });

    multiStore.activeInventoryId = inventoryId;
    saveStoreToDisk(multiStore);
    const active = getActivePeriod();
    broadcastSync({ type: 'PERIOD_SWITCHED', payload: { activeInventoryId: inventoryId }, version: active.version });
    res.json({ success: true, activeInventoryId: inventoryId, activePeriod: active });
  });

  app.post('/api/sync/scan', (req, res) => {
    const { scannedCode, barcode, clientId, eventId, idempotencyKey, inventoryId } = req.body;
    const result = processScan(scannedCode || barcode, clientId || 'pc_web', eventId || idempotencyKey, inventoryId);
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

  app.post('/api/sync/reset-standard', (req, res) => {
    const initialState = generateInitialState();
    const active = getActivePeriod();
    active.version = Math.max(active.version + 1, 130);
    active.sourceInfo.version = active.version;
    active.sourceInfo.name = 'Kho xác chuẩn v1.3.0 (366 linh kiện Phú Lâm)';
    active.iw = initialState.iw;
    active.oow = initialState.oow;
    active.updatedAt = new Date().toISOString();
    saveStoreToDisk(multiStore);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: active, version: active.version });
    res.json({ success: true, version: active.version });
  });

  app.post('/api/sync/reset-default', (req, res) => {
    const initialState = generateInitialState();
    const active = getActivePeriod();
    active.version = Math.max(active.version + 1, 130);
    active.sourceInfo.version = active.version;
    active.sourceInfo.name = 'Kho xác chuẩn v1.3.0 (366 linh kiện Phú Lâm)';
    active.iw = initialState.iw;
    active.oow = initialState.oow;
    active.updatedAt = new Date().toISOString();
    saveStoreToDisk(multiStore);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: active, version: active.version });
    res.json({ success: true, version: active.version });
  });

  app.post('/api/sync/push-from-pc', (req, res) => {
    const { iw, oow, sourceInfo } = req.body;
    if (!Array.isArray(iw) || !Array.isArray(oow)) {
      return res.status(400).json({ error: 'Danh sách linh kiện không hợp lệ' });
    }

    serverState.version = Math.max(serverState.version + 1, (sourceInfo?.version || 0) + 1, 130);
    serverState.lastModified = new Date().toLocaleTimeString('vi-VN');
    serverState.sourceInfo = {
      ...(sourceInfo || serverState.sourceInfo),
      lastSyncedAt: serverState.lastModified,
      rowCount: iw.length + oow.length,
      iwCount: iw.length,
      oowCount: oow.length,
      version: serverState.version
    };
    serverState.iw = iw;
    serverState.oow = oow;

    saveStoreToDisk(multiStore);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: getActivePeriod(), version: serverState.version });
    res.json({ success: true, version: serverState.version, rowCount: iw.length + oow.length });
  });

  app.post('/api/sync/reset-empty', (req, res) => {
    const active = getActivePeriod();
    active.version += 1;
    active.updatedAt = new Date().toISOString();
    active.sourceInfo = {
      name: 'Trạng thái trống (Đã xóa)',
      sourceType: 'sample_data',
      lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
      rowCount: 0,
      iwCount: 0,
      oowCount: 0,
      version: active.version
    };
    active.iw = [];
    active.oow = [];
    saveStoreToDisk(multiStore);
    broadcastSync({ type: 'SYNC_FULL_STATE', payload: active, version: active.version });
    res.json({ success: true, message: 'Server state cleared' });
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

