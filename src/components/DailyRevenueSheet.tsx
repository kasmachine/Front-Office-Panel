import React, { useState, useEffect } from 'react';
import { MonthlyRevenueData, RevenueCategories } from '../types';
import { getInitialMonthlyRevenueData } from '../data/defaults';
import { saveMonthlyRevenueToFirebase, subscribeMonthlyRevenue } from '../lib/firebase';
import {
  Calendar,
  TrendingUp,
  Award,
  DollarSign,
  Building2,
  Utensils,
  ShoppingBag,
  Compass,
  Sparkles,
  Shirt,
  Printer,
  RotateCcw,
  Save,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
} from 'lucide-react';

interface DailyRevenueSheetProps {
  initialYear?: number;
  initialMonth?: number;
}

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const MONTH_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DailyRevenueSheet: React.FC<DailyRevenueSheetProps> = ({
  initialYear,
  initialMonth,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || (now.getMonth() + 1));

  const docId = `revenue-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const [data, setData] = useState<MonthlyRevenueData>(() => {
    const saved = localStorage.getItem(`nan_seasons_${docId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* ignore */ }
    }
    return getInitialMonthlyRevenueData(selectedYear, selectedMonth);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Subscribe to real-time Firebase changes for selected month
  useEffect(() => {
    const unsubscribe = subscribeMonthlyRevenue(docId, (remoteData) => {
      if (remoteData) {
        setData(remoteData);
        localStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(remoteData));
      } else {
        // If doc doesn't exist yet, check localStorage or init
        const saved = localStorage.getItem(`nan_seasons_${docId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setData(parsed);
            return;
          } catch (e) { /* ignore */ }
        }
        setData(getInitialMonthlyRevenueData(selectedYear, selectedMonth));
      }
    });

    return () => unsubscribe();
  }, [docId, selectedYear, selectedMonth]);

  // Handle month/year change
  const handleMonthChange = (newMonth: number, newYear: number) => {
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Days count for selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  // Helper to update specific day cell
  const handleCellChange = (day: number, field: keyof RevenueCategories, val: string) => {
    const num = val === '' ? 0 : parseFloat(val) || 0;
    const updatedData: MonthlyRevenueData = {
      ...data,
      year: selectedYear,
      month: selectedMonth,
      monthName: `${MONTH_EN[selectedMonth - 1]} ${String(selectedYear).slice(-2)}`,
      days: {
        ...data.days,
        [day]: {
          ...(data.days[day] || {
            day,
            rooms: 0,
            foodBeverage: 0,
            shop: 0,
            toursEtc: 0,
            massage: 0,
            laundryOthers: 0,
          }),
          [field]: num,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    setData(updatedData);
    localStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(updatedData));
    saveMonthlyRevenueToFirebase(updatedData);
  };

  // Helper to update summary benchmark rows (Last Year, Plan, Target)
  const handleBenchmarkChange = (
    section: 'lastYear' | 'plan' | 'target',
    field: keyof RevenueCategories,
    val: string
  ) => {
    const num = val === '' ? 0 : parseFloat(val) || 0;
    const updatedData: MonthlyRevenueData = {
      ...data,
      [section]: {
        ...(data[section] || { rooms: 0, foodBeverage: 0, shop: 0, toursEtc: 0, massage: 0, laundryOthers: 0 }),
        [field]: num,
      },
      updatedAt: new Date().toISOString(),
    };

    setData(updatedData);
    localStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(updatedData));
    saveMonthlyRevenueToFirebase(updatedData);
  };

  // Calculate totals
  const getDayTotal = (day: number): number => {
    const item = data.days[day];
    if (!item) return 0;
    return (
      (item.rooms || 0) +
      (item.foodBeverage || 0) +
      (item.shop || 0) +
      (item.toursEtc || 0) +
      (item.massage || 0) +
      (item.laundryOthers || 0)
    );
  };

  const getCategoryTotal = (field: keyof RevenueCategories): number => {
    let sum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const item = data.days[d];
      if (item) {
        sum += item[field] || 0;
      }
    }
    return sum;
  };

  const getMonthGrandTotal = (): number => {
    let sum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      sum += getDayTotal(d);
    }
    return sum;
  };

  const getBenchmarkTotal = (section: 'lastYear' | 'plan' | 'target'): number => {
    const sec = data[section];
    if (!sec) return 0;
    return (
      (sec.rooms || 0) +
      (sec.foodBeverage || 0) +
      (sec.shop || 0) +
      (sec.toursEtc || 0) +
      (sec.massage || 0) +
      (sec.laundryOthers || 0)
    );
  };

  // Clear current month
  const handleClearMonth = () => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลยอดขายของเดือน ${MONTH_TH[selectedMonth - 1]} ${selectedYear + 543} ทั้งหมด?`)) {
      const fresh = getInitialMonthlyRevenueData(selectedYear, selectedMonth);
      setData(fresh);
      localStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(fresh));
      saveMonthlyRevenueToFirebase(fresh);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthTotal = getMonthGrandTotal();
  const roomsTotal = getCategoryTotal('rooms');
  const fbTotal = getCategoryTotal('foodBeverage');
  const targetTotal = getBenchmarkTotal('target');
  const targetPercent = targetTotal > 0 ? (monthTotal / targetTotal) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Control Bar (No Print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Month Navigation & Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded-lg transition-all text-slate-700 hover:text-orange-600 shadow-2xs"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-bold text-slate-800 text-sm sm:text-base">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>
                {MONTH_TH[selectedMonth - 1]} {selectedYear + 543} ({MONTH_EN[selectedMonth - 1]} {String(selectedYear).slice(-2)})
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded-lg transition-all text-slate-700 hover:text-orange-600 shadow-2xs"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value), selectedYear)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
            >
              {MONTH_TH.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m} ({MONTH_EN[idx]})
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => handleMonthChange(selectedMonth, Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleClearMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
            title="ล้างข้อมูลทั้งหมดของเดือนนี้"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ล้างเดือนนี้</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>พิมพ์ / พิมพ์ PDF</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards (No Print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-600 to-amber-700 text-white p-4 rounded-2xl shadow-md border border-orange-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-100 uppercase tracking-wider">ยอดขายรวมประจำเดือน</span>
            <div className="bg-white/20 p-2 rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ฿{monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-orange-100/80 mt-1">
              {MONTH_TH[selectedMonth - 1]} {selectedYear + 543} ({daysInMonth} วัน)
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ห้องพัก (Rooms)</span>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              ฿{roomsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              คิดเป็น {monthTotal > 0 ? ((roomsTotal / monthTotal) * 100).toFixed(1) : '0.0'}% ของยอดรวม
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">อาหาร & เครื่องดื่ม (F&B)</span>
            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <Utensils className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              ฿{fbTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              คิดเป็น {monthTotal > 0 ? ((fbTotal / monthTotal) * 100).toFixed(1) : '0.0'}% ของยอดรวม
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">เทียบกับเป้าหมาย (Target)</span>
            <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              {targetPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              เป้าหมาย: ฿{targetTotal.toLocaleString('en-US')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: "Salesplan and Targets" (Matches Apple Numbers format in user image) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              {/* Table Super Header */}
              <tr className="bg-slate-100 border-b border-slate-300">
                <th
                  colSpan={8}
                  className="px-4 py-3 text-center text-sm font-bold text-slate-800 tracking-wide uppercase border-b border-slate-300"
                >
                  Salesplan and Targets
                </th>
              </tr>

              {/* Column Headers */}
              <tr className="bg-slate-200/90 text-slate-800 font-bold border-b-2 border-slate-400 text-center select-none">
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[90px] text-left">
                  {MONTH_EN[selectedMonth - 1]} {String(selectedYear).slice(-2)}
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[110px] bg-slate-300/60 font-black text-slate-900">
                  Day Total
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[100px]">
                  Rooms
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[110px]">
                  Food & Beverage
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[90px]">
                  Shop
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[100px]">
                  Tours etc.
                </th>
                <th className="px-3 py-2.5 border-r border-slate-300 min-w-[90px]">
                  Massage
                </th>
                <th className="px-3 py-2.5 min-w-[120px]">
                  Laundry & others
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const item = data.days[day] || {
                  day,
                  rooms: 0,
                  foodBeverage: 0,
                  shop: 0,
                  toursEtc: 0,
                  massage: 0,
                  laundryOthers: 0,
                };
                const dayTotal = getDayTotal(day);
                const isWeekSeparator = day === 7 || day === 14 || day === 21 || day === 28;
                const weekNum = day === 7 ? 1 : day === 14 ? 2 : day === 21 ? 3 : day === 28 ? 4 : 0;

                return (
                  <tr
                    key={day}
                    className={`hover:bg-amber-50/50 transition-colors ${
                      isWeekSeparator ? 'border-b-2 border-slate-400 bg-slate-50/80 font-medium' : ''
                    }`}
                  >
                    {/* Day / Week Header Cell */}
                    <td
                      className={`px-3 py-1.5 font-bold border-r border-slate-300 whitespace-nowrap ${
                        isWeekSeparator ? 'text-red-700 bg-red-50/50' : 'text-slate-700'
                      }`}
                    >
                      {isWeekSeparator ? `${day}: Week ${weekNum}` : day}
                    </td>

                    {/* Day Total Cell */}
                    <td className="px-3 py-1.5 font-bold text-right border-r border-slate-300 bg-slate-100/70 text-slate-900 font-mono">
                      {dayTotal === 0 ? '0' : dayTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>

                    {/* Rooms */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="any"
                        value={item.rooms === 0 ? '' : item.rooms}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'rooms', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>

                    {/* Food & Beverage */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="any"
                        value={item.foodBeverage === 0 ? '' : item.foodBeverage}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'foodBeverage', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>

                    {/* Shop */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="any"
                        value={item.shop === 0 ? '' : item.shop}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'shop', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>

                    {/* Tours etc. */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="any"
                        value={item.toursEtc === 0 ? '' : item.toursEtc}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'toursEtc', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>

                    {/* Massage */}
                    <td className="p-0 border-r border-slate-300">
                      <input
                        type="number"
                        step="any"
                        value={item.massage === 0 ? '' : item.massage}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'massage', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>

                    {/* Laundry & others */}
                    <td className="p-0">
                      <input
                        type="number"
                        step="any"
                        value={item.laundryOthers === 0 ? '' : item.laundryOthers}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleCellChange(day, 'laundryOthers', e.target.value)}
                        className="w-full text-right px-2.5 py-1 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none focus:ring-1 focus:ring-orange-500 border-none"
                      />
                    </td>
                  </tr>
                );
              })}

              {/* Summary Row: Total */}
              <tr className="bg-slate-300/80 font-black border-t-2 border-slate-500 text-slate-900">
                <td className="px-3 py-2 border-r border-slate-400 font-extrabold text-blue-900">
                  Total
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-sm bg-blue-200/60 text-blue-950 font-black">
                  {monthTotal === 0 ? '0' : monthTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-blue-900">
                  {getCategoryTotal('rooms').toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-blue-900">
                  {getCategoryTotal('foodBeverage').toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-blue-900">
                  {getCategoryTotal('shop').toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-blue-900">
                  {getCategoryTotal('toursEtc').toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 border-r border-slate-400 text-right font-mono text-blue-900">
                  {getCategoryTotal('massage').toLocaleString('en-US')}
                </td>
                <td className="px-3 py-2 text-right font-mono text-blue-900">
                  {getCategoryTotal('laundryOthers').toLocaleString('en-US')}
                </td>
              </tr>

              {/* Benchmark Row: Last Year */}
              <tr className="bg-slate-100 font-semibold border-t border-slate-300 text-slate-700">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-slate-600">
                  Last Year
                </td>
                <td className="px-3 py-2 border-r border-slate-300 text-right font-mono bg-slate-200/50 font-bold text-slate-800">
                  {getBenchmarkTotal('lastYear').toLocaleString('en-US')}
                </td>
                {(['rooms', 'foodBeverage', 'shop', 'toursEtc', 'massage', 'laundryOthers'] as (keyof RevenueCategories)[]).map((col, idx) => (
                  <td key={col} className={`p-0 ${idx < 5 ? 'border-r border-slate-300' : ''}`}>
                    <input
                      type="number"
                      step="any"
                      value={data.lastYear?.[col] === 0 ? '' : data.lastYear?.[col]}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleBenchmarkChange('lastYear', col, e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none border-none text-slate-700"
                    />
                  </td>
                ))}
              </tr>

              {/* Benchmark Row: Plan */}
              <tr className="bg-slate-100 font-semibold border-t border-slate-300 text-slate-700">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-slate-600">
                  Plan
                </td>
                <td className="px-3 py-2 border-r border-slate-300 text-right font-mono bg-slate-200/50 font-bold text-slate-800">
                  {getBenchmarkTotal('plan').toLocaleString('en-US')}
                </td>
                {(['rooms', 'foodBeverage', 'shop', 'toursEtc', 'massage', 'laundryOthers'] as (keyof RevenueCategories)[]).map((col, idx) => (
                  <td key={col} className={`p-0 ${idx < 5 ? 'border-r border-slate-300' : ''}`}>
                    <input
                      type="number"
                      step="any"
                      value={data.plan?.[col] === 0 ? '' : data.plan?.[col]}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleBenchmarkChange('plan', col, e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none border-none text-slate-700"
                    />
                  </td>
                ))}
              </tr>

              {/* Benchmark Row: Target */}
              <tr className="bg-slate-100 font-semibold border-t border-slate-300 text-slate-700">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-slate-600">
                  Target
                </td>
                <td className="px-3 py-2 border-r border-slate-300 text-right font-mono bg-slate-200/50 font-bold text-slate-800">
                  {getBenchmarkTotal('target').toLocaleString('en-US')}
                </td>
                {(['rooms', 'foodBeverage', 'shop', 'toursEtc', 'massage', 'laundryOthers'] as (keyof RevenueCategories)[]).map((col, idx) => (
                  <td key={col} className={`p-0 ${idx < 5 ? 'border-r border-slate-300' : ''}`}>
                    <input
                      type="number"
                      step="any"
                      value={data.target?.[col] === 0 ? '' : data.target?.[col]}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleBenchmarkChange('target', col, e.target.value)}
                      className="w-full text-right px-2.5 py-1.5 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none border-none text-slate-700"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
