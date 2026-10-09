import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  InventoryItem, ReportSummary, ActiveScanTarget, DuplicateScanAlert, PreviousScanAlert,
  SyncSourceInfo, SyncDiffResult, SyncMode 
} from './types';
import { soundManager } from './utils/audio';
import { 
  cleanBarcode, 
  generateRealisticWarehouseDataset, 
  parseImportFile, 
  calculateReportSummary, 
  exportFullExcelReport,
  generateExcelArrayBuffer
} from './utils/excel';
import { 
  uploadExcelToGoogleDrive,
  getDriveAccessToken,
  driveGoogleSignIn
} from './utils/googleDriveService';
import { 
  broadcastDataSync, 
  subscribeToDataSync, 
  smartMergeInventory, 
  fetchRemoteSheetData 
} from './utils/syncManager';
import { 
  fetchServerState, 
  pushFullStateToServer, 
  pushScanToServer, 
  pushRemoveScanToServer, 
  pushClearScansToServer, 
  pushResetDefaultToServer, 
  startRealtimeSync, 
  CloudConnectionStatus,
  setCustomServerUrl
} from './utils/cloudSync';
import { TopNavBar } from './components/TopNavBar';
import { DashboardOverview } from './components/DashboardOverview';
import { ScanReconciliationFeed } from './components/ScanReconciliationFeed';
import { UnscannedModal } from './components/UnscannedModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { InventoryReportModal } from './components/InventoryReportModal';
import { SyncManagerModal } from './components/SyncManagerModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { UpdateChecker } from './components/UpdateChecker';

