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
  shift: 'Early' | 'Late' | string;
  denominations: DenominationRow[];
  beerPrevBalance: number;
  beerShiftDiff: number;
  staffIn: string;
  staffOut: string;
  staffInSignature?: string | null;
  staffOutSignature?: string | null;
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
  requesterSignature?: string | null;
  approverSignature?: string | null;
  idCardImage: string | null;
  watermarkText: string;
  createdAt: number;
}

export interface RevenueCategories {
  rooms: number;
  foodBeverage: number;
  shop: number;
  toursEtc: number;
  massage: number;
  laundryOthers: number;
}

export interface DailyRevenueItem extends RevenueCategories {
  day: number;
  note?: string;
}

export interface MonthlyRevenueData {
  id: string; // e.g. "revenue-2026-08"
  year: number;
  month: number; // 1-12
  monthName?: string;
  days: Record<number, DailyRevenueItem>;
  lastYear: RevenueCategories;
  plan: RevenueCategories;
  target: RevenueCategories;
  updatedAt?: string;
}

export interface RevenueHistoryRecord {
  id: string; // unique e.g. "rev-hist-2026-08-1722591234"
  docId: string; // "revenue-2026-08"
  year: number;
  month: number; // 1-12
  monthName: string; // e.g. "สิงหาคม 2569"
  updatedAt: string;
  totalRevenue: number;
  data: MonthlyRevenueData;
  createdAt?: number;
}

export interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
  staff: string;
  kas: string;
  note?: string;
  updatedAt?: string;
}

export interface FrontOfficeChecklistData {
  id: string;
  date: string; // YYYY-MM-DD
  dateDisplay?: string; // DD/MM/YYYY
  morningTasks: ChecklistTask[];
  afternoonTasks: ChecklistTask[];
  remarks: string;
  updatedAt?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  category: 'system' | 'hotel' | 'sop';
  priority: 'normal' | 'important' | 'urgent';
  content: string;
  summary?: string;
  author: string;
  date: string; // YYYY-MM-DD
  pinned?: boolean;
  version?: string;
  tags?: string[];
  readBy?: string[];
  createdAt: number;
}

export interface SOPStep {
  number: number;
  title: string;
  description: string;
  warningNote?: string;
}

export interface SOPAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface SOPItem {
  id: string;
  code: string;
  titleTh: string;
  titleEn: string;
  category: 'checkin' | 'finance' | 'revenue' | 'housekeeping' | 'emergency' | 'contacts';
  categoryLabel: string;
  importance: 'CRITICAL' | 'REQUIRED' | 'RECOMMENDED';
  estimatedTime: string;
  summary: string;
  steps: SOPStep[];
  importantNotes?: string[];
  relatedTab?: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist';
  relatedTabLabel?: string;
  attachments?: SOPAttachment[];
  updatedAt?: string;
  createdAt?: number;
}

export interface MeetingActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  remark?: string;
}

export interface MeetingAgendaItem {
  id: string;
  agendaNumber: number;
  title: string;
  content: string;
}

export interface MeetingMinuteData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: 'weekly' | 'monthly' | 'departmental' | 'emergency' | 'general';
  chairPerson: string;
  minuteTaker: string;
  attendees: string[];
  absentees?: string[];
  agendas: MeetingAgendaItem[];
  actionItems: MeetingActionItem[];
  generalNotes?: string;
  status: 'draft' | 'published' | 'completed';
  createdAt: number;
  updatedAt?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  dueDate?: string;
  businessName: string;
  businessAddress: string;
  businessTaxId?: string;
  businessTel?: string;
  businessEmail?: string;
  customerName: string;
  customerAddress?: string;
  customerTaxId?: string;
  customerTel?: string;
  roomNumber?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  vatType: 'included' | 'excluded' | 'none'; // VAT 7%
  vatAmount: number;
  serviceChargeType: 'none' | 'percent' | 'fixed';
  serviceChargeRate: number; // e.g. 10%
  serviceChargeAmount: number;
  grandTotal: number;
  notes?: string;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'promptpay' | 'room_charge';
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  bankInfo?: string;
  issuerName?: string;
  issuerSignature?: string | null;
  receiverSignature?: string | null;
  createdAt: number;
  updatedAt?: number;
}

