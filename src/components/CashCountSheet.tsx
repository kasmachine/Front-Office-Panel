import React, { useEffect } from 'react';
import { CashCountData, ExpenseRow } from '../types';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { Plus, Trash2, RotateCcw, Sparkles, Calendar } from 'lucide-react';

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
    const year = parts[0].slice(-2);
    const month = parts[1];
    const day = parts[2];
    return `${day}/${month}/${year}`;
  }
  return isoStr;
}
import { StaffSelect } from './StaffSelect';
import { ExpenseCategorySelect } from './ExpenseCategorySelect';

interface CashCountSheetProps {
  data: CashCountData;
  onChange: (newData: CashCountData) => void;
  onReset: () => void;
  savedCashCounts?: CashCountData[];
}

export const CashCountSheet: React.FC<CashCountSheetProps> = ({ data, onChange, onReset, savedCashCounts = [] }) => {
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

  useEffect(() => {
    if (data.beerShiftDiff !== calculatedBeerShiftDiff) {
      onChange({ ...data, beerShiftDiff: calculatedBeerShiftDiff });
    }
  }, [calculatedBeerShiftDiff, data.beerShiftDiff]);

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
    list[index] = { ...list[index], [field]: val };
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
    return `THB ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatSignedCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (amount > 0) return `+THB ${formatted}`;
    if (amount < 0) return `-THB ${formatted}`;
    return `THB ${formatted}`;
  };

  const fillSampleData = () => {
    const sampleDenoms = data.denominations.map(d => {
      if (d.value === 1000) return { ...d, countIn: 15, countOut: 18 };
      if (d.value === 500) return { ...d, countIn: 8, countOut: 10 };
      if (d.value === 100) return { ...d, countIn: 25, countOut: 20 };
      if (d.value === 50) return { ...d, countIn: 12, countOut: 15 };
      if (d.value === 20) return { ...d, countIn: 30, countOut: 35 };
      if (d.value === 10) return { ...d, countIn: 15, countOut: 10 };
      if (d.value === 5) return { ...d, countIn: 10, countOut: 5 };
      return { ...d, countIn: 5, countOut: 5 };
    });

    onChange({
      ...data,
      shift: 'Early',
      denominations: sampleDenoms,
      staffIn: 'สมชาย (กะเช้า)',
      staffOut: 'ขวัญทิชา (กะบ่าย)',
      beerPrevBalance: 1200,
      beerShiftDiff: 0,
      expensesIn: [
        { id: '1', item: 'รับเงินทอนย่อย', amount: 500, staff: 'สมชาย' },
        { id: '2', item: 'เงินโอนมัดจำห้องพัก', amount: 1500, staff: 'สมชาย' },
      ],
      expensesOut: [
        { id: '1', item: 'ปากกาไฮไลท์ & สมุด', amount: 185, staff: 'ขวัญทิชา' },
        { id: '2', item: 'ค่าน้ำดื่มพนักงาน', amount: 240, staff: 'ขวัญทิชา' },
      ],
      remarks: 'นับยอดเงินกะเช้าถูกต้องเรียบร้อย ยอดเบียร์คงเหลือตรงตามสต็อก',
    });
  };

  const handleClearForNewShift = () => {
    // Determine previous balance carried forward from current shift close / Late shift
    let inheritedPrevBalance = 0;

    if (totalCashOut > 0) {
      inheritedPrevBalance = totalCashOut;
    } else if (totalCashIn > 0) {
      inheritedPrevBalance = totalCashIn;
    } else if (savedCashCounts && savedCashCounts.length > 0) {
      const lateRecord = savedCashCounts.find((c) => c.shift === 'Late') || savedCashCounts[0];
      if (lateRecord) {
        const lateOut = lateRecord.denominations.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0);
        const lateIn = lateRecord.denominations.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0);
        inheritedPrevBalance = lateOut > 0 ? lateOut : (lateIn > 0 ? lateIn : (lateRecord.beerPrevBalance || 0));
      } else {
        inheritedPrevBalance = data.beerPrevBalance || 0;
      }
    } else {
      inheritedPrevBalance = data.beerPrevBalance || 0;
    }

    let nextShift = 'Early';
    if (data.shift === 'Early') nextShift = 'Late';
    else if (data.shift === 'Late') nextShift = 'Night';
    else if (data.shift === 'Night') nextShift = 'Early';

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
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear().toString().slice(-2)}`;

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
    }
  };

  const handleShiftDropdownChange = (newShift: string) => {
    if (newShift === data.shift) return;

    let inheritedPrevBalance = data.beerPrevBalance || 0;

    if (totalCashOut > 0) {
      inheritedPrevBalance = totalCashOut;
    } else if (totalCashIn > 0) {
      inheritedPrevBalance = totalCashIn;
    } else if (savedCashCounts && savedCashCounts.length > 0) {
      const lateRecord = savedCashCounts.find((c) => c.shift === 'Late') || savedCashCounts[0];
      if (lateRecord) {
        const lateOut = lateRecord.denominations.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0);
        const lateIn = lateRecord.denominations.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0);
        inheritedPrevBalance = lateOut > 0 ? lateOut : (lateIn > 0 ? lateIn : (lateRecord.beerPrevBalance || 0));
      }
    }

    const resetDenoms = data.denominations.map((d) => ({
      ...d,
      countIn: 0,
      countOut: 0,
    }));

    onChange({
      ...data,
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

  return (
    <div className="w-full space-y-4">
      {/* Control Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">เครื่องมือตารางนับเงิน:</span>
          <button
            type="button"
            onClick={handleClearForNewShift}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-xs border border-orange-600 rounded-lg transition-all transform active:scale-95"
            title="ล้างข้อมูลทั้งหมดสำหรับรับกะใหม่ โดยยกยอดเงิน Previous balance จากยอดเงินสุทธิกะบ่าย/กะเดิม"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white" />
            ล้างข้อมูลเพื่อรับกะใหม่ (Clear for New Shift)
          </button>
          <button
            type="button"
            onClick={fillSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            เติมข้อมูลตัวอย่าง (Sample)
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="ล้างข้อมูลทั้งหมดรวมถึง Previous balance"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            ล้างข้อมูลทั้งหมด
          </button>
        </div>

        <div className="text-xs text-slate-500 italic">
          * ระบบคำนวณยอดเงินรวม สรุปกะ และยอดต่างอัตโนมัติ
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div
        id="cash-count-document"
        className="bg-white p-6 md:p-8 rounded-xl border border-slate-300 shadow-md font-sans text-slate-900 max-w-5xl mx-auto print:shadow-none print:border-none print:p-0"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-300">
          <NanSeasonsLogo className="h-24" />

          <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-800 text-base md:text-lg">
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold">Shift:</span>
              <select
                value={data.shift}
                onChange={(e) => handleShiftDropdownChange(e.target.value)}
                className="no-print border border-slate-300 rounded px-2.5 py-1 text-sm bg-slate-50 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="Early">Early (กะเช้า)</option>
                <option value="Late">Late (กะบ่าย)</option>
                <option value="Night">Night (กะดึก)</option>
              </select>
              <span className="hidden print:inline font-bold underline px-2">{data.shift}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-bold">Date:</span>
              <div className="relative flex items-center no-print">
                <Calendar className="w-4 h-4 text-orange-600 absolute left-2 pointer-events-none" />
                <input
                  type="date"
                  value={toIsoDate(data.date)}
                  onChange={(e) => {
                    if (e.target.value) {
                      onChange({ ...data, date: fromIsoDate(e.target.value) });
                    } else {
                      onChange({ ...data, date: '' });
                    }
                  }}
                  className="border border-slate-300 rounded pl-8 pr-2 py-1 text-sm bg-slate-50 font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                />
              </div>
              <span className="hidden print:inline font-bold underline px-1">{data.date}</span>
            </div>
          </div>
        </div>

        {/* Staff Information Bar (Required fields for IN and OUT) */}
        <div className="mb-4 bg-slate-50 border border-slate-300 p-3.5 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staff IN (นับเงินเข้า) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                ชื่อพนักงานนับเงินเข้า (Staff IN): <span className="text-red-500 font-extrabold text-sm">*</span>
              </span>
              {!data.staffIn?.trim() ? (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  จำเป็นต้องระบุ
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
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
            />
            <span className="hidden print:inline font-bold underline text-sm">{data.staffIn || '-'}</span>
          </div>

          {/* Staff OUT (นับเงินออกเมื่อเลิกงาน) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                ชื่อพนักงานนับเงินออกเมื่อเลิกงาน (Staff OUT): <span className="text-red-500 font-extrabold text-sm">*</span>
              </span>
              {!data.staffOut?.trim() ? (
                <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  จำเป็นต้องระบุ
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
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
            />
            <span className="hidden print:inline font-bold underline text-sm">{data.staffOut || '-'}</span>
          </div>
        </div>

        {/* Cash Count Main Grid (Exact replica of Numbers template) */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-800 text-sm">
            <thead>
              <tr className="bg-slate-700 text-white font-bold text-center">
                <th className="border border-slate-800 px-3 py-2 w-1/6">IN</th>
                <th className="border border-slate-800 px-3 py-2 w-1/6">Count</th>
                <th className="border border-slate-800 px-3 py-2 w-1/6">฿ Worth</th>
                <th className="border border-slate-800 px-3 py-2 w-1/6">OUT</th>
                <th className="border border-slate-800 px-3 py-2 w-1/6">Count</th>
                <th className="border border-slate-800 px-3 py-2 w-1/6">฿ Worth</th>
              </tr>
            </thead>
            <tbody>
              {data.denominations.map((denom, idx) => {
                const worthIn = denom.value * (denom.countIn || 0);
                const worthOut = denom.value * (denom.countOut || 0);
                const isEven = idx % 2 === 0;
                const rowBg = isEven ? 'bg-white' : 'bg-slate-100';

                return (
                  <tr key={denom.value} className={`${rowBg} hover:bg-slate-200/50 transition-colors`}>
                    {/* IN Label */}
                    <td className="border border-slate-400 px-3 py-1.5 font-medium text-slate-800 text-center">
                      {denom.label}
                    </td>

                    {/* IN Count Input */}
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        value={denom.countIn === 0 ? '' : denom.countIn}
                        onChange={(e) => handleDenominationChange(idx, 'countIn', e.target.value)}
                        placeholder="0"
                        className="w-full text-center bg-sky-50 focus:bg-white font-semibold text-slate-900 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded py-0.5 outline-none no-print"
                      />
                      <span className="hidden print:inline font-bold">{denom.countIn || 0}</span>
                    </td>

                    {/* IN Worth */}
                    <td className="border border-slate-400 px-3 py-1.5 font-medium text-slate-900 text-right font-mono">
                      {formatCurrency(worthIn)}
                    </td>

                    {/* OUT Label */}
                    <td className="border border-slate-400 px-3 py-1.5 font-medium text-slate-800 text-center">
                      {denom.label}
                    </td>

                    {/* OUT Count Input */}
                    <td className="border border-slate-400 px-2 py-1 text-center">
                      <input
                        type="number"
                        min="0"
                        value={denom.countOut === 0 ? '' : denom.countOut}
                        onChange={(e) => handleDenominationChange(idx, 'countOut', e.target.value)}
                        placeholder="0"
                        className="w-full text-center bg-sky-50 focus:bg-white font-semibold text-slate-900 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded py-0.5 outline-none no-print"
                      />
                      <span className="hidden print:inline font-bold">{denom.countOut || 0}</span>
                    </td>

                    {/* OUT Worth */}
                    <td className="border border-slate-400 px-3 py-1.5 font-medium text-slate-900 text-right font-mono">
                      {formatCurrency(worthOut)}
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal Green Highlight Bar */}
              <tr>
                <td colSpan={2} className="border border-slate-800 bg-[#55ff33] text-black font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Cash Drawer Balance</span>
                    <span className="text-xs font-bold text-slate-900">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#55ff33] text-black font-extrabold text-right px-3 py-2.5 text-base font-mono">
                  {formatCurrency(totalCashIn)}
                </td>
                <td colSpan={2} className="border border-slate-800 bg-[#55ff33] text-black font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Cash Drawer Balance</span>
                    <span className="text-xs font-bold text-slate-900">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#55ff33] text-black font-extrabold text-right px-3 py-2.5 text-base font-mono">
                  {formatCurrency(totalCashOut)}
                </td>
              </tr>

              {/* Previous balance & Reconciliation Section */}
              <tr>
                <td colSpan={2} className="border border-slate-800 bg-[#00aaff] text-black font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Previous balance</span>
                    <span className="text-xs font-bold text-slate-900">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#00aaff] text-black font-extrabold px-3 py-2.5 text-base font-mono">
                  <div className="flex items-center justify-between gap-1 no-print">
                    <span className="text-xs text-slate-900 font-bold shrink-0">THB</span>
                    <input
                      type="number"
                      value={data.beerPrevBalance || ''}
                      onChange={(e) => onChange({ ...data, beerPrevBalance: Number(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-24 text-right bg-white/90 font-mono font-bold text-slate-900 border border-blue-400 rounded px-1.5 py-0.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                    />
                  </div>
                  <span className="hidden print:inline font-mono font-bold text-right block">{formatCurrency(data.beerPrevBalance)}</span>
                </td>

                <td colSpan={2} className="border border-slate-800 bg-[#00aaff] text-black font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Previous balance</span>
                    <span className="text-xs font-bold text-slate-900">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#00aaff] text-black font-extrabold text-right px-3 py-2.5 text-base font-mono">
                  {formatCurrency(prevBalanceOut)}
                </td>
              </tr>

              {/* Different Row */}
              <tr>
                <td colSpan={2} className="border border-slate-800 bg-[#ff0000] text-white font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Different</span>
                    <span className="text-xs font-bold text-white">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#ff0000] text-white font-extrabold text-right px-3 py-2.5 text-base font-mono">
                  {formatSignedCurrency(redInDiff)}
                </td>

                <td colSpan={2} className="border border-slate-800 bg-[#ff0000] text-white font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider">Different</span>
                    <span className="text-xs font-bold text-white">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#ff0000] text-white font-extrabold text-right px-3 py-2.5 text-base font-mono">
                  {formatSignedCurrency(redOutDiff)}
                </td>
              </tr>

              {/* Final Result Row (Brown) */}
              <tr>
                <td colSpan={2} className="border border-slate-800 bg-[#8B4513] text-white font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-extrabold uppercase tracking-wider">Final</span>
                    <span className="text-xs font-bold text-white">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#8B4513] text-white font-extrabold text-right px-3 py-2.5 text-lg font-mono tracking-wider">
                  {formatSignedCurrency(finalIn)}
                </td>

                <td colSpan={2} className="border border-slate-800 bg-[#8B4513] text-white font-extrabold px-3 py-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-extrabold uppercase tracking-wider">Final</span>
                    <span className="text-xs font-bold text-white">THB</span>
                  </div>
                </td>
                <td className="border border-slate-800 bg-[#8B4513] text-white font-extrabold text-right px-3 py-2.5 text-lg font-mono tracking-wider">
                  {formatSignedCurrency(finalOut)}
                </td>
              </tr>


            </tbody>
          </table>
        </div>

        {/* Expenses Section (Side-by-side tables) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Expenses & Incomes IN */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-[#ffff00] px-3 py-2 border-b border-slate-800">
              <span className="font-extrabold text-slate-900 text-base">Expenses & Incomes IN</span>
              <button
                type="button"
                onClick={() => addExpenseRow('expensesIn')}
                className="no-print inline-flex items-center gap-1 text-xs font-bold bg-white text-slate-800 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
              </button>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#ffffaa] border-b border-slate-800 text-slate-900 font-bold">
                  <th className="border-r border-slate-800 px-3 py-1.5 text-left w-1/2">Items:</th>
                  <th className="border-r border-slate-800 px-3 py-1.5 text-right w-1/3">฿ Amount:</th>
                  <th className="px-3 py-1.5 text-left">Staff:</th>
                  <th className="no-print w-8"></th>
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
                      />
                      <span className="hidden print:inline font-medium text-xs px-2">{exp.item}</span>
                    </td>
                    <td className="border-r border-slate-300 p-1">
                      <input
                        type="number"
                        value={exp.amount === 0 ? '' : exp.amount}
                        onChange={(e) => handleExpenseChange('expensesIn', idx, 'amount', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none no-print"
                      />
                      <span className="hidden print:inline font-mono text-xs px-2">{formatCurrency(exp.amount)}</span>
                    </td>
                    <td className="p-1">
                      <StaffSelect
                        value={exp.staff}
                        onChange={(val) => handleExpenseChange('expensesIn', idx, 'staff', val)}
                        placeholder="ผู้รับ"
                        size="sm"
                      />
                      <span className="hidden print:inline text-xs px-2">{exp.staff}</span>
                    </td>
                    <td className="no-print p-1 text-center">
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
              <tfoot>
                <tr className="bg-[#ffff00] font-extrabold text-slate-900 border-t border-slate-800">
                  <td className="px-2 py-2 border-r border-slate-800 text-right text-xs sm:text-sm whitespace-nowrap font-bold">
                    รวม Expenses & Incomes IN:
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm sm:text-base font-extrabold whitespace-nowrap" colSpan={3}>
                    {formatCurrency(totalExpensesIn)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses & Incomes OUT */}
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-[#ffff00] px-3 py-2 border-b border-slate-800">
              <span className="font-extrabold text-slate-900 text-base">Expenses & Incomes OUT</span>
              <button
                type="button"
                onClick={() => addExpenseRow('expensesOut')}
                className="no-print inline-flex items-center gap-1 text-xs font-bold bg-white text-slate-800 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
              </button>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#ffffaa] border-b border-slate-800 text-slate-900 font-bold">
                  <th className="border-r border-slate-800 px-3 py-1.5 text-left w-1/2">Items:</th>
                  <th className="border-r border-slate-800 px-3 py-1.5 text-right w-1/3">฿ Amount:</th>
                  <th className="px-3 py-1.5 text-left">Staff:</th>
                  <th className="no-print w-8"></th>
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
                      />
                      <span className="hidden print:inline font-medium text-xs px-2">{exp.item}</span>
                    </td>
                    <td className="border-r border-slate-300 p-1">
                      <input
                        type="number"
                        value={exp.amount === 0 ? '' : exp.amount}
                        onChange={(e) => handleExpenseChange('expensesOut', idx, 'amount', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none no-print"
                      />
                      <span className="hidden print:inline font-mono text-xs px-2">{formatCurrency(exp.amount)}</span>
                    </td>
                    <td className="p-1">
                      <StaffSelect
                        value={exp.staff}
                        onChange={(val) => handleExpenseChange('expensesOut', idx, 'staff', val)}
                        placeholder="ผู้จ่าย"
                        size="sm"
                      />
                      <span className="hidden print:inline text-xs px-2">{exp.staff}</span>
                    </td>
                    <td className="no-print p-1 text-center">
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
              <tfoot>
                <tr className="bg-[#ffff00] font-extrabold text-slate-900 border-t border-slate-800">
                  <td className="px-2 py-2 border-r border-slate-800 text-right text-xs sm:text-sm whitespace-nowrap font-bold">
                    รวม Expenses & Incomes OUT:
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm sm:text-base font-extrabold whitespace-nowrap" colSpan={3}>
                    {formatCurrency(totalExpensesOut)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Remarks Box */}
        <div className="mt-6 border border-slate-400 rounded-lg p-3 bg-slate-50">
          <label className="block text-sm font-bold text-slate-800 mb-1">หมายเหตุ:</label>
          <textarea
            value={data.remarks}
            onChange={(e) => onChange({ ...data, remarks: e.target.value })}
            placeholder="บันทึกเพิ่มเติมเกี่ยวกับกะ ยอดเงินเกิน/ขาด หรือหมายเหตุอื่นๆ..."
            rows={2}
            className="w-full bg-white border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 no-print"
          />
          <p className="hidden print:block text-sm text-slate-800 whitespace-pre-wrap">
            {data.remarks || '-'}
          </p>
        </div>

        {/* Staff Signatures Block (Print & Record) */}
        <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-bold">ลงชื่อ พนักงานส่งมอบ/นับเงินเข้า (Staff IN):</span>
            <div className="h-10 border-b border-dotted border-slate-500 w-48 my-1 flex items-end justify-center font-bold text-sm text-slate-900 pb-0.5">
              {data.staffIn || ''}
            </div>
            <span className="font-semibold text-slate-700">( {data.staffIn || '...........................................'} )</span>
            <span className="text-slate-500 text-[11px]">วันที่ ....... / ....... / .......</span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="font-bold">ลงชื่อ พนักงานรับมอบ/นับเงินออกเมื่อเลิกงาน (Staff OUT):</span>
            <div className="h-10 border-b border-dotted border-slate-500 w-48 my-1 flex items-end justify-center font-bold text-sm text-slate-900 pb-0.5">
              {data.staffOut || ''}
            </div>
            <span className="font-semibold text-slate-700">( {data.staffOut || '...........................................'} )</span>
            <span className="text-slate-500 text-[11px]">วันที่ ....... / ....... / .......</span>
          </div>
        </div>
      </div>
    </div>
  );
};
