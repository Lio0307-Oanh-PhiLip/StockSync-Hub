import React, { useState } from 'react';
import { 
  Package, 
  ListOrdered, 
  ArrowDownToLine, 
  ClipboardCheck, 
  Briefcase, 
  CloudRain, 
  Search, 
  Upload, 
  RefreshCw,
  FileSpreadsheet,
  Smartphone,
  Database
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SyncSourceInfo } from '../types';

interface TopNavBarProps {
  scCode: string;
  activeNavTab: string;
  onNavTabChange: (tab: string) => void;
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  syncSourceInfo?: SyncSourceInfo;
  onOpenSyncModal?: () => void;
  cloudStatus?: 'connected' | 'reconnecting' | 'offline';
  onlineClients?: number;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  scCode,
  activeNavTab,
  onNavTabChange,
  activeSubTab,
  onSubTabChange,
  syncSourceInfo,
  onOpenSyncModal,
  cloudStatus = 'connected',
  onlineClients = 1
}) => {
  const navTabs = [
    { id: 'gioi-thieu', label: 'Giới thiệu', icon: Package },
    { id: 'danh-sach-ma-lk', label: 'Danh sách mã LK', icon: ListOrdered },
    { id: 'nhap-kho', label: 'Nhập kho', icon: ArrowDownToLine },
    { id: 'kiem-ke-kho', label: 'Kiểm kê kho', icon: ClipboardCheck },
    { id: 'lk-xach-tay', label: 'LK Xách tay', icon: Briefcase },
    { id: 'warehouse-data', label: 'Warehouse Data', icon: CloudRain, active: true },
  ];

  const subTabs = [
    { id: 'thu-hoi-xac', label: 'Thu hồi xác' },
    { id: 'slsd-thang', label: 'SLSD_Thang Toàn Quốc' },
    { id: 'theo-doi-tien-do', label: 'Theo dõi tiến độ Xác' },
  ];

  return (
    <div className="bg-white border-b border-slate-200 mb-4 -mx-3 sm:-mx-5 -mt-3 sm:-mt-5 px-4 sm:px-6 pt-3 shadow-2xs">
      {/* Main Top Navigation Items */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                type="button"
                onClick={() => onNavTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'border border-blue-600 text-blue-700 bg-blue-50/40 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sync Center Action Button */}
        {onOpenSyncModal && (
          <button
            id="top-nav-sync-btn"
            type="button"
            onClick={onOpenSyncModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold shrink-0 transition shadow-2xs cursor-pointer ${
              cloudStatus === 'connected'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
                : cloudStatus === 'reconnecting'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600'
                : 'bg-slate-700 hover:bg-slate-800'
            }`}
            title="Mở trung tâm đồng bộ dữ liệu thời gian thực giữa PC và APK"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cloudStatus === 'connected' ? 'animate-spin-slow' : ''}`} />
            <span className="hidden md:inline">
              {cloudStatus === 'connected' ? 'Live Sync (PC ⇄ APK)' : 'Đang kết nối Cloud...'}
            </span>
            <span className="md:hidden">Đồng bộ</span>
            <span 
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected' ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300 animate-ping'
              } ml-0.5`} 
            />
          </button>
        )}
      </div>

      {/* Sub-tabs row */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between mt-1 border-t border-slate-100 pt-1 text-xs gap-2">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto scrollbar-none flex-1 min-w-0 py-1">
          {subTabs.map((sub) => {
            const isSelected = activeSubTab === sub.id;
            return (
              <button
                key={sub.id}
                id={`subtab-${sub.id}`}
                type="button"
                onClick={() => onSubTabChange(sub.id)}
                className={`py-1.5 px-1 font-bold transition-all relative whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
        <div className="pb-1 flex items-center gap-2 shrink-0 ml-auto">
          {syncSourceInfo && (
            <span 
              onClick={onOpenSyncModal}
              className="text-[11px] text-slate-500 hover:text-blue-600 cursor-pointer hidden lg:inline-flex items-center gap-1"
              title="Nhấp để xem chi tiết đồng bộ"
            >
              <Database className="w-3 h-3 text-slate-400" />
              <span>Nguồn: <strong>{syncSourceInfo.rowCount} dòng</strong> ({syncSourceInfo.lastSyncedAt})</span>
            </span>
          )}
          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
};

