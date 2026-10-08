import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, CheckCircle2, Clock, AlertCircle, Plus, Minus, 
  Trash2, Edit3, ArrowUpDown, ChevronLeft, ChevronRight,
  BarChart3, History, ListFilter, ShieldCheck, Layers, FileSpreadsheet
} from 'lucide-react';
import { InventoryItem, AppSheetTab, FilterStatus, ReportSummary } from '../types';

interface InventoryTableProps {
  dataIW: InventoryItem[];
  dataOOW: InventoryItem[];
  activeSheet: AppSheetTab;
  onSheetChange: (sheet: AppSheetTab) => void;
  reportSummary: ReportSummary;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onClearSheet: () => void;
  onIncrementScan: (id: string) => void;
  onDecrementScan: (id: string) => void;
  onBulkSetCompleted: (ids: string[]) => void;
  onBulkResetScan: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onOpenManualModal: () => void;
  onExportExcel: () => void;
  highlightItemId?: string;
  highlightMaLK?: string;
  externalSearchTerm?: string;
  onClearExternalSearch?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  dataIW,
  dataOOW,
  activeSheet,
  onSheetChange,
  reportSummary,
  onUpdateItem,
  onDeleteItem,
  onClearSheet,
  onIncrementScan,
  onDecrementScan,
  onBulkSetCompleted,
  onBulkResetScan,
  onBulkDelete,
  onOpenManualModal,
  onExportExcel,
  highlightItemId,
  highlightMaLK,
  externalSearchTerm,
  onClearExternalSearch
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortBy, setSortBy] = useState<'stt' | 'cotSP' | 'maLK' | 'model' | 'type' | 'slg' | 'daQuet'>('stt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Sync external search term if provided
  useEffect(() => {
    if (externalSearchTerm !== undefined) {
      setSearchTerm(externalSearchTerm);
    }
  }, [externalSearchTerm]);
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Compute active dataset based on sheet
  const allItems = useMemo(() => [...dataIW, ...dataOOW], [dataIW, dataOOW]);

  const sheetData = useMemo(() => {
    switch (activeSheet) {
      case 'IW':
        return dataIW;
      case 'OOW':
        return dataOOW;
      case 'LichSu_DaScan':
        return allItems.filter(i => i.daQuet > 0);
      case 'DanhSach_ChuaScan':
        return allItems.filter(i => i.daQuet < i.slg);
      default:
        return allItems;
    }
  }, [activeSheet, dataIW, dataOOW, allItems]);

  // Extract distinct Types for quick filter chips (MAIN, LCD, PIN, PHIM, VỎ, VAN TAY...)
  const distinctTypes = useMemo(() => {
    const types = new Set<string>();
    allItems.forEach(i => {
      if (i.type) types.add(i.type.toUpperCase());
    });
    return Array.from(types).sort();
  }, [allItems]);

  // Filter and search
  const filteredData = useMemo(() => {
    let list = sheetData;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(item => 
        item.cotSP.toLowerCase().includes(q) ||
        item.maLK.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.soRO.toLowerCase().includes(q) ||
        item.scCode.toLowerCase().includes(q) ||
        item.warehouseName.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.remark && item.remark.toLowerCase().includes(q))
      );
    }

    // Type filter (MAIN, LCD, PIN, PHIM, VỎ, VAN TAY...)
    if (typeFilter !== 'ALL') {
      list = list.filter(item => item.type.toUpperCase() === typeFilter);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      let valA: any = a[sortBy as keyof InventoryItem] || '';
      let valB: any = b[sortBy as keyof InventoryItem] || '';
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [sheetData, searchTerm, typeFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Select all visible
  const handleToggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(item => item.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSort = (column: 'stt' | 'cotSP' | 'maLK' | 'model' | 'type' | 'slg' | 'daQuet') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm flex flex-col overflow-hidden">
      
      {/* 1. Header Toolbar: Search & Fast Type Chips */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="table-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm theo Cột SP, Mã LK, Model, Product Name, Số RO..."
            className="w-full pl-9 pr-7 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type Filter Chips (MAIN, LCD, PIN, PHIM, VỎ, VAN TAY...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Type:</span>
          <button
            onClick={() => { setTypeFilter('ALL'); setCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap ${
              typeFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          {distinctTypes.map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap ${
                typeFilter === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Export / Clear group button */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel 5 Sheet</span>
          </button>
        </div>
      </div>

      {/* 2. Bulk Action Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-blue-900">
            Đã chọn <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-bold">{selectedIds.length}</span> dòng:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onBulkSetCompleted(selectedIds); setSelectedIds([]); }}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 transition"
            >
              Đánh dấu đủ (100%)
            </button>
            <button
              onClick={() => { onBulkResetScan(selectedIds); setSelectedIds([]); }}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-md font-bold hover:bg-amber-700 transition"
            >
              Đặt lại về 0
            </button>
            <button
              onClick={() => { onBulkDelete(selectedIds); setSelectedIds([]); }}
              className="px-2.5 py-1 bg-rose-600 text-white rounded-md font-bold hover:bg-rose-700 transition"
            >
              Xóa dòng chọn
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-500 hover:text-slate-800"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* 3. CONTENT AREA: If sheet is 'ThongKe', render Dashboard View, otherwise render 12-Column Table */}
      {activeSheet === 'ThongKe' ? (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-[420px]">
          {/* Summary KPI Header */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Tổng Hợp Báo Cáo Thống Kê Tiến Độ Quét Xác Linh Kiện
            </h3>
            <p className="text-xs text-slate-500">
              Tổng số dòng: <span className="font-bold text-slate-800">{reportSummary.totalItems}</span> | 
              Yêu cầu: <span className="font-bold text-slate-800">{reportSummary.totalRequiredQty}</span> linh kiện | 
              Đã quét: <span className="font-bold text-emerald-700">{reportSummary.totalScannedQty}</span> | 
              Còn thiếu: <span className={`font-bold ${reportSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{reportSummary.missingQty}</span> | 
              Tỷ lệ hoàn thành: <span className="font-black text-blue-700">{reportSummary.completionRate}%</span>
            </p>
          </div>

          {/* Table IW vs OOW Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center pb-2 mb-3 border-b">
                <span className="font-bold text-xs uppercase text-blue-700">Phân Hệ IW (Bảo Hành)</span>
                <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                  {reportSummary.iwSummary.completionRate}% Đạt
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span>Số dòng linh kiện:</span><span className="font-bold">{reportSummary.iwSummary.totalItems}</span></div>
                <div className="flex justify-between"><span>Số lượng yêu cầu (Slg):</span><span className="font-bold">{reportSummary.iwSummary.requiredQty}</span></div>
                <div className="flex justify-between"><span>Số lượng đã quét:</span><span className="font-bold text-emerald-700">{reportSummary.iwSummary.scannedQty}</span></div>
                <div className="flex justify-between"><span>Còn thiếu:</span><span className={`font-bold ${reportSummary.iwSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{reportSummary.iwSummary.missingQty}</span></div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center pb-2 mb-3 border-b">
                <span className="font-bold text-xs uppercase text-indigo-700">Phân Hệ OOW (Ngoài BH)</span>
                <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                  {reportSummary.oowSummary.completionRate}% Đạt
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span>Số dòng linh kiện:</span><span className="font-bold">{reportSummary.oowSummary.totalItems}</span></div>
                <div className="flex justify-between"><span>Số lượng yêu cầu (Slg):</span><span className="font-bold">{reportSummary.oowSummary.requiredQty}</span></div>
                <div className="flex justify-between"><span>Số lượng đã quét:</span><span className="font-bold text-emerald-700">{reportSummary.oowSummary.scannedQty}</span></div>
                <div className="flex justify-between"><span>Còn thiếu:</span><span className={`font-bold ${reportSummary.oowSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{reportSummary.oowSummary.missingQty}</span></div>
              </div>
            </div>
          </div>

          {/* Breakdown by Type */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-3">
              Thống Kê Tiến Độ Theo Chủng Loại (Type)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              {Object.entries(reportSummary.byTypeBreakdown).map(([typeName, stats]: [string, { required: number; scanned: number }]) => {
                const rate = stats.required > 0 ? Math.round((stats.scanned / stats.required) * 100) : 0;
                return (
                  <div key={typeName} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center font-bold mb-1">
                      <span>{typeName}</span>
                      <span className="text-blue-600">{rate}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Đã quét: {stats.scanned} / {stats.required}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Standard 12-Column Table matching Figure 1 */
        <div className="overflow-x-auto min-h-[420px] max-h-[600px] border-b border-slate-200">
          <table className="w-full text-left border-collapse text-sm sm:text-base">
            <thead className="sticky top-0 bg-slate-200/95 z-10 text-slate-950 font-black text-sm uppercase tracking-wider border-b-2 border-slate-400 shadow-xs backdrop-blur-xs">
              <tr>
                <th className="p-3 w-10 text-center border-r border-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-2.5 w-12 text-center border-r border-slate-200 text-slate-500">STT</th>
                
                {/* 1. Trạng thái */}
                <th className="p-2.5 border-r border-slate-200 whitespace-nowrap">Trạng thái</th>
                
                {/* 2. Cột SP */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('cotSP')}
                >
                  <div className="flex items-center gap-1">
                    <span>Cột SP</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* 3. SC Code */}
                <th className="p-2.5 border-r border-slate-200 whitespace-nowrap">SC Code</th>
                
                {/* 4. Warehouse Name */}
                <th className="p-2.5 border-r border-slate-200 whitespace-nowrap">Warehouse Name</th>
                
                {/* 5. Số RO */}
                <th className="p-2.5 border-r border-slate-200 whitespace-nowrap">Số RO</th>
                
                {/* 6. BH/DV */}
                <th className="p-2.5 border-r border-slate-200 whitespace-nowrap text-center">BH/DV</th>
                
                {/* 7. Mã LK */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('maLK')}
                >
                  <div className="flex items-center gap-1">
                    <span>Mã LK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* 8. Product Name */}
                <th className="p-2.5 border-r border-slate-200 min-w-[200px]">Product Name</th>
                
                {/* 9. Model */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('model')}
                >
                  <div className="flex items-center gap-1">
                    <span>Model</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* 10. Type */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap text-center cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Type</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* 11. Slg */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap text-center w-16 cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('slg')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Slg</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                
                {/* Đã Quét / Thao Tác Quét Nhanh */}
                <th 
                  className="p-2.5 border-r border-slate-200 whitespace-nowrap text-center w-28 cursor-pointer hover:bg-slate-200/80 transition"
                  onClick={() => handleSort('daQuet')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Đã Quét</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 12. Remark */}
                <th className="p-2.5 border-r border-slate-200 min-w-[120px]">Remark</th>

                {/* Actions */}
                <th className="p-2.5 text-center w-16">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">
                        {searchTerm ? 'Không tìm thấy kết quả nào phù hợp.' : `Sheet [${activeSheet}] hiện chưa có dữ liệu.`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Nạp file Excel hoặc bấm nút "Dữ Liệu Mẫu" ở thanh tiêu đề để tải dữ liệu kho.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const stt = (currentPage - 1) * pageSize + index + 1;
                  const isCompleted = item.daQuet >= item.slg;
                  const isPartial = item.daQuet > 0 && item.daQuet < item.slg;
                  const isSelected = selectedIds.includes(item.id);
                  const isCurrentlyActive = highlightItemId === item.id || highlightMaLK === item.maLK;

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition ${
                        isCurrentlyActive
                          ? 'bg-blue-100/90 ring-2 ring-blue-500 ring-inset shadow-xs font-semibold'
                          : isSelected
                          ? 'bg-blue-50'
                          : isCompleted
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : isPartial
                          ? 'bg-amber-50/20 hover:bg-amber-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      <td className="p-2.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                        {stt}
                      </td>

                      {/* 1. Trạng thái */}
                      <td className="p-2.5 border-r border-slate-100 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCompleted 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : isPartial 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isCompleted ? 'Đã Scan (Đủ)' : (isPartial ? `Đang quét (${item.daQuet}/${item.slg})` : 'Chưa Scan')}
                        </span>
                      </td>

                      {/* 2. Cột SP */}
                      <td className="p-2.5 font-mono font-bold text-blue-700 tracking-tight select-all border-r border-slate-100 whitespace-nowrap">
                        {item.cotSP}
                      </td>

                      {/* 3. SC Code */}
                      <td className="p-2.5 font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {item.scCode}
                      </td>

                      {/* 4. Warehouse Name */}
                      <td className="p-2.5 text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {item.warehouseName}
                      </td>

                      {/* 5. Số RO */}
                      <td className="p-2.5 font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {item.soRO}
                      </td>

                      {/* 6. BH/DV */}
                      <td className="p-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.bhDv === 'IW' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.bhDv}
                        </span>
                      </td>

                      {/* 7. Mã LK */}
                      <td className="p-2.5 font-mono font-bold text-slate-800 border-r border-slate-100 whitespace-nowrap select-all">
                        {item.maLK}
                      </td>

                      {/* 8. Product Name */}
                      <td className="p-2.5 font-medium text-slate-800 border-r border-slate-100">
                        {item.productName}
                      </td>

                      {/* 9. Model */}
                      <td className="p-2.5 font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {item.model}
                      </td>

                      {/* 10. Type */}
                      <td className="p-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[10px] font-bold">
                          {item.type}
                        </span>
                      </td>

                      {/* 11. Slg */}
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-100">
                        {item.slg}
                      </td>

                      {/* Đã Quét with +/- Controls */}
                      <td className="p-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => onDecrementScan(item.id)}
                            disabled={item.daQuet <= 0}
                            title="Giảm 1"
                            className="w-4 h-4 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-white rounded disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className={`w-6 text-center font-black font-mono text-xs ${
                            isCompleted ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-600'
                          }`}>
                            {item.daQuet}
                          </span>

                          <button
                            type="button"
                            onClick={() => onIncrementScan(item.id)}
                            title="Quét +1"
                            className="w-4 h-4 flex items-center justify-center text-blue-600 hover:text-emerald-700 hover:bg-white rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 12. Remark */}
                      <td className="p-2.5 text-slate-500 border-r border-slate-100 text-[11px]">
                        {item.remark || '-'}
                      </td>

                      {/* Action buttons */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            title="Sửa"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            title="Xóa"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Pagination (When in table view) */}
      {activeSheet !== 'ThongKe' && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs focus:outline-none"
            >
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={-1}>Tất cả ({filteredData.length})</option>
            </select>
            <span>/ Tổng {filteredData.length} kết quả trong sheet</span>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Trước
              </button>
              <span className="px-2 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. EXCEL-LIKE SHEET TABS BAR MATCHING FIGURE 2 EXACTLY */}
      <div className="bg-slate-200/90 px-3 py-1.5 flex items-center justify-between gap-2 border-t border-slate-300 select-none overflow-x-auto">
        
        {/* Navigation arrows (like Excel bottom left) */}
        <div className="flex items-center gap-0.5 text-slate-500">
          <button className="p-1 hover:bg-slate-300 rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button className="p-1 hover:bg-slate-300 rounded"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>

        {/* 5 Excel Sheets from Figure 2 */}
        <div className="flex items-center gap-1 overflow-x-auto">
          
          {/* Sheet 1: ThongKe */}
          <button
            id="sheet-tab-thongke"
            type="button"
            onClick={() => onSheetChange('ThongKe')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-t-2 ${
              activeSheet === 'ThongKe'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-white/80'
            }`}
          >
            <span>ThongKe</span>
          </button>

          {/* Sheet 2: LichSu_DaScan */}
          <button
            id="sheet-tab-lichsu-dascan"
            type="button"
            onClick={() => onSheetChange('LichSu_DaScan')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-t-2 ${
              activeSheet === 'LichSu_DaScan'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-white/80'
            }`}
          >
            <span>LichSu_DaScan</span>
          </button>

          {/* Sheet 3: DanhSach_ChuaScan */}
          <button
            id="sheet-tab-danhsach-chuascan"
            type="button"
            onClick={() => onSheetChange('DanhSach_ChuaScan')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-t-2 ${
              activeSheet === 'DanhSach_ChuaScan'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-white/80'
            }`}
          >
            <span>DanhSach_ChuaScan</span>
          </button>

          {/* Sheet 4: IW */}
          <button
            id="sheet-tab-iw"
            type="button"
            onClick={() => onSheetChange('IW')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-t-2 ${
              activeSheet === 'IW'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-white/80'
            }`}
          >
            <span>IW</span>
          </button>

          {/* Sheet 5: OOW */}
          <button
            id="sheet-tab-oow"
            type="button"
            onClick={() => onSheetChange('OOW')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-t-2 ${
              activeSheet === 'OOW'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'bg-slate-100 text-slate-600 border-transparent hover:bg-white/80'
            }`}
          >
            <span>OOW</span>
          </button>

          {/* Plus icon to add item */}
          <button
            onClick={onOpenManualModal}
            title="Thêm linh kiện mới vào sheet"
            className="p-1 hover:bg-slate-300 text-slate-600 rounded ml-1"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden md:block">
          StockSync v2.6 | Chuẩn File OPPO CSKH
        </div>
      </div>

      {/* Inline Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 border border-slate-200 text-xs">
            <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-600" />
              Chỉnh Sửa Thông Tin Cột Linh Kiện
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cột SP (Serial / Composite Barcode)</label>
                <input
                  type="text"
                  value={editingItem.cotSP}
                  onChange={(e) => setEditingItem({ ...editingItem, cotSP: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SC Code</label>
                  <input
                    type="text"
                    value={editingItem.scCode}
                    onChange={(e) => setEditingItem({ ...editingItem, scCode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số RO</label>
                  <input
                    type="text"
                    value={editingItem.soRO}
                    onChange={(e) => setEditingItem({ ...editingItem, soRO: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Name</label>
                <input
                  type="text"
                  value={editingItem.warehouseName}
                  onChange={(e) => setEditingItem({ ...editingItem, warehouseName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã LK</label>
                  <input
                    type="text"
                    value={editingItem.maLK}
                    onChange={(e) => setEditingItem({ ...editingItem, maLK: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={editingItem.type}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={editingItem.productName}
                  onChange={(e) => setEditingItem({ ...editingItem, productName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={editingItem.model}
                    onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Slg (Yêu cầu)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItem.slg}
                    onChange={(e) => setEditingItem({ ...editingItem, slg: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full p-2 border border-slate-300 rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đã Quét</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.daQuet}
                    onChange={(e) => setEditingItem({ ...editingItem, daQuet: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remark (Ghi chú)</label>
                <input
                  type="text"
                  value={editingItem.remark || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, remark: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingItem) {
                    const status = editingItem.daQuet >= editingItem.slg ? 'Khớp, Trả Xác' : (editingItem.daQuet > 0 ? 'Đang quét' : 'Chưa Scan');
                    onUpdateItem(editingItem.id, { ...editingItem, trangThai: status });
                    setEditingItem(null);
                  }
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
