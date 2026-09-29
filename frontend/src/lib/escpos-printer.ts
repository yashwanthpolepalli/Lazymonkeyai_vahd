/**
 * ESC/POS Thermal Printer Direct USB & Serial Communication Engine
 * Supports HSPRINTER (HS-KH80) and standard POS80 80mm/58mm thermal printers.
 * Features direct raw binary command transmission, automatic paper cutter, and cash drawer kick.
 */

import { getActiveReceiptTemplate } from './receipt-template-store';
import { useCurrency } from "@/hooks/use-currency";
import { formatDisplayDate } from './utils';

// Standard ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;
const NUL = 0x00;

export class ESCPOSPrinter {
  private device: any = null;

  /**
   * Generates ESC/POS byte array for a given receipt bill payload
   */
  static buildReceiptBuffer(bill: any): Uint8Array {
    const activeTemplate = getActiveReceiptTemplate();
    const bytes: number[] = [];

    // Helper push string function (ASCII / UTF-8)
    const writeText = (str: string) => {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(str);
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded[i]);
      }
    };

    // Helper push command bytes
    const writeBytes = (...cmds: number[]) => {
      bytes.push(...cmds);
    };

    // 1. Initialize Printer (ESC @)
    writeBytes(ESC, 0x40);

    // 2. Select Character Code Table (PC437 / Standard USA)
    writeBytes(ESC, 0x74, 0);

    // 3. Center Align Header
    writeBytes(ESC, 0x61, 1);

    // Store Name (Double Height + Bold)
    writeBytes(ESC, 0x21, 0x20); // Double height
    writeBytes(ESC, 0x45, 1);    // Bold ON
    writeText((activeTemplate.storeName || 'LAZYMONKEY AI SUPERSTORE') + '\n');

    // Reset Font Formatting
    writeBytes(ESC, 0x21, 0x00);
    writeBytes(ESC, 0x45, 0);    // Bold OFF

    // Store Address & Phone
    if (activeTemplate.address) {
      writeText(activeTemplate.address + '\n');
    }
    if (activeTemplate.phone) {
      writeText('Ph: ' + activeTemplate.phone + '\n');
    }
    if (activeTemplate.gstin) {
      writeText('GSTIN: ' + activeTemplate.gstin + '\n');
    }

    // Header Title (Boxed / Bold)
    writeText('\n------------------------------------------------\n');
    writeBytes(ESC, 0x45, 1);
    writeText(`[ ${activeTemplate.invoiceTitle || 'RETAIL RECEIPT'} ]\n`);
    writeBytes(ESC, 0x45, 0);
    writeText('------------------------------------------------\n');

    // 4. Left Align Transaction Details
    writeBytes(ESC, 0x61, 0);

    const billNo = bill.invoice_number || bill.id || '#90412';
    const dateStr = formatDisplayDate(bill.date || new Date());
    const timeStr = bill.date ? new Date(bill.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const custName = bill.customerName || 'Walk-in Guest';

    writeText(`Bill No: ${billNo.padEnd(20)} Date: ${dateStr}\n`);
    writeText(`Time: ${timeStr.padEnd(23)} Cashier: POS-01\n`);
    writeText(`Customer: ${custName}\n`);
    writeText('------------------------------------------------\n');

    // 5. Item Table Header
    writeBytes(ESC, 0x45, 1);
    writeText('ITEM                            QTY       PRICE\n');
    writeBytes(ESC, 0x45, 0);
    writeText('------------------------------------------------\n');

    // Items Loop
    const items = bill.items || [];
    items.forEach((item: any, idx: number) => {
      const name = (item.name || item.product_name || `Item ${idx + 1}`).substring(0, 30);
      const qty = (item.quantity || 1).toString().padStart(4);
      const price = ((item.subtotal || (item.unit_price || 0) * (item.quantity || 1))).toFixed(2).padStart(10);

      // Print Name
      writeText(`${name.padEnd(30)} ${qty} ${price}\n`);
      if (item.sku) {
        writeText(`  SKU: ${item.sku}\n`);
      }
    });

    writeText('------------------------------------------------\n');

    // 6. Totals & Tax
    const subtotal = (bill.subtotal || 0).toFixed(2);
    const tax = (bill.tax || bill.tax_amount || 0).toFixed(2);
    const total = (bill.total || bill.grand_total || 0).toFixed(2);

    writeText(`Subtotal:${subtotal.padStart(39)}\n`);
    writeText(`CGST 2.5% + SGST 2.5%:${tax.padStart(26)}\n`);
    writeText('------------------------------------------------\n');

    // Total Amount (Double Width + Bold)
    writeBytes(ESC, 0x45, 1);
    writeBytes(ESC, 0x21, 0x30); // Double width + double height
    writeText(`TOTAL: Rs.${total}\n`);
    writeBytes(ESC, 0x21, 0x00);
    writeBytes(ESC, 0x45, 0);

    writeText('------------------------------------------------\n');

    // Payment Mode
    if (bill.payment_method) {
      writeText(`PAYMENT MODE: ${bill.payment_method.toUpperCase()} (${bill.payment_status || 'PAID'})\n`);
      writeText('------------------------------------------------\n');
    }

    // 7. Center Align Footer & Notes
    writeBytes(ESC, 0x61, 1);
    if (activeTemplate.declarationText) {
      writeText(`${activeTemplate.declarationText}\n\n`);
    }
    if (activeTemplate.footerNote) {
      writeText(`${activeTemplate.footerNote}\n`);
    } else {
      writeText('*** THANK YOU FOR SHOPPING ***\nVisit us again!\n');
    }

    // 8. Feed 4 lines
    writeBytes(ESC, 0x64, 4);

    // 9. Cut Paper (GS V 66 0)
    writeBytes(GS, 0x56, 66, 0);

    // 10. Open Cash Drawer (ESC p 0 25 250)
    writeBytes(ESC, 0x70, 0, 25, 250);

    return new Uint8Array(bytes);
  }

  /**
   * Connect to Direct USB Thermal Printer via WebUSB API
   */
  async printDirectUSB(bill: any): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!(navigator as any).usb) {
      console.warn('WebUSB API not supported in this browser environment.');
      return false;
    }

    try {
      // Request USB thermal printer device (Vendor Class 7 is Printer)
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { classCode: 7 } // USB Printer Class
        ]
      });

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      // Generate ESC/POS byte commands
      const data = ESCPOSPrinter.buildReceiptBuffer(bill);

      // Find OUT endpoint
      const endpoint = device.configuration.interfaces[0].alternate.endpoints.find(
        (e: any) => e.direction === 'out'
      );

      if (endpoint) {
        await device.transferOut(endpoint.endpointNumber, data);
        await device.close();
        return true;
      }
    } catch (e) {
      console.warn('Direct WebUSB printing error/cancelled:', e);
    }
    return false;
  }
}
