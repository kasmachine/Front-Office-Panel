import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const colorCache = new Map<string, string>();

function colorToRgb(match: string): string {
  if (colorCache.has(match)) {
    return colorCache.get(match)!;
  }

  // 1. Try Canvas 2D context for accurate color conversion
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#123456';
      ctx.fillStyle = match;
      const converted = ctx.fillStyle;
      if (converted && !/(oklch|oklab|lch|lab)/i.test(converted) && converted !== '#123456') {
        colorCache.set(match, converted);
        return converted;
      }
    }
  } catch {
    /* ignore */
  }

  // 2. Try DOM element getComputedStyle
  try {
    const tempDiv = document.createElement('div');
    tempDiv.style.color = match;
    document.body.appendChild(tempDiv);
    const computedColor = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    if (computedColor && !/(oklch|oklab|lch|lab)/i.test(computedColor)) {
      colorCache.set(match, computedColor);
      return computedColor;
    }
  } catch {
    /* ignore */
  }

  // 3. Safe fallback color
  const fallback = 'rgb(100, 116, 139)';
  colorCache.set(match, fallback);
  return fallback;
}

function replaceUnsupportedColorsInString(str: string): string {
  if (!str || !/(oklch|oklab|lch|lab)\s*\(/i.test(str)) return str;

  let result = '';
  let i = 0;
  const lowerStr = str.toLowerCase();

  while (i < str.length) {
    // Find match for oklch(, oklab(, lch(, lab(
    const match = lowerStr.slice(i).match(/(oklch|oklab|lch|lab)\s*\(/i);
    if (!match || match.index === undefined) {
      result += str.slice(i);
      break;
    }

    const matchIndex = i + match.index;
    result += str.slice(i, matchIndex);

    const parenIndex = str.indexOf('(', matchIndex);
    if (parenIndex === -1) {
      result += str.slice(matchIndex);
      break;
    }

    let depth = 1;
    let end = parenIndex + 1;

    while (end < str.length && depth > 0) {
      if (str[end] === '(') depth++;
      else if (str[end] === ')') depth--;
      end++;
    }

    const colorExpr = str.slice(matchIndex, end);
    result += colorToRgb(colorExpr);
    i = end;
  }

  return result;
}

export async function exportToPdf(elementId: string, filename: string = 'document.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution capture
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // 1. Sanitize all <style> elements in the cloned document
        clonedDoc.querySelectorAll('style').forEach((styleEl) => {
          if (styleEl.textContent && /(oklch|oklab|lch|lab)/i.test(styleEl.textContent)) {
            styleEl.textContent = replaceUnsupportedColorsInString(styleEl.textContent);
          }
        });

        // 2. Sanitize inline style attributes on all elements in cloned document
        clonedDoc.querySelectorAll('*').forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr && /(oklch|oklab|lch|lab)/i.test(styleAttr)) {
            el.setAttribute('style', replaceUnsupportedColorsInString(styleAttr));
          }
        });

        // 3. Sanitize styleSheets rules if accessible
        try {
          Array.from(clonedDoc.styleSheets).forEach((sheet) => {
            try {
              const rules = Array.from(sheet.cssRules || []);
              rules.forEach((rule, idx) => {
                if (rule.cssText && /(oklch|oklab|lch|lab)/i.test(rule.cssText)) {
                  const sanitized = replaceUnsupportedColorsInString(rule.cssText);
                  try {
                    sheet.deleteRule(idx);
                    sheet.insertRule(sanitized, idx);
                  } catch {
                    /* ignore */
                  }
                }
              });
            } catch {
              /* cross-origin sheet ignore */
            }
          });
        } catch {
          /* ignore */
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Calculate width and height in mm for A4 page
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Handle multi-page if document exceeds single A4 page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating PDF:', err);
    // Fallback to print
    window.print();
    return false;
  }
}

export function printDocument() {
  window.print();
}
