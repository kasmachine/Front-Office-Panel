import React from 'react';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import {
  Calculator,
  FileText,
  BarChart3,
  Settings,
  RefreshCw,
  CheckCircle2,
  Loader2,
  X,
  History,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue';
  onSelectTab: (tab: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue') => void;
  onOpenSettings: () => void;
  onOpenHistory?: () => void;
  onManualSync?: () => void;
  saveStatus?: 'saving' | 'saved' | 'idle';
  lastSavedTime?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenHistory,
  onManualSync,
  saveStatus = 'saved',
  lastSavedTime = '',
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const menuItems = [
    {
      id: 'cashCount' as const,
      label: 'ตารางนับเงิน',
      sublabel: 'ประจำกะ (Cash Count)',
      icon: Calculator,
    },
    {
      id: 'receiptSubstitute' as const,
      label: 'ใบรับรองใบเสร็จ',
      sublabel: 'แทนใบเสร็จรับเงิน',
      icon: FileText,
    },
    {
      id: 'dailyRevenue' as const,
      label: 'Revenue',
      sublabel: 'ยอดขาย & เป้าหมายประจำวัน',
      icon: BarChart3,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section: Brand & Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-white/20">
              <NanSeasonsLogo className="h-12" />
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="mt-3">
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
              Front Office Panel
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ระบบการเงิน & เอกสาร บูติกรีสอร์ท
            </p>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            เมนูหลัก (Navigation)
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-orange-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="truncate text-xs font-bold">{item.label}</div>
                  <div
                    className={`truncate text-[10px] font-normal ${
                      isActive ? 'text-orange-100' : 'text-slate-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="pt-3 pb-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              การจัดการ & ตั้งค่า (System)
            </div>
          </div>

          {/* Setting Menu Item */}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
          >
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-orange-400">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="truncate text-xs font-bold">Setting</div>
              <div className="truncate text-[10px] text-slate-400 font-normal">
                ตั้งค่าระบบ & ประวัติ 7 วัน
              </div>
            </div>
          </button>

          {onOpenHistory && (
            <button
              type="button"
              onClick={() => {
                onOpenHistory();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all group"
            >
              <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-orange-400">
                <History className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="truncate text-xs font-bold">ประวัติย้อนหลัง 7 วัน</div>
              </div>
            </button>
          )}
        </div>

        {/* Footer: Sync Status & Manual Sync Button */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
          {/* Status Badge */}
          <div className="px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800">
            {saveStatus === 'saving' ? (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                <span>กำลังบันทึก Real-time...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Sync เรียบร้อย {lastSavedTime ? `(${lastSavedTime})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Manual Sync Button */}
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 rounded-xl transition-all"
              title="ดึงข้อมูล Real-time ล่าสุดจาก Firebase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>ดึงข้อมูลล่าสุด (Sync)</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
