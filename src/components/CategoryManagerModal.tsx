import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Check, X, FolderTree, ShieldAlert, CheckCircle2, Ban } from 'lucide-react';
import {
  getStoredCategories,
  saveCategories,
  getStoredExcludedCategories,
  saveExcludedCategories,
  INITIAL_MINUS_CATEGORIES,
  INITIAL_PLUS_CATEGORIES,
  INITIAL_EXCLUDED_EXPENSES,
} from './ExpenseCategorySelect';
import { isNonReceiptExpense } from '../utils/syncUtils';
import { saveCategoriesToFirebase, subscribeCategories } from '../lib/firebase';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesUpdated?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesUpdated,
}) => {
  const [categories, setCategories] = useState<{ minus: string[]; plus: string[]; excluded?: string[] }>(getStoredCategories);
  const [excludedList, setExcludedList] = useState<string[]>(getStoredExcludedCategories);
  const [activeTab, setActiveTab] = useState<'minus' | 'plus'>('minus');
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isNewExcluded, setIsNewExcluded] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null); // e.g. "minus-0"
  const [editingValue, setEditingValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredCategories();
      setCategories(stored);
      setExcludedList(getStoredExcludedCategories());
      setEditingKey(null);
      setNewTopicInput('');
      setIsNewExcluded(false);

      const unsub = subscribeCategories((remoteCats) => {
        if (remoteCats && (remoteCats.minus.length > 0 || remoteCats.plus.length > 0)) {
          setCategories(remoteCats);
          saveCategories(remoteCats);
          if (remoteCats.excluded && Array.isArray(remoteCats.excluded)) {
            setExcludedList(remoteCats.excluded);
            saveExcludedCategories(remoteCats.excluded);
          }
          window.dispatchEvent(new Event('storage'));
          if (onCategoriesUpdated) onCategoriesUpdated();
        }
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const notifyUpdate = (updated: { minus: string[]; plus: string[]; excluded?: string[] }) => {
    saveCategories(updated);
    saveCategoriesToFirebase(updated);
    setCategories(updated);
    if (updated.excluded) {
      setExcludedList(updated.excluded);
      saveExcludedCategories(updated.excluded);
    }
    window.dispatchEvent(new Event('storage'));
    if (onCategoriesUpdated) onCategoriesUpdated();
  };

  const isItemExcluded = (item: string) => {
    return isNonReceiptExpense(item, excludedList);
  };

  const toggleExcludeTopic = (item: string) => {
    const currentExcluded = [...excludedList];
    const itemClean = item.trim();
    const itemNoPrefix = itemClean.replace(/^[-+\s]+/, '');

    const isCurrentlyExcluded = isItemExcluded(itemClean);
    let updatedExcluded: string[] = [];

    if (isCurrentlyExcluded) {
      // Remove from excluded list
      updatedExcluded = currentExcluded.filter(
        (ex) =>
          ex.trim().toLowerCase() !== itemClean.toLowerCase() &&
          ex.trim().toLowerCase() !== itemNoPrefix.toLowerCase()
      );
      showToast(`เปลี่ยนเป็น "นับใน expenses": ${itemClean}`);
    } else {
      // Add to excluded list
      updatedExcluded = Array.from(new Set([...currentExcluded, itemClean, itemNoPrefix]));
      showToast(`ทำเครื่องหมาย "ไม่นับใน expenses": ${itemClean}`);
    }

    setExcludedList(updatedExcluded);
    const updated = { ...categories, excluded: updatedExcluded };
    notifyUpdate(updated);
  };

  const handleAddTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;

    let formatted = trimmed;
    const isMinus = activeTab === 'minus';

    if (isMinus) {
      if (!formatted.startsWith('-')) formatted = '-' + formatted;
      if (categories.minus.includes(formatted)) {
        showToast('⚠️ มีหัวข้อนี้ในรายการแล้ว');
        return;
      }
      const updatedMinus = [...categories.minus, formatted].sort((a, b) =>
        a.localeCompare(b, 'th', { sensitivity: 'base' })
      );

      let currentEx = [...excludedList];
      if (
        isNewExcluded ||
        formatted.includes('เบิกเงิน') ||
        formatted.includes('kas paid') ||
        formatted.includes('part time')
      ) {
        currentEx = Array.from(new Set([...currentEx, formatted, formatted.replace(/^[-+\s]+/, '')]));
      }

      const updated = { ...categories, minus: updatedMinus, excluded: currentEx };
      notifyUpdate(updated);
    } else {
      if (!formatted.startsWith('+')) formatted = '+' + formatted;
      if (categories.plus.includes(formatted)) {
        showToast('⚠️ มีหัวข้อนี้ในรายการแล้ว');
        return;
      }
      const updatedPlus = [...categories.plus, formatted].sort((a, b) =>
        a.localeCompare(b, 'th', { sensitivity: 'base' })
      );
      const updated = { ...categories, plus: updatedPlus, excluded: excludedList };
      notifyUpdate(updated);
    }

    setNewTopicInput('');
    setIsNewExcluded(false);
    showToast(`เพิ่มหัวข้อ "${formatted}" เรียบร้อยแล้ว`);
  };

  const handleStartEdit = (type: 'minus' | 'plus', index: number, value: string) => {
    setEditingKey(`${type}-${index}`);
    setEditingValue(value);
  };

  const handleSaveEdit = (type: 'minus' | 'plus', index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setEditingKey(null);
      return;
    }

    let formatted = trimmed;
    if (type === 'minus' && !formatted.startsWith('-')) formatted = '-' + formatted;
    if (type === 'plus' && !formatted.startsWith('+')) formatted = '+' + formatted;

    const list = [...categories[type]];
    const oldValue = list[index];
    list[index] = formatted;
    list.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));

    let currentEx = [...excludedList];
    if (currentEx.includes(oldValue)) {
      currentEx = currentEx.map((x) => (x === oldValue ? formatted : x));
    }

    const updated = { ...categories, [type]: list, excluded: currentEx };
    notifyUpdate(updated);
    setEditingKey(null);
    showToast(`แก้ไขหัวข้อ "${oldValue}" เป็น "${formatted}" แล้ว`);
  };

  const handleDeleteTopic = (type: 'minus' | 'plus', index: number) => {
    const target = categories[type][index];
    if (window.confirm(`คุณต้องการลบหัวข้อ "${target}" ออกจากรายการใช่หรือไม่?`)) {
      const list = categories[type].filter((_, i) => i !== index);
      const updatedEx = excludedList.filter((x) => x !== target && x !== target.replace(/^[-+\s]+/, ''));
      const updated = { ...categories, [type]: list, excluded: updatedEx };
      notifyUpdate(updated);
      showToast(`ลบหัวข้อ "${target}" เรียบร้อยแล้ว`);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('คุณต้องการรีเซ็ตหัวข้อทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      const defaultCategories = {
        minus: [...INITIAL_MINUS_CATEGORIES].sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
        plus: [...INITIAL_PLUS_CATEGORIES].sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
        excluded: [...INITIAL_EXCLUDED_EXPENSES],
      };
      notifyUpdate(defaultCategories);
      showToast('รีเซ็ตหัวข้อเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  const currentList = categories[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fadeIn no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-600/20 text-orange-400 rounded-xl border border-orange-500/30">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">จัดการหัวข้อรายการ (Manage Topics)</h2>
              <p className="text-xs text-slate-400">แก้ไข ลบ หรือทำเครื่องหมายไม่นับรวมในรายการ expenses</p>
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {toast && (
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Tag className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{toast}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Ban className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">หมายเหตุ:</span> หัวข้อที่ทำเครื่องหมาย{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                🚫 ไม่นับใน expenses
              </span>{' '}
              (เช่น เบิกเงินซื้อของ, Kas paid out, Part Time) จะไม่ถูกดึงไปรวมในใบรับรองแทนใบเสร็จ / รายการ expenses
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('minus');
                setEditingKey(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'minus'
                  ? 'border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🔻 รายการหัก / ค่าใช้จ่าย (-) ({categories.minus.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('plus');
                setEditingKey(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'plus'
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              🟢 รายรับ / เติมเงิน (+) ({categories.plus.length})
            </button>
          </div>

          {/* Add New Topic Box */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              เพิ่มหัวข้อใหม่ในกลุ่ม {activeTab === 'minus' ? '🔻 รายการหัก (-)' : '🟢 รายรับ (+)'}:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewTopicInput(val);
                  if (activeTab === 'minus' && (val.includes('เบิกเงิน') || val.includes('kas paid') || val.includes('part time'))) {
                    setIsNewExcluded(true);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                placeholder={activeTab === 'minus' ? 'เช่น -เบิกเงินซื้อของ, -ค่าของสด, -ค่าน้ำมัน...' : 'เช่น +ค่าห้องพัก, +เงินสดมัดจำ...'}
                className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /> เพิ่มหัวข้อ
              </button>
            </div>
            {activeTab === 'minus' && (
              <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNewExcluded}
                  onChange={(e) => setIsNewExcluded(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  🚫 ทำเครื่องหมาย: ไม่นับรวมในรายการ expenses (เช่น เบิกเงินซื้อของ)
                </span>
              </label>
            )}
          </div>

          {/* Topic List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                รายชื่อหัวข้อทั้งหมด ({currentList.length} หัวข้อ):
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-slate-500 hover:text-orange-600 underline"
              >
                คืนค่าเริ่มต้นทั้งหมด
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/40">
              {currentList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">ยังไม่มีหัวข้อในกลุ่มนี้</div>
              ) : (
                currentList.map((item, index) => {
                  const itemKey = `${activeTab}-${index}`;
                  const isEditing = editingKey === itemKey;
                  const isExcluded = activeTab === 'minus' && isItemExcluded(item);

                  return (
                    <div
                      key={`${item}-${index}`}
                      className="p-2.5 flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(activeTab, index);
                              if (e.key === 'Escape') setEditingKey(null);
                            }}
                            className="flex-1 border border-orange-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(activeTab, index)}
                            className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                            title="บันทึกการแก้ไข"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="p-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                            title="ยกเลิก"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                activeTab === 'minus'
                                  ? 'text-red-700 bg-red-100/60 dark:text-red-300 dark:bg-red-950/40'
                                  : 'text-emerald-700 bg-emerald-100/60 dark:text-emerald-300 dark:bg-emerald-950/40'
                              }`}
                            >
                              {item}
                            </span>
                            {activeTab === 'minus' && (
                              <button
                                type="button"
                                onClick={() => toggleExcludeTopic(item)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                                  isExcluded
                                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300 hover:text-amber-700'
                                }`}
                                title="คลิกเพื่อสลับ: ไม่นับรวมในรายการ expenses / นับรวมในรายการ expenses"
                              >
                                {isExcluded ? (
                                  <>
                                    <Ban className="w-3 h-3 text-amber-600" />
                                    <span>🚫 ไม่นับใน expenses</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                    <span>นับใน expenses</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(activeTab, index, item)}
                              className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="แก้ไขหัวข้อนี้"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTopic(activeTab, index)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="ลบหัวข้อนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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
