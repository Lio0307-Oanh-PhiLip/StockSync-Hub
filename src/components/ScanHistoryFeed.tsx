import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Trash2, RefreshCw, Scan, Search, 
  Layers, ArrowUpDown, FileSpreadsheet, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { InventoryItem, ActiveScanTarget } from '../types';

interface ScanHistoryFeedProps {
  scannedItems: InventoryItem[];
  activeScan: ActiveScanTarget | null;
  onRemoveScannedItem: (id: string) => void;
  onClearScannedFeed: () => void;
  scanInput: string;
  onScanInputChange: (val: string) => void;
  onScanSubmit: (e: React.FormEvent) => void;
  onExportExcel: () => void;
  totalPreloadedCount: number;
}

export const ScanHistoryFeed: React.FC<ScanHistoryFeedProps> = ({
  scannedItems,
  activeScan,
  onRemoveScannedItem,
  onClearScannedFeed,
  scanInput,
  onScanInputChange,
  onScanSubmit,
  onExportExcel,
  totalPreloadedCount
}) => {
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Filter scanned list by search term
  const filteredFeed = useMemo(() => {
    if (!filterSearch.trim()) return scannedItems;
    const q = filterSearch.toLowerCase().trim();
    return scannedItems.filter(it => 
      it.cotSP.toLowerCase().includes(q) ||
      it.soRO.toLowerCase().includes(q) ||
      it.maLK.toLowerCase().includes(q) ||
      it.productName.toLowerCase().includes(q) ||
      it.model.toLowerCase().includes(q)
    );
  }, [scannedItems, filterSearch]);

  // Active Part Code X / Y badge matching Figure 3
  const activeBadgeInfo = useMemo(() => {
    if (!activeScan) return null;
    const x = activeScan.totalForThisMaLK.scanned;
    const y = activeScan.totalForThisMaLK.required;
    const bh = activeScan.item.bhDv;
    const malk = activeScan.item.maLK;
    return `Đã scan ${x} / ${y} phiếu ${bh} của mã LK ${malk}`;
  }, [activeScan]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      
      {/* Top Header Bar matching Figure 3 */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        
        {/* Left: Title "Lịch sử đối chiếu" + Count Badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Lịch sử đối chiếu</span>
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-black">
            {scannedItems.length}
          </span>
        </div>

        {/* Center: Live Barcode Scan Input Field */}
        <form onSubmit={onScanSubmit} className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Scan className="w-4 h-4 text-blue-600 animate-pulse" />
            </div>
            <input
              id="barcode-feed-direct-input"
              type="text"
              value={scanInput}
              onChange={(e) => onScanInputChange(e.target.value)}
              placeholder="Bắn mã vạch vào đây..."
              className="w-full pl-10 pr-16 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 transition outline-hidden"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              Enter ↵
            </button>
          </div>
        </form>

        {/* Right: Badge Status & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          
          {/* Badge: Đã scan X / Y phiếu OOW của mã LK ... matching Figure 3 */}
          {activeBadgeInfo && (
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
              {activeBadgeInfo}
            </div>
          )}

          {/* Button: Làm mới danh sách */}
          <button
            id="reset-scan-feed-btn"
            type="button"
            onClick={onClearScannedFeed}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Đặt lại toàn bộ tiến độ quét về 0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Làm mới danh sách</span>
          </button>

          {/* Button: Xuất Excel 5 Sheet */}
          <button
            id="export-excel-feed-btn"
            type="button"
            onClick={onExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            title="Xuất file báo cáo Excel 5 Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>

      </div>

      {/* Sub Filter Search if list has items */}
      {scannedItems.length > 5 && (
        <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Lọc nhanh trong các mã đã scan..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-hidden focus:border-blue-500"
            />
          </div>
          <span className="text-[11px] text-slate-500">
            Hiển thị <strong>{filteredFeed.length}</strong> / <strong>{scannedItems.length}</strong> linh kiện đã scan
          </span>
        </div>
      )}

      {/* Live Table matching Figure 3 */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          
          {/* Header */}
          <thead className="bg-slate-50/90 text-slate-600 uppercase text-[11px] font-black tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xs">
            <tr>
              <th className="py-3 px-3.5 font-black text-slate-700">CỘT SCAN QR</th>
              <th className="py-3 px-3.5 font-black text-slate-700">TRẠNG THÁI</th>
              <th className="py-3 px-3.5 font-black text-blue-700">SỐ RO</th>
              <th className="py-3 px-3.5 font-black text-slate-700">MÃ LK</th>
              <th className="py-3 px-3.5 font-black text-slate-700">TÊN LK</th>
              <th className="py-3 px-3.5 font-black text-slate-700">MODEL</th>
              <th className="py-3 px-3.5 font-black text-slate-700">BH/DV</th>
              <th className="py-3 px-3.5 font-black text-slate-700">REMARK</th>
              <th className="py-3 px-3.5 font-black text-slate-700 text-center w-14">XÓA</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {filteredFeed.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 px-4 text-center text-slate-400">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Scan className="w-7 h-7 animate-pulse" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">
                      Chưa có linh kiện nào được scan vào danh sách
                    </h3>
                    <p className="text-xs text-slate-500">
                      Hãy sử dụng súng quét mã vạch hoặc camera để bắn mã vạch <strong className="text-slate-700">Cột SP</strong>. Dữ liệu scan mới sẽ tự động xuất hiện lên trên cùng của bảng này.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFeed.map((item, index) => {
                const isNewest = index === 0;

                return (
                  <tr
                    key={item.id}
                    className={`transition duration-150 hover:bg-slate-50/80 ${
                      isNewest ? 'bg-blue-50/50 font-medium' : 'bg-white'
                    }`}
                  >
                    {/* 1. CỘT SCAN QR */}
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 max-w-[220px] truncate" title={item.cotSP}>
                      {item.cotSP}
                    </td>

                    {/* 2. TRẠNG THÁI */}
                    <td className="py-3 px-3.5">
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold whitespace-nowrap">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Khớp, Trả Xác</span>
                      </span>
                    </td>

                    {/* 3. SỐ RO (Bold Blue Text) */}
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {item.soRO}
                    </td>

                    {/* 4. MÃ LK */}
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {item.maLK}
                    </td>

                    {/* 5. TÊN LK */}
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      {item.productName}
                    </td>

                    {/* 6. MODEL */}
                    <td className="py-3 px-3.5 text-slate-800 font-medium whitespace-nowrap">
                      {item.model}
                    </td>

                    {/* 7. BH/DV */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`font-black text-[11px] uppercase ${
                        item.bhDv === 'IW' ? 'text-blue-700' : 'text-indigo-900'
                      }`}>
                        {item.bhDv}
                      </span>
                    </td>

                    {/* 8. REMARK */}
                    <td className="py-3 px-3.5 text-slate-500">
                      {item.remark || '-'}
                    </td>

                    {/* 9. XÓA */}
                    <td className="py-3 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveScannedItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hủy quét linh kiện này (Trả về Chưa Scan)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {/* Footer summary bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Tổng số linh kiện đã quét vào: <strong className="text-slate-900 font-bold">{scannedItems.length}</strong> cái</span>
          <span className="text-slate-300">•</span>
          <span>Dữ liệu kho xác nạp sẵn: <strong className="text-slate-700">{totalPreloadedCount}</strong> cái</span>
        </div>
        <span className="text-[11px] text-slate-500 italic">
          Mã vừa scan mới nhất luôn hiển thị ở dòng đầu tiên trên cùng
        </span>
      </div>

    </div>
  );
};
