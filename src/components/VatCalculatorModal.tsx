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
  CheckCircle2,
  ClipboardList,
  ClipboardPaste,
  FileSpreadsheet,
  Layers,
  ArrowDownToLine,
  ListPlus
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

// Smart Parser for multi-line pasted text (Excel, Google Sheets, LINE chat, plain numbers, CSV, etc.)
export const parseBatchPasteText = (rawText: string, startIndex: number = 1): VatItemRow[] => {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsedRows: VatItemRow[] = [];

  const parseNum = (str: string): number | null => {
    if (!str) return null;
    const clean = str.replace(/[,฿$THBบาท\s]/gi, '').replace(/\.-$/, '');
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  };

  const isHeaderLine = (line: string, index: number): boolean => {
    if (index > 0) return false;
    const lower = line.toLowerCase();
    const headerKeywords = ['รายการ', 'ชื่อรายการ', 'รายละเอียด', 'description', 'item', 'ราคา', 'price', 'amount', 'จำนวน', 'qty', 'quantity', 'ยอดรวม', 'total', 'ลำดับ', 'no', 'date', 'วันที่'];
    const hasKeyword = headerKeywords.some((k) => lower.includes(k));
    const hasOnlyWords = !/\d/.test(line.replace(/no\.?|qty/gi, ''));
    return hasKeyword && hasOnlyWords;
  };

  lines.forEach((line, idx) => {
    if (isHeaderLine(line, idx)) return;

    // Pattern 1: Tab separated (Excel / Google Sheets Copy-Paste)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        let desc = '';
        let amt: number = 0;
        let qty: number = 1;

        if (parts.length === 2) {
          const num0 = parseNum(parts[0]);
          const num1 = parseNum(parts[1]);
          if (num0 !== null && num1 === null) {
            amt = num0;
            desc = parts[1];
          } else if (num1 !== null) {
            desc = parts[0];
            amt = num1;
          } else {
            desc = `${parts[0]} ${parts[1]}`;
            amt = 0;
          }
        } else if (parts.length === 3) {
          const num0 = parseNum(parts[0]);
          const num1 = parseNum(parts[1]);
          const num2 = parseNum(parts[2]);

          if (num1 !== null && num2 !== null) {
            desc = parts[0];
            amt = num1;
            qty = num2 > 0 ? num2 : 1;
          } else if (num0 !== null && num2 !== null) {
            desc = parts[1];
            amt = num2;
          } else if (num2 !== null) {
            desc = `${parts[0]} ${parts[1]}`;
            amt = num2;
          } else {
            desc = parts.join(' ');
          }
        } else {
          const numLast = parseNum(parts[parts.length - 1]);
          const numSecLast = parseNum(parts[parts.length - 2]);

          if (numLast !== null && numSecLast !== null) {
            desc = parts.slice(0, parts.length - 2).filter((p) => !/^\d+$/.test(p)).join(' ') || parts.slice(0, parts.length - 2).join(' ');
            amt = numSecLast;
            qty = numLast > 0 ? numLast : 1;
          } else if (numLast !== null) {
            desc = parts.slice(0, parts.length - 1).filter((p) => !/^\d+$/.test(p)).join(' ') || parts.slice(0, parts.length - 1).join(' ');
            amt = numLast;
          } else {
            desc = parts.join(' ');
          }
        }

        parsedRows.push({
          id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
          description: desc || `รายการที่ ${startIndex + parsedRows.length}`,
          amount: amt > 0 ? amt : '',
          quantity: qty > 0 ? qty : 1,
          note: '',
        });
        return;
      }
    }

    // Pattern 2: Comma or Semicolon or Pipe separated (CSV style)
    if (/[,;|]/.test(line)) {
      const parts = line.split(/[,;|]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const numLast = parseNum(parts[parts.length - 1]);
        const numSecLast = parts.length >= 3 ? parseNum(parts[parts.length - 2]) : null;

        let desc = '';
        let amt: number = 0;
        let qty: number = 1;

        if (numSecLast !== null && numLast !== null) {
          desc = parts.slice(0, parts.length - 2).join(' ');
          amt = numSecLast;
          qty = numLast > 0 ? numLast : 1;
        } else if (numLast !== null) {
          desc = parts.slice(0, parts.length - 1).join(' ');
          amt = numLast;
        } else {
          desc = parts.join(' ');
        }

        parsedRows.push({
          id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
          description: desc || `รายการที่ ${startIndex + parsedRows.length}`,
          amount: amt > 0 ? amt : '',
          quantity: qty > 0 ? qty : 1,
          note: '',
        });
        return;
      }
    }

    // Pattern 3: Number with multiplier at end e.g. "ค่าอาหาร 250 x 3" or "เบียร์ 180 * 2" or "250x3"
    const multMatch = line.match(/^(.*?)\s*([0-9,.]+)\s*(?:x|\*|\@|จำนวน)\s*([0-9,.]+)\s*(?:บาท|.-|฿)?$/i);
    if (multMatch) {
      const desc = multMatch[1].trim();
      const amt = parseNum(multMatch[2]);
      const qty = parseNum(multMatch[3]);
      parsedRows.push({
        id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
        description: desc || `รายการที่ ${startIndex + parsedRows.length}`,
        amount: amt !== null && amt > 0 ? amt : '',
        quantity: qty !== null && qty > 0 ? qty : 1,
        note: '',
      });
      return;
    }

    // Pattern 4: Text with trailing number e.g. "ค่ากาแฟและอาหารว่าง 450" or "1. ค่าอาหาร 1500"
    const textNumMatch = line.match(/^(?:(?:\d+[\.\)\-:]\s*)|(?:-|\*)\s*)?(.*?)\s+([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:บาท|.-|฿)?$/i);
    if (textNumMatch) {
      const desc = textNumMatch[1].trim();
      const amt = parseNum(textNumMatch[2]);
      if (amt !== null) {
        parsedRows.push({
          id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
          description: desc || `รายการที่ ${startIndex + parsedRows.length}`,
          amount: amt > 0 ? amt : '',
          quantity: 1,
          note: '',
        });
        return;
      }
    }

    // Pattern 5: Pure Number on a line e.g. "1500" or "1,250.50"
    const pureNum = parseNum(line);
    if (pureNum !== null && pureNum > 0) {
      parsedRows.push({
        id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
        description: `รายการที่ ${startIndex + parsedRows.length}`,
        amount: pureNum,
        quantity: 1,
        note: '',
      });
      return;
    }

    // Pattern 6: Fallback text only
    parsedRows.push({
      id: `vat-batch-${Date.now()}-${parsedRows.length}-${Math.random().toString(36).substring(2, 5)}`,
      description: line.replace(/^(?:\d+[\.\)\-:]\s*)/, ''),
      amount: '',
      quantity: 1,
      note: '',
    });
  });

  return parsedRows;
};

