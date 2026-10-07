import * as XLSX from 'xlsx';
import { InventoryItem, ServiceType, SyncDiffResult, SyncMode, SyncSourceInfo } from '../types';
import { cleanBarcode } from './excel';

const SYNC_CHANNEL_NAME = 'stocksync_data_channel';
const CROSS_STORAGE_KEY = 'stocksync_cross_tab_sync_event';

/**
 * Smart merge function: merges incoming master inventory list with current scan progress.
 * If mode is 'merge_keep_scanned', items already scanned in current list retain their scan status.
 * If mode is 'clean_replace', all items are reset to 0 scans according to the new list.
 */
export const smartMergeInventory = (
  currentIW: InventoryItem[],
  currentOOW: InventoryItem[],
  incomingIW: InventoryItem[],
  incomingOOW: InventoryItem[],
  mode: SyncMode = 'merge_keep_scanned'
): { iw: InventoryItem[]; oow: InventoryItem[]; diff: SyncDiffResult } => {
  const currentCombined = [...currentIW, ...currentOOW];
  const oldScannedMap = new Map<string, InventoryItem>();
  const oldAllKeys = new Set<string>();

  // Build index of old items
  currentCombined.forEach(item => {
    const key1 = cleanBarcode(item.cotSP);
    const key2 = `${cleanBarcode(item.soRO)}_${cleanBarcode(item.maLK)}`;
    if (key1) oldAllKeys.add(key1);
    if (key2) oldAllKeys.add(key2);

    if (item.daQuet > 0) {
      if (key1) oldScannedMap.set(key1, item);
      if (key2) oldScannedMap.set(key2, item);
    }
  });

  let retainedScannedCount = 0;
  let addedCount = 0;
  const addedROs: string[] = [];
  const retainedROs: string[] = [];
  const processedNewKeys = new Set<string>();

  const processList = (incoming: InventoryItem[]): InventoryItem[] => {
    return incoming.map(newItem => {
      const key1 = cleanBarcode(newItem.cotSP);
      const key2 = `${cleanBarcode(newItem.soRO)}_${cleanBarcode(newItem.maLK)}`;
      if (key1) processedNewKeys.add(key1);
      if (key2) processedNewKeys.add(key2);

      const isNew = !oldAllKeys.has(key1) && !oldAllKeys.has(key2);
      if (isNew) {
        addedCount++;
        if (addedROs.length < 15) addedROs.push(newItem.soRO || newItem.cotSP);
      }

      if (mode === 'merge_keep_scanned') {
        const oldScanned = (key1 && oldScannedMap.get(key1)) || (key2 && oldScannedMap.get(key2));
        if (oldScanned) {
          retainedScannedCount++;
          if (retainedROs.length < 15) retainedROs.push(newItem.soRO || newItem.cotSP);
          return {
            ...newItem,
            daQuet: Math.min(newItem.slg, oldScanned.daQuet || newItem.slg),
            trangThai: oldScanned.trangThai || 'Khớp, Trả Xác',
            lastScannedAt: oldScanned.lastScannedAt || new Date().toLocaleTimeString('vi-VN'),
            scanHistory: oldScanned.scanHistory || []
          };
        }
      }

      // Default unscanned
      return {
        ...newItem,
        daQuet: 0,
        trangThai: 'Chưa Scan'
      };
    });
  };

  const newIW = processList(incomingIW);
  const newOOW = processList(incomingOOW);

  // Determine removed items
  const removedROs: string[] = [];
  let removedCount = 0;
  currentCombined.forEach(oldItem => {
    const k1 = cleanBarcode(oldItem.cotSP);
    const k2 = `${cleanBarcode(oldItem.soRO)}_${cleanBarcode(oldItem.maLK)}`;
    const stillExists = (k1 && processedNewKeys.has(k1)) || (k2 && processedNewKeys.has(k2));
    if (!stillExists) {
      removedCount++;
      if (removedROs.length < 15) removedROs.push(oldItem.soRO || oldItem.cotSP);
    }
  });

  const diff: SyncDiffResult = {
    addedCount,
    retainedScannedCount,
    removedCount,
    totalNewCount: newIW.length + newOOW.length,
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    mode,
    details: {
      addedROs,
      retainedROs,
      removedROs
    }
  };

  return { iw: newIW, oow: newOOW, diff };
};

