import React from 'react';
import { CheckCircle, AlertTriangle, Package, Layers, TrendingUp, HelpCircle } from 'lucide-react';
import { InventoryItem, ReportSummary, ServiceType } from '../types';

interface StatsCardsProps {
  summary: ReportSummary;
  activeTab: ServiceType;
  currentData: InventoryItem[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ summary, activeTab, currentData }) => {
  const isIW = activeTab === 'IW';
  const tabSummary = isIW ? summary.iwSummary : summary.oowSummary;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
      {/* 1. Total Required vs Scanned */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tiến độ kiểm đếm ({activeTab})
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800">
            {tabSummary.scannedQty}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            / {tabSummary.requiredQty} linh kiện
          </span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
            <span>Tỷ lệ hoàn thành</span>
            <span className="font-bold text-blue-600">{tabSummary.completionRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tabSummary.completionRate === 100
                  ? 'bg-emerald-500'
                  : tabSummary.completionRate > 50
                  ? 'bg-blue-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, tabSummary.completionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Completed Items */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mã Đã Khớp Đủ (100%)
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600">
            {tabSummary.completedItems}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            / {tabSummary.totalItems} mã
          </span>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          {tabSummary.completedItems === tabSummary.totalItems && tabSummary.totalItems > 0 ? (
            <span className="text-emerald-700 font-semibold">✓ Đã đủ 100% điều kiện trả xác</span>
          ) : (
            <span>Còn {tabSummary.totalItems - tabSummary.completedItems} mã chưa quét đủ</span>
          )}
        </p>
      </div>

      {/* 3. Missing Parts Discrepancy */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Linh Kiện Còn Thiếu
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            tabSummary.missingQty > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-black ${tabSummary.missingQty > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {tabSummary.missingQty}
          </span>
          <span className="text-sm font-semibold text-slate-400">
            xác cần tìm
          </span>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          {tabSummary.missingQty === 0 ? (
            <span className="text-emerald-600 font-medium">Không có chênh lệch thiếu</span>
          ) : (
            <span className="text-rose-600 font-medium">Cần đối chiếu lại khay xác</span>
          )}
        </p>
      </div>

      {/* 4. Total System Overview */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Tổng 2 Phân Hệ (IW + OOW)
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-xs">
            <span className="font-bold text-blue-600 block">IW: {summary.iwSummary.scannedQty}/{summary.iwSummary.requiredQty}</span>
            <span className="text-[10px] text-slate-400">{summary.iwSummary.totalItems} mã</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-xs">
            <span className="font-bold text-indigo-600 block">OOW: {summary.oowSummary.scannedQty}/{summary.oowSummary.requiredQty}</span>
            <span className="text-[10px] text-slate-400">{summary.oowSummary.totalItems} mã</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Tổng toàn kho:</span>
          <span className="font-bold text-slate-800">{summary.totalScannedQty} / {summary.totalRequiredQty} ({summary.completionRate}%)</span>
        </div>
      </div>
    </div>
  );
};
