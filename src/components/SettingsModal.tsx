import React, { useRef } from 'react';
import { Settings, Download, Upload, History, RotateCcw, X, FileCode, Cloud, ShieldCheck, Users, FolderTree, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue';
  onDownloadJson: () => void;
  onImportJson: (file: File) => void;
  onOpenHistory: () => void;
  onClearDraft: () => void;
  onOpenManageStaff?: () => void;
  onOpenManageCategories?: () => void;
  onManualSync?: () => void;
  isFirebaseSyncing?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onDownloadJson,
  onImportJson,
  onOpenHistory,
  onClearDraft,
  onOpenManageStaff,
  onOpenManageCategories,
  onManualSync,
  isFirebaseSyncing = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-600/20 text-orange-400 rounded-xl border border-orange-500/30">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ตั้งค่าระบบ (System Settings)</h2>
              <p className="text-xs text-slate-400">จัดการข้อมูล สำรองไฟล์ และประวัติการบันทึก</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Data Backup & Restore */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-sky-500" />
              จัดการไฟล์สำรองข้อมูล (JSON Backup & Restore)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export JSON */}
              <button
                type="button"
                onClick={() => {
                  onDownloadJson();
                  onClose();
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-all text-left group"
              >
                <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">ดาวน์โหลด JSON</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">สำรองแบบฟอร์มปัจจุบันเป็นไฟล์</div>
                </div>
              </button>

              {/* Import JSON */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left group"
              >
                <div className="p-2.5 bg-slate-500/10 text-slate-600 dark:text-slate-300 rounded-lg group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">นำเข้า JSON</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">โหลดข้อมูลจากไฟล์ .json</div>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800"></div>

          {/* Section: Category/Topic Management */}
          {onOpenManageCategories && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-orange-500" />
                  จัดการหัวข้อรายการ (Expense & Income Topics)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onOpenManageCategories();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg group-hover:scale-105 transition-transform">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">แก้ไข / เพิ่ม / ลบหัวข้อรายการ</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">ปรับเปลี่ยนรายชื่อหัวข้อดรอปดาวน์สำหรับนับเงินสด</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/60 px-2.5 py-1 rounded-full">
                    จัดการหัวข้อ
                  </span>
                </button>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>
            </>
          )}
          {onOpenManageStaff && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  จัดการรายชื่อพนักงาน (Staff Roster)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onOpenManageStaff();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">แก้ไข / เพิ่ม / ลบรายชื่อพนักงาน</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">อัปเดตรายชื่อพนักงาน Real-Time ทุกอุปกรณ์</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                    จัดการรายชื่อ
                  </span>
                </button>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>
            </>
          )}

          {/* Section: Manual System Sync */}
          {onManualSync && (
            <>
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-sky-500" />
                  ดึงข้อมูลระบบล่าสุด (Manual System Sync)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onManualSync();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg group-hover:scale-105 transition-transform">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">ดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">ซิงค์ข้อมูล Real-time ล่าสุดจาก Firebase เข้าสู่ระบบ</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/60 px-2.5 py-1 rounded-full">
                    ดึงข้อมูลระบบ
                  </span>
                </button>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>
            </>
          )}

          {/* Section 2: History Log */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-500" />
              ประวัติการบันทึกข้อมูล (History Log)
            </h3>
            <button
              type="button"
              onClick={() => {
                onOpenHistory();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-105 transition-transform">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">ดูประวัติรายการที่บันทึกแล้ว</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">ค้นหา แก้ไข หรือลบรายการย้อนหลังในระบบ</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-full">
                เปิดประวัติ
              </span>
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800"></div>

          {/* Section 3: Draft Management */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-rose-500" />
              การจัดการข้อมูลกะ (Draft Management)
            </h3>
            <button
              type="button"
              onClick={() => {
                onClearDraft();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-105 transition-transform">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-900 dark:text-rose-300">ล้างข้อมูลกะปัจจุบัน (Reset Shift Data)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ล้างตัวเลขนับเงินในหน้า {activeTab === 'cashCount' ? 'ตารางนับเงิน' : 'ใบรับรองแทนใบเสร็จ'} เพื่อเริ่มกะใหม่
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-1 rounded-full">
                ล้างข้อมูล
              </span>
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800"></div>

          {/* Section 4: Real-time Cloud Status & Technical Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-500" />
              ข้อมูลทางเทคนิคและสถานะคลาวด์ (Technical Specifications)
            </h3>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">สถานะการเชื่อมต่อ:</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isFirebaseSyncing ? 'กำลังซิงค์ (Syncing)' : 'เชื่อมต่อปกติ (Online)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="block text-slate-500 font-mono">DATABASE ID</span>
                  <span className="font-semibold text-slate-200">ai-studio-0d3fe253-f957</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-mono">FIRESTORE COLLECTION</span>
                  <span className="font-semibold text-amber-400">cash_counts, receipts</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-mono">REAL-TIME ENGINE</span>
                  <span className="font-semibold text-sky-400">Firebase Firestore WebSocket</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-mono">LOCAL STORAGE BACKUP</span>
                  <span className="font-semibold text-emerald-400">Enabled (Auto-Sync)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xs hover:bg-slate-50 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
