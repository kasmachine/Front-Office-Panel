import { CashCountData, ReceiptSubstituteData, MonthlyRevenueData, DailyRevenueItem } from '../types';
import { safeLocalStorage } from '../utils/storage';

export const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const MONTH_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DEFAULT_DENOMINATIONS = [
  { value: 1000, label: 'THB 1000.00' },
  { value: 500, label: 'THB 500.00' },
  { value: 100, label: 'THB 100.00' },
  { value: 50, label: 'THB 50.00' },
  { value: 20, label: 'THB 20.00' },
  { value: 10, label: 'THB 10.00' },
  { value: 5, label: 'THB 5.00' },
  { value: 2, label: 'THB 2.00' },
  { value: 1, label: 'THB 1.00' },
];

export function getInitialCashCountData(): CashCountData {
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  return {
    id: `cash-${Date.now()}`,
    date: dateStr,
    shift: 'Early',
    denominations: DEFAULT_DENOMINATIONS.map(d => ({
      value: d.value,
      label: d.label,
      countIn: 0,
      countOut: 0,
    })),
    beerPrevBalance: 0,
    beerShiftDiff: 0,
    staffIn: '',
    staffOut: '',
    expensesIn: [
      { id: 'exp-in-1', item: '', amount: 0, staff: '' },
      { id: 'exp-in-2', item: '', amount: 0, staff: '' },
      { id: 'exp-in-3', item: '', amount: 0, staff: '' },
      { id: 'exp-in-4', item: '', amount: 0, staff: '' },
      { id: 'exp-in-5', item: '', amount: 0, staff: '' },
      { id: 'exp-in-6', item: '', amount: 0, staff: '' },
    ],
    expensesOut: [
      { id: 'exp-out-1', item: '', amount: 0, staff: '' },
      { id: 'exp-out-2', item: '', amount: 0, staff: '' },
      { id: 'exp-out-3', item: '', amount: 0, staff: '' },
      { id: 'exp-out-4', item: '', amount: 0, staff: '' },
      { id: 'exp-out-5', item: '', amount: 0, staff: '' },
      { id: 'exp-out-6', item: '', amount: 0, staff: '' },
    ],
    remarks: '',
    createdAt: Date.now(),
  };
}

