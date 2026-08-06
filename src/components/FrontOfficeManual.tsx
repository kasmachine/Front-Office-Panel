import React, { useState, useMemo, useEffect } from 'react';
import {
  subscribeSOPs,
  saveSOPToFirebase,
  deleteSOPFromFirebase,
  saveAllSOPsToFirebase,
  seedInitialSOPsIfNeeded,
} from '../lib/firebase';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Clock,
  PhoneCall,
  DollarSign,
  BarChart3,
  Home,
  CheckSquare,
  Copy,
  Check,
  HelpCircle,
  KeyRound,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  X,
  PlusCircle,
  Save,
  AlertTriangle,
  Paperclip,
  Upload,
  FileText,
  File,
  Download,
  Eye,
  ImageIcon,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';

interface FrontOfficeManualProps {
  onNavigateTab?: (tab: 'dashboard' | 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist' | 'whatsNew' | 'frontOfficeManual') => void;
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
}

const CATEGORY_LABELS: Record<SOPItem['category'], string> = {
  checkin: 'Check-In & Check-Out',
  finance: 'Cash & Payments',
  revenue: 'Daily Revenue',
  housekeeping: 'Rooms & Housekeeping',
  emergency: 'Emergency & Safety',
  contacts: 'Contact Directory',
};

const DEFAULT_SOP_DATA: SOPItem[] = [
  {
    id: 'sop-checkin',
    code: 'SOP-FO-01',
    titleTh: 'ขั้นตอนการเช็คอินผู้เข้าพัก (Guest Check-In Procedure)',
    titleEn: 'Standard Guest Check-In & Guest Registration',
    category: 'checkin',
    categoryLabel: 'Check-In & Check-Out',
    importance: 'CRITICAL',
    estimatedTime: '3-5 นาที / ห้อง',
    summary: 'ขั้นตอนต้อนรับผู้เข้าพัก ตรวจสอบเอกสารสิทธิ์การจอง จัดทำเอกสารลงทะเบียน และการเก็บมัดจำค่าประกันห้องพัก',
    steps: [
      {
        number: 1,
        title: 'การต้อนรับและยื่น Welcome Drink',
        description: 'กล่าวทักทายลูกค้าด้วยรอยยิ้ม "สวัสดียามเช้า/บ่าย Nan Seasons Resort ยินดีต้อนรับครับ/ค่ะ" ยื่น Welcome Drink ผ้าเย็น และเชิญลูกค้านั่งพัก ณ บริเวณโถงต้อนรับ',
      },
      {
        number: 2,
        title: 'ตรวจสอบข้อมูลการจอง (Reservation Verification)',
        description: 'สอบถามชื่อผู้จอง หรือขอเลขที่การจอง (Booking Confirmation) จาก OTAs (Agoda, Booking.com, Traveloka) หรือการจองตรง ตรวจสอบประเภทห้องพัก จำนวนคืน และจำนวนผู้เข้าพักในระบบ',
        warningNote: 'กรณีเป็นการจองผ่าน OTA แบบ Collect by Hotel ให้ยืนยันยอดเงินที่ต้องเรียกเก็บกับลูกค้าก่อนออกใบเสร็จ',
      },
      {
        number: 3,
        title: 'ขอเอกสารระบุตัวตน (ID / Passport Registration)',
        description: 'ขอบัตรประชาชน (ชาวไทย) หรือ หนังสือเดินทาง Passport (ชาวต่างชาติ) ของผู้เข้าพักทุกคน ถ่ายสำเนาเพื่อลงทะเบียนเข้าพัก และเตรียมข้อมูลส่งระบบ ตม.38 (สำหรับชาวต่างชาติ)',
      },
      {
        number: 4,
        title: 'จัดเก็บเงินมัดจำประกันความเสียหาย (Key / Security Deposit)',
        description: 'เรียกเก็บเงินมัดจำประกันห้องพัก ( Security Deposit) 500 - 1,000 บาท/ห้อง (สดหรือโอน) ออกใบรับรองหรือบันทึกในระบบ เพื่อคืนเมื่อเช็คเอ้าท์',
        warningNote: 'กรณียอดเงินมัดจำรับชำระเป็นเงินสด ให้ลงบันทึกในตาราง Cash Count ประจำกะทันที',
      },
      {
        number: 5,
        title: 'แจ้งข้อมูลสิ่งอำนวยความสะดวก และมอบกุญแจห้องพัก',
        description: 'อธิบายเวลาให้บริการอาหารเช้า (07:00 - 10:00 น.), รหัส Wi-Fi, บริการรถกอล์ฟรับส่ง, เบอร์ติดต่อแผนกต้อนรับ (กด 0) และมอบคีย์การ์ด/กุญแจห้องพักพร้อมนำเดินไปยังห้องพัก',
      },
    ],
    importantNotes: [
      'ผู้เข้าพักชาวต่างชาติ ต้องขอ Passport และถ่ายรูปหน้าที่มี Visa/ตราประทับเข้าเมืองทุกครั้งเพื่อส่ง ตม.38 ภายใน 24 ชม.',
      'ห้ามมอบกุญแจห้องพักให้บุคคลอื่นที่ไม่ใช่ชื่อผู้จอง เว้นแต่มีการแจ้งล่วงหน้าพร้อมเอกสารมอบอำนาจ',
    ],
    relatedTab: 'frontOfficeChecklist',
    relatedTabLabel: 'ไปที่รายการเช็คกะ Front Office Checklist',
  },
  {
    id: 'sop-checkout',
    code: 'SOP-FO-02',
    titleTh: 'ขั้นตอนการเช็คเอ้าท์และคืนเงินมัดจำ (Guest Check-Out & Refund)',
    titleEn: 'Guest Check-Out & Room Inspection',
    category: 'checkin',
    categoryLabel: 'Check-In & Check-Out',
    importance: 'CRITICAL',
    estimatedTime: '3-5 นาที / ห้อง',
    summary: 'ขั้นตอนรับกุญแจคืน ประสานแม่บ้านตรวจห้อง ตรวจสอบมินิบาร์ เคลียร์ค่าใช้จ่ายคงค้าง และคืนเงินมัดจำ',
    steps: [
      {
        number: 1,
        title: 'รับกุญแจและสอบถามความประทับใจ',
        description: 'รับคีย์การ์ด/กุญแจจากลูกค้า กล่าวสอบถาม "การเข้าพักเรียบร้อยดีไหมครับ/ค่ะ มีข้อเสนอแนะเพิ่มเติมสำหรับทางรีสอร์ทไหมครับ/ค่ะ"',
      },
      {
        number: 2,
        title: 'วิทยุแจ้งแผนกแม่บ้านตรวจห้องพัก (Room Inspection)',
        description: 'ใช้วิทยุสื่อสารแจ้งแม่บ้านประจำโซน: "ขอเช็คห้อง [หมายเลขห้อง] ครับ/ค่ะ" เพื่อตรวจสอบมินิบาร์ ความเสียหายของทรัพย์สิน และของที่ลูกค้าอาจลืมไว้',
      },
      {
        number: 3,
        title: 'เคลียร์ค่าใช้จ่ายเพิ่มเติม (Extra Charges)',
        description: 'หากมีค่าใช้จ่ายเพิ่มเติม เช่น เครื่องดื่มมินิบาร์, ค่าอาหาร F&B, ค่าซักรีด ให้สรุปยอดและรับชำระเงิน พร้อมออกใบเสร็จรับเงินให้ลูกค้า',
      },
      {
        number: 4,
        title: 'คืนเงินมัดจำประกันห้องพัก (Refund Deposit)',
        description: 'เมื่อแม่บ้านยืนยันว่าห้องพักเรียบร้อยดี ให้คืนเงินมัดจำประกันห้องพัก หากเป็นการคืนเงินสดและต้องออกเอกสาร ให้ใช้ใบรับรองแทนใบเสร็จ (Receipt Substitute)',
        warningNote: 'กรณีมีสินค้ามินิบาร์ถูกใช้ ให้หักจากเงินมัดจำและออกใบเสร็จส่วนต่างคืนให้ลูกค้า',
      },
      {
        number: 5,
        title: 'ขอบคุณและส่งลูกค้าเดินทางกลับ',
        description: 'กล่าวขอบคุณ "ขอบพระคุณที่เลือกพักกับ Nan Seasons Resort ขอให้เดินทางกลับโดยสวัสดิภาพครับ/ค่ะ"',
      },
    ],
    importantNotes: [
      'หากลูกค้าลืมสิ่งของไว้ในห้องพัก ให้แม่บ้านถ่ายรูป นำมาฝากไว้ที่ต้อนรับ และบันทึกในสมุด Lost & Found ทันที',
    ],
    relatedTab: 'receiptSubstitute',
    relatedTabLabel: 'ไปที่หน้า ออกใบรับรองแทนใบเสร็จ',
  },
  {
    id: 'sop-cash-reconciliation',
    code: 'SOP-FO-03',
    titleTh: 'การจัดการเงินสดและส่งมอบกะ (Shift Cash Reconciliation & Handover)',
    titleEn: 'Cash Count & Shift Handover Procedure',
    category: 'finance',
    categoryLabel: 'Cash & Payments',
    importance: 'CRITICAL',
    estimatedTime: '10-15 นาที / จบกะ',
    summary: 'การกระทบยอดเงินสดเข้า-ออกประจำกะ การนับแบงค์/เหรียญ การตรวจสอบสลิปโอน และการลงบันทึกในระบบ Cash Count',
    steps: [
      {
        number: 1,
        title: 'นับเงินสดสำรองคงตู้ (Cash Float Reconciliation)',
        description: 'นับเงินสดทอนสำรองประจำลิ้นชัก (ต้องคงเหลือเงินทอนมาตรฐาน 2,000 บาทเสมอ) ร่วมกับพนักงานกะถัดไป',
      },
      {
        number: 2,
        title: 'คัดแยกเงินสดรับชำระประจำกะ (Shift Cash Received)',
        description: 'แยกเงินสดที่ได้รับชำระจริงจากค่าห้องพัก, มินิบาร์, อาคาร F&B, มัดจำ ตรวจนับแบงค์ 1000, 500, 100, 50, 20 และเหรียญทุกชนิด',
      },
      {
        number: 3,
        title: 'กรอกข้อมูลในหน้า Cash Count Sheet',
        description: 'เปิดเมนู "Cash Count" ในระบบ กรอกจำนวนธนบัตรและเหรียญเพื่อคำนวณยอดเงินสดรวม ยอดเงินโอนผ่าน QR และยอดเงินจ่ายออก',
      },
      {
        number: 4,
        title: 'ตรวจสอบสลิปโอนเงิน PromptPay สแกน QR',
        description: 'ตรวจสอบสลิปโอนเงินทุกใบกับบัญชีธนาคารรีสอร์ท หรือระบบแจ้งเตือนทาง LINE/App ธนาคาร เพื่อป้องกันสลิปปลอมหรือสลิปวน',
        warningNote: 'ห้ามรับสลิปที่ไม่แสดงชื่อบัญชีของบริษัท/รีสอร์ท หรือสลิปที่ไม่ระบุเวลาตรงกับการโอนจริง',
      },
      {
        number: 5,
        title: 'ลงนามส่งมอบกะ (Shift Sign-off)',
        description: 'ทั้งผู้ส่งกะและผู้รับกะร่วมกันตรวจสอบยอดเงินรวม เซ็นชื่อในใบส่งกะ และเก็บบันทึกลงในระบบ',
      },
    ],
    importantNotes: [
      'หากยอดเงินสดขาดหรือเกิน (Cash Short / Over) เกินกว่า 50 บาท ให้บันทึกเหตุผลในช่องหมายเหตุและแจ้งผู้จัดการทันที',
    ],
    relatedTab: 'cashCount',
    relatedTabLabel: 'ไปที่หน้า ตารางนับเงินประจำกะ (Cash Count)',
  },
  {
    id: 'sop-daily-revenue',
    code: 'SOP-FO-04',
    titleTh: 'การลงบันทึกยอดขายประจำวัน 6 หมวดหมู่ (Daily Revenue Entry)',
    titleEn: 'Daily Revenue Categorization & Target Tracking',
    category: 'revenue',
    categoryLabel: 'Daily Revenue',
    importance: 'REQUIRED',
    estimatedTime: '10 นาที / วัน',
    summary: 'การลงรายการยอดขายแยกรายหมวดหมู่ (Rooms, F&B, Shop, Tours, Massage, Laundry) เพื่อประเมินผลงานเทียบเป้าหมายประจำเดือน',
    steps: [
      {
        number: 1,
        title: 'รวบรวมเอกสารการขายทั้งหมดประจำวัน',
        description: 'นำใบเสร็จ สลิปบัตรเครดิต รายงานยอดโอน และรายงานการจอง OTA มารวบรวมแยกตามประเภทบริการ',
      },
      {
        number: 2,
        title: 'กรอกยอดขายลงใน Daily Revenue Sheet',
        description: 'เข้าเมนู "Daily Revenue" เลือกวันที่ปัจจุบัน และกรอกยอดเงินแยกตาม 6 หมวดหมู่หลัก',
      },
      {
        number: 3,
        title: 'ตรวจสอบการแยกหมวดหมู่บริการทั้ง 6 รายการ',
        description: '1. Rooms (ค่าห้องพัก) \n2. Food & Beverage (อาหาร-เครื่องดื่ม) \n3. Shop & Souvenir (ของฝาก) \n4. Tour & Activities (ทัวร์) \n5. Massage & Spa (นวดสปา) \n6. Laundry & Others (ซักรีดและอื่นๆ)',
      },
      {
        number: 4,
        title: 'เปรียบเทียบกับเป้าหมายประจำวัน (Daily Target)',
        description: 'ระบบจะคำนวณ % การบรรลุเป้าหมาย (Achieved Target) ให้อัตโนมัติ เพื่อให้ทีมงานทราบผลประกอบการประจำวัน',
      },
    ],
    importantNotes: [
      'การลงบันทึกยอดขายต้องทำทุกวันก่อนปิดกะดึก (Night Audit / Evening Shift) ไม่ควรรวบไปลงย้อนหลังหลายวัน',
    ],
    relatedTab: 'dailyRevenue',
    relatedTabLabel: 'ไปที่หน้า บันทึกยอดขาย (Daily Revenue)',
  },
  {
    id: 'sop-housekeeping-coordination',
    code: 'SOP-FO-05',
    titleTh: 'การประสานงานแม่บ้านและงานอาคาร (Housekeeping & Maintenance Coordination)',
    titleEn: 'Front Office & Housekeeping/Maintenance SOP',
    category: 'housekeeping',
    categoryLabel: 'Rooms & Housekeeping',
    importance: 'REQUIRED',
    estimatedTime: 'ต่อเนื่องตลอดกะ',
    summary: 'การอัปเดตสถานะห้องพัก การแจ้งทำความสะอาดด่วน และการบันทึกงานซ่อมบำรุงอุปกรณ์ในรีสอร์ท',
    steps: [
      {
        number: 1,
        title: 'อัปเดตสถานะห้องพัก (Room Status Updates)',
        description: 'แจ้งสถานะห้องพักให้แม่บ้านทราบผ่านวิทยุสื่อสารหรือแอปพลิเคชัน: Vacant Clean (ห้องว่างสะอาด), Vacant Dirty (ห้องว่างรอทำความสะอาด), Occupied (มีผู้พัก), Out of Order (ปิดซ่อม)',
      },
      {
        number: 2,
        title: 'การขอรับบริการเสริมพิเศษ (Extra Bed / Amenities Request)',
        description: 'เมื่อลูกค้าขอเตียงเสริม ผ้าเช็ดตัวเพิ่ม หรืออุปกรณ์ใดๆ ให้ลงบันทึกและวิทยุแจ้งแม่บ้านทันที พร้อมแจ้งเวลาที่คาดว่าจะดำเนินการเสร็จ',
      },
      {
        number: 3,
        title: 'การแจ้งซ่อมอุปกรณ์ชำรุด (Maintenance Work Order)',
        description: 'หากพบแอร์ไม่เย็น น้ำไม่ไหล ไฟฟ้าดับ หรืออุปกรณ์ในห้องพักชำรุด ให้กรอกใบแจ้งซ่อมวิทยุแจ้งช่างประจำกะ และติดตามงานจนกว่าจะเสร็จเรียบร้อย',
        warningNote: 'หากกระทบต่อการเข้าพักของลูกค้า ให้พิจารณาย้ายห้องพัก (Room Move) ให้ลูกค้าก่อนโดยด่วน',
      },
    ],
    importantNotes: [
      'การย้ายห้องพักต้องบันทึกเหตุผลในระบบและแจ้งผู้จัดการรับทราบทุกครั้ง',
    ],
    relatedTab: 'frontOfficeChecklist',
    relatedTabLabel: 'ไปที่หน้า Checklist ประจำกะ',
  },
  {
    id: 'sop-emergency',
    code: 'SOP-FO-06',
    titleTh: 'การจัดการเหตุฉุกเฉินและข้อบังคับความปลอดภัย (Emergency Response & Safety SOP)',
    titleEn: 'Emergency Response Procedures & Incident Management',
    category: 'emergency',
    categoryLabel: 'Emergency & Safety',
    importance: 'CRITICAL',
    estimatedTime: 'ทันทีเมื่อเกิดเหตุ',
    summary: 'แนวทางปฏิบัติตนเมื่อเกิดเหตุไฟดับ น้ำไม่ไหล อุบัติเหตุ ทรัพย์สินสูญหาย หรือลูกค้าเจ็บป่วยกะทันหัน',
    steps: [
      {
        number: 1,
        title: 'กรณีไฟฟ้าดับขัดข้อง (Power Outage)',
        description: 'ตรวจสอบว่าไฟดับทั้งรีสอร์ทหรือเฉพาะจุด ติดต่อช่างอาคารเพื่อเปิดเครื่องปั่นไฟสำรอง (Generator) แจ้งลูกค้าด้วยความสุภาพและมอบไฟฉายสำรองหากเป็นเวลากลางคืน',
      },
      {
        number: 2,
        title: 'กรณีระบบน้ำประปาไม่ไหล (Water Supply Failure)',
        description: 'ตรวจสอบปั๊มน้ำหลักของรีสอร์ท ร่วมกับช่างอาคาร หากเป็นปัญหานอกรีสอร์ท ให้ติดต่อการประปาส่วนภูมิภาค และเตรียมน้ำสำรองบริการลูกค้า',
      },
      {
        number: 3,
        title: 'กรณีลูกค้าลืมสิ่งของ (Lost & Found Protocol)',
        description: 'เมื่อพบสิ่งของที่ลูกค้าลืมไว้ ให้ถ่ายรูป บันทึกวันที่ หมายเลขห้อง ลักษณะของสิ่งของ และนำเก็บเข้าตู้เซฟแผนกต้อนรับ ติดต่อลูกค้าผ่านเบอร์โทร/อีเมลในระบบการจอง',
      },
      {
        number: 4,
        title: 'กรณีเจ็บป่วยกะทันหัน หรืออุบัติเหตุ (Medical Emergency)',
        description: 'ประเมินอาการเบื้องต้น ปฐมพยาบาลด้วยกล่องยาประจำต้อนรับ หากอาการรุนแรง ให้โทรสายด่วนกู้ชีพ 1669 หรือ รพ.น่าน (054-710-111) ทันที และแจ้งผู้จัดการโรงแรม',
      },
    ],
    importantNotes: [
      'ห้ามให้ข่าวสารหรือบันทึกภาพเหตุการณ์ร้ายแรงลงโซเชียลมีเดียส่วนตัวเด็ดขาด ให้ผู้จัดการโรงแรมเป็นผู้ประสานงานหลักเท่านั้น',
    ],
  },
  {
    id: 'sop-contacts',
    code: 'SOP-FO-07',
    titleTh: 'สมุดรายชื่อโทรศัพท์ติดต่อสำคัญ (Internal & Emergency Contact Directory)',
    titleEn: 'Important Contact Numbers & Escalation Path',
    category: 'contacts',
    categoryLabel: 'Contact Directory',
    importance: 'REQUIRED',
    estimatedTime: 'อ้างอิงรวดเร็ว',
    summary: 'เบอร์โทรศัพท์ติดต่อภายในบริหารจัดการ ช่าง แม่บ้าน ผู้จัดการ และหน่วยงานฉุกเฉินจังหวัดน่าน',
    steps: [
      {
        number: 1,
        title: 'ผู้บริหารและผู้จัดการ (Hotel Management)',
        description: '• General Manager (GM): 081-999-8888\n• Front Office Supervisor: 082-111-2222\n• Duty Manager Line: 083-333-4444',
      },
      {
        number: 2,
        title: 'แผนกภายในรีสอร์ท (Internal Departments)',
        description: '• แผนกช่างอาคาร (Maintenance): 084-555-6666\n• แผนกแม่บ้าน (Housekeeping): 085-777-8888\n• แผนกครัว/ห้องอาหาร (F&B / Kitchen): 086-999-0000',
      },
      {
        number: 3,
        title: 'หน่วยงานฉุกเฉินและภายนอก (Emergency External Services)',
        description: '• เหตุด่วนเหตุร้าย (Police): 191 หรือ สภ.เมืองน่าน 054-710-234\n• รถพยาบาลกู้ชีพ (Ambulance): 1669 หรือ โรงพยาบาลน่าน 054-710-111\n• สถานีดับเพลิงน่าน (Fire Station): 199 หรือ 054-710-000\n• การไฟฟ้าส่วนภูมิภาค จ.น่าน (PEA Nan): 1129 หรือ 054-710-123\n• การประปาส่วนภูมิภาค จ.น่าน (PWA Nan): 1662 หรือ 054-710-456',
      },
    ],
    importantNotes: [
      'กรณีมีแขกสำคัญ (VIP) หรือเกิดเหตุร้องเรียนรุนแรง ให้ติดต่อ Duty Manager หรือ GM ทันทีตลอด 24 ชั่วโมง',
    ],
  },
];

export const FrontOfficeManual: React.FC<FrontOfficeManualProps> = ({ onNavigateTab }) => {
  const [sops, setSops] = useState<SOPItem[]>(() => {
    try {
      const saved = localStorage.getItem('nan_seasons_sops');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load SOPs from localStorage:', e);
    }
    return DEFAULT_SOP_DATA;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSOPs, setExpandedSOPs] = useState<Record<string, boolean>>({
    'sop-checkin': true,
    'sop-cash-reconciliation': true,
  });
  const [readSOPs, setReadSOPs] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('nan_seasons_read_sops');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal / Form state for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOPItem | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formTitleTh, setFormTitleTh] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formCategory, setFormCategory] = useState<SOPItem['category']>('checkin');
  const [formImportance, setFormImportance] = useState<SOPItem['importance']>('REQUIRED');
  const [formEstimatedTime, setFormEstimatedTime] = useState('3-5 นาที');
  const [formSummary, setFormSummary] = useState('');
  const [formSteps, setFormSteps] = useState<{ title: string; description: string; warningNote: string }[]>([
    { title: '', description: '', warningNote: '' },
  ]);
  const [formNotes, setFormNotes] = useState<string[]>(['']);
  const [formRelatedTab, setFormRelatedTab] = useState<string>('');
  const [formAttachments, setFormAttachments] = useState<SOPAttachment[]>([]);
  const [previewFile, setPreviewFile] = useState<SOPAttachment | null>(null);