export default function App() {
  const [scCode, setScCode] = useState<string>('VN001021');
  const [dataIW, setDataIW] = useState<InventoryItem[]>([]);
  const [dataOOW, setDataOOW] = useState<InventoryItem[]>([]);
  const [scannedFeed, setScannedFeed] = useState<InventoryItem[]>([]);

  // Navigation states
  const [activeNavTab, setActiveNavTab] = useState<string>('warehouse-data');
  const [activeSubTab, setActiveSubTab] = useState<string>('thu-hoi-xac');

  // Active target & scan input
  const [activeScanTarget, setActiveScanTarget] = useState<ActiveScanTarget | null>(null);
  const [scanInput, setScanInput] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSavingDrive, setIsSavingDrive] = useState<boolean>(false);

  // Google Drive Cloud Sync State
  const [driveUrl, setDriveUrl] = useState<string>(() => {
    return localStorage.getItem('stocksync_drive_folder_url') || '';
  });
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [lastDriveSavedAt, setLastDriveSavedAt] = useState<string | null>(() => {
    return localStorage.getItem('stocksync_last_drive_saved_at') || null;
  });
  const [autoSaveDriveEnabled, setAutoSaveDriveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('stocksync_drive_auto_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [autoSaveDriveInterval, setAutoSaveDriveInterval] = useState<number>(() => {
    const saved = localStorage.getItem('stocksync_drive_auto_interval');
    return saved ? Number(saved) : 10;
  });

  // Cloud Real-Time Connection State (PC ⇄ APK)
  const [cloudStatus, setCloudStatus] = useState<CloudConnectionStatus>('connected');
  const [onlineClients, setOnlineClients] = useState<number>(1);

  // Sync state & history
  const [syncSourceInfo, setSyncSourceInfo] = useState<SyncSourceInfo>(() => {
    try {
      const saved = localStorage.getItem('stocksync_source_info');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Kho xác chuẩn tháng 8/2026 (HCM 4)',
      sourceType: 'sample_data',
      lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
      rowCount: 366,
      iwCount: 12,
      oowCount: 351,
      version: 1
    };
  });
  const [latestDiff, setLatestDiff] = useState<SyncDiffResult | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Modals
  const [isUnscannedModalOpen, setIsUnscannedModalOpen] = useState<boolean>(false);
  const [selectedPartModal, setSelectedPartModal] = useState<{ maLK: string; bhDv?: string } | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
    id: number;
  } | null>(null);

  const showAlert = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'error') => {
    const id = Date.now();
    setNotification({ message, type, id });
    setTimeout(() => {
      setNotification(prev => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    try {
      const savedIW = localStorage.getItem('stocksync_data_iw');
      const savedOOW = localStorage.getItem('stocksync_data_oow');
      const savedFeed = localStorage.getItem('stocksync_scanned_feed');
      const savedSC = localStorage.getItem('stocksync_sc_code');

      let initialIW: InventoryItem[] = [];
      let initialOOW: InventoryItem[] = [];
      let initialFeed: InventoryItem[] = [];

      if (savedIW) {
        const parsed = JSON.parse(savedIW);
        if (Array.isArray(parsed) && parsed.length > 0) initialIW = parsed;
      }
      if (savedOOW) {
        const parsed = JSON.parse(savedOOW);
        if (Array.isArray(parsed) && parsed.length > 0) initialOOW = parsed;
      }
      if (savedSC) setScCode(savedSC);

      // Default realistic dataset (366 items: 12 IW, 351 OOW with 127 scanned LCD)
      if (initialIW.length === 0 && initialOOW.length === 0) {
        const sample = generateRealisticWarehouseDataset(savedSC || 'VN001021');
        initialIW = sample.iw;
        initialOOW = sample.oow;
      }

      if (savedFeed) {
        const parsedFeed = JSON.parse(savedFeed);
        if (Array.isArray(parsedFeed) && parsedFeed.length > 0) initialFeed = parsedFeed;
      } else {
        // Collect scanned items in reverse chronological order
        initialFeed = [...initialOOW, ...initialIW]
          .filter(it => it.daQuet > 0)
          .sort((a, b) => (b.lastScannedAt || '').localeCompare(a.lastScannedAt || ''));
      }

      setDataIW(initialIW);
      setDataOOW(initialOOW);
      setScannedFeed(initialFeed);

      // Default active target: Part 4905106 (as in screenshot) or first scanned
      const highlightItem = initialFeed.find(i => i.maLK === '4905106') || initialFeed[0];
      if (highlightItem) {
        const sameMaLK = [...initialIW, ...initialOOW].filter(it => it.maLK === highlightItem.maLK && it.bhDv === highlightItem.bhDv);
        setActiveScanTarget({
          item: highlightItem,
          totalForThisMaLK: {
            required: sameMaLK.reduce((a, b) => a + b.slg, 0),
            scanned: sameMaLK.reduce((a, b) => a + b.daQuet, 0),
            completedROs: sameMaLK.filter(it => it.daQuet >= it.slg).map(it => it.soRO),
            pendingROs: sameMaLK.filter(it => it.daQuet < it.slg).map(it => it.soRO)
          }
        });
      }
    } catch (e) {
      console.error("Lỗi khôi phục localStorage:", e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      if (dataIW.length > 0 || dataOOW.length > 0) {
        localStorage.setItem('stocksync_data_iw', JSON.stringify(dataIW));
        localStorage.setItem('stocksync_data_oow', JSON.stringify(dataOOW));
        localStorage.setItem('stocksync_scanned_feed', JSON.stringify(scannedFeed));
        localStorage.setItem('stocksync_sc_code', scCode);
      }
    } catch (e) {
      console.error("Lỗi lưu localStorage:", e);
    }
  }, [dataIW, dataOOW, scannedFeed, scCode]);

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setSoundEnabled(next);
  };

  // Central Sync Engine: applies new list to inventory with Smart Merge or Clean Replace
  const handleApplySync = useCallback((
    incomingIW: InventoryItem[],
    incomingOOW: InventoryItem[],
    newSource: SyncSourceInfo,
    mode: SyncMode = 'merge_keep_scanned'
  ) => {
    const { iw, oow, diff } = smartMergeInventory(dataIW, dataOOW, incomingIW, incomingOOW, mode);

    setDataIW(iw);
    setDataOOW(oow);
    setSyncSourceInfo(newSource);
    setLatestDiff(diff);

    try {
      localStorage.setItem('stocksync_source_info', JSON.stringify(newSource));
      localStorage.setItem('stocksync_data_iw', JSON.stringify(iw));
      localStorage.setItem('stocksync_data_oow', JSON.stringify(oow));
    } catch {}

    // Update scanned feed sorted by lastScannedAt descending
    const scannedList = [...oow, ...iw]
      .filter(it => it.daQuet > 0)
      .sort((a, b) => (b.lastScannedAt || '').localeCompare(a.lastScannedAt || ''));
    setScannedFeed(scannedList);

    // Update active target if available
    const activeTarget = scannedList[0] || null;
    if (activeTarget) {
      const sameMaLK = [...iw, ...oow].filter(it => it.maLK === activeTarget.maLK && it.bhDv === activeTarget.bhDv);
      setActiveScanTarget({
        item: activeTarget,
        totalForThisMaLK: {
          required: sameMaLK.reduce((a, b) => a + b.slg, 0),
          scanned: sameMaLK.reduce((a, b) => a + b.daQuet, 0),
          completedROs: sameMaLK.filter(it => it.daQuet >= it.slg).map(it => it.soRO),
          pendingROs: sameMaLK.filter(it => it.daQuet < it.slg).map(it => it.soRO)
        }
      });
    } else {
      setActiveScanTarget(null);
    }

    // Broadcast to other tabs & APK webview via BroadcastChannel
    broadcastDataSync({ iw, oow, sourceInfo: newSource, diff });

    // Broadcast to Cloud Server (Real-time SSE push to Android APK devices)
    pushFullStateToServer(iw, oow, newSource, mode);

    soundManager.playSuccess();
    showAlert(
      `✓ Đã tự động cập nhật theo danh sách mới! (${diff.totalNewCount} dòng: +${diff.addedCount} mới, giữ ${diff.retainedScannedCount} đã quét, -${diff.removedCount} loại bỏ).`,
      'success'
    );
  }, [dataIW, dataOOW, showAlert]);

  // Initial fetch from cloud server on boot & Real-time bidirectional SSE sync (PC ⇄ Android APK)
  useEffect(() => {
    // 1. Fetch latest server state on startup with version check
    fetchServerState().then(serverState => {
      if (serverState && Array.isArray(serverState.iw) && Array.isArray(serverState.oow) && (serverState.iw.length > 0 || serverState.oow.length > 0)) {
        const localVersion = syncSourceInfo.version || 0;
        // Only update if server has newer version or local is uninitialized
        if (serverState.version >= localVersion || (dataIW.length === 0 && dataOOW.length === 0)) {
          setDataIW(serverState.iw);
          setDataOOW(serverState.oow);
          if (serverState.sourceInfo) setSyncSourceInfo(serverState.sourceInfo);
          const scanned = [...serverState.oow, ...serverState.iw]
            .filter(it => it.daQuet > 0)
            .sort((a, b) => (b.lastScannedAt || '').localeCompare(a.lastScannedAt || ''));
          setScannedFeed(scanned);
        }
      }
    }).catch(e => {
      console.warn('Initial server state fetch:', e);
    });

    // 2. Start Real-time SSE Sync stream from Cloud Server
    const stopRealtimeSync = startRealtimeSync({
      onFullStateSync: (data) => {
        if (!data || !Array.isArray(data.iw) || !Array.isArray(data.oow)) return;
        setDataIW(data.iw);
        setDataOOW(data.oow);
        if (data.sourceInfo) setSyncSourceInfo(data.sourceInfo);
        const scanned = [...data.oow, ...data.iw]
          .filter(it => it.daQuet > 0)
          .sort((a, b) => (b.lastScannedAt || '').localeCompare(a.lastScannedAt || ''));
        setScannedFeed(scanned);
        soundManager.playSuccess();
        showAlert(
          `⚡ ĐÃ ĐỒNG BỘ 2 CHIỀU: Dữ liệu kho vừa được cập nhật từ Server [${data.sourceInfo?.name || 'Hệ thống'}] (${data.iw.length + data.oow.length} dòng)!`,
          'info'
        );
      },
      onScanPerformed: ({ item }) => {
        if (!item) return;
        const updater = (list: InventoryItem[]) =>
          list.map(it => it.id === item.id ? { ...it, daQuet: item.daQuet, trangThai: item.trangThai, lastScannedAt: item.lastScannedAt } : it);
        setDataIW(prev => updater(prev));
        setDataOOW(prev => updater(prev));
        setScannedFeed(prev => [item, ...prev.filter(it => it.id !== item.id)]);

        // Cập nhật ngay thẻ đối chiếu trên đầu màn hình PC theo lượt quét của điện thoại
        setTimeout(() => {
          setDataIW(curIW => {
            setDataOOW(curOOW => {
              const all = [...curIW, ...curOOW];
              const sameMaLK = all.filter(it => it && it.maLK === item.maLK && it.bhDv === item.bhDv);
              setActiveScanTarget({
                item,
                totalForThisMaLK: {
                  required: sameMaLK.reduce((a, b) => a + (b.slg || 0), 0),
                  scanned: sameMaLK.reduce((a, b) => a + (b.daQuet || 0), 0),
                  completedROs: sameMaLK.filter(it => it.daQuet >= it.slg).map(it => it.soRO),
                  pendingROs: sameMaLK.filter(it => it.daQuet < it.slg).map(it => it.soRO)
                }
              });
              return curOOW;
            });
            return curIW;
          });
        }, 30);

        soundManager.playSuccess();
        showAlert(`📱 ĐIỆN THOẠI VỪA QUÉT KHỚP: [${item.cotSP || item.soRO}] (${item.productName}) Lúc ${item.lastScannedAt || 'vừa xong'}`, 'success');
      },
      onScanRemoved: ({ itemId, item }) => {
        // Real-time notification when PC deletes a scanned line
        const resetItem = { daQuet: 0, trangThai: 'Chưa Scan' as const, lastScannedAt: undefined };
        setDataIW(prev => prev.map(it => it.id === itemId ? { ...it, ...resetItem } : it));
        setDataOOW(prev => prev.map(it => it.id === itemId ? { ...it, ...resetItem } : it));
        setScannedFeed(prev => prev.filter(it => it.id !== itemId));
        showAlert(
          `🗑️ ĐÃ ĐỒNG BỘ REALTIME: Dòng quét [${item?.cotSP || item?.soRO || itemId}] vừa được xóa trên thiết bị khác!`,
          'warning'
        );
      },
      onScansCleared: () => {
        setDataIW(prev => prev.map(it => ({ ...it, daQuet: 0, trangThai: 'Chưa Scan' })));
        setDataOOW(prev => prev.map(it => ({ ...it, daQuet: 0, trangThai: 'Chưa Scan' })));
        setScannedFeed([]);
        setActiveScanTarget(null);
        showAlert(`⚡ ĐÃ ĐỒNG BỘ: Tiến độ quét đã được làm mới!`, 'info');
      },
      onConnectionStatusChange: (status, count) => {
        setCloudStatus(status);
        if (count !== undefined) setOnlineClients(count);
      }
    }, () => syncSourceInfo.version || 1);

    // 3. Also listen to local BroadcastChannel for same-browser multi-tab sync
    const unsubscribeBroadcast = subscribeToDataSync(({ iw, oow, sourceInfo, diff }) => {
      setDataIW(iw);
      setDataOOW(oow);
      if (sourceInfo) setSyncSourceInfo(sourceInfo);
      if (diff) setLatestDiff(diff);

      const scannedList = [...oow, ...iw]
        .filter(it => it.daQuet > 0)
        .sort((a, b) => (b.lastScannedAt || '').localeCompare(a.lastScannedAt || ''));
      setScannedFeed(scannedList);

      soundManager.playSuccess();
      showAlert(
        `⚡ ĐÃ TỰ ĐỘNG ĐỒNG BỘ: Dữ liệu vừa được cập nhật từ danh sách mới [${sourceInfo?.name || 'Hệ thống'}] (${iw.length + oow.length} dòng)!`,
        'info'
      );
    });

    return () => {
      stopRealtimeSync();
      unsubscribeBroadcast();
    };
  }, [showAlert]);

  // Background Auto-Sync interval polling (for Google Sheets / Cloud URLs)
  useEffect(() => {
    if (!syncSourceInfo.autoSyncEnabled || !syncSourceInfo.syncUrl) return;

    const intervalMs = Math.max(1, syncSourceInfo.autoSyncIntervalMinutes || 3) * 60 * 1000;
    const timer = setInterval(async () => {
      try {
        const result = await fetchRemoteSheetData(syncSourceInfo.syncUrl!);
        if (result.iw.length !== dataIW.length || result.oow.length !== dataOOW.length) {
          handleApplySync(result.iw, result.oow, {
            ...syncSourceInfo,
            lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
            rowCount: result.iw.length + result.oow.length,
            iwCount: result.iw.length,
            oowCount: result.oow.length,
            version: Date.now()
          }, 'merge_keep_scanned');
        }
      } catch (e) {
        console.warn('Auto-sync background check error:', e);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [syncSourceInfo, dataIW.length, dataOOW.length, handleApplySync]);

  // Report Summary metrics
  const reportSummary: ReportSummary = useMemo(() => {
    return calculateReportSummary(dataIW, dataOOW);
  }, [dataIW, dataOOW]);

  // Primary Barcode Scan Processor
  const processBarcodeScan = useCallback((rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    // Intercept scanned Server URL configuration QR code
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setCustomServerUrl(trimmed);
      soundManager.playSuccess();
      showAlert(`✓ Đã nhận diện & cấu hình địa chỉ Server mới: ${trimmed}. Đang kết nối lại...`, 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return;
    }

    const cleaned = cleanBarcode(trimmed);
    const nowTime = new Date().toLocaleTimeString('vi-VN');

    // 1. Search in OOW and IW by Cột SP first (most accurate unique barcode)
    let foundInIW = false;
    let targetIdx = dataOOW.findIndex(item => cleanBarcode(item.cotSP) === cleaned);
    
    if (targetIdx === -1) {
      const iwIdx = dataIW.findIndex(item => cleanBarcode(item.cotSP) === cleaned);
      if (iwIdx !== -1) {
        foundInIW = true;
        targetIdx = iwIdx;
      }
    }

    // If not found by full Cột SP, try matching by Mã LK or Số RO or partial Cột SP
    if (targetIdx === -1) {
      targetIdx = dataOOW.findIndex(item => {
        const cSP = cleanBarcode(item.cotSP);
        const mLK = cleanBarcode(item.maLK);
        const sRO = cleanBarcode(item.soRO);
        return cSP === cleaned || mLK === cleaned || sRO === cleaned || (cSP.length >= 6 && cSP.includes(cleaned));
      });

      if (targetIdx === -1) {
        const iwIdx = dataIW.findIndex(item => {
          const cSP = cleanBarcode(item.cotSP);
          const mLK = cleanBarcode(item.maLK);
          const sRO = cleanBarcode(item.soRO);
          return cSP === cleaned || mLK === cleaned || sRO === cleaned || (cSP.length >= 6 && cSP.includes(cleaned));
        });
        if (iwIdx !== -1) {
          foundInIW = true;
          targetIdx = iwIdx;
        }
      }
    }

    // 2. Barcode not in warehouse database
    if (targetIdx === -1) {
      soundManager.playError();
      showAlert(`BÁO LỖI: Mã vạch [${trimmed}] không tồn tại trong danh sách kho xác!`, 'error');
      return;
    }

    const workingList = foundInIW ? [...dataIW] : [...dataOOW];
    const candidateItem = workingList[targetIdx];

    // 3. DUPLICATE SCAN CHECK (Quét trùng phiếu của cùng 1 mã)
    if (candidateItem.daQuet >= candidateItem.slg) {
      const otherUnscanned = workingList.find(it => it.maLK === candidateItem.maLK && it.daQuet < it.slg);
      
      if (cleanBarcode(candidateItem.cotSP) === cleaned || !otherUnscanned) {
        soundManager.playWarning();
        showAlert(
          `CẢNH BÁO TRÙNG PHIẾU: Phiếu [${candidateItem.cotSP}] (Số RO: ${candidateItem.soRO}) của mã LK ${candidateItem.maLK} đã được quét trước đó rồi!`,
          'warning'
        );
        return;
      }
    }

    // 4. Update the item
    const targetItem = { ...candidateItem };
    targetItem.daQuet = targetItem.slg;
    targetItem.trangThai = 'Khớp, Trả Xác';
    targetItem.lastScannedAt = nowTime;
    workingList[targetIdx] = targetItem;

    if (foundInIW) {
      setDataIW(workingList);
    } else {
      setDataOOW(workingList);
    }

    // 5. Insert to TOP of Scanned Feed (Newest scan on Row 1)
    setScannedFeed(prev => [targetItem, ...prev.filter(it => it.id !== targetItem.id)]);

    // 6. Calculate X / Y of this Part Number in the current sheet
    const combinedUpdated = foundInIW ? [...workingList, ...dataOOW] : [...dataIW, ...workingList];
    const sameMaLKItems = combinedUpdated.filter(it => it.maLK === targetItem.maLK && it.bhDv === targetItem.bhDv);
    const reqTotal = sameMaLKItems.reduce((sum, it) => sum + it.slg, 0);
    const scannedTotal = sameMaLKItems.reduce((sum, it) => sum + it.daQuet, 0);

    setActiveScanTarget({
      item: targetItem,
      totalForThisMaLK: {
        required: reqTotal,
        scanned: scannedTotal,
        completedROs: sameMaLKItems.filter(it => it.daQuet >= it.slg).map(it => it.soRO),
        pendingROs: sameMaLKItems.filter(it => it.daQuet < it.slg).map(it => it.soRO)
      }
    });

    soundManager.playSuccess();
    showAlert(`✓ Quét khớp: ${targetItem.cotSP} (${targetItem.productName}) - [Đã scan ${scannedTotal}/${reqTotal} phiếu của mã LK ${targetItem.maLK}]`, 'success');

    // Real-time Push Scan to Cloud Server so APK receives it instantly
    pushScanToServer(cleaned);

    // Confetti if 100% complete
    const allDone = combinedUpdated.every(it => it.daQuet >= it.slg);
    if (allDone && combinedUpdated.length > 0) {
      soundManager.playCompletion();
      try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch {}
    }
  }, [dataIW, dataOOW, showAlert]);

  // Form submit for barcode gun / input
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    processBarcodeScan(scanInput);
    setScanInput('');
  };

  // Remove single item from feed
  const handleRemoveFromFeed = (id: string) => {
    const item = [...dataIW, ...dataOOW].find(it => it.id === id);
    if (!item) return;

    const resetItem = { daQuet: 0, trangThai: 'Chưa Scan' as const, lastScannedAt: undefined };
    setDataIW(prev => prev.map(it => it.id === id ? { ...it, ...resetItem } : it));
    setDataOOW(prev => prev.map(it => it.id === id ? { ...it, ...resetItem } : it));
    setScannedFeed(prev => prev.filter(it => it.id !== id));

    // Real-time Push to Cloud Server so Android APK updates immediately
    pushRemoveScanToServer(id);

    showAlert(`Đã xóa dòng quét [${item.cotSP || item.soRO}]. App APK đã tự động cập nhật!`, 'info');
  };

  // Clear / Reset scanned feed
  const handleClearFeed = () => {
    if (window.confirm("Bạn có chắc chắn muốn làm mới danh sách đối chiếu? Tất cả tiến độ quét sẽ được đặt lại về 0 để bắt đầu đợt mới.")) {
      setDataIW(prev => prev.map(it => ({ ...it, daQuet: 0, trangThai: 'Chưa Scan' })));
      setDataOOW(prev => prev.map(it => ({ ...it, daQuet: 0, trangThai: 'Chưa Scan' })));
      setScannedFeed([]);
      setActiveScanTarget(null);

      // Real-time Push to Cloud Server
      pushClearScansToServer();

      showAlert("Đã làm mới danh sách đối chiếu trên toàn bộ thiết bị (PC & APK)!", 'info');
    }
  };

  // Upload Excel / CSV file with auto Smart Merge
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseImportFile(file);
      const newSource: SyncSourceInfo = {
        name: `File Excel: ${file.name}`,
        sourceType: 'excel_file',
        lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
        rowCount: result.iw.length + result.oow.length,
        iwCount: result.iw.length,
        oowCount: result.oow.length,
        version: Date.now()
      };

      handleApplySync(result.iw, result.oow, newSource, 'merge_keep_scanned');
    } catch (err: any) {
      showAlert(err.message || "Lỗi khi import file Excel/CSV!", 'error');
    }
    e.target.value = '';
  };

  // Reload Default Sample Data (F5)
  const handleReloadSampleData = () => {
    const sample = generateRealisticWarehouseDataset(scCode);
    const newSource: SyncSourceInfo = {
      name: 'Kho xác chuẩn tháng 8/2026 (F5 Reset)',
      sourceType: 'sample_data',
      lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
      rowCount: sample.iw.length + sample.oow.length,
      iwCount: sample.iw.length,
      oowCount: sample.oow.length,
      version: Date.now()
    };

    setDataIW(sample.iw);
    setDataOOW(sample.oow);
    setSyncSourceInfo(newSource);

    const scannedList = [...sample.oow, ...sample.iw].filter(it => it.daQuet > 0);
    setScannedFeed(scannedList);

    const highlight = scannedList.find(i => i.maLK === '4905106') || scannedList[0];
    if (highlight) {
      const sameMaLK = [...sample.iw, ...sample.oow].filter(it => it.maLK === highlight.maLK && it.bhDv === highlight.bhDv);
      setActiveScanTarget({
        item: highlight,
        totalForThisMaLK: {
          required: sameMaLK.reduce((a, b) => a + b.slg, 0),
          scanned: sameMaLK.reduce((a, b) => a + b.daQuet, 0),
          completedROs: sameMaLK.filter(it => it.daQuet >= it.slg).map(it => it.soRO),
          pendingROs: sameMaLK.filter(it => it.daQuet < it.slg).map(it => it.soRO)
        }
      });
    }

    broadcastDataSync({ iw: sample.iw, oow: sample.oow, sourceInfo: newSource });
    pushFullStateToServer(sample.iw, sample.oow, newSource, 'clean_replace');
    showAlert("Đã làm mới dữ liệu thống kê F5 chuẩn 366 dòng trên toàn bộ hệ thống & đồng bộ ngay tới điện thoại!", 'success');
  };

  // Export TTBH
  const handleExportTTBH = () => {
    exportFullExcelReport(dataIW, dataOOW, scCode);
    showAlert("Đang xuất file báo cáo TTBH...", 'success');
  };

  // Export All
  const handleExportAll = () => {
    exportFullExcelReport(dataIW, dataOOW, scCode);
    showAlert("Đang xuất toàn bộ 5 sheet báo cáo kho xác...", 'success');
  };

  // Save Drive Config
  const handleSaveDriveConfig = (url: string, autoEnabled: boolean, intervalMins: number) => {
    setDriveUrl(url);
    setAutoSaveDriveEnabled(autoEnabled);
    setAutoSaveDriveInterval(intervalMins);
    try {
      localStorage.setItem('stocksync_drive_folder_url', url);
      localStorage.setItem('stocksync_drive_auto_enabled', String(autoEnabled));
      localStorage.setItem('stocksync_drive_auto_interval', String(intervalMins));
    } catch {}
    showAlert("✓ Đã lưu cấu hình đường dẫn Google Drive thành công!", 'success');
  };

  // Save & Push to Drive execution
  const handleSaveDrive = async () => {
    setIsSavingDrive(true);
    const nowTime = new Date().toLocaleTimeString('vi-VN');

    // 1. Tạo file báo cáo Excel 5 Sheet trong bộ nhớ
    const { fileName, arrayBuffer } = generateExcelArrayBuffer(dataIW, dataOOW, scCode);

    // 2. Xuất file về máy tính tự động cho người dùng
    exportFullExcelReport(dataIW, dataOOW, scCode);

    // 3. Đẩy toàn bộ dữ liệu đối chiếu lên Cloud Server & Local Storage
    pushFullStateToServer(dataIW, dataOOW, syncSourceInfo, 'merge_keep_scanned');

    // 4. Đẩy file trực tiếp lên Google Drive của người dùng qua Google Drive API
    try {
      const driveRes = await uploadExcelToGoogleDrive(arrayBuffer, fileName, driveUrl);
      setIsSavingDrive(false);
      setLastDriveSavedAt(nowTime);
      try {
        localStorage.setItem('stocksync_last_drive_saved_at', nowTime);
      } catch {}

      showAlert(`🎉 ĐÃ ĐẨY THÀNH CÔNG: File '${driveRes.name}' (5 sheet) đã được tải trực tiếp lên Google Drive lúc ${nowTime}!`, 'success');
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    } catch (err: any) {
      setIsSavingDrive(false);
      setLastDriveSavedAt(nowTime);
      try {
        localStorage.setItem('stocksync_last_drive_saved_at', nowTime);
      } catch {}
      console.warn('[Drive Upload Fallback]:', err);
      showAlert(`☁ Đã xuất file báo cáo Excel 5 sheet & lưu đối chiếu lúc ${nowTime}! (${err.message || 'Cần đăng nhập Google để đẩy trực tiếp'})`, 'info');
    }
  };

  // 10-Minute Auto-Save Background Timer
  useEffect(() => {
    if (!autoSaveDriveEnabled) return;
    const intervalMs = (autoSaveDriveInterval || 10) * 60 * 1000;
    const timer = setInterval(() => {
      if (dataIW.length > 0 || dataOOW.length > 0) {
        const nowTime = new Date().toLocaleTimeString('vi-VN');
        setLastDriveSavedAt(nowTime);
        try {
          localStorage.setItem('stocksync_last_drive_saved_at', nowTime);
        } catch {}

        pushFullStateToServer(dataIW, dataOOW, syncSourceInfo, 'merge_keep_scanned');

        // Tự động đóng gói & đẩy file 5 sheet lên Google Drive nếu đã đăng nhập Token
        if (getDriveAccessToken()) {
          const { fileName, arrayBuffer } = generateExcelArrayBuffer(dataIW, dataOOW, scCode);
          uploadExcelToGoogleDrive(arrayBuffer, fileName, driveUrl).then(() => {
            console.log(`[Auto Drive Upload Success] ${fileName}`);
          }).catch(e => {
            console.warn('[Auto Drive Upload Error]:', e);
          });
        }
        console.log(`[Auto-Drive-Backup] Tự động đẩy lưu đối chiếu lên Drive & Cloud lúc ${nowTime}`);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoSaveDriveEnabled, autoSaveDriveInterval, dataIW, dataOOW, syncSourceInfo, scCode, driveUrl]);

  // Open modal for a specific part code
  const handleOpenPartModal = (maLK: string, bhDv?: string) => {
    setSelectedPartModal({ maLK, bhDv });
    setIsUnscannedModalOpen(true);
  };

  // Scan manual inside modal
  const handleScanItemManual = (item: InventoryItem) => {
    processBarcodeScan(item.cotSP || item.soRO);
  };

  const allItems = useMemo(() => [...dataIW, ...dataOOW], [dataIW, dataOOW]);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 p-3 sm:p-5 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* TOP NAVIGATION BAR */}
        <TopNavBar
          scCode={scCode}
          activeNavTab={activeNavTab}
          onNavTabChange={setActiveNavTab}
          activeSubTab={activeSubTab}
          onSubTabChange={setActiveSubTab}
          syncSourceInfo={syncSourceInfo}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          cloudStatus={cloudStatus}
          onlineClients={onlineClients}
        />

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div 
            id="system-notification-toast"
            className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : notification.type === 'warning'
                ? 'bg-amber-500 text-white border-amber-600'
                : notification.type === 'info'
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {notification.type === 'success' ? '✓' : notification.type === 'warning' ? '⚠' : notification.type === 'info' ? 'ℹ' : '✕'}
              </span>
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="px-2 py-0.5 rounded hover:bg-white/20 text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* DASHBOARD OVERVIEW CARDS (Thống kê & Xuất dữ liệu) */}
        <DashboardOverview
          scCode={scCode}
          onScCodeChange={setScCode}
          dataIW={dataIW}
          dataOOW={dataOOW}
          summary={reportSummary}
          onOpenUnscannedModal={() => {
            setSelectedPartModal(null);
            setIsUnscannedModalOpen(true);
          }}
          onFileUpload={handleFileUpload}
          onReloadSampleData={handleReloadSampleData}
          onExportTTBH={handleExportTTBH}
          onExportAll={handleExportAll}
          onSaveDrive={handleSaveDrive}
          isSavingDrive={isSavingDrive}
          syncSourceInfo={syncSourceInfo}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          driveUrl={driveUrl}
          lastDriveSavedAt={lastDriveSavedAt}
        />

        {/* SCAN RECONCILIATION FEED (Lịch sử đối chiếu - Newest Scanned item on Top) */}
        <ScanReconciliationFeed
          scannedItems={scannedFeed}
          activeScan={activeScanTarget}
          scanInput={scanInput}
          onScanInputChange={setScanInput}
          onScanSubmit={handleScanSubmit}
          onRemoveScannedItem={handleRemoveFromFeed}
          onClearScannedFeed={handleClearFeed}
          onOpenScannerModal={() => setIsScannerModalOpen(true)}
          onOpenPartDetailsModal={handleOpenPartModal}
        />

        {/* MODAL: Danh sách phiếu CẦN SCAN (Matching Figure 3) */}
        <UnscannedModal
          isOpen={isUnscannedModalOpen}
          onClose={() => {
            setIsUnscannedModalOpen(false);
            setSelectedPartModal(null);
          }}
          scCode={scCode}
          allItems={allItems}
          filterMaLK={selectedPartModal?.maLK}
          filterServiceType={selectedPartModal?.bhDv}
          onScanItemManual={handleScanItemManual}
        />

        {/* MODAL: Camera QR / Barcode Scanner */}
        <BarcodeScannerModal
          isOpen={isScannerModalOpen}
          onClose={() => setIsScannerModalOpen(false)}
          onScanSuccess={(decoded) => {
            processBarcodeScan(decoded);
          }}
          activeTab="OOW"
          onTabChange={() => {}}
        />

        {/* MODAL: Automated Full Report */}
        <InventoryReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          dataIW={dataIW}
          dataOOW={dataOOW}
          summary={reportSummary}
          scCode={scCode}
          onOpenPrintSlip={() => {}}
        />

        {/* MODAL: Data Sync Center (Đồng Bộ & Tự Động Thích Ứng Danh Sách Mới) */}
        <SyncManagerModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          sourceInfo={syncSourceInfo}
          latestDiff={latestDiff}
          scCode={scCode}
          cloudStatus={cloudStatus}
          onlineClients={onlineClients}
          dataIW={dataIW}
          dataOOW={dataOOW}
          onTestPing={() => {
            fetchServerState().then(() => {
              showAlert("✓ Đã kết nối & đồng bộ dữ liệu với Cloud Server thành công!", "success");
            }).catch(() => {
              showAlert("Không thể kết nối đến Cloud Server", "error");
            });
          }}
          onApplySync={(newIW, newOOW, source, mode) => {
            handleApplySync(newIW, newOOW, source, mode);
          }}
          onAutoSyncToggle={(enabled, interval, url) => {
            setSyncSourceInfo(prev => ({
              ...prev,
              autoSyncEnabled: enabled,
              autoSyncIntervalMinutes: interval,
              syncUrl: url
            }));
          }}
        />

        {/* MODAL: Cấu Hình & Tự Động Lưu Google Drive */}
        <GoogleDriveModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          driveUrl={driveUrl}
          onSaveDriveUrl={(url, autoEnabled, intervalMins) => {
            handleSaveDriveConfig(url, autoEnabled, intervalMins);
          }}
          onManualPushDrive={handleSaveDrive}
          isSavingDrive={isSavingDrive}
          lastDriveSavedAt={lastDriveSavedAt}
          autoSaveEnabled={autoSaveDriveEnabled}
          autoSaveIntervalMinutes={autoSaveDriveInterval}
        />

        <UpdateChecker />

      </div>
    </div>
  );
}