export function getInitialReceiptData(): ReceiptSubstituteData {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const storedIdCard = safeLocalStorage.getItem('nan_seasons_id_card_image');

  return {
    id: `receipt-${Date.now()}`,
    companyName: 'บริษัท น่าน ซีซั่นส์ บูติก จำกัด',
    companyAddress: 'เลขที่ 409 หมู่ 3 ตำบลม่วงตึ๊ด อำเภอภูเพียง จังหวัดน่าน 55000',
    startDate: dateStr,
    endDate: dateStr,
    items: [
      { id: 'rec-1', date: dateStr, description: '', amount: 0, remark: '' },
      { id: 'rec-2', date: dateStr, description: '', amount: 0, remark: '' },
      { id: 'rec-3', date: '', description: '', amount: 0, remark: '' },
    ],
    requesterName: 'นางสาว ขวัญทิชา ตั้งเสรีกล',
    requesterPosition: '',
    approverName: 'นายเกษม มนตรี',
    approverPosition: 'เจ้าของกิจการ',
    idCardImage: storedIdCard || null,
    watermarkText: 'ใช้สำหรับใบรับรองแทนใบเสร็จรับเงิน น่าน ซีซั่นส์ บูติก รีสอร์ท เท่านี้',
    createdAt: Date.now(),
  };
}

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function getInitialMonthlyRevenueData(year?: number, month?: number): MonthlyRevenueData {
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1); // 1-12
  const monthIdx = targetMonth - 1;
  const monthShort = MONTH_NAMES_EN[monthIdx] || 'Aug';
  const monthNameStr = `${monthShort} ${String(targetYear).slice(-2)}`;

  const totalDays = new Date(targetYear, targetMonth, 0).getDate();
  const days: Record<number, DailyRevenueItem> = {};

  for (let d = 1; d <= totalDays; d++) {
    days[d] = {
      day: d,
      rooms: 0,
      foodBeverage: 0,
      shop: 0,
      toursEtc: 0,
      massage: 0,
      laundryOthers: 0,
    };
  }

  const docId = `revenue-${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  return {
    id: docId,
    year: targetYear,
    month: targetMonth,
    monthName: monthNameStr,
    days,
    lastYear: { rooms: 0, foodBeverage: 0, shop: 0, toursEtc: 0, massage: 0, laundryOthers: 0 },
    plan: { rooms: 0, foodBeverage: 0, shop: 0, toursEtc: 0, massage: 0, laundryOthers: 0 },
    target: { rooms: 0, foodBeverage: 0, shop: 0, toursEtc: 0, massage: 0, laundryOthers: 0 },
    updatedAt: new Date().toISOString(),
  };
}

export const MORNING_SHIFT_DEFAULT_TASKS = [
  'End transfer call #21#',
  'Count money',
  'Read task and email -New Booking and reply email for agency, Send remind',
  'Charge credit card for booking.com and PMS',
  'Reservation Tour and Guide, Transport ,Remind Guide',
  'Extra bed, Fruit & Flower ดอกไม้กบ',
  'Check VIP room. Guest room walk / Everything Clean',
  'Check missed call & call back',
  'Check breakfast line and Clean table',
  'Check guest bathroom +toilet paper',
  'Check swimming pool +toilet & shower',
  'Clear Kitchen & Clean Coffee Machine',
  'Check payment due out room ,Minibar , Key',
  'Regis daily income check out room (Z)',
  'Give good bye letter to HK',
  'Check credit card net amount.',
  'Prepare welcome drink & drinking water',
  'Regis staff work time in book',
  'Expense Tour Zoho,Invoice, Check payment Tour',
  'Work order list',
  'Check in & check out tour room',
  'Check bicycle / Clear post box',
  'Check breakfast item with kitchen for tomorrow',
  'Clean & fill up wine cellar',
  'Clean lobby, toilet&restaurant',
  'Check the water pump',
  'Walk around the hotel area',
  'Record the expense',
  'The Lamp on the table 16.30pm',
  'Count money',
  'Face Hand over & Line Hand Over',
  'Check list Garden',
  'Clean front desk & PC Computer',
  'Check list must be done before 14.00',
];

export const AFTERNOON_SHIFT_DEFAULT_TASKS = [
  'Count money',
  'Check the check in room(check in time 14:00)',
  'Read task and email',
  'Print check in paper work/breakfast/welcome letter',
  'Check guest bathroom +toilet paper',
  'Check stock Ocha (Beer/soft drink/shop)/ Ocha (Wine ,Cocktail @MB) THU&MON only',
  'Regis daily income POS and (Z)',
  'Check what to sell with kitchen',
  'Record minibar item',
  'Clean lobby, toilet & restaurant',
  '16:00 Check swimming pool+toilet Shower',
  'Report immigration',
  'Daily expenses / Cash Equivalent Certificate',
  'Add hotel Commission',
  'Collect guest breakfast choice',
  'Regis daily tour income at Zoho',
  'Close Ocha Bills',
  'Count money & Z (20.30)',
  '20:30 Send line staff working time',
  'Clean computer & desk',
  'Check folio due out room tomorrow',
  'Check in all room',
  'Send name for tour to insurance (tomorrow)',
  'Charge the light and credit card machine',
  'Close room & turn off the light',
  'Work order list Status',
  'Close front door & back door',
  'Close store room +Laundry room',
  'Close Kitchen (ปิดหน้าต่าง)',
  'Store bicycle /Collect umbrella swimming pool (19.00)',
  'Stock Minibar / Expire',
  'Transfer call *21*0817745223#',
  'Take out the kitchen trash',
  'Check list must be done before 20.30',
];

export function getInitialFrontOfficeChecklistData(targetDate?: string): import('../types').FrontOfficeChecklistData {
  const today = new Date();
  const dateStr = targetDate || today.toISOString().split('T')[0];
  const [y, m, d] = dateStr.split('-');
  const thaiYear = parseInt(y, 10) + 543;
  const dateDisplay = `${d}/${m}/${thaiYear}`;

  return {
    id: `checklist-${dateStr}`,
    date: dateStr,
    dateDisplay,
    morningTasks: MORNING_SHIFT_DEFAULT_TASKS.map((task, idx) => ({
      id: `m-${idx + 1}`,
      title: task,
      completed: false,
      staff: '',
      kas: '',
      note: '',
    })),
    afternoonTasks: AFTERNOON_SHIFT_DEFAULT_TASKS.map((task, idx) => ({
      id: `a-${idx + 1}`,
      title: task,
      completed: false,
      staff: '',
      kas: '',
      note: '',
    })),
    remarks: '***เช็คขนมปังเผื่อขายด้วยค่ะ** // สรุปจำนวนอาหารเช้า...',
    updatedAt: new Date().toISOString(),
  };
}

export function getInitialInvoiceData(): import('../types').InvoiceData {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const randNum = String(Math.floor(1000 + Math.random() * 9000));
  const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  const invNumber = `INV-${yearMonth}-${randNum}`;

  return {
    id: `inv-${Date.now()}`,
    invoiceNumber: invNumber,
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
      { id: 'inv-item-1', description: 'อาหารและเครื่องดื่ม (Food & Beverage)', quantity: 1, unitPrice: 0, amount: 0 },
      { id: 'inv-item-2', description: '', quantity: 1, unitPrice: 0, amount: 0 },
      { id: 'inv-item-3', description: '', quantity: 1, unitPrice: 0, amount: 0 },
    ],
    subtotal: 0,
    discount: 0,
    vatType: 'included',
    vatAmount: 0,
    serviceChargeType: 'none',
    serviceChargeRate: 10,
    serviceChargeAmount: 0,
    grandTotal: 0,
    notes: 'ขอบคุณที่ใช้บริการ / Thank you for choosing Lemongrass Restaurant & Nan Seasons Boutique Resort',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    bankInfo: 'ธนาคารกสิกรไทย (Kasikorn Bank) บัญชี: บริษัท น่าน ซีซั่นส์ บูติก จำกัด',
    issuerName: 'นางสาว ขวัญทิชา ตั้งเสรีกล',
    issuerSignature: null,
    receiverSignature: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