  // State and Handler for Printing SOP
  const [printingSOP, setPrintingSOP] = useState<SOPItem | null>(null);

  const handlePrintSOP = (sop: SOPItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrintingSOP(sop);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Helper formatting file size
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper file icon
  const getFileIcon = (fileType: string) => {
    const t = (fileType || '').toLowerCase();
    if (t.includes('image')) return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    if (t.includes('pdf')) return <FileText className="w-4 h-4 text-rose-500" />;
    if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (t.includes('word') || t.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  // Handle upload in form modal
  const handleModalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      if (file.size > 8 * 1024 * 1024) {
        alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 8MB กรุณาเลือกไฟล์ที่ไม่เกิน 8MB`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        if (!url) return;
        const newAtt: SOPAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url,
          uploadedAt: new Date().toISOString(),
        };
        setFormAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  // Handle direct file upload to an existing SOP item
  const handleDirectFileUpload = (sop: SOPItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SOPAttachment[] = [];
    let pendingCount = files.length;

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      if (file.size > 8 * 1024 * 1024) {
        alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 8MB กรุณาเลือกไฟล์ที่ไม่เกิน 8MB`);
        pendingCount--;
        continue;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        if (url) {
          newItems.push({
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            url,
            uploadedAt: new Date().toISOString(),
          });
        }
        pendingCount--;
        if (pendingCount <= 0 && newItems.length > 0) {
          const updatedSOP: SOPItem = {
            ...sop,
            attachments: [...(sop.attachments || []), ...newItems],
          };
          const updatedList = sops.map((s) => (s.id === sop.id ? updatedSOP : s));
          saveSOPsToStorage(updatedList);
          saveSOPToFirebase(updatedSOP).catch(console.error);
        }
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  // Remove attachment directly from SOP
  const handleRemoveDirectAttachment = (sop: SOPItem, attId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('ยืนยันลบไฟล์แนบนี้ใช่หรือไม่?')) return;
    const updatedAttachments = (sop.attachments || []).filter((a) => a.id !== attId);
    const updatedSOP: SOPItem = {
      ...sop,
      attachments: updatedAttachments.length > 0 ? updatedAttachments : undefined,
    };
    const updatedList = sops.map((s) => (s.id === sop.id ? updatedSOP : s));
    saveSOPsToStorage(updatedList);
    saveSOPToFirebase(updatedSOP).catch(console.error);
  };

  // Realtime Firestore Sync
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [isPendingSync, setIsPendingSync] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeSOPs((remoteSOPs, hasPendingWrites, isInitialized) => {
      if (!isMounted) return;
      setIsPendingSync(hasPendingWrites);

      if (remoteSOPs !== null) {
        if (!isInitialized && remoteSOPs.length === 0) {
          // Collection is completely uninitialized in Firestore -> seed initial defaults once
          seedInitialSOPsIfNeeded(DEFAULT_SOP_DATA).catch(() => {});
        } else {
          // Normal sync: update state with remoteSOPs (even if empty after user deleted items)
          setSops(remoteSOPs);
          try {
            localStorage.setItem('nan_seasons_sops', JSON.stringify(remoteSOPs));
          } catch (e) {
            console.error('Failed to save SOPs to localStorage:', e);
          }
        }
        setIsLiveSync(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Delete Confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Helper to persist SOPs
  const saveSOPsToStorage = (updatedList: SOPItem[]) => {
    setSops(updatedList);
    try {
      localStorage.setItem('nan_seasons_sops', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save SOPs:', e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSOPs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleReadStatus = (id: string) => {
    setReadSOPs((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('nan_seasons_read_sops', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save read status', e);
      }
      return updated;
    });
  };

  const handleCopy = (code: string, title: string) => {
    navigator.clipboard.writeText(`${code}: ${title}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Reset to default SOPs
  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตคู่มือ SOP เป็นค่าเริ่มต้นใช่หรือไม่? (การแก้ไขเพิ่มเติมที่คุณสร้างจะถูกลบ)')) {
      saveSOPsToStorage(DEFAULT_SOP_DATA);
      saveAllSOPsToFirebase(DEFAULT_SOP_DATA).catch(console.error);
    }
  };

  // Open Modal for Add New
  const handleOpenAddNew = () => {
    const nextNum = sops.length + 1;
    const padNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    setEditingSOP(null);
    setFormCode(`SOP-FO-${padNum}`);
    setFormTitleTh('');
    setFormTitleEn('');
    setFormCategory('checkin');
    setFormImportance('REQUIRED');
    setFormEstimatedTime('3-5 นาที');
    setFormSummary('');
    setFormSteps([{ title: '', description: '', warningNote: '' }]);
    setFormNotes(['']);
    setFormRelatedTab('');
    setFormAttachments([]);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (sop: SOPItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSOP(sop);
    setFormCode(sop.code);
    setFormTitleTh(sop.titleTh);
    setFormTitleEn(sop.titleEn);
    setFormCategory(sop.category);
    setFormImportance(sop.importance);
    setFormEstimatedTime(sop.estimatedTime);
    setFormSummary(sop.summary);
    setFormSteps(
      sop.steps.map((st) => ({
        title: st.title,
        description: st.description,
        warningNote: st.warningNote || '',
      }))
    );
    setFormNotes(sop.importantNotes && sop.importantNotes.length > 0 ? [...sop.importantNotes] : ['']);
    setFormRelatedTab(sop.relatedTab || '');
    setFormAttachments(sop.attachments ? [...sop.attachments] : []);
    setIsModalOpen(true);
  };

  // Delete SOP
  const handleDeleteSOP = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDeleteSOP = () => {
    if (!deletingId) return;
    const targetId = deletingId;
    const updated = sops.filter((s) => s.id !== targetId);
    saveSOPsToStorage(updated);
    deleteSOPFromFirebase(targetId).catch(console.error);
    setDeletingId(null);
  };

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCode.trim() || !formTitleTh.trim()) {
      alert('กรุณากรอกรหัสและชื่อขั้นตอน SOP ภาษาไทย');
      return;
    }

    const cleanSteps: SOPStep[] = formSteps
      .filter((st) => st.title.trim() || st.description.trim())
      .map((st, index) => ({
        number: index + 1,
        title: st.title.trim() || `ขั้นตอนที่ ${index + 1}`,
        description: st.description.trim(),
        warningNote: st.warningNote.trim() || undefined,
      }));

    const finalSteps: SOPStep[] = cleanSteps.length > 0
      ? cleanSteps
      : (editingSOP?.steps || [
          {
            number: 1,
            title: formTitleTh.trim(),
            description: formSummary.trim() || formTitleTh.trim(),
          },
        ]);

    const cleanNotes = formNotes.map((n) => n.trim()).filter((n) => n.length > 0);
    const finalNotes = cleanNotes.length > 0 ? cleanNotes : editingSOP?.importantNotes;

    let relatedTabLabel = editingSOP?.relatedTabLabel;
    if (formRelatedTab === 'cashCount') relatedTabLabel = 'ไปที่หน้า ตารางนับเงินประจำกะ (Cash Count)';
    else if (formRelatedTab === 'receiptSubstitute') relatedTabLabel = 'ไปที่หน้า ออกใบรับรองแทนใบเสร็จ';
    else if (formRelatedTab === 'dailyRevenue') relatedTabLabel = 'ไปที่หน้า บันทึกยอดขาย (Daily Revenue)';
    else if (formRelatedTab === 'frontOfficeChecklist') relatedTabLabel = 'ไปที่หน้า Checklist ประจำกะ';

    const newOrUpdatedSOP: SOPItem = {
      id: editingSOP ? editingSOP.id : `sop-custom-${Date.now()}`,
      code: formCode.trim().toUpperCase(),
      titleTh: formTitleTh.trim(),
      titleEn: formTitleEn.trim() || formTitleTh.trim(),
      category: formCategory,
      categoryLabel: CATEGORY_LABELS[formCategory] || 'ทั่วไป',
      importance: formImportance,
      estimatedTime: formEstimatedTime.trim() || '3-5 นาที',
      summary: formSummary.trim() || formTitleTh.trim(),
      steps: finalSteps,
      importantNotes: finalNotes,
      relatedTab: (formRelatedTab as SOPItem['relatedTab']) || editingSOP?.relatedTab,
      relatedTabLabel,
      attachments: formAttachments.length > 0 ? formAttachments : undefined,
    };

    let updatedList: SOPItem[];
    if (editingSOP) {
      updatedList = sops.map((s) => (s.id === editingSOP.id ? newOrUpdatedSOP : s));
    } else {
      updatedList = [...sops, newOrUpdatedSOP];
    }

    saveSOPsToStorage(updatedList);
    saveSOPToFirebase(newOrUpdatedSOP).catch(console.error);
    setIsModalOpen(false);
    setExpandedSOPs((prev) => ({ ...prev, [newOrUpdatedSOP.id]: true }));
  };

  // Step builder handlers
  const handleAddStepInput = () => {
    setFormSteps([...formSteps, { title: '', description: '', warningNote: '' }]);
  };

  const handleRemoveStepInput = (index: number) => {
    if (formSteps.length <= 1) return;
    setFormSteps(formSteps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'title' | 'description' | 'warningNote', value: string) => {
    const updated = [...formSteps];
    updated[index][field] = value;
    setFormSteps(updated);
  };

  // Note builder handlers
  const handleAddNoteInput = () => {
    setFormNotes([...formNotes, '']);
  };

  const handleRemoveNoteInput = (index: number) => {
    setFormNotes(formNotes.filter((_, i) => i !== index));
  };

  const handleNoteChange = (index: number, value: string) => {
    const updated = [...formNotes];
    updated[index] = value;
    setFormNotes(updated);
  };

  // Filtered SOP List
  const filteredSOPs = useMemo(() => {
    return sops.filter((sop) => {
      const matchesCategory = selectedCategory === 'all' || sop.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        sop.code.toLowerCase().includes(query) ||
        sop.titleTh.toLowerCase().includes(query) ||
        sop.titleEn.toLowerCase().includes(query) ||
        sop.summary.toLowerCase().includes(query) ||
        sop.steps.some(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.description.toLowerCase().includes(query)
        );

      return matchesCategory && matchesQuery;
    });
  }, [sops, selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'ทั้งหมด (All SOPs)', icon: BookOpen, count: sops.length },
    { id: 'checkin', label: 'Check-In & Check-Out', icon: KeyRound, count: sops.filter((s) => s.category === 'checkin').length },
    { id: 'finance', label: 'Cash & Payments', icon: DollarSign, count: sops.filter((s) => s.category === 'finance').length },
    { id: 'revenue', label: 'Daily Revenue', icon: BarChart3, count: sops.filter((s) => s.category === 'revenue').length },
    { id: 'housekeeping', label: 'Rooms & Housekeeping', icon: Home, count: sops.filter((s) => s.category === 'housekeeping').length },
    { id: 'emergency', label: 'Emergency & Safety', icon: ShieldAlert, count: sops.filter((s) => s.category === 'emergency').length },
    { id: 'contacts', label: 'Contact Directory', icon: PhoneCall, count: sops.filter((s) => s.category === 'contacts').length },
  ];

  const totalReadCount = Object.keys(readSOPs).filter((id) => readSOPs[id] && sops.some((s) => s.id === id)).length;
  const totalSOPCount = sops.length;
  const progressPercent = totalSOPCount > 0 ? Math.round((totalReadCount / totalSOPCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold tracking-wide uppercase">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Nan Seasons Resort Operational SOP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <span className={`w-2 h-2 rounded-full ${isLiveSync ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{isPendingSync ? 'กำลังบันทึก...' : isLiveSync ? 'เชื่อมต่อเรียลไทม์ (Live Sync)' : 'พร้อมใช้งาน'}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Front Office Manual
              <span className="text-slate-300 text-base font-normal hidden sm:inline">(คู่มือปฏิบัติงานแผนกต้อนรับ)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              คู่มือมาตรฐานขั้นตอนการปฏิบัติงาน (SOP) แผนกต้อนรับส่วนหน้า ระเบียบปฏิบัติการรับเช็คอิน เช็คเอ้าท์ การเงินประจำกะ และเบอร์ติดต่อฉุกเฉิน
            </p>
          </div>

          {/* SOP Read Progress & Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3">
            <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60 flex flex-col gap-2 min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  สถานะอ่านคู่มือ
                </span>
                <span className="text-orange-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 text-right">
                อ่านแล้ว {totalReadCount} จาก {totalSOPCount} รายการ SOP
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddNew}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างขั้นตอน SOP ใหม่ (Add New)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาขั้นตอน SOP เช่น 'Check-in', 'เงินมัดจำ', 'ตม.38', 'ไฟดับ', 'SOP-FO-01'..."
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 p-1 rounded-md"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddNew}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-orange-400" />
              <span>เพิ่ม SOP</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
              title="พิมพ์เอกสารหรือบันทึกเป็น PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">พิมพ์ (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              title="รีเซ็ต SOP เป็นค่าเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SOP Content List */}
      <div className="space-y-4">
        {filteredSOPs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบขั้นตอนปฏิบัติงาน (SOP) ที่ค้นหา</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ลองค้นหาด้วยคำสำคัญอื่น หรือกดสร้างขั้นตอน SOP ใหม่เพื่อเพิ่มเข้าสู่คู่มือ
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all inline-block cursor-pointer"
              >
                ดูขั้นตอน SOP ทั้งหมด
              </button>

              <button
                type="button"
                onClick={handleOpenAddNew}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่ม SOP ใหม่</span>
              </button>
            </div>
          </div>
        ) : (
          filteredSOPs.map((sop) => {
            const isExpanded = !!expandedSOPs[sop.id];
            const isRead = !!readSOPs[sop.id];

            return (
              <div
                key={sop.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  isExpanded ? 'border-orange-500/40 ring-1 ring-orange-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* SOP Header Bar */}
                <div
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition-colors"
                  onClick={() => toggleExpand(sop.id)}
                >
                  <div className="flex items-start gap-3.5 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReadStatus(sop.id);
                      }}
                      className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        isRead ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-300 hover:text-slate-400'
                      }`}
                      title={isRead ? 'อ่านและทำความเข้าใจแล้ว' : 'ทำเครื่องหมายว่าอ่านแล้ว'}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${isRead ? 'fill-emerald-100' : ''}`} />
                    </button>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-orange-400 border border-slate-800">
                          {sop.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            sop.importance === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : sop.importance === 'REQUIRED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {sop.importance}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {sop.categoryLabel}
                        </span>
                        {sop.attachments && sop.attachments.length > 0 && (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200">
                            <Paperclip className="w-3 h-3 text-orange-500" />
                            <span>{sop.attachments.length} ไฟล์แนบ</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {sop.estimatedTime}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <span>{sop.titleTh}</span>
                        {isRead && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            อ่านแล้ว
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{sop.summary}</p>
                    </div>
                  </div>

                  {/* Actions (Copy / Print / Edit / Delete / Expand) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(sop.code, sop.titleTh);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="คัดลอกรหัสและชื่อ SOP"
                    >
                      {copiedCode === sop.code ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Print Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePrintSOP(sop, e)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
                      title="พิมพ์คู่มือ SOP นี้"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(sop, e)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200/60 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไข SOP นี้"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSOP(sop.id, e)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 rounded-lg transition-colors cursor-pointer"
                      title="ลบ SOP นี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="p-1.5 text-slate-400 bg-slate-100 rounded-lg ml-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-orange-500" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* SOP Body Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-6">
                    {/* Steps Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-orange-500" />
                        ลำดับขั้นตอนการปฏิบัติงาน (Step-by-Step Execution):
                      </h4>

                      <div className="space-y-3">
                        {sop.steps.map((step) => (
                          <div
                            key={step.number}
                            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-orange-400 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                {step.number}
                              </span>
                              <div className="space-y-1 flex-1">
                                <h5 className="text-xs sm:text-sm font-bold text-slate-800">{step.title}</h5>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                                  {step.description}
                                </p>

                                {step.warningNote && (
                                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong>ข้อควรระวัง:</strong> {step.warningNote}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Important Notes Box */}
                    {sop.importantNotes && sop.importantNotes.length > 0 && (
                      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-2">
                        <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          ข้อปฏิบัติเพิ่มเติมสำคัญ (Key Operating Rules):
                        </h4>
                        <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pl-1">
                          {sop.importantNotes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Attachments Section */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-orange-500" />
                          เอกสารและไฟล์แนบประกอบคู่มือ ({sop.attachments?.length || 0})
                        </h4>

                        <label
                          htmlFor={`direct-file-upload-${sop.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 text-orange-500" />
                          <span>แนบไฟล์เพิ่ม (Add File)</span>
                          <input
                            type="file"
                            id={`direct-file-upload-${sop.id}`}
                            multiple
                            onChange={(e) => handleDirectFileUpload(sop, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {(!sop.attachments || sop.attachments.length === 0) ? (
                        <div className="text-center py-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                          ยังไม่มีเอกสารแนบในขั้นตอนปฏิบัติงานนี้ — สามารถกด <strong className="text-slate-600">"แนบไฟล์เพิ่ม (Add File)"</strong> เพื่ออัปเดตไฟล์ PDF, รูปภาพ หรือคู่มือเพิ่มเติมได้ทันที
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {sop.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0 shadow-2xs">
                                  {getFileIcon(att.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                                    {att.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {formatFileSize(att.size)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 ml-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(att)}
                                  className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                  title="ดูตัวอย่าง / เปิดไฟล์"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                  title="ดาวน์โหลดไฟล์"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveDirectAttachment(sop, att.id, e)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="ลบไฟล์แนบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Quick Nav Link & Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                      {sop.relatedTab && onNavigateTab ? (
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="text-xs text-slate-500">เกี่ยวข้องกับระบบส่วนปฏิบัติงาน:</span>
                          <button
                            type="button"
                            onClick={() => onNavigateTab(sop.relatedTab!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all cursor-pointer"
                          >
                            <span>{sop.relatedTabLabel || 'ไปยังระบบที่เกี่ยวข้อง'}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">หมวดหมู่: {sop.categoryLabel}</span>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => handlePrintSOP(sop, e)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span>พิมพ์ SOP</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(sop, e)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไข SOP</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSOP(sop.id, e)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit SOP Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                  {editingSOP ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {editingSOP ? 'แก้ไขขั้นตอนปฏิบัติงาน (Edit SOP)' : 'สร้างขั้นตอนปฏิบัติงานใหม่ (Add New SOP)'}
                  </h3>
                  <p className="text-xs text-slate-400">กรอกข้อมูลรายละเอียดขั้นตอนการทำงานเพื่ออัปเดตคู่มือ Front Office</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสขั้นตอน SOP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="เช่น SOP-FO-08"
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่ SOP <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SOPItem['category'])}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="checkin">Check-In & Check-Out</option>
                    <option value="finance">Cash & Payments</option>
                    <option value="revenue">Daily Revenue</option>
                    <option value="housekeeping">Rooms & Housekeeping</option>
                    <option value="emergency">Emergency & Safety</option>
                    <option value="contacts">Contact Directory</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อหัวข้อ SOP (ภาษาไทย) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitleTh}
                    onChange={(e) => setFormTitleTh(e.target.value)}
                    placeholder="เช่น ขั้นตอนการต้อนรับและออกใบเสร็จรับเงิน"
                    className="w-full px-3.5 py-2 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อหัวข้อภาษาอังกฤษ (Standard Title EN)</label>
                  <input
                    type="text"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    placeholder="e.g. Standard Reception & Billing Procedure"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ระดับความสำคัญ (Importance Level)</label>
                  <select
                    value={formImportance}
                    onChange={(e) => setFormImportance(e.target.value as SOPItem['importance'])}
                    className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="CRITICAL">CRITICAL (สำคัญมากที่สุด/เร่งด่วน)</option>
                    <option value="REQUIRED">REQUIRED (จำเป็นต้องปฏิบัติ)</option>
                    <option value="RECOMMENDED">RECOMMENDED (ข้อเสนอแนะ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เวลาโดยประมาณในการปฏิบัติงาน</label>
                  <input
                    type="text"
                    value={formEstimatedTime}
                    onChange={(e) => setFormEstimatedTime(e.target.value)}
                    placeholder="เช่น 3-5 นาที / ห้อง"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายสรุปภาพรวม (Summary)</label>
                  <textarea
                    rows={2}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="สรุปสั้นๆ ถึงวัตถุประสงค์ของขั้นตอน SOP นี้..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Dynamic Attachments Builder in Modal */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-orange-500" />
                    แนบไฟล์เอกสารเพิ่มเติม (Attached Documents / Files)
                  </label>

                  <label
                    htmlFor="sop-modal-file-upload"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-500" />
                    <span>เพิ่มไฟล์ (Add File)</span>
                    <input
                      type="file"
                      id="sop-modal-file-upload"
                      multiple
                      onChange={handleModalFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {formAttachments.length === 0 ? (
                  <div className="text-center py-5 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs space-y-1">
                    <Upload className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600">แนบไฟล์คู่มือ, เอกสาร PDF, ภาพถ่ายขั้นตอน หรือเอกสารอ้างอิง</p>
                    <p className="text-[11px] text-slate-400">รองรับไฟล์ภาพ, PDF, Word, Excel (ขนาดไม่เกิน 8MB ต่อไฟล์)</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {formAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-1.5 bg-white rounded-lg border border-slate-200 shrink-0">
                            {getFileIcon(att.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(att)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                            title="ดูไฟล์"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="ลบไฟล์"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-orange-400" />
                  <span>{editingSOP ? 'บันทึกการแก้ไข' : 'สร้าง SOP ใหม่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการลบขั้นตอน SOP</h3>
                <p className="text-xs text-slate-500">คุณแน่ใจหรือว่าต้องการลบ SOP รายการนี้ออกจากคู่มือ?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono">
              {sops.find((s) => s.id === deletingId)?.code}: {sops.find((s) => s.id === deletingId)?.titleTh}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDeleteSOP}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-200 shrink-0">
                  {getFileIcon(previewFile.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{previewFile.name}</h3>
                  <p className="text-[11px] text-slate-500">{formatFileSize(previewFile.size)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 rounded-2xl p-2 flex items-center justify-center min-h-[250px] max-h-[60vh]">
              {previewFile.type.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-xs" />
              ) : previewFile.type.includes('pdf') ? (
                <iframe src={previewFile.url} title={previewFile.name} className="w-full h-[55vh] rounded-xl border border-slate-200" />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    ไฟล์ประเภทนี้อาจไม่สามารถแสดงตัวอย่างแบบโต้ตอบได้โดยตรง
                  </p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-orange-400" />
                    <span>ดาวน์โหลดไฟล์ ({previewFile.name})</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <a
                href={previewFile.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดในหน้าต่างใหม่</span>
              </a>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  <span>ดาวน์โหลด</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Document Template */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sop-area, #printable-sop-area * {
            visibility: visible !important;
          }
          #printable-sop-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 24px !important;
            font-family: sans-serif !important;
          }
        }
      `}</style>

      {printingSOP && (
        <div id="printable-sop-area" className="hidden print:block">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-slate-900">คู่มือขั้นตอนการปฏิบัติงานแผนกต้อนรับส่วนหน้า (Front Office SOP)</h1>
                <p className="text-xs font-bold text-slate-600 mt-1">STANDARD OPERATING PROCEDURE MANUAL</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono text-xs font-bold px-3 py-1 rounded">
                  {printingSOP.code}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-300 mb-6 text-xs">
            <div>
              <p className="text-slate-500 font-bold uppercase text-[10px]">หัวข้อขั้นตอนปฏิบัติงาน / Title (TH):</p>
              <p className="text-sm font-black text-slate-900">{printingSOP.titleTh}</p>
              {printingSOP.titleEn && <p className="text-xs text-slate-600 font-semibold">{printingSOP.titleEn}</p>}
            </div>
            <div>
              <p className="text-slate-500 font-bold uppercase text-[10px]">หมวดหมู่ / Category:</p>
              <p className="font-bold text-slate-800">{printingSOP.categoryLabel}</p>
            </div>
            <div>
              <p className="text-slate-500 font-bold uppercase text-[10px]">ระดับความสำคัญ / Priority:</p>
              <p className="font-bold text-slate-800">{printingSOP.importance}</p>
            </div>
            <div>
              <p className="text-slate-500 font-bold uppercase text-[10px]">เวลาโดยประมาณ / Est. Duration:</p>
              <p className="font-bold text-slate-800">{printingSOP.estimatedTime}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
              วัตถุประสงค์และภาพรวม (Summary)
            </h3>
            <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 border border-slate-200 rounded">
              {printingSOP.summary}
            </p>
          </div>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-300 pb-1">
              ลำดับขั้นตอนปฏิบัติงาน (Step-by-Step Procedure)
            </h3>
            <div className="space-y-3">
              {printingSOP.steps.map((st, idx) => (
                <div key={idx} className="border border-slate-300 rounded-lg p-3 text-xs bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                      {st.number || idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{st.title}</span>
                  </div>
                  <p className="text-slate-700 pl-7 whitespace-pre-wrap leading-relaxed">{st.description}</p>
                  {st.warningNote && (
                    <div className="mt-2 ml-7 p-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px] font-medium">
                      <strong>ข้อควรระวัง:</strong> {st.warningNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          {printingSOP.importantNotes && printingSOP.importantNotes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
                ข้อปฏิบัติเพิ่มเติมสำคัญ (Key Operating Rules)
              </h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-800 pl-2">
                {printingSOP.importantNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Attachments */}
          {printingSOP.attachments && printingSOP.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
                รายการเอกสารและไฟล์แนบ ({printingSOP.attachments.length})
              </h3>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-2">
                {printingSOP.attachments.map((att) => (
                  <li key={att.id}>
                    {att.name} ({formatFileSize(att.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Approval Signatures Footer */}
          <div className="mt-12 pt-6 border-t border-slate-400 grid grid-cols-3 gap-4 text-center text-xs text-slate-700">
            <div>
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold">ผู้บันทึก / พนักงาน</p>
              <p className="text-[10px] text-slate-500">ลายมือชื่อและวันที่</p>
            </div>
            <div>
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold">หัวหน้าแผนก (Front Office Supervisor)</p>
              <p className="text-[10px] text-slate-500">ลายมือชื่อและวันที่</p>
            </div>
            <div>
              <div className="h-12 border-b border-slate-400 mb-2"></div>
              <p className="font-bold">ผู้จัดการทั่วไป (General Manager)</p>
              <p className="text-[10px] text-slate-500">ลายมือชื่อและวันที่</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
