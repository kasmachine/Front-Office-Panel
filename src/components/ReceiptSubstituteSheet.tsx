import React, { useRef, useState, useEffect } from 'react';
import { ReceiptSubstituteData, ReceiptSubstituteItem, CashCountData } from '../types';
import { ArabicToBahtText } from '../utils/bahttext';
import { extractMinusExpenses, getTodayFormatted, formatDateToDisplay, isNonReceiptExpense } from '../utils/syncUtils';
import { safeLocalStorage } from '../utils/storage';
import { getStoredCategories } from './ExpenseCategorySelect';
import { getStoredStaffList } from './StaffSelect';
import { Plus, Trash2, Upload, Image as ImageIcon, ShieldCheck, Calendar, PenTool, CheckCircle2, Percent } from 'lucide-react';
import { SignatureModal } from './SignatureModal';

interface ReceiptSubstituteSheetProps {
  data: ReceiptSubstituteData;
  onChange: (newData: ReceiptSubstituteData) => void;
  onReset: () => void;
  cashCountData?: CashCountData;
  savedReceipts?: ReceiptSubstituteData[];
  savedCashCounts?: CashCountData[];
  onManualSync?: () => void;
  onOpenVatCalc?: () => void;
}

const getInputValueDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

export const ReceiptSubstituteSheet: React.FC<ReceiptSubstituteSheetProps> = ({
  data,
  onChange,
  onReset,
  cashCountData,
  savedReceipts = [],
  savedCashCounts = [],
  onManualSync,
  onOpenVatCalc,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSigModal, setActiveSigModal] = useState<'requester' | 'approver' | null>(null);

  // Auto-restore ID Card image from localStorage if not present in current state, or save it when present
  useEffect(() => {
    if (!data.idCardImage) {
      const stored = safeLocalStorage.getItem('nan_seasons_id_card_image');
      if (stored) {
        onChange({ ...data, idCardImage: stored });
      }
    } else {
      safeLocalStorage.setItem('nan_seasons_id_card_image', data.idCardImage);
    }
  }, [data.idCardImage]);

  const handleDateChange = (newDateVal: string) => {
    if (!newDateVal) return;
    const formatted = formatDateToDisplay(newDateVal);
    const newDocId = `receipt-${newDateVal.replace(/\//g, '-')}`;
    const preservedIdCard = data.idCardImage || safeLocalStorage.getItem('nan_seasons_id_card_image');

    // 1. Search in savedReceipts (history & Firebase) for an existing record matching formatted date or newDateVal
    const existingSaved = savedReceipts.find((r) => {
      if (!r) return false;
      const rStartFormatted = r.startDate ? formatDateToDisplay(r.startDate) : '';
      const rEndFormatted = r.endDate ? formatDateToDisplay(r.endDate) : '';
      return (
        rStartFormatted === formatted ||
        rEndFormatted === formatted ||
        r.startDate === newDateVal ||
        r.startDate === formatted ||
        r.id === newDocId ||
        r.id === `receipt-${formatted.replace(/\//g, '-')}`
      );
    });

    if (existingSaved) {
      onChange({
        ...existingSaved,
        idCardImage: existingSaved.idCardImage || preservedIdCard || null,
      });
      return;
    }

    // 2. If no saved receipt record found for this date, search for minus (-) expenses in Cash Counts for this date
    const allCashCounts = [
      ...(cashCountData ? [cashCountData] : []),
      ...savedCashCounts,
    ];

    const targetCashCounts = allCashCounts.filter(
      (cc) => cc && cc.date && formatDateToDisplay(cc.date) === formatted
    );

    let newItems: ReceiptSubstituteItem[] = [];

    if (targetCashCounts.length > 0) {
      const autoItemsMap = new Map<string, ReceiptSubstituteItem>();
      targetCashCounts.forEach((cc) => {
        const minusExpList = extractMinusExpenses(cc);
        minusExpList.forEach((exp) => {
          const itemClean = exp.item ? exp.item.replace(/^[-+\s]+/, '').trim() : '';
          const amt = exp.amount !== 0 ? -Math.abs(exp.amount) : 0;
          const key = `${itemClean.toLowerCase()}_${amt}`;
          if (!autoItemsMap.has(key)) {
            autoItemsMap.set(key, {
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              date: formatted,
              description: itemClean,
              amount: amt,
              remark: exp.staff ? `ผู้เบิก/จ่าย: ${exp.staff}` : '',
            });
          }
        });
      });
      newItems = Array.from(autoItemsMap.values());
    }

    // 3. If still no items, create 1 fresh item for this date
    if (newItems.length === 0) {
      newItems = [
        {
          id: `item-${Date.now()}-1`,
          date: formatted,
          description: '',
          amount: 0,
          remark: '',
        },
      ];
    }

    onChange({
      ...data,
      id: newDocId,
      startDate: formatted,
      endDate: formatted,
      items: newItems,
      idCardImage: preservedIdCard || null,
    });
  };

  const minusCategories = getStoredCategories()
    .minus.map((cat) => cat.replace(/^[-+\s]+/, ''))
    .filter((cat) => !isNonReceiptExpense(cat));
  const storedStaffList = getStoredStaffList();

  const totalAmount = data.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const bahtText = ArabicToBahtText(Math.abs(totalAmount));

  const handleItemChange = (index: number, field: keyof ReceiptSubstituteItem, value: string | number) => {
    const newItems = [...data.items];
    if (field === 'amount') {
      const num = Number(value) || 0;
      // Store negative value for calculation formula, but UI hides minus sign
      newItems[index] = { ...newItems[index], amount: num !== 0 ? -Math.abs(num) : 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    const defaultDate = data.startDate ? formatDateToDisplay(data.startDate) : getTodayFormatted();
    const newItem: ReceiptSubstituteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: defaultDate,
      description: '',
      amount: 0,
      remark: '',
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    onChange({ ...data, items: newItems });
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        safeLocalStorage.setItem('nan_seasons_id_card_image', compressedBase64);
        onChange({ ...data, idCardImage: compressedBase64 });
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const imgUrl = uploadEvent.target?.result as string;
          if (imgUrl) {
            safeLocalStorage.setItem('nan_seasons_id_card_image', imgUrl);
            onChange({ ...data, idCardImage: imgUrl });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Datalists for categories and staff selection */}
      <datalist id="expense-categories-datalist">
        {minusCategories.map((cat, i) => (
          <option key={i} value={cat} />
        ))}
      </datalist>

      <datalist id="staff-remark-datalist">
        {storedStaffList.map((staff, i) => (
          <React.Fragment key={i}>
            <option value={`ผู้เบิก/จ่าย: ${staff}`} />
            <option value={staff} />
          </React.Fragment>
        ))}
      </datalist>

      {/* Printable Sheet Container */}
      <div
        id="receipt-substitute-document"
        className="bg-white p-8 md:p-12 rounded-xl border border-slate-300 shadow-md font-sans text-slate-900 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0"
      >
        {/* Document Header */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 border-b-2 border-slate-900 pb-2 inline-block">
            {data.companyName || 'ใบรับรองแทนใบเสร็จรับเงิน'}
          </h1>
          <div className="text-sm md:text-base font-semibold text-slate-800">
            ใบรับรองแทนใบเสร็จรับเงิน
          </div>
          <div className="text-xs md:text-sm text-slate-700 font-normal max-w-xl mx-auto">
            {data.companyAddress}
          </div>

          {/* Daily Date Badge / Selector */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-300 rounded-lg text-sky-900 text-xs md:text-sm font-bold shadow-2xs">
              <Calendar className="w-4 h-4 text-sky-600 no-print" />
              <span>ประจำวันที่:</span>
              <input
                type="date"
                value={getInputValueDate(data.startDate)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="no-print border border-slate-300 rounded px-2 py-0.5 font-mono text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-bold"
              />
              <span className="hidden print:inline font-bold underline font-mono ml-1">
                {formatDateToDisplay(data.startDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Declaration Paragraph */}
        <div className="my-6 text-xs sm:text-sm md:text-sm leading-relaxed text-slate-800 text-center whitespace-nowrap overflow-x-auto">
          ข้าพเจ้าขอรับรองว่ารายจ่ายเหล่านี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับเงินได้ และข้าพเจ้าได้จ่ายไปในงานของบริษัทโดยแท้
        </div>

        {/* Items Table */}
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-2 border-slate-900 text-sm">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-bold">
                <th className="border-r border-slate-800 px-3 py-2 text-center w-1/5">วัน/เดือน/ปี</th>
                <th className="border-r border-slate-800 px-3 py-2 text-left w-2/5">รายละเอียดรายจ่าย</th>
                <th className="border-r border-slate-800 px-3 py-2 text-right w-1/5">จำนวนเงิน</th>
                <th className="px-3 py-2 text-center w-1/5">หมายเหตุ</th>
                <th className="no-print w-8"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const formattedDate = formatDateToDisplay(item.date);
                const displayDesc = item.description ? item.description.replace(/^[-+\s]+/, '') : '';
                const displayAmount = item.amount === 0 ? '' : Math.abs(item.amount);

                return (
                  <tr key={item.id || idx} className="border-b border-slate-400 hover:bg-slate-50/50">
                    {/* Date */}
                    <td className="border-r border-slate-400 p-1.5 text-center">
                      <input
                        type="text"
                        value={formattedDate}
                        onChange={(e) => handleItemChange(idx, 'date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full text-center border border-slate-200 rounded px-1.5 py-1 text-xs no-print"
                      />
                      <span className="hidden print:inline text-xs">{formattedDate}</span>
                    </td>

                    {/* Description */}
                    <td className="border-r border-slate-400 p-1.5">
                      <input
                        type="text"
                        list="expense-categories-datalist"
                        value={displayDesc}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value.replace(/^[-+\s]+/, ''))}
                        placeholder="ระบุรายละเอียดรายจ่าย"
                        className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-medium no-print"
                      />
                      <span className="hidden print:inline text-xs font-medium">{displayDesc}</span>
                    </td>

                    {/* Amount */}
                    <td className="border-r border-slate-400 p-1.5 text-right font-mono">
                      <input
                        type="number"
                        value={displayAmount}
                        onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono no-print font-bold text-red-600"
                      />
                      <span className="hidden print:inline text-xs font-mono font-bold">
                        {item.amount ? Math.abs(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                      </span>
                    </td>

                    {/* Remark */}
                    <td className="border-r border-slate-400 p-1.5 text-center">
                      <input
                        type="text"
                        list="staff-remark-datalist"
                        value={item.remark}
                        onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                        placeholder="หมายเหตุ / ผู้เบิกจ่าย"
                        className="w-full text-center border border-slate-200 rounded px-1.5 py-1 text-xs no-print"
                      />
                      <span className="hidden print:inline text-xs">{item.remark}</span>
                    </td>

                    {/* Delete button */}
                    <td className="no-print p-1 text-center">
                      {data.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Total Row */}
              <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                <td colSpan={2} className="border-r border-slate-800 px-4 py-2.5 text-left font-bold text-base">
                  รวมทั้งสิ้น
                </td>
                <td className="border-r border-slate-800 px-4 py-2.5 text-right font-mono font-extrabold text-base text-red-600">
                  THB {totalAmount === 0 ? '0.00' : Math.abs(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="px-3 py-2 text-xs text-slate-500 text-center font-normal">
                  -
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Add Row Button & VAT Calculator */}
          <div className="no-print mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md border border-orange-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายการรายจ่าย
            </button>

            {onOpenVatCalc && (
              <button
                type="button"
                onClick={onOpenVatCalc}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md border border-amber-300 shadow-2xs transition-all cursor-pointer"
              >
                <Percent className="w-4 h-4 text-amber-700" />
                <span>คำนวณ VAT 7% / ถอดภาษี</span>
              </button>
            )}
          </div>

          {/* Thai Baht Text Display */}
          <div className="mt-3 text-right font-bold text-slate-800 text-sm md:text-base">
            ( {bahtText} )
          </div>
        </div>


        {/* Bottom Section: 2 Columns Layout */}
        <div className="mt-6 print:mt-3 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-4 text-xs md:text-sm border-t border-slate-300 pt-4 print:pt-3">
          {/* LEFT COLUMN: Requester & Approver stacked vertically */}
          <div className="flex flex-col justify-between space-y-4 print:space-y-3 pr-0 md:pr-3 print:pr-3 border-b md:border-b-0 md:border-r print:border-r border-slate-300 pb-4 md:pb-0 print:pb-0">
            {/* 1. Requester */}
            <div className="space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 whitespace-nowrap text-xs">ข้าพเจ้า:</span>
                  <input
                    type="text"
                    value={data.requesterName ?? 'นางสาว ขวัญทิชา ตั้งเสรีกล'}
                    onChange={(e) => onChange({ ...data, requesterName: e.target.value })}
                    placeholder="ชื่อ-นามสกุล ผู้เบิกจ่าย"
                    className="no-print border-b border-slate-400 px-1 py-0.5 text-xs font-medium flex-1 outline-none"
                  />
                  <span className="hidden print:inline font-bold underline text-xs">{data.requesterName || 'นางสาว ขวัญทิชา ตั้งเสรีกล'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 whitespace-nowrap text-xs">ตำแหน่ง:</span>
                  <input
                    type="text"
                    value={data.requesterPosition}
                    onChange={(e) => onChange({ ...data, requesterPosition: e.target.value })}
                    placeholder="ตำแหน่ง"
                    className="no-print border-b border-slate-400 px-1 py-0.5 text-xs font-medium flex-1 outline-none"
                  />
                  <span className="hidden print:inline font-bold underline text-xs">{data.requesterPosition || '...........................................'}</span>
                </div>
              </div>

              {/* Requester Signature Line */}
              <div className="pt-1 flex flex-col items-center">
                <div className="relative w-full max-w-[220px] min-h-[38px] flex items-center justify-center border-b border-slate-800 border-dotted mb-0.5">
                  {data.requesterSignature ? (
                    <div className="relative group flex flex-col items-center">
                      <img
                        src={data.requesterSignature}
                        alt="Requester Signature"
                        className="max-h-9 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => onChange({ ...data, requesterSignature: null })}
                        className="no-print absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs text-[10px]"
                        title="ลบลายเซ็น"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSigModal('requester')}
                      className="no-print inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer my-0.5"
                    >
                      <PenTool className="w-3 h-3" />
                      เซ็นชื่อดิจิทัล
                    </button>
                  )}
                </div>
                <p className="font-bold text-slate-800 text-center text-xs">(ผู้เบิกจ่าย)</p>
              </div>
            </div>

            {/* Divider between Requester and Approver */}
            <div className="border-t border-slate-200 my-1"></div>

            {/* 2. Approver */}
            <div className="space-y-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 whitespace-nowrap text-xs">ผู้อนุมัติ:</span>
                  <input
                    type="text"
                    value={data.approverName ?? 'นายเกษม มนตรี'}
                    onChange={(e) => onChange({ ...data, approverName: e.target.value })}
                    placeholder="ชื่อ-นามสกุล ผู้อนุมัติ"
                    className="no-print border-b border-slate-400 px-1 py-0.5 text-xs font-medium flex-1 outline-none"
                  />
                  <span className="hidden print:inline font-bold underline text-xs">{data.approverName || 'นายเกษม มนตรี'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 whitespace-nowrap text-xs">ตำแหน่ง:</span>
                  <input
                    type="text"
                    value={data.approverPosition}
                    onChange={(e) => onChange({ ...data, approverPosition: e.target.value })}
                    placeholder="ตำแหน่ง (เช่น เจ้าของกิจการ)"
                    className="no-print border-b border-slate-400 px-1 py-0.5 text-xs font-medium flex-1 outline-none"
                  />
                  <span className="hidden print:inline font-bold underline text-xs">{data.approverPosition || 'เจ้าของกิจการ'}</span>
                </div>
              </div>

              {/* Approver Signature Line */}
              <div className="pt-1 flex flex-col items-center">
                <div className="relative w-full max-w-[220px] min-h-[38px] flex items-center justify-center border-b border-slate-800 border-dotted mb-0.5">
                  {data.approverSignature ? (
                    <div className="relative group flex flex-col items-center">
                      <img
                        src={data.approverSignature}
                        alt="Approver Signature"
                        className="max-h-9 object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => onChange({ ...data, approverSignature: null })}
                        className="no-print absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs text-[10px]"
                        title="ลบลายเซ็น"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveSigModal('approver')}
                      className="no-print inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer my-0.5"
                    >
                      <PenTool className="w-3 h-3" />
                      เซ็นอนุมัติดิจิทัล
                    </button>
                  )}
                </div>
                <p className="font-bold text-slate-800 text-center text-xs">(ผู้อนุมัติ)</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Thai ID Card Attachment Section */}
          <div className="flex flex-col justify-between space-y-2 pl-0 md:pl-2 print:pl-2">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 no-print" />
                สำเนาบัตรประจำตัวประชาชนผู้เบิกจ่าย
              </span>
              <div className="no-print">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  อัปโหลด
                </button>
              </div>
            </div>

            {/* ID Card Display Box with Watermark */}
            <div className="relative border-2 border-slate-300 border-dashed rounded-lg p-2 bg-slate-50 flex flex-col items-center justify-center flex-1 min-h-[160px] overflow-hidden">
              {data.idCardImage ? (
                <div className="relative w-full h-auto rounded border border-slate-300 overflow-hidden shadow-2xs group">
                  <img
                    src={data.idCardImage}
                    alt="Thai ID Card Copy"
                    className="w-full object-contain max-h-[170px]"
                  />
                  {/* Diagonal Watermark Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <div className="bg-slate-900/60 text-white font-black text-[10px] md:text-xs px-2.5 py-1 transform -rotate-12 tracking-wide text-center border-y border-white shadow-xs w-[120%]">
                      {data.watermarkText}
                    </div>
                  </div>
                  {/* Explicit delete button for ID card image if user specifically wants to remove it */}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('คุณต้องการลบรูปบัตรประชาชนออกใช่หรือไม่?')) {
                        safeLocalStorage.removeItem('nan_seasons_id_card_image');
                        onChange({ ...data, idCardImage: null });
                      }
                    }}
                    className="no-print absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs text-xs z-10"
                    title="ลบรูปบัตรประชาชน"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Default Styled Mock Thai ID Card Placeholder */
                <div className="relative w-full aspect-[85/54] max-w-[260px] bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 border border-sky-300 rounded-xl p-2.5 shadow-2xs flex flex-col justify-between overflow-hidden my-auto">
                  {/* Card Top */}
                  <div className="flex items-center justify-between border-b border-sky-200 pb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">🇹🇭</span>
                      <span className="text-[9px] font-extrabold text-sky-900 leading-none">
                        บัตรประจำตัวประชาชน Thai National ID Card
                      </span>
                    </div>
                  </div>

                  {/* Card Middle */}
                  <div className="flex gap-2 items-center my-1.5">
                    <div className="w-12 h-14 bg-slate-300 rounded border border-slate-400 flex flex-col items-center justify-center text-slate-500 text-[9px]">
                      <ImageIcon className="w-5 h-5 text-slate-400 mb-0.5" />
                      รูปถ่าย
                    </div>
                    <div className="space-y-0.5 text-slate-700 text-[10px] font-mono flex-1 leading-tight">
                      <p className="font-bold text-slate-900 text-[10px]">1 5599 00256 60 7</p>
                      <p className="text-[9px] font-semibold truncate">ชื่อ: {data.requesterName || 'นางสาว ขวัญทิชา ตั้งเสรีกล'}</p>
                      <p className="text-[8.5px] text-slate-600">เกิดวันที่ 21 มี.ค. 2537</p>
                    </div>
                  </div>

                  {/* Card Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="bg-slate-900/80 text-white font-black text-[9px] px-2 py-1 transform -rotate-12 tracking-wider text-center border-y border-white shadow-xs w-[115%]">
                      {data.watermarkText}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Watermark Input (No-Print) */}
              <div className="no-print w-full mt-2 pt-1.5 border-t border-slate-200 text-[11px]">
                <label className="block text-slate-600 font-medium mb-0.5 text-[10px]">
                  ข้อความลายน้ำ (Security Watermark):
                </label>
                <input
                  type="text"
                  value={data.watermarkText}
                  onChange={(e) => onChange({ ...data, watermarkText: e.target.value })}
                  placeholder="ข้อความลายน้ำ"
                  className="w-full border border-slate-300 rounded px-2 py-0.5 text-[11px] font-medium text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signature Modals */}
        <SignatureModal
          isOpen={activeSigModal === 'requester'}
          onClose={() => setActiveSigModal(null)}
          onSave={(sigUrl) => onChange({ ...data, requesterSignature: sigUrl })}
          title="เซ็นชื่อผู้เบิกจ่าย (Requester E-Signature)"
          signerName={data.requesterName}
          initialSignature={data.requesterSignature}
        />

        <SignatureModal
          isOpen={activeSigModal === 'approver'}
          onClose={() => setActiveSigModal(null)}
          onSave={(sigUrl) => onChange({ ...data, approverSignature: sigUrl })}
          title="เซ็นชื่อผู้อนุมัติ (Approver E-Signature)"
          signerName={data.approverName}
          initialSignature={data.approverSignature}
        />
      </div>
    </div>
  );
};
