import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Check, X, UserCheck } from 'lucide-react';
import { getStoredStaffList, saveStaffList, INITIAL_STAFF_LIST } from './StaffSelect';
import { saveStaffListToFirebase, subscribeStaffList } from '../lib/firebase';

interface StaffManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStaffListUpdated?: (newList: string[]) => void;
}

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({
  isOpen,
  onClose,
  onStaffListUpdated,
}) => {
  const [staffList, setStaffList] = useState<string[]>(getStoredStaffList);
  const [newStaffInput, setNewStaffInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeStaffList((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        setStaffList(remoteList);
        saveStaffList(remoteList);
        if (onStaffListUpdated) onStaffListUpdated(remoteList);
      }
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const showLocalToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const updateListAndSync = (newList: string[]) => {
    const sorted = [...newList].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    setStaffList(sorted);
    saveStaffList(sorted);
    saveStaffListToFirebase(sorted);
    if (onStaffListUpdated) onStaffListUpdated(sorted);
  };

  const handleAddStaff = () => {
    const trimmed = newStaffInput.trim();
    if (!trimmed) return;
    if (staffList.includes(trimmed)) {
      showLocalToast('⚠️ มีชื่อพนักงานนี้ในระบบแล้ว');
      return;
    }
    const updated = [...staffList, trimmed];
    updateListAndSync(updated);
    setNewStaffInput('');
    showLocalToast(`เพิ่มพนักงาน "${trimmed}" เรียบร้อยแล้ว`);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(staffList[index]);
  };

  const handleSaveEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEditingIndex(null);
      return;
    }
    const oldName = staffList[index];
    const updated = [...staffList];
    updated[index] = trimmed;
    updateListAndSync(updated);
    setEditingIndex(null);
    showLocalToast(`แก้ไขชื่อ "${oldName}" เป็น "${trimmed}" เรียบร้อยแล้ว`);
  };

  const handleDeleteStaff = (index: number) => {
    const targetName = staffList[index];
    if (window.confirm(`คุณต้องการลบรายชื่อพนักงาน "${targetName}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = staffList.filter((_, i) => i !== index);
      updateListAndSync(updated);
      showLocalToast(`ลบรายชื่อ "${targetName}" เรียบร้อยแล้ว`);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตรายชื่อพนักงานกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      updateListAndSync(INITIAL_STAFF_LIST);
      showLocalToast('รีเซ็ตรายชื่อพนักงานเรียบร้อย');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-600/20 text-orange-400 rounded-xl border border-orange-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">จัดการรายชื่อพนักงาน (Staff Roster)</h2>
              <p className="text-xs text-slate-400">แก้ไข ลบ หรือเพิ่มรายชื่อพนักงานในระบบ (Real-Time)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {toast && (
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <UserCheck className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{toast}</span>
            </div>
          )}

          {/* Add Staff Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              เพิ่มพนักงานใหม่ (Add New Staff):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStaffInput}
                onChange={(e) => setNewStaffInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
                placeholder="พิมพ์ชื่อพนักงาน เช่น Kwan, Tea..."
                className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              />
              <button
                type="button"
                onClick={handleAddStaff}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                รายชื่อพนักงานทั้งหมด ({staffList.length} คน):
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-slate-500 hover:text-orange-600 underline"
              >
                คืนค่าเริ่มต้น
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
              {staffList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีรายชื่อพนักงาน</div>
              ) : (
                staffList.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    {editingIndex === index ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(index);
                            if (e.key === 'Escape') setEditingIndex(null);
                          }}
                          className="flex-1 border border-orange-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(index)}
                          className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                          title="บันทึกการแก้ไข"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-1">
                          {name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="แก้ไขชื่อพนักงาน"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="ลบพนักงานคนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            เสร็จสิ้น (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
