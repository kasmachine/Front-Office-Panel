import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CashCountSheet } from './components/CashCountSheet';
import { ReceiptSubstituteSheet } from './components/ReceiptSubstituteSheet';
import { DailyRevenueSheet } from './components/DailyRevenueSheet';
import { FrontOfficeChecklist } from './components/FrontOfficeChecklist';
import { FrontOfficeManual } from './components/FrontOfficeManual';
import { WhatsNew } from './components/WhatsNew';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { StaffManagerModal } from './components/StaffManagerModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { VatCalculatorModal } from './components/VatCalculatorModal';
import { CashCountData, ReceiptSubstituteData, ReceiptSubstituteItem, MonthlyRevenueData, RevenueHistoryRecord } from './types';
import { getInitialCashCountData, getInitialReceiptData } from './data/defaults';
import { safeLocalStorage } from './utils/storage';
import { exportToPdf, printDocument } from './utils/pdfExport';
import { downloadJsonFile, parseJsonFile } from './utils/jsonExport';
import {
  saveCashCountToFirebase,
  subscribeCashCounts,
  deleteCashCountFromFirebase,
  saveReceiptToFirebase,
  subscribeReceipts,
  deleteReceiptFromFirebase,
  subscribeRevenueHistory,
  subscribeAllMonthlyRevenues,
  deleteRevenueHistoryFromFirebase,
  saveMonthlyRevenueToFirebase,
  saveRevenueHistoryToFirebase,
  createRevenueHistoryRecord,
  testConnection,
  initAuth,
  saveActiveDraftToFirebase,
  subscribeActiveDraft,
  subscribeBroadcastDraft,
  fetchActiveDraftFromFirebase,
  subscribeStaffList,
  subscribeCategories,
  getIsQuotaExceeded,
  resetQuotaExceeded,
  canonicalStringify,
} from './lib/firebase';
import { syncMinusExpensesToReceipt, isWithin7Days, formatDateToDisplay, getTodayFormatted } from './utils/syncUtils';
import { CheckCircle2, Info, Users, FolderTree, Cloud, Settings, Printer, Download, RefreshCw, ChevronDown, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist' | 'whatsNew' | 'frontOfficeManual'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active form states
  const [cashCountData, setCashCountData] = useState<CashCountData>(() => {
    const today = new Date();
    const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const saved = safeLocalStorage.getItem('nan_seasons_current_cash');
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
    const saved = safeLocalStorage.getItem('nan_seasons_current_receipt');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          requesterName: parsed.requesterName || 'นางสาว ขวัญทิชา ตั้งเสรีกล',
          approverName: (!parsed.approverName || parsed.approverName === 'นาย กษม โพธิ์ประเสริฐ') ? 'นายเกษม มนตรี' : parsed.approverName,
          approverPosition: parsed.approverPosition || 'เจ้าของกิจการ',
          startDate: todayReceiptDate,
          endDate: todayReceiptDate,
        };
      } catch (e) { /* ignore */ }
    }
    return getInitialReceiptData();
  });

  // History storage states (Synced with Firebase Firestore & LocalStorage - Retains 7 Days)
  const [savedCashCounts, setSavedCashCounts] = useState<CashCountData[]>(() => {
    try {
      const local = safeLocalStorage.getItem('nan_seasons_history_cash');
      if (local) {
        const items: CashCountData[] = JSON.parse(local);
        return items.filter((c) => isWithin7Days(c.createdAt, c.date));
      }
    } catch (e) { /* ignore */ }
    return [];
  });
  const [savedReceipts, setSavedReceipts] = useState<ReceiptSubstituteData[]>(() => {
    try {
      const local = safeLocalStorage.getItem('nan_seasons_history_receipt');
      if (local) {
        const items: ReceiptSubstituteData[] = JSON.parse(local);
        return items.filter((r) => isWithin7Days(r.createdAt, r.startDate));
      }
    } catch (e) { /* ignore */ }
    return [];
  });

  const [savedRevenueHistory, setSavedRevenueHistory] = useState<RevenueHistoryRecord[]>(() => {
    try {
      const local = safeLocalStorage.getItem('nan_seasons_revenue_history');
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) { /* ignore */ }
    return [];
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isVatModalOpen, setIsVatModalOpen] = useState(false);
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  const handleApplyVatToReceipt = (
    items: ReceiptSubstituteItem[],
    calcMode: 'exclusive' | 'inclusive' | 'sum',
    vatPercent: number
  ) => {
    setReceiptData((prev) => ({
      ...prev,
      items: [...prev.items, ...items],
    }));
    setActiveTab('receiptSubstitute');
    if (toastMessage !== undefined) {
      const modeText =
        calcMode === 'sum'
          ? 'รวมยอดที่เป็นภาษีแล้ว'
          : `คำนวณ VAT ${vatPercent}%`;
      setToastMessage(`ส่ง ${items.length} รายการ (${modeText}) ลงใบรับรองแทนใบเสร็จเรียบร้อยแล้ว`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Active Draft sync tracking refs to prevent typing overwrites & state echo loops
  const lastRemoteCashSerializedRef = useRef<string>('');
  const lastRemoteReceiptSerializedRef = useRef<string>('');
  const isRemoteDraftInitializedCash = useRef<boolean>(false);
  const isRemoteDraftInitializedReceipt = useRef<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'idle'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  });

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

  // Test Firestore Connection & Anonymous Auth on Boot
  useEffect(() => {
    initAuth();
    testConnection();
  }, []);

  // Ensure date is set to current date (today) on load if missing
  useEffect(() => {
    const today = new Date();
    const todayCashDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const todayReceiptDate = today.toISOString().split('T')[0];

    setCashCountData((prev) => {
      if (!prev.date) {
        return { ...prev, date: todayCashDate };
      }
      return prev;
    });

    setReceiptData((prev) => {
      if (!prev.startDate || !prev.endDate) {
        return { ...prev, startDate: prev.startDate || todayReceiptDate, endDate: prev.endDate || todayReceiptDate };
      }
      return prev;
    });
  }, []);

  // Sync saved history to LocalStorage backup
  useEffect(() => {
    try {
      safeLocalStorage.setItem('nan_seasons_history_cash', JSON.stringify(savedCashCounts));
    } catch (e) { /* ignore */ }
  }, [savedCashCounts]);

  useEffect(() => {
    try {
      safeLocalStorage.setItem('nan_seasons_history_receipt', JSON.stringify(savedReceipts));
    } catch (e) { /* ignore */ }
  }, [savedReceipts]);

  // Subscribe to Firebase Firestore real-time updates for history records, staff list & categories
  useEffect(() => {
    initAuth().catch(() => {});

    const unsubCash = subscribeCashCounts((firebaseItems) => {
      if (firebaseItems) {
        const valid = firebaseItems.filter((c) => isWithin7Days(c.createdAt, c.date));
        setSavedCashCounts(valid);

        // Auto-purge records older than 7 days from Firebase
        firebaseItems.forEach((c) => {
          if (!isWithin7Days(c.createdAt, c.date) && c.id) {
            deleteCashCountFromFirebase(c.id).catch(() => {});
          }
        });
      }
    });

    const unsubReceipts = subscribeReceipts((firebaseItems) => {
      if (firebaseItems) {
        const valid = firebaseItems.filter((r) => isWithin7Days(r.createdAt, r.startDate));
        setSavedReceipts(valid);

        // Auto-purge records older than 7 days from Firebase
        firebaseItems.forEach((r) => {
          if (!isWithin7Days(r.createdAt, r.startDate) && r.id) {
            deleteReceiptFromFirebase(r.id).catch(() => {});
          }
        });
      }
    });

    const unsubStaff = subscribeStaffList((remoteStaff) => {
      if (remoteStaff) {
        try {
          safeLocalStorage.setItem('nan_seasons_staff_list_v1', JSON.stringify(remoteStaff));
          window.dispatchEvent(new Event('storage'));
        } catch (e) { /* ignore */ }
      }
    });

    const unsubCats = subscribeCategories((remoteCats) => {
      if (remoteCats) {
        try {
          safeLocalStorage.setItem('nan_seasons_expense_categories_v1', JSON.stringify(remoteCats));
          window.dispatchEvent(new Event('storage'));
        } catch (e) { /* ignore */ }
      }
    });

    const unsubAllRevenues = subscribeAllMonthlyRevenues((remoteRevenues) => {
      if (remoteRevenues && remoteRevenues.length > 0) {
        remoteRevenues.forEach((revData) => {
          if (revData && revData.year && revData.month) {
            const docKey = `revenue-${revData.year}-${String(revData.month).padStart(2, '0')}`;
            try {
              safeLocalStorage.setItem(`nan_seasons_${docKey}`, JSON.stringify(revData));
            } catch (e) { /* ignore */ }
            const histItem = createRevenueHistoryRecord(revData);
            saveRevenueHistoryToFirebase(histItem);
          }
        });
      }
    });

    const unsubRevHist = subscribeRevenueHistory((firebaseItems) => {
      let mergedHist: RevenueHistoryRecord[] = firebaseItems ? [...firebaseItems] : [];

      // Always scan localStorage keys starting with nan_seasons_revenue- for any months stored locally
      try {
        const keys = safeLocalStorage.getAllKeys();
        for (const key of keys) {
          if (key && key.startsWith('nan_seasons_revenue-')) {
            const raw = safeLocalStorage.getItem(key);
            if (raw) {
              try {
                const revData: MonthlyRevenueData = JSON.parse(raw);
                if (revData && revData.year && revData.month) {
                  const histItem = createRevenueHistoryRecord(revData);
                  const existsIndex = mergedHist.findIndex(h => h.year === revData.year && h.month === revData.month);
                  if (existsIndex === -1) {
                    mergedHist.unshift(histItem);
                    saveRevenueHistoryToFirebase(histItem);
                  }
                }
              } catch (e) { /* ignore */ }
            }
          }
        }
      } catch (e) { /* ignore */ }

      // Sort history descending by year and month
      mergedHist.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      setSavedRevenueHistory(mergedHist);
      try {
        safeLocalStorage.setItem('nan_seasons_revenue_history', JSON.stringify(mergedHist));
      } catch (e) { /* ignore */ }
    });

    return () => {
      unsubCash();
      unsubReceipts();
      unsubStaff();
      unsubCats();
      unsubAllRevenues();
      unsubRevHist();
    };
  }, []);

  // Helper to apply cash count draft update from remote/broadcast
  const applyCashDraftUpdate = (remoteData: any) => {
    isRemoteDraftInitializedCash.current = true;
    if (!remoteData) return;

    const { lastModifiedAt, ...cleanData } = remoteData;
    const initialDefaults = getInitialCashCountData();
    const updated: CashCountData = {
      ...initialDefaults,
      ...(cleanData as CashCountData),
    };
    const serializedRemote = canonicalStringify(updated);

    lastRemoteCashSerializedRef.current = serializedRemote;
    setCashCountData((prev) => {
      if (canonicalStringify(prev) !== serializedRemote) {
        return updated;
      }
      return prev;
    });
  };

  // Helper to apply receipt substitute draft update from remote/broadcast
  const applyReceiptDraftUpdate = (remoteData: any) => {
    isRemoteDraftInitializedReceipt.current = true;
    if (!remoteData) return;

    const { lastModifiedAt, ...cleanData } = remoteData;
    const initialDefaults = getInitialReceiptData();
    const updated: ReceiptSubstituteData = {
      ...initialDefaults,
      ...(cleanData as ReceiptSubstituteData),
    };
    const serializedRemote = canonicalStringify(updated);

    lastRemoteReceiptSerializedRef.current = serializedRemote;
    setReceiptData((prev) => {
      if (canonicalStringify(prev) !== serializedRemote) {
        return updated;
      }
      return prev;
    });
  };

  // Instant multi-tab BroadcastChannel & Storage Event listener for tabs open on the same device
  useEffect(() => {
    const unsubBroadcast = subscribeBroadcastDraft((draftType, data) => {
      if (draftType === 'cashCount') {
        applyCashDraftUpdate(data);
      } else if (draftType === 'receiptSubstitute') {
        applyReceiptDraftUpdate(data);
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nan_seasons_current_cash' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyCashDraftUpdate(parsed);
        } catch (err) { /* ignore */ }
      } else if (e.key === 'nan_seasons_current_receipt' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyReceiptDraftUpdate(parsed);
        } catch (err) { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      unsubBroadcast();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Realtime subscription for Active Draft (Cash Count) across devices via Firestore
  useEffect(() => {
    const unsub = subscribeActiveDraft('cashCount', (remoteData, hasPendingWrites) => {
      if (hasPendingWrites) {
        isRemoteDraftInitializedCash.current = true;
        return;
      }
      applyCashDraftUpdate(remoteData);
    });
    return () => unsub();
  }, []);

  // Realtime subscription for Active Draft (Receipt Substitute) across devices via Firestore
  useEffect(() => {
    const unsub = subscribeActiveDraft('receiptSubstitute', (remoteData, hasPendingWrites) => {
      if (hasPendingWrites) {
        isRemoteDraftInitializedReceipt.current = true;
        return;
      }
      applyReceiptDraftUpdate(remoteData);
    });
    return () => unsub();
  }, []);

  // Manual sync handler to pull fresh draft state from server on demand
  const handleManualSync = async () => {
    setSaveStatus('saving');
    try {
      const [remoteCash, remoteReceipt] = await Promise.all([
        fetchActiveDraftFromFirebase('cashCount'),
        fetchActiveDraftFromFirebase('receiptSubstitute'),
      ]);
      if (remoteCash) applyCashDraftUpdate(remoteCash);
      if (remoteReceipt) applyReceiptDraftUpdate(remoteReceipt);
      const now = new Date();
      setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
      setSaveStatus('saved');
      setToastMessage('ดึงข้อมูล Real-time ล่าสุดเรียบร้อยแล้ว');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (e) {
      setSaveStatus('saved');
    }
  };

  // Auto save draft to localStorage & Firebase real-time (100ms debounce)
  useEffect(() => {
    safeLocalStorage.setItem('nan_seasons_current_cash', JSON.stringify(cashCountData));

    // CRITICAL: Do NOT push to Firebase if we haven't received initial remote state yet
    if (!isRemoteDraftInitializedCash.current) return;

    const currentSerialized = canonicalStringify(cashCountData);
    if (lastRemoteCashSerializedRef.current === currentSerialized) {
      return;
    }

    if (getIsQuotaExceeded()) return;

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await saveActiveDraftToFirebase('cashCount', cashCountData);
        // Also auto-save to history collection so every shift record is persisted in Firebase
        await saveCashCountToFirebase({
          ...cashCountData,
          id: cashCountData.id || `cash-${Date.now()}`,
          createdAt: cashCountData.createdAt || Date.now(),
        });
        lastRemoteCashSerializedRef.current = currentSerialized;
        const now = new Date();
        setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('saved');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [cashCountData]);

  useEffect(() => {
    safeLocalStorage.setItem('nan_seasons_current_receipt', JSON.stringify(receiptData));

    // CRITICAL: Do NOT push to Firebase if we haven't received initial remote state yet
    if (!isRemoteDraftInitializedReceipt.current) return;

    const currentSerialized = canonicalStringify(receiptData);
    if (lastRemoteReceiptSerializedRef.current === currentSerialized) {
      return;
    }

    if (getIsQuotaExceeded()) return;

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await saveActiveDraftToFirebase('receiptSubstitute', receiptData);
        lastRemoteReceiptSerializedRef.current = currentSerialized;
        const now = new Date();
        setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('saved');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [receiptData]);

  // Automatically pull minus expenses (-) from ALL shifts of the day into 1 combined ReceiptSubstituteSheet
  useEffect(() => {
    setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, savedCashCounts, prev));
  }, [cashCountData, savedCashCounts]);

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
        const displayDate = formatDateToDisplay(receiptData.startDate || getTodayFormatted());
        const dateKey = (receiptData.startDate || getTodayFormatted()).replace(/[/]/g, '-');
        const docId = `receipt-${dateKey}`;
        const recordToSave = {
          ...receiptData,
          id: docId,
          startDate: receiptData.startDate || getTodayFormatted(),
          endDate: receiptData.endDate || receiptData.startDate || getTodayFormatted(),
          createdAt: receiptData.createdAt || Date.now(),
          updatedAt: new Date().toISOString(),
        };
        await saveReceiptToFirebase(recordToSave);
        setSavedReceipts((prev) => [recordToSave, ...prev.filter((r) => r.id !== recordToSave.id)]);
        showToast(`บันทึกใบรับรองแทนใบเสร็จประจำวันที่ ${displayDate} ลงประวัติเรียบร้อยแล้ว`);
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

  const handleLoadRevenueHistory = (revData: MonthlyRevenueData) => {
    const docId = `revenue-${revData.year}-${String(revData.month).padStart(2, '0')}`;
    safeLocalStorage.setItem(`nan_seasons_${docId}`, JSON.stringify(revData));
    saveMonthlyRevenueToFirebase(revData);
    setActiveTab('dailyRevenue');
    showToast(`ดึงข้อมูล Revenue เดือน ${revData.monthName || `${revData.month}/${revData.year}`} เรียบร้อยแล้ว`);
  };

  const handleDeleteRevenueHistory = async (id: string) => {
    try {
      await deleteRevenueHistoryFromFirebase(id);
    } catch (e) {
      /* ignore */
    }
    setSavedRevenueHistory(savedRevenueHistory.filter((item) => item.id !== id));
    showToast('ลบรายการประวัติ Revenue เรียบร้อยแล้ว');
  };

  const handleExportPdf = async () => {
    // Auto-save current document state and signatures to Firebase & history on print/PDF
    try {
      await handleSaveRecord();
    } catch (e) {
      /* continue export even if save has warning */
    }

    const elementId = activeTab === 'cashCount' ? 'cash-count-document' : 'receipt-substitute-document';
    const filename = activeTab === 'cashCount'
      ? `ตารางนับเงิน_NanSeasons_${cashCountData.shift}_${cashCountData.date.replace(/\//g, '-')}.pdf`
      : `ใบรับรองแทนใบเสร็จ_NanSeasons_${receiptData.startDate.replace(/\//g, '-')}.pdf`;

    showToast('กำลังเตรียมไฟล์ PDF กรุณารอสักครู่...');
    await exportToPdf(elementId, filename);
  };

  const handlePrint = async () => {
    // Auto-save current document state and signatures to Firebase & history on print/PDF
    try {
      await handleSaveRecord();
    } catch (e) {
      /* continue print even if save has warning */
    }
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

  const handleStartNewShift = async () => {
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
          `คุณต้องการสลับเป็นกะใหม่ใช่หรือไม่?\n\n` +
          `• ยอด Previous balance ยกมาจากกะก่อนหน้า: ${formattedAmount}\n` +
          `• ปรับกะใหม่เป็น: ${nextShift === 'Early' ? 'Early (กะเช้า)' : 'Late (กะบ่าย)'}\n\n` +
          `(ระบบจะบันทึกข้อมูลกะปัจจุบันลงในประวัติ 7 วันอัตโนมัติก่อนเริ่มกะใหม่)`
        )
      ) {
        // Save current shift record to Firebase and history before creating fresh shift
        const currentRecord: CashCountData = {
          ...cashCountData,
          id: cashCountData.id || `cash-${Date.now()}`,
          createdAt: cashCountData.createdAt || Date.now(),
        };
        try {
          await saveCashCountToFirebase(currentRecord);
        } catch (e) {
          console.error(e);
        }
        setSavedCashCounts((prev) => [currentRecord, ...prev.filter((c) => c.id !== currentRecord.id)]);

        const existingNextShift = savedCashCounts.find((c) => c.date === todayCashDate && c.shift === nextShift);
        if (existingNextShift) {
          setCashCountData(existingNextShift);
          saveActiveDraftToFirebase('cashCount', existingNextShift);
          showToast(`สลับเป็นกะ ${nextShift === 'Early' ? 'Early (กะเช้า)' : 'Late (กะบ่าย)'} และดึงข้อมูลที่มีอยู่แล้วเรียบร้อย`);
        } else {
          const freshData: CashCountData = {
            ...getInitialCashCountData(),
            id: `cash-${Date.now()}`,
            date: todayCashDate,
            shift: nextShift,
            beerPrevBalance: inheritedPrevBalance,
            createdAt: Date.now(),
          };
          setCashCountData(freshData);
          saveActiveDraftToFirebase('cashCount', freshData);
          showToast('บันทึกกะเดิมลงประวัติ 7 วันเรียบร้อยแล้ว และพร้อมสำหรับเริ่มกะใหม่');
        }
      }
    } else {
      if (
        window.confirm(
          `คุณต้องการสลับเป็นฉบับใหม่ใช่หรือไม่?\n\n` +
          `(ระบบจะบันทึกเอกสารฉบับปัจจุบันลงในประวัติ 7 วันอัตโนมัติ)`
        )
      ) {
        const currentReceiptRecord: ReceiptSubstituteData = {
          ...receiptData,
          id: receiptData.id || `receipt-${Date.now()}`,
          createdAt: receiptData.createdAt || Date.now(),
        };
        try {
          await saveReceiptToFirebase(currentReceiptRecord);
        } catch (e) {
          console.error(e);
        }
        setSavedReceipts((prev) => [currentReceiptRecord, ...prev.filter((r) => r.id !== currentReceiptRecord.id)]);

        const freshReceipt = getInitialReceiptData();
        setReceiptData(freshReceipt);
        saveActiveDraftToFirebase('receiptSubstitute', freshReceipt);
        showToast('บันทึกฉบับเดิมลงประวัติ 7 วันเรียบร้อยแล้ว และพร้อมสำหรับฉบับใหม่');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar Navigation Menu */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenVatCalc={() => setIsVatModalOpen(true)}
        onManualSync={handleManualSync}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="flex-1 md:ml-64 min-h-screen flex flex-col w-full min-w-0">
        {/* Main Navigation Header Bar */}
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVatCalc={() => setIsVatModalOpen(true)}
          onManualSync={handleManualSync}
          saveStatus={saveStatus}
          lastSavedTime={lastSavedTime}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Main Content View Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Action Control Toolbar (Unified row for Manage Staff, Manage Topics, Save, Print/PDF) */}
        {activeTab !== 'dailyRevenue' && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:px-4 rounded-xl border border-slate-200 shadow-xs max-w-5xl mx-auto">
          {/* Left Management Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewShift}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-lg shadow-xs transition-colors"
              title="ล้างข้อมูลตารางเพื่อเริ่มนับเงินกะใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              ล้างข้อมูลเพื่อเริ่มกะใหม่
            </button>

            {activeTab === 'receiptSubstitute' && (
              <button
                type="button"
                onClick={() => {
                  setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, savedCashCounts, prev));
                  showToast('ดึงรายการหัก (-) จากตารางนับเงินทั้งสองกะเรียบร้อยแล้ว');
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 ${
                saveStatus === 'saving' || isFirebaseSyncing
                  ? 'bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="ระบบบันทึกข้อมูลอัตโนมัติแบบ Real-time ลง Firebase และเครื่องนี้"
            >
              <Cloud className={`w-3.5 h-3.5 ${saveStatus === 'saving' || isFirebaseSyncing ? 'animate-spin' : ''}`} />
              <span>
                {saveStatus === 'saving' || isFirebaseSyncing
                  ? 'กำลังบันทึกอัตโนมัติ...'
                  : 'บันทึกอัตโนมัติแล้ว'}
              </span>
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
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-semibold text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPrintMenuOpen(false);
                      handlePrint();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 flex items-center gap-2.5 transition-colors"
                  >
                    <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">พิมพ์เอกสาร / PDF (Print)</div>
                      <div className="text-[10px] text-slate-500 font-normal">สั่งพิมพ์ผ่านเครื่องพิมพ์ หรือบันทึกเป็น PDF</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {activeTab === 'dashboard' ? (
          <Dashboard
            onNavigate={(tab) => setActiveTab(tab)}
            cashCountData={cashCountData}
            receiptData={receiptData}
            savedCashCounts={savedCashCounts}
            savedReceipts={savedReceipts}
            onManualSync={handleManualSync}
            onOpenVatCalc={() => setIsVatModalOpen(true)}
          />
        ) : activeTab === 'whatsNew' ? (
          <WhatsNew
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        ) : activeTab === 'cashCount' ? (
          <CashCountSheet
            data={cashCountData}
            onChange={setCashCountData}
            onReset={handleResetCashCount}
            savedCashCounts={savedCashCounts}
            onOpenManageStaff={() => setIsStaffManagerOpen(true)}
            onOpenManageCategories={() => setIsCategoryManagerOpen(true)}
          />
        ) : activeTab === 'receiptSubstitute' ? (
          <ReceiptSubstituteSheet
            data={receiptData}
            onChange={setReceiptData}
            onReset={handleResetReceipt}
            cashCountData={cashCountData}
            savedReceipts={savedReceipts}
            savedCashCounts={savedCashCounts}
            onManualSync={() => {
              setReceiptData((prev) => syncMinusExpensesToReceipt(cashCountData, savedCashCounts, prev));
              showToast('ดึงรายการหัก (-) จากตารางนับเงินทั้งสองกะเรียบร้อยแล้ว');
            }}
            onOpenVatCalc={() => setIsVatModalOpen(true)}
          />
        ) : activeTab === 'dailyRevenue' ? (
          <DailyRevenueSheet />
        ) : activeTab === 'frontOfficeManual' ? (
          <FrontOfficeManual
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        ) : (
          <FrontOfficeChecklist />
        )}
      </main>

      {/* Footer Info */}
      <footer className="no-print border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-orange-500" />
          <span>ระบบนับเงิน & ใบรับรองแทนใบเสร็จ Front Office Panel | น่าน ซีซั่นส์ บูติก รีสอร์ท (Firebase Cloud Storage Enabled)</span>
        </div>
      </footer>

      {/* VAT 7% Calculator Modal */}
      <VatCalculatorModal
        isOpen={isVatModalOpen}
        onClose={() => setIsVatModalOpen(false)}
        onApplyToReceipt={handleApplyVatToReceipt}
      />

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
        savedRevenueHistory={savedRevenueHistory}
        onLoadCashCount={(item) => {
          setCashCountData(item);
          setActiveTab('cashCount');
          showToast('ดึงข้อมูลตารางนับเงินเรียบร้อยแล้ว');
        }}
        onLoadReceipt={(item) => {
          setReceiptData(item);
          setActiveTab('receiptSubstitute');
          showToast('ดึงข้อมูลใบรับรองแทนใบเสร็จเรียบร้อยแล้ว');
        }}
        onLoadRevenueHistory={handleLoadRevenueHistory}
        onDeleteCashCount={handleDeleteCashCount}
        onDeleteReceipt={handleDeleteReceipt}
        onDeleteRevenueHistory={handleDeleteRevenueHistory}
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
        onManualSync={handleManualSync}
        isFirebaseSyncing={isFirebaseSyncing}
      />
      </div>
    </div>
  );
}

