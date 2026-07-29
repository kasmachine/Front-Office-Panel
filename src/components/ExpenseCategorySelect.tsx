import React, { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';

export const INITIAL_MINUS_CATEGORIES = [
  '-น้ำแข็ง',
  '-น้ำถัง',
];

export const INITIAL_PLUS_CATEGORIES = [
  '+Guest pay in',
  '+kas pay in',
];

const LOCAL_STORAGE_KEY = 'nan_seasons_expense_categories_v1';

export function getStoredCategories(): { minus: string[]; plus: string[] } {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.minus) && Array.isArray(parsed.plus)) {
        const minusSet = new Set([...INITIAL_MINUS_CATEGORIES, ...parsed.minus]);
        const plusSet = new Set([...INITIAL_PLUS_CATEGORIES, ...parsed.plus]);
        return {
          minus: Array.from(minusSet).sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
          plus: Array.from(plusSet).sort((a, b) => a.localeCompare(b, 'th', { sensitivity: 'base' })),
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save expense categories', e);
  }
}

interface ExpenseCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const ExpenseCategorySelect: React.FC<ExpenseCategorySelectProps> = ({
  value,
  onChange,
  placeholder = 'เลือกหรือระบุหัวข้อ',
  className = '',
}) => {
  const [categories, setCategories] = useState<{ minus: string[]; plus: string[] }>(getStoredCategories);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    const handleStorage = () => {
      setCategories(getStoredCategories());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsCustomMode(true);
      setCustomInput('');
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
      saveCategories({ minus: updatedMinus, plus: updatedPlus });
      setCategories({ minus: updatedMinus, plus: updatedPlus });
      onChange(formatted);
      setIsCustomMode(false);
      setCustomInput('');
      return;
    }

    saveCategories({ minus: updatedMinus, plus: updatedPlus });
    setCategories({ minus: updatedMinus, plus: updatedPlus });
    onChange(trimmed);
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
          className="w-full border border-orange-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 bg-white"
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
    <select
      value={value || ''}
      onChange={handleSelectChange}
      className={`w-full border border-slate-300 hover:border-slate-400 rounded px-2 py-1 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer no-print ${className}`}
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
    </select>
  );
};
