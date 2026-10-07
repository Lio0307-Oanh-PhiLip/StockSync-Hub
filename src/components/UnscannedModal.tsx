import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  KeyRound,
  Filter,
  Layers
} from 'lucide-react';
import { InventoryItem, ServiceType } from '../types';

interface UnscannedModalProps {
  isOpen: boolean;
  onClose: () => void;
  scCode: string;
  allItems: InventoryItem[];
  filterMaLK?: string | null;
  filterServiceType?: string | null;
  onScanItemManual?: (item: InventoryItem) => void;
}

export const UnscannedModal: React.FC<UnscannedModalProps> = ({
  isOpen,
  onClose,
  scCode,
  allItems,
  filterMaLK,
  filterServiceType,
  onScanItemManual
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OOW' | 'IW' | 'UNSCANNED' | 'SCANNED'>('ALL');
  const [isSuperUnlocked, setIsSuperUnlocked] = useState<boolean>(false);
  const [copiedRO, setCopiedRO] = useState<string | null>(null);

  // Compute dataset to display
  const filteredList = useMemo(() => {
    return allItems.filter(item => {
      // If modal was opened specifically for a single part number (from the active badge)
      if (filterMaLK && item.maLK !== filterMaLK) return false;
      if (filterServiceType && item.bhDv !== filterServiceType) return false;

      // Tab filter
      if (activeFilter === 'OOW' && item.bhDv !== 'OOW') return false;
      if (activeFilter === 'IW' && item.bhDv !== 'IW') return false;
      if (activeFilter === 'UNSCANNED' && item.daQuet >= item.slg) return false;
      if (activeFilter === 'SCANNED' && item.daQuet === 0) return false;

      // Search keyword
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchRO = item.soRO.toLowerCase().includes(query);
        const matchMaLK = item.maLK.toLowerCase().includes(query);
        const matchName = item.productName.toLowerCase().includes(query);
        const matchModel = item.model.toLowerCase().includes(query);
        const matchCotSP = item.cotSP.toLowerCase().includes(query);
        return matchRO || matchMaLK || matchName || matchModel || matchCotSP;
      }

      return true;
    });
  }, [allItems, filterMaLK, filterServiceType, activeFilter, searchTerm]);

  const handleCheckGCSM = (soRO: string) => {
    navigator.clipboard.writeText(soRO);
    setCopiedRO(soRO);
    setTimeout(() => setCopiedRO(null), 2500);
  };

  if (!isOpen) return null;

  const currentGroupLabel = filterMaLK 
    ? `MÃ LINH KIỆN ${filterMaLK}`
    : filterServiceType 
    ? `NHÓM PHIẾU DỊCH VỤ (${filterServiceType})`
    : 'NHÓM PHIẾU DỊCH VỤ (OOW / IW)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER (Matching exact Figure 3 Header) */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 flex-wrap">
              <span>Danh sách phiếu CẦN SCAN - </span>
              <span className="text-blue-600 font-mono font-extrabold">{scCode}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Tổng: {allItems.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUBHEADER & CONTROLS */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Section Indicator with Blue Accent Bar */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {currentGroupLabel}
            </span>
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
              {filteredList.length}
            </span>

            {/* Mở khóa vượt cấp button */}
            <button
              type="button"
              onClick={() => setIsSuperUnlocked(!isSuperUnlocked)}
              className={`ml-2 text-xs font-medium px-2.5 py-0.5 rounded-md transition border ${
                isSuperUnlocked
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              {isSuperUnlocked ? '✓ Đã mở khóa vượt cấp' : 'Mở khóa vượt cấp'}
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số RO, Mã LK..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs outline-none"
            />
          </div>

        </div>

        {/* Copy Notice Toast */}
        {copiedRO && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 text-center font-medium animate-in slide-in-from-top-1">
            ✓ Đã copy số RO: <strong>{copiedRO}</strong> vào clipboard để tra cứu trên GCSM!
          </div>
        )}

        {/* TABLE CONTENT (Matching exact columns in Figure 3) */}
        <div className="flex-1 overflow-y-auto max-h-[520px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider z-10">
              <tr>
                <th className="py-2.5 px-4 font-bold">TRẠNG THÁI</th>
                <th className="py-2.5 px-4 font-bold">SỐ RO</th>
                <th className="py-2.5 px-4 font-bold">MÃ LK</th>
                <th className="py-2.5 px-4 font-bold">TÊN LK</th>
                <th className="py-2.5 px-3 font-bold">MODEL</th>
                <th className="py-2.5 px-3 font-bold">LOẠI</th>
                <th className="py-2.5 px-4 text-center font-bold">SLG</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy phiếu nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isScanned = item.daQuet >= item.slg;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* TRẠNG THÁI */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onScanItemManual && onScanItemManual(item)}
                          title={isScanned ? "Đã quét thành công" : "Nhấp để đánh dấu đã quét"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition border ${
                            isScanned
                              ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isScanned ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã Scan</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Chưa Scan</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* SỐ RO + Check GCSM button */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-800 font-medium">{item.soRO}</span>
                          <button
                            type="button"
                            onClick={() => handleCheckGCSM(item.soRO)}
                            title="Sao chép số RO để đối chiếu hệ thống GCSM"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold transition"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Check GCSM</span>
                          </button>
                        </div>
                      </td>

                      {/* MÃ LK */}
                      <td className="py-2.5 px-4 font-mono text-slate-700 font-medium whitespace-nowrap">
                        {item.maLK}
                      </td>

                      {/* TÊN LK */}
                      <td className="py-2.5 px-4 font-bold text-slate-800 max-w-[200px] truncate" title={item.productName}>
                        {item.productName}
                      </td>

                      {/* MODEL */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {item.model}
                      </td>

                      {/* LOẠI */}
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {item.type || 'LCD'}
                      </td>

                      {/* SLG */}
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">
                        {item.slg}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hiển thị <strong>{filteredList.length}</strong> / <strong>{allItems.length}</strong> dòng
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
