/**
 * Converts a numeric value to Thai Baht text representation.
 * Example: 1500.50 -> "หนึ่งพันห้าร้อยบาทห้าสิบสตางค์"
 * Example: 100.00 -> "หนึ่งร้อยบาทถ้วน"
 */

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertSection(numberStr: string): string {
  let result = '';
  const len = numberStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numberStr.charAt(i), 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 1 && digit === 1) {
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else if (pos === 0 && digit === 1 && len > 1) {
        result += 'เอ็ด';
      } else {
        result += THAI_NUMBERS[digit] + THAI_UNITS[pos];
      }
    }
  }

  return result;
}

export function ArabicToBahtText(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'ศูนย์บาทถ้วน';
  }

  if (amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  // Round to 2 decimal places
  const rounded = Math.abs(amount).toFixed(2);
  const [integerPart, decimalPart] = rounded.split('.');

  let bahtText = '';

  // Process integer part in chunks of 6 (millions)
  let integerStr = integerPart;
  let millionCount = 0;

  while (integerStr.length > 0) {
    const chunkLength = Math.min(6, integerStr.length);
    const chunk = integerStr.slice(-chunkLength);
    integerStr = integerStr.slice(0, -chunkLength);

    const chunkText = convertSection(chunk);
    if (chunkText !== '') {
      if (millionCount > 0) {
        bahtText = chunkText + 'ล้าน'.repeat(millionCount) + bahtText;
      } else {
        bahtText = chunkText + bahtText;
      }
    }
    millionCount++;
  }

  if (bahtText === '') {
    bahtText = 'ศูนย์';
  }

  bahtText += 'บาท';

  const satang = parseInt(decimalPart, 10);
  if (satang === 0) {
    bahtText += 'ถ้วน';
  } else {
    bahtText += convertSection(decimalPart) + 'สตางค์';
  }

  if (amount < 0) {
    bahtText = 'ลบ' + bahtText;
  }

  return bahtText;
}