/**
 * Broadcast sync event to all open browser windows, tabs, and APK webviews
 */
export const broadcastDataSync = (payload: {
  iw: InventoryItem[];
  oow: InventoryItem[];
  sourceInfo: SyncSourceInfo;
  diff?: SyncDiffResult;
}) => {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.postMessage({
        type: 'STOCKSYNC_AUTO_UPDATE',
        payload,
        timestamp: Date.now()
      });
      setTimeout(() => channel.close(), 100);
    }
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }

  // Cross-storage backup
  try {
    localStorage.setItem(
      CROSS_STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        sourceInfo: payload.sourceInfo,
        itemCount: payload.iw.length + payload.oow.length
      })
    );
  } catch (e) {
    console.warn('Storage sync error:', e);
  }
};

/**
 * Subscribe to sync events from other tabs / devices
 */
export const subscribeToDataSync = (
  onSyncReceived: (data: {
    iw: InventoryItem[];
    oow: InventoryItem[];
    sourceInfo: SyncSourceInfo;
    diff?: SyncDiffResult;
  }) => void
): (() => void) => {
  let channel: BroadcastChannel | null = null;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      channel.onmessage = event => {
        if (event.data?.type === 'STOCKSYNC_AUTO_UPDATE' && event.data.payload) {
          onSyncReceived(event.data.payload);
        }
      };
    }
  } catch (e) {
    console.warn('Cannot init BroadcastChannel listener:', e);
  }

  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'stocksync_data_iw' || e.key === 'stocksync_data_oow' || e.key === CROSS_STORAGE_KEY) {
      try {
        const rawIW = localStorage.getItem('stocksync_data_iw');
        const rawOOW = localStorage.getItem('stocksync_data_oow');
        const rawSource = localStorage.getItem('stocksync_source_info');

        if (rawIW && rawOOW) {
          const iw = JSON.parse(rawIW);
          const oow = JSON.parse(rawOOW);
          const sourceInfo = rawSource
            ? JSON.parse(rawSource)
            : {
                name: 'Đồng bộ từ thiết bị / tab khác',
                sourceType: 'cloud_drive',
                lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
                rowCount: iw.length + oow.length,
                iwCount: iw.length,
                oowCount: oow.length,
                version: Date.now()
              };

          onSyncReceived({ iw, oow, sourceInfo });
        }
      } catch (err) {
        console.error('Storage sync parse error:', err);
      }
    }
  };

  window.addEventListener('storage', storageHandler);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {}
    }
    window.removeEventListener('storage', storageHandler);
  };
};

/**
 * Normalize Google Sheets share link into direct CSV export link
 */
export const formatGoogleSheetUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Standard Google Sheet URL regex
  const match = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    // Check if specific gid is provided
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
  }

  return trimmed;
};

/**
 * Fetch and parse remote Google Sheet or CSV URL
 */
