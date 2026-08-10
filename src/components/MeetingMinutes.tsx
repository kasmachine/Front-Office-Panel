import React, { useState, useEffect, useMemo } from 'react';
import { MeetingMinuteData, MeetingActionItem, MeetingAgendaItem } from '../types';
import { INITIAL_MEETING_MINUTES } from '../data/defaultMeetingMinutes';
import { safeLocalStorage } from '../utils/storage';
import { saveMeetingMinuteToFirebase, deleteMeetingMinuteFromFirebase, subscribeMeetingMinutes } from '../lib/firebase';
import { NanSeasonsLogo } from './NanSeasonsLogo';
import { getStoredStaffList } from './StaffSelect';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Printer,
  Trash2,
  Edit,
  Eye,
  X,
  ChevronRight,
  Filter,
  User,
  ListTodo,
  CheckSquare,
  Sparkles,
  ArrowLeft,
  Save,
  Building2,
  Share2,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'nan_seasons_meeting_minutes_v1';

export function getStoredMeetingMinutes(): MeetingMinuteData[] {
  try {
    const saved = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read meeting minutes from localStorage', e);
  }
  return INITIAL_MEETING_MINUTES;
}

export function saveMeetingMinutesLocally(list: MeetingMinuteData[]) {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save meeting minutes locally', e);
  }
}

interface MeetingMinutesProps {
  staffList?: string[];
  currentUser?: string;
}

