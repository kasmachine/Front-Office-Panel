import React, { useState } from 'react';
import { CashCountData, ReceiptSubstituteData, MonthlyRevenueData, RevenueHistoryRecord } from '../types';
import { downloadJsonFile } from '../utils/jsonExport';
import { formatDateToDisplay } from '../utils/syncUtils';
import { X, Calendar, Download, Trash2, Clock, Check, Code2, TrendingUp, ChevronDown, ChevronRight, Layers, Lock, ShieldAlert } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCashCounts: CashCountData[];
  savedReceipts: ReceiptSubstituteData[];
  savedRevenueHistory?: RevenueHistoryRecord[];
  onLoadCashCount: (data: CashCountData) => void;
  onLoadReceipt: (data: ReceiptSubstituteData) => void;
  onLoadRevenueHistory?: (data: MonthlyRevenueData) => void;
  onDeleteCashCount: (id: string) => void;
  onDeleteReceipt: (id: string) => void;
  onDeleteRevenueHistory?: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  savedCashCounts,
  savedReceipts,
  savedRevenueHistory = [],
  onLoadCashCount,
  onLoadReceipt,
  onLoadRevenueHistory,
  onDeleteCashCount,
  onDeleteReceipt,
  onDeleteRevenueHistory,
}) => {
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'revenue' | 'cash' | 'receipt'>('all');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleMonthExpand = (key: string) => {
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteRevenueProtected = (id: string) => {
    const code = prompt('🔒 ประวัติ Revenue ถูกจัดเก็บไว้ถาวรตลอดไป\nสงวนสิทธิ์การลบเฉพาะผู้สร้างเว็บเท่านั้น กรุณากรอกรหัสผ่านผู้สร้างเว็บ (Creator Key):');
    if (code === 'admin' || code === 'creator' || code === 'nanseasons' || code === '123456') {
      if (onDeleteRevenueHistory) onDeleteRevenueHistory(id);
    } else if (code !== null) {
      alert('❌ รหัสผ่านผู้สร้างเว็บไม่ถูกต้อง! ระบบไม่อนุญาตให้ลบประวัติ Revenue');
    }
  };

  const handleDownloadAllJson = () => {
    downloadJsonFile(
      {
        exportDate: new Date().toISOString(),
        cashCounts: savedCashCounts,
        receiptSubstitutes: savedReceipts,
        revenueHistory: savedRevenueHistory,
      },
      `FrontOfficePanel_All_History_${new Date().toISOString().split('T')[0]}.json`
    );
  };

interface MonthGroup {
  key: string;
  year: number;
  month: number;
  monthName: string;
  records: RevenueHistoryRecord[];
}

  // Group Revenue History by Month/Year Key (Overwriting duplicates to show clean monthly history)
  const revenueByMonthMap = savedRevenueHistory.reduce<Record<string, MonthGroup>>((acc, item) => {
    if (!item || !item.year || !item.month) return acc;
    const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        year: item.year,
        month: item.month,
        monthName: item.monthName || `เดือน ${item.month}/${item.year + 543}`,
        records: [item],
      };
    } else {
      // Keep newer record first
      const existingTime = acc[key].records[0]?.createdAt || 0;
      const itemTime = item.createdAt || 0;
      if (itemTime >= existingTime) {
        acc[key].records = [item, ...acc[key].records];
      } else {
        acc[key].records.push(item);
      }
    }
    return acc;
  }, {});

  // Sort month keys descending (newest month first)
  const sortedMonthGroups: MonthGroup[] = Object.values(revenueByMonthMap).sort((a, b) => b.key.localeCompare(a.key));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-800">ประวัติเอกสาร & ข้อมูลย้อนหลัง (History)</h2>
          </div>
          <div className="flex items-center gap-2">
            {(savedCashCounts.length > 0 || savedReceipts.length > 0 || savedRevenueHistory.length > 0) && (
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

        {/* Modal Filter Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveHistoryTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeHistoryTab === 'all'
                ? 'bg-white text-orange-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            ทั้งหมด ({savedRevenueHistory.length + savedCashCounts.length + savedReceipts.length})
          </button>
          <button
            onClick={() => setActiveHistoryTab('revenue')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeHistoryTab === 'revenue'
                ? 'bg-white text-orange-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
             Revenue ({savedRevenueHistory.length})
          </button>
          <button
            onClick={() => setActiveHistoryTab('cash')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeHistoryTab === 'cash'
                ? 'bg-white text-orange-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            ตารางนับเงิน ({savedCashCounts.length})
          </button>
          <button
            onClick={() => setActiveHistoryTab('receipt')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeHistoryTab === 'receipt'
                ? 'bg-white text-orange-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            ใบเสร็จแทน ({savedReceipts.length})
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 font-medium shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <b>ระบบบันทึกถาวร (Permanent Revenue Log):</b> ประวัติ Revenue ถูกจัดเก็บไว้ตลอดไปแบบแยกย่อยรายเดือน ห้ามลบเด็ดขาด (สิทธิ์การลบจำกัดเฉพาะผู้สร้างเว็บเท่านั้น)
              </span>
            </div>
          </div>

          {/* Section 1: Saved Revenue History (Grouped by Month) */}
          {(activeHistoryTab === 'all' || activeHistoryTab === 'revenue') && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                ประวัติยอดขาย & เป้าหมายรายเดือน (Monthly Revenue Log) - {savedRevenueHistory.length} รายการ
              </h3>

              {savedRevenueHistory.length === 0 ? (
                <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  ยังไม่มีประวัติการแก้ไข Revenue บันทึกไว้
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedMonthGroups.map((group) => {
                    const isCollapsed = expandedMonths[group.key] === false;

                    return (
                      <div
                        key={group.key}
                        className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
                      >
                        {/* Month Header Group Title */}
                        <div
                          onClick={() => toggleMonthExpand(group.key)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-emerald-50/40 border-b border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-emerald-600" />
                            )}
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span className="font-extrabold text-slate-800 text-sm sm:text-base">
                              {group.monthName}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-200 ml-1">
                              {group.records.length === 1 ? 'ข้อมูลประจำเดือน' : `${group.records.length} เวอร์ชัน`}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">
                            ล่าสุด: {group.records[0]?.updatedAt || '-'}
                          </span>
                        </div>

                        {/* Month Records Grid */}
                        {!isCollapsed && (
                          <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.records.map((item) => (
                              <div
                                key={item.id}
                                className="border border-slate-200 hover:border-emerald-400 rounded-xl p-3.5 bg-white transition-all shadow-2xs flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between font-bold text-slate-800 text-xs">
                                    <span className="text-emerald-700 flex items-center gap-1 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                      {item.updatedAt}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-xs text-slate-700 font-mono space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p className="font-extrabold text-slate-900 text-sm">
                                      ยอดขายรวม: <span className="text-emerald-700">THB {(item.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </p>
                                    {item.data?.target && (
                                      <p className="text-slate-500 font-sans text-[11px]">
                                        เป้าหมาย (Target): THB {((item.data.target.rooms || 0) + (item.data.target.foodBeverage || 0) + (item.data.target.shop || 0) + (item.data.target.toursEtc || 0) + (item.data.target.massage || 0) + (item.data.target.laundryOthers || 0)).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
                                  <button
                                    onClick={() => {
                                      downloadJsonFile(item.data, `Revenue_${group.key}_${item.id}.json`);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300"
                                    title="ดาวน์โหลดไฟล์ JSON รายการนี้"
                                  >
                                    <Code2 className="w-3 h-3 text-sky-600" /> JSON
                                  </button>
                                  {onLoadRevenueHistory && (
                                    <button
                                      onClick={() => {
                                        onLoadRevenueHistory(item.data);
                                        onClose();
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-300"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" /> ดึงข้อมูลเวอร์ชันนี้
                                    </button>
                                  )}
                                  {onDeleteRevenueHistory && (
                                    <button
                                      onClick={() => handleDeleteRevenueProtected(item.id)}
                                      className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors ml-1 flex items-center gap-0.5"
                                      title="ลบประวัติเวอร์ชันนี้ (เฉพาะผู้สร้างเว็บเท่านั้น)"
                                    >
                                      <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Saved Cash Counts */}
          {(activeHistoryTab === 'all' || activeHistoryTab === 'cash') && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                ตารางนับเงินประจำกะ (Shift Cash Sheets) - {savedCashCounts.length} รายการ
              </h3>

              {savedCashCounts.length === 0 ? (
                <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
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
          )}

          {/* Section 3: Saved Receipt Substitutes */}
          {(activeHistoryTab === 'all' || activeHistoryTab === 'receipt') && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-500" />
                ใบรับรองแทนใบเสร็จรับเงิน (Receipt Substitute Vouchers) - {savedReceipts.length} รายการ
              </h3>

              {savedReceipts.length === 0 ? (
                <div className="text-sm text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  ยังไม่มีรายการใบรับรองแทนใบเสร็จที่บันทึกไว้
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedReceipts.map((item) => {
                    const total = item.items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
                    const displayDate = formatDateToDisplay(item.startDate || item.items[0]?.date || '');

                    return (
                      <div
                        key={item.id}
                        className="border border-slate-200 hover:border-sky-400 rounded-xl p-3.5 bg-slate-50/50 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between font-bold text-slate-800 text-sm gap-2">
                            <span className="truncate max-w-[170px] text-slate-900 font-extrabold">
                              {item.requesterName || 'ไม่ระบุชื่อ'}
                            </span>
                            <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 shrink-0">
                              📅 {displayDate}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-2 font-mono flex items-center justify-between">
                            <span>ยอดรวมรายจ่าย:</span>
                            <span className="font-extrabold text-red-600">
                              THB {Math.abs(total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                            <span>จำนวน {item.items.length} รายการ</span>
                            {item.approverName && <span className="text-[11px] text-slate-400">ผู้อนุมัติ: {item.approverName}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => {
                              downloadJsonFile(item, `ReceiptSubstitute_${displayDate.replace(/\//g, '-')}.json`);
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
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded border border-sky-200"
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
          )}
        </div>
      </div>
    </div>
  );
};


