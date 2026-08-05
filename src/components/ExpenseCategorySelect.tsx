import React, { useState, useEffect, useMemo } from 'react';
import { Check, Settings2 } from 'lucide-react';
import { subscribeCategories, saveCategoriesToFirebase } from '../lib/firebase';
import { safeLocalStorage } from '../utils/storage';

export const INITIAL_MINUS_CATEGORIES = [
  '-แสงรุ่งต้ม',
  '-ตลาดเช้า (ผัก ผลไม้ และอาหารต่างๆ)',
  '-ตลาดเย็น (ผัก ผลไม้ และอาหารต่างๆ)',
  '-น้ำแข็ง',
  '-น้ำถัง',
  '-น้ำมันเครื่องตัดหญ้า',
  '-อุปกรณ์ช่าง/งานสวน',
  '-Kas paid out',
];

export const INITIAL_PLUS_CATEGORIES = [
  '+Guest paid in',
  '+Kas paid in',
];

const LOCAL_STORAGE_KEY = 'nan_seasons_expense_categories_v1';

export function getStoredCategories(): { minus: string[]; plus: string[] } {
  try {
    const saved = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.minus) && Array.isArray(parsed.plus)) {
        const minusArr = Array.from(new Set([...INITIAL_MINUS_CATEGORIES, ...parsed.minus.map(String)]));
        const plusArr = Array.from(new Set([...INITIAL_PLUS_CATEGORIES, ...parsed.plus.map(String)]));
        return {
          minus: minusArr.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
          plus: plusArr.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
        };
      }
    }
  } catch (e) {
    console.error('Failed to load expense categories from storage', e);
  }
  return {
    minus: [...INITIAL_MINUS_CATEGORIES].sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
    plus: [...INITIAL_PLUS_CATEGORIES].sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
  };
}

export function saveCategories(categories: { minus: string[]; plus: string[] }) {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save expense categories', e);
  }
}

interface ExpenseCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onOpenManageCategories?: () => void;
}

export const ExpenseCategorySelect: React.FC<ExpenseCategorySelectProps> = ({
  value,
  onChange,
  placeholder = 'เลือกหรือระบุหัวข้อ',
  className = '',
  onOpenManageCategories,
}) => {
  const [categories, setCategories] = useState<{ minus: string[]; plus: string[] }>(getStoredCategories);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    const handleStorage = () => {
      setCategories(getStoredCategories());
    };
    window.addEventListener('storage', handleStorage);

    const unsub = subscribeCategories((remoteCats) => {
      if (remoteCats && (remoteCats.minus.length > 0 || remoteCats.plus.length > 0)) {
        setCategories(remoteCats);
        saveCategories(remoteCats);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      unsub();
    };
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsCustomMode(true);
      setCustomInput('');
    } else if (val === '__MANAGE_CATEGORIES__') {
      if (onOpenManageCategories) {
        onOpenManageCategories();
      } else {
        // Fallback dispatch event if prop not passed
        window.dispatchEvent(new CustomEvent('open-manage-categories'));
      }
    } else {
      setIsCustomMode(false);
      onChange(val);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      setIsCustomMode(false);
      return;
    }

    const current = getStoredCategories();
    let updatedMinus = [...current.minus];
    let updatedPlus = [...current.plus];

    if (trimmed.startsWith('-')) {
      if (!updatedMinus.includes(trimmed)) {
        updatedMinus.push(trimmed);
        updatedMinus.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));
      }
    } else {
      let formatted = trimmed;
      if (!formatted.startsWith('+') && !formatted.startsWith('-')) {
        formatted = '+' + formatted;
      }
      if (formatted.startsWith('+')) {
        if (!updatedPlus.includes(formatted)) {
          updatedPlus.push(formatted);
          updatedPlus.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));
        }
      } else {
        if (!updatedMinus.includes(formatted)) {
          updatedMinus.push(formatted);
          updatedMinus.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));
        }
      }
    }

    const updated = { minus: updatedMinus, plus: updatedPlus };
    saveCategories(updated);
    saveCategoriesToFirebase(updated);
    setCategories(updated);
    window.dispatchEvent(new Event('storage'));
    onChange(trimmed.startsWith('+') || trimmed.startsWith('-') ? trimmed : '+' + trimmed);
    setIsCustomMode(false);
    setCustomInput('');
  };

  const { minusList, plusList } = useMemo(() => {
    let m = [...categories.minus];
    let p = [...categories.plus];

    if (value) {
      const existsInMinus = m.includes(value);
      const existsInPlus = p.includes(value);
      if (!existsInMinus && !existsInPlus) {
        if (value.startsWith('-')) {
          m.push(value);
          m.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));
        } else {
          p.push(value);
          p.sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' }));
        }
      }
    }
    return { minusList: m, plusList: p };
  }, [value, categories]);

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1 no-print">
        <input
          type="text"
          autoFocus
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            } else if (e.key === 'Escape') {
              setIsCustomMode(false);
            }
          }}
          placeholder="ใส่หัวข้อ (ใส่ - หรือ + ข้างหน้า)..."
          className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white font-medium"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded px-2 py-1 text-xs flex items-center gap-0.5 shrink-0"
        >
          <Check className="w-3 h-3" /> เพิ่ม
        </button>
        <button
          type="button"
          onClick={() => setIsCustomMode(false)}
          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded px-2 py-1 text-xs shrink-0"
        >
          ยกเลิก
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1 w-full no-print">
      <select
        value={value || ''}
        onChange={handleSelectChange}
        className={`w-full border border-slate-300 hover:border-slate-400 rounded px-2 py-1 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer ${className}`}
      >
        <option value="">-- {placeholder} --</option>
        <optgroup label="🔻 รายการหัก (-)">
          {minusList.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </optgroup>
        <optgroup label="🟢 รายรับ/เติม (+)">
          {plusList.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </optgroup>
        <option value="__ADD_NEW__" className="font-bold text-orange-600 bg-orange-50">
          ➕ เพิ่มหัวข้อใหม่ (Add topic)...
        </option>
        <option value="__MANAGE_CATEGORIES__" className="font-bold text-blue-600 bg-blue-50">
          ⚙️ จัดการ / แก้ไข / ลบหัวข้อ...
        </option>
      </select>
      <button
        type="button"
        onClick={() => {
          if (onOpenManageCategories) onOpenManageCategories();
          else window.dispatchEvent(new CustomEvent('open-manage-categories'));
        }}
        className="p-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors shrink-0"
        title="จัดการ/แก้ไข/ลบ หัวข้อรายการ"
      >
        <Settings2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
