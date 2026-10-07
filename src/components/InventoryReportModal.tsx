import React, { useState } from 'react';
import { 
  FileSpreadsheet, Printer, X, CheckCircle2, AlertTriangle, 
  BarChart3, Layers, FileText, Download, ArrowRight, ShieldCheck
} from 'lucide-react';
import { InventoryItem, ReportSummary, ServiceType } from '../types';
import { exportFullExcelReport } from '../utils/excel';

interface InventoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataIW: InventoryItem[];
  dataOOW: InventoryItem[];
  summary: ReportSummary;
  scCode: string;
  onOpenPrintSlip: () => void;
}

export const InventoryReportModal: React.FC<InventoryReportModalProps> = ({
  isOpen,
  onClose,
  dataIW,
  dataOOW,
  summary,
  scCode,
  onOpenPrintSlip
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'missing' | 'categories'>('overview');

  if (!isOpen) return null;

  const allItems = [...dataIW, ...dataOOW];
  const missingItems = allItems.filter(item => item.daQuet < item.slg);

  const handleExportExcel = () => {
    exportFullExcelReport(dataIW, dataOOW, scCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Báo Cáo Tồn Kho & Đối Chiếu Xác Linh Kiện Tự Động
              </h2>
              <p className="text-xs text-slate-300">
                Mã trạm: {scCode} | Tự động tổng hợp & phát hiện chênh lệch linh kiện
              </p>
            </div>
          </div>
          
          <button
            id="close-report-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Action Navigation */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Tổng Quan Tiến Độ
            </button>
            <button
              onClick={() => setActiveSubTab('missing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'missing'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>⚠ DS Còn Thiếu</span>
              {missingItems.length > 0 && (
                <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {missingItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('categories')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              🏷 Theo Chủng Loại & Model
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-excel-from-report-btn"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel Đa Sheet (.xlsx)</span>
            </button>

            <button
              id="open-print-slip-btn"
              onClick={() => {
                onClose();
                onOpenPrintSlip();
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên Bản Trả Xác</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-800">
          
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="space-y-5">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                summary.missingQty === 0 && summary.totalRequiredQty > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="flex items-start gap-3">
                  {summary.missingQty === 0 && summary.totalRequiredQty > 0 ? (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {summary.missingQty === 0 && summary.totalRequiredQty > 0
                        ? 'HOÀN THÀNH ĐỐI CHIẾU 100% - ĐỦ ĐIỀU KIỆN TRẢ XÁC'
                        : `TIẾN ĐỘ ĐỐI CHIẾU: ${summary.completionRate}% (CÒN THIẾU ${summary.missingQty} XÁC LINH KIỆN)`}
                    </h3>
                    <p className="text-xs mt-1 opacity-90">
                      {summary.missingQty === 0 && summary.totalRequiredQty > 0
                        ? 'Tất cả linh kiện xác thuộc phân hệ IW và OOW đã được quét khớp đủ. Bạn có thể in Biên Bản Bàn Giao và xuất file Excel để gửi trả kho tổng.'
                        : 'Vui lòng kiểm tra khay xác và quét bổ sung các mã linh kiện còn thiếu trước khi lập phiếu bàn giao trả kho.'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-black">{summary.completionRate}%</span>
              </div>

              {/* Grid 2 Columns for IW & OOW Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IW Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                    <span className="font-bold text-xs uppercase text-blue-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      Phân Hệ IW (Bảo Hành Đổi Trả)
                    </span>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {summary.iwSummary.completionRate}% Hoàn tất
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tổng số dòng linh kiện:</span>
                      <span className="font-bold">{summary.iwSummary.totalItems} dòng</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số lượng cần thu hồi (Yêu cầu):</span>
                      <span className="font-bold">{summary.iwSummary.requiredQty} cái</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số lượng thực tế đã quét:</span>
                      <span className="font-bold text-emerald-700">{summary.iwSummary.scannedQty} cái</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số mã đã khớp 100%:</span>
                      <span className="font-bold text-emerald-700">{summary.iwSummary.completedItems} mã</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Chênh lệch còn thiếu:</span>
                      <span className={`font-bold ${summary.iwSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {summary.iwSummary.missingQty} cái
                      </span>
                    </div>
                  </div>
                </div>

                {/* OOW Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                    <span className="font-bold text-xs uppercase text-indigo-700 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      Phân Hệ OOW (Dịch Vụ Ngoài BH)
                    </span>
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      {summary.oowSummary.completionRate}% Hoàn tất
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Tổng số dòng linh kiện:</span>
                      <span className="font-bold">{summary.oowSummary.totalItems} dòng</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số lượng cần thu hồi (Yêu cầu):</span>
                      <span className="font-bold">{summary.oowSummary.requiredQty} cái</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số lượng thực tế đã quét:</span>
                      <span className="font-bold text-emerald-700">{summary.oowSummary.scannedQty} cái</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Số mã đã khớp 100%:</span>
                      <span className="font-bold text-emerald-700">{summary.oowSummary.completedItems} mã</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Chênh lệch còn thiếu:</span>
                      <span className={`font-bold ${summary.oowSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {summary.oowSummary.missingQty} cái
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Chỉ Số Tổng Hợp</th>
                      <th className="p-3 text-center">IW (Bảo Hành)</th>
                      <th className="p-3 text-center">OOW (Dịch Vụ)</th>
                      <th className="p-3 text-center bg-slate-200/60">TỔNG CỘNG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-medium text-slate-600">Tổng số dòng dữ liệu</td>
                      <td className="p-3 text-center font-mono">{summary.iwSummary.totalItems}</td>
                      <td className="p-3 text-center font-mono">{summary.oowSummary.totalItems}</td>
                      <td className="p-3 text-center font-mono font-bold bg-slate-50">{summary.totalItems} dòng</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-600">Số lượng linh kiện yêu cầu</td>
                      <td className="p-3 text-center font-mono">{summary.iwSummary.requiredQty}</td>
                      <td className="p-3 text-center font-mono">{summary.oowSummary.requiredQty}</td>
                      <td className="p-3 text-center font-mono font-bold bg-slate-50">{summary.totalRequiredQty} cái</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-600">Số lượng thực tế đã quét</td>
                      <td className="p-3 text-center font-mono text-emerald-700 font-bold">{summary.iwSummary.scannedQty}</td>
                      <td className="p-3 text-center font-mono text-emerald-700 font-bold">{summary.oowSummary.scannedQty}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-700 bg-slate-50">{summary.totalScannedQty} cái</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-600">Số lượng còn thiếu (Chênh lệch)</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{summary.iwSummary.missingQty}</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{summary.oowSummary.missingQty}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-600 bg-slate-50">{summary.missingQty} cái</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-600">Tỷ lệ hoàn thành %</td>
                      <td className="p-3 text-center font-bold text-blue-700">{summary.iwSummary.completionRate}%</td>
                      <td className="p-3 text-center font-bold text-indigo-700">{summary.oowSummary.completionRate}%</td>
                      <td className="p-3 text-center font-black text-blue-700 bg-slate-50">{summary.completionRate}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 2: MISSING ITEMS */}
          {activeSubTab === 'missing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Danh Sách Linh Kiện Chưa Quét Đủ ({missingItems.length} mã)
                  </h4>
                  <p className="text-xs text-slate-500">Đối chiếu danh sách này để tìm kiếm linh kiện xác trong kho.</p>
                </div>
              </div>

              {missingItems.length === 0 ? (
                <div className="py-12 text-center text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-600" />
                  <p className="font-bold text-sm">Tuyệt vời! Không còn linh kiện nào bị thiếu.</p>
                  <p className="text-xs text-emerald-600 mt-1">Toàn bộ 100% linh kiện đã được quét khớp đầy đủ.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Loại</th>
                        <th className="p-2.5">Serial SP</th>
                        <th className="p-2.5">Mã LK</th>
                        <th className="p-2.5">Tên Linh Kiện</th>
                        <th className="p-2.5">Model</th>
                        <th className="p-2.5 text-center">Cần</th>
                        <th className="p-2.5 text-center">Đã Quét</th>
                        <th className="p-2.5 text-center text-rose-600">Còn Thiếu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {missingItems.map((item, idx) => {
                        const diff = (item.slg || 1) - (item.daQuet || 0);
                        return (
                          <tr key={item.id} className="hover:bg-rose-50/40">
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.bhDv === 'IW' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {item.bhDv}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-blue-700">{item.cotSP}</td>
                            <td className="p-2.5 font-mono">{item.maLK}</td>
                            <td className="p-2.5 font-medium">{item.productName}</td>
                            <td className="p-2.5 text-slate-500">{item.model}</td>
                            <td className="p-2.5 text-center font-bold">{item.slg}</td>
                            <td className="p-2.5 text-center font-mono">{item.daQuet}</td>
                            <td className="p-2.5 text-center font-bold font-mono text-rose-600 bg-rose-50/80">
                              -{diff}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES & MODELS */}
          {activeSubTab === 'categories' && (
            <div className="space-y-6">
              {/* Category Breakdown */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Thống Kê Theo Chủng Loại Linh Kiện
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(summary.byTypeBreakdown).map(([typeName, stats]: [string, { required: number; scanned: number }]) => {
                    const rate = stats.required > 0 ? Math.round((stats.scanned / stats.required) * 100) : 0;
                    return (
                      <div key={typeName} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-slate-800">{typeName}</span>
                          <span className="text-[11px] font-bold text-blue-600">{rate}%</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-2">
                          <span>Đã quét: {stats.scanned}</span>
                          <span>Yêu cầu: {stats.required}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rate === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Model Breakdown */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Thống Kê Theo Dòng Máy (Model)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Model Máy</th>
                        <th className="p-2.5 text-center">Số Lượng Cần</th>
                        <th className="p-2.5 text-center">Đã Quét</th>
                        <th className="p-2.5 text-center">Tiến Độ (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(summary.byModelBreakdown).map(([modelName, stats]: [string, { required: number; scanned: number }]) => {
                        const rate = stats.required > 0 ? Math.round((stats.scanned / stats.required) * 100) : 0;
                        return (
                          <tr key={modelName} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium">{modelName}</td>
                            <td className="p-2.5 text-center font-mono">{stats.required}</td>
                            <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{stats.scanned}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rate === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Hệ thống StockSync Hub v2.5 | Báo cáo tự động tính toán thời gian thực
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition"
          >
            Đóng Báo Cáo
          </button>
        </div>

      </div>
    </div>
  );
};
