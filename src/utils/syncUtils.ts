import { CashCountData, ReceiptSubstituteData, ReceiptSubstituteItem } from '../types';

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

  if (minusExpenses.length === 0) {
    // If there are no minus expenses, retain manual items (and clean leading minus signs if any)
    const nonCcItems = currentReceiptData.items
      .filter((item) => !item.id.startsWith('cc-'))
      .map((item) => ({
        ...item,
        description: item.description ? item.description.replace(/^[-+\s]+/, '') : '',
      }));
    if (nonCcItems.length > 0 && nonCcItems.length !== currentReceiptData.items.length) {
      return {
        ...currentReceiptData,
        items: nonCcItems,
      };
    }
    return currentReceiptData;
  }

  // Convert minus expenses into receipt items with leading '-' and '+' removed
  const autoItems: ReceiptSubstituteItem[] = minusExpenses.map((exp) => {
    const raw = exp.item ? exp.item.trim() : '';
    const cleanedDescription = raw.replace(/^[-+\s]+/, '');
    return {
      id: `cc-${exp.id}`,
      date: cashCountData.date || new Date().toISOString().split('T')[0],
      description: cleanedDescription || raw,
      amount: Number(exp.amount) || 0,
      remark: exp.staff ? `ผู้เบิก/จ่าย: ${exp.staff}` : (exp.remark || ''),
    };
  });

  // Preserve any manually added items in receipt substitute (cleaning leading minus if any)
  const manualItems = currentReceiptData.items
    .filter((item) => !item.id.startsWith('cc-') && (item.description.trim() !== '' || item.amount > 0))
    .map((item) => ({
      ...item,
      description: item.description ? item.description.replace(/^[-+\s]+/, '') : '',
    }));

  const mergedItems = [...autoItems, ...manualItems];

  const effectiveDate = cashCountData.date || currentReceiptData.startDate;

  return {
    ...currentReceiptData,
    startDate: currentReceiptData.startDate || effectiveDate,
    endDate: currentReceiptData.endDate || effectiveDate,
    items: mergedItems,
  };
}