export const fetchRemoteSheetData = async (
  rawUrl: string
): Promise<{ iw: InventoryItem[]; oow: InventoryItem[] }> => {
  const formattedUrl = formatGoogleSheetUrl(rawUrl);
  if (!formattedUrl) {
    throw new Error('Đường dẫn liên kết không hợp lệ!');
  }

  let response: Response;
  try {
    response = await fetch(formattedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain, */*'
      }
    });
  } catch (err: any) {
    // If CORS fails directly on Google Sheets, try a public proxy if needed
    throw new Error(
      `Không thể tải dữ liệu từ URL: ${err.message || 'Lỗi mạng hoặc giới hạn quyền truy cập CORS'}. Hãy đảm bảo Google Sheets đã được bật "Bất kỳ ai có liên kết đều có thể xem" (Anyone with the link).`
    );
  }

  if (!response.ok) {
    throw new Error(`Máy chủ từ chối yêu cầu (Mã lỗi HTTP ${response.status}: ${response.statusText})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

  const newIW: InventoryItem[] = [];
  const newOOW: InventoryItem[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length <= 1) return;

    const headerRow = (rawRows[0] as string[]).map(h => String(h || '').trim().toLowerCase());
    const findColIndex = (keywords: string[]): number => {
      return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colTrangThai = findColIndex(['trạng thái', 'status']);
    const colCotSP = findColIndex(['cột sp', 'cot sp', 'cột scan qr', 'serial', 'barcode']);
    const colScCode = findColIndex(['sc code', 'mã sc', 'sc']);
    const colWarehouse = findColIndex(['warehouse name', 'warehouse', 'kho']);
    const colSoRO = findColIndex(['số ro', 'so ro', 'ro']);
    const colBhDv = findColIndex(['bh/dv', 'bh dv', 'bhdv', 'loại dv', 'iw/oow']);
    const colMaLK = findColIndex(['mã lk', 'ma lk', 'part number', 'part code']);
    const colProductName = findColIndex(['product name', 'tên lk', 'tên linh kiện']);
    const colModel = findColIndex(['model', 'máy']);
    const colType = findColIndex(['type', 'loại', 'nhóm']);
    const colSlg = findColIndex(['slg', 'số lượng', 'qty']);
    const colRemark = findColIndex(['remark', 'ghi chú']);

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every((c: any) => String(c).trim() === '')) continue;

      const cotSP = String((colCotSP !== -1 ? row[colCotSP] : row[1]) || '').trim();
      const scCode = String((colScCode !== -1 ? row[colScCode] : row[2]) || 'VN001021').trim();
      const warehouseName = String((colWarehouse !== -1 ? row[colWarehouse] : row[3]) || 'Trung tâm CSKH OPPO Phú Lâm').trim();
      const soRO = String((colSoRO !== -1 ? row[colSoRO] : row[4]) || '').trim();
      let bhDvRaw = String((colBhDv !== -1 ? row[colBhDv] : row[5]) || '').trim().toUpperCase();

      if (sheetName.toUpperCase() === 'IW') bhDvRaw = 'IW';
      if (sheetName.toUpperCase() === 'OOW') bhDvRaw = 'OOW';

      const maLK = String((colMaLK !== -1 ? row[colMaLK] : row[6]) || '').trim();
      const productName = String((colProductName !== -1 ? row[colProductName] : row[7]) || 'Linh kiện xác').trim();
      const model = String((colModel !== -1 ? row[colModel] : row[8]) || '').trim();

      let rawType = String((colType !== -1 ? row[colType] : row[9]) || '').trim().toUpperCase();
      if (!rawType || (!rawType.includes('LCD') && !rawType.includes('MAIN'))) {
        if (productName.toLowerCase().includes('màn hình') || productName.toLowerCase().includes('lcd')) {
          rawType = 'LCD';
        } else if (productName.toLowerCase().includes('bo mạch') || productName.toLowerCase().includes('main')) {
          rawType = 'MAIN';
        } else {
          rawType = 'OTHERS';
        }
      }

      const slg = Math.max(1, parseInt(String(colSlg !== -1 ? row[colSlg] : row[10] || '1'), 10) || 1);
      const remark = String((colRemark !== -1 ? row[colRemark] : row[11]) || '').trim();

      if (!cotSP && !maLK && !productName) continue;

      const bhDv: ServiceType = bhDvRaw.includes('IW') ? 'IW' : 'OOW';
      const item: InventoryItem = {
        id: `remote-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        trangThai: 'Chưa Scan',
        cotSP: cotSP || `${scCode}-AS-${Date.now()}-${i}`,
        scCode: scCode || 'VN001021',
        warehouseName,
        soRO: soRO || `${scCode}-AS2608-${i}`,
        bhDv,
        maLK: maLK || 'UNKNOWN',
        productName,
        model: model || 'Chung',
        type: rawType,
        slg,
        daQuet: 0,
        remark
      };

      if (bhDv === 'IW') {
        newIW.push(item);
      } else {
        newOOW.push(item);
      }
    }
  });

  if (newIW.length === 0 && newOOW.length === 0) {
    throw new Error('File từ liên kết không chứa các cột dữ liệu kiểm kê hợp lệ (Cột SP, Mã LK, Số RO...)!');
  }

  return { iw: newIW, oow: newOOW };
};

/**
 * Generate predefined warehouse batches for quick switching and testing
 */
export const generatePresetWarehouseBatch = (
  batchId: 'batch_august' | 'batch_september_extended' | 'batch_priority_lcd_main',
  scCode: string = 'VN001021'
): { name: string; iw: InventoryItem[]; oow: InventoryItem[] } => {
  if (batchId === 'batch_september_extended') {
    // 412 items (+46 items for Reno11, Reno12, Find N3)
    const iwExtra: InventoryItem[] = [
      {
        id: 'iw-sep-1',
        trangThai: 'Chưa Scan',
        cotSP: `${scCode}-AS2609010001621029000888`,
        scCode,
        warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
        soRO: `${scCode}-AS2609010001`,
        bhDv: 'IW',
        maLK: '621029000888',
        productName: 'Màn hình gập trong Find N3',
        model: 'Find N3',
        type: 'LCD',
        slg: 1,
        daQuet: 0,
        remark: 'Đợt bổ sung tháng 9'
      },
      {
        id: 'iw-sep-2',
        trangThai: 'Chưa Scan',
        cotSP: `${scCode}-AS2609020002621023009999`,
        scCode,
        warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
        soRO: `${scCode}-AS2609020002`,
        bhDv: 'IW',
        maLK: '621023009999',
        productName: 'Bo mạch chính 16G 512G Find N3',
        model: 'Find N3',
        type: 'MAIN',
        slg: 1,
        daQuet: 0,
        remark: 'Đợt bổ sung tháng 9'
      }
    ];

    const oowExtra: InventoryItem[] = Array.from({ length: 44 }).map((_, idx) => {
      const isLcd = idx % 2 === 0;
      const ro = `${scCode}-AS2609${idx < 10 ? `0${idx}` : idx}00${10 + idx}`;
      const part = isLcd ? '621029000555' : '621023007777';
      return {
        id: `oow-sep-${idx + 1}`,
        trangThai: 'Chưa Scan',
        cotSP: `${ro}${part}`,
        scCode,
        warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
        soRO: ro,
        bhDv: 'OOW',
        maLK: part,
        productName: isLcd ? 'Màn hình Reno12 5G (Bạc Vũ Trụ)' : 'Bo mạch chính 12G 256G Reno12 5G',
        model: 'Reno12 5G',
        type: isLcd ? 'LCD' : 'MAIN',
        slg: 1,
        daQuet: 0,
        remark: 'Lô thu hồi tháng 9'
      };
    });

    return {
      name: 'Đợt 2: Danh Sách Bổ Sung Tháng 9/2026 (412 linh kiện)',
      iw: iwExtra,
      oow: oowExtra
    };
  }

  if (batchId === 'batch_priority_lcd_main') {
    // 154 urgent items (only LCD & Mainboards)
    const oowUrgent: InventoryItem[] = Array.from({ length: 154 }).map((_, idx) => {
      const isLcd = idx < 120;
      const ro = `${scCode}-AS2608${idx < 10 ? `0${idx}` : idx}00${20 + idx}`;
      const part = isLcd ? '4905106' : '621023001283';
      return {
        id: `urgent-${idx + 1}`,
        trangThai: 'Chưa Scan',
        cotSP: `${ro}${part}`,
        scCode,
        warehouseName: 'Trung tâm CSKH OPPO Phú Lâm',
        soRO: ro,
        bhDv: 'OOW',
        maLK: part,
        productName: isLcd ? 'Màn hình A53 (Xác thu hồi ưu tiên)' : 'Bo mạch chính 8G 256G Reno11F 5G',
        model: isLcd ? 'A53' : 'Reno11F 5G',
        type: isLcd ? 'LCD' : 'MAIN',
        slg: 1,
        daQuet: 0,
        remark: 'Danh sách ưu tiên đối chiếu gấp'
      };
    });

    return {
      name: 'Đợt 3: Danh Sách Trọng Điểm Màn Hình & Main (154 linh kiện)',
      iw: [],
      oow: oowUrgent
    };
  }

  // Default August
  return {
    name: 'Đợt 1: Danh Sách Chuẩn Kho Xác Tháng 8/2026 (366 linh kiện)',
    iw: [],
    oow: []
  };
};
