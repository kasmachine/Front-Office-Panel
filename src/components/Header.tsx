import React, { useRef } from 'react';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { FileText, Calculator, Download, Printer, Save, History, Code2, Cloud, Upload } from 'lucide-react';

interface HeaderProps {
  activeTab: 'cashCount' | 'receiptSubstitute';
  onSelectTab: (tab: 'cashCount' | 'receiptSubstitute') => void;
  onExportPdf: () => void;
  onDownloadJson: () => void;
  onImportJson: (file: File) => void;
  onPrint: () => void;
  onSaveRecord: () => void;
  onOpenHistory: () => void;
  isSaving?: boolean;
  isFirebaseSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onExportPdf,
  onDownloadJson,
  onImportJson,
  onPrint,
  onSaveRecord,
  onOpenHistory,
  isSaving = false,
  isFirebaseSyncing = false,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <header className="no-print bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-3 py-1.5 rounded-xl shadow-xs border border-white/20">
            <NanSeasonsLogo className="h-18 md:h-20" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              ระบบการเงิน & เอกสาร Front Office Panel
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3" />
                Firebase Connected
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {activeTab === 'cashCount'
                ? 'ตารางนับเงินสดเข้า-ออกประจำกะ (Shift Cash Reconciliation Sheet)'
                : 'ใบรับรองแทนใบเสร็จรับเงินพร้อมแนบสำเนาบัตรประชาชน'}
            </p>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80 self-start md:self-auto">
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

        {/* Export & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Save to Firebase Button */}
          <button
            type="button"
            onClick={onSaveRecord}
            disabled={isSaving || isFirebaseSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-xs"
            title="บันทึกข้อมูลไปที่ Firebase และประวัติ"
          >
            <Cloud className={`w-3.5 h-3.5 ${isFirebaseSyncing ? 'animate-spin' : ''}`} />
            {isSaving || isFirebaseSyncing ? 'กำลังบันทึก...' : 'บันทึก Firebase'}
          </button>

          {/* Download JSON Button */}
          <button
            type="button"
            onClick={onDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-200 bg-sky-950/80 hover:bg-sky-900 border border-sky-800 rounded-lg transition-colors"
            title="ดาวน์โหลดข้อมูลชุดนี้เป็นไฟล์ .json"
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            ดาวน์โหลด JSON
          </button>

          {/* Import JSON Button */}
          <input
            type="file"
            ref={jsonFileInputRef}
            onChange={handleJsonFileChange}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => jsonFileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="นำเข้าข้อมูลจากไฟล์ .json"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            นำเข้า JSON
          </button>

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="ดูประวัติบันทึกในระบบ"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            ประวัติ
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block"></div>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            พิมพ์
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            ส่งออก PDF
          </button>
        </div>
      </div>
    </header>
  );
};

