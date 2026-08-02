import { CashCountData, ReceiptSubstituteData, MonthlyRevenueData, DailyRevenueItem } from '../types';

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
    idCardImage: null,
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
