import { CashCountData, ReceiptSubstituteData, ReceiptSubstituteItem } from '../types';

export function getTodayFormatted(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatDateToDisplay(d: string): string {
  if (!d) return getTodayFormatted();
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return trimmed;
}

export function isWithin7Days(createdAt?: number, dateStr?: string): boolean {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  if (createdAt && typeof createdAt === 'number') {
    return (now - createdAt) <= SEVEN_DAYS_MS;
  }

  if (dateStr) {
    let d: Date | null = null;
    const trimmed = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [dd, mm, yyyy] = trimmed.split('/');
      d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      d = new Date(trimmed);
    }
    if (d && !isNaN(d.getTime())) {
      const diff = now - d.getTime();
      return diff <= (SEVEN_DAYS_MS + 86400000); // 7 days + 24hr buffer
    }
  }

  return true;
}

export function isNonReceiptExpense(itemStr: string): boolean {
  if (!itemStr) return false;
  const lower = itemStr.trim().toLowerCase();
  // Exclude Kas paid out / Kas transfers and Part Time wages from receipt substitute
  if (
    lower.includes('kas paid') ||
    lower.includes('kas_paid') ||
    lower.includes('kas-paid')
  ) {
    return true;
  }
  if (
    lower.includes('part time') ||
    lower.includes('part-time') ||
    lower.includes('parttime')
  ) {
    return true;
  }
  return false;
}

export function extractMinusExpenses(cashCountData: CashCountData) {
  return [
    ...(cashCountData.expensesIn || []),
    ...(cashCountData.expensesOut || []),
  ].filter(
    (exp) =>
      exp &&
      exp.item &&
      exp.item.trim().startsWith('-') &&
      !isNonReceiptExpense(exp.item) &&
      (exp.amount > 0 || exp.item.trim().length > 1)
  );
}

export function syncMinusExpensesToReceipt(
  cashCountData: CashCountData,
  savedCashCounts: CashCountData[] = [],
  currentReceiptData: ReceiptSubstituteData
): ReceiptSubstituteData {
  const targetDate = cashCountData.date
    ? formatDateToDisplay(cashCountData.date)
    : currentReceiptData.startDate
    ? formatDateToDisplay(currentReceiptData.startDate)
    : getTodayFormatted();

  // Collect all cash counts for the same date (both Early & Late shifts)
  const relevantCashCounts: CashCountData[] = [];
  const seenIds = new Set<string>();

  const addIfMatches = (cc: CashCountData) => {
    if (!cc) return;
    const ccDate = cc.date ? formatDateToDisplay(cc.date) : targetDate;
    if (ccDate === targetDate) {
      const ccId = cc.id || `active-${cc.shift || 'shift'}`;
      if (!seenIds.has(ccId)) {
        seenIds.add(ccId);
        relevantCashCounts.push(cc);
      }
    }
  };

  // 1. Add active cash count data
  if (cashCountData) {
    addIfMatches(cashCountData);
  }

  // 2. Add saved cash counts from history for the same date
  (savedCashCounts || []).forEach((sc) => {
    addIfMatches(sc);
  });

  // Convert minus expenses from ALL shifts for this date into receipt items
  const autoItemsMap = new Map<string, ReceiptSubstituteItem>();

  relevantCashCounts.forEach((cc) => {
    const minusExpenses = extractMinusExpenses(cc);
    const ccDate = cc.date ? formatDateToDisplay(cc.date) : targetDate;

    minusExpenses.forEach((exp) => {
      const raw = exp.item ? exp.item.trim() : '';
      const cleanedDescription = raw.replace(/^[-+\s]+/, '');
      const itemKey = `cc-${cc.id || 'current'}-${exp.id}`;

      autoItemsMap.set(itemKey, {
        id: itemKey,
        date: ccDate,
        description: cleanedDescription || raw,
        amount: -(Math.abs(Number(exp.amount) || 0)),
        remark: exp.staff ? `ผู้เบิก/จ่าย: ${exp.staff}` : (exp.remark || ''),
      });
    });
  });

  const autoItems = Array.from(autoItemsMap.values());

  // Preserve any manually added items in receipt substitute, filtering out non-receipt items
  const manualItems = currentReceiptData.items
    .filter((item) => {
      const desc = item.description ? item.description.replace(/^[-+\s]+/, '').trim() : '';
      if (isNonReceiptExpense(desc) || isNonReceiptExpense(item.description)) {
        return false;
      }
      return !item.id.startsWith('cc-') && (desc !== '' || item.amount !== 0);
    })
    .map((item) => ({
      ...item,
      date: formatDateToDisplay(item.date),
      description: item.description ? item.description.replace(/^[-+\s]+/, '') : '',
      amount: item.amount !== 0 ? -(Math.abs(Number(item.amount) || 0)) : 0,
    }));

  const mergedItems = [...autoItems, ...manualItems];

  if (mergedItems.length === 0) {
    mergedItems.push({
      id: `item-${Date.now()}`,
      date: targetDate,
      description: '',
      amount: 0,
      remark: '',
    });
  }

  const itemsChanged = JSON.stringify(mergedItems) !== JSON.stringify(currentReceiptData.items);
  const datesChanged =
    (currentReceiptData.startDate || '') !== targetDate ||
    (currentReceiptData.endDate || '') !== targetDate;

  const dateKey = targetDate.replace(/\//g, '-');
  const targetDocId = `receipt-${dateKey}`;

  if (!itemsChanged && !datesChanged && currentReceiptData.id === targetDocId) {
    return currentReceiptData;
  }

  return {
    ...currentReceiptData,
    id: targetDocId,
    startDate: targetDate,
    endDate: targetDate,
    items: mergedItems,
  };
}

/**
 * Normalize any date string (DD/MM/YYYY or YYYY-MM-DD) to ISO YYYY-MM-DD
 */
export function normalizeDateToIso(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = '20' + year;
    return `${year}-${month}-${day}`;
  }
  return '';
}

