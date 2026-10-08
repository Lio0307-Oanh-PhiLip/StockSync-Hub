import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  RefreshCw, 
  Upload, 
  FileSpreadsheet, 
  Cloud, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  X, 
  AlertTriangle, 
  Sliders, 
  Clock, 
  Globe, 
  Download,
  Database,
  Sparkles,
  Smartphone,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import { InventoryItem, SyncDiffResult, SyncMode, SyncSourceInfo } from '../types';
import { downloadTemplate, parseImportFile } from '../utils/excel';
import { fetchRemoteSheetData, generatePresetWarehouseBatch } from '../utils/syncManager';
import { getCloudServerUrl, setCustomServerUrl, CloudConnectionStatus } from '../utils/cloudSync';

interface SyncManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceInfo: SyncSourceInfo;
  latestDiff: SyncDiffResult | null;
  scCode: string;
  onApplySync: (
    newIW: InventoryItem[],
    newOOW: InventoryItem[],
    source: SyncSourceInfo,
    mode: SyncMode
  ) => void;
  onAutoSyncToggle?: (enabled: boolean, intervalMinutes: number, url?: string) => void;
  cloudStatus?: CloudConnectionStatus;
  onlineClients?: number;
  onTestPing?: () => void;
  dataIW?: InventoryItem[];
  dataOOW?: InventoryItem[];
}

