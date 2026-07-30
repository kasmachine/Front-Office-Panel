import React from 'react';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { FileText, Calculator, Cloud, Settings } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cashCount' | 'receiptSubstitute';
  onSelectTab: (tab: 'cashCount' | 'receiptSubstitute') => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
}) => {

  return (
    <header className="no-print bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-white/20">
            <NanSeasonsLogo className="h-18 md:h-20" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              ระบบการเงิน & เอกสาร Front Office Panel
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Cloud className="w-3 h-3 text-emerald-400" />
                Firebase Real-time Synced
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {activeTab === 'cashCount'
                ? 'ตารางนับเงินสดเข้า-ออกประจำกะ (Shift Cash Reconciliation Sheet)'
                : 'ใบรับรองแทนใบเสร็จรับเงินพร้อมแนบสำเนาบัตรประชาชน'}
            </p>
          </div>
        </div>

        {/* Tab Selector & Settings Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => onSelectTab('cashCount')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'cashCount'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calculator className="w-4 h-4" />
              ตารางนับเงินประจำกะ
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('receiptSubstitute')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'receiptSubstitute'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              ใบรับรองแทนใบเสร็จ
            </button>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-orange-200 bg-orange-950/80 hover:bg-orange-900 border border-orange-800/80 rounded-xl transition-all shadow-xs"
              title="ตั้งค่าระบบและเครื่องมือทางเทคนิค (Settings)"
            >
              <Settings className="w-4 h-4 text-orange-400" />
              <span>ตั้งค่า (Settings)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

