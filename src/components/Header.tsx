import React, { useRef } from 'react';
import { 
  Package, FileSpreadsheet, BarChart3, Download, Upload, 
  Database, RefreshCw, Clock, Building2, FileDown
} from 'lucide-react';
import { downloadTemplate } from '../utils/excel';

interface HeaderProps {
  scCode: string;
  onScCodeChange: (code: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleData: () => void;
  onOpenReportModal: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  totalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  scCode,
  onScCodeChange,
  onFileUpload,
  onLoadSampleData,
  onOpenReportModal,
  onExportBackup,
  onImportBackup,
  totalCount
}) => {
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Brand & SC info */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/10 flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                StockSync Hub
              </h1>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border border-blue-200">
                Kiểm Tra Xác Linh Kiện (IW / OOW)
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Mã Trạm:
              </span>
              <input
                type="text"
                value={scCode}
                onChange={(e) => onScCodeChange(e.target.value)}
                className="font-mono font-bold text-blue-700 bg-slate-100 px-2 py-0.5 rounded text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Nhấp để sửa mã trạm SC"
              />
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">Kho xác CSKH & Bảo hành</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Tự lưu dữ liệu (Local Auto-Sync)
              </span>
            </div>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          
          {/* Automated Report Button (Primary Highlight) */}
          <button
            id="open-report-header-btn"
            type="button"
            onClick={onOpenReportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Báo Cáo Tồn Kho Tự Động</span>
          </button>

          {/* Import Excel / CSV */}
          <label className="cursor-pointer flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-xs">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Nạp Excel (.xlsx / .csv)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={onFileUpload}
              className="hidden"
            />
          </label>

          {/* Download Template */}
          <button
            id="download-excel-template-btn"
            type="button"
            onClick={downloadTemplate}
            title="Tải file mẫu Excel chuẩn"
            className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Mẫu Chuẩn</span>
          </button>

          {/* Sample Data */}
          {totalCount === 0 && (
            <button
              id="load-sample-data-btn"
              type="button"
              onClick={onLoadSampleData}
              title="Nạp dữ liệu thử nghiệm để trải nghiệm ngay"
              className="flex items-center gap-1 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>Dữ Liệu Mẫu</span>
            </button>
          )}

          {/* Backup / Restore Dropdown or Buttons */}
          <button
            id="export-backup-json-btn"
            type="button"
            onClick={onExportBackup}
            title="Lưu file sao lưu JSON dữ liệu hiện tại"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
          </button>

          <label
            title="Khôi phục từ file JSON sao lưu"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
            <input
              ref={backupInputRef}
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
          </label>

        </div>

      </div>
    </header>
  );
};
