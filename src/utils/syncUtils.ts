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
  currentReceiptData: ReceiptSubstituteData
): ReceiptSubstituteData {
  const minusExpenses = extractMinusExpenses(cashCountData);

  // Convert current minus expenses into receipt items with leading '-' and '+' removed
  const autoItems: ReceiptSubstituteItem[] = minusExpenses.map((exp) => {
    const raw = exp.item ? exp.item.trim() : '';
    const cleanedDescription = raw.replace(/^[-+\s]+/, '');
    const itemDate = cashCountData.date ? formatDateToDisplay(cashCountData.date) : getTodayFormatted();
    return {
      id: `cc-${exp.id}`,
      date: itemDate,
      description: cleanedDescription || raw,
      amount: Number(exp.amount) || 0,
      remark: exp.staff ? `ผู้เบิก/จ่าย: ${exp.staff}` : (exp.remark || ''),
    };
  });

  // Preserve any manually added items in receipt substitute
  const manualItems = currentReceiptData.items
    .filter((item) => !item.id.startsWith('cc-') && (item.description.trim() !== '' || item.amount > 0))
    .map((item) => ({
      ...item,
      date: formatDateToDisplay(item.date),
      description: item.description ? item.description.replace(/^[-+\s]+/, '') : '',
    }));

  const mergedItems = [...autoItems, ...manualItems];
  const effectiveDate = cashCountData.date ? formatDateToDisplay(cashCountData.date) : currentReceiptData.startDate;

  const itemsChanged = JSON.stringify(mergedItems) !== JSON.stringify(currentReceiptData.items);
  const datesChanged =
    (currentReceiptData.startDate || '') !== effectiveDate ||
    (currentReceiptData.endDate || '') !== effectiveDate;

  if (!itemsChanged && !datesChanged) {
    return currentReceiptData;
  }

  return {
    ...currentReceiptData,
    startDate: currentReceiptData.startDate || effectiveDate,
    endDate: currentReceiptData.endDate || effectiveDate,
    items: mergedItems,
  };
}


