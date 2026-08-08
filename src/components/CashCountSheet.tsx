import React, { useEffect, useState } from 'react';
import { CashCountData, ExpenseRow } from '../types';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { Plus, Trash2, RotateCcw, Calendar, PenTool } from 'lucide-react';
import { SignatureModal } from './SignatureModal';

function toIsoDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return '';
}

function fromIsoDate(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  return isoStr;
}
import { StaffSelect } from './StaffSelect';
import { ExpenseCategorySelect, getStoredCategories } from './ExpenseCategorySelect';
import { saveCashCountToFirebase } from '../lib/firebase';
import { getPreviousDayLateBalance } from '../utils/syncUtils';
import { Users } from 'lucide-react';

interface CashCountSheetProps {
  data: CashCountData;
  onChange: (newData: CashCountData) => void;
  onReset: () => void;
  savedCashCounts?: CashCountData[];
  onOpenManageStaff?: () => void;
  onOpenManageCategories?: () => void;
}

export const CashCountSheet: React.FC<CashCountSheetProps> = ({
  data,
  onChange,
  onReset,
  savedCashCounts = [],
  onOpenManageStaff,
  onOpenManageCategories,
}) => {
  const [activeSigModal, setActiveSigModal] = useState<'staffIn' | 'staffOut' | null>(null);

  // Auto-populate Previous balance from yesterday's Late shift if current Previous balance is 0
  useEffect(() => {
    if (
      (!data.beerPrevBalance || data.beerPrevBalance === 0) &&
      savedCashCounts &&
      savedCashCounts.length > 0 &&
      data.date
    ) {
      const autoPrev = getPreviousDayLateBalance(data.date, savedCashCounts);
      if (autoPrev > 0) {
        onChange({ ...data, beerPrevBalance: autoPrev });
      }
    }
  }, [data.date, savedCashCounts]);

  const handlePullPrevDayLateBalance = () => {
    const fetchedBalance = getPreviousDayLateBalance(data.date, savedCashCounts || []);
    if (fetchedBalance > 0) {
      onChange({ ...data, beerPrevBalance: fetchedBalance });
      const formatted = `THB ${fetchedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      alert(`ดึงยอด Previous Balance จากกะบ่ายวันก่อนหน้า (${formatted}) เรียบร้อยแล้ว`);
    } else {
      alert('ไม่พบประวัติการบันทึกยอดเงินของกะบ่ายในวันก่อนหน้า');
    }
  };

  const isMinusItem = (itemStr: string): boolean => {
    if (!itemStr) return false;
    const trimmed = itemStr.trim();
    if (trimmed.startsWith('-')) return true;
    const cats = getStoredCategories();
    return cats.minus.some((c) => c.trim().toLowerCase() === trimmed.toLowerCase());
  };

  const isPlusItem = (itemStr: string): boolean => {
    if (!itemStr) return false;
    const trimmed = itemStr.trim();
    if (trimmed.startsWith('+')) return true;
    const cats = getStoredCategories();
    return cats.plus.some((c) => c.trim().toLowerCase() === trimmed.toLowerCase());
  };

  // Calculations
  const totalCashIn = data.denominations.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0);
  const totalCashOut = data.denominations.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0);

  const totalExpensesIn = data.expensesIn.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalExpensesOut = data.expensesOut.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Red cell for IN side
  const redInDiff = totalCashIn - (data.beerPrevBalance || 0);
  const prevBalanceOut = totalCashIn > 0 ? totalCashIn : (data.beerPrevBalance || 0);
  const redOutDiff = totalCashOut - prevBalanceOut;
  const calculatedBeerShiftDiff = totalCashOut > 0 ? redOutDiff : redInDiff;

  const shiftDiff = totalCashOut - totalCashIn;
  const netDiff = (totalCashOut + totalExpensesOut) - (totalCashIn + totalExpensesIn);

  // Specifically for IN side: Pink cell Final = Red cell (redInDiff) - totalExpensesIn
  const finalIn = redInDiff - totalExpensesIn;
  const finalOut = redOutDiff - totalExpensesOut;

  const handleDenominationChange = (index: number, field: 'countIn' | 'countOut', val: string) => {
    const numVal = Math.max(0, parseInt(val, 10) || 0);
    const updated = [...data.denominations];
    updated[index] = { ...updated[index], [field]: numVal };
    onChange({ ...data, denominations: updated });
  };

  const handleExpenseChange = (
    type: 'expensesIn' | 'expensesOut',
    index: number,
    field: keyof ExpenseRow,
    val: string | number
  ) => {
    const list = [...data[type]];
    const currentRow = { ...list[index] };

    if (field === 'item') {
      const newItemStr = String(val);
      currentRow.item = newItemStr;

      if (isMinusItem(newItemStr)) {
        if (currentRow.amount !== 0) {
          currentRow.amount = -Math.abs(currentRow.amount);
        }
      } else if (isPlusItem(newItemStr)) {
        if (currentRow.amount !== 0) {
          currentRow.amount = Math.abs(currentRow.amount);
        }
      } else if (currentRow.amount < 0) {
        currentRow.amount = Math.abs(currentRow.amount);
      }
    } else if (field === 'amount') {
      let numVal = typeof val === 'number' ? val : (val === '' ? 0 : Number(val) || 0);
      if (isMinusItem(currentRow.item)) {
        numVal = numVal !== 0 ? -Math.abs(numVal) : 0;
      } else if (isPlusItem(currentRow.item)) {
        numVal = numVal !== 0 ? Math.abs(numVal) : 0;
      }
      currentRow.amount = numVal;
    } else {
      currentRow[field] = val as never;
    }

    list[index] = currentRow;
    onChange({ ...data, [type]: list });
  };

  const addExpenseRow = (type: 'expensesIn' | 'expensesOut') => {
    const newRow: ExpenseRow = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      item: '',
      amount: 0,
      staff: '',
    };
    onChange({ ...data, [type]: [...data[type], newRow] });
  };

  const removeExpenseRow = (type: 'expensesIn' | 'expensesOut', index: number) => {
    const list = data[type].filter((_, i) => i !== index);
    onChange({ ...data, [type]: list });
  };

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (amount < 0) return `-THB ${formatted}`;
    return `THB ${formatted}`;
  };

  const formatSignedCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (amount > 0) return `+THB ${formatted}`;
    if (amount < 0) return `-THB ${formatted}`;
    return `THB ${formatted}`;
  };

  const handleClearForNewShift = () => {
    // Determine previous balance carried forward from current shift close / Late shift
    let inheritedPrevBalance = 0;

    let nextShift = 'Early';
    if (data.shift === 'Early') nextShift = 'Late';
    else nextShift = 'Early';

    if (nextShift === 'Early') {
      // Switching to Early shift -> pull previous day's Late shift balance
      inheritedPrevBalance = getPreviousDayLateBalance(data.date, savedCashCounts) || (totalCashOut > 0 ? totalCashOut : totalCashIn);
    } else {
      // Switching to Late shift on same day -> pull Early shift total
      if (totalCashOut > 0) {
        inheritedPrevBalance = totalCashOut;
      } else if (totalCashIn > 0) {
        inheritedPrevBalance = totalCashIn;
      } else {
        inheritedPrevBalance = data.beerPrevBalance || 0;
      }
    }

    const formattedAmount = `THB ${inheritedPrevBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (
      window.confirm(
        `คุณต้องการล้างข้อมูลเพื่อรับกะใหม่ใช่หรือไม่?\n\n` +
        `• ยอด Previous balance ยกมาจากกะบ่าย/กะก่อนหน้า: ${formattedAmount}\n` +
        `• ปรับกะใหม่เป็น: ${nextShift}\n\n` +
        `(จำนวนนับเงิน รายการรับ-จ่าย และชื่อพนักงานจะถูกล้างเพื่อเริ่มนับกะใหม่)`
      )
    ) {
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

      const resetDenoms = data.denominations.map((d) => ({
        ...d,
        countIn: 0,
        countOut: 0,
      }));

      onChange({
        ...data,
        date: dateStr,
        shift: nextShift,
        denominations: resetDenoms,
        staffIn: '',
        staffOut: '',
        beerPrevBalance: inheritedPrevBalance,
        beerShiftDiff: 0,
        expensesIn: Array.from({ length: 6 }, (_, i) => ({
          id: `exp-in-${Date.now()}-${i + 1}`,
          item: '',
          amount: 0,
          staff: '',
        })),
        expensesOut: Array.from({ length: 6 }, (_, i) => ({
          id: `exp-out-${Date.now()}-${i + 1}`,
          item: '',
          amount: 0,
          staff: '',
        })),
        remarks: '',
      });
    }
  };

  const handleShiftDropdownChange = async (newShift: string) => {
    if (newShift === data.shift) return;

    // Auto-save current shift record to history before switching shift
    const currentToSave: CashCountData = {
      ...data,
      id: data.id || `cash-${Date.now()}`,
      createdAt: data.createdAt || Date.now(),
    };
    try {
      await saveCashCountToFirebase(currentToSave);
    } catch (e) {
      /* ignore */
    }

    // Check if an existing record for the new shift on the same date already exists in history
    const existingForNewShift = savedCashCounts?.find(
      (c) => c.date === data.date && c.shift === newShift
    );

    if (existingForNewShift) {
      onChange(existingForNewShift);
      return;
    }

    let inheritedPrevBalance = data.beerPrevBalance || 0;

    if (newShift === 'Early') {
      inheritedPrevBalance = getPreviousDayLateBalance(data.date, savedCashCounts) || (totalCashOut > 0 ? totalCashOut : totalCashIn);
    } else {
      if (totalCashOut > 0) {
        inheritedPrevBalance = totalCashOut;
      } else if (totalCashIn > 0) {
        inheritedPrevBalance = totalCashIn;
      } else {
        inheritedPrevBalance = getPreviousDayLateBalance(data.date, savedCashCounts) || (data.beerPrevBalance || 0);
      }
    }

    const resetDenoms = data.denominations.map((d) => ({
      ...d,
      countIn: 0,
      countOut: 0,
    }));

    const newShiftId = `cash-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    onChange({
      ...data,
      id: newShiftId,
      createdAt: Date.now(),
      shift: newShift,
      denominations: resetDenoms,
      staffIn: '',
      staffOut: '',
      beerPrevBalance: inheritedPrevBalance,
      beerShiftDiff: 0,
      expensesIn: [
        { id: `exp-in-${Date.now()}-1`, item: '', amount: 0, staff: '' },
        { id: `exp-in-${Date.now()}-2`, item: '', amount: 0, staff: '' },
      ],
      expensesOut: [
        { id: `exp-out-${Date.now()}-1`, item: '', amount: 0, staff: '' },
        { id: `exp-out-${Date.now()}-2`, item: '', amount: 0, staff: '' },
      ],
      remarks: '',
    });
  };

  const handleDateInputChange = (newDateIso: string) => {
    if (!newDateIso) {
      onChange({ ...data, date: '' });
      return;
    }
    const formattedDate = fromIsoDate(newDateIso);
    if (formattedDate === data.date) return;

    // 1. Check if a saved cash count record exists in savedCashCounts for this date and shift
    const existingForDateAndShift = savedCashCounts?.find(
      (c) => c.date === formattedDate && c.shift === data.shift
    );

    if (existingForDateAndShift) {
      onChange(existingForDateAndShift);
      return;
    }

    // 2. Check if any record exists for this date in general
    const existingForDateAnyShift = savedCashCounts?.find(
      (c) => c.date === formattedDate
    );

    if (existingForDateAnyShift) {
      onChange(existingForDateAnyShift);
      return;
    }

    // 3. Reset sheet for the new date cleanly and auto-fetch previous day's late shift balance
    const resetDenoms = data.denominations.map((d) => ({
      ...d,
      countIn: 0,
      countOut: 0,
    }));

    const prevBalanceForNewDate = getPreviousDayLateBalance(formattedDate, savedCashCounts || []);

    onChange({
      ...data,
      id: `cash-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      date: formattedDate,
      beerPrevBalance: prevBalanceForNewDate,
      denominations: resetDenoms,
      staffIn: '',
      staffOut: '',
      expensesIn: [
        { id: `exp-in-${Date.now()}-1`, item: '', amount: 0, staff: '' },
        { id: `exp-in-${Date.now()}-2`, item: '', amount: 0, staff: '' },
      ],
      expensesOut: [
        { id: `exp-out-${Date.now()}-1`, item: '', amount: 0, staff: '' },
        { id: `exp-out-${Date.now()}-2`, item: '', amount: 0, staff: '' },
      ],
      remarks: '',
    });
  };

  const handleSetTodayDate = () => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`;
    onChange({ ...data, date: dateStr });
  };

  return (
    <div className="w-full space-y-4">
      {/* Printable Sheet Container */}
      <div
        id="cash-count-document"
        className="bg-white p-6 md:p-8 rounded-xl border border-slate-300 shadow-md font-sans text-slate-900 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 print:pb-2 print:mb-2 border-b border-slate-300">
          <div className="flex items-center gap-3 md:gap-4">
            <NanSeasonsLogo className="h-20 print:h-14" />
            <div className="border-l border-slate-300 pl-3 md:pl-4 py-1">
              <h2 className="text-xl md:text-2xl print:text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                Cash Count Sheet
              </h2>
              <p className="text-xs md:text-sm font-bold text-slate-600 mt-1 print:text-xs">
                ตารางนับเงินสดเข้า-ออกประจำกะ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-800 text-base md:text-lg">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold">Shift:</span>
              <select
                value={data.shift === 'Night' ? 'Early' : data.shift}
                onChange={(e) => handleShiftDropdownChange(e.target.value)}
                className="no-print border border-slate-300 rounded px-2.5 py-1 text-sm bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="Early">Early (กะเช้า)</option>
                <option value="Late">Late (กะบ่าย)</option>
              </select>
              <span className="hidden print:inline font-bold underline px-2 text-sm">{data.shift}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold">Date:</span>
              <div className="relative flex items-center no-print">
                <Calendar className="w-4 h-4 text-orange-600 absolute left-2 pointer-events-none" />
                <input
                  type="date"
                  value={toIsoDate(data.date)}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  className="border border-slate-300 rounded pl-8 pr-2 py-1 text-sm bg-slate-50 font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                />
              </div>
              <span className="hidden print:inline font-bold underline px-1 text-sm">{data.date}</span>
            </div>
          </div>
        </div>

        {/* Staff Information Bar (Required fields for IN and OUT) */}
        <div className="mb-4 print:mb-2 bg-slate-50 border border-slate-300 p-3.5 print:p-2 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
          {/* Staff IN (นับเงินเข้า) */}
          <div className="flex flex-col gap-1.5 print:gap-0.5">
            <label className="text-xs md:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                ชื่อพนักงานนับเงินเข้า (Staff IN): <span className="text-red-500 font-extrabold text-sm">*</span>
              </span>
              {!data.staffIn?.trim() ? (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded no-print">
                  จำเป็นต้องระบุ
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded no-print">
                  ระบุแล้ว
                </span>
              )}
            </label>
            <StaffSelect
              value={data.staffIn || ''}
              onChange={(val) => onChange({ ...data, staffIn: val })}
              placeholder="เลือกชื่อพนักงานนับเงินเข้า"
              hasError={!data.staffIn?.trim()}
              size="md"
              onOpenManageStaff={onOpenManageStaff}
            />
            <span className="hidden print:inline font-bold underline text-sm">{data.staffIn || '-'}</span>

            {/* E-Signature Staff IN */}
            <div className="mt-1 pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">ลายเซ็น Staff IN:</span>
              {data.staffInSignature ? (
                <div className="flex items-center gap-2">
                  <img src={data.staffInSignature} alt="Staff IN Signature" className="h-7 max-w-[120px] object-contain bg-white rounded border border-slate-200 p-0.5" />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, staffInSignature: null })}
                    className="no-print text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    ลบ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSigModal('staffIn')}
                  className="no-print inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <PenTool className="w-3 h-3" />
                  เซ็นชื่อดิจิทัล
                </button>
              )}
            </div>
          </div>

          {/* Staff OUT (นับเงินออกเมื่อเลิกงาน) */}
          <div className="flex flex-col gap-1.5 print:gap-0.5">
            <label className="text-xs md:text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                ชื่อพนักงานนับเงินออกเมื่อเลิกงาน (Staff OUT): <span className="text-red-500 font-extrabold text-sm">*</span>
              </span>
              {!data.staffOut?.trim() ? (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded no-print">
                  จำเป็นต้องระบุ
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded no-print">
                  ระบุแล้ว
                </span>
              )}
            </label>
            <StaffSelect
              value={data.staffOut || ''}
              onChange={(val) => onChange({ ...data, staffOut: val })}
              placeholder="เลือกชื่อพนักงานนับเงินออก"
              hasError={!data.staffOut?.trim()}
              size="md"
              onOpenManageStaff={onOpenManageStaff}
            />
            <span className="hidden print:inline font-bold underline text-sm">{data.staffOut || '-'}</span>

            {/* E-Signature Staff OUT */}
            <div className="mt-1 pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600">ลายเซ็น Staff OUT:</span>
              {data.staffOutSignature ? (
                <div className="flex items-center gap-2">
                  <img src={data.staffOutSignature} alt="Staff OUT Signature" className="h-7 max-w-[120px] object-contain bg-white rounded border border-slate-200 p-0.5" />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, staffOutSignature: null })}
                    className="no-print text-[10px] font-bold text-rose-600 hover:underline"
                  >
                    ลบ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSigModal('staffOut')}
                  className="no-print inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <PenTool className="w-3 h-3" />
                  เซ็นชื่อดิจิทัล
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Signature Modals for Cash Count */}
        <SignatureModal
          isOpen={activeSigModal === 'staffIn'}
          onClose={() => setActiveSigModal(null)}
          onSave={(sigUrl) => onChange({ ...data, staffInSignature: sigUrl })}
          title="เซ็นชื่อพนักงานนับเงินเข้า (Staff IN E-Signature)"
          signerName={data.staffIn}
          initialSignature={data.staffInSignature}
        />

        <SignatureModal
          isOpen={activeSigModal === 'staffOut'}
          onClose={() => setActiveSigModal(null)}
          onSave={(sigUrl) => onChange({ ...data, staffOutSignature: sigUrl })}
          title="เซ็นชื่อพนักงานนับเงินออก (Staff OUT E-Signature)"
          signerName={data.staffOut}
          initialSignature={data.staffOutSignature}
        />

        {/* Cash Count Main Grid - Separated into 2 distinct tables for IN and OUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
          {/* LEFT TABLE: IN Section */}
          <div className="border border-slate-800 rounded-lg overflow-hidden shadow-xs flex flex-col h-full">
            <table className="w-full h-full border-collapse text-xs md:text-sm print:text-xs">
              <thead>
                <tr className="bg-slate-700 text-white font-bold text-center">
                  <th className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">IN</th>
                  <th className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">Count</th>
                  <th className="border-b border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">฿ Worth</th>
                </tr>
              </thead>
              <tbody>
                {data.denominations.map((denom, idx) => {
                  const worthIn = denom.value * (denom.countIn || 0);
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-slate-100';

                  return (
                    <tr key={`in-${denom.value}`} className={`${rowBg} hover:bg-slate-200/50 transition-colors`}>
                      {/* IN Label */}
                      <td className="border-b border-r border-slate-400 px-3 py-1.5 print:px-2 print:py-1 font-bold text-slate-800 text-center text-xs md:text-sm print:text-xs">
                        {denom.label}
                      </td>

                      {/* IN Count Input */}
                      <td className="border-b border-r border-slate-400 px-2 py-1 print:px-2 print:py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          value={denom.countIn === 0 ? '' : denom.countIn}
                          onChange={(e) => handleDenominationChange(idx, 'countIn', e.target.value)}
                          placeholder="0"
                          className="w-full text-center bg-sky-50 focus:bg-white font-bold text-slate-900 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded py-1 text-xs md:text-sm outline-none no-print"
                        />
                        <span className="hidden print:inline font-bold text-xs md:text-sm print:text-xs">{denom.countIn || 0}</span>
                      </td>

                      {/* IN Worth */}
                      <td className="border-b border-slate-400 px-3 py-1.5 print:px-2 print:py-1 font-bold text-slate-900 text-right font-mono text-xs md:text-sm print:text-xs">
                        {formatCurrency(worthIn)}
                      </td>
                    </tr>
                  );
                })}

                {/* Cash Drawer Balance */}
                <tr className="bg-[#55ff33] text-black font-extrabold border-t border-slate-800">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Cash Drawer Balance</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-slate-900">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 text-right px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    {formatCurrency(totalCashIn)}
                  </td>
                </tr>

                {/* Previous balance */}
                <tr className="bg-[#00aaff] text-black font-extrabold">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Previous balance</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-slate-900">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    <div className="flex items-center justify-end gap-1.5 no-print">
                      <button
                        type="button"
                        onClick={handlePullPrevDayLateBalance}
                        title="ดึงยอด Previous Balance จากกะบ่ายของวันก่อนหน้านี้อัตโนมัติ"
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] md:text-xs font-bold text-blue-950 bg-white/90 hover:bg-white border border-blue-600/50 hover:border-blue-700 rounded shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-700" />
                        <span>ดึงยอดกะบ่ายวันก่อน</span>
                      </button>
                      <input
                        type="number"
                        value={data.beerPrevBalance || ''}
                        onChange={(e) => onChange({ ...data, beerPrevBalance: Number(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="w-24 text-right bg-white/90 font-mono font-bold text-slate-900 border border-blue-400 rounded px-1.5 py-0.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs md:text-sm"
                      />
                    </div>
                    <span className="hidden print:inline font-mono font-bold text-right block print:text-xs">{formatCurrency(data.beerPrevBalance)}</span>
                  </td>
                </tr>

                {/* Different */}
                <tr className="bg-[#ff0000] text-white font-extrabold">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Different</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-white">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 text-right px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    {formatSignedCurrency(redInDiff)}
                  </td>
                </tr>

                {/* Final */}
                <tr className="bg-[#8B4513] text-white font-extrabold">
                  <td colSpan={2} className="border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Final</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-white">THB</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2 print:px-2 print:py-1 text-sm md:text-base print:text-sm font-mono font-extrabold tracking-wider">
                    {formatSignedCurrency(finalIn)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT TABLE: OUT Section */}
          <div className="border border-slate-800 rounded-lg overflow-hidden shadow-xs flex flex-col h-full">
            <table className="w-full h-full border-collapse text-xs md:text-sm print:text-xs">
              <thead>
                <tr className="bg-slate-700 text-white font-bold text-center">
                  <th className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">OUT</th>
                  <th className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">Count</th>
                  <th className="border-b border-slate-800 px-3 py-2 print:px-2 print:py-1 w-1/3 text-xs md:text-sm print:text-xs uppercase tracking-wider font-extrabold">฿ Worth</th>
                </tr>
              </thead>
              <tbody>
                {data.denominations.map((denom, idx) => {
                  const worthOut = denom.value * (denom.countOut || 0);
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-slate-100';

                  return (
                    <tr key={`out-${denom.value}`} className={`${rowBg} hover:bg-slate-200/50 transition-colors`}>
                      {/* OUT Label */}
                      <td className="border-b border-r border-slate-400 px-3 py-1.5 print:px-2 print:py-1 font-bold text-slate-800 text-center text-xs md:text-sm print:text-xs">
                        {denom.label}
                      </td>

                      {/* OUT Count Input */}
                      <td className="border-b border-r border-slate-400 px-2 py-1 print:px-2 print:py-1 text-center">
                        <input
                          type="number"
                          min="0"
                          value={denom.countOut === 0 ? '' : denom.countOut}
                          onChange={(e) => handleDenominationChange(idx, 'countOut', e.target.value)}
                          placeholder="0"
                          className="w-full text-center bg-sky-50 focus:bg-white font-bold text-slate-900 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded py-1 text-xs md:text-sm outline-none no-print"
                        />
                        <span className="hidden print:inline font-bold text-xs md:text-sm print:text-xs">{denom.countOut || 0}</span>
                      </td>

                      {/* OUT Worth */}
                      <td className="border-b border-slate-400 px-3 py-1.5 print:px-2 print:py-1 font-bold text-slate-900 text-right font-mono text-xs md:text-sm print:text-xs">
                        {formatCurrency(worthOut)}
                      </td>
                    </tr>
                  );
                })}

                {/* Cash Drawer Balance */}
                <tr className="bg-[#55ff33] text-black font-extrabold border-t border-slate-800">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Cash Drawer Balance</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-slate-900">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 text-right px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    {formatCurrency(totalCashOut)}
                  </td>
                </tr>

                {/* Previous balance */}
                <tr className="bg-[#00aaff] text-black font-extrabold">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Previous balance</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-slate-900">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 text-right px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    <div className="flex items-center justify-end gap-1 no-print min-h-[28px]">
                      <span>{formatCurrency(prevBalanceOut)}</span>
                    </div>
                    <span className="hidden print:inline font-mono font-bold text-right block print:text-xs">{formatCurrency(prevBalanceOut)}</span>
                  </td>
                </tr>

                {/* Different */}
                <tr className="bg-[#ff0000] text-white font-extrabold">
                  <td colSpan={2} className="border-b border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Different</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-white">THB</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-800 text-right px-3 py-2 print:px-2 print:py-1 text-xs md:text-sm print:text-xs font-mono font-bold">
                    {formatSignedCurrency(redOutDiff)}
                  </td>
                </tr>

                {/* Final */}
                <tr className="bg-[#8B4513] text-white font-extrabold">
                  <td colSpan={2} className="border-r border-slate-800 px-3 py-2 print:px-2 print:py-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs md:text-sm print:text-xs font-extrabold uppercase tracking-wider">Final</span>
                      <span className="text-xs md:text-sm print:text-xs font-bold text-white">THB</span>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2 print:px-2 print:py-1 text-sm md:text-base print:text-sm font-mono font-extrabold tracking-wider">
                    {formatSignedCurrency(finalOut)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Section (Side-by-side tables) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-3 mt-4 print:mt-2">
          {/* Expenses & Incomes IN */}
          <div className="border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between bg-[#ffff00] px-3 py-2 print:py-1 border-b border-slate-800">
                <span className="font-extrabold text-slate-900 text-sm md:text-base print:text-xs">Expenses & Incomes IN</span>
                <div className="flex items-center gap-1.5 no-print">
                  {onOpenManageCategories && (
                    <button
                      type="button"
                      onClick={onOpenManageCategories}
                      className="text-[11px] font-bold text-slate-700 hover:text-orange-600 bg-white/80 hover:bg-white px-2 py-1 rounded border border-slate-300 transition-colors"
                      title="จัดการ/แก้ไข/ลบ หัวข้อรายการ"
                    >
                      ⚙️ จัดการหัวข้อ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addExpenseRow('expensesIn')}
                    className="inline-flex items-center gap-1 text-xs font-bold bg-white text-slate-800 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                  </button>
                </div>
              </div>

              <table className="w-full text-xs md:text-sm print:text-xs border-collapse">
                <thead>
                  <tr className="bg-[#ffffaa] border-b border-slate-800 text-slate-900 font-bold">
                    <th className="border-r border-slate-800 px-2 py-1.5 print:py-1 text-left w-[42%] text-xs md:text-sm print:text-xs">Items:</th>
                    <th className="border-r border-slate-800 px-2 py-1.5 print:py-1 text-right w-[28%] text-xs md:text-sm print:text-xs">฿ Amount:</th>
                    <th className="px-2 py-1.5 print:py-1 text-left w-[30%] text-xs md:text-sm print:text-xs">Staff:</th>
                    <th className="no-print w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.expensesIn.map((exp, idx) => (
                    <tr key={exp.id || idx} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="border-r border-slate-300 p-1">
                        <ExpenseCategorySelect
                          value={exp.item}
                          onChange={(val) => handleExpenseChange('expensesIn', idx, 'item', val)}
                          placeholder="เลือก/ใส่หัวข้อ"
                          onOpenManageCategories={onOpenManageCategories}
                        />
                        <span className="hidden print:inline font-semibold text-xs md:text-sm print:text-xs px-1">{exp.item}</span>
                      </td>
                      <td className="border-r border-slate-300 p-1">
                        <input
                          type="number"
                          value={exp.amount === 0 ? '' : exp.amount}
                          onChange={(e) => handleExpenseChange('expensesIn', idx, 'amount', e.target.value)}
                          placeholder="0.00"
                          className={`w-full text-right border border-slate-200 rounded px-1.5 py-1 text-xs md:text-sm font-mono font-semibold focus:outline-none no-print ${
                            exp.amount < 0 ? 'text-red-600 font-bold bg-red-50/50 border-red-200' : exp.amount > 0 ? 'text-emerald-700 font-bold' : ''
                          }`}
                        />
                        <span className="hidden print:inline font-mono font-bold text-xs md:text-sm print:text-xs px-1">{formatCurrency(exp.amount)}</span>
                      </td>
                      <td className="p-1">
                        <StaffSelect
                          value={exp.staff}
                          onChange={(val) => handleExpenseChange('expensesIn', idx, 'staff', val)}
                          placeholder="ผู้รับ"
                          size="sm"
                          onOpenManageStaff={onOpenManageStaff}
                        />
                        <span className="hidden print:inline font-semibold text-xs md:text-sm print:text-xs px-1">{exp.staff}</span>
                      </td>
                      <td className="no-print p-0.5 text-center">
                        {data.expensesIn.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExpenseRow('expensesIn', idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="ลบแถว"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <table className="w-full text-xs md:text-sm print:text-xs border-collapse">
              <tfoot>
                <tr className="bg-[#ffff00] font-extrabold text-slate-900 border-t border-slate-800">
                  <td className="px-2.5 py-2 print:py-1 border-r border-slate-800 text-right text-xs md:text-sm print:text-xs whitespace-nowrap font-extrabold">
                    รวม Expenses & Incomes IN:
                  </td>
                  <td className="px-2.5 py-2 print:py-1 text-right font-mono text-xs md:text-sm print:text-xs font-extrabold whitespace-nowrap" colSpan={3}>
                    {formatCurrency(totalExpensesIn)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses & Incomes OUT */}
          <div className="border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between bg-[#ffff00] px-3 py-2 print:py-1 border-b border-slate-800">
                <span className="font-extrabold text-slate-900 text-sm md:text-base print:text-xs">Expenses & Incomes OUT</span>
                <div className="flex items-center gap-1.5 no-print">
                  {onOpenManageCategories && (
                    <button
                      type="button"
                      onClick={onOpenManageCategories}
                      className="text-[11px] font-bold text-slate-700 hover:text-orange-600 bg-white/80 hover:bg-white px-2 py-1 rounded border border-slate-300 transition-colors"
                      title="จัดการ/แก้ไข/ลบ หัวข้อรายการ"
                    >
                      ⚙️ จัดการหัวข้อ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addExpenseRow('expensesOut')}
                    className="inline-flex items-center gap-1 text-xs font-bold bg-white text-slate-800 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
                  </button>
                </div>
              </div>

              <table className="w-full text-xs md:text-sm print:text-xs border-collapse">
                <thead>
                  <tr className="bg-[#ffffaa] border-b border-slate-800 text-slate-900 font-bold">
                    <th className="border-r border-slate-800 px-2 py-1.5 print:py-1 text-left w-[42%] text-xs md:text-sm print:text-xs">Items:</th>
                    <th className="border-r border-slate-800 px-2 py-1.5 print:py-1 text-right w-[28%] text-xs md:text-sm print:text-xs">฿ Amount:</th>
                    <th className="px-2 py-1.5 print:py-1 text-left w-[30%] text-xs md:text-sm print:text-xs">Staff:</th>
                    <th className="no-print w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.expensesOut.map((exp, idx) => (
                    <tr key={exp.id || idx} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="border-r border-slate-300 p-1">
                        <ExpenseCategorySelect
                          value={exp.item}
                          onChange={(val) => handleExpenseChange('expensesOut', idx, 'item', val)}
                          placeholder="เลือก/ใส่หัวข้อ"
                          onOpenManageCategories={onOpenManageCategories}
                        />
                        <span className="hidden print:inline font-semibold text-xs md:text-sm print:text-xs px-1">{exp.item}</span>
                      </td>
                      <td className="border-r border-slate-300 p-1">
                        <input
                          type="number"
                          value={exp.amount === 0 ? '' : exp.amount}
                          onChange={(e) => handleExpenseChange('expensesOut', idx, 'amount', e.target.value)}
                          placeholder="0.00"
                          className={`w-full text-right border border-slate-200 rounded px-1.5 py-1 text-xs md:text-sm font-mono font-semibold focus:outline-none no-print ${
                            exp.amount < 0 ? 'text-red-600 font-bold bg-red-50/50 border-red-200' : exp.amount > 0 ? 'text-emerald-700 font-bold' : ''
                          }`}
                        />
                        <span className="hidden print:inline font-mono font-bold text-xs md:text-sm print:text-xs px-1">{formatCurrency(exp.amount)}</span>
                      </td>
                      <td className="p-1">
                        <StaffSelect
                          value={exp.staff}
                          onChange={(val) => handleExpenseChange('expensesOut', idx, 'staff', val)}
                          placeholder="ผู้จ่าย"
                          size="sm"
                          onOpenManageStaff={onOpenManageStaff}
                        />
                        <span className="hidden print:inline font-semibold text-xs md:text-sm print:text-xs px-1">{exp.staff}</span>
                      </td>
                      <td className="no-print p-0.5 text-center">
                        {data.expensesOut.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExpenseRow('expensesOut', idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="ลบแถว"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <table className="w-full text-xs md:text-sm print:text-xs border-collapse">
              <tfoot>
                <tr className="bg-[#ffff00] font-extrabold text-slate-900 border-t border-slate-800">
                  <td className="px-2.5 py-2 print:py-1 border-r border-slate-800 text-right text-xs md:text-sm print:text-xs whitespace-nowrap font-extrabold">
                    รวม Expenses & Incomes OUT:
                  </td>
                  <td className="px-2.5 py-2 print:py-1 text-right font-mono text-xs md:text-sm print:text-xs font-extrabold whitespace-nowrap" colSpan={3}>
                    {formatCurrency(totalExpensesOut)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Remarks Box */}
        <div className="mt-4 print:mt-2 border border-slate-400 rounded-lg p-3 print:p-2 bg-slate-50">
          <label className="block text-xs md:text-sm font-bold text-slate-800 mb-1">หมายเหตุ:</label>
          <textarea
            value={data.remarks}
            onChange={(e) => onChange({ ...data, remarks: e.target.value })}
            placeholder="บันทึกเพิ่มเติมเกี่ยวกับกะ ยอดเงินเกิน/ขาด หรือหมายเหตุอื่นๆ..."
            rows={2}
            className="w-full bg-white border border-slate-300 rounded p-2 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 no-print"
          />
          <p className="hidden print:block text-xs md:text-sm text-slate-800 whitespace-pre-wrap font-medium">
            {data.remarks || '-'}
          </p>
        </div>

        {/* Document Signatures Footer Block */}
        <div className="mt-4 print:mt-3 grid grid-cols-2 md:grid-cols-2 gap-4 border-t-2 border-slate-800 pt-3 print:pt-2">
          {/* Staff IN Signature Block */}
          <div className="flex flex-col items-center justify-between border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 print:bg-transparent">
            <div className="text-center w-full">
              <span className="text-xs font-bold text-slate-800">ผู้ส่งมอบกะ / นับเงินเข้า (Staff IN)</span>
            </div>

            <div className="my-1.5 min-h-[48px] flex items-center justify-center w-full">
              {data.staffInSignature ? (
                <div className="relative group flex flex-col items-center">
                  <img
                    src={data.staffInSignature}
                    alt="Staff IN Signature"
                    className="max-h-12 max-w-[160px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, staffInSignature: null })}
                    className="no-print text-[10px] font-bold text-rose-600 hover:underline mt-0.5"
                  >
                    ลบลายเซ็น
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSigModal('staffIn')}
                  className="no-print inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  เซ็นชื่อ Staff IN
                </button>
              )}
            </div>

            <div className="text-center w-full border-t border-slate-300 pt-1">
              <p className="text-xs font-bold text-slate-900">
                ({data.staffIn || '...........................................'})
              </p>
              <p className="text-[10px] text-slate-500 print:text-slate-700 font-medium">พนักงานนับเงินเข้า</p>
            </div>
          </div>

          {/* Staff OUT Signature Block */}
          <div className="flex flex-col items-center justify-between border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 print:bg-transparent">
            <div className="text-center w-full">
              <span className="text-xs font-bold text-slate-800">ผู้รับมอบกะ / นับเงินออก (Staff OUT)</span>
            </div>

            <div className="my-1.5 min-h-[48px] flex items-center justify-center w-full">
              {data.staffOutSignature ? (
                <div className="relative group flex flex-col items-center">
                  <img
                    src={data.staffOutSignature}
                    alt="Staff OUT Signature"
                    className="max-h-12 max-w-[160px] object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ ...data, staffOutSignature: null })}
                    className="no-print text-[10px] font-bold text-rose-600 hover:underline mt-0.5"
                  >
                    ลบลายเซ็น
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveSigModal('staffOut')}
                  className="no-print inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  เซ็นชื่อ Staff OUT
                </button>
              )}
            </div>

            <div className="text-center w-full border-t border-slate-300 pt-1">
              <p className="text-xs font-bold text-slate-900">
                ({data.staffOut || '...........................................'})
              </p>
              <p className="text-[10px] text-slate-500 print:text-slate-700 font-medium">พนักงานนับเงินออกเมื่อเลิกงาน</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
