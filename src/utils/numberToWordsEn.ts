/**
 * Converts a numeric value to English words for currency amounts.
 * Example: 1500.50 -> "One Thousand Five Hundred Baht and Fifty Satang Only"
 * Example: 100.00 -> "One Hundred Baht Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertGroup(n: number): string {
  let result = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    result += `${ONES[hundreds]} Hundred`;
    if (remainder > 0) {
      result += ' and ';
    }
  }

  if (remainder > 0) {
    if (remainder < 20) {
      result += ONES[remainder];
    } else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      result += TENS[ten];
      if (unit > 0) {
        result += `-${ONES[unit]}`;
      }
    }
  }

  return result;
}

export function ArabicToEnglishText(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Zero Baht Only';
  }

  if (amount === 0) {
    return 'Zero Baht Only';
  }

  const rounded = Math.abs(amount).toFixed(2);
  const [integerStr, decimalStr] = rounded.split('.');
  const integerVal = parseInt(integerStr, 10);
  const satangVal = parseInt(decimalStr, 10);

  if (integerVal === 0 && satangVal === 0) {
    return 'Zero Baht Only';
  }

  let words = '';

  if (integerVal > 0) {
    const billions = Math.floor(integerVal / 1000000000);
    const millions = Math.floor((integerVal % 1000000000) / 1000000);
    const thousands = Math.floor((integerVal % 1000000) / 1000);
    const hundreds = integerVal % 1000;

    const parts: string[] = [];

    if (billions > 0) {
      parts.push(`${convertGroup(billions)} Billion`);
    }
    if (millions > 0) {
      parts.push(`${convertGroup(millions)} Million`);
    }
    if (thousands > 0) {
      parts.push(`${convertGroup(thousands)} Thousand`);
    }
    if (hundreds > 0) {
      parts.push(convertGroup(hundreds));
    }

    words = parts.join(' ') + ' Baht';
  }

  if (satangVal > 0) {
    const satangWords = convertGroup(satangVal);
    if (words) {
      words += ` and ${satangWords} Satang`;
    } else {
      words = `${satangWords} Satang`;
    }
  }

  words += ' Only';

  if (amount < 0) {
    words = `Minus ${words}`;
  }

  return words;
}
