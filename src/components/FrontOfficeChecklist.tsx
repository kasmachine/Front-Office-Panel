import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Square,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  UserCheck,
  Sparkles,
  FileText,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { FrontOfficeChecklistData, ChecklistTask } from '../types';
import { getInitialFrontOfficeChecklistData } from '../data/defaults';
import { saveChecklistToFirebase, subscribeChecklist } from '../lib/firebase';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { safeLocalStorage } from '../utils/storage';

interface FrontOfficeChecklistProps {
  staffList?: string[];
  onManualSync?: () => void;
}

export const FrontOfficeChecklist: React.FC<FrontOfficeChecklistProps> = ({ staffList = [] }) => {
  // Current Selected Date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Checklist state
  const [checklist, setChecklist] = useState<FrontOfficeChecklistData>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const savedLocal = safeLocalStorage.getItem(`nan_seasons_checklist_${todayStr}`);
    if (savedLocal) {
      try {
        return JSON.parse(savedLocal);
      } catch (e) {
        /* ignore */
      }
    }
    return getInitialFrontOfficeChecklistData(todayStr);
  });

  // UI View tab filter: 'all' | 'morning' | 'afternoon'
  const [viewShift, setViewShift] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMorningTask, setIsAddingMorningTask] = useState(false);
  const [newMorningTitle, setNewMorningTitle] = useState('');
  const [isAddingAfternoonTask, setIsAddingAfternoonTask] = useState(false);
  const [newAfternoonTitle, setNewAfternoonTitle] = useState('');
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'idle'>('saved');

  // Load from LocalStorage or initialize when selectedDate changes
  useEffect(() => {
    const saved = safeLocalStorage.getItem(`nan_seasons_checklist_${selectedDate}`);
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        setChecklist(getInitialFrontOfficeChecklistData(selectedDate));
      }
    } else {
      setChecklist(getInitialFrontOfficeChecklistData(selectedDate));
    }
  }, [selectedDate]);

  // Subscribe to Firebase Firestore real-time updates for selected date
  useEffect(() => {
    let isUnmounted = false;
    const dateDocId = `checklist-${selectedDate}`;

    const unsubscribe = subscribeChecklist(dateDocId, (remoteData, hasPendingWrites) => {
      if (isUnmounted) return;
      if (remoteData) {
        setChecklist(remoteData);
        safeLocalStorage.setItem(`nan_seasons_checklist_${selectedDate}`, JSON.stringify(remoteData));
      } else {
        // Doc doesn't exist yet in cloud, create initial data
        const initial = getInitialFrontOfficeChecklistData(selectedDate);
        setChecklist(initial);
        safeLocalStorage.setItem(`nan_seasons_checklist_${selectedDate}`, JSON.stringify(initial));
        saveChecklistToFirebase(initial).catch(() => {});
      }
    });

    return () => {
      isUnmounted = true;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedDate]);

  // Save changes to state, localStorage, and Firebase
  const updateAndSaveChecklist = (newChecklist: FrontOfficeChecklistData) => {
    setChecklist(newChecklist);
    safeLocalStorage.setItem(`nan_seasons_checklist_${selectedDate}`, JSON.stringify(newChecklist));
    setSyncStatus('saving');
    saveChecklistToFirebase(newChecklist)
      .then(() => setSyncStatus('saved'))
      .catch(() => setSyncStatus('saved'));
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Task Check/Uncheck Handler
  const toggleTask = (shift: 'morning' | 'afternoon', taskId: string) => {
    const tasks = shift === 'morning' ? [...checklist.morningTasks] : [...checklist.afternoonTasks];
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;

    const task = tasks[index];
    const newCompleted = !task.completed;
    tasks[index] = {
      ...task,
      completed: newCompleted,
      updatedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = {
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: tasks,
      updatedAt: new Date().toISOString(),
    };

    updateAndSaveChecklist(updated);
  };

  // Update Task Staff / Kas / Note Field
  const updateTaskField = (
    shift: 'morning' | 'afternoon',
    taskId: string,
    field: 'staff' | 'kas' | 'note' | 'title',
    value: string
  ) => {
    const tasks = shift === 'morning' ? [...checklist.morningTasks] : [...checklist.afternoonTasks];
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;

    tasks[index] = {
      ...tasks[index],
      [field]: value,
    };

    const updated = {
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: tasks,
      updatedAt: new Date().toISOString(),
    };

    updateAndSaveChecklist(updated);
  };

  // Batch Operations
  const handleCheckAll = (shift: 'morning' | 'afternoon') => {
    const tasks = shift === 'morning' ? checklist.morningTasks : checklist.afternoonTasks;
    const updatedTasks = tasks.map((t) => ({ ...t, completed: true }));
    updateAndSaveChecklist({
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUncheckAll = (shift: 'morning' | 'afternoon') => {
    const tasks = shift === 'morning' ? checklist.morningTasks : checklist.afternoonTasks;
    const updatedTasks = tasks.map((t) => ({ ...t, completed: false }));
    updateAndSaveChecklist({
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddCustomTask = (shift: 'morning' | 'afternoon') => {
    const title = shift === 'morning' ? newMorningTitle.trim() : newAfternoonTitle.trim();
    if (!title) return;

    const tasks = shift === 'morning' ? [...checklist.morningTasks] : [...checklist.afternoonTasks];
    const newTask: ChecklistTask = {
      id: `${shift === 'morning' ? 'm' : 'a'}-${Date.now()}`,
      title,
      completed: false,
      staff: '',
      kas: '',
      note: '',
    };

    tasks.push(newTask);

    updateAndSaveChecklist({
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: tasks,
      updatedAt: new Date().toISOString(),
    });

    if (shift === 'morning') {
      setNewMorningTitle('');
      setIsAddingMorningTask(false);
    } else {
      setNewAfternoonTitle('');
      setIsAddingAfternoonTask(false);
    }
  };

  const handleDeleteTask = (shift: 'morning' | 'afternoon', taskId: string) => {
    if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    const tasks = shift === 'morning' ? checklist.morningTasks : checklist.afternoonTasks;
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    updateAndSaveChecklist({
      ...checklist,
      [shift === 'morning' ? 'morningTasks' : 'afternoonTasks']: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ต Checklist ของวันนี้เป็นค่าเริ่มต้นใช่หรือไม่?')) {
      const initial = getInitialFrontOfficeChecklistData(selectedDate);
      updateAndSaveChecklist(initial);
    }
  };

  const handleRemarksChange = (val: string) => {
    updateAndSaveChecklist({
      ...checklist,
      remarks: val,
      updatedAt: new Date().toISOString(),
    });
  };

  // Calculations
  const morningDone = checklist.morningTasks.filter((t) => t.completed).length;
  const morningTotal = checklist.morningTasks.length;
  const morningPercent = morningTotal > 0 ? Math.round((morningDone / morningTotal) * 100) : 0;

  const afternoonDone = checklist.afternoonTasks.filter((t) => t.completed).length;
  const afternoonTotal = checklist.afternoonTasks.length;
  const afternoonPercent = afternoonTotal > 0 ? Math.round((afternoonDone / afternoonTotal) * 100) : 0;

  const overallDone = morningDone + afternoonDone;
  const overallTotal = morningTotal + afternoonTotal;
  const overallPercent = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

  // Formatting date display (Thai format e.g. 02/08/2569)
  const formatThaiDateDisplay = (dateString: string) => {
    try {
      const [y, m, d] = dateString.split('-');
      const thaiYear = parseInt(y, 10) + 543;
      return `${d}/${m}/${thaiYear}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatThaiFullDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  // Filter tasks by search query
  const filterTasks = (tasks: ChecklistTask[]) => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.staff.toLowerCase().includes(q));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Printable Document Sheet (Hidden on screen, Visible only in Print Mode) */}
      <div className="hidden print:block print:p-0 text-slate-900 bg-white font-sans text-xs">
        <style>{`
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
              font-size: 10px !important;
              line-height: 1.2 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-break-inside-avoid {
              break-inside: avoid;
            }
          }
        `}</style>

        {/* Paper Document Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-black">
          <div className="flex items-center gap-3">
            <NanSeasonsLogo className="h-10" />
            <div>
              <h1 className="text-base font-bold text-black uppercase tracking-tight">
                Front Office Check List
              </h1>
              <p className="text-[10px] text-gray-700">Nan Seasons Boutique Resort</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold border border-black px-3 py-1 rounded-xs inline-block">
              Date: <span className="underline font-mono">{checklist.dateDisplay || formatThaiDateDisplay(selectedDate)}</span>
            </div>
          </div>
        </div>

        {/* Paper 2-Column Table Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Morning Shift Table */}
          <div className="border border-black p-1.5 rounded-xs">
            <div className="bg-amber-100 font-bold border border-black p-1 text-center text-xs mb-1 uppercase">
              Morning Shift
            </div>
            <table className="w-full text-[9px] border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="border-r border-black p-0.5 text-center w-8">Staff</th>
                  <th className="p-0.5 text-left">Morning Check List</th>
                </tr>
              </thead>
              <tbody>
                {checklist.morningTasks.map((task, i) => (
                  <tr key={task.id} className="border-b border-gray-300">
                    <td className="border-r border-black p-0.5 text-center font-bold">
                      {task.staff || (task.completed ? '✓' : '')}
                    </td>
                    <td className="p-0.5 flex items-center justify-between gap-1">
                      <span className={task.completed ? 'line-through text-gray-600' : ''}>
                        {i + 1}. {task.title}
                      </span>
                      {task.completed && <span className="font-bold text-[8px]">[✓]</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Afternoon Shift Table */}
          <div className="border border-black p-1.5 rounded-xs">
            <div className="bg-indigo-100 font-bold border border-black p-1 text-center text-xs mb-1 uppercase">
              Afternoon Shift
            </div>
            <table className="w-full text-[9px] border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100 border-b border-black">
                  <th className="border-r border-black p-0.5 text-center w-8">Staff</th>
                  <th className="p-0.5 text-left">Afternoon Check List</th>
                </tr>
              </thead>
              <tbody>
                {checklist.afternoonTasks.map((task, i) => (
                  <tr key={task.id} className="border-b border-gray-300">
                    <td className="border-r border-black p-0.5 text-center font-bold">
                      {task.staff || (task.completed ? '✓' : '')}
                    </td>
                    <td className="p-0.5 flex items-center justify-between gap-1">
                      <span className={task.completed ? 'line-through text-gray-600' : ''}>
                        {i + 1}. {task.title}
                      </span>
                      {task.completed && <span className="font-bold text-[8px]">[✓]</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paper Remarks Bottom Section */}
        <div className="mt-2 border border-black p-1.5 rounded-xs">
          <div className="font-bold text-[10px] mb-0.5 border-b border-black pb-0.5">Remark:</div>
          <div className="min-h-[40px] text-[9.5px] whitespace-pre-wrap font-mono">
            {checklist.remarks || '***เช็คขนมปังเผื่อขายด้วยค่ะ** // สรุปจำนวนอาหารเช้า...'}
          </div>
        </div>
      </div>

      {/* Interactive Digital Web View (Hidden on print) */}
      <div className="no-print space-y-5">
        {/* Top Control Header Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            {/* Title */}
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500 text-white rounded-xl shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    Checklist Front Office
                    <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      ประจำวัน
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    แบบฟอร์มบันทึกงานประจำกะเช้า & กะบ่าย (Front Office Daily Shift Checklist)
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-all shadow-xs"
                title="พิมพ์เอกสาร A4 หรือ บันทึกเป็น PDF"
              >
                <Printer className="w-4 h-4 text-orange-400" />
                <span>พิมพ์ / PDF (A4)</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
                title="รีเซ็ต Checklist วันนี้เป็นค่าเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>รีเซ็ตค่าเริ่มต้น</span>
              </button>
            </div>
          </div>

          {/* Date Picker & Shift Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            {/* Date Navigator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
                <Calendar className="w-4 h-4 text-orange-500" />
                วันที่:
              </span>

              <div className="flex items-center bg-white rounded-xl border border-slate-300 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                  title="วันก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
                />

                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                  title="วันถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-xl border border-orange-200 transition-all shadow-2xs"
              >
                วันนี้
              </button>

              <span className="text-xs text-slate-500 font-medium hidden sm:inline-block ml-1">
                ({formatThaiFullDate(selectedDate)})
              </span>
            </div>

            {/* Shift Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารายการ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Shift Tabs Filter */}
              <div className="inline-flex bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewShift('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    viewShift === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทั้งหมด (Side-by-side)
                </button>
                <button
                  type="button"
                  onClick={() => setViewShift('morning')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    viewShift === 'morning'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  กะเช้า ({morningDone}/{morningTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setViewShift('afternoon')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    viewShift === 'afternoon'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-800 hover:bg-indigo-50'
                  }`}
                >
                  กะบ่าย ({afternoonDone}/{afternoonTotal})
                </button>
              </div>
            </div>
          </div>

          {/* Overall Progress Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Morning Progress Box */}
            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Morning Shift (กะเช้า)
                </span>
                <span className="text-xs font-extrabold text-amber-700 font-mono">
                  {morningDone} / {morningTotal} ({morningPercent}%)
                </span>
              </div>
              <div className="w-full bg-amber-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${morningPercent}%` }}
                />
              </div>
            </div>

            {/* Afternoon Progress Box */}
            <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Afternoon Shift (กะบ่าย)
                </span>
                <span className="text-xs font-extrabold text-indigo-700 font-mono">
                  {afternoonDone} / {afternoonTotal} ({afternoonPercent}%)
                </span>
              </div>
              <div className="w-full bg-indigo-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${afternoonPercent}%` }}
                />
              </div>
            </div>

            {/* Total Overall Progress Box */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  รวมความคืบหน้าทั้งหมด
                </span>
                <span className="text-xs font-extrabold text-emerald-700 font-mono">
                  {overallDone} / {overallTotal} ({overallPercent}%)
                </span>
              </div>
              <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shift Checklist Columns Section */}
        <div
          className={`grid gap-6 ${
            viewShift === 'all'
              ? 'grid-cols-1 lg:grid-cols-2'
              : 'grid-cols-1 max-w-4xl mx-auto'
          }`}
        >
          {/* ========================================================= */}
          {/* MORNING SHIFT COLUMN */}
          {/* ========================================================= */}
          {(viewShift === 'all' || viewShift === 'morning') && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
              {/* Column Header */}
              <div className="bg-amber-500 text-white p-3.5 px-4 flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-extrabold uppercase">
                      Morning
                    </span>
                    Check List (กะเช้า)
                  </h3>
                  <p className="text-[11px] text-amber-100">รายการงานก่อนเวลา 14:00 น.</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCheckAll('morning')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUncheckAll('morning')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-black/20 hover:bg-black/30 text-white rounded-lg transition-colors"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              {/* Task Items List */}
              <div className="p-3 space-y-1.5 flex-1 max-h-[620px] overflow-y-auto">
                {filterTasks(checklist.morningTasks).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    ไม่พบรายการงานที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filterTasks(checklist.morningTasks).map((task, idx) => (
                    <div
                      key={task.id}
                      className={`group p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        task.completed
                          ? 'bg-amber-50/40 border-amber-200/60'
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-amber-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask('morning', task.id)}
                        className={`mt-0.5 p-0.5 rounded-md transition-colors shrink-0 ${
                          task.completed ? 'text-amber-600' : 'text-slate-400 hover:text-amber-500'
                        }`}
                      >
                        {task.completed ? (
                          <CheckSquare className="w-5 h-5 fill-amber-100" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Number & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <span
                            onClick={() => toggleTask('morning', task.id)}
                            className={`text-xs cursor-pointer select-none font-medium leading-tight ${
                              task.completed
                                ? 'line-through text-slate-400 font-normal'
                                : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Optional completion timestamp */}
                        {task.completed && task.updatedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded-md mt-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {task.updatedAt} น.
                          </span>
                        )}
                      </div>

                      {/* Staff Input Field */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            Staff
                          </span>
                          <input
                            type="text"
                            placeholder="Staff"
                            value={task.staff || ''}
                            onChange={(e) => updateTaskField('morning', task.id, 'staff', e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-md focus:border-amber-500 focus:outline-hidden uppercase"
                          />
                        </div>

                        {/* Delete custom task button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask('morning', task.id)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Custom Task Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/80">
                {isAddingMorningTask ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่องานใหม่..."
                      value={newMorningTitle}
                      onChange={(e) => setNewMorningTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask('morning')}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomTask('morning')}
                      className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                    >
                      เพิ่ม
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingMorningTask(false)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingMorningTask(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-700 bg-amber-100/50 hover:bg-amber-100 border border-dashed border-amber-300 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มรายการงานกะเช้า</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* AFTERNOON SHIFT COLUMN */}
          {/* ========================================================= */}
          {(viewShift === 'all' || viewShift === 'afternoon') && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
              {/* Column Header */}
              <div className="bg-indigo-600 text-white p-3.5 px-4 flex items-center justify-between shadow-xs">
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-extrabold uppercase">
                      Afternoon
                    </span>
                    Check List (กะบ่าย)
                  </h3>
                  <p className="text-[11px] text-indigo-100">รายการงานก่อนเวลา 20:30 น.</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCheckAll('afternoon')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                  >
                    เลือกทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUncheckAll('afternoon')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-black/20 hover:bg-black/30 text-white rounded-lg transition-colors"
                  >
                    ยกเลิกทั้งหมด
                  </button>
                </div>
              </div>

              {/* Task Items List */}
              <div className="p-3 space-y-1.5 flex-1 max-h-[620px] overflow-y-auto">
                {filterTasks(checklist.afternoonTasks).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    ไม่พบรายการงานที่ตรงกับการค้นหา
                  </div>
                ) : (
                  filterTasks(checklist.afternoonTasks).map((task, idx) => (
                    <div
                      key={task.id}
                      className={`group p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                        task.completed
                          ? 'bg-indigo-50/40 border-indigo-200/60'
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-indigo-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask('afternoon', task.id)}
                        className={`mt-0.5 p-0.5 rounded-md transition-colors shrink-0 ${
                          task.completed ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-500'
                        }`}
                      >
                        {task.completed ? (
                          <CheckSquare className="w-5 h-5 fill-indigo-100" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Number & Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <span
                            onClick={() => toggleTask('afternoon', task.id)}
                            className={`text-xs cursor-pointer select-none font-medium leading-tight ${
                              task.completed
                                ? 'line-through text-slate-400 font-normal'
                                : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Optional completion timestamp */}
                        {task.completed && task.updatedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-100/60 px-1.5 py-0.2 rounded-md mt-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            {task.updatedAt} น.
                          </span>
                        )}
                      </div>

                      {/* Staff Input Field */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            Staff
                          </span>
                          <input
                            type="text"
                            placeholder="Staff"
                            value={task.staff || ''}
                            onChange={(e) => updateTaskField('afternoon', task.id, 'staff', e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-md focus:border-indigo-500 focus:outline-hidden uppercase"
                          />
                        </div>

                        {/* Delete custom task button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask('afternoon', task.id)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Custom Task Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/80">
                {isAddingAfternoonTask ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่องานใหม่..."
                      value={newAfternoonTitle}
                      onChange={(e) => setNewAfternoonTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask('afternoon')}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomTask('afternoon')}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      เพิ่ม
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAfternoonTask(false)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingAfternoonTask(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-100/50 hover:bg-indigo-100 border border-dashed border-indigo-300 rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มรายการงานกะบ่าย</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remarks Card at Bottom */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-orange-500" />
            หมายเหตุ / ข้อความส่งเวรประจำวัน (Remark)
          </label>
          <textarea
            rows={3}
            value={checklist.remarks || ''}
            onChange={(e) => handleRemarksChange(e.target.value)}
            placeholder="เช่น ***เช็คขนมปังเผื่อขายด้วยค่ะ** // สรุปจำนวนอาหารเช้า..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono text-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
