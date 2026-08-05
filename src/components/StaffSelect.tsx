import React, { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { subscribeStaffList, saveStaffListToFirebase } from '../lib/firebase';
import { safeLocalStorage } from '../utils/storage';

export const INITIAL_STAFF_LIST = [
  'Aan',
  'Belle',
  'Kas',
  'Kwan',
  'Macc',
  'Nhum',
  'Ooh',
  'Pam',
  'Teung',
];

const LOCAL_STORAGE_KEY = 'nan_seasons_staff_list_v1';

export function getStoredStaffList(): string[] {
  try {
    const saved = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      }
    }
  } catch (e) {
    console.error('Failed to load staff list from storage', e);
  }
  return [...INITIAL_STAFF_LIST].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

export function saveStaffList(list: string[]) {
  try {
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save staff list', e);
  }
}

interface StaffSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  size?: 'sm' | 'md';
  onOpenManageStaff?: () => void;
}

export const StaffSelect: React.FC<StaffSelectProps> = ({
  value,
  onChange,
  placeholder = 'เลือกพนักงาน',
  className = '',
  hasError = false,
  size = 'md',
  onOpenManageStaff,
}) => {
  const [staffList, setStaffList] = useState<string[]>(getStoredStaffList);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');

  useEffect(() => {
    const unsub = subscribeStaffList((remoteList) => {
      if (remoteList && remoteList.length > 0) {
        setStaffList(remoteList);
        saveStaffList(remoteList);
      }
    });

    const handleStorage = () => {
      setStaffList(getStoredStaffList());
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsCustomMode(true);
      setCustomNameInput('');
    } else if (val === '__MANAGE_STAFF__') {
      if (onOpenManageStaff) {
        onOpenManageStaff();
      } else {
        setIsCustomMode(true);
      }
    } else {
      setIsCustomMode(false);
      onChange(val);
    }
  };

  const handleAddCustomName = () => {
    const trimmed = customNameInput.trim();
    if (!trimmed) {
      setIsCustomMode(false);
      return;
    }

    const currentList = getStoredStaffList();
    let updated = currentList;
    if (!currentList.includes(trimmed)) {
      updated = [...currentList, trimmed].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );
      saveStaffList(updated);
      saveStaffListToFirebase(updated);
      setStaffList(updated);
    }

    onChange(trimmed);
    setIsCustomMode(false);
    setCustomNameInput('');
  };

  const effectiveList = useMemo(() => {
    if (value && !staffList.includes(value)) {
      return [...staffList, value].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' })
      );
    }
    return staffList;
  }, [value, staffList]);

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1 no-print">
        <input
          type="text"
          autoFocus
          value={customNameInput}
          onChange={(e) => setCustomNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomName();
            } else if (e.key === 'Escape') {
              setIsCustomMode(false);
            }
          }}
          placeholder="ระบุชื่อพนักงานใหม่..."
          className={`flex-1 border rounded-lg px-2.5 ${
            size === 'sm' ? 'py-1 text-xs' : 'py-2 text-sm'
          } font-semibold text-slate-900 bg-white border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500`}
        />
        <button
          type="button"
          onClick={handleAddCustomName}
          className={`bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg ${
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
          } flex items-center gap-1 shrink-0`}
          title="บันทึกชื่อพนักงาน"
        >
          <Check className="w-3.5 h-3.5" /> บันทึก
        </button>
        <button
          type="button"
          onClick={() => setIsCustomMode(false)}
          className={`bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg ${
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
          } shrink-0`}
        >
          ยกเลิก
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <select
        value={value || ''}
        onChange={handleSelectChange}
        className={`w-full border rounded-lg ${
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
        } font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 no-print cursor-pointer transition-all ${
          hasError
            ? 'border-red-400 focus:ring-red-500 bg-red-50/20 shadow-xs'
            : 'border-slate-300 focus:ring-orange-500 hover:border-slate-400'
        } ${className}`}
      >
        <option value="">-- {placeholder} --</option>
        {effectiveList.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value="__ADD_NEW__" className="font-bold text-orange-600 bg-orange-50">
          ➕ เพิ่มชื่อพนักงานใหม่ (Add staff)...
        </option>
        {onOpenManageStaff && (
          <option value="__MANAGE_STAFF__" className="font-bold text-slate-700 bg-slate-100">
            ⚙️ จัดการ/แก้ไข/ลบรายชื่อพนักงาน...
          </option>
        )}
      </select>
    </div>
  );
};

