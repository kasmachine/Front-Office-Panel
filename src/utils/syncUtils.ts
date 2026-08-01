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

export function extractMinusExpenses(cashCountData: CashCountData) {
  return [
    ...(cashCountData.expensesIn || []),
    ...(cashCountData.expensesOut || []),
  ].filter(
    (exp) =>
      exp &&
      exp.item &&
      exp.item.trim().startsWith('-') &&
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

  // Preserve any manually added items in receipt substitute
  const manualItems = currentReceiptData.items
    .filter((item) => !item.id.startsWith('cc-') && (item.description.trim() !== '' || item.amount !== 0))
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

  if (!itemsChanged && !datesChanged) {
    return currentReceiptData;
  }

  return {
    ...currentReceiptData,
    startDate: targetDate,
    endDate: targetDate,
    items: mergedItems,
  };
}


