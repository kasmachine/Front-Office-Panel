import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const colorCache = new Map<string, string>();

function replaceOklchInString(str: string): string {
  if (!str || !str.includes('oklch')) return str;

  return str.replace(/oklch\([^)]+\)/g, (match) => {
    if (colorCache.has(match)) {
      return colorCache.get(match)!;
    }
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.color = match;
      document.body.appendChild(tempDiv);
      const computedColor = window.getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      const result = computedColor && computedColor !== '' ? computedColor : 'rgb(128, 128, 128)';
      colorCache.set(match, result);
      return result;
    } catch {
      return 'rgb(128, 128, 128)';
    }
  });
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
          if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
            styleEl.textContent = replaceOklchInString(styleEl.textContent);
          }
        });

        // 2. Sanitize inline style attributes on all elements in cloned document
        clonedDoc.querySelectorAll('*').forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr && styleAttr.includes('oklch')) {
            el.setAttribute('style', replaceOklchInString(styleAttr));
          }
        });
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
