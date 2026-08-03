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
      ctx.fillStyle = '#000000';
      ctx.fillStyle = match;
      const converted = ctx.fillStyle;
      if (converted && !/(oklch|oklab|lch|lab|color-mix|light-dark|color)/i.test(converted)) {
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
    if (computedColor && !/(oklch|oklab|lch|lab|color-mix|light-dark|color)/i.test(computedColor)) {
      colorCache.set(match, computedColor);
      return computedColor;
    }
  } catch {
    /* ignore */
  }

  // 3. Safe fallback color
  const fallback = 'rgb(15, 23, 42)';
  colorCache.set(match, fallback);
  return fallback;
}

export function replaceUnsupportedColorsInString(str: string): string {
  if (!str || !/(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(str)) return str;

  let result = '';
  let i = 0;
  const lowerStr = str.toLowerCase();

  while (i < str.length) {
    // Find match for oklch(, oklab(, lch(, lab(, color-mix(, light-dark(, color(
    const match = lowerStr.slice(i).match(/(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i);
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
        // A. Proxy getComputedStyle on clonedDoc window to automatically intercept any oklab/oklch colors
        if (clonedDoc.defaultView) {
          const origGetComputedStyle = clonedDoc.defaultView.getComputedStyle;
          clonedDoc.defaultView.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
            const style = origGetComputedStyle.call(clonedDoc.defaultView, elt, pseudoElt);
            return new Proxy(style, {
              get(target, prop, receiver) {
                if (prop === 'getPropertyValue') {
                  return function (propertyName: string) {
                    const propVal = target.getPropertyValue(propertyName);
                    if (typeof propVal === 'string' && /(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(propVal)) {
                      return replaceUnsupportedColorsInString(propVal);
                    }
                    return propVal;
                  };
                }
                const val = Reflect.get(target, prop, receiver);
                if (typeof val === 'string' && /(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(val)) {
                  return replaceUnsupportedColorsInString(val);
                }
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              },
            });
          };
        }

        // B. Sanitize all <style> elements text content and css rules
        clonedDoc.querySelectorAll('style').forEach((styleEl) => {
          try {
            let cssText = styleEl.textContent || '';
            if (styleEl.sheet) {
              try {
                const rules = Array.from(styleEl.sheet.cssRules || []);
                cssText = rules.map((r) => r.cssText).join('\n');
              } catch {
                /* ignore */
              }
            }
            if (cssText && /(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(cssText)) {
              styleEl.textContent = replaceUnsupportedColorsInString(cssText);
            }
          } catch {
            /* ignore */
          }
        });

        // C. Sanitize inline style attributes and force explicit RGB values on key color properties
        const colorProps = [
          'color',
          'backgroundColor',
          'borderColor',
          'borderTopColor',
          'borderRightColor',
          'borderBottomColor',
          'borderLeftColor',
          'outlineColor',
          'fill',
          'stroke',
          'boxShadow',
          'textShadow',
        ];

        clonedDoc.querySelectorAll('*').forEach((el) => {
          const htmlEl = el as HTMLElement;
          const styleAttr = htmlEl.getAttribute('style');
          if (styleAttr && /(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(styleAttr)) {
            htmlEl.setAttribute('style', replaceUnsupportedColorsInString(styleAttr));
          }

          try {
            const computed = window.getComputedStyle(htmlEl);
            colorProps.forEach((prop) => {
              const val = (computed as any)[prop];
              if (typeof val === 'string' && /(oklch|oklab|lch|lab|color-mix|light-dark|color)\s*\(/i.test(val)) {
                const safeVal = replaceUnsupportedColorsInString(val);
                htmlEl.style[prop as any] = safeVal;
              }
            });
          } catch {
            /* ignore */
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Calculate width and height in mm for A4 page
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm

    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');

    // If height is slightly larger than page height (e.g. up to 320mm), scale it down so it fits on 1 page
    if (imgHeight > pageHeight && imgHeight <= 320) {
      imgHeight = pageHeight;
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Handle multi-page if document genuinely exceeds single A4 page by a large margin
      while (heightLeft >= 10) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
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

