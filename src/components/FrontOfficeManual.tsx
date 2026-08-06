import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  FileText,
  Bookmark,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Clock,
  PhoneCall,
  UserCheck,
  DollarSign,
  BarChart3,
  Home,
  CheckSquare,
  Copy,
  Check,
  HelpCircle,
  Briefcase,
  KeyRound,
  Droplets,
  Zap,
} from 'lucide-react';

interface FrontOfficeManualProps {
  onNavigateTab?: (tab: 'dashboard' | 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist' | 'whatsNew' | 'frontOfficeManual') => void;
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
  steps: {
    number: number;
    title: string;
    description: string;
    warningNote?: string;
  }[];
  importantNotes?: string[];
  relatedTab?: 'cashCount' | 'receiptSubstitute' | 'dailyRevenue' | 'frontOfficeChecklist';
  relatedTabLabel?: string;
}

const SOP_DATA: SOPItem[] = [
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
        description: 'กล่าวทักทายลูกค้าด้วยรอยยิ้ม "สวัสดียามเช้า/บ่าย Nan Seasons Resort ยินดีต้อนรับครับ/ค่ะ" ยื่นWelcome Drink ผ้าเย็น และเชิญลูกค้านั่งพัก ณ บริเวณโถงต้อนรับ',
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
        description: 'เข้าเมนู "Daily Revenue" เลือกวันที่ปัจจุบัน และกรอกยอดเงินแยกตาม 6 หมวดหมู่หลัก:',
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
    categoryLabel: 'Housekeeping & Rooms',
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
    categoryLabel: 'Emergency Contacts',
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

  const filteredSOPs = useMemo(() => {
    return SOP_DATA.filter((sop) => {
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
  }, [selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'ทั้งหมด (All SOPs)', icon: BookOpen, count: SOP_DATA.length },
    { id: 'checkin', label: 'Check-In & Check-Out', icon: KeyRound, count: SOP_DATA.filter(s => s.category === 'checkin').length },
    { id: 'finance', label: 'Cash & Payments', icon: DollarSign, count: SOP_DATA.filter(s => s.category === 'finance').length },
    { id: 'revenue', label: 'Daily Revenue', icon: BarChart3, count: SOP_DATA.filter(s => s.category === 'revenue').length },
    { id: 'housekeeping', label: 'Rooms & Housekeeping', icon: Home, count: SOP_DATA.filter(s => s.category === 'housekeeping').length },
    { id: 'emergency', label: 'Emergency & Safety', icon: ShieldAlert, count: SOP_DATA.filter(s => s.category === 'emergency').length },
    { id: 'contacts', label: 'Contact Directory', icon: PhoneCall, count: SOP_DATA.filter(s => s.category === 'contacts').length },
  ];

  const totalReadCount = Object.values(readSOPs).filter(Boolean).length;
  const totalSOPCount = SOP_DATA.length;
  const progressPercent = Math.round((totalReadCount / totalSOPCount) * 100);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold tracking-wide uppercase">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Nan Seasons Resort Operational SOP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Front Office Manual
              <span className="text-slate-300 text-base font-normal hidden sm:inline">(คู่มือปฏิบัติงานแผนกต้อนรับ)</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              คู่มือมาตรฐานขั้นตอนการปฏิบัติงาน (SOP) แผนกต้อนรับส่วนหน้า ระเบียบปฏิบัติการรับเช็คอิน เช็คเอ้าท์ การเงินประจำกะ และเบอร์ติดต่อฉุกเฉิน
            </p>
          </div>

          {/* SOP Read Progress */}
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
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-md"
              >
                ล้าง
              </button>
            )}
          </div>

          {/* Quick Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>พิมพ์คู่มือ (A4)</span>
          </button>
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
              ลองค้นหาด้วยคำสำคัญอื่น หรือกดเลือกหมวดหมู่ "ทั้งหมด" เพื่อดูคู่มือฉบับเต็ม
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all inline-block cursor-pointer"
            >
              ดูขั้นตอน SOP ทั้งหมด
            </button>
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

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
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

                    <div className="p-1.5 text-slate-400 bg-slate-100 rounded-lg">
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

                    {/* Footer Quick Nav Link */}
                    {sop.relatedTab && onNavigateTab && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
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
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
