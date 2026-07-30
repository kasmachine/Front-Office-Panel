import React, { useRef } from 'react';
import { ReceiptSubstituteData, ReceiptSubstituteItem, CashCountData } from '../types';
import { ArabicToBahtText } from '../utils/bahttext';
import { extractMinusExpenses } from '../utils/syncUtils';
import { Plus, Trash2, Upload, Image as ImageIcon, ShieldCheck, RotateCcw, RefreshCw, Calendar } from 'lucide-react';

interface ReceiptSubstituteSheetProps {
  data: ReceiptSubstituteData;
  onChange: (newData: ReceiptSubstituteData) => void;
  onReset: () => void;
  cashCountData?: CashCountData;
  onManualSync?: () => void;
}

export const ReceiptSubstituteSheet: React.FC<ReceiptSubstituteSheetProps> = ({
  data,
  onChange,
  onReset,
  cashCountData,
  onManualSync,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minusCount = cashCountData ? extractMinusExpenses(cashCountData).length : 0;
  const totalAmount = data.items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const bahtText = ArabicToBahtText(totalAmount);

  const handleSetTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    onChange({
      ...data,
      startDate: today,
      endDate: today,
      items: data.items.map((it) => ({ ...it, date: it.date || today })),
    });
  };

  const handleItemChange = (index: number, field: keyof ReceiptSubstituteItem, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...data, items: newItems });
  };

  const addItem = () => {
    const newItem: ReceiptSubstituteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: data.startDate || new Date().toISOString().split('T')[0],
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        onChange({ ...data, idCardImage: uploadEvent.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Control Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:px-4 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700">เครื่องมือ:</span>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-transform active:scale-95"
            title="ล้างข้อมูลในใบรับรองแทนใบเสร็จเพื่อทำรายการใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ลบข้อมูลเก่า & เริ่มใหม่
          </button>
          <button
            type="button"
            onClick={handleSetTodayDate}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
            title="ตั้งค่าวันที่เริ่มต้นและสิ้นสุดเป็นวันปัจจุบัน"
          >
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            ตั้งเป็นวันปัจจุบัน
          </button>
          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 border border-blue-700 rounded-lg shadow-xs transition-colors"
              title="ดึงรายการหัก (-) จากตารางนับเงินมาบันทึกลงในใบรับรองแทนใบเสร็จ"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-hover" />
              ดึงรายการหัก (-) จากตารางนับเงิน
              {minusCount > 0 && (
                <span className="bg-blue-800 text-white font-mono px-1.5 py-0.5 rounded-full text-[10px]">
                  {minusCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 italic">
          * ระบบจะบันทึกและซิงค์ข้อมูล Real-Time อัตโนมัติทุกอุปกรณ์
        </div>
      </div>

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
        </div>

        {/* Declaration Paragraph */}
        <div className="my-6 text-sm md:text-base leading-relaxed text-slate-800 text-justify">
          ข้าพเจ้าขอรับรองว่ารายจ่ายเหล่านี้ไม่อาจเรียกเก็บใบเสร็จรับเงินจากผู้รับเงินได้ และข้าพเจ้าได้จ่ายไปในงานของบริษัทโดยแท้
          ตั้งแต่วันที่{' '}
          <input
            type="text"
            value={data.startDate}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
            placeholder="วว/ดด/ปปปป"
            className="no-print border-b border-slate-400 font-semibold px-2 text-center w-36 outline-none focus:border-orange-500"
          />
          <span className="hidden print:inline font-bold underline px-1">{data.startDate || '........................'}</span>
          {' '}ถึงวันที่{' '}
          <input
            type="text"
            value={data.endDate}
            onChange={(e) => onChange({ ...data, endDate: e.target.value })}
            placeholder="วว/ดด/ปปปป"
            className="no-print border-b border-slate-400 font-semibold px-2 text-center w-36 outline-none focus:border-orange-500"
          />
          <span className="hidden print:inline font-bold underline px-1">{data.endDate || '........................'}</span>
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
              {data.items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-slate-400 hover:bg-slate-50/50">
                  {/* Date */}
                  <td className="border-r border-slate-400 p-1.5 text-center">
                    <input
                      type="text"
                      value={item.date}
                      onChange={(e) => handleItemChange(idx, 'date', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-center border border-slate-200 rounded px-1.5 py-1 text-xs no-print"
                    />
                    <span className="hidden print:inline text-xs">{item.date}</span>
                  </td>

                  {/* Description */}
                  <td className="border-r border-slate-400 p-1.5">
                    {(() => {
                      const displayDesc = item.description ? item.description.replace(/^[-+\s]+/, '') : '';
                      return (
                        <>
                          <input
                            type="text"
                            value={displayDesc}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value.replace(/^[-+\s]+/, ''))}
                            placeholder="ระบุรายละเอียดรายจ่าย"
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs font-medium no-print"
                          />
                          <span className="hidden print:inline text-xs font-medium">{displayDesc}</span>
                        </>
                      );
                    })()}
                  </td>

                  {/* Amount */}
                  <td className="border-r border-slate-400 p-1.5 text-right font-mono">
                    <input
                      type="number"
                      value={item.amount === 0 ? '' : item.amount}
                      onChange={(e) => handleItemChange(idx, 'amount', Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full text-right border border-slate-200 rounded px-2 py-1 text-xs font-mono no-print"
                    />
                    <span className="hidden print:inline text-xs font-mono">
                      {item.amount ? item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </td>

                  {/* Remark */}
                  <td className="border-r border-slate-400 p-1.5 text-center">
                    <input
                      type="text"
                      value={item.remark}
                      onChange={(e) => handleItemChange(idx, 'remark', e.target.value)}
                      placeholder="หมายเหตุ"
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
              ))}
            </tbody>
            <tfoot>
              {/* Total Row */}
              <tr className="border-t-2 border-slate-900 font-bold bg-slate-50">
                <td colSpan={2} className="border-r border-slate-800 px-4 py-2.5 text-left font-bold text-base">
                  รวมทั้งสิ้น
                </td>
                <td className="border-r border-slate-800 px-4 py-2.5 text-right font-mono font-extrabold text-base">
                  THB {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className="px-3 py-2 text-xs text-slate-500 text-center font-normal">
                  -
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Add Row Button */}
          <div className="no-print mt-2 flex justify-start">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md border border-orange-200"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายการรายจ่าย
            </button>
          </div>

          {/* Thai Baht Text Display */}
          <div className="mt-3 text-right font-bold text-slate-800 text-sm md:text-base">
            ( {bahtText} )
          </div>
        </div>

        {/* Staff & Approver Section */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          {/* Requester */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">ข้าพเจ้า:</span>
              <input
                type="text"
                value={data.requesterName}
                onChange={(e) => onChange({ ...data, requesterName: e.target.value })}
                placeholder="ชื่อ-นามสกุล ผู้เบิกจ่าย"
                className="no-print border-b border-slate-400 px-2 py-0.5 font-medium flex-1 outline-none"
              />
              <span className="hidden print:inline font-bold underline">{data.requesterName || '...........................................'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold">ตำแหน่ง:</span>
              <input
                type="text"
                value={data.requesterPosition}
                onChange={(e) => onChange({ ...data, requesterPosition: e.target.value })}
                placeholder="ตำแหน่ง"
                className="no-print border-b border-slate-400 px-2 py-0.5 font-medium flex-1 outline-none"
              />
              <span className="hidden print:inline font-bold underline">{data.requesterPosition || '...........................................'}</span>
            </div>

            <div className="pt-6">
              <div className="border-b border-slate-800 border-dotted w-3/4 mb-1"></div>
              <p className="font-bold text-slate-800">(ผู้เบิกจ่าย)</p>
            </div>
          </div>

          {/* Approver */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">ผู้อนุมัติ:</span>
              <input
                type="text"
                value={data.approverName}
                onChange={(e) => onChange({ ...data, approverName: e.target.value })}
                placeholder="ชื่อ-นามสกุล ผู้อนุมัติ"
                className="no-print border-b border-slate-400 px-2 py-0.5 font-medium flex-1 outline-none"
              />
              <span className="hidden print:inline font-bold underline">{data.approverName || '...........................................'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold">ตำแหน่ง:</span>
              <input
                type="text"
                value={data.approverPosition}
                onChange={(e) => onChange({ ...data, approverPosition: e.target.value })}
                placeholder="ตำแหน่ง (เช่น เจ้าของกิจการ)"
                className="no-print border-b border-slate-400 px-2 py-0.5 font-medium flex-1 outline-none"
              />
              <span className="hidden print:inline font-bold underline">{data.approverPosition || 'เจ้าของกิจการ'}</span>
            </div>

            <div className="pt-6">
              <div className="border-b border-slate-800 border-dotted w-3/4 mb-1"></div>
              <p className="font-bold text-slate-800">(ผู้อนุมัติ)</p>
            </div>
          </div>
        </div>

        {/* Thai ID Card Attachment Section */}
        <div className="mt-10 border-t-2 border-slate-300 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              สำเนาบัตรประจำตัวประชาชนผู้รับเงิน / ผู้เบิกจ่าย (Thai National ID Card Copy)
            </h3>
            <div className="no-print flex items-center gap-2">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                อัปโหลดรูปบัตรประชาชน
              </button>
            </div>
          </div>

          {/* ID Card Display Box with Watermark */}
          <div className="relative border-2 border-slate-400 border-dashed rounded-lg p-3 bg-slate-50 flex flex-col items-center justify-center min-h-[180px] max-w-md mx-auto overflow-hidden">
            {data.idCardImage ? (
              <div className="relative w-full h-auto rounded border border-slate-300 overflow-hidden shadow-xs">
                <img
                  src={data.idCardImage}
                  alt="Thai ID Card Copy"
                  className="w-full object-contain max-h-[220px]"
                />
                {/* Diagonal Watermark Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                  <div className="bg-slate-900/60 text-white font-black text-xs md:text-sm px-4 py-2 transform -rotate-12 tracking-wide text-center border-y-2 border-white shadow-lg w-[120%]">
                    {data.watermarkText}
                  </div>
                </div>
              </div>
            ) : (
              /* Default Styled Mock Thai ID Card Placeholder */
              <div className="relative w-full aspect-[85/54] max-w-[340px] bg-gradient-to-br from-sky-100 via-sky-50 to-blue-100 border border-sky-300 rounded-xl p-3 shadow-xs flex flex-col justify-between overflow-hidden">
                {/* Card Top */}
                <div className="flex items-center justify-between border-b border-sky-200 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-800">
                      🇹🇭
                    </div>
                    <span className="text-[10px] font-extrabold text-sky-900">
                      บัตรประจำตัวประชาชน Thai National ID Card
                    </span>
                  </div>
                </div>

                {/* Card Middle */}
                <div className="flex gap-3 items-center my-2">
                  <div className="w-16 h-20 bg-slate-300 rounded border border-slate-400 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                    <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                    รูปถ่าย
                  </div>
                  <div className="space-y-1 text-slate-700 text-[11px] font-mono flex-1">
                    <p className="font-bold text-slate-900">1 5599 00256 60 7</p>
                    <p className="text-[10px] font-semibold">ชื่อ: {data.requesterName || 'นางสาว ขวัญทิชา ตั้งเสรีกล'}</p>
                    <p className="text-[9px] text-slate-600">เกิดวันที่ 21 มี.ค. 2537</p>
                  </div>
                </div>

                {/* Card Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="bg-slate-900/80 text-white font-black text-[10px] md:text-xs px-3 py-1.5 transform -rotate-12 tracking-wider text-center border-y border-white shadow-md w-[110%]">
                    {data.watermarkText}
                  </div>
                </div>
              </div>
            )}

            {/* Custom Watermark Input (No-Print) */}
            <div className="no-print w-full mt-3 pt-2 border-t border-slate-200 text-xs">
              <label className="block text-slate-600 font-medium mb-1">
                ข้อความลายน้ำกำกับการใช้งาน (Security Watermark):
              </label>
              <input
                type="text"
                value={data.watermarkText}
                onChange={(e) => onChange({ ...data, watermarkText: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
