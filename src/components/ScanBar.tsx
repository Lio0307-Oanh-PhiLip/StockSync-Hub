import React, { useRef, useEffect } from 'react';
import { Camera, QrCode, Sparkles, Plus, Radio, Layers } from 'lucide-react';
import { AppSheetTab, ServiceType } from '../types';

interface ScanBarProps {
  scanInput: string;
  onScanInputChange: (val: string) => void;
  onScanSubmit: (e: React.FormEvent) => void;
  activeTab: AppSheetTab;
  onTabChange: (tab: AppSheetTab) => void;
  iwCount: number;
  oowCount: number;
  chuaScanCount: number;
  daScanCount: number;
  onOpenScannerModal: () => void;
  onOpenManualModal: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  autoFocusEnabled: boolean;
  onToggleAutoFocus: () => void;
}

export const ScanBar: React.FC<ScanBarProps> = ({
  scanInput,
  onScanInputChange,
  onScanSubmit,
  activeTab,
  onTabChange,
  iwCount,
  oowCount,
  chuaScanCount,
  daScanCount,
  onOpenScannerModal,
  onOpenManualModal,
  autoFocusEnabled,
  onToggleAutoFocus
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocusEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-3">
      {/* Top Action Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            Vùng Quét Mã Linh Kiện Kho
          </span>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            Sheet đang mở: <span className="font-bold">{activeTab}</span>
          </span>
        </div>

        {/* Quick buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="open-camera-scanner-top-btn"
            type="button"
            onClick={onOpenScannerModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Quét Bằng Camera</span>
          </button>

          <button
            id="add-manual-item-btn"
            type="button"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Thêm Linh Kiện</span>
          </button>

          <button
            id="toggle-gun-autofocus-btn"
            type="button"
            onClick={onToggleAutoFocus}
            title={autoFocusEnabled ? 'Súng scan tự giữ tiêu điểm: Đang bật' : 'Bật chế độ súng scan'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              autoFocusEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{autoFocusEnabled ? 'Súng Scan: Bật' : 'Súng Scan: Tắt'}</span>
          </button>
        </div>
      </div>

      {/* Main Barcode Scanner Input */}
      <form onSubmit={onScanSubmit} className="mt-3 flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <QrCode className="w-5 h-5 text-blue-500" />
          </div>
          <input
            ref={inputRef}
            id="barcode-input-field"
            type="text"
            value={scanInput}
            onChange={(e) => onScanInputChange(e.target.value)}
            placeholder="Quét mã vạch Cột SP (VD: VN001021-AS2608...) hoặc Mã LK (621029...) rồi nhấn Enter"
            className="w-full pl-11 pr-24 py-2.5 bg-slate-50/80 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            autoComplete="off"
            spellCheck="false"
          />
          <div className="absolute inset-y-0 right-2 flex items-center">
            <span className="hidden sm:inline-flex items-center text-[10px] text-slate-400 font-mono bg-slate-200/80 px-2 py-0.5 rounded">
              ENTER ↵
            </span>
          </div>
        </div>

        <button
          id="submit-scan-btn"
          type="submit"
          disabled={!scanInput.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none shadow-xs transition flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Xác Nhận Quét</span>
        </button>
      </form>
    </div>
  );
};
