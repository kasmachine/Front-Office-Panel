export interface DenominationRow {
  value: number;
  label: string;
  countIn: number;
  countOut: number;
}

export interface ExpenseRow {
  id: string;
  item: string;
  amount: number;
  staff: string;
  date?: string;
  remark?: string;
}

export interface CashCountData {
  id: string;
  date: string; // YYYY-MM-DD or DD/MM/YY
  shift: 'Early' | 'Late' | 'Night' | string;
  denominations: DenominationRow[];
  beerPrevBalance: number;
  beerShiftDiff: number;
  staffIn: string;
  staffOut: string;
  expensesIn: ExpenseRow[];
  expensesOut: ExpenseRow[];
  remarks: string;
  createdAt: number;
}

export interface ReceiptSubstituteItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  remark: string;
}

export interface ReceiptSubstituteData {
  id: string;
  companyName: string;
  companyAddress: string;
  startDate: string;
  endDate: string;
  items: ReceiptSubstituteItem[];
  requesterName: string;
  requesterPosition: string;
  approverName: string;
  approverPosition: string;
  idCardImage: string | null;
  watermarkText: string;
  createdAt: number;
}
