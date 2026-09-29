import { getActiveReceiptTemplate } from './receipt-template-store';
import { useCurrency } from "@/hooks/use-currency";

export function triggerThermalPrint(customPaperWidth?: string) {
  if (typeof window === 'undefined') return;

  const activeTemplate = getActiveReceiptTemplate();
  const paperWidth = customPaperWidth || activeTemplate.paperSize || '80mm';
  const is58 = paperWidth === '58mm';
  const printableWidth = is58 ? '48mm' : '72mm';

  document.body.classList.add('printing-receipt');

  // Enforce @page style tag dynamically for thermal roll paper sizes (80mm / 58mm)
  let styleEl = document.getElementById('thermal-print-style-tag');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'thermal-print-style-tag';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @media print {
      body.printing-receipt {
        width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body.printing-receipt > *:not(#printable-receipt-portal),
      body.printing-receipt #root > *:not(#printable-receipt-portal),
      body.printing-receipt header,
      body.printing-receipt nav,
      body.printing-receipt footer,
      body.printing-receipt .no-print,
      body.printing-receipt [data-no-print] {
        display: none !important;
        visibility: hidden !important;
      }
      body.printing-receipt #printable-receipt-portal {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: ${printableWidth} !important;
        max-width: ${printableWidth} !important;
        padding: 1mm 2mm !important;
        margin: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        z-index: 999999 !important;
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, "Consolas", monospace !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1.3 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        text-rendering: geometricPrecision !important;
        -webkit-font-smoothing: antialiased !important;
        box-sizing: border-box !important;
      }
      body.printing-receipt #printable-receipt-portal * {
        visibility: visible !important;
        color: #000000 !important;
        border-color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: transparent !important;
        box-sizing: border-box !important;
      }
    }
  `;

  // Use requestAnimationFrame to ensure React has rendered the portal before print
  // Then add another rAF tick to allow styles to apply, then print.
  const portal = document.getElementById('printable-receipt-portal');
  if (!portal) {
    console.warn('[Print] Receipt portal not found in DOM');
    document.body.classList.remove('printing-receipt');
    try { styleEl.remove(); } catch {}
    return;
  }

  // Force two animation frames + a small delay to guarantee layout flush
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error('[Print] window.print() failed:', e);
        } finally {
          setTimeout(() => {
            document.body.classList.remove('printing-receipt');
            try { styleEl?.remove(); } catch {}
          }, 1500);
        }
      }, 100);
    });
  });
}
