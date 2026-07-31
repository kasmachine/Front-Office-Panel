import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { CashCountSheet } from './components/CashCountSheet';
import { ReceiptSubstituteSheet } from './components/ReceiptSubstituteSheet';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { StaffManagerModal } from './components/StaffManagerModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { CashCountData, ReceiptSubstituteData } from './types';
import { getInitialCashCountData, getInitialReceiptData } from './data/defaults';
import { exportToPdf, printDocument } from './utils/pdfExport';
import { downloadJsonFile, parseJsonFile } from './utils/jsonExport';
import {
  saveCashCountToFirebase,
  subscribeCashCounts,
  deleteCashCountFromFirebase,
  saveReceiptToFirebase,
  subscribeReceipts,
  deleteReceiptFromFirebase,
  testConnection,
  saveActiveDraftToFirebase,
  subscribeActiveDraft,
  subscribeStaffList,
  subscribeCategories,
  getIsQuotaExceeded,
} from './lib/firebase';
import { syncMinusExpensesToReceipt } from './utils/syncUtils';
import { CheckCircle2, Info, Users, FolderTree, Cloud, Settings, Printer, Download, RefreshCw, ChevronDown, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cashCount' | 'receiptSubstitute'>('cashCount');

  // Active form states
  const [cashCountData, setCashCountData] = useState<CashCountData>(() => {
    const today = new Date();
    const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const saved = localStorage.getItem('nan_seasons_current_cash');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, date: todayCashDate };
      } catch (e) { /* ignore */ }
    }
    return getInitialCashCountData();
  });

  const [receiptData, setReceiptData] = useState<ReceiptSubstituteData>(() => {
    const today = new Date();
    const todayReceiptDate = today.toISOString().split('T')[0];
    const saved = localStorage.getItem('nan_seasons_current_receipt');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          startDate: todayReceiptDate,
          endDate: todayReceiptDate,
        };
      } catch (e) { /* ignore */ }
    }
    return getInitialReceiptData();
  });

  // History storage states (Synced with Firebase Firestore & LocalStorage)
  const [savedCashCounts, setSavedCashCounts] = useState<CashCountData[]>(() => {
    try {
      const local = localStorage.getItem('nan_seasons_history_cash');
      if (local) return JSON.parse(local);
    } catch (e) { /* ignore */ }
    return [];
  });
  const [savedReceipts, setSavedReceipts] = useState<ReceiptSubstituteData[]>(() => {
    try {
      const local = localStorage.getItem('nan_seasons_history_receipt');
      if (local) return JSON.parse(local);
    } catch (e) { /* ignore */ }
    return [];
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);

  // Close print menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(e.target as Node)) {
        setIsPrintMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Custom event listener for category management
  useEffect(() => {
    const handleOpenCategories = () => setIsCategoryManagerOpen(true);
    window.addEventListener('open-manage-categories', handleOpenCategories);
    return () => window.removeEventListener('open-manage-categories', handleOpenCategories);
  }, []);

  // Test Firestore Connection on Boot
  useEffect(() => {
    testConnection();
  }, []);

  // Ensure date is set to current date (today) on load
  useEffect(() => {
    const today = new Date();
    const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const todayReceiptDate = today.toISOString().split('T')[0];

    setCashCountData((prev) => {
      if (prev.date !== todayCashDate) {
        return { ...prev, date: todayCashDate };
      }
      return prev;
    });

    setReceiptData((prev) => {
      if (prev.startDate !== todayReceiptDate || prev.endDate !== todayReceiptDate) {
        return { ...prev, startDate: todayReceiptDate, endDate: todayReceiptDate };
      }
      return prev;
    });
  }, []);

  // Sync saved history to LocalStorage backup
  useEffect(() => {
    try {
      localStorage.setItem('nan_seasons_history_cash', JSON.stringify(savedCashCounts));
    } catch (e) { /* ignore */ }
  }, [savedCashCounts]);

  useEffect(() => {
    try {
      localStorage.setItem('nan_seasons_history_receipt', JSON.stringify(savedReceipts));
    } catch (e) { /* ignore */ }
  }, [savedReceipts]);

  // Subscribe to Firebase Firestore real-time updates for history records, staff list & categories
  useEffect(() => {
    const unsubCash = subscribeCashCounts((firebaseItems) => {
      if (firebaseItems && firebaseItems.length > 0) {
        setSavedCashCounts(firebaseItems);
      }
    });

    const unsubReceipts = subscribeReceipts((firebaseItems) => {
      if (firebaseItems && firebaseItems.length > 0) {
        setSavedReceipts(firebaseItems);
      }
    });

    const unsubStaff = subscribeStaffList((remoteStaff) => {
      if (remoteStaff && remoteStaff.length > 0) {
        try {
          localStorage.setItem('nan_seasons_staff_list_v1', JSON.stringify(remoteStaff));
        } catch (e) { /* ignore */ }
      }
    });

    const unsubCats = subscribeCategories((remoteCats) => {
      if (remoteCats && (remoteCats.minus.length > 0 || remoteCats.plus.length > 0)) {
        try {
          localStorage.setItem('nan_seasons_expense_categories_v1', JSON.stringify(remoteCats));
        } catch (e) { /* ignore */ }
      }
    });

    return () => {
      unsubCash();
      unsubReceipts();
      unsubStaff();
      unsubCats();
    };
  }, []);

  // Realtime subscription for Active Draft (Cash Count) across devices
  useEffect(() => {
    const unsub = subscribeActiveDraft('cashCount', (remoteData) => {
      if (!remoteData) return;
      const { lastModifiedAt, ...cleanData } = remoteData;
      const today = new Date();
      const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      setCashCountData((prev) => {
        const updated = { ...(cleanData as CashCountData), date: todayCashDate };
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          return updated;
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // Realtime subscription for Active Draft (Receipt Substitute) across devices
  useEffect(() => {
    const unsub = subscribeActiveDraft('receiptSubstitute', (remoteData) => {
      if (!remoteData) return;
      const { lastModifiedAt, ...cleanData } = remoteData;
      const today = new Date();
      const todayReceiptDate = today.toISOString().split('T')[0];
      setReceiptData((prev) => {
        const updated = {
          ...(cleanData as ReceiptSubstituteData),
          startDate: todayReceiptDate,
          endDate: todayReceiptDate,
        };
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          return updated;
        }
        return prev;
      });
    });
    return () => unsub();
  }, []);

  // Auto save draft to localStorage & Firebase real-time draft (2500ms debounce)
  useEffect(() => {
    localStorage.setItem('nan_seasons_current_cash', JSON.stringify(cashCountData));
    if (getIsQuotaExceeded()) return;
    const timer = setTimeout(() => {
      saveActiveDraftToFirebase('cashCount', cashCountData);
    }, 2500);
    return () => clearTimeout(timer);
  }, [cashCountData]);

  useEffect(() => {
    localStorage.setItem('nan_seasons_current_receipt', JSON.stringify(receiptData));
    if (getIsQuotaExceeded()) return;
    const timer = setTimeout(() => {
      saveActiveDraftToFirebase('receiptSubstitute', receiptData);
    }, 2500);
    return () => clearTimeout(timer);
  }, [receiptData]);

  // Automatically pull minus expenses (-) from CashCountSheet to ReceiptSubstituteSheet
  useEffect(() => {
    setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, prev));
  }, [cashCountData.expensesIn, cashCountData.expensesOut, cashCountData.date]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSaveRecord = async () => {
    if (activeTab === 'cashCount') {
      const missingIn = !cashCountData.staffIn?.trim();
      const missingOut = !cashCountData.staffOut?.trim();

      if (missingIn && missingOut) {
        showToast('⚠️ ไม่สามารถบันทึกได้: กรุณากรอกชื่อพนักงานนับเงินเข้า (Staff IN) และนับเงินออก (Staff OUT)');
        return;
      } else if (missingIn) {
        showToast('⚠️ ไม่สามารถบันทึกได้: กรุณากรอกชื่อพนักงานนับเงินเข้า (Staff IN)');
        return;
      } else if (missingOut) {
        showToast('⚠️ ไม่สามารถบันทึกได้: กรุณากรอกชื่อพนักงานนับเงินออกเมื่อเลิกงาน (Staff OUT)');
        return;
      }
    }

    setIsFirebaseSyncing(true);
    try {
      if (activeTab === 'cashCount') {
        const recordToSave = { ...cashCountData, id: cashCountData.id || `cash-${Date.now()}`, createdAt: Date.now() };
        await saveCashCountToFirebase(recordToSave);
        setSavedCashCounts((prev) => [recordToSave, ...prev.filter((c) => c.id !== recordToSave.id)]);
        showToast('บันทึกตารางนับเงินลงใน Firebase และประวัติเรียบร้อยแล้ว');
      } else {
        const recordToSave = { ...receiptData, id: receiptData.id || `receipt-${Date.now()}`, createdAt: Date.now() };
        await saveReceiptToFirebase(recordToSave);
        setSavedReceipts((prev) => [recordToSave, ...prev.filter((r) => r.id !== recordToSave.id)]);
        showToast('บันทึกใบรับรองแทนใบเสร็จลงใน Firebase และประวัติเรียบร้อยแล้ว');
      }
    } catch (err) {
      console.error('Error saving to Firebase:', err);
      showToast('บันทึกลงประวัติสำเร็จ (เชื่อมต่อ Firebase ไม่สมบูรณ์)');
    } finally {
      setIsFirebaseSyncing(false);
    }
  };

  const handleDownloadJson = () => {
    if (activeTab === 'cashCount') {
      const filename = `CashCount_${cashCountData.shift}_${cashCountData.date.replace(/\//g, '-')}.json`;
      downloadJsonFile(cashCountData, filename);
      showToast(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`);
    } else {
      const filename = `ReceiptSubstitute_${receiptData.startDate.replace(/\//g, '-')}.json`;
      downloadJsonFile(receiptData, filename);
      showToast(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`);
    }
  };

  const handleImportJson = async (file: File) => {
    try {
      const parsedData = await parseJsonFile<any>(file);

      if (parsedData.denominations && Array.isArray(parsedData.denominations)) {
        // It's a CashCountData
        setCashCountData(parsedData as CashCountData);
        setActiveTab('cashCount');
        showToast('นำเข้าข้อมูลตารางนับเงินจากไฟล์ JSON เรียบร้อยแล้ว');
      } else if (parsedData.items && Array.isArray(parsedData.items)) {
        // It's a ReceiptSubstituteData
        setReceiptData(parsedData as ReceiptSubstituteData);
        setActiveTab('receiptSubstitute');
        showToast('นำเข้าข้อมูลใบรับรองแทนใบเสร็จจากไฟล์ JSON เรียบร้อยแล้ว');
      } else if (parsedData.cashCounts || parsedData.receiptSubstitutes) {
        // It's a full history backup
        if (Array.isArray(parsedData.cashCounts)) {
          setSavedCashCounts(parsedData.cashCounts);
        }
        if (Array.isArray(parsedData.receiptSubstitutes)) {
          setSavedReceipts(parsedData.receiptSubstitutes);
        }
        showToast('นำเข้าชุดประวัติเอกสารทั้งหมดจากไฟล์ JSON เรียบร้อยแล้ว');
      } else {
        showToast('ไม่พบรูปแบบข้อมูลที่รองรับในไฟล์ JSON');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ JSON');
    }
  };

  const handleDeleteCashCount = async (id: string) => {
    try {
      await deleteCashCountFromFirebase(id);
    } catch (e) {
      /* ignore */
    }
    setSavedCashCounts(savedCashCounts.filter((c) => c.id !== id));
    showToast('ลบรายการเรียบร้อยแล้ว');
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      await deleteReceiptFromFirebase(id);
    } catch (e) {
      /* ignore */
    }
    setSavedReceipts(savedReceipts.filter((r) => r.id !== id));
    showToast('ลบรายการเรียบร้อยแล้ว');
  };

  const handleExportPdf = async () => {
    const elementId = activeTab === 'cashCount' ? 'cash-count-document' : 'receipt-substitute-document';
    const filename = activeTab === 'cashCount'
      ? `ตารางนับเงิน_NanSeasons_${cashCountData.shift}_${cashCountData.date.replace(/\//g, '-')}.pdf`
      : `ใบรับรองแทนใบเสร็จ_NanSeasons_${receiptData.startDate.replace(/\//g, '-')}.pdf`;

    showToast('กำลังเตรียมไฟล์ PDF กรุณารอสักครู่...');
    await exportToPdf(elementId, filename);
  };

  const handlePrint = () => {
    printDocument();
  };

  const handleResetCashCount = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลตารางนับเงินนี้ใช่หรือไม่?')) {
      const fresh = getInitialCashCountData();
      setCashCountData(fresh);
      saveActiveDraftToFirebase('cashCount', fresh);
      showToast('ล้างข้อมูลตารางนับเงินเรียบร้อย');
    }
  };

  const handleResetReceipt = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลใบรับรองแทนใบเสร็จนี้ใช่หรือไม่?')) {
      const fresh = getInitialReceiptData();
      setReceiptData(fresh);
      saveActiveDraftToFirebase('receiptSubstitute', fresh);
      showToast('ล้างข้อมูลใบรับรองแทนใบเสร็จเรียบร้อย');
    }
  };

  const handleStartNewShift = () => {
    if (activeTab === 'cashCount') {
      const today = new Date();
      const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

      const totalOut = cashCountData.denominations.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0);
      const totalIn = cashCountData.denominations.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0);
      let inheritedPrevBalance = totalOut > 0 ? totalOut : (totalIn > 0 ? totalIn : (cashCountData.beerPrevBalance || 0));
      const nextShift = cashCountData.shift === 'Early' ? 'Late' : 'Early';
      const formattedAmount = `THB ${inheritedPrevBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      if (
        window.confirm(
          `คุณต้องการล้างข้อมูลเพื่อเริ่มกะใหม่ใช่หรือไม่?\n\n` +
          `• ยอด Previous balance ยกมาจากกะก่อนหน้า: ${formattedAmount}\n` +
          `• ปรับกะใหม่เป็น: ${nextShift === 'Early' ? 'Early (กะเช้า)' : 'Late (กะบ่าย)'}\n\n` +
          `(จำนวนนับเงิน รายการรับ-จ่าย และชื่อพนักงานจะถูกล้างเพื่อเริ่มนับเงินกะใหม่)`
        )
      ) {
        const freshData: CashCountData = {
          ...getInitialCashCountData(),
          id: `cash-${Date.now()}`,
          date: todayCashDate,
          shift: nextShift,
          beerPrevBalance: inheritedPrevBalance,
        };
        setCashCountData(freshData);
        saveActiveDraftToFirebase('cashCount', freshData);
        showToast('ล้างข้อมูลเรียบร้อยแล้ว พร้อมเริ่มนับเงินกะใหม่');
      }
    } else {
      if (window.confirm('คุณต้องการล้างข้อมูลเพื่อเริ่มฉบับใหม่ใช่หรือไม่?')) {
        const freshReceipt = getInitialReceiptData();
        setReceiptData(freshReceipt);
        saveActiveDraftToFirebase('receiptSubstitute', freshReceipt);
        showToast('ล้างข้อมูลใบรับรองแทนใบเสร็จเรียบร้อยแล้ว');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Action Control Toolbar (Unified row for Manage Staff, Manage Topics, Save, Print/PDF) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:px-4 rounded-xl border border-slate-200 shadow-xs max-w-5xl mx-auto">
          {/* Left Management Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStaffManagerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              title="จัดการรายชื่อพนักงาน"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              จัดการรายชื่อพนักงาน
            </button>

            <button
              type="button"
              onClick={handleStartNewShift}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-lg shadow-xs transition-colors"
              title="ล้างข้อมูลตารางเพื่อเริ่มนับเงินกะใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              ล้างข้อมูลเพื่อเริ่มกะใหม่
            </button>

            <button
              type="button"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              title="จัดการหัวข้อรายการ (Expense & Income Topics)"
            >
              <FolderTree className="w-3.5 h-3.5 text-orange-600" />
              จัดการหัวข้อรายการ
            </button>

            {activeTab === 'receiptSubstitute' && (
              <button
                type="button"
                onClick={() => {
                  setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, prev));
                  showToast('ดึงรายการหัก (-) จากตารางนับเงินเรียบร้อยแล้ว');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-xs transition-colors"
                title="ดึงรายการหัก (-) จากตารางนับเงิน"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                ดึงรายการหัก (-)
              </button>
            )}
          </div>

          {/* Right Action Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveRecord}
              disabled={isFirebaseSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              title="บันทึกข้อมูลไปที่ Firebase และประวัติ"
            >
              <Cloud className={`w-3.5 h-3.5 ${isFirebaseSyncing ? 'animate-spin' : ''}`} />
              {isFirebaseSyncing ? 'กำลังบันทึก...' : 'บันทึก Firebase'}
            </button>

            <div className="h-4 w-[1px] bg-slate-200 mx-0.5 hidden sm:block"></div>

            {/* Combined Print / PDF Button */}
            <div className="relative" ref={printMenuRef}>
              <button
                type="button"
                onClick={() => setIsPrintMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs"
                title="พิมพ์เอกสาร หรือส่งออกเป็นไฟล์ PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์ / PDF</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPrintMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrint();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <div className="font-bold">พิมพ์เอกสาร (Print)</div>
                      <div className="text-[10px] text-slate-500 font-normal">สั่งพิมพ์ผ่านเครื่องพิมพ์</div>
                    </div>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handleExportPdf();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">ส่งออกเป็น PDF (Download)</div>
                      <div className="text-[10px] text-slate-500 font-normal">บันทึกเป็นไฟล์ PDF ลงเครื่อง</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'cashCount' ? (
          <CashCountSheet
            data={cashCountData}
            onChange={setCashCountData}
            onReset={handleResetCashCount}
            savedCashCounts={savedCashCounts}
            onOpenManageStaff={() => setIsStaffManagerOpen(true)}
            onOpenManageCategories={() => setIsCategoryManagerOpen(true)}
          />
        ) : (
          <ReceiptSubstituteSheet
            data={receiptData}
            onChange={setReceiptData}
            onReset={handleResetReceipt}
            cashCountData={cashCountData}
            onManualSync={() => {
              setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, prev));
              showToast('ดึงรายการหัก (-) จากตารางนับเงินเรียบร้อยแล้ว');
            }}
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-orange-500" />
          <span>ระบบนับเงิน & ใบรับรองแทนใบเสร็จ Front Office Panel | น่าน ซีซั่นส์ บูติก รีสอร์ท (Firebase Cloud Storage Enabled)</span>
        </div>
      </footer>

      {/* Staff Manager Modal */}
      <StaffManagerModal
        isOpen={isStaffManagerOpen}
        onClose={() => setIsStaffManagerOpen(false)}
      />

      {/* Expense/Income Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
      />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedCashCounts={savedCashCounts}
        savedReceipts={savedReceipts}
        onLoadCashCount={setCashCountData}
        onLoadReceipt={setReceiptData}
        onDeleteCashCount={handleDeleteCashCount}
        onDeleteReceipt={handleDeleteReceipt}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeTab={activeTab}
        onDownloadJson={handleDownloadJson}
        onImportJson={handleImportJson}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenManageStaff={() => setIsStaffManagerOpen(true)}
        onOpenManageCategories={() => setIsCategoryManagerOpen(true)}
        onClearDraft={() => {
          if (activeTab === 'cashCount') {
            handleResetCashCount();
          } else {
            handleResetReceipt();
          }
        }}
        isFirebaseSyncing={isFirebaseSyncing}
      />
    </div>
  );
}

