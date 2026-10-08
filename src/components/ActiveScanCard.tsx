import React from 'react';
import { 
  Scan, CheckCircle2, AlertTriangle, Clock, 
  FileText, ShieldCheck, Tag, X, AlertOctagon, Copy, Ban
} from 'lucide-react';
import { ActiveScanTarget, PreviousScanAlert, DuplicateScanAlert } from '../types';

interface ActiveScanCardProps {
  activeScan: ActiveScanTarget | null;
  previousAlert: PreviousScanAlert | null;
  duplicateAlert: DuplicateScanAlert | null;
  onDismissPreviousAlert: () => void;
  onDismissDuplicateAlert: () => void;
  onSelectROFilter?: (ro: string) => void;
}

export const ActiveScanCard: React.FC<ActiveScanCardProps> = ({
  activeScan,
  previousAlert,
  duplicateAlert,
  onDismissPreviousAlert,
  onDismissDuplicateAlert,
  onSelectROFilter
}) => {
  if (!activeScan && !previousAlert && !duplicateAlert) {
    return null;
  }

  // Calculate X (scanned) / Y (total) for this Part Code in the sheet
  const scannedX = activeScan ? activeScan.totalForThisMaLK.scanned : 0;
  const totalY = activeScan ? activeScan.totalForThisMaLK.required : 0;
  const isCompleteForThisMaLK = totalY > 0 && scannedX >= totalY;
  const percentage = totalY > 0 ? Math.min(100, Math.round((scannedX / totalY) * 100)) : 0;

  return (
    <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
      
      {/* 1. DUPLICATE SCAN ALERT (Cảnh báo quét trùng phiếu của cùng 1 mã / dữ liệu cột SP) */}
      {duplicateAlert && (
        <div 
          id="duplicate-scan-warning-banner"
          className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-md relative overflow-hidden animate-shake"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                <Ban className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-600 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                    Cảnh Báo Quét Trùng Phiếu (Đã Quét Trước Đó)
                  </span>
                  <span className="text-rose-700 text-[11px] font-semibold">
                    Lúc {duplicateAlert.timestamp}
                  </span>
                </div>

                <h4 className="text-rose-950 font-black text-sm">
                  Phiếu này đã được quét trước đó! <span className="font-mono bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded border border-rose-300">[{duplicateAlert.cotSP}]</span>
                </h4>

                <p className="text-rose-800 text-xs">
                  Mã LK: <strong>{duplicateAlert.maLK}</strong> ({duplicateAlert.productName}) • Số RO: <strong className="font-mono">{duplicateAlert.soRO}</strong>. 
                  <span className="font-bold text-rose-900 ml-1">Hệ thống đã chặn không cộng trùng số lượng.</span>
                </p>
              </div>
            </div>

            <button
              id="dismiss-duplicate-alert-btn"
              type="button"
              onClick={onDismissDuplicateAlert}
              className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-200/50 rounded-lg transition"
              title="Đóng cảnh báo trùng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. PREVIOUS SCAN ALERT (Báo mã cũ chưa quét đủ số lượng và các số phiếu RO tương ứng) */}
      {previousAlert && (
        <div 
          id="previous-scan-warning-banner"
          className="bg-amber-500/10 border-2 border-amber-500/80 rounded-2xl p-4 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-bounce">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-500 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                    Cảnh Báo Chuyển Mã Chưa Đủ Số Lượng
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Lúc {previousAlert.timestamp}
                  </span>
                </div>

                <h4 className="text-slate-900 font-bold text-sm">
                  Mã cũ <span className="font-mono text-amber-900 font-black bg-amber-100 px-1.5 py-0.5 rounded">[{previousAlert.previousMaLK}]</span> - {previousAlert.previousProductName} còn thiếu <span className="text-rose-600 font-black text-sm bg-white px-2 py-0.5 rounded-md border border-rose-300">{previousAlert.missingQty}</span> linh kiện!
                </h4>

                <p className="text-slate-700 text-xs">
                  Tiến độ mã cũ: <span className="font-bold">{previousAlert.scannedQty} / {previousAlert.requiredQty}</span> cái (Đã quét {previousAlert.scannedQty}, Còn nợ {previousAlert.missingQty}).
                </p>

                {/* Danh sách các số phiếu (Số RO) còn thiếu tương ứng */}
                {previousAlert.missingROs.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-200/80">
                    <span className="text-[11px] font-bold text-amber-900 block mb-1.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      Các số phiếu (Số RO) tương ứng còn thiếu:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {previousAlert.missingROs.map((ro) => (
                        <button
                          key={ro}
                          type="button"
                          onClick={() => onSelectROFilter && onSelectROFilter(ro)}
                          title={`Bấm để tìm kiếm số RO ${ro}`}
                          className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold text-[11px] rounded-md transition shadow-2xs flex items-center gap-1"
                        >
                          <span>{ro}</span>
                          <span className="text-[9px] text-amber-600 font-normal">🔍</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              id="dismiss-previous-alert-btn"
              type="button"
              onClick={onDismissPreviousAlert}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-amber-200/50 rounded-lg transition"
              title="Đóng thông báo cảnh báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. CURRENT ACTIVE SCANNING PART (Hiển thị mã đang quét lên trên & số lượng X (đã quét) / Y (tổng) của mã LK đó) */}
      {activeScan && (
        <div 
          id="active-scanning-card"
          className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-700/50 relative overflow-hidden"
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            
            {/* Left: Part identification */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
                  <Scan className="w-3.5 h-3.5 animate-pulse" />
                  Mã Đang Quét Hiện Tại
                </span>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                  activeScan.item.bhDv === 'IW' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
                }`}>
                  {activeScan.item.bhDv === 'IW' ? 'IW (Bảo Hành)' : 'OOW (Ngoài BH)'}
                </span>

                <span className="px-2 py-0.5 rounded-md bg-white/10 text-blue-200 text-[10px] font-bold">
                  Type: {activeScan.item.type}
                </span>

                {activeScan.item.lastScannedAt && (
                  <span className="text-[10px] text-blue-300 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {activeScan.item.lastScannedAt}
                  </span>
                )}
              </div>

              {/* Product Name & Part Number */}
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                  {activeScan.item.productName}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-sm text-blue-200">
                  <span>Mã LK: <strong className="font-mono text-white text-base bg-white/20 px-2.5 py-0.5 rounded-lg font-black">{activeScan.item.maLK}</strong></span>
                  <span className="text-white/40">•</span>
                  <span>Model: <strong className="text-white font-bold">{activeScan.item.model}</strong></span>
                  <span className="text-white/40">•</span>
                  <span>Số RO vừa quét: <strong className="font-mono text-blue-100 font-bold bg-white/15 px-2 py-0.5 rounded-md">{activeScan.item.soRO}</strong></span>
                </div>
              </div>

              {/* Composite Barcode / Cột SP */}
              <div className="pt-1.5">
                <span className="text-xs text-blue-300 font-bold">Cột SP: </span>
                <span className="font-mono text-sm sm:text-base font-black text-amber-300 bg-black/50 px-2.5 py-1 rounded-md border border-amber-300/40 select-all tracking-wider">
                  {activeScan.item.cotSP}
                </span>
              </div>
            </div>

            {/* Right: Realtime X (đã quét vào) / Y (tổng) linh kiện của Linh Kiện đó trong sheet */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 flex flex-col items-center justify-center min-w-[230px] text-center shadow-inner">
              
              {/* Badge matching Figure 3 */}
              <div className="px-2.5 py-1 rounded-md bg-blue-500/30 border border-blue-400/50 text-[11px] font-bold text-blue-100 mb-2 whitespace-nowrap">
                Đã scan {scannedX} / {totalY} phiếu {activeScan.item.bhDv} của mã LK {activeScan.item.maLK}
              </div>

              {/* Huge X / Y Counter */}
              <div className="flex items-baseline justify-center gap-1.5 my-0.5">
                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  isCompleteForThisMaLK 
                    ? 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.5)]' 
                    : 'text-amber-300 drop-shadow-[0_2px_10px_rgba(252,211,77,0.4)]'
                }`}>
                  {scannedX}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-white/50 font-mono">
                  / {totalY}
                </span>
                <span className="text-xs font-semibold text-blue-200 ml-1">
                  linh kiện
                </span>
              </div>

              {/* Status pill */}
              <div className="mt-1">
                {isCompleteForThisMaLK ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã Quét Đủ 100% (Khớp Hết Phiếu)
                  </span>
                ) : scannedX > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold">
                    <Clock className="w-3.5 h-3.5" />
                    Đang Quét Dở ({scannedX}/{totalY})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[11px] font-semibold">
                    Chưa Quét (0/{totalY})
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-white/20 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCompleteForThisMaLK ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
