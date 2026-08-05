import React, { useState, useEffect, useRef } from 'react';
import { MonthlyRevenueData, RevenueCategories, RevenueHistoryRecord } from '../types';
import { getInitialMonthlyRevenueData } from '../data/defaults';
import { safeLocalStorage } from '../utils/storage';
import {
  saveMonthlyRevenueToFirebase,
  subscribeMonthlyRevenue,
  saveRevenueHistoryToFirebase,
  createRevenueHistoryRecord,
  fetchMonthlyRevenueFromFirebase,
} from '../lib/firebase';
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
  BookmarkCheck,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Edit,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
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

const REVENUE_CAT_CONFIG: {
  key: keyof RevenueCategories;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { key: 'rooms', label: 'ห้องพัก', labelEn: 'Rooms', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { key: 'foodBeverage', label: 'อาหาร & เครื่องดื่ม', labelEn: 'Food & Beverage', icon: Utensils, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { key: 'shop', label: 'ร้านค้า / ของที่ระลึก', labelEn: 'Shop', icon: ShoppingBag, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { key: 'toursEtc', label: 'ทัวร์และนำเที่ยว', labelEn: 'Tours etc.', icon: Compass, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { key: 'massage', label: 'นวดสปา', labelEn: 'Massage', icon: Sparkles, color: 'text-pink-600', bgColor: 'bg-pink-50', borderColor: 'border-pink-200' },
  { key: 'laundryOthers', label: 'ซักรีดและอื่นๆ', labelEn: 'Laundry & others', icon: Shirt, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
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
    const saved = safeLocalStorage.getItem(`nan_seasons_${docId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* ignore */ }
    }
    return getInitialMonthlyRevenueData(selectedYear, selectedMonth);
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [autoFetchMsg, setAutoFetchMsg] = useState<string | null>(null);

  // Subscribe to real-time Firebase changes for selected month
  useEffect(() => {
    const unsubscribe = subscribeMonthlyRevenue(docId, (remoteData) => {
      if (remoteData) {
        setData(remoteData);
        safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(remoteData));
      } else {
        // If doc doesn't exist yet, check localStorage or init
        const saved = safeLocalStorage.getItem(`nan_seasons_${docId}`);
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

  // Debounced Revenue History saving whenever revenue data updates
  const saveHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHistorySerializedRef = useRef<string>('');

  const saveHistorySnapshot = (revData: MonthlyRevenueData) => {
    if (!revData || !revData.id) return;
    const historyRecord = createRevenueHistoryRecord(revData);

    // 1. Save to Firebase history collection
    saveRevenueHistoryToFirebase(historyRecord);

    // 2. Save to local storage history array
    try {
      const localHistRaw = safeLocalStorage.getItem('nan_seasons_revenue_history');
      let localHist: RevenueHistoryRecord[] = localHistRaw ? JSON.parse(localHistRaw) : [];
      localHist = [historyRecord, ...localHist.filter(h => h.id !== historyRecord.id && !(h.year === historyRecord.year && h.month === historyRecord.month))];
      safeLocalStorage.setItem('nan_seasons_revenue_history', JSON.stringify(localHist));
    } catch (e) {
      console.error('Failed to update local revenue history', e);
    }
  };

  const handleManualSaveHistory = () => {
    if (!data || !data.id) return;
    saveHistorySnapshot(data);
    setIsSaving(true);
    setSaveSuccess(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(false);
    }, 2000);
  };

  // Auto-fetch Last Year Revenue data from Firebase/LocalStorage
  const handleAutoFetchLastYear = async () => {
    const lastYearNum = selectedYear - 1;
    const lastYearDocId = `revenue-${lastYearNum}-${String(selectedMonth).padStart(2, '0')}`;
    setIsAutoFetching(true);
    setAutoFetchMsg(null);

    try {
      // 1. Try Firebase
      let prevData = await fetchMonthlyRevenueFromFirebase(lastYearDocId);

      // 2. Try LocalStorage fallback
      if (!prevData) {
        const saved = safeLocalStorage.getItem(`nan_seasons_${lastYearDocId}`);
        if (saved) {
          try {
            prevData = JSON.parse(saved);
          } catch (e) { /* ignore */ }
        }
      }

      if (prevData && prevData.days) {
        const totals: RevenueCategories = {
          rooms: 0,
          foodBeverage: 0,
          shop: 0,
          toursEtc: 0,
          massage: 0,
          laundryOthers: 0,
        };

        Object.values(prevData.days).forEach((dayItem) => {
          totals.rooms += dayItem.rooms || 0;
          totals.foodBeverage += dayItem.foodBeverage || 0;
          totals.shop += dayItem.shop || 0;
          totals.toursEtc += dayItem.toursEtc || 0;
          totals.massage += dayItem.massage || 0;
          totals.laundryOthers += dayItem.laundryOthers || 0;
        });

        const updatedData: MonthlyRevenueData = {
          ...data,
          lastYear: totals,
          updatedAt: new Date().toISOString(),
        };

        setData(updatedData);
        safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(updatedData));
        saveMonthlyRevenueToFirebase(updatedData);

        const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
        setAutoFetchMsg(`Fetched ${lastYearNum} data successfully! Total ฿${grandTotal.toLocaleString('en-US')} (ดึงข้อมูลปี ${lastYearNum + 543} สำเร็จ)`);
      } else {
        setAutoFetchMsg(`No history data found for ${MONTH_EN[selectedMonth - 1]} ${lastYearNum} (ไม่พบข้อมูลเดือน ${MONTH_TH[selectedMonth - 1]} พ.ศ. ${lastYearNum + 543})`);
      }
    } catch (err) {
      setAutoFetchMsg('Error fetching last year data (เกิดข้อผิดพลาดในการดึงข้อมูลปีที่แล้ว)');
    } finally {
      setIsAutoFetching(false);
      setTimeout(() => setAutoFetchMsg(null), 5000);
    }
  };

  // Reset serialized ref when month/year changes
  useEffect(() => {
    lastHistorySerializedRef.current = '';
  }, [docId]);

  useEffect(() => {
    if (!data || !data.id) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastHistorySerializedRef.current) return;

    lastHistorySerializedRef.current = serialized;
    saveHistorySnapshot(data);
  }, [data]);

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
    safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(updatedData));
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
    safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(updatedData));
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
    if (window.confirm(`Are you sure you want to clear all revenue data for ${MONTH_EN[selectedMonth - 1]} ${selectedYear}? (คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลเดือน ${MONTH_TH[selectedMonth - 1]} ${selectedYear + 543} ทั้งหมด?)`)) {
      const fresh = getInitialMonthlyRevenueData(selectedYear, selectedMonth);
      setData(fresh);
      safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(fresh));
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
  const lastYearTotal = getBenchmarkTotal('lastYear');
  const targetPercent = targetTotal > 0 ? (monthTotal / targetTotal) * 100 : 0;
  const yoyPercent = lastYearTotal > 0 ? ((monthTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

  return (
    <div id="revenue-document" className="space-y-6 pb-12 print:p-0 print:m-0 print:pb-0">
      {/* Control Bar (No Print) */}
      <div className="no-print bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Month Navigation & Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white rounded-lg transition-all text-slate-700 hover:text-orange-600 shadow-2xs"
              title="Previous Month (เดือนก่อนหน้า)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-bold text-slate-800 text-sm sm:text-base">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>
                {MONTH_EN[selectedMonth - 1]} {selectedYear} ({MONTH_TH[selectedMonth - 1]} พ.ศ. {selectedYear + 543})
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-white rounded-lg transition-all text-slate-700 hover:text-orange-600 shadow-2xs"
              title="Next Month (เดือนถัดไป)"
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
              {MONTH_EN.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m} ({MONTH_TH[idx]})
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
                  {y} (พ.ศ. {y + 543})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTargetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Set Target & Last Year Revenue per category"
          >
            <Target className="w-4 h-4 text-indigo-600" />
            <span>Target & Last Year (ตั้งค่าเป้าหมาย)</span>
          </button>

          <button
            type="button"
            onClick={handleManualSaveHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl shadow-2xs transition-all"
            title="Save monthly revenue snapshot to history"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccess ? 'Saved to History!' : 'Save History (บันทึกประวัติ)'}</span>
          </button>

          <button
            type="button"
            onClick={handleClearMonth}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-xl transition-all"
            title="Clear current month data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Month (ล้างเดือนนี้)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Print / Export PDF (พิมพ์ PDF)</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards (No Print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month Grand Total Card */}
        <div className="bg-gradient-to-br from-orange-600 to-amber-700 text-white p-4 rounded-2xl shadow-md border border-orange-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-100 uppercase tracking-wider">MONTHLY TOTAL REVENUE (ยอดขายรวม)</span>
            <div className="bg-white/20 p-2 rounded-xl">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ฿{monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-orange-100/80 mt-1">
              {MONTH_EN[selectedMonth - 1]} {selectedYear} ({MONTH_TH[selectedMonth - 1]} พ.ศ. {selectedYear + 543}) • {daysInMonth} Days
            </div>
          </div>
        </div>

        {/* Target Comparison Card */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL TARGET (เป้าหมายรวม)</span>
            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-800">
                {targetPercent.toFixed(1)}%
              </span>
              <span className={`text-xs font-bold ${monthTotal >= targetTotal && targetTotal > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {monthTotal >= targetTotal && targetTotal > 0 ? '✓ Target Surpassed (ทะลุเป้า)' : targetTotal > 0 ? `Remaining (ขาด) ฿${(targetTotal - monthTotal).toLocaleString('en-US')}` : 'Not set (ยังไม่ตั้งเป้า)'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Target (เป้าหมาย): ฿{targetTotal.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Last Year YoY Comparison Card */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LAST YEAR (เทียบปีที่แล้ว YoY)</span>
            <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
              <BarChart3 className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold ${yoyPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {yoyPercent >= 0 ? '+' : ''}{yoyPercent.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                ({monthTotal - lastYearTotal >= 0 ? '+' : ''}฿{(monthTotal - lastYearTotal).toLocaleString('en-US')})
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Last Year ({selectedYear - 1}): ฿{lastYearTotal.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Rooms Share Card */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ROOMS SHARE (สัดส่วนห้องพัก)</span>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              ฿{roomsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {monthTotal > 0 ? ((roomsTotal / monthTotal) * 100).toFixed(1) : '0.0'}% of Total Revenue (ของยอดรวม)
            </div>
          </div>
        </div>
      </div>

      {/* Target & YoY Detailed Comparison Table (Categorized by Revenue Streams) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Target & YoY Revenue Analysis Report (รายงานวิเคราะห์เปรียบเทียบ Target และยอดปีที่แล้ว)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Actual revenue vs Target & Last Year's same month comparison (สรุปยอดขายจริงเทียบเป้าหมายและปีที่แล้ว)
            </p>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFetchLastYear}
              disabled={isAutoFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              {isAutoFetching ? 'Fetching...' : 'Auto-fetch Last Year (ดึงยอดปีที่แล้ว)'}
            </button>

            <button
              type="button"
              onClick={() => setIsTargetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-slate-600" />
              Edit Target / YoY (แก้ไข)
            </button>
          </div>
        </div>

        {autoFetchMsg && (
          <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 text-xs font-bold text-indigo-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{autoFetchMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-center">
                <th className="px-4 py-3 text-left min-w-[160px]">Revenue Stream (ประเภทรายได้)</th>
                <th className="px-3 py-3 text-right min-w-[120px] bg-amber-50/50 text-amber-900 font-bold">
                  Actual (ยอดจริง)
                </th>
                <th className="px-3 py-3 text-right min-w-[110px]">Target (เป้าหมาย)</th>
                <th className="px-3 py-3 text-center min-w-[150px]">vs Target (เทียบเป้าหมาย)</th>
                <th className="px-3 py-3 text-right min-w-[110px]">Last Year (ปีที่แล้ว)</th>
                <th className="px-3 py-3 text-center min-w-[150px]">YoY Growth (การเติบโต)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {REVENUE_CAT_CONFIG.map((cat) => {
                const actual = getCategoryTotal(cat.key);
                const target = data.target?.[cat.key] || 0;
                const lastYear = data.lastYear?.[cat.key] || 0;

                const targetAchievedPct = target > 0 ? (actual / target) * 100 : 0;
                const targetDiff = actual - target;

                const yoyGrowthPct = lastYear > 0 ? ((actual - lastYear) / lastYear) * 100 : 0;
                const yoyDiff = actual - lastYear;

                const IconComponent = cat.icon;

                return (
                  <tr key={cat.key} className="hover:bg-slate-50 transition-colors">
                    {/* Category Label */}
                    <td className="px-4 py-2.5 font-bold text-slate-800 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${cat.bgColor} ${cat.borderColor}`}>
                        <IconComponent className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <div>
                        <div>{cat.labelEn}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{cat.label}</div>
                      </div>
                    </td>

                    {/* Current Month Actual */}
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-amber-950 bg-amber-50/30">
                      ฿{actual.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>

                    {/* Target */}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700">
                      ฿{target.toLocaleString('en-US')}
                    </td>

                    {/* Target Achievement */}
                    <td className="px-3 py-2.5 text-center">
                      {target > 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 font-bold font-mono">
                            <span className={targetAchievedPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                              {targetAchievedPct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({targetDiff >= 0 ? '+' : ''}฿{targetDiff.toLocaleString('en-US')})
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${targetAchievedPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(targetAchievedPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Last Year */}
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700">
                      ฿{lastYear.toLocaleString('en-US')}
                    </td>

                    {/* YoY Growth */}
                    <td className="px-3 py-2.5 text-center">
                      {lastYear > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                              yoyDiff >= 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {yoyDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {yoyGrowthPct >= 0 ? '+' : ''}{yoyGrowthPct.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {yoyDiff >= 0 ? '+' : ''}฿{yoyDiff.toLocaleString('en-US')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Row */}
              <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-slate-900">
                <td className="px-4 py-3 font-black text-slate-900 text-sm">
                  Grand Total (รวมรายได้ทั้งหมด)
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-black text-amber-950 bg-amber-100/50">
                  ฿{monthTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                  ฿{targetTotal.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-3 text-center">
                  {targetTotal > 0 ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold ${targetPercent >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {targetPercent.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({monthTotal - targetTotal >= 0 ? '+' : ''}฿{(monthTotal - targetTotal).toLocaleString('en-US')})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                  ฿{lastYearTotal.toLocaleString('en-US')}
                </td>
                <td className="px-3 py-3 text-center">
                  {lastYearTotal > 0 ? (
                    <div className="flex flex-col items-center">
                      <span className={`font-mono font-bold ${yoyPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {yoyPercent >= 0 ? '+' : ''}{yoyPercent.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({monthTotal - lastYearTotal >= 0 ? '+' : ''}฿{(monthTotal - lastYearTotal).toLocaleString('en-US')})
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
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
                  Salesplan and Targets ({MONTH_EN[selectedMonth - 1]} {selectedYear} / {MONTH_TH[selectedMonth - 1]} พ.ศ. {selectedYear + 543})
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
                  Total (รวม)
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

              {/* Benchmark Row: Target */}
              <tr className="bg-indigo-50/60 font-semibold border-t border-slate-300 text-slate-800">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-indigo-900 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Target (เป้าหมาย)
                </td>
                <td className="px-3 py-2 border-r border-slate-300 text-right font-mono bg-indigo-100/50 font-bold text-indigo-950">
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
                      className="w-full text-right px-2.5 py-1.5 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none border-none text-indigo-900 font-semibold"
                    />
                  </td>
                ))}
              </tr>

              {/* Benchmark Row: Last Year */}
              <tr className="bg-slate-100 font-semibold border-t border-slate-300 text-slate-700">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-slate-600 flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Last Year ({selectedYear - 1}) (ปีที่แล้ว)
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
              <tr className="bg-slate-50 font-semibold border-t border-slate-300 text-slate-600">
                <td className="px-3 py-2 border-r border-slate-300 font-bold text-slate-500">
                  Plan (แผนงาน)
                </td>
                <td className="px-3 py-2 border-r border-slate-300 text-right font-mono bg-slate-100 font-bold text-slate-700">
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
                      className="w-full text-right px-2.5 py-1.5 text-xs font-mono bg-transparent focus:bg-amber-100/70 focus:outline-none border-none text-slate-600"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Target & Last Year Management Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Set Target & Last Year Revenue ({selectedYear - 1}) (ตั้งค่าเป้าหมาย และยอดปีที่แล้ว)
                  </h3>
                  <p className="text-xs text-slate-500">
                    For {MONTH_EN[selectedMonth - 1]} {selectedYear} ({MONTH_TH[selectedMonth - 1]} พ.ศ. {selectedYear + 543})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
                <span className="text-indigo-900 font-medium">
                  Auto-fetch last year ({selectedYear - 1}) data or enter numbers manually (ดึงยอดปีที่แล้ว หรือกรอกเอง)
                </span>
                <button
                  type="button"
                  onClick={handleAutoFetchLastYear}
                  disabled={isAutoFetching}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {isAutoFetching ? 'Fetching...' : 'Fetch Last Year Data (ดึงข้อมูลปีที่แล้ว)'}
                </button>
              </div>

              <div className="space-y-4">
                {REVENUE_CAT_CONFIG.map((cat) => {
                  const IconComp = cat.icon;
                  return (
                    <div key={cat.key} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                        <div className={`p-1.5 rounded-md ${cat.bgColor}`}>
                          <IconComp className={`w-4 h-4 ${cat.color}`} />
                        </div>
                        <span>{cat.labelEn} ({cat.label})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                            Target (เป้าหมาย)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={data.target?.[cat.key] === 0 ? '' : data.target?.[cat.key]}
                            placeholder="0"
                            onChange={(e) => handleBenchmarkChange('target', cat.key, e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-purple-900 mb-1">
                            Last Year ({selectedYear - 1}) (ปีที่แล้ว)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={data.lastYear?.[cat.key] === 0 ? '' : data.lastYear?.[cat.key]}
                            placeholder="0"
                            onChange={(e) => handleBenchmarkChange('lastYear', cat.key, e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Plan (แผนงาน)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={data.plan?.[cat.key] === 0 ? '' : data.plan?.[cat.key]}
                            placeholder="0"
                            onChange={(e) => handleBenchmarkChange('plan', cat.key, e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                * Data is automatically saved and synced to all devices (* ซิงค์ข้อมูลเรียลไทม์)
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Done / Save (เสร็จสิ้น / บันทึก)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