export const SyncManagerModal: React.FC<SyncManagerModalProps> = ({
  isOpen,
  onClose,
  sourceInfo,
  latestDiff,
  scCode,
  onApplySync,
  onAutoSyncToggle,
  cloudStatus = 'connected',
  onlineClients = 1,
  onTestPing,
  dataIW,
  dataOOW
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'realtime_apk' | 'excel' | 'google_sheet' | 'preset'>('realtime_apk');
  const [syncMode, setSyncMode] = useState<SyncMode>('merge_keep_scanned');
  const [isPushingPC, setIsPushingPC] = useState<boolean>(false);
  const [pushSuccessMsg, setPushSuccessMsg] = useState<string | null>(null);
  
  // Realtime Cloud Endpoint State
  const [serverUrl, setServerUrl] = useState<string>(getCloudServerUrl());
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(getCloudServerUrl());
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  
  // Google Sheets state
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(sourceInfo.syncUrl || '');
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Auto-sync timer state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(sourceInfo.autoSyncEnabled || false);
  const [autoInterval, setAutoInterval] = useState<number>(sourceInfo.autoSyncIntervalMinutes || 3);

  if (!isOpen) return null;

  // Handle local Excel file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        version: Date.now(),
        autoSyncEnabled: false
      };

      onApplySync(result.iw, result.oow, newSource, syncMode);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đọc file Excel!');
    }
    e.target.value = '';
  };

  // Handle Google Sheet remote sync
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setUrlError('Vui lòng nhập đường link Google Sheets!');
      return;
    }

    setUrlError(null);
    setIsFetchingUrl(true);

    try {
      const result = await fetchRemoteSheetData(googleSheetUrl);
      const newSource: SyncSourceInfo = {
        name: 'Google Sheets (Trực tuyến)',
        sourceType: 'google_sheet',
        lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
        rowCount: result.iw.length + result.oow.length,
        iwCount: result.iw.length,
        oowCount: result.oow.length,
        version: Date.now(),
        syncUrl: googleSheetUrl,
        autoSyncEnabled,
        autoSyncIntervalMinutes: autoInterval
      };

      if (onAutoSyncToggle) {
        onAutoSyncToggle(autoSyncEnabled, autoInterval, googleSheetUrl);
      }

      onApplySync(result.iw, result.oow, newSource, syncMode);
    } catch (err: any) {
      setUrlError(err.message || 'Không thể đồng bộ từ Google Sheets!');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Handle switching preset batch
  const handleSelectPreset = (batchId: 'batch_august' | 'batch_september_extended' | 'batch_priority_lcd_main') => {
    const batch = generatePresetWarehouseBatch(batchId, scCode);
    const newSource: SyncSourceInfo = {
      name: batch.name,
      sourceType: 'sample_data',
      lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
      rowCount: batch.iw.length + batch.oow.length,
      iwCount: batch.iw.length,
      oowCount: batch.oow.length,
      version: Date.now()
    };

    onApplySync(batch.iw, batch.oow, newSource, syncMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Trung Tâm Đồng Bộ Dữ Liệu Đầu Vào
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Tự Động 100%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ứng dụng tự động điều chỉnh toàn bộ giao diện, chỉ số và danh sách đối chiếu theo dữ liệu mới nạp.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-700">
          
          {/* BANNER NGUỒN HIỆN TẠI */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                Danh Sách Đang Được Sử Dụng Hiện Tại:
              </span>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                {sourceInfo.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>🕒 Đồng bộ lúc: <strong>{sourceInfo.lastSyncedAt}</strong></span>
                <span>•</span>
                <span>Quy mô: <strong>{sourceInfo.rowCount}</strong> dòng ({sourceInfo.iwCount} IW / {sourceInfo.oowCount} OOW)</span>
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100/70 text-blue-700 border border-blue-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                Đang kích hoạt
              </span>
            </div>
          </div>

          {/* KẾT QUẢ SO SÁNH / THAY ĐỔI GẦN NHẤT (NẾU CÓ) */}
          {latestDiff && (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Kết Quả Đồng Bộ Vừa Thực Hiện ({latestDiff.timestamp}):
                </span>
                <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  {latestDiff.mode === 'merge_keep_scanned' ? 'Hợp nhất thông minh' : 'Làm mới 100%'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Linh kiện mới thêm</span>
                  <span className="text-sm font-black text-emerald-600">+{latestDiff.addedCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Giữ nguyên đã quét</span>
                  <span className="text-sm font-black text-blue-600">{latestDiff.retainedScannedCount}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Mã loại bỏ khỏi đợt</span>
                  <span className="text-sm font-black text-rose-600">-{latestDiff.removedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* LỰA CHỌN CHẾ ĐỘ ĐỒNG BỘ (SMART MERGE VS CLEAN SYNC) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              Chế Độ Xử Lý Khi Nạp Danh Sách Mới:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label 
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  syncMode === 'merge_keep_scanned'
                    ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  checked={syncMode === 'merge_keep_scanned'}
                  onChange={() => setSyncMode('merge_keep_scanned')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    ✨ Hợp Nhất Thông Minh (Khuyên dùng)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Tự động giữ nguyên tiến độ đã quét của những mã phiếu còn nằm trong danh sách mới. Linh kiện mới thêm sẽ ở trạng thái Chưa Scan.
                  </span>
                </div>
              </label>

              <label 
                className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  syncMode === 'clean_replace'
                    ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="syncMode"
                  checked={syncMode === 'clean_replace'}
                  onChange={() => setSyncMode('clean_replace')}
                  className="mt-0.5 text-blue-600"
                />
                <div>
                  <span className="font-bold text-slate-900 block">
                    🔄 Làm Mới Hoàn Toàn (Clean Sync)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Xóa sạch toàn bộ lượt quét cũ. Bắt đầu đối chiếu từ 0% theo 100% dữ liệu của danh sách mới nạp.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* TABS LỰA CHỌN NGUỒN ĐỒNG BỘ */}
          <div>
            <div className="flex border-b border-slate-200 gap-2 mb-3 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('realtime_apk')}
                className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'realtime_apk'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đồng Bộ Realtime PC ⇄ APK</span>
                <span className={`w-2 h-2 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'excel'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Nạp File Excel / CSV Mới
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('google_sheet')}
                className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'google_sheet'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Google Sheets / URL Đám Mây
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preset')}
                className={`pb-2 px-3 text-xs font-bold transition flex items-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'preset'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Chuyển Đợt Kiểm Kê Mẫu
              </button>
            </div>

            {/* TAB REALTIME: PC ⇄ APK CLOUD SYNC */}
            {activeTab === 'realtime_apk' && (
              <div className="space-y-4">
                {/* STATUS BANNER */}
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Wifi className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-emerald-950">
                            Hệ Thống Đồng Bộ Đang Hoạt Động Thời Gian Thực
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                            LIVE SSE
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          {onlineClients > 1 
                            ? `Đang kết nối song song ${onlineClients} thiết bị (PC & App APK Android).` 
                            : 'Đang kết nối Server Cloud 24/7. Mở app APK trên điện thoại để đồng bộ tức thì.'}
                        </p>
                      </div>
                    </div>

                    {onTestPing && (
                      <button
                        type="button"
                        onClick={onTestPing}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Test Ping Đồng Bộ</span>
                      </button>
                    )}
                  </div>

                  {/* 3 CORE REALTIME GUARANTEES MATCHING USER REQUEST */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3.5 pt-3.5 border-t border-emerald-200/80 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1. Thay đổi danh sách trên PC</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Khi PC nạp Excel mới hoặc đổi đợt, Server đẩy ngay lập tức xuống APK. Màn hình điện thoại tự làm mới 100%.
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>2. Xóa dòng đã quét trên PC</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Khi PC bấm xóa linh kiện đã quét, APK trên điện thoại tự động chuyển dòng đó về "Chưa Scan" tức thì.
                      </p>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>3. Quét 2 chiều từ APK hoặc PC</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Quét bằng camera điện thoại hoặc súng quét mã vạch PC: kết quả hiển thị đồng thời trên cả 2 máy.
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR CODE & SERVER ENDPOINT FOR APK PHONE */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 flex flex-col items-center">
                    <QRCodeSVG value={serverUrl} size={110} />
                    <span className="text-[10px] font-bold text-slate-500 mt-1">Quét bằng camera điện thoại</span>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800">
                          Địa chỉ Cloud Server kết nối cho App APK:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(serverUrl);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedUrl ? 'Đã sao chép!' : 'Sao chép Link'}
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {isEditingUrl ? (
                          <div className="flex-1 flex gap-1.5">
                            <input
                              type="text"
                              value={tempUrl}
                              onChange={e => setTempUrl(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCustomServerUrl(tempUrl);
                                setServerUrl(getCloudServerUrl());
                                setIsEditingUrl(false);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg text-xs"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTempUrl(serverUrl);
                                setIsEditingUrl(false);
                              }}
                              className="px-2 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 truncate">
                            <span className="truncate">{serverUrl}</span>
                            <button
                              type="button"
                              onClick={() => setIsEditingUrl(true)}
                              className="text-blue-600 font-bold hover:underline ml-2 text-[11px] shrink-0"
                            >
                              Đổi URL
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      💡 Mặc định app APK Android đóng gói sẵn đã trỏ tự động về Server Cloud này. Bạn chỉ cần mở app là cả PC và điện thoại sẽ tự động đồng bộ thời gian thực.
                    </p>
                  </div>
                </div>

                {/* 3 NÚT ĐIỀU KHIỂN ĐỒNG BỘ CẤP CAO v1.3.0 */}
                <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    ⚡ Thao Tác Đồng Bộ Nhanh (v1.3.0 Live Sync):
                  </span>
                  
                  {pushSuccessMsg && (
                    <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300">
                      {pushSuccessMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Push PC -> Server */}
                    <button
                      type="button"
                      disabled={isPushingPC || !dataIW || !dataOOW}
                      onClick={async () => {
                        if (!dataIW || !dataOOW) return;
                        setIsPushingPC(true);
                        try {
                          const res = await fetch(`${serverUrl}/api/sync/push-from-pc`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ iw: dataIW, oow: dataOOW, sourceInfo })
                          });
                          if (res.ok) {
                            setPushSuccessMsg('✓ Đã đẩy dữ liệu PC lên Server! Điện thoại sẽ tự nhận ngay lập tức.');
                            setTimeout(() => setPushSuccessMsg(null), 4000);
                          }
                        } catch (e: any) {
                          alert('Lỗi: ' + e?.message);
                        } finally {
                          setIsPushingPC(false);
                        }
                      }}
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isPushingPC ? 'Đang đẩy...' : 'Đẩy Dữ Liệu PC Lên Server'}</span>
                    </button>

                    {/* 2. Reset standard v1.3.0 */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Khôi phục danh sách kho xác về chuẩn ban đầu v1.3.0 (366 linh kiện Phú Lâm)?')) return;
                        try {
                          const res = await fetch(`${serverUrl}/api/sync/reset-standard`, { method: 'POST' });
                          if (res.ok) {
                            window.location.reload();
                          }
                        } catch (e: any) {
                          alert('Lỗi: ' + e?.message);
                        }
                      }}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Về Kho Chuẩn v1.3.0</span>
                    </button>

                    {/* 3. Clear scans */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Đặt lại tất cả các linh kiện về trạng thái Chưa Scan (0%)?')) return;
                        try {
                          const res = await fetch(`${serverUrl}/api/sync/clear-scans`, { method: 'POST' });
                          if (res.ok) {
                            window.location.reload();
                          }
                        } catch (e: any) {
                          alert('Lỗi: ' + e?.message);
                        }
                      }}
                      className="p-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Bắt Đầu Ca Quét Mới (0%)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: EXCEL / CSV FILE */}
            {activeTab === 'excel' && (
              <div className="space-y-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-2xl p-6 text-center cursor-pointer transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Nhấp vào đây để chọn file Excel / CSV danh sách mới
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Hỗ trợ file .xlsx, .xls hoặc .csv với đầy đủ các cột chuẩn: Cột SP, Mã LK, Số RO, BH/DV (IW/OOW), Tên LK, Slg.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Chưa có file mẫu chuẩn OPPO?</span>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file Excel mẫu tại đây
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEETS / CLOUD URL */}
            {activeTab === 'google_sheet' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Đường dẫn Google Sheets hoặc link xuất CSV trực tuyến:
                  </label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={e => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 Hỗ trợ link chia sẻ Google Sheets thông thường. Hệ thống tự động chuyển đổi sang định dạng CSV tải tức thì.
                  </p>
                </div>

                {/* Auto sync interval toggle */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      Tự Động Đồng Bộ Định Kỳ (Background Auto-Poll):
                    </span>
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={e => setAutoSyncEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                  {autoSyncEnabled && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-slate-600">Tần suất kiểm tra:</span>
                      <select
                        value={autoInterval}
                        onChange={e => setAutoInterval(Number(e.target.value))}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white font-bold text-slate-800"
                      >
                        <option value={1}>Mỗi 1 phút</option>
                        <option value={3}>Mỗi 3 phút</option>
                        <option value={5}>Mỗi 5 phút</option>
                        <option value={15}>Mỗi 15 phút</option>
                      </select>
                    </div>
                  )}
                </div>

                {urlError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{urlError}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isFetchingUrl}
                  onClick={handleFetchGoogleSheet}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetchingUrl ? 'animate-spin' : ''}`} />
                  <span>{isFetchingUrl ? 'Đang tải & phân tích dữ liệu...' : 'Đồng Bộ Ngay Từ Google Sheets'}</span>
                </button>
              </div>
            )}

            {/* TAB 3: PRESET BATCHES */}
            {activeTab === 'preset' && (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-500 mb-2">
                  Chọn nhanh các danh sách kho xác thực tế được thiết lập sẵn cho Trung tâm CSKH OPPO:
                </p>

                <div 
                  onClick={() => handleSelectPreset('batch_august')}
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Đợt 1: Danh Sách Chuẩn Kho Xác Tháng 8/2026
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      366 dòng linh kiện (12 IW, 351 OOW, 3 KMH) - Đã scan sẵn 127 màn hình A53/Reno6Z.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                </div>

                <div 
                  onClick={() => handleSelectPreset('batch_september_extended')}
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Đợt 2: Danh Sách Bổ Sung Tháng 9/2026 (+46 LK Mới)
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      412 dòng linh kiện (Mở rộng bổ sung linh kiện dòng Reno12 5G và Find N3 gập).
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                </div>

                <div 
                  onClick={() => handleSelectPreset('batch_priority_lcd_main')}
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Đợt 3: Danh Sách Trọng Điểm Màn Hình & Main (154 LK)
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      154 dòng linh kiện trọng tâm cần hoàn tất gửi trả gấp về nhà máy.
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Đồng bộ theo thời gian thực (Realtime Multi-tab & Device Sync)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
