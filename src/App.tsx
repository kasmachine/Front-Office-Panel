import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CashCountSheet } from './components/CashCountSheet';
import { ReceiptSubstituteSheet } from './components/ReceiptSubstituteSheet';
import { HistoryModal } from './components/HistoryModal';
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
} from './lib/firebase';
import { syncMinusExpensesToReceipt } from './utils/syncUtils';
import { CheckCircle2, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cashCount' | 'receiptSubstitute'>('cashCount');

  // Active form states
  const [cashCountData, setCashCountData] = useState<CashCountData>(() => {
    const saved = localStorage.getItem('nan_seasons_current_cash');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return getInitialCashCountData();
  });

  const [receiptData, setReceiptData] = useState<ReceiptSubstituteData>(() => {
    const saved = localStorage.getItem('nan_seasons_current_receipt');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return getInitialReceiptData();
  });

  // History storage states (Synced with Firebase Firestore & LocalStorage)
  const [savedCashCounts, setSavedCashCounts] = useState<CashCountData[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<ReceiptSubstituteData[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(false);

  // Subscribe to Firebase Firestore real-time updates
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

    return () => {
      unsubCash();
      unsubReceipts();
    };
  }, []);

  // Auto save draft to localStorage
  useEffect(() => {
    localStorage.setItem('nan_seasons_current_cash', JSON.stringify(cashCountData));
  }, [cashCountData]);

  useEffect(() => {
    localStorage.setItem('nan_seasons_current_receipt', JSON.stringify(receiptData));
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
      setCashCountData(getInitialCashCountData());
      showToast('ล้างข้อมูลตารางนับเงินเรียบร้อย');
    }
  };

  const handleResetReceipt = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลใบรับรองแทนใบเสร็จนี้ใช่หรือไม่?')) {
      setReceiptData(getInitialReceiptData());
      showToast('ล้างข้อมูลใบรับรองแทนใบเสร็จเรียบร้อย');
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
        onExportPdf={handleExportPdf}
        onDownloadJson={handleDownloadJson}
        onImportJson={handleImportJson}
        onPrint={handlePrint}
        onSaveRecord={handleSaveRecord}
        onOpenHistory={() => setIsHistoryOpen(true)}
        isFirebaseSyncing={isFirebaseSyncing}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'cashCount' ? (
          <CashCountSheet
            data={cashCountData}
            onChange={setCashCountData}
            onReset={handleResetCashCount}
            savedCashCounts={savedCashCounts}
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
    </div>
  );
}

