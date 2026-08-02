import React from 'react';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { FileText, Calculator, CheckCircle2, Loader2, Settings, RefreshCw, BarChart3, Menu } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue';
  onSelectTab: (tab: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue') => void;
  onOpenSettings?: () => void;
  onManualSync?: () => void;
  saveStatus?: 'saving' | 'saved' | 'idle';
  lastSavedTime?: string;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onManualSync,
  saveStatus = 'saved',
  lastSavedTime = '',
  onToggleMobileMenu,
}) => {
  return (
    <header className="no-print bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Mobile Hamburger Menu & Active Title */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl md:hidden border border-slate-700"
              title="เปิดเมนูหลัก"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>
                {activeTab === 'cashCount'
                  ? 'ตารางนับเงินประจำกะ'
                  : activeTab === 'receiptSubstitute'
                  ? 'ใบรับรองแทนใบเสร็จ'
                  : 'Revenue ประจำวัน'}
              </span>

              {saveStatus === 'saving' ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full shadow-xs">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                  กำลังบันทึกอัตโนมัติ...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Sync {lastSavedTime ? `(${lastSavedTime})` : ''}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {activeTab === 'cashCount'
                ? 'ตารางนับเงินสดเข้า-ออกประจำกะ (Shift Cash Reconciliation Sheet)'
                : activeTab === 'receiptSubstitute'
                ? 'ใบรับรองแทนใบเสร็จรับเงินพร้อมแนบสำเนาบัตรประชาชน'
                : 'ยอดขายและเป้าหมายประจำวัน (Salesplan and Targets / Daily Revenue)'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 rounded-xl transition-all shadow-xs"
              title="ดึงข้อมูล Real-time ล่าสุดจากเซิร์ฟเวอร์ (Sync Now)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">ดึงข้อมูลล่าสุด</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-200 bg-orange-950/80 hover:bg-orange-900 border border-orange-800/80 rounded-xl transition-all shadow-xs"
              title="ตั้งค่าระบบและเครื่องมือทางเทคนิค (Settings)"
            >
              <Settings className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">ตั้งค่า (Setting)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};