interface VatCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToReceipt?: (items: ReceiptSubstituteItem[], calcMode: 'exclusive' | 'inclusive' | 'sum', vatPercent: number) => void;
}

export const VatCalculatorModal: React.FC<VatCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyToReceipt,
}) => {
  // Calculation Modes
  // 'exclusive' = ราคาก่อน VAT (บวก VAT 7% เพิ่ม)
  // 'inclusive' = ราคารวม VAT แล้ว (ถอด VAT 7% ออก)
  // 'sum' = รวมยอดที่เป็นภาษีแล้ว (สูตรบวกยอดรวมตรงๆ)
  const [calcMode, setCalcMode] = useState<'exclusive' | 'inclusive' | 'sum'>('exclusive');
  const [vatRate, setVatRate] = useState<number>(7); // Default 7%
  const [showVatLine, setShowVatLine] = useState<boolean>(true); // Option to show/hide VAT row in summary
  const [whtRate, setWhtRate] = useState<number>(0); // Withholding tax rate: 0%, 1%, 2%, 3%, 5%

  // Multi-item rows
  const [items, setItems] = useState<VatItemRow[]>([
    { id: '1', description: 'ค่าบริการ / สินค้า รายการที่ 1', amount: 1000, quantity: 1, note: '' },
  ]);

  // Quick Single Amount Input for fast calculation
  const [quickAmount, setQuickAmount] = useState<number | ''>('');

  // Batch Paste Multiple Items Modal State
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState<boolean>(false);
  const [batchPasteText, setBatchPasteText] = useState<string>('');
  const [batchPasteMode, setBatchPasteMode] = useState<'replace' | 'append'>('replace');
  const [pasteSuccessToast, setPasteSuccessToast] = useState<string | null>(null);

  // Toast / Copied Feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [appliedNotice, setAppliedNotice] = useState<boolean>(false);

  // Computed preview of batch paste text
  const parsedBatchPreview = useMemo(() => {
    return parseBatchPasteText(batchPasteText, batchPasteMode === 'append' ? items.length + 1 : 1);
  }, [batchPasteText, batchPasteMode, items.length]);

  const batchPreviewTotal = useMemo(() => {
    return parsedBatchPreview.reduce((sum, row) => {
      const a = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount || '0') || 0;
      const q = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity || '0') || 0;
      return sum + a * q;
    }, 0);
  }, [parsedBatchPreview]);

  const handleApplyBatchPaste = () => {
    if (parsedBatchPreview.length === 0) return;
    if (batchPasteMode === 'replace') {
      setItems(parsedBatchPreview);
    } else {
      const existing = items.filter((it) => (it.description && it.description.trim()) || (typeof it.amount === 'number' && it.amount > 0));
      setItems(existing.length > 0 ? [...existing, ...parsedBatchPreview] : parsedBatchPreview);
    }
    setQuickAmount('');
    setIsBatchPasteOpen(false);
    setBatchPasteText('');
    setPasteSuccessToast(`วางสำเร็จ ${parsedBatchPreview.length} รายการ (ยอดรวม ฿${batchPreviewTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })})`);
    setTimeout(() => setPasteSuccessToast(null), 3500);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setBatchPasteText(text);
        }
      }
    } catch (e) {
      /* ignore */
    }
  };

  const handleLoadExample = (exampleType: 'excel' | 'numbers' | 'text') => {
    if (exampleType === 'excel') {
      setBatchPasteText(
        `ค่าอาหารชุด Nan Seasons Special Dinner\t1500\t1\n` +
        `เครื่องดื่มต้อนรับ สมุนไพรเลมอนกราส\t120\t2\n` +
        `เค้กมะพร้าวอ่อน น่าน บูทีค\t95\t3\n` +
        `บริการ Room Service ถึงวิลล่า\t300\t1\n` +
        `กาแฟสด อาราบิก้าน่าน\t85\t4`
      );
    } else if (exampleType === 'numbers') {
      setBatchPasteText(`1250\n450\n380\n950.50\n1800\n620\n2400`);
    } else {
      setBatchPasteText(
        `กาแฟสด เอสเปรสโซ่ 95 x 2\n` +
        `ข้าวผัดกุ้งสด Nan Seasons 180 x 3\n` +
        `น้ำดื่มบริสุทธิ์ 25 x 4\n` +
        `ชุดชาบ่าย Afternoon Tea Set 590\n` +
        `ค่าบริการจัดเลี้ยงพิเศษ 1200`
      );
    }
  };

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

  // Add 5 Rows at once
  const handleAddMultipleItems = (count: number = 5) => {
    setItems((prev) => {
      const newItems: VatItemRow[] = Array.from({ length: count }, (_, i) => ({
        id: `vat-item-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        description: `รายการสินค้า/บริการที่ ${prev.length + i + 1}`,
        amount: '',
        quantity: 1,
        note: '',
      }));
      return [...prev, ...newItems];
    });
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
    } else if (calcMode === 'inclusive') {
      // Inclusive VAT: sumRaw is Grand Total incl VAT
      grandTotalInclVat = sumRaw;
      if (vatRate > 0) {
        subtotalBeforeVat = grandTotalInclVat / (1 + vatRate / 100);
        vatAmount = grandTotalInclVat - subtotalBeforeVat;
      } else {
        subtotalBeforeVat = grandTotalInclVat;
        vatAmount = 0;
      }
    } else {
      // Option 3: 'sum' - รวมยอดที่เป็นภาษีแล้ว (สูตรบวกยอดรวมตรงๆ)
      subtotalBeforeVat = sumRaw;
      vatAmount = 0;
      grandTotalInclVat = sumRaw;
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

  // Prepare items split into 2 columns for print document
  const printItemsList = useMemo(() => {
    if (typeof quickAmount === 'number' && quickAmount > 0) {
      return [{
        id: 'quick-1',
        description: 'รายการคำนวณยอดเงินรวมก้อนเดียว (Quick Amount Input)',
        amount: quickAmount,
        quantity: 1,
        note: ''
      }];
    }
    return items;
  }, [quickAmount, items]);

  const { col1Items, col2Items } = useMemo(() => {
    const total = printItemsList.length;
    if (total <= 5) {
      return { col1Items: printItemsList, col2Items: [] };
    }
    const half = Math.ceil(total / 2);
    return {
      col1Items: printItemsList.slice(0, half),
      col2Items: printItemsList.slice(half)
    };
  }, [printItemsList]);

  // Copy Summary Text
  const handleCopyText = () => {
    const lines = [
      `=== รายงานคำนวณ VAT ${vatRate}% & ยอดรวมสุทธิ ===`,
      `โหมดคำนวณ: ${
        calcMode === 'exclusive'
          ? 'ราคาก่อน VAT (Exclusive)'
          : calcMode === 'inclusive'
          ? 'ราคารวม VAT แล้ว (Inclusive)'
          : 'รวมยอดที่เป็นภาษีแล้ว (Sum Total)'
      }`,
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
    if (showVatLine && vatRate > 0 && calcMode !== 'sum') {
      lines.push(`ภาษีมูลค่าเพิ่ม (VAT ${vatRate}%): ฿${calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
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
        description: `รายการคำนวณ ${
          calcMode === 'exclusive'
            ? `VAT ${vatRate}% (ก่อน VAT)`
            : calcMode === 'inclusive'
            ? `VAT ${vatRate}% (รวม VAT)`
            : 'รวมยอดที่เป็นภาษีแล้ว'
        }`,
        amount: calculations.grandTotalInclVat,
        remark:
          calcMode === 'sum'
            ? 'รวมยอดที่เป็นภาษีแล้ว'
            : `คำนวณ VAT ${vatRate}% (ภาษี ฿${calculations.vatAmount.toFixed(2)})`,
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
            remark:
              it.note ||
              (calcMode === 'sum'
                ? 'รวมยอดที่เป็นภาษีแล้ว'
                : `คำนวณ VAT ${vatRate}%`),
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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              {/* Mode selection */}
              <div className="lg:col-span-3 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                  โหมดการคำนวณภาษี VAT (VAT Mode)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {/* Option 1 */}
                  <button
                    type="button"
                    onClick={() => setCalcMode('exclusive')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer flex flex-col justify-between ${
                      calcMode === 'exclusive'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-xs ring-1 ring-orange-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">1. ราคาก่อน VAT (Exclusive)</span>
                      <span className="text-[10px] bg-orange-200/80 text-orange-900 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                        บวก VAT 7%
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 mt-1">
                      (ยอดเงินระบุเป็นราคาก่อนภาษี + คำนวณ VAT {vatRate}% เพิ่มเติม)
                    </span>
                  </button>

                  {/* Option 2 */}
                  <button
                    type="button"
                    onClick={() => setCalcMode('inclusive')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer flex flex-col justify-between ${
                      calcMode === 'inclusive'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-1 ring-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">2. ราคารวม VAT แล้ว (Inclusive)</span>
                      <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                        ถอด VAT 7%
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 mt-1">
                      (ยอดเงินจ่ายจริงรวม VAT แล้ว -&gt; ถอดแยก VAT ออกให้)
                    </span>
                  </button>

                  {/* Option 3 */}
                  <button
                    type="button"
                    onClick={() => setCalcMode('sum')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer flex flex-col justify-between ${
                      calcMode === 'sum'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate">3. รวมยอดที่เป็นภาษีแล้ว</span>
                      <span className="text-[10px] bg-emerald-200/90 text-emerald-950 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                        บวกยอดรวมตรงๆ
                      </span>
                    </div>
                    <span className="text-[11px] font-normal text-slate-500 mt-1">
                      (สูตรบวกตัวเลขหลายรายการเข้าด้วยกันโดยตรง ยอดรวมเป็นราคาสุทธิ)
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

                  <label className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={showVatLine}
                      onChange={(e) => setShowVatLine(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span>แสดงรายการภาษี VAT ({vatRate}%) ในใบสรุปเอกสาร</span>
                  </label>
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                    {items.length} รายการ
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchPasteOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer ring-1 ring-indigo-300"
                    title="วางหลายรายการพร้อมกันจาก Excel, Google Sheets, LINE หรือรายการตัวเลข"
                  >
                    <ClipboardPaste className="w-4 h-4 text-indigo-100" />
                    <span>วางหลายรายการ (Batch Paste)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่ม 1 รายการ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleItems(5)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="เพิ่มครั้งละ 5 ช่องเพื่อให้กรอกข้อมูลได้มากขึ้น"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ เพิ่ม 5 ช่อง</span>
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

              {/* Paste Success Toast Alert */}
              {pasteSuccessToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 text-xs font-bold animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pasteSuccessToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPasteSuccessToast(null)}
                    className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                    {calcMode === 'exclusive' ? 'โหมด: ราคาก่อน VAT (Exclusive)' : calcMode === 'inclusive' ? 'โหมด: ราคารวม VAT แล้ว (Inclusive)' : 'โหมด: รวมยอดที่เป็นภาษีแล้ว (Sum Total)'}
                  </span>
                </div>
              </div>

              {/* Main Calculated Values Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Box 1: Subtotal before VAT */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold uppercase">
                    ยอดรวมสินค้า/บริการ (Subtotal)
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                    ฿{calculations.subtotalBeforeVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {calcMode === 'exclusive' ? 'ยอดรวมเงินรายการตั้งต้น' : calcMode === 'inclusive' ? 'ราคาสินค้า/บริการถอด VAT ออก' : 'ยอดรวมตั้งต้นจากทุกรายการ'}
                  </div>
                </div>

                {/* Box 2: VAT Amount */}
                <div className={`p-4 rounded-2xl space-y-1 ${
                  showVatLine && vatRate > 0 && calcMode !== 'sum'
                    ? 'bg-orange-500/10 border border-orange-500/30' 
                    : 'bg-white/5 border border-white/10 opacity-60'
                }`}>
                  <div className="text-[11px] text-orange-300 font-bold uppercase flex items-center justify-between">
                    <span>ภาษีมูลค่าเพิ่ม (VAT {vatRate}%)</span>
                    <Percent className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-orange-400 tracking-tight">
                    {calcMode === 'sum'
                      ? '฿0.00'
                      : showVatLine && vatRate > 0
                      ? `฿${calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '(ซ่อนในรายงาน)'}
                  </div>
                  <div className="text-[10px] text-orange-200/80">
                    {calcMode === 'sum'
                      ? 'รวมยอดที่เป็นภาษีเรียบร้อยแล้ว'
                      : !showVatLine
                      ? 'ถูกซ่อนจากการแสดงผลในเอกสาร'
                      : calcMode === 'exclusive'
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

      {/* Batch Paste Multiple Items Sub-Modal Dialog */}
      {isBatchPasteOpen && (
        <div className="no-print fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Batch Paste Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
                  <ClipboardPaste className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">
                      วางข้อมูลหลายรายการ (Batch Paste Items)
                    </h3>
                    <span className="bg-indigo-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Smart Parser
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    คัดลอกจาก Excel, Google Sheets, LINE Chat หรือรายการตัวเลขเพื่อนำเข้าตาราง VAT อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchPasteOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Paste Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
              
              {/* Toolbar & Templates */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                  title="อ่านข้อความจากคลิปบอร์ดที่คัดลอกไว้มาวางทันที"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                  <span>วางจากคลิปบอร์ด (Paste Clipboard)</span>
                </button>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium mr-1">ตัวอย่าง:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadExample('excel')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 cursor-pointer transition-colors"
                  >
                    📊 ตาราง Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadExample('numbers')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 cursor-pointer transition-colors"
                  >
                    🔢 ตัวเลขล้วน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadExample('text')}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200 cursor-pointer transition-colors"
                  >
                    📝 ข้อความ & ตัวคูณ (x, *)
                  </button>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>วางข้อความของคุณที่นี่ (Text Input Area)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {batchPasteText.split(/\r?\n/).filter((l) => l.trim()).length} บรรทัด
                  </span>
                </label>
                <textarea
                  rows={6}
                  value={batchPasteText}
                  onChange={(e) => setBatchPasteText(e.target.value)}
                  placeholder={`วางข้อมูลจาก Excel / LINE / เอกสารข้อความได้เลย เช่น:\nค่าอาหารชุดพิเศษ\t1500\t1\nเครื่องดื่มสมุนไพร\t120\t2\nกาแฟสด เอสเปรสโซ่ 95 x 2\nหรือพิมพ์ตัวเลขบรรทัดละยอด:\n1250\n450\n780`}
                  className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-2xl p-3 text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-inner resize-y"
                  autoFocus
                />
              </div>

              {/* Mode Selector */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  รูปแบบการนำเข้าสู่ตารางคำนวณ:
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer select-none font-bold transition-colors text-xs bg-slate-50 border-slate-200 has-checked:bg-indigo-50 has-checked:border-indigo-500 has-checked:text-indigo-900">
                    <input
                      type="radio"
                      name="batchPasteMode"
                      value="replace"
                      checked={batchPasteMode === 'replace'}
                      onChange={() => setBatchPasteMode('replace')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>แทนที่รายการเดิมทั้งหมด (Replace All)</span>
                  </label>
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer select-none font-bold transition-colors text-xs bg-slate-50 border-slate-200 has-checked:bg-indigo-50 has-checked:border-indigo-500 has-checked:text-indigo-900">
                    <input
                      type="radio"
                      name="batchPasteMode"
                      value="append"
                      checked={batchPasteMode === 'append'}
                      onChange={() => setBatchPasteMode('append')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>เพิ่มต่อท้ายรายการเดิม (Append)</span>
                  </label>
                </div>
              </div>

              {/* Real-time Parsed Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    ตัวอย่างผลลัพธ์ที่จะถูกนำเข้า (Parsed Preview)
                  </span>
                  {parsedBatchPreview.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                        ตรวจพบ {parsedBatchPreview.length} รายการ
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold font-mono px-2 py-0.5 rounded-lg text-[11px]">
                        รวม ฿{batchPreviewTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">ยังไม่มีรายการที่สามารถแปลงได้</span>
                  )}
                </div>

                {parsedBatchPreview.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-10">#</th>
                          <th className="py-2 px-2.5">รายการ (Description)</th>
                          <th className="py-2 px-2.5 text-right w-24">ราคาต่อหน่วย</th>
                          <th className="py-2 px-2.5 text-center w-16">จำนวน</th>
                          <th className="py-2 px-2.5 text-right w-24">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedBatchPreview.map((item, idx) => {
                          const amt = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0') || 0;
                          const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity || '0') || 0;
                          const total = amt * qty;
                          return (
                            <tr key={idx} className="hover:bg-indigo-50/40">
                              <td className="py-1.5 px-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-medium text-slate-800">{item.description}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                                {amt > 0 ? `฿${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-600">{qty}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                                {total > 0 ? `฿${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-100/80 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    พิมพ์หรือวางข้อความในกล่องด้านบนเพื่อดูตัวอย่างรายการที่แปลงได้อัตโนมัติ
                  </div>
                )}
              </div>

            </div>

            {/* Batch Paste Footer */}
            <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>รองรับทั้งคั่นด้วย Tab, Comma, สัญลักษณ์ x, * และตัวเลขเดี่ยว</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsBatchPasteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="button"
                  disabled={parsedBatchPreview.length === 0}
                  onClick={handleApplyBatchPaste}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                    parsedBatchPreview.length > 0
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 ring-1 ring-indigo-400'
                      : 'bg-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <ListPlus className="w-4 h-4" />
                  <span>นำเข้ารายการ ({parsedBatchPreview.length} รายการ)</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Printable VAT Summary Document Sheet - 2 Column Layout */}
      {typeof document !== 'undefined' && createPortal(
        <div id="vat-calc-print-root" className="hidden font-sans text-slate-900 p-6 bg-white max-w-4xl mx-auto border border-slate-300">
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">โรงแรม น่าน ซีซันส์ บูทีค รีสอร์ท</h1>
              <p className="text-[11px] text-slate-600">NAN SEASONS BOUTIQUE RESORT</p>
              <h2 className="text-xs font-black text-orange-700 mt-1 uppercase tracking-wide">
                ใบสรุปและบันทึกการคำนวณภาษีมูลค่าเพิ่ม (VAT 7% Calculation Report)
              </h2>
            </div>
            <div className="text-right text-[11px] text-slate-600 space-y-0.5">
              <div><strong className="text-slate-800">วันที่พิมพ์:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div><strong className="text-slate-800">เวลา:</strong> {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</div>
              <div className="mt-1 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded text-[10px]">
                {calcMode === 'exclusive'
                  ? 'โหมด: ราคาก่อน VAT (Exclusive)'
                  : calcMode === 'inclusive'
                  ? 'โหมด: ราคารวม VAT (Inclusive)'
                  : 'โหมด: รวมยอดที่เป็นภาษีแล้ว (Sum Total)'}
              </div>
            </div>
          </div>

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-2 gap-4 items-start">
            {/* COLUMN 1 (LEFT) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-1">
                <span>รายการสินค้า / บริการที่คำนวณ {col2Items.length > 0 ? '(ช่องที่ 1)' : ''}</span>
                <span className="text-[10px] text-slate-500 font-normal">จำนวน {col1Items.length} รายการ</span>
              </div>
              
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-7">#</th>
                    <th className="py-1 px-1.5 border-r border-slate-300">รายการ (Description)</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-right w-16">ราคา</th>
                    <th className="py-1 px-1.5 border-r border-slate-300 text-center w-7">จำนวน</th>
                    <th className="py-1 px-1.5 text-right w-20">รวม (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {col1Items.map((it, idx) => {
                    const amt = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || '0') || 0;
                    const qty = typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity || '0') || 0;
                    const total = amt * qty;
                    return (
                      <tr key={it.id || idx} className="border-b border-slate-200">
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 break-words">{it.description || '-'}</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono">{amt > 0 ? amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono">{qty}</td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold">{total > 0 ? total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* COLUMN 2 (RIGHT) */}
            <div className="space-y-3">
              {col2Items.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-300 pb-1 mb-1">
                    <span>รายการสินค้า / บริการที่คำนวณ (ช่องที่ 2)</span>
                    <span className="text-[10px] text-slate-500 font-normal">จำนวน {col2Items.length} รายการ</span>
                  </div>
                  <table className="w-full text-[11px] text-left border-collapse border border-slate-300 mb-3">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                        <th className="py-1 px-1.5 border-r border-slate-300 text-center w-7">#</th>
                        <th className="py-1 px-1.5 border-r border-slate-300">รายการ (Description)</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-right w-16">ราคา</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-center w-7">จำนวน</th>
                        <th className="py-1 px-1.5 text-right w-20">รวม (฿)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col2Items.map((it, idx) => {
                        const amt = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || '0') || 0;
                        const qty = typeof it.quantity === 'number' ? it.quantity : parseFloat(it.quantity || '0') || 0;
                        const total = amt * qty;
                        const actualIdx = col1Items.length + idx + 1;
                        return (
                          <tr key={it.id || idx} className="border-b border-slate-200">
                            <td className="py-1 px-1.5 border-r border-slate-200 text-center font-bold text-slate-600">{actualIdx}</td>
                            <td className="py-1 px-1.5 border-r border-slate-200 break-words">{it.description || '-'}</td>
                            <td className="py-1 px-1.5 border-r border-slate-200 text-right font-mono">{amt > 0 ? amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                            <td className="py-1 px-1.5 border-r border-slate-200 text-center font-mono">{qty}</td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold">{total > 0 ? total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Calculation Summary Box */}
              <div className="border border-slate-300 rounded-lg p-2.5 space-y-1.5 bg-slate-50 text-xs">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex justify-between">
                  <span>สรุปผลการคำนวณยอดรวม:</span>
                  <span className="text-[10px] text-orange-700 font-mono">
                    {calcMode === 'sum' ? 'รวมภาษีแล้ว' : `VAT ${vatRate}%`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 text-[11px]">
                  <span>{calcMode === 'sum' ? 'ยอดรวมสินค้า/บริการทั้งหมด:' : 'ยอดรวมสินค้า/บริการก่อน VAT:'}</span>
                  <span className="font-mono font-bold">฿{calculations.subtotalBeforeVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {showVatLine && vatRate > 0 && calcMode !== 'sum' && (
                  <div className="flex justify-between text-slate-800 font-bold border-b border-slate-200 pb-1 text-[11px]">
                    <span>ภาษีมูลค่าเพิ่ม VAT ({vatRate}%):</span>
                    <span className="font-mono text-orange-700">฿{calculations.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black text-slate-900 pt-0.5 border-b border-slate-300 pb-1">
                  <span>ยอดเงินรวมทั้งสิ้น (Grand Total):</span>
                  <span className="font-mono text-emerald-700">฿{calculations.grandTotalInclVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {whtRate > 0 && (
                  <>
                    <div className="flex justify-between text-slate-700 text-[11px] pt-0.5">
                      <span>หัก ณ ที่จ่าย WHT ({whtRate}%):</span>
                      <span className="font-mono text-rose-700">- ฿{calculations.whtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-blue-900 bg-blue-50 p-1 rounded border border-blue-200">
                      <span>ยอดจ่ายสุทธิหลังหักภาษี:</span>
                      <span className="font-mono">฿{calculations.netPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Thai Baht Text */}
              <div className="p-2 bg-slate-100 border border-slate-300 rounded-lg text-[11px] flex items-center justify-between">
                <span className="font-bold text-slate-700 shrink-0">ตัวอักษร:</span>
                <span className="font-serif font-bold text-slate-900 text-right ml-2">({whtRate > 0 ? calculations.bahtTextNet : calculations.bahtTextGrand})</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
