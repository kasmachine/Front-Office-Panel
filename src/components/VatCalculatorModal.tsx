import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Percent,
  Calculator,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  X,
  Printer,
  Sparkles,
  RefreshCw,
  Info,
  DollarSign,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';
import { ArabicToBahtText } from '../utils/bahttext';
import { ReceiptSubstituteData, ReceiptSubstituteItem } from '../types';

export interface VatItemRow {
  id: string;
  description: string;
  amount: number | '';
  quantity: number | '';
  note?: string;
}

interface VatCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToReceipt?: (items: ReceiptSubstituteItem[], calcMode: 'exclusive' | 'inclusive', vatPercent: number) => void;
}

export const VatCalculatorModal: React.FC<VatCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToReceipt,
}) => {
  // Calculation Modes
  // 'exclusive' = ราคาก่อน VAT (บวก VAT 7% เพิ่ม)
  // 'inclusive' = ราคารวม VAT แล้ว (ถอด VAT 7% ออก)
  const [calcMode, setCalcMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [vatRate, setVatRate] = useState<number>(7); // Default 7%
  const [whtRate, setWhtRate] = useState<number>(0); // Withholding tax rate: 0%, 1%, 2%, 3%, 5%

  // Multi-item rows
  const [items, setItems] = useState<VatItemRow[]>([
    { id: '1', description: 'ค่าบริการ / สินค้า รายการที่ 1', amount: 1000, quantity: 1, note: '' },
  ]);

  // Quick Single Amount Input for fast calculation
  const [quickAmount, setQuickAmount] = useState<number | ''>('');

  // Toast / Copied Feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedNotice, setAppliedNotice] = useState<boolean>(false);

  // Add Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `vat-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        description: `รายการสินค้า/บริการที่ ${prev.length + 1}`,
        amount: '',
        quantity: 1,
        note: '',
      },
    ]);
  };

  // Update Row
  const handleUpdateItem = (id: string, field: keyof VatItemRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Delete Row
  const handleDeleteItem = (id: string) => {
    if (items.length <= 1) {
      // Keep at least one row, just reset it
      setItems([{ id: '1', description: '', amount: '', quantity: 1, note: '' }]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear All
  const handleClearAll = () => {
    setItems([{ id: '1', description: '', amount: '', quantity: 1, note: '' }]);
    setQuickAmount('');
    setCopied(false);
    setAppliedNotice(false);
  };

  // Print Handler
  const handlePrint = () => {
    document.body.classList.add('print-vat-mode');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-vat-mode');
    }, 600);
  };

  // Calculations
  const calculations = useMemo(() => {
    // Determine raw total from items or quick input
    let sumRaw = 0;
    
    if (typeof quickAmount === 'number' && quickAmount > 0) {
      sumRaw = quickAmount;
    } else {
      items.forEach((item) => {
        const amt = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0') || 0;
        const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0') || 0;
        sumRaw += amt * qty;
      });
    }

    let subtotalBeforeVat = 0;
    let vatAmount = 0;
    let grandTotalInclVat = 0;

    if (calcMode === 'exclusive') {
      // Exclusive VAT: sumRaw is Subtotal before VAT
      subtotalBeforeVat = sumRaw;
      vatAmount = subtotalBeforeVat * (vatRate / 100);
      grandTotalInclVat = subtotalBeforeVat + vatAmount;
    } else {
      // Inclusive VAT: sumRaw is Grand Total incl VAT
      grandTotalInclVat = sumRaw;
      if (vatRate > 0) {
        subtotalBeforeVat = grandTotalInclVat / (1 + vatRate / 100);
        vatAmount = grandTotalInclVat - subtotalBeforeVat;
      } else {
        subtotalBeforeVat = grandTotalInclVat;
        vatAmount = 0;
      }
    }

    // Withholding tax calculation (หัก ณ ที่จ่าย) based on subtotal before VAT
    const whtAmount = subtotalBeforeVat * (whtRate / 100);
    const netPayable = grandTotalInclVat - whtAmount;

    const bahtTextGrand = ArabicToBahtText(grandTotalInclVat);
    const bahtTextNet = ArabicToBahtText(netPayable);

    return {
      sumRaw,
      subtotalBeforeVat,
      vatAmount,
      grandTotalInclVat,
      whtAmount,
      netPayable,
      bahtTextGrand,
      bahtTextNet,
    };
  }, [items, quickAmount, calcMode, vatRate, whtRate]);

  // Copy Summary Text
  const handleCopyText = () => {
    const lines = [
      `=== รายงานคำนวณ VAT ${vatRate}% & ยอดรวมสุทธิ ===`,
      `โหมดคำนวณ: ${calcMode === 'exclusive' ? 'ราคาก่อน VAT (Exclusive)' : 'ราคารวม VAT แล้ว (Inclusive)'}`,
      `---------------------------------------`,
    ];

    if (typeof quickAmount === 'number' && quickAmount > 0) {
      lines.push(`ยอดเงินตั้งต้น: ฿${quickAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    } else {
      items.forEach((it, idx) => {
        if (it.description || it.amount) {
          const a = Number(it.amount || 0);
          const q = Number(it.quantity || 1);
          lines.push(`${idx + 1}. ${it.description || 'รายการ'} (฿${a.toLocaleString()} x ${q}) = ฿${(a * q).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
      });
    }

    lines.push(`---------------------------------------`);
    lines.push(`ยอดรวมก่อน VAT (Subtotal): ฿${calculations.subtotalBeforeVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`ภาษีมูลค่าเพิ่ม (VAT ${vatRate}%): ฿${calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`ยอดรวมทั้งสิ้น (Grand Total): ฿${calculations.grandTotalInclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    if (whtRate > 0) {
      lines.push(`หัก ณ ที่จ่าย (WHT ${whtRate}%): -฿${calculations.whtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      lines.push(`ยอดจ่ายสุทธิ (Net Payable): ฿${calculations.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    lines.push(`ตัวอักษร: (${calculations.bahtTextNet || calculations.bahtTextGrand})`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Send items to Receipt Substitute
  const handleSendToReceipt = () => {
    if (!onApplyToReceipt) return;

    const receiptItems: ReceiptSubstituteItem[] = [];

    if (typeof quickAmount === 'number' && quickAmount > 0) {
      receiptItems.push({
        id: `item-${Date.now()}-quick`,
        date: new Date().toISOString().split('T')[0],
        description: `รายการคำนวณ VAT ${vatRate}% (${calcMode === 'exclusive' ? 'ก่อน VAT' : 'รวม VAT'})`,
        amount: calculations.grandTotalInclVat,
        remark: `คำนวณ VAT ${vatRate}% (ภาษี ฿${calculations.vatAmount.toFixed(2)})`,
      });
    } else {
      items.forEach((it) => {
        const amt = Number(it.amount || 0);
        const qty = Number(it.quantity || 1);
        if (amt > 0) {
          let lineTotal = amt * qty;
          if (calcMode === 'exclusive' && vatRate > 0) {
            lineTotal = lineTotal * (1 + vatRate / 100);
          }
          receiptItems.push({
            id: it.id || `item-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `${it.description || 'รายการสินค้า/บริการ'} ${qty > 1 ? `(${qty} x ฿${amt.toLocaleString()})` : ''}`,
            amount: lineTotal,
            remark: it.note || `คำนวณ VAT ${vatRate}%`,
          });
        }
      });
    }

    if (receiptItems.length > 0) {
      onApplyToReceipt(receiptItems, calcMode, vatRate);
      setAppliedNotice(true);
      setTimeout(() => {
        setAppliedNotice(false);
        onClose();
      }, 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                    VAT 7% & Total Calculator (เครื่องคิดเลข VAT 7% & ยอดรวม)
                  </h2>
                  <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Formula Tool
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  สูตรคำนวณยอดเงินถอด/บวก VAT 7%, หัก ณ ที่จ่าย, และรวมยอดอัตโนมัติ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-bold transition-all border border-orange-500/30 cursor-pointer"
                title="พิมพ์รายงานการคำนวณ VAT"
              >
                <Printer className="w-4 h-4 text-orange-400" />
                <span>พิมพ์เอกสาร</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

            {/* Mode Switcher & VAT Rate Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              {/* Mode selection */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                  โหมดการคำนวณภาษี VAT (VAT Mode)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcMode('exclusive')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer flex flex-col justify-between ${
                      calcMode === 'exclusive'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>1. ราคาก่อน VAT (Exclusive)</span>
                      <span className="text-[10px] bg-orange-200/80 text-orange-900 px-1.5 py-0.5 rounded-md font-bold">
                        บวก VAT 7% เพิ่ม
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 mt-1">
                      (ยอดเงินระบุเป็นราคาก่อนภาษี + คำนวณ VAT {vatRate}% เพิ่มเติม)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalcMode('inclusive')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer flex flex-col justify-between ${
                      calcMode === 'inclusive'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>2. ราคารวม VAT แล้ว (Inclusive)</span>
                      <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.5 rounded-md font-bold">
                        ถอด VAT 7% ออก
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 mt-1">
                      (ยอดเงินจ่ายจริงรวม VAT แล้ว -&gt; ระบบจะแยกถอด VAT ออกให้)
                    </span>
                  </button>
                </div>
              </div>

              {/* VAT Rate & WHT Rate Selectors */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>อัตรา VAT (%)</span>
                    <span className="text-[10px] text-orange-600 font-mono">มาตรฐาน 7%</span>
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {[7, 0].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setVatRate(rate)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          vatRate === rate
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {rate}% {rate === 7 ? '(มาตรฐาน)' : '(ยกเว้น VAT)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>หัก ณ ที่จ่าย WHT (%)</span>
                    <span className="text-[10px] text-slate-500">เลือกหากมี</span>
                  </label>
                  <select
                    value={whtRate}
                    onChange={(e) => setWhtRate(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={0}>ไม่หัก ณ ที่จ่าย (0%)</option>
                    <option value={1}>1% - ค่าขนส่ง / ค่าบริการสวัสดิการ</option>
                    <option value={2}>2% - ค่าโฆษณา</option>
                    <option value={3}>3% - ค่าบริการ / ค่ารับจ้างวิชาชีพ</option>
                    <option value={5}>5% - ค่าเช่าสถานที่ / ค่ารางวัล</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Single Calculator vs Detailed Item Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    ตารางกรอกยอดเงินและรายการคำนวณ
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มช่องกรอกรายการ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ล้างข้อมูล</span>
                  </button>
                </div>
              </div>

              {/* Quick Single Amount Field */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    ทางลัด: กรอกยอดเงินรวมตัวเดียว (Quick Amount)
                  </span>
                  <p className="text-[11px] text-amber-800">
                    หากต้องการคำนวณยอดเงินรวมก้อนเดียวด่วน ไม่ต้องกรอกทีละรายการ สามารถพิมพ์ในช่องนี้ได้ทันที
                  </p>
                </div>
                <div className="relative shrink-0 w-full sm:w-64">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">฿</span>
                  <input
                    type="number"
                    placeholder="เช่น 1000 หรือ 1070"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full bg-white border border-amber-300 rounded-xl pl-8 pr-3 py-2 text-sm font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Table of Item Rows */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3 text-center w-12">#</th>
                        <th className="py-3 px-3">รายการสินค้า/บริการ (Description)</th>
                        <th className="py-3 px-3 w-36 text-right">ราคาต่อหน่วย (฿)</th>
                        <th className="py-3 px-3 w-24 text-center">จำนวน (Qty)</th>
                        <th className="py-3 px-3 w-36 text-right">ยอดรวม (฿)</th>
                        <th className="py-3 px-3 text-center w-12">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => {
                        const amt = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0') || 0;
                        const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0') || 0;
                        const rowTotal = amt * qty;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                placeholder="ระบุชื่อรายการสินค้า หรือ บริการ..."
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'amount', e.target.value === '' ? '' : parseFloat(e.target.value))
                                }
                                placeholder="0.00"
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(item.id, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))
                                }
                                placeholder="1"
                                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-2 py-1.5 text-xs text-center font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ฿{rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Formulas Output & Calculation Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-2.5 py-0.5 rounded-full border border-orange-500/30">
                    CALCULATION RESULT SUMMARY
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    ผลสรุปการคำนวณยอดเงินภาษี VAT {vatRate}%
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-950" />
                    <span>พิมพ์ใบสรุป VAT</span>
                  </button>
                  <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
                    {calcMode === 'exclusive' ? 'โหมด: ราคาก่อน VAT (Exclusive)' : 'โหมด: ราคารวม VAT แล้ว (Inclusive)'}
                  </span>
                </div>
              </div>

              {/* Main Calculated Values Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Box 1: Subtotal before VAT */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    ยอดรวมก่อน VAT (Subtotal)
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                    ฿{calculations.subtotalBeforeVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {calcMode === 'exclusive' ? 'ยอดรวมเงินรายการตั้งต้น' : 'ราคาสินค้า/บริการถอด VAT ออก'}
                  </div>
                </div>

                {/* Box 2: VAT Amount */}
                <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-orange-300 font-bold uppercase flex items-center justify-between">
                    <span>ภาษีมูลค่าเพิ่ม (VAT {vatRate}%)</span>
                    <Percent className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-orange-400 tracking-tight">
                    ฿{calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-orange-200/80">
                    {calcMode === 'exclusive'
                      ? `= ฿${calculations.subtotalBeforeVat.toLocaleString()} x ${vatRate}%`
                      : `= ฿${calculations.grandTotalInclVat.toLocaleString()} x (${vatRate}/107)`}
                  </div>
                </div>

                {/* Box 3: Grand Total incl VAT */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-emerald-300 font-bold uppercase">
                    ยอดเงินรวมทั้งสิ้น (Grand Total)
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                    ฿{calculations.grandTotalInclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-200/80">
                    ราคารวมภาษีมูลค่าเพิ่มเรียบร้อย
                  </div>
                </div>

                {/* Box 4: Net Payable (if WHT) */}
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-blue-300 font-bold uppercase flex items-center justify-between">
                    <span>ยอดจ่ายสุทธิหลังหัก {whtRate}%</span>
                    <span className="text-[10px] font-bold text-blue-200 font-mono">WHT</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-blue-300 tracking-tight">
                    ฿{calculations.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-blue-200/80">
                    {whtRate > 0 ? `หัก ณ ที่จ่าย ${whtRate}% = ฿${calculations.whtAmount.toFixed(2)}` : 'ยอดรวมเท่ากับ Grand Total'}
                  </div>
                </div>
              </div>

              {/* Thai Baht Text Display */}
              <div className="p-4 rounded-2xl bg-white/10 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-bold">ยอดเงินเป็นตัวอักษร:</span>
                </div>
                <div className="text-sm font-bold text-orange-300 font-serif tracking-wide bg-black/30 px-3 py-1.5 rounded-xl border border-white/10">
                  ({whtRate > 0 ? calculations.bahtTextNet : calculations.bahtTextGrand})
                </div>
              </div>
            </div>

          </div>

          {/* Modal Footer Actions */}
          <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-600 shadow-2xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>พิมพ์ใบสรุป VAT (Print)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-orange-600" />}
                <span>{copied ? 'คัดลอกข้อความสรุปแล้ว!' : 'คัดลอกผลสรุป (Copy Text)'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onApplyToReceipt && (
                <button
                  type="button"
                  onClick={handleSendToReceipt}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                    appliedNotice
                      ? 'bg-emerald-600'
                      : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                  }`}
                >
                  {appliedNotice ? <CheckCircle2 className="w-4 h-4 text-white" /> : <FileText className="w-4 h-4 text-white" />}
                  <span>{appliedNotice ? 'ส่งไปใบรับรองแทนใบเสร็จเรียบร้อย!' : 'ส่งยอดลงใบรับรองแทนใบเสร็จ'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Printable VAT Summary Document Sheet */}
      {typeof document !== 'undefined' && createPortal(
        <div id="vat-calc-print-root" className="hidden font-sans text-slate-900 p-8 bg-white max-w-4xl mx-auto border border-slate-300">
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900">โรงแรม น่าน ซีซันส์ บูทีค รีสอร์ท</h1>
              <p className="text-xs text-slate-600 mt-0.5">NAN SEASONS BOUTIQUE RESORT</p>
              <h2 className="text-base font-black text-orange-700 mt-2 uppercase tracking-wide">
                ใบสรุปและบันทึกการคำนวณภาษีมูลค่าเพิ่ม (VAT 7% Calculation Report)
              </h2>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-1">
              <div><strong className="text-slate-800">วันที่พิมพ์:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><strong className="text-slate-800">เวลา:</strong> {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
              <div className="mt-2 inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded">
                {calcMode === 'exclusive' ? 'โหมด: ราคาก่อน VAT (Exclusive)' : 'โหมด: ราคารวม VAT แล้ว (Inclusive)'}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase text-slate-700 mb-2">รายการสินค้า / บริการที่คำนวณ:</h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-10">ลำดับ</th>
                  <th className="py-2 px-3 border-r border-slate-300">รายการ (Description)</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-right w-28">ราคาต่อหน่วย (฿)</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-16">จำนวน</th>
                  <th className="py-2 px-3 text-right w-32">จำนวนเงินรวม (฿)</th>
                </tr>
              </thead>
              <tbody>
                {typeof quickAmount === 'number' && quickAmount > 0 ? (
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">1</td>
                    <td className="py-2 px-3 border-r border-slate-200">
                      รายการคำนวณยอดเงินรวมก้อนเดียว (Quick Amount Input)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">
                      {quickAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">1</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">
                      {quickAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const amt = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || '0') || 0;
                    const qty = typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity || '0') || 0;
                    const total = amt * qty;
                    return (
                      <tr key={it.id || idx} className="border-b border-slate-200">
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-200">{it.description || '-'}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono">{amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{qty}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="flex justify-end mb-6">
            <div className="w-80 border border-slate-300 rounded-lg p-3 space-y-2 bg-slate-50 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>ยอดรวมสินค้า/บริการก่อน VAT:</span>
                <span className="font-mono font-bold">฿{calculations.subtotalBeforeVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold border-b border-slate-200 pb-1.5">
                <span>ภาษีมูลค่าเพิ่ม VAT ({vatRate}%):</span>
                <span className="font-mono text-orange-700">฿{calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-b border-slate-300 pb-2">
                <span>ยอดเงินรวมทั้งสิ้น (Grand Total):</span>
                <span className="font-mono text-emerald-700">฿{calculations.grandTotalInclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {whtRate > 0 && (
                <>
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>หัก ณ ที่จ่าย WHT ({whtRate}%):</span>
                    <span className="font-mono text-rose-700">- ฿{calculations.whtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-blue-900 bg-blue-50 p-1.5 rounded border border-blue-200">
                    <span>ยอดจ่ายสุทธิหลังหักภาษี:</span>
                    <span className="font-mono">฿{calculations.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Thai Baht Text */}
          <div className="mb-8 p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs flex items-center justify-between">
            <span className="font-bold text-slate-700">จำนวนเงินตัวอักษร:</span>
            <span className="font-serif font-bold text-slate-900">({whtRate > 0 ? calculations.bahtTextNet : calculations.bahtTextGrand})</span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs text-slate-800 text-center">
            <div>
              <div className="border-b border-dotted border-slate-400 h-10 mb-2 w-48 mx-auto"></div>
              <div>(............................................................)</div>
              <div className="font-bold mt-1">ผู้คำนวณ / เจ้าหน้าที่ผู้จัดทำ</div>
              <div className="text-[10px] text-slate-500 mt-0.5">วันที่ ........ / ........ / ................</div>
            </div>

            <div>
              <div className="border-b border-dotted border-slate-400 h-10 mb-2 w-48 mx-auto"></div>
              <div>(............................................................)</div>
              <div className="font-bold mt-1">ผู้ตรวจสอบ / แผนกบัญชีและการเงิน</div>
              <div className="text-[10px] text-slate-500 mt-0.5">วันที่ ........ / ........ / ................</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