export const MeetingMinutes: React.FC<MeetingMinutesProps> = ({ staffList: propsStaffList, currentUser = 'นางสาว ขวัญทิชา ตั้งเสรีกล' }) => {
  const [meetings, setMeetings] = useState<MeetingMinuteData[]>(getStoredMeetingMinutes);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'action_items' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Selected or Active Editing Meeting
  const [editingMeeting, setEditingMeeting] = useState<MeetingMinuteData | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<MeetingMinuteData | null>(null);

  // Available staff list
  const availableStaff = useMemo(() => {
    const stored = getStoredStaffList();
    if (propsStaffList && propsStaffList.length > 0) {
      return Array.from(new Set([...propsStaffList, ...stored]));
    }
    return stored;
  }, [propsStaffList]);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    const unsubscribe = subscribeMeetingMinutes((remoteItems) => {
      if (remoteItems && Array.isArray(remoteItems) && remoteItems.length > 0) {
        setMeetings(remoteItems);
        saveMeetingMinutesLocally(remoteItems);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered Meetings List
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.chairPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.minuteTaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.agendas.some((a) => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.actionItems.some((act) => act.task.toLowerCase().includes(searchQuery.toLowerCase()) || act.assignee.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [meetings, searchQuery, selectedCategory]);

  // All Action Items flattened across all meetings
  const allActionItems = useMemo(() => {
    const items: { meetingTitle: string; meetingDate: string; meetingId: string; item: MeetingActionItem }[] = [];
    meetings.forEach((m) => {
      m.actionItems.forEach((act) => {
        items.push({
          meetingTitle: m.title,
          meetingDate: m.date,
          meetingId: m.id,
          item: act,
        });
      });
    });
    return items;
  }, [meetings]);

  // Action Items Statistics
  const actionStats = useMemo(() => {
    const total = allActionItems.length;
    const completed = allActionItems.filter((i) => i.item.status === 'completed').length;
    const inProgress = allActionItems.filter((i) => i.item.status === 'in_progress').length;
    const pending = allActionItems.filter((i) => i.item.status === 'pending').length;
    return { total, completed, inProgress, pending };
  }, [allActionItems]);

  // Helper to start creating a new meeting minute
  const handleStartNewMeeting = () => {
    const today = new Date().toISOString().split('T')[0];
    const newMeeting: MeetingMinuteData = {
      id: `meeting-${Date.now()}`,
      title: 'ประชุมติดตามการปฏิบัติงานประจำสัปดาห์ Front Office',
      date: today,
      startTime: '10:00',
      endTime: '11:00',
      location: 'ห้องประชุม น่าน ซีซั่นส์ บูติก รีสอร์ท',
      category: 'weekly',
      chairPerson: 'นายเกษม มนตรี (เจ้าของกิจการ)',
      minuteTaker: currentUser || 'นางสาว ขวัญทิชา ตั้งเสรีกล',
      attendees: availableStaff.slice(0, 4),
      absentees: [],
      agendas: [
        {
          id: `agenda-${Date.now()}-1`,
          agendaNumber: 1,
          title: 'วาระที่ 1: รายงานผลการดำเนินงาน และยอดเข้าพัก',
          content: '• สรุปอัตราการเข้าพักและผลการดำเนินงานสัปดาห์ที่ผ่านมา\n• ข้อเสนอแนะและการปรับปรุงการให้บริการพนักงานต้อนรับ',
        },
        {
          id: `agenda-2`,
          agendaNumber: 2,
          title: 'วาระที่ 2: ปัญหา อุปสรรค และการแก้ไข',
          content: '• ติดตามปัญหาสภาพอุปกรณ์และการบำรุงรักษาในห้องพัก',
        },
      ],
      actionItems: [
        {
          id: `act-${Date.now()}-1`,
          task: 'ตรวจสอบความพร้อมของอุปกรณ์ประจำกะ',
          assignee: availableStaff[0] || 'พนักงานต้อนรับ',
          dueDate: today,
          status: 'pending',
          remark: '',
        },
      ],
      generalNotes: 'สรุปการประชุมและบันทึกข้อตกลงร่วมกัน',
      status: 'draft',
      createdAt: Date.now(),
    };
    setEditingMeeting(newMeeting);
    setActiveSubTab('editor');
  };

  // Save or update meeting minute
  const handleSaveMeeting = (meetingToSave: MeetingMinuteData) => {
    const existingIndex = meetings.findIndex((m) => m.id === meetingToSave.id);
    let updatedList: MeetingMinuteData[];
    if (existingIndex >= 0) {
      updatedList = [...meetings];
      updatedList[existingIndex] = { ...meetingToSave, updatedAt: Date.now() };
    } else {
      updatedList = [meetingToSave, ...meetings];
    }
    setMeetings(updatedList);
    saveMeetingMinutesLocally(updatedList);
    saveMeetingMinuteToFirebase(meetingToSave);

    setEditingMeeting(null);
    setActiveSubTab('list');
  };

  // Delete meeting minute
  const handleDeleteMeeting = (meetingId: string) => {
    if (window.confirm('คุณต้องการลบรายงานการประชุมนี้ใช่หรือไม่?')) {
      const updatedList = meetings.filter((m) => m.id !== meetingId);
      setMeetings(updatedList);
      saveMeetingMinutesLocally(updatedList);
      deleteMeetingMinuteFromFirebase(meetingId);
      if (viewingMeeting?.id === meetingId) setViewingMeeting(null);
    }
  };

  // Quick toggle action item status
  const handleToggleActionStatus = (meetingId: string, actionId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const updatedList = meetings.map((m) => {
      if (m.id !== meetingId) return m;
      const updatedActions = m.actionItems.map((act) => {
        if (act.id !== actionId) return act;
        return { ...act, status: newStatus };
      });
      const updatedMeeting = { ...m, actionItems: updatedActions, updatedAt: Date.now() };
      saveMeetingMinuteToFirebase(updatedMeeting);
      return updatedMeeting;
    });
    setMeetings(updatedList);
    saveMeetingMinutesLocally(updatedList);
  };

  // Print function
  const handlePrint = (meeting: MeetingMinuteData) => {
    setViewingMeeting(meeting);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    weekly: { label: 'ประจำสัปดาห์ (Weekly)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    monthly: { label: 'ประจำเดือน (Monthly)', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    departmental: { label: 'เฉพาะแผนก (Departmental)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    emergency: { label: 'วาระเร่งด่วน (Emergency)', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    general: { label: 'การประชุมทั่วไป (General)', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* Printable Area (Invisible normally, visible during print) */}
      {viewingMeeting && (
        <div id="print-meeting-area" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white flex items-center justify-center p-1 border border-slate-200 rounded">
                <NanSeasonsLogo className="h-12" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">น่าน ซีซั่นส์ บูติก รีสอร์ท (Nan Seasons Boutique Resort)</h1>
                <p className="text-sm font-semibold text-orange-700">รายงานการประชุม / MEETING MINUTES</p>
                <p className="text-xs text-slate-500">ระบบบริหารจัดการเอกสารฝ่ายปฏิบัติการ (Front Office Panel)</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="font-bold">เอกสารทางราชการ/ภายใน</p>
              <p>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mb-6 text-sm">
            <h2 className="text-base font-bold text-slate-900 mb-3 border-b border-slate-200 pb-1">
              {viewingMeeting.title}
            </h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs sm:text-sm">
              <p><span className="font-semibold text-slate-700">ประเภทการประชุม:</span> {categoryLabels[viewingMeeting.category]?.label}</p>
              <p><span className="font-semibold text-slate-700">วันที่:</span> {viewingMeeting.date}</p>
              <p><span className="font-semibold text-slate-700">เวลา:</span> {viewingMeeting.startTime} - {viewingMeeting.endTime} น.</p>
              <p><span className="font-semibold text-slate-700">สถานที่:</span> {viewingMeeting.location}</p>
              <p><span className="font-semibold text-slate-700">ประธานการประชุม:</span> {viewingMeeting.chairPerson}</p>
              <p><span className="font-semibold text-slate-700">ผู้บันทึกรายงาน:</span> {viewingMeeting.minuteTaker}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-xs">
              <p className="font-semibold text-slate-700">ผู้เข้าร่วมประชุม:</p>
              <p className="text-slate-800 mt-0.5">{viewingMeeting.attendees.join(', ')}</p>
              {viewingMeeting.absentees && viewingMeeting.absentees.length > 0 && (
                <p className="text-rose-600 mt-1"><span className="font-semibold">ผู้ลา/ไม่ได้เข้าร่วม:</span> {viewingMeeting.absentees.join(', ')}</p>
              )}
            </div>
          </div>

          {/* Agendas Section */}
          <div className="mb-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
              สรุปเนื้อหาและวาระการประชุม (Agendas & Discussions)
            </h3>
            {viewingMeeting.agendas.map((agenda) => (
              <div key={agenda.id} className="border-l-2 border-orange-500 pl-3 py-1">
                <h4 className="text-xs font-bold text-slate-900">{agenda.title}</h4>
                <p className="text-xs text-slate-700 whitespace-pre-line mt-1 leading-relaxed">{agenda.content}</p>
              </div>
            ))}
          </div>

          {/* Action Items Section */}
          {viewingMeeting.actionItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-2 mb-3">
                มติที่ประชุม และ งานที่ต้องติดตาม (Action Items)
              </h3>
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border border-slate-300 w-10 text-center">#</th>
                    <th className="p-2 border border-slate-300">สิ่งที่ต้องดำเนินการ</th>
                    <th className="p-2 border border-slate-300 w-32">ผู้รับผิดชอบ</th>
                    <th className="p-2 border border-slate-300 w-24">กำหนดส่ง</th>
                    <th className="p-2 border border-slate-300 w-24 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingMeeting.actionItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-medium text-slate-900">{item.task}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{item.assignee}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{item.dueDate}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-slate-800">
                        {item.status === 'completed' ? 'เสร็จสิ้น' : item.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewingMeeting.generalNotes && (
            <div className="mb-8 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-bold text-slate-800">บันทึกเพิ่มเติม: </span>
              <span className="text-slate-700">{viewingMeeting.generalNotes}</span>
            </div>
          )}

          {/* Signature Sign-offs */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs">
            <div>
              <p className="text-slate-600 mb-8">ลงชื่อ..............................................................</p>
              <p className="font-bold text-slate-900">({viewingMeeting.minuteTaker})</p>
              <p className="text-slate-500">ผู้บันทึกรายงานการประชุม</p>
            </div>
            <div>
              <p className="text-slate-600 mb-8">ลงชื่อ..............................................................</p>
              <p className="font-bold text-slate-900">({viewingMeeting.chairPerson})</p>
              <p className="text-slate-500">ประธานการประชุม / ผู้รับรอง</p>
            </div>
          </div>
        </div>
      )}

      {/* Screen Header & Top Stats */}
      <div className="no-print bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Meeting Minutes (รายงานการประชุม)
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                    Front Office Panel
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกรายงานการประชุม ติดตามมติที่ประชุม และมอบหมายงานประจำสัปดาห์/ประจำเดือน
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartNewMeeting}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายงานการประชุม</span>
            </button>
          </div>
        </div>

        {/* Action Items Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-medium">การประชุมทั้งหมด</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{meetings.length} รายการ</p>
            </div>
            <Building2 className="w-7 h-7 text-slate-400 opacity-60" />
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-amber-700 font-medium">งานรอดำเนินการ</p>
              <p className="text-lg font-bold text-amber-900 mt-0.5">{actionStats.pending} งาน</p>
            </div>
            <Clock3 className="w-7 h-7 text-amber-500 opacity-70" />
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-blue-700 font-medium">กำลังดำเนินการ</p>
              <p className="text-lg font-bold text-blue-900 mt-0.5">{actionStats.inProgress} งาน</p>
            </div>
            <ListTodo className="w-7 h-7 text-blue-500 opacity-70" />
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-emerald-700 font-medium">เสร็จสิ้นแล้ว</p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">{actionStats.completed} งาน</p>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-500 opacity-70" />
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="no-print flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('list');
            setEditingMeeting(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'list'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>รายการการประชุม ({meetings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('action_items');
            setEditingMeeting(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'action_items'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>ติดตามงานมติที่ประชุม ({allActionItems.length})</span>
        </button>

        {editingMeeting && (
          <button
            type="button"
            onClick={() => setActiveSubTab('editor')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'editor'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
            }`}
          >
            <Edit className="w-4 h-4" />
            <span>ฟอร์มบันทึกการประชุม ({editingMeeting.title.slice(0, 20)}...)</span>
          </button>
        )}
      </div>

      {/* VIEW 1: MEETINGS LIST */}
      {activeSubTab === 'list' && (
        <div className="no-print space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อประชุม, ผู้เข้าร่วม, เนื้อหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> หมวดหมู่:
              </span>
              {[
                { key: 'all', label: 'ทั้งหมด' },
                { key: 'weekly', label: 'ประจำสัปดาห์' },
                { key: 'monthly', label: 'ประจำเดือน' },
                { key: 'departmental', label: 'เฉพาะแผนก' },
                { key: 'emergency', label: 'วาระเร่งด่วน' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredMeetings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลรายงานการประชุม</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่มเพิ่มรายงานการประชุมใหม่</p>
              <button
                type="button"
                onClick={handleStartNewMeeting}
                className="mt-4 px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> สร้างรายงานการประชุมใหม่
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMeetings.map((meeting) => {
                const catInfo = categoryLabels[meeting.category] || categoryLabels.general;
                const totalActions = meeting.actionItems.length;
                const completedActions = meeting.actionItems.filter((a) => a.status === 'completed').length;
                const completionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 100;

                return (
                  <div
                    key={meeting.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-orange-300 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{meeting.date}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors leading-snug mb-2">
                        {meeting.title}
                      </h3>

                      {/* Info Metadata */}
                      <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>เวลา {meeting.startTime} - {meeting.endTime} น.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{meeting.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>ประธาน: <strong className="text-slate-800">{meeting.chairPerson}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>ผู้เข้าร่วม ({meeting.attendees.length} ท่าน): <span className="text-slate-700 truncate">{meeting.attendees.join(', ')}</span></span>
                        </div>
                      </div>

                      {/* Agendas Summary */}
                      <div className="mb-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          วาระการประชุม ({meeting.agendas.length} วาระ)
                        </p>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {meeting.agendas.slice(0, 3).map((ag) => (
                            <li key={ag.id} className="truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                              <span className="truncate font-medium">{ag.title}</span>
                            </li>
                          ))}
                          {meeting.agendas.length > 3 && (
                            <li className="text-[11px] text-slate-400 italic">...และอีก {meeting.agendas.length - 3} วาระ</li>
                          )}
                        </ul>
                      </div>

                      {/* Action items progress bar */}
                      {totalActions > 0 && (
                        <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span>มติที่ประชุม ({completedActions}/{totalActions} งาน)</span>
                            <span className="text-orange-600 font-bold">{completionRate}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 transition-all duration-500"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingMeeting(meeting)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> รายละเอียด
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setActiveSubTab('editor');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> แก้ไข
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrint(meeting)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="พิมพ์รายงานการประชุม"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ลบรายงานการประชุม"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACTION ITEMS TRACKER */}
      {activeSubTab === 'action_items' && (
        <div className="no-print space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-orange-600" />
                  ตารางติดตามมติที่ประชุม & มอบหมายงาน (Action Items Tracker)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการงานทั้งหมดที่ต้องติดตามจากการประชุม สามารถเปลี่ยนสถานะการดำเนินงานได้ทันที
                </p>
              </div>
            </div>

            {allActionItems.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p className="text-sm font-bold">ไม่มีรายการงานที่ต้องติดตาม</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">หัวข้อการประชุม</th>
                      <th className="p-3">รายละเอียดงานที่ต้องทำ</th>
                      <th className="p-3">ผู้รับผิดชอบ</th>
                      <th className="p-3">กำหนดส่ง</th>
                      <th className="p-3 text-center">สถานะการทำงาน</th>
                      <th className="p-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allActionItems.map(({ meetingTitle, meetingDate, meetingId, item }) => (
                      <tr key={`${meetingId}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-800 max-w-[200px]">
                          <div className="truncate">{meetingTitle}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{meetingDate}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-900">{item.task}</td>
                        <td className="p-3 text-slate-700 font-semibold">{item.assignee}</td>
                        <td className="p-3 text-slate-600">{item.dueDate}</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                            <button
                              type="button"
                              onClick={() => handleToggleActionStatus(meetingId, item.id, 'pending')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                item.status === 'pending'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              รอดำเนินการ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActionStatus(meetingId, item.id, 'in_progress')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                item.status === 'in_progress'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              กำลังทำ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActionStatus(meetingId, item.id, 'completed')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                                item.status === 'completed'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              เสร็จสิ้น
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 italic max-w-[150px] truncate">
                          {item.remark || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: EDITOR / FORM VIEW */}
      {activeSubTab === 'editor' && editingMeeting && (
        <div className="no-print space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingMeeting(null);
                  setActiveSubTab('list');
                }}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900">ฟอร์มบันทึกการประชุม (Meeting Minute Form)</h2>
                <p className="text-xs text-slate-500">กรอกข้อมูลการประชุม วาระ และมติที่ประชุมสำหรับรีสอร์ท</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveMeeting(editingMeeting)}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกรายงานการประชุม</span>
              </button>
            </div>
          </div>

          {/* Form Fields Section 1: Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">หัวข้อการประชุม *</label>
              <input
                type="text"
                value={editingMeeting.title}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="ระบุหัวข้อการประชุม..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">หมวดหมู่การประชุม</label>
              <select
                value={editingMeeting.category}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="weekly">ประจำสัปดาห์ (Weekly)</option>
                <option value="monthly">ประจำเดือน (Monthly)</option>
                <option value="departmental">เฉพาะแผนก (Departmental)</option>
                <option value="emergency">วาระเร่งด่วน (Emergency)</option>
                <option value="general">การประชุมทั่วไป (General)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">วันที่ประชุม</label>
              <input
                type="date"
                value={editingMeeting.date}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">เวลาเริ่ม - เวลาเลิก</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingMeeting.startTime}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, startTime: e.target.value })}
                  placeholder="10:00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="text"
                  value={editingMeeting.endTime}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, endTime: e.target.value })}
                  placeholder="11:30"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">สถานที่ / ช่องทางประชุม</label>
              <input
                type="text"
                value={editingMeeting.location}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                placeholder="ห้องประชุม, Lobby, Google Meet..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ประธานการประชุม</label>
              <input
                type="text"
                value={editingMeeting.chairPerson}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, chairPerson: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                placeholder="ชื่อประธานการประชุม..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ผู้บันทึกรายงานการประชุม</label>
              <input
                type="text"
                value={editingMeeting.minuteTaker}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, minuteTaker: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                placeholder="ชื่อผู้บันทึกการประชุม..."
              />
            </div>
          </div>

          {/* Attendees Selector */}
          <div className="border-t border-slate-200 pt-4 text-xs space-y-2">
            <label className="block font-bold text-slate-800">ผู้เข้าร่วมประชุม (Attendees)</label>
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {availableStaff.map((staffName) => {
                const isSelected = editingMeeting.attendees.includes(staffName);
                return (
                  <button
                    key={staffName}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setEditingMeeting({
                          ...editingMeeting,
                          attendees: editingMeeting.attendees.filter((a) => a !== staffName),
                        });
                      } else {
                        setEditingMeeting({
                          ...editingMeeting,
                          attendees: [...editingMeeting.attendees, staffName],
                        });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white border-orange-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {staffName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agendas Editor */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">วาระและสรุปเนื้อหาการประชุม (Agendas)</label>
              <button
                type="button"
                onClick={() => {
                  const newAg: MeetingAgendaItem = {
                    id: `agenda-${Date.now()}`,
                    agendaNumber: editingMeeting.agendas.length + 1,
                    title: `วาระที่ ${editingMeeting.agendas.length + 1}: หัวข้อวาระใหม่`,
                    content: '• รายละเอียดสรุปการพูดคุย...',
                  };
                  setEditingMeeting({ ...editingMeeting, agendas: [...editingMeeting.agendas, newAg] });
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มวาระ
              </button>
            </div>

            <div className="space-y-3">
              {editingMeeting.agendas.map((ag, idx) => (
                <div key={ag.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={ag.title}
                      onChange={(e) => {
                        const updated = [...editingMeeting.agendas];
                        updated[idx].title = e.target.value;
                        setEditingMeeting({ ...editingMeeting, agendas: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                      placeholder="หัวข้อวาระการประชุม..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = editingMeeting.agendas.filter((_, i) => i !== idx);
                        setEditingMeeting({ ...editingMeeting, agendas: updated });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={ag.content}
                    onChange={(e) => {
                      const updated = [...editingMeeting.agendas];
                      updated[idx].content = e.target.value;
                      setEditingMeeting({ ...editingMeeting, agendas: updated });
                    }}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed font-normal"
                    placeholder="สรุปเนื้อหาและมติในวาระนี้..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Action Items Editor */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">มติที่ประชุม & งานที่มอบหมาย (Action Items)</label>
              <button
                type="button"
                onClick={() => {
                  const newAct: MeetingActionItem = {
                    id: `act-${Date.now()}`,
                    task: '',
                    assignee: availableStaff[0] || '',
                    dueDate: new Date().toISOString().split('T')[0],
                    status: 'pending',
                    remark: '',
                  };
                  setEditingMeeting({ ...editingMeeting, actionItems: [...editingMeeting.actionItems, newAct] });
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มงานมอบหมาย
              </button>
            </div>

            <div className="space-y-2">
              {editingMeeting.actionItems.map((act, idx) => (
                <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-5 gap-2 text-xs items-center">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={act.task}
                      onChange={(e) => {
                        const updated = [...editingMeeting.actionItems];
                        updated[idx].task = e.target.value;
                        setEditingMeeting({ ...editingMeeting, actionItems: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      placeholder="สิ่งที่ต้องดำเนินการ..."
                    />
                  </div>

                  <div>
                    <select
                      value={act.assignee}
                      onChange={(e) => {
                        const updated = [...editingMeeting.actionItems];
                        updated[idx].assignee = e.target.value;
                        setEditingMeeting({ ...editingMeeting, actionItems: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                    >
                      {availableStaff.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="date"
                      value={act.dueDate}
                      onChange={(e) => {
                        const updated = [...editingMeeting.actionItems];
                        updated[idx].dueDate = e.target.value;
                        setEditingMeeting({ ...editingMeeting, actionItems: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <select
                      value={act.status}
                      onChange={(e) => {
                        const updated = [...editingMeeting.actionItems];
                        updated[idx].status = e.target.value as any;
                        setEditingMeeting({ ...editingMeeting, actionItems: updated });
                      }}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-[11px] font-bold"
                    >
                      <option value="pending">รอดำเนินการ</option>
                      <option value="in_progress">กำลังทำ</option>
                      <option value="completed">เสร็จสิ้น</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = editingMeeting.actionItems.filter((_, i) => i !== idx);
                        setEditingMeeting({ ...editingMeeting, actionItems: updated });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Notes */}
          <div className="border-t border-slate-200 pt-4 text-xs space-y-1">
            <label className="block font-bold text-slate-800">บันทึกเพิ่มเติม (General Notes)</label>
            <textarea
              rows={2}
              value={editingMeeting.generalNotes || ''}
              onChange={(e) => setEditingMeeting({ ...editingMeeting, generalNotes: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              placeholder="บันทึกเพิ่มเติม ข้อเสนอแนะอื่นๆ..."
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingMeeting(null);
                setActiveSubTab('list');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => handleSaveMeeting(editingMeeting)}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingMeeting && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-sm">รายละเอียดรายงานการประชุม</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMeeting(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800 flex-1">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-2">
                <h2 className="text-base font-bold text-orange-900">{viewingMeeting.title}</h2>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium pt-1">
                  <p>📅 วันที่: <strong className="text-slate-900">{viewingMeeting.date}</strong></p>
                  <p>⏰ เวลา: <strong className="text-slate-900">{viewingMeeting.startTime} - {viewingMeeting.endTime} น.</strong></p>
                  <p>📍 สถานที่: <strong className="text-slate-900">{viewingMeeting.location}</strong></p>
                  <p>👤 ประธาน: <strong className="text-slate-900">{viewingMeeting.chairPerson}</strong></p>
                </div>
                <p className="text-slate-600 border-t border-orange-200/60 pt-2">
                  👥 ผู้เข้าร่วมประชุม: {viewingMeeting.attendees.join(', ')}
                </p>
              </div>

              {/* Agendas */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2 border-b pb-1">วาระการประชุม (Agendas)</h4>
                <div className="space-y-3">
                  {viewingMeeting.agendas.map((ag) => (
                    <div key={ag.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="font-bold text-slate-900">{ag.title}</h5>
                      <p className="text-slate-700 whitespace-pre-line mt-1">{ag.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action items */}
              {viewingMeeting.actionItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2 border-b pb-1">มติที่ประชุม & งานที่มอบหมาย</h4>
                  <div className="space-y-2">
                    {viewingMeeting.actionItems.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{item.task}</p>
                          <p className="text-slate-500 text-[11px]">ผู้รับผิดชอบ: {item.assignee} | กำหนดส่ง: {item.dueDate}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'completed' ? 'เสร็จสิ้น' : item.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrint(viewingMeeting)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> พิมพ์เอกสาร
              </button>
              <button
                type="button"
                onClick={() => setViewingMeeting(null)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