/**
 * Gets the Previous Balance / Closing Cash Balance from the Late shift ('Late' or 'กะบ่าย') of the previous day.
 * If exact previous day's Late shift is not found, falls back to the most recent Late shift prior to currentDateStr.
 */
export function getPreviousDayLateBalance(currentDateStr: string, savedCashCounts: CashCountData[]): number {
  if (!savedCashCounts || savedCashCounts.length === 0) return 0;

  const currentIso = normalizeDateToIso(currentDateStr);

  // Calculate target previous day ISO string
  let prevDayIso = '';
  if (currentIso) {
    const curDate = new Date(currentIso + 'T00:00:00');
    if (!isNaN(curDate.getTime())) {
      curDate.setDate(curDate.getDate() - 1);
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      prevDayIso = `${yyyy}-${mm}-${dd}`;
    }
  }

  // Helper to get closing balance of a cash count record
  const getRecordClosingBalance = (rec: CashCountData): number => {
    const totalOut = rec.denominations?.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0) || 0;
    const totalIn = rec.denominations?.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0) || 0;
    if (totalOut > 0) return totalOut;
    if (totalIn > 0) return totalIn;
    return rec.beerPrevBalance || 0;
  };

  // 1. Check for 'Late' / 'กะบ่าย' shift on exact previous day
  if (prevDayIso) {
    const exactPrevDayLate = savedCashCounts.find((c) => {
      const isLate = c.shift === 'Late' || c.shift === 'กะบ่าย';
      const cIso = normalizeDateToIso(c.date);
      return isLate && cIso === prevDayIso;
    });

    if (exactPrevDayLate) {
      return getRecordClosingBalance(exactPrevDayLate);
    }
  }

  // 2. Check for most recent 'Late' / 'กะบ่าย' shift record prior to current date
  const lateRecordsBeforeCurrent = savedCashCounts.filter((c) => {
    const isLate = c.shift === 'Late' || c.shift === 'กะบ่าย';
    if (!isLate) return false;
    if (!currentIso) return true;
    const cIso = normalizeDateToIso(c.date);
    return cIso < currentIso;
  });

  if (lateRecordsBeforeCurrent.length > 0) {
    const sorted = [...lateRecordsBeforeCurrent].sort((a, b) => {
      const aIso = normalizeDateToIso(a.date);
      const bIso = normalizeDateToIso(b.date);
      if (aIso !== bIso) return bIso.localeCompare(aIso);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return getRecordClosingBalance(sorted[0]);
  }

  // 3. Fallback: Any 'Late' / 'กะบ่าย' shift in saved history
  const anyLate = savedCashCounts.find((c) => c.shift === 'Late' || c.shift === 'กะบ่าย');
  if (anyLate) {
    return getRecordClosingBalance(anyLate);
  }

  // 4. Fallback: Most recent record prior to current date regardless of shift
  if (currentIso) {
    const previousRecords = savedCashCounts.filter((c) => normalizeDateToIso(c.date) < currentIso);
    if (previousRecords.length > 0) {
      const sortedPrev = [...previousRecords].sort((a, b) => {
        const aIso = normalizeDateToIso(a.date);
        const bIso = normalizeDateToIso(b.date);
        if (aIso !== bIso) return bIso.localeCompare(aIso);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      return getRecordClosingBalance(sortedPrev[0]);
    }
  }

  return 0;
}

/**
 * Automatically determines the expected previous balance based on date, shift, and historical records.
 * - For 'Late' (กะบ่าย) shift: looks for 'Early' (กะเช้า) shift record on the same date first.
 *   If found and closing balance > 0, returns that. Otherwise falls back to previous day's Late shift balance.
 * - For 'Early' (กะเช้า) shift: returns previous day's Late shift balance.
 */
export function getAutoPreviousBalance(currentDateStr: string, currentShift: string, savedCashCounts: CashCountData[]): number {
  if (!savedCashCounts || savedCashCounts.length === 0) return 0;

  const isLate = currentShift === 'Late' || currentShift === 'กะบ่าย';
  const currentIso = normalizeDateToIso(currentDateStr);

  const getRecordClosingBalance = (rec: CashCountData): number => {
    const totalOut = rec.denominations?.reduce((acc, d) => acc + d.value * (d.countOut || 0), 0) || 0;
    const totalIn = rec.denominations?.reduce((acc, d) => acc + d.value * (d.countIn || 0), 0) || 0;
    if (totalOut > 0) return totalOut;
    if (totalIn > 0) return totalIn;
    return rec.beerPrevBalance || 0;
  };

  if (isLate && currentIso) {
    // Look for Early shift on exact same date
    const sameDayEarly = savedCashCounts.find((c) => {
      const isEarly = c.shift === 'Early' || c.shift === 'กะเช้า';
      const cIso = normalizeDateToIso(c.date);
      return isEarly && cIso === currentIso;
    });

    if (sameDayEarly) {
      const bal = getRecordClosingBalance(sameDayEarly);
      if (bal > 0) return bal;
    }
  }

  // Fallback to previous day's late shift balance
  return getPreviousDayLateBalance(currentDateStr, savedCashCounts);
}



