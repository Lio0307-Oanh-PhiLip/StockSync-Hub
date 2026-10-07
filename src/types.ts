export type ServiceType = 'IW' | 'OOW';

export type AppSheetTab = 'IW' | 'OOW' | 'DanhSach_ChuaScan' | 'LichSu_DaScan' | 'ThongKe';

export type PartStatus = 'Chưa Scan' | 'Đang quét' | 'Khớp, Trả Xác' | 'Thừa mã';

export interface ScanHistoryEntry {
  timestamp: string;
  code: string;
  source: 'camera' | 'barcode_gun' | 'manual';
  itemTitle?: string;
  bhDv?: ServiceType;
}

export interface InventoryItem {
  id: string;
  trangThai: PartStatus;
  cotSP: string;        // Cột SP (Serial / Composite Barcode)
  scCode: string;       // SC Code (Mã trạm)
  warehouseName: string;// Warehouse Name (Tên kho)
  soRO: string;         // Số RO
  bhDv: ServiceType;    // BH/DV (IW hoặc OOW)
  maLK: string;         // Mã LK (Part Number)
  productName: string;  // Product Name
  model: string;        // Model
  type: string;         // Type (MAIN, LCD, PIN, PHIM, VỎ, VAN TAY...)
  slg: number;          // Slg (Số lượng)
  daQuet: number;       // Đã Quét
  remark?: string;      // Remark (Ghi chú)
  lastScannedAt?: string;
  scanHistory?: ScanHistoryEntry[];
}

export interface PreviousScanAlert {
  previousMaLK: string;
  previousProductName: string;
  previousCotSP?: string;
  missingQty: number;
  requiredQty: number;
  scannedQty: number;
  missingROs: string[];
  timestamp: string;
}

export interface DuplicateScanAlert {
  cotSP: string;
  soRO: string;
  maLK: string;
  productName: string;
  timestamp: string;
}

export interface ActiveScanTarget {
  item: InventoryItem;
  totalForThisMaLK: {
    required: number;
    scanned: number;
    completedROs: string[];
    pendingROs: string[];
  };
}

export interface ReportSummary {
  totalItems: number;
  totalRequiredQty: number;
  totalScannedQty: number;
  completedItemsCount: number;
  inProgressItemsCount: number;
  unscannedItemsCount: number;
  missingQty: number;
  completionRate: number;
  iwSummary: {
    totalItems: number;
    requiredQty: number;
    scannedQty: number;
    completedItems: number;
    missingQty: number;
    completionRate: number;
  };
  oowSummary: {
    totalItems: number;
    requiredQty: number;
    scannedQty: number;
    completedItems: number;
    missingQty: number;
    completionRate: number;
  };
  byTypeBreakdown: Record<string, { required: number; scanned: number }>;
  byModelBreakdown: Record<string, { required: number; scanned: number }>;
}

export type FilterStatus = 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'UNSCANNED' | 'MISSING';

export type SyncMode = 'merge_keep_scanned' | 'clean_replace';

export interface SyncSourceInfo {
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

export interface SyncDiffResult {
  addedCount: number;
  retainedScannedCount: number;
  removedCount: number;
  totalNewCount: number;
  timestamp: string;
  mode: SyncMode;
  details: {
    addedROs: string[];
    retainedROs: string[];
    removedROs: string[];
  };
}
