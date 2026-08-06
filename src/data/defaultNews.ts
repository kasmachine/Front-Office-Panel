import { NewsItem } from '../types';

export const INITIAL_NEWS_ITEMS: NewsItem[] = [
  {
    id: 'news-sys-v2-5',
    title: 'อัปเดตระบบ Nan Seasons v2.5: เพิ่มระบบ Front Office Checklist & เครื่องมือคำนวณ VAT',
    category: 'system',
    priority: 'urgent',
    version: 'v2.5',
    pinned: true,
    author: 'ทีมพัฒนาระบบ (System Admin)',
    date: '2026-08-05',
    summary: 'เพิ่มระบบตรวจรับงานกะเช้า-บ่าย (Checklist), เครื่องมือคำนวณ VAT 7% อัตโนมัติ, และการซิงก์ข้อมูล Firebase แบบเรียลไทม์',
    content: `ยินดีต้อนรับสู่ระบบบริหารจัดการ Nan Seasons Hotel เวอร์ชั่นล่าสุด (v2.5) รายละเอียดฟีเจอร์ใหม่และอัปเดตสำคัญ:

1. **Front Office Checklist (แบบฟอร์มตรวจสอบกะเช้า & กะบ่าย)**:
   - ตรวจรับงานประจำกะ Morning Shift & Afternoon Shift พร้อมการติ๊กสถานะและระบุพนักงานผู้รับผิดชอบ
   - สรุปเปอร์เซ็นต์ความคืบหน้าภาพรวมส่งตรงถึงหน้า Dashboard หลัก

2. **VAT Calculator Modal (เครื่องมือคำนวณภาษีมูลค่าเพิ่ม)**:
   - คำนวณ VAT 7% ทั้งแบบ Exclusive (บวก VAT เพิ่ม) และ Inclusive (รวม VAT อยู่ในยอด)
   - ปุ่มส่งยอดที่คำนวณเข้าสู่ "ใบรับรองแทนใบเสร็จ" (Receipt Substitute) ได้ในคลิกเดียว

3. **Safe Storage & Offline Resilience**:
   - ปรับปรุงการจัดเก็บข้อมูลผ่าน safeLocalStorage ป้องกันความผิดพลาด DOMException บน Safari/iOS และเบราว์เซอร์ส่วนตัว
   - ระบบซิงก์คลาวด์ Firebase Firestore อัปเดตข้อมูลข้ามอุปกรณ์ทันที (Realtime Sync)

4. **What's New (ศูนย์ข่าวสาร & อัปเดต)**:
   - เพิ่มศูนย์กระจายข่าวสาร ประกาศโรงแรม และระเบียบปฏิบัติ (SOP) สำหรับพนักงานต้อนรับ`,
    tags: ['System Update', 'Checklist', 'VAT Calculator', 'Realtime Sync'],
    readBy: [],
    createdAt: 1785910000000,
  },
  {
    id: 'news-hotel-cash-policy',
    title: 'ระเบียบปฏิบัติ: การตรวจสอบและส่งมอบเงินสดประจำกะ (Shift Handover Cash Policy)',
    category: 'hotel',
    priority: 'important',
    pinned: true,
    author: 'ฝ่ายบริหาร (Management)',
    date: '2026-08-01',
    summary: 'แนวทางการลงบันทึก Cash Count และการแนบภาพ/ลายเซ็นอิเล็กทรอนิกส์เมื่อมีการเปลี่ยนกะ',
    content: `เรียน พนักงานแผนกต้อนรับทุกท่าน

เพื่อความถูกต้อง ปลอดภัย และโปร่งใสในการบริหารจัดการเงินสดประจำวัน ฝ่ายบริหารขอแจ้งแนวทางปฏิบัติดังนี้:

1. **การบันทึก Cash Count**:
   - พนักงานผู้ส่งกะและผู้รับกะต้องร่วมกันนับธนบัตร เหรียญ และรายจ่ายเงินสด (Expenses In/Out)
   - บันทึกยอดคงเหลือเบียร์คงคลังประจำกะให้ถูกต้อง

2. **การลงลายมือชื่อ (Digital Signature)**:
   - ให้พนักงานส่งกะ (Staff Out) และรับกะ (Staff In) เซ็นชื่ออิเล็กทรอนิกส์ในระบบทุกครั้ง
   - หากมียอดต่างหรือเหตุจำเป็น ให้บันทึกรายละเอียดลงในช่อง "Remarks / หมายเหตุ"

3. **การสำรองข้อมูล (Export PDF)**:
   - สามารถกดปุ่ม "Export PDF / Print" เพื่อจัดเก็บสรุปยอดประจำกะเข้าแฟ้มเอกสารการเงิน`,
    tags: ['Cash Policy', 'Handover', 'SOP', 'Front Office'],
    readBy: [],
    createdAt: 1785564000000,
  },
  {
    id: 'news-sop-receipt-substitute',
    title: 'คู่มือการใช้งาน: ใบรับรองแทนใบเสร็จ (Receipt Substitute) พร้อม Watermark บัตรประชาชน',
    category: 'sop',
    priority: 'normal',
    author: 'ฝ่ายบัญชีและการเงิน (Accounting)',
    date: '2026-07-28',
    summary: 'ขั้นตอนการออกใบรับรองแทนใบเสร็จสำหรับค่าใช้จ่ายที่ไม่มีใบเสร็จรับเงิน พร้อมการแนบรูปบัตรประชาชนปลอดภัย',
    content: `สำหรับรายการค่าใช้จ่ายของโรงแรมที่ไม่มีใบเสร็จรับเงินอย่างเป็นทางการ (เช่น ค่าจ้างเหมาแรงงานท้องถิ่น, ค่าวัตถุดิบตลาดสด):

1. **การกรอกข้อมูล**:
   - กรอกชื่อผู้ขอเบิก วันที่เริ่ม-สิ้นสุด และรายละเอียดรายการค่าใช้จ่าย
   - ระบุผู้ได้รับอนุมัติ (เจ้าของกิจการ / ผู้จัดการ)

2. **การแนบรูปบัตรประชาชน (ID Card Photo)**:
   - แนบรูปถ่ายบัตรประชาชนของผู้รับเงิน
   - ระบบจะทำการประทับลายน้ำ (Watermark) "ใช้สำหรับ Nan Seasons Hotel เท่านั้น" โดยอัตโนมัติบนรูปภาพเพื่อป้องกันนำไปใช้ผิดวัตถุประสงค์

3. **นำส่งเอกสาร**:
   - พิมพ์เอกสารพร้อมแนบรูปถ่ายแล้วส่งให้ฝ่ายบัญชีเพื่อลงบันทึกเบิกจ่าย`,
    tags: ['Receipt Substitute', 'Accounting', 'Watermark', 'Guide'],
    readBy: [],
    createdAt: 1785218000000,
  },
  {
    id: 'news-sop-daily-revenue',
    title: 'แนวทางการบันทึกรายได้ Daily Revenue & การเปรียบเทียบเป้าหมายการขาย',
    category: 'sop',
    priority: 'normal',
    author: 'ฝ่ายรายได้ (Revenue Dept)',
    date: '2026-07-20',
    summary: 'คำแนะนำการลงยอดขายรายวัน 6 หมวดหมู่ และการติดตาม Target / YoY Performance',
    content: `การบันทึก Daily Revenue เป็นหัวใจสำคัญในการวิเคราะห์ผลประกอบการของ Nan Seasons Hotel:

- **6 หมวดหมู่รายได้**:
  1. Rooms (ห้องพัก)
  2. Food & Beverage (ห้องอาหาร & เครื่องดื่ม)
  3. Shop (สินค้าของฝาก)
  4. Tours & Activities (ทัวร์ & กิจกรรม)
  5. Massage (นวด & สปา)
  6. Laundry & Others (ซักรีด & อื่นๆ)

- **การเปรียบเทียบเป้าหมาย**:
  - ระบบจะแสดงแถบ Progress Bar เปรียบเทียบกับเป้าหมายประจำเดือน (Target)
  - มีการเปรียบเทียบเทียบกับปีก่อน (Year-Over-Year YoY) เพื่อวิเคราะห์แนวโน้มการเติบโต`,
    tags: ['Daily Revenue', 'Target', 'YoY', 'Analytics'],
    readBy: [],
    createdAt: 1784527000000,
  },
];
