import React, { useRef } from 'react';
import { 
  BarChart2, 
  Search, 
  Upload, 
  RotateCw, 
  ListChecks, 
  Download, 
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { InventoryItem, ReportSummary, SyncSourceInfo } from '../types';

interface DashboardOverviewProps {
  scCode: string;
  onScCodeChange: (code: string) => void;
  dataIW: InventoryItem[];
  dataOOW: InventoryItem[];
  summary: ReportSummary;
  onOpenUnscannedModal: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReloadSampleData: () => void;
  onExportTTBH: () => void;
  onExportAll: () => void;
  onSaveDrive: () => void;
  isSavingDrive?: boolean;
  syncSourceInfo?: SyncSourceInfo;
  onOpenSyncModal?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  scCode,
  onScCodeChange,
  dataIW,
  dataOOW,
  summary,
  onOpenUnscannedModal,
  onFileUpload,
  onReloadSampleData,
  onExportTTBH,
  onExportAll,
  onSaveDrive,
  isSavingDrive,
  syncSourceInfo,
  onOpenSyncModal
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute exact breakdown per Type & Category
  const calculateTypeCounts = (typeKeyword: string) => {
    // IW
    const iwTotal = dataIW.filter(i => i.type?.toUpperCase() === typeKeyword).reduce((a, b) => a + b.slg, 0);
    const iwScanned = dataIW.filter(i => i.type?.toUpperCase() === typeKeyword).reduce((a, b) => a + b.daQuet, 0);

    // OOW
    const oowTotal = dataOOW.filter(i => i.type?.toUpperCase() === typeKeyword).reduce((a, b) => a + b.slg, 0);
    const oowScanned = dataOOW.filter(i => i.type?.toUpperCase() === typeKeyword).reduce((a, b) => a + b.daQuet, 0);

    return {
      iwScanned,
      iwTotal,
      oowScanned,
      oowTotal
    };
  };

  const lcdStats = calculateTypeCounts('LCD');
  const mainStats = calculateTypeCounts('MAIN');
  const othersStats = calculateTypeCounts('OTHERS');

  const iwTotalAll = summary.iwSummary.requiredQty;
  const iwScannedAll = summary.iwSummary.scannedQty;
  const iwPercent = iwTotalAll > 0 ? Math.round((iwScannedAll / iwTotalAll) * 100) : 0;

  const oowTotalAll = summary.oowSummary.requiredQty;
  const oowScannedAll = summary.oowSummary.scannedQty;
  const oowPercent = oowTotalAll > 0 ? Math.round((oowScannedAll / oowTotalAll) * 100) : 0;

  const totalLines = dataIW.length + dataOOW.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      
      {/* LEFT CARD: Thống kê Center (Col span 8 on large screens) */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-blue-600 font-black">📊</span> Bảng Thống Kê:
            </span>
            
            {/* Center Selector badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-300 rounded-lg text-xs sm:text-sm font-extrabold text-blue-800 shadow-2xs">
              <span>HCM 4 OPPO Service Center ({scCode})</span>
              <Search className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync Manager Button */}
            {onOpenSyncModal && (
              <button
                id="dashboard-sync-center-btn"
                type="button"
                onClick={onOpenSyncModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Mở Trung Tâm Đồng Bộ Dữ Liệu (Smart Auto-Sync)"
              >
                <RefreshCw className="w-3 h-3 text-blue-600" />
                <span>Đồng bộ: <strong>{totalLines}</strong> dòng</span>
              </button>
            )}

            {/* Total count badge / Upload trigger */}
            <label 
              title="Nhấp để tải file Excel mới vào hệ thống"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition shadow-2xs"
            >
              <span>Nạp Excel</span>
              <Upload className="w-3 h-3 text-slate-500" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>

            {/* Refresh F5 */}
            <button
              id="dashboard-f5-btn"
              type="button"
              onClick={onReloadSampleData}
              title="Tải lại / Làm mới dữ liệu chuẩn F5"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition shadow-2xs"
            >
              <RotateCw className="w-3 h-3 text-slate-600" />
              <span>F5</span>
            </button>

            {/* Danh sách chưa scan Modal button */}
            <button
              id="dashboard-ds-chua-scan-btn"
              type="button"
              onClick={onOpenUnscannedModal}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition shadow-2xs"
            >
              <ListChecks className="w-3.5 h-3.5 text-slate-700" />
              <span>DS Chưa Scan</span>
            </button>
          </div>
        </div>

        {/* Breakdown Table & Progress Bars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Summary Table */}
          <div className="md:col-span-7">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-1.5 text-center font-bold">Loại</th>
                    <th className="py-1.5 text-center font-bold text-emerald-700">IW</th>
                    <th className="py-1.5 text-center font-bold text-blue-700">OOW</th>
                    <th className="py-1.5 text-center font-bold text-rose-600">"KMH"</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* LCD Row */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2 text-center font-bold text-slate-700">LCD</td>
                    <td className="py-2 text-center font-bold text-emerald-600">
                      {lcdStats.iwScanned} / {lcdStats.iwTotal || 5}
                    </td>
                    <td className="py-2 text-center font-bold text-blue-600">
                      {lcdStats.oowScanned} / {lcdStats.oowTotal || 198}
                    </td>
                    <td className="py-2 text-center font-bold text-rose-500">0 / 1</td>
                  </tr>

                  {/* MAIN Row */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2 text-center font-bold text-slate-700">MAIN</td>
                    <td className="py-2 text-center font-bold text-emerald-600">
                      {mainStats.iwScanned} / {mainStats.iwTotal || 4}
                    </td>
                    <td className="py-2 text-center font-bold text-blue-600">
                      {mainStats.oowScanned} / {mainStats.oowTotal || 3}
                    </td>
                    <td className="py-2 text-center text-slate-400 font-bold">-</td>
                  </tr>

                  {/* OTHERS Row */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2 text-center font-bold text-slate-700">OTHERS</td>
                    <td className="py-2 text-center font-bold text-emerald-600">
                      {othersStats.iwScanned} / {othersStats.iwTotal || 3}
                    </td>
                    <td className="py-2 text-center font-bold text-blue-600">
                      {othersStats.oowScanned} / {othersStats.oowTotal || 150}
                    </td>
                    <td className="py-2 text-center font-bold text-rose-500">0 / 2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Progress Bars */}
          <div className="md:col-span-5 flex flex-col justify-center space-y-4 pl-0 md:pl-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0">
            
            {/* TIẾN ĐỘ IW */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-extrabold text-emerald-700 tracking-wider">TIẾN ĐỘ IW</span>
                <span className="font-bold text-emerald-700">
                  {iwPercent}% <span className="text-[11px] text-slate-400 font-normal">({iwScannedAll}/{iwTotalAll})</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, iwPercent))}%` }}
                />
              </div>
            </div>

            {/* TIẾN ĐỘ OOW */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-extrabold text-blue-700 tracking-wider">TIẾN ĐỘ OOW</span>
                <span className="font-bold text-blue-700">
                  {oowPercent}% <span className="text-[11px] text-slate-400 font-normal">({oowScannedAll}/{oowTotalAll})</span>
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, oowPercent))}%` }}
                />
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* RIGHT CARD: XUẤT DỮ LIỆU (Col span 4 on large screens) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 text-sm sm:text-base font-black text-emerald-800 mb-3.5 uppercase tracking-wide">
            <Download className="w-5 h-5 text-emerald-600" />
            <span>TRUNG TÂM XUẤT DỮ LIỆU KHO</span>
          </div>

          {/* 2 Export Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            <button
              id="export-ttbh-btn"
              type="button"
              onClick={onExportTTBH}
              className="flex items-center justify-center gap-2 py-2.5 px-3 border-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Tải TTBH</span>
            </button>

            <button
              id="export-all-btn"
              type="button"
              onClick={onExportAll}
              className="flex items-center justify-center gap-2 py-2.5 px-3 border-2 border-blue-600 text-blue-800 hover:bg-blue-50 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Tải TẤT CẢ</span>
            </button>
          </div>

          {/* Big Solid Green Drive Button */}
          <button
            id="save-drive-btn"
            type="button"
            onClick={onSaveDrive}
            disabled={isSavingDrive}
            className="w-full flex items-center justify-center gap-2 py-3 px-3.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-black transition shadow-xs disabled:opacity-75 cursor-pointer"
          >
            <CloudUpload className="w-4.5 h-4.5" />
            <span>{isSavingDrive ? 'ĐANG ĐẨY DỮ LIỆU LÊN DRIVE...' : 'LƯU VÀ ĐẨY ĐỐI CHIẾU LÊN DRIVE'}</span>
          </button>
        </div>

        {/* Footer Notes */}
        <div className="mt-3 pt-2 text-[10px] text-slate-400 space-y-0.5 leading-tight italic">
          <p>*tự động lưu mỗi 10 phút, điều kiện phải luôn mở tab, không chuyển tab</p>
          <p>**lưu ý khi chuyển tab phải ấn lưu, phòng trường hợp chưa lưu, phải scan lại</p>
        </div>

      </div>

    </div>
  );
};
