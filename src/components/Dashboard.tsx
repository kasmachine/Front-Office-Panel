import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Calculator,
  FileText,
  BarChart3,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Target,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  Sparkles,
  Calendar,
  Building2,
  RefreshCw,
  Zap,
  Briefcase,
  PieChart,
  ShoppingBag,
  Utensils,
  Sparkle,
  History
} from 'lucide-react';
import {
  CashCountData,
  ReceiptSubstituteData,
  MonthlyRevenueData,
  FrontOfficeChecklistData,
  ChecklistTask
} from '../types';
import { getInitialFrontOfficeChecklistData, getInitialMonthlyRevenueData } from '../data/defaults';
import { MONTH_EN, MONTH_TH } from '../data/defaults';

interface DashboardProps {
  onNavigate: (tab: 'dashboard' | 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist') => void;
  cashCountData: CashCountData;
  receiptData: ReceiptSubstituteData;
  savedCashCounts: CashCountData[];
  savedReceipts: ReceiptSubstituteData[];
  onManualSync?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  cashCountData,
  receiptData,
  savedCashCounts,
  savedReceipts,
  onManualSync,
}) => {
  const [currentDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [now] = useState<Date>(new Date());

  // 1. Load Monthly Revenue Data
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const docId = `revenue-${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const [revenueData, setRevenueData] = useState<MonthlyRevenueData>(() => {
    const saved = localStorage.getItem(`nan_seasons_${docId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return getInitialMonthlyRevenueData(currentYear, currentMonth);
  });

  // 2. Load Today's Front Office Checklist Data
  const [checklistData, setChecklistData] = useState<FrontOfficeChecklistData>(() => {
    const saved = localStorage.getItem(`nan_seasons_checklist_${currentDateStr}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return getInitialFrontOfficeChecklistData(currentDateStr);
  });

  // Re-read local storage on mount
  useEffect(() => {
    const revSaved = localStorage.getItem(`nan_seasons_${docId}`);
    if (revSaved) {
      try {
        setRevenueData(JSON.parse(revSaved));
      } catch (e) {}
    }

    const chkSaved = localStorage.getItem(`nan_seasons_checklist_${currentDateStr}`);
    if (chkSaved) {
      try {
        setChecklistData(JSON.parse(chkSaved));
      } catch (e) {}
    }
  }, [docId, currentDateStr]);

  // Calculations for Revenue
  const calculateCategoryTotals = () => {
    const totals = {
      rooms: 0,
      foodBeverage: 0,
      shop: 0,
      toursEtc: 0,
      massage: 0,
      laundryOthers: 0,
    };

    if (revenueData && revenueData.days) {
      Object.values(revenueData.days).forEach((dayItem) => {
        totals.rooms += Number(dayItem.rooms || 0);
        totals.foodBeverage += Number(dayItem.foodBeverage || 0);
        totals.shop += Number(dayItem.shop || 0);
        totals.toursEtc += Number(dayItem.toursEtc || 0);
        totals.massage += Number(dayItem.massage || 0);
        totals.laundryOthers += Number(dayItem.laundryOthers || 0);
      });
    }

    const monthTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    return { totals, monthTotal };
  };

  const { totals: categoryTotals, monthTotal } = calculateCategoryTotals();

  // Target Totals
  const targetTotal = revenueData?.target
    ? Object.values(revenueData.target).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
    : 0;

  const targetPercent = targetTotal > 0 ? Math.min(100, (monthTotal / targetTotal) * 100) : 0;

  // Last Year Total
  const lastYearTotal = revenueData?.lastYear
    ? Object.values(revenueData.lastYear).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
    : 0;
  const yoyPercent = lastYearTotal > 0 ? ((monthTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

  // Calculations for Checklist
  const morningTotal = checklistData.morningTasks.length;
  const morningDone = checklistData.morningTasks.filter((t) => t.completed).length;
  const morningPercent = morningTotal > 0 ? Math.round((morningDone / morningTotal) * 100) : 0;

  const afternoonTotal = checklistData.afternoonTasks.length;
  const afternoonDone = checklistData.afternoonTasks.filter((t) => t.completed).length;
  const afternoonPercent = afternoonTotal > 0 ? Math.round((afternoonDone / afternoonTotal) * 100) : 0;

  const totalChecklistTasks = morningTotal + afternoonTotal;
  const totalChecklistDone = morningDone + afternoonDone;
  const overallChecklistPercent = totalChecklistTasks > 0 ? Math.round((totalChecklistDone / totalChecklistTasks) * 100) : 0;

  // Calculations for Cash Count
  const calculateCashDrawerWorth = (data: CashCountData) => {
    let worthIn = 0;
    let worthOut = 0;
    (data.denominations || []).forEach((denom) => {
      worthIn += denom.value * (denom.countIn || 0);
      worthOut += denom.value * (denom.countOut || 0);
    });
    return { worthIn, worthOut, diff: worthIn - worthOut };
  };

  const currentCash = calculateCashDrawerWorth(cashCountData);

  // Calculations for Receipt Substitutes
  const receiptTotalAmount = (receiptData.items || []).reduce((acc, item) => acc + Number(item.amount || 0), 0);

  // Category Configuration for Revenue breakdown
  const categoryConfigs = [
    { key: 'rooms', labelEn: 'Rooms', labelTh: 'ห้องพัก', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
    { key: 'foodBeverage', labelEn: 'Food & Beverage', labelTh: 'อาหาร & เครื่องดื่ม', icon: Utensils, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
    { key: 'shop', labelEn: 'Shop / Souvenirs', labelTh: 'ร้านค้า / ของที่ระลึก', icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
    { key: 'toursEtc', labelEn: 'Tours & Transport', labelTh: 'ทัวร์ & รถรับส่ง', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
    { key: 'massage', labelEn: 'Spa & Massage', labelTh: 'สปา & นวด', icon: Sparkle, color: 'text-pink-600', bg: 'bg-pink-50', bar: 'bg-pink-500' },
    { key: 'laundryOthers', labelEn: 'Laundry & Others', labelTh: 'ซักอบรีด & อื่นๆ', icon: PieChart, color: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Executive Welcome & Live Status Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Front Office Executive Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Executive Dashboard <span className="text-slate-300 text-lg font-normal block sm:inline">(ภาพรวมระบบ)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time summary of revenue targets, shift cash reconciliation, front office checklists, and expense documentation for Nan Seasons Resort.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">
                  {MONTH_EN[currentMonth - 1]} {currentYear}
                </div>
                <div className="text-[10px] text-slate-400">
                  {MONTH_TH[currentMonth - 1]} พ.ศ. {currentYear + 543}
                </div>
              </div>
            </div>

            {onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/60 rounded-2xl transition-all shadow-lg shadow-emerald-950/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Sync Real-Time Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Revenue & Target */}
        <div
          onClick={() => onNavigate('dailyRevenue')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              MONTHLY REVENUE (ยอดขายรวม)
            </span>
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ฿{monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">Target: ฿{targetTotal.toLocaleString('en-US')}</span>
              <span className="font-bold text-indigo-600">{targetPercent.toFixed(1)}% Achieved</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, targetPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: Shift Cash Drawer Balance */}
        <div
          onClick={() => onNavigate('cashCount')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              CASH DRAWER IN (เงินสดกะเข้า)
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ฿{currentCash.worthIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">Cash OUT: ฿{currentCash.worthOut.toLocaleString('en-US')}</span>
              <span className={`font-bold ${currentCash.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentCash.diff >= 0 ? `+฿${currentCash.diff.toLocaleString('en-US')}` : `-฿${Math.abs(currentCash.diff).toLocaleString('en-US')}`}
              </span>
            </div>
            {/* Status indicator */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full w-full" />
            </div>
          </div>
        </div>

        {/* KPI 3: Front Office Checklist Progress */}
        <div
          onClick={() => onNavigate('frontOfficeChecklist')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TODAY'S CHECKLIST (ตรวจงาน)
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-2">
              <span>{overallChecklistPercent}%</span>
              <span className="text-xs font-semibold text-slate-500 font-sans">
                ({totalChecklistDone}/{totalChecklistTasks} Tasks)
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">Morning: {morningPercent}%</span>
              <span className="text-slate-500 font-medium">Afternoon: {afternoonPercent}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallChecklistPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Active Receipt Substitute Forms */}
        <div
          onClick={() => onNavigate('receiptSubstitute')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              RECEIPT SUBSTITUTE (แทนใบเสร็จ)
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ฿{receiptTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-slate-500 font-medium">Items: {receiptData.items?.length || 0} Records</span>
              <span className="font-bold text-purple-600">Active Form</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section: Revenue Breakdown & Front Office Checklist Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Revenue Category Performance */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                Revenue Category Performance (ผลงานแยกตามประเภทรายได้)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of current month's actual revenue vs category targets
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dailyRevenue')}
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>View Full Revenue Sheet</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryConfigs.map((cat) => {
              const actual = Number(categoryTotals[cat.key as keyof typeof categoryTotals] || 0);
              const target = Number(revenueData?.target?.[cat.key as keyof typeof revenueData.target] || 0);
              const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
              const Icon = cat.icon;

              return (
                <div key={cat.key} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${cat.bg} border border-slate-200/50`}>
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{cat.labelEn}</div>
                        <div className="text-[10px] text-slate-500">{cat.labelTh}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-slate-900">
                      ฿{actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Target: ฿{target.toLocaleString('en-US')}</span>
                    <span className="font-bold text-slate-700">{target > 0 ? `${pct.toFixed(1)}%` : 'No Target'}</span>
                  </div>

                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div className={`${cat.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* YoY Growth Bar & Summary Footnote */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-orange-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold">Year-Over-Year Comparison (เทียบกับปีก่อน)</div>
                <div className="text-[11px] text-slate-300">
                  Last Year Same Month ({currentYear - 1}): ฿{lastYearTotal.toLocaleString('en-US')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-base font-black font-mono ${yoyPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {yoyPercent >= 0 ? `+${yoyPercent.toFixed(1)}%` : `${yoyPercent.toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-slate-400">YoY Growth Rate</div>
            </div>
          </div>
        </div>

        {/* Right Column: Front Office Daily Checklist Live Overview */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                  Today's Shift Checklist (ตรวจเช็คงานประจำวัน)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shift readiness & task completion overview
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('frontOfficeChecklist')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Open Checklist"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Morning Shift Card */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wide">MORNING SHIFT (กะเช้า)</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-900">
                  {morningDone}/{morningTotal} Tasks ({morningPercent}%)
                </span>
              </div>
              <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${morningPercent}%` }} />
              </div>
              <div className="space-y-1.5 pt-1">
                {checklistData.morningTasks.slice(0, 3).map((task, idx) => (
                  <div key={task.id} className="flex items-center justify-between text-xs text-slate-700 bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-100">
                    <span className={`truncate ${task.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                      {idx + 1}. {task.title}
                    </span>
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Afternoon Shift Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">AFTERNOON SHIFT (กะบ่าย)</span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-900">
                  {afternoonDone}/{afternoonTotal} Tasks ({afternoonPercent}%)
                </span>
              </div>
              <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${afternoonPercent}%` }} />
              </div>
              <div className="space-y-1.5 pt-1">
                {checklistData.afternoonTasks.slice(0, 3).map((task, idx) => (
                  <div key={task.id} className="flex items-center justify-between text-xs text-slate-700 bg-white/80 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                    <span className={`truncate ${task.completed ? 'line-through text-slate-400' : 'font-medium text-slate-800'}`}>
                      {idx + 1}. {task.title}
                    </span>
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('frontOfficeChecklist')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-2xl transition-all shadow-md cursor-pointer mt-2"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Open Checklist Form (เปิดหน้าเช็คลิสต์)</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            Quick Access Modules (เมนูลัดเข้าสู่ระบบงาน)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('cashCount')}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-fit group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Cash Count Sheet
              </div>
              <div className="text-xs text-slate-500 mt-0.5">ตารางนับเงินสดประจำกะ</div>
            </div>
            <div className="mt-3 flex items-center text-xs font-bold text-blue-600 gap-1">
              <span>Open Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('receiptSubstitute')}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 w-fit group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Receipt Substitute
              </div>
              <div className="text-xs text-slate-500 mt-0.5">ใบรับรองแทนใบเสร็จรับเงิน</div>
            </div>
            <div className="mt-3 flex items-center text-xs font-bold text-purple-600 gap-1">
              <span>Open Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dailyRevenue')}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600 w-fit group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                Daily Revenue Sheet
              </div>
              <div className="text-xs text-slate-500 mt-0.5">ยอดขาย & เป้าหมายประจำวัน</div>
            </div>
            <div className="mt-3 flex items-center text-xs font-bold text-orange-600 gap-1">
              <span>Open Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('frontOfficeChecklist')}
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Front Office Checklist
              </div>
              <div className="text-xs text-slate-500 mt-0.5">แบบฟอร์มกะเช้า & กะบ่าย</div>
            </div>
            <div className="mt-3 flex items-center text-xs font-bold text-emerald-600 gap-1">
              <span>Open Module</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
