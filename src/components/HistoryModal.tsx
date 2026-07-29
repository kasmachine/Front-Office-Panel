import React from 'react';
import { CashCountData, ReceiptSubstituteData } from '../types';
import { downloadJsonFile } from '../utils/jsonExport';
import { X, Calendar, Download, Trash2, Clock, Check, Code2 } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCashCounts: CashCountData[];
  savedReceipts: ReceiptSubstituteData[];
  onLoadCashCount: (data: CashCountData) => void;
  onLoadReceipt: (data: ReceiptSubstituteData) => void;
  onDeleteCashCount: (id: string) => void;
  onDeleteReceipt: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  savedCashCounts,
  savedReceipts,
  onLoadCashCount,
  onLoadReceipt,
  onDeleteCashCount,
  onDeleteReceipt,
}) => {
  if (!isOpen) return null;

  const handleDownloadAllJson = () => {
    downloadJsonFile(
      {
        exportDate: new Date().toISOString(),
        cashCounts: savedCashCounts,
        receiptSubstitutes: savedReceipts,
      },
      `FrontOfficePanel_All_History_${new Date().toISOString().split('T')[0]}.json`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-800">ประวัติเอกสารในระบบ (Firebase & Local Records)</h2>
          </div>
          <div className="flex items-center gap-2">
            {(savedCashCounts.length > 0 || savedReceipts.length > 0) && (
              <button
                onClick={handleDownloadAllJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                title="ดาวน์โหลดประวัติทั้งหมดเป็นไฟล์ JSON"
              >
                <Code2 className="w-3.5 h-3.5 text-sky-600" />
                ดาวน์โหลด JSON ทั้งหมด
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Saved Cash Counts */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              ตารางนับเงินประจำกะ (Shift Cash Sheets) - {savedCashCounts.length} รายการ
            </h3>

            {savedCashCounts.length === 0 ? (
              <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                ยังไม่มีรายการตารางนับเงินที่บันทึกไว้
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedCashCounts.map((item) => {
                  const totalIn = item.denominations.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0);
                  const totalOut = item.denominations.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0);

                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 hover:border-orange-400 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                          <span>กะ {item.shift}</span>
                          <span className="text-xs font-mono text-slate-500">{item.date}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 space-y-0.5 font-mono">
                          <p>ยอด IN: THB {totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          <p>ยอด OUT: THB {totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          {item.staffOut && <p className="text-slate-500 font-sans">พนักงาน: {item.staffOut}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => {
                            downloadJsonFile(item, `CashCount_${item.shift}_${item.date.replace(/\//g, '-')}.json`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300"
                          title="ดาวน์โหลดไฟล์ JSON รายการนี้"
                        >
                          <Code2 className="w-3 h-3 text-sky-600" /> JSON
                        </button>
                        <button
                          onClick={() => {
                            onLoadCashCount(item);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded border border-orange-200"
                        >
                          <Check className="w-3.5 h-3.5" /> ดึงข้อมูล
                        </button>
                        <button
                          onClick={() => onDeleteCashCount(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors ml-1"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saved Receipt Substitutes */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4 text-orange-500" />
              ใบรับรองแทนใบเสร็จรับเงิน (Receipt Substitute Vouchers) - {savedReceipts.length} รายการ
            </h3>

            {savedReceipts.length === 0 ? (
              <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                ยังไม่มีรายการใบรับรองแทนใบเสร็จที่บันทึกไว้
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedReceipts.map((item) => {
                  const total = item.items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 hover:border-orange-400 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-800 text-sm">
                          <span className="truncate max-w-[180px]">{item.requesterName || 'ไม่ระบุชื่อ'}</span>
                          <span className="text-xs font-mono text-slate-500">{item.startDate}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 font-mono">
                          ยอดรวม: <span className="font-extrabold text-emerald-700">THB {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          จำนวน {item.items.length} รายการ
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => {
                            downloadJsonFile(item, `ReceiptSubstitute_${item.startDate.replace(/\//g, '-')}.json`);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300"
                          title="ดาวน์โหลดไฟล์ JSON รายการนี้"
                        >
                          <Code2 className="w-3 h-3 text-sky-600" /> JSON
                        </button>
                        <button
                          onClick={() => {
                            onLoadReceipt(item);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded border border-orange-200"
                        >
                          <Check className="w-3.5 h-3.5" /> ดึงข้อมูล
                        </button>
                        <button
                          onClick={() => onDeleteReceipt(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors ml-1"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

