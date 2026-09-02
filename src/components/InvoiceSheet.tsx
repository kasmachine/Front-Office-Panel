import React, { useState, useEffect } from 'react';
import { InvoiceData, InvoiceItem } from '../types';
import { ArabicToBahtText } from '../utils/bahttext';
import { ArabicToEnglishText } from '../utils/numberToWordsEn';
import { exportToPdf } from '../utils/pdfExport';
import { safeLocalStorage } from '../utils/storage';
import { SignatureModal } from './SignatureModal';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import {
  Plus,
  Trash2,
  Printer,
  FileDown,
  RotateCcw,
  Save,
  PenTool,
  CheckCircle2,
  Percent,
  Search,
  Calendar,
  User,
  CreditCard,
  Building2,
  UtensilsCrossed,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface InvoiceSheetProps {
  initialData?: InvoiceData;
  savedInvoices?: InvoiceData[];
  onSave?: (data: InvoiceData) => void;
  onDelete?: (id: string) => void;
  onOpenVatCalc?: () => void;
}

const COMMON_MENU_ITEMS = [
  { description: 'อาหารและเครื่องดื่ม (Food & Beverage)', unitPrice: 0 },
  { description: 'เซ็ตอาหารเช้า Nan Seasons Signature Breakfast', unitPrice: 350 },
  { description: 'กาแฟสด & เครื่องดื่ม (Fresh Coffee & Drinks)', unitPrice: 95 },
  { description: 'ชุดน้ำชายามบ่าย (Nan Seasons Afternoon Tea Set)', unitPrice: 590 },
  { description: 'อาหารค่ำ Lemongrass Thai Set Dinner', unitPrice: 750 },
  { description: 'น้ำผลไม้ปั่นสด (Fresh Fruit Smoothie)', unitPrice: 85 },
  { description: 'เบียร์สด/ไวน์ (Beer & Wine Selection)', unitPrice: 180 },
  { description: 'ค่าบริการจัดเลี้ยงพิเศษ (Private Catering Service)', unitPrice: 1500 },
  { description: 'เครื่องดื่มต้อนรับและของว่าง (Welcome Refreshment)', unitPrice: 120 },
  { description: 'บริการอาหารและเครื่องดื่มรูมเซอร์วิส (Room Service)', unitPrice: 250 },
];

export const InvoiceSheet: React.FC<InvoiceSheetProps> = ({
  initialData,
  savedInvoices = [],
  onSave,
  onDelete,
  onOpenVatCalc,
}) => {
  // Current editing invoice
  const [invoice, setInvoice] = useState<InvoiceData>(() => {
    if (initialData) return initialData;
    const saved = safeLocalStorage.getItem('lemongrass_active_invoice_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { /* ignore */ }
    }
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const randNum = String(Math.floor(1000 + Math.random() * 9000));
    const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    return {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${yearMonth}-${randNum}`,
      date: dateStr,
      dueDate: dateStr,
      businessName: 'Lemongrass Restaurant manage by Nan Seasons Boutique Resort',
      businessAddress: '409 Moo 3, Ban Nam Krok Mai, Tambon Muang Tid, Amphoe Phu Phiang, Nan 55000, Thailand',
      businessTaxId: '0555561000854',
      businessTel: '081-774-5223, 054-059-698',
      businessEmail: 'info@nanseasons.com',
      customerName: '',
      customerAddress: '',
      customerTaxId: '',
      customerTel: '',
      roomNumber: '',
      items: [
        { id: 'item-1', description: 'อาหารและเครื่องดื่ม (Food & Beverage)', quantity: 1, unitPrice: 0, amount: 0 },
        { id: 'item-2', description: '', quantity: 1, unitPrice: 0, amount: 0 },
      ],
      subtotal: 0,
      discount: 0,
      vatType: 'included',
      vatAmount: 0,
      serviceChargeType: 'none',
      serviceChargeRate: 10,
      serviceChargeAmount: 0,
      grandTotal: 0,
      notes: 'ขอบคุณที่ใช้บริการ / Thank you for dining with Lemongrass Restaurant & Nan Seasons Boutique Resort',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      bankInfo: 'ธนาคารกสิกรไทย (Kasikorn Bank) บัญชี: บริษัท น่าน ซีซั่นส์ บูติก จำกัด',
      issuerName: 'นางสาว ขวัญทิชา ตั้งเสรีกล',
      issuerSignature: null,
      receiverSignature: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  const [activeSigModal, setActiveSigModal] = useState<'issuer' | 'receiver' | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [languageMode, setLanguageMode] = useState<'th' | 'en' | 'bilingual'>('bilingual');

  // Auto-recalculate totals whenever items, discount, vatType, or service charge change
  useEffect(() => {
    // 1. Calculate items amounts and subtotal
    const subtotal = invoice.items.reduce((sum, it) => {
      const itAmt = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      return sum + itAmt;
    }, 0);

    const discount = Number(invoice.discount) || 0;
    const netAfterDiscount = Math.max(0, subtotal - discount);

    // 2. Service charge
    let serviceChargeAmount = 0;
    if (invoice.serviceChargeType === 'percent') {
      const rate = Number(invoice.serviceChargeRate) || 0;
      serviceChargeAmount = (netAfterDiscount * rate) / 100;
    } else if (invoice.serviceChargeType === 'fixed') {
      serviceChargeAmount = Number(invoice.serviceChargeAmount) || 0;
    }

    const baseForVat = netAfterDiscount + serviceChargeAmount;

    // 3. VAT 7%
    let vatAmount = 0;
    let grandTotal = 0;

    if (invoice.vatType === 'included') {
      // VAT is already included inside baseForVat
      // formula: VAT = Total * 7 / 107
      vatAmount = (baseForVat * 7) / 107;
      grandTotal = baseForVat;
    } else if (invoice.vatType === 'excluded') {
      // VAT is added on top
      // formula: VAT = Base * 0.07
      vatAmount = baseForVat * 0.07;
      grandTotal = baseForVat + vatAmount;
    } else {
      // No VAT
      vatAmount = 0;
      grandTotal = baseForVat;
    }

    setInvoice((prev) => ({
      ...prev,
      subtotal,
      vatAmount: Math.round(vatAmount * 100) / 100,
      serviceChargeAmount: Math.round(serviceChargeAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    }));
  }, [
    JSON.stringify(invoice.items),
    invoice.discount,
    invoice.vatType,
    invoice.serviceChargeType,
    invoice.serviceChargeRate,
  ]);

  // Persist draft
  useEffect(() => {
    safeLocalStorage.setItem('lemongrass_active_invoice_draft', JSON.stringify(invoice));
  }, [invoice]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...invoice.items];
    const target = { ...updated[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(val) : target.quantity;
      const price = field === 'unitPrice' ? Number(val) : target.unitPrice;
      target.amount = Math.round((qty * price) * 100) / 100;
    }
    updated[index] = target;
    setInvoice({ ...invoice, items: updated });
  };

  const handleAddItem = (presetDescription?: string, presetPrice?: number) => {
    const newItem: InvoiceItem = {
      id: `inv-item-${Date.now()}-${Math.random()}`,
      description: presetDescription || '',
      quantity: 1,
      unitPrice: presetPrice ?? 0,
      amount: presetPrice ?? 0,
    };
    setInvoice({ ...invoice, items: [...invoice.items, newItem] });
  };

  const handleRemoveItem = (index: number) => {
    if (invoice.items.length <= 1) {
      // Reset single item
      setInvoice({
        ...invoice,
        items: [{ id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, amount: 0 }],
      });
      return;
    }
    const updated = invoice.items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, items: updated });
  };

  const handleSaveCurrentInvoice = () => {
    const toSave: InvoiceData = {
      ...invoice,
      updatedAt: Date.now(),
      createdAt: invoice.createdAt || Date.now(),
    };
    if (onSave) {
      onSave(toSave);
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleCreateNewInvoice = () => {
    if (window.confirm('คุณต้องการสร้างใบแจ้งหนี้ / ใบเสร็จรับเงิน (Invoice) ฉบับใหม่ใช่หรือไม่? (ระบบจะบันทึกฉบับเดิมลงในประวัติ)')) {
      handleSaveCurrentInvoice();
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const randNum = String(Math.floor(1000 + Math.random() * 9000));
      const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const fresh: InvoiceData = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${yearMonth}-${randNum}`,
        date: dateStr,
        dueDate: dateStr,
        businessName: 'Lemongrass Restaurant manage by Nan Seasons Boutique Resort',
        businessAddress: '409 Moo 3, Ban Nam Krok Mai, Tambon Muang Tid, Amphoe Phu Phiang, Nan 55000, Thailand',
        businessTaxId: '0555561000854',
        businessTel: '081-774-5223, 054-059-698',
        businessEmail: 'info@nanseasons.com',
        customerName: '',
        customerAddress: '',
        customerTaxId: '',
        customerTel: '',
        roomNumber: '',
        items: [
          { id: 'item-1', description: 'อาหารและเครื่องดื่ม (Food & Beverage)', quantity: 1, unitPrice: 0, amount: 0 },
          { id: 'item-2', description: '', quantity: 1, unitPrice: 0, amount: 0 },
        ],
        subtotal: 0,
        discount: 0,
        vatType: 'included',
        vatAmount: 0,
        serviceChargeType: 'none',
        serviceChargeRate: 10,
        serviceChargeAmount: 0,
        grandTotal: 0,
        notes: 'ขอบคุณที่ใช้บริการ / Thank you for dining with Lemongrass Restaurant & Nan Seasons Boutique Resort',
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        bankInfo: 'ธนาคารกสิกรไทย (Kasikorn Bank) บัญชี: บริษัท น่าน ซีซั่นส์ บูติก จำกัด',
        issuerName: 'นางสาว ขวัญทิชา ตั้งเสรีกล',
        issuerSignature: null,
        receiverSignature: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setInvoice(fresh);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const filename = `Invoice_${invoice.invoiceNumber || 'Document'}_${invoice.customerName || 'Customer'}.pdf`;
    await exportToPdf('lemongrass-invoice-print-area', filename);
  };

  const handleLoadInvoice = (item: InvoiceData) => {
    setInvoice(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter saved invoices for history list
  const filteredInvoices = savedInvoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.roomNumber && inv.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || inv.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {saveToast && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>บันทึกใบแจ้งหนี้ (Invoice) สำเร็จและซิงค์ข้อมูลเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* Top Action Bar (No-Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-sm">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Lemongrass Restaurant Invoice & Receipt</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-semibold border border-orange-200">
                Nan Seasons Boutique Resort
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              สร้างใบแจ้งหนี้, ใบเสร็จรับเงิน และใบกำกับภาษีสำหรับลูกค้าห้องอาหารและแขกผู้เข้าพัก
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNewInvoice}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="สร้างใบเสร็จ/Invoice ใบใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>สร้างใบใหม่ (New)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentInvoice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="บันทึกลงระบบ & Firestore"
          >
            <Save className="w-3.5 h-3.5" />
            <span>บันทึกข้อมูล (Save)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="พิมพ์เอกสารออกทางเครื่องพิมพ์"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>สั่งพิมพ์ (Print)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="ดาวน์โหลดเป็นไฟล์ PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>ส่งออก PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Menu Preset Bar (No-Print) */}
      <div className="no-print bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            รายการอาหาร & บริการด่วน (Quick Presets):
          </span>
          {onOpenVatCalc && (
            <button
              type="button"
              onClick={onOpenVatCalc}
              className="text-[11px] font-bold text-orange-700 hover:text-orange-900 inline-flex items-center gap-1"
            >
              <Percent className="w-3 h-3" />
              คำนวณ VAT 7%
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MENU_ITEMS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddItem(preset.description, preset.unitPrice)}
              className="text-xs bg-white hover:bg-amber-100/80 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs font-medium cursor-pointer"
            >
              <Plus className="w-3 h-3 text-amber-700" />
              <span>{preset.description}</span>
              {preset.unitPrice > 0 && (
                <span className="text-orange-600 font-bold ml-0.5">฿{preset.unitPrice}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* INVOICE PAPER CONTAINER (Target for Print and PDF export) */}
      <div
        id="lemongrass-invoice-print-area"
        className="bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-md p-6 sm:p-10 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      >
        {/* Header: Company Name & Restaurant Identity */}
        <div className="border-b-2 border-orange-500 pb-5 mb-5 flex flex-wrap justify-between items-start gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <NanSeasonsLogo className="h-10" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {invoice.businessName}
                </h1>
                <p className="text-xs font-semibold text-orange-600">
                  ห้องอาหารเลมอนกราส โดย โรงแทมน่าน ซีซั่นส์ บูติก รีสอร์ท
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-0.5 pt-1 leading-relaxed">
              <p>{invoice.businessAddress}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
                <span><strong>Tax ID (เลขประจำตัวผู้เสียภาษี):</strong> {invoice.businessTaxId}</span>
                <span><strong>Tel:</strong> {invoice.businessTel}</span>
                <span><strong>Email:</strong> {invoice.businessEmail}</span>
              </div>
            </div>
          </div>

          {/* Right Header: Document Type & Number */}
          <div className="text-right sm:min-w-[200px]">
            <div className="inline-block bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm sm:text-base font-black tracking-wider uppercase shadow-xs">
              INVOICE / RECEIPT
            </div>
            <p className="text-xs font-bold text-slate-700 mt-1">ใบแจ้งหนี้ / ใบเสร็จรับเงิน</p>

            <div className="mt-3 text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Invoice No.:</span>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                  className="font-mono font-bold text-slate-900 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 focus:outline-none w-32"
                />
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Date (วันที่):</span>
                <input
                  type="date"
                  value={invoice.date}
                  onChange={(e) => setInvoice({ ...invoice, date: e.target.value, dueDate: e.target.value })}
                  className="font-medium text-slate-900 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 focus:outline-none w-32"
                />
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-slate-500">Room (ห้องพัก):</span>
                <input
                  type="text"
                  placeholder="เช่น Villa 1, Room 102"
                  value={invoice.roomNumber || ''}
                  onChange={(e) => setInvoice({ ...invoice, roomNumber: e.target.value })}
                  className="font-bold text-orange-700 text-right bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 focus:outline-none w-32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200 mb-5 text-xs">
          {/* Customer Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1">
              <User className="w-3.5 h-3.5 text-orange-600" />
              <span>ข้อมูลลูกค้า / ผู้รับบริการ (Customer Bill To):</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">ชื่อลูกค้า / บริษัท:</span>
                <input
                  type="text"
                  placeholder="เช่น คุณสมชาย ใจดี / Khun John Doe"
                  value={invoice.customerName}
                  onChange={(e) => setInvoice({ ...invoice, customerName: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-900 focus:outline-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">ที่อยู่ (Address):</span>
                <input
                  type="text"
                  placeholder="ที่อยู่ลูกค้า (ถ้ามี)"
                  value={invoice.customerAddress || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerAddress: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">เลขประจำตัวผู้เสียภาษี:</span>
                <input
                  type="text"
                  placeholder="Tax ID (ถ้ามี)"
                  value={invoice.customerTaxId || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerTaxId: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-orange-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payment & Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1">
              <CreditCard className="w-3.5 h-3.5 text-orange-600" />
              <span>สถานะ & การชำระเงิน (Payment Details):</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">วิธีชำระเงิน:</span>
                <select
                  value={invoice.paymentMethod}
                  onChange={(e) => setInvoice({ ...invoice, paymentMethod: e.target.value as any })}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-orange-500"
                >
                  <option value="cash">เงินสด (Cash)</option>
                  <option value="credit_card">บัตรเครดิต (Credit Card)</option>
                  <option value="bank_transfer">โอนเงินธนาคาร (Bank Transfer)</option>
                  <option value="promptpay">สแกนพร้อมเพย์ (PromptPay QR)</option>
                  <option value="room_charge">ลงบัญชีห้องพัก (Room Charge)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">สถานะการชำระ:</span>
                <select
                  value={invoice.paymentStatus}
                  onChange={(e) => setInvoice({ ...invoice, paymentStatus: e.target.value as any })}
                  className={`flex-1 font-bold border rounded px-2 py-1 ${
                    invoice.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : invoice.paymentStatus === 'unpaid'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <option value="paid">ชำระเรียบร้อยแล้ว (PAID)</option>
                  <option value="pending">รอการชำระเงิน (PENDING)</option>
                  <option value="unpaid">ยังไม่ชำระเงิน (UNPAID)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 text-slate-500 font-medium">เบอร์โทรติดต่อ:</span>
                <input
                  type="text"
                  placeholder="เบอร์โทรศัพท์ลูกค้า (ถ้ามี)"
                  value={invoice.customerTel || ''}
                  onChange={(e) => setInvoice({ ...invoice, customerTel: e.target.value })}
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-xs text-left border border-slate-300 rounded-xl overflow-hidden">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">ลำดับ<br/>(No.)</th>
                <th className="py-2.5 px-3">รายการอาหาร / เครื่องดื่ม / บริการ (Description)</th>
                <th className="py-2.5 px-3 text-center w-20">จำนวน<br/>(Qty)</th>
                <th className="py-2.5 px-3 text-right w-28">ราคาต่อหน่วย<br/>(Unit Price)</th>
                <th className="py-2.5 px-3 text-right w-28">จำนวนเงิน<br/>(Amount THB)</th>
                <th className="py-2.5 px-2 text-center w-10 no-print">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 text-center font-bold text-slate-500 bg-slate-50/50">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      placeholder="ระบุชื่อรายการอาหาร หรือบริการ..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-orange-500 focus:outline-none py-0.5"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-16 text-center font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:border-orange-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.unitPrice === 0 ? '' : item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0.00"
                      className="w-24 text-right font-mono font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:border-orange-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-2 text-center no-print">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Row Button (No-Print) */}
          <div className="no-print mt-2 flex justify-start">
            <button
              type="button"
              onClick={() => handleAddItem()}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มรายการอาหาร / บริการ (+ Add Item)
            </button>
          </div>
        </div>

        {/* Calculation & Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 border-t border-slate-300 pt-4 mb-5 text-xs">
          {/* Left Column: Words and Notes */}
          <div className="md:col-span-7 space-y-3">
            {/* Amount in Thai & English words */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <span>จำนวนเงินตัวอักษร (Total Amount in Words):</span>
              </div>
              <p className="font-bold text-slate-900 text-xs pl-2 border-l-2 border-amber-400">
                🇹🇭 {ArabicToBahtText(invoice.grandTotal)}
              </p>
              <p className="font-semibold text-slate-700 text-[11px] pl-2 border-l-2 border-amber-300 italic">
                🇬🇧 {ArabicToEnglishText(invoice.grandTotal)}
              </p>
            </div>

            {/* Bank Transfer Information */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <span className="font-bold text-slate-700">ข้อมูลการโอนเงิน (Bank Account):</span>
              <p className="text-slate-800 font-semibold">{invoice.bankInfo}</p>
              <p className="text-slate-500">เลขประจำตัวผู้เสียภาษี: 0555561000854 (น่าน ซีซั่นส์ บูติก จำกัด)</p>
            </div>

            {/* Additional Remarks */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                หมายเหตุเพิ่มเติม (Notes & Remarks):
              </label>
              <textarea
                rows={2}
                value={invoice.notes || ''}
                onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })}
                placeholder="ระบุข้อความขอบคุณ หรือเงื่อนไขเพิ่มเติม..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-orange-500"
              />
            </div>
          </div>

          {/* Right Column: Financial Calculations */}
          <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold">รวมเงิน (Subtotal):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ฿{invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-medium text-slate-600">ส่วนลด (Discount):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">- ฿</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={invoice.discount === 0 ? '' : invoice.discount}
                  onChange={(e) => setInvoice({ ...invoice, discount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0.00"
                  className="w-24 text-right font-mono font-medium text-rose-600 bg-white border border-slate-300 rounded px-1.5 py-0.5 focus:outline-orange-500"
                />
              </div>
            </div>

            {/* Service Charge Settings */}
            <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">Service Charge:</span>
                <select
                  value={invoice.serviceChargeType}
                  onChange={(e) => setInvoice({ ...invoice, serviceChargeType: e.target.value as any })}
                  className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-medium no-print"
                >
                  <option value="none">ไม่มี (0%)</option>
                  <option value="percent">10%</option>
                  <option value="fixed">กำหนดเอง</option>
                </select>
              </div>
              <span className="font-mono font-semibold text-slate-800">
                ฿{invoice.serviceChargeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* VAT Configuration */}
            <div className="flex justify-between items-center text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-600">VAT 7%:</span>
                <select
                  value={invoice.vatType}
                  onChange={(e) => setInvoice({ ...invoice, vatType: e.target.value as any })}
                  className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-medium no-print"
                >
                  <option value="included">รวมในราคา (Included)</option>
                  <option value="excluded">บวกเพิ่ม 7% (Excluded)</option>
                  <option value="none">ไม่คิด VAT (None)</option>
                </select>
              </div>
              <span className="font-mono font-semibold text-slate-800">
                ฿{invoice.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center border-t-2 border-orange-500 pt-2 text-slate-900">
              <div>
                <div className="font-black text-sm text-orange-950 uppercase">ยอดสุทธิ (Grand Total):</div>
                <div className="text-[10px] text-slate-500">
                  {invoice.vatType === 'included'
                    ? '(ราคารวมภาษีมูลค่าเพิ่ม 7% แล้ว)'
                    : invoice.vatType === 'excluded'
                    ? '(ราคาเพิ่มภาษีมูลค่าเพิ่ม 7% แล้ว)'
                    : '(ไม่มีภาษีมูลค่าเพิ่ม)'}
                </div>
              </div>
              <span className="font-mono font-black text-xl text-orange-600">
                ฿{invoice.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-8 border-t border-slate-300 pt-6 mt-6 text-xs">
          {/* Customer Signature */}
          <div className="text-center space-y-2">
            <p className="font-bold text-slate-700">ผู้รับบริการ / ลูกค้า (Customer Signature)</p>
            <div className="h-20 border-b border-dashed border-slate-400 flex flex-col items-center justify-center relative">
              {invoice.receiverSignature ? (
                <img
                  src={invoice.receiverSignature}
                  alt="Customer Signature"
                  className="h-16 object-contain"
                />
              ) : (
                <span className="text-slate-300 text-[11px] italic no-print">ลายมือชื่อลูกค้า</span>
              )}
              {/* E-Signature Button (No-Print) */}
              <button
                type="button"
                onClick={() => setActiveSigModal('receiver')}
                className="no-print absolute bottom-1 right-1 text-[10px] text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-0.5 rounded transition-colors font-bold cursor-pointer"
              >
                <PenTool className="w-2.5 h-2.5 inline mr-1" />
                เซ็นดิจิทัล
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              ( {invoice.customerName || '....................................................'} )
            </p>
            <p className="text-[10px] text-slate-400">วันที่: {invoice.date}</p>
          </div>

          {/* Issuer / Staff Signature */}
          <div className="text-center space-y-2">
            <p className="font-bold text-slate-700">ผู้มีอำนาจลงนาม / พนักงาน (Authorized Signature)</p>
            <div className="h-20 border-b border-dashed border-slate-400 flex flex-col items-center justify-center relative">
              {invoice.issuerSignature ? (
                <img
                  src={invoice.issuerSignature}
                  alt="Issuer Signature"
                  className="h-16 object-contain"
                />
              ) : (
                <span className="text-slate-300 text-[11px] italic no-print">ลายมือชื่อผู้มีอำนาจ</span>
              )}
              {/* E-Signature Button (No-Print) */}
              <button
                type="button"
                onClick={() => setActiveSigModal('issuer')}
                className="no-print absolute bottom-1 right-1 text-[10px] text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-0.5 rounded transition-colors font-bold cursor-pointer"
              >
                <PenTool className="w-2.5 h-2.5 inline mr-1" />
                เซ็นดิจิทัล
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              ( {invoice.issuerName || 'นางสาว ขวัญทิชา ตั้งเสรีกล'} )
            </p>
            <p className="text-[10px] text-slate-400">ในนาม Lemongrass Restaurant / น่าน ซีซั่นส์</p>
          </div>
        </div>
      </div>

      {/* SAVED INVOICES HISTORY LIST (No-Print) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-bold text-slate-900">
              ประวัติใบแจ้งหนี้ & ใบเสร็จที่บันทึกไว้ ({savedInvoices.length} รายการ)
            </h3>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่, ชื่อลูกค้า, ห้อง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-orange-500 w-48 sm:w-60"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-orange-500"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="paid">ชำระแล้ว (Paid)</option>
              <option value="unpaid">ยังไม่ชำระ (Unpaid)</option>
              <option value="pending">รอชำระ (Pending)</option>
            </select>
          </div>
        </div>

        {/* Invoice List Table */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>ยังไม่มีรายการใบแจ้งหนี้ที่บันทึกไว้ หรือไม่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">เลขที่ Invoice</th>
                  <th className="py-2 px-3">วันที่</th>
                  <th className="py-2 px-3">ชื่อลูกค้า / ห้องพัก</th>
                  <th className="py-2 px-3">รายการ</th>
                  <th className="py-2 px-3 text-right">ยอดรวมสุทธิ</th>
                  <th className="py-2 px-3 text-center">สถานะ</th>
                  <th className="py-2 px-3 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-orange-700">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {inv.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{inv.customerName || 'ลูกค้าทั่วไป'}</div>
                      {inv.roomNumber && (
                        <div className="text-[10px] text-orange-600 font-medium">ห้อง: {inv.roomNumber}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate">
                      {inv.items.map((i) => i.description).filter(Boolean).join(', ') || 'ไม่มีรายละเอียด'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ฿{inv.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.paymentStatus === 'unpaid'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.paymentStatus === 'paid' ? 'ชำระแล้ว' : inv.paymentStatus === 'unpaid' ? 'ยังไม่ชำระ' : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleLoadInvoice(inv)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        title="เปิดแก้ไขหรือสั่งพิมพ์"
                      >
                        เปิดดู / แก้ไข
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`คุณต้องการลบ Invoice เลขที่ ${inv.invoiceNumber} ใช่หรือไม่?`)) {
                              onDelete(inv.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="ลบใบแจ้งหนี้นี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={activeSigModal === 'issuer'}
        onClose={() => setActiveSigModal(null)}
        onSave={(sigUrl) => setInvoice({ ...invoice, issuerSignature: sigUrl })}
        title="เซ็นชื่อผู้มีอำนาจออกใบแจ้งหนี้ (Issuer Signature)"
        signerName={invoice.issuerName}
        initialSignature={invoice.issuerSignature}
      />

      <SignatureModal
        isOpen={activeSigModal === 'receiver'}
        onClose={() => setActiveSigModal(null)}
        onSave={(sigUrl) => setInvoice({ ...invoice, receiverSignature: sigUrl })}
        title="เซ็นชื่อลูกค้าผู้รับบริการ (Customer Signature)"
        signerName={invoice.customerName}
        initialSignature={invoice.receiverSignature}
      />
    </div>
  );
};
