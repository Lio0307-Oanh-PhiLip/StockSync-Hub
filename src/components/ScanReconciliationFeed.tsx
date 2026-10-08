import React, { useRef, useEffect } from 'react';
import { 
  Scan, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  ExternalLink, 
  Camera, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { InventoryItem, ActiveScanTarget } from '../types';

interface ScanReconciliationFeedProps {
  scannedItems: InventoryItem[];
  activeScan: ActiveScanTarget | null;
  scanInput: string;
  onScanInputChange: (val: string) => void;
  onScanSubmit: (e: React.FormEvent) => void;
  onRemoveScannedItem: (id: string) => void;
  onClearScannedFeed: () => void;
  onOpenScannerModal: () => void;
  onOpenPartDetailsModal: (maLK: string, bhDv?: string) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const ScanReconciliationFeed: React.FC<ScanReconciliationFeedProps> = ({
  scannedItems,
  activeScan,
  scanInput,
  onScanInputChange,
  onScanSubmit,
  onRemoveScannedItem,
  onClearScannedFeed,
  onOpenScannerModal,
  onOpenPartDetailsModal
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep input focused for high-speed barcode gun scanning
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current?.focus();
      }
    }, 1500);
    return () => clearInterval(focusInterval);
  }, []);

  // Compute active badge text
  const activeBadgeInfo = activeScan ? {
    maLK: activeScan.item.maLK,
    bhDv: activeScan.item.bhDv,
    scanned: activeScan.totalForThisMaLK.scanned,
    required: activeScan.totalForThisMaLK.required
  } : scannedItems.length > 0 ? {
    maLK: scannedItems[0].maLK,
    bhDv: scannedItems[0].bhDv,
    scanned: scannedItems.filter(i => i.maLK === scannedItems[0].maLK).length,
    required: scannedItems.filter(i => i.maLK === scannedItems[0].maLK).length
  } : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      
      {/* ACTION BAR (Matching exact Figure 2 & 3 header) */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white">
        
        {/* Title + Count */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-800">Lịch sử đối chiếu</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {scannedItems.length}
          </span>
        </div>

        {/* Scan Input Form (Primary high-visibility barcode gun receiver) */}
        <form onSubmit={onScanSubmit} className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Scan className="w-4 h-4 text-blue-600" />
            </div>
            <input
              ref={inputRef}
              id="barcode-gun-main-input"
              type="text"
              value={scanInput}
              onChange={(e) => onScanInputChange(e.target.value)}
              placeholder="Bắn mã vạch vào đây..."
              autoFocus
              className="w-full pl-10 pr-12 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 transition-all outline-none"
            />
            <div className="absolute right-2 flex items-center">
              <button
                type="button"
                onClick={onOpenScannerModal}
                title="Mở camera quét mã QR/Barcode"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Right side controls: Active Code Badge & Reset Button */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          
          {/* Active Part Badge (Exact pill button pointing in Figure 2/3) */}
          {activeBadgeInfo && (
            <button
              id="active-part-badge-btn"
              type="button"
              onClick={() => onOpenPartDetailsModal(activeBadgeInfo.maLK, activeBadgeInfo.bhDv)}
              title="Nhấp để xem chi tiết danh sách số RO của mã linh kiện này"
              className="px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100/90 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs group"
            >
              <span>
                Đã scan <strong className="text-blue-900">{activeBadgeInfo.scanned} / {activeBadgeInfo.required}</strong> phiếu {activeBadgeInfo.bhDv} của mã LK <strong className="font-mono text-blue-950">{activeBadgeInfo.maLK}</strong>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Reset Feed Button */}
          <button
            id="clear-scanned-feed-btn"
            type="button"
            onClick={onClearScannedFeed}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Làm mới danh sách</span>
          </button>

        </div>

      </div>

      {/* TABLE OF SCANNED RECONCILIATION ITEMS */}
      <div className="overflow-x-auto max-h-[580px] scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header Row */}
          <thead className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3.5 font-bold">CỘT SCAN QR</th>
              <th className="py-2.5 px-3 font-bold">TRẠNG THÁI</th>
              <th className="py-2.5 px-3 font-bold">SỐ RO</th>
              <th className="py-2.5 px-3 font-bold">MÃ LK</th>
              <th className="py-2.5 px-3.5 font-bold">TÊN LK</th>
              <th className="py-2.5 px-3 font-bold">MODEL</th>
              <th className="py-2.5 px-2.5 text-center font-bold">BH/DV</th>
              <th className="py-2.5 px-3 font-bold">REMARK</th>
              <th className="py-2.5 px-3 text-center font-bold">XÓA</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-sans">
            {scannedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Scan className="w-8 h-8 text-slate-300 stroke-1" />
                    <p className="font-medium text-slate-500">Chưa có linh kiện nào được quét trong phiên này</p>
                    <p className="text-[11px] text-slate-400">Bắn mã vạch trên phiếu hoặc tem linh kiện vào ô tìm kiếm ở trên để bắt đầu đối chiếu.</p>
                  </div>
                </td>
              </tr>
            ) : (
              scannedItems.map((item, index) => {
                const isFirstRow = index === 0;
                return (
                  <tr 
                    key={item.id}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      isFirstRow ? 'bg-blue-50/25 font-medium' : 'bg-white'
                    }`}
                  >
                    {/* CỘT SCAN QR */}
                    <td className="py-2.5 px-3.5 font-mono text-slate-800 text-[11px] max-w-[170px] truncate" title={item.cotSP}>
                      {item.cotSP}
                    </td>

                    {/* TRẠNG THÁI */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Khớp, Trả Xác</span>
                      </span>
                    </td>

                    {/* SỐ RO (Bold Blue text #2563eb matching screenshot) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold font-mono text-blue-600 tracking-tight">
                        {item.soRO}
                      </span>
                    </td>

                    {/* MÃ LK */}
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenPartDetailsModal(item.maLK, item.bhDv)}
                        title="Xem toàn bộ số RO của mã này"
                        className="hover:underline hover:text-blue-700"
                      >
                        {item.maLK}
                      </button>
                    </td>

                    {/* TÊN LK */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-800 max-w-[220px] truncate" title={item.productName}>
                      {item.productName}
                    </td>

                    {/* MODEL */}
                    <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {item.model}
                    </td>

                    {/* BH/DV */}
                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                        item.bhDv === 'IW' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {item.bhDv}
                      </span>
                    </td>

                    {/* REMARK */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[120px] truncate" title={item.remark || ''}>
                      {item.remark || ''}
                    </td>

                    {/* XÓA */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onRemoveScannedItem(item.id)}
                        title="Hủy quét linh kiện này"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
