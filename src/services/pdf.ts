import { jsPDF } from 'jspdf';
import type { CompanySettings, Invoice, DeliveryChallan, Quotation, Customer, PayrollRecord } from '../types';

export class PDFGenerator {
  /**
   * Helper to draw corporate navy header for Puma Art Printers
   */
  private static drawHeader(doc: jsPDF, settings: CompanySettings, docTitle: string, docNumber: string) {
    // Primary Navy Blue banner
    doc.setFillColor(15, 23, 42); // #0F172A
    doc.rect(0, 0, 210, 36, 'F');

    // Accent line (Cyan/Gold)
    doc.setFillColor(2, 132, 199); // #0284C7
    doc.rect(0, 36, 210, 2, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.companyName.toUpperCase(), 14, 15);

    // Tagline & details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253);
    doc.text(settings.tagline, 14, 21);
    doc.text(`${settings.address} | Phone: ${settings.phone}`, 14, 27);
    doc.text(`Web: ${settings.website} | NTN: ${settings.ntnNumber} | STRN: ${settings.strnNumber}`, 14, 32);

    // Document Title Badge on top right
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(docTitle.toUpperCase(), 196, 16, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(224, 242, 254);
    doc.text(`# ${docNumber}`, 196, 23, { align: 'right' });
  }

  /**
   * Helper for footer
   */
  private static drawFooter(doc: jsPDF, settings: CompanySettings) {
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 280, 196, 280);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('This is a computer-generated document from Puma Art Printers ERP. No signature required.', 14, 285);
    doc.text(`Bank: ${settings.bankDetails}`, 14, 290);
    doc.text(`Page 1 of 1`, 196, 290, { align: 'right' });
  }

  /**
   * Generates Invoice PDF
   */
  static generateInvoicePDF(invoice: Invoice, settings: CompanySettings): void {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    this.drawHeader(doc, settings, 'Sales Invoice', invoice.invoiceNumber);

    // Bill To & Meta info
    let y = 46;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILLED TO:', 14, y);
    doc.text('INVOICE DETAILS:', 130, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(invoice.customerName, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Invoice Date: ${invoice.date}`, 130, y);

    y += 5;
    doc.text(`Due Date: ${invoice.dueDate}`, 130, y);

    if (invoice.orderNumber) {
      y += 5;
      doc.text(`Order Reference: ${invoice.orderNumber}`, 130, y);
    }

    // Table Header
    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Sr.', 16, y + 5.5);
    doc.text('Description / Packaging Product', 30, y + 5.5);
    doc.text('Qty', 125, y + 5.5, { align: 'right' });
    doc.text('Rate (PKR)', 155, y + 5.5, { align: 'right' });
    doc.text('Total (PKR)', 192, y + 5.5, { align: 'right' });

    // Table Rows
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    invoice.items.forEach((item, index) => {
      const lineY = y + index * 8;
      doc.text((index + 1).toString(), 16, lineY + 5.5);
      doc.text(item.productName.substring(0, 45), 30, lineY + 5.5);
      doc.text(item.quantity.toLocaleString(), 125, lineY + 5.5, { align: 'right' });
      doc.text(item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }), 155, lineY + 5.5, { align: 'right' });
      doc.text(item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), 192, lineY + 5.5, { align: 'right' });
      doc.setDrawColor(241, 245, 249);
      doc.line(14, lineY + 8, 196, lineY + 8);
    });

    const tableBottomY = y + invoice.items.length * 8 + 6;

    // Totals Box
    const totalBoxY = Math.max(tableBottomY, 140);
    doc.setFillColor(248, 250, 252);
    doc.rect(120, totalBoxY, 76, 38, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, totalBoxY, 76, 38, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', 124, totalBoxY + 7);
    doc.text(`Rs. ${invoice.subtotal.toLocaleString()}`, 192, totalBoxY + 7, { align: 'right' });

    doc.text(`Tax (${invoice.taxRate || 0}%):`, 124, totalBoxY + 14);
    doc.text(`Rs. ${(invoice.taxAmount || 0).toLocaleString()}`, 192, totalBoxY + 14, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Grand Total:', 124, totalBoxY + 22);
    doc.text(`Rs. ${invoice.grandTotal.toLocaleString()}`, 192, totalBoxY + 22, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129); // green
    doc.text('Paid Amount:', 124, totalBoxY + 29);
    doc.text(`Rs. ${(invoice.paidAmount || 0).toLocaleString()}`, 192, totalBoxY + 29, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // red
    doc.text('Balance Due:', 124, totalBoxY + 35);
    doc.text(`Rs. ${invoice.balanceDue.toLocaleString()}`, 192, totalBoxY + 35, { align: 'right' });

    // Payment Instructions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment Terms & Bank Details:', 14, totalBoxY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8.5);
    doc.text(settings.bankDetails, 14, totalBoxY + 14);
    doc.text('Please write invoice number on remittance advice or cheque deposit.', 14, totalBoxY + 20);
    if (invoice.notes) {
      doc.text(`Notes: ${invoice.notes}`, 14, totalBoxY + 26);
    }

    // Signatures
    y = 245;
    doc.setDrawColor(203, 213, 225);
    doc.line(14, y, 64, y);
    doc.line(146, y, 196, y);
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By (Accounts)', 14, y + 4);
    doc.text('Authorized Signatory (Puma Art)', 146, y + 4);

    this.drawFooter(doc, settings);
    doc.save(`${invoice.invoiceNumber}.pdf`);
  }

  /**
   * Generates Delivery Challan PDF
   */
  static generateDeliveryChallanPDF(challan: DeliveryChallan, settings: CompanySettings): void {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    this.drawHeader(doc, settings, 'Delivery Challan', challan.challanNumber);

    let y = 46;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CONSIGNEE / CLIENT:', 14, y);
    doc.text('DISPATCH DETAILS:', 130, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(challan.customerName, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Challan Date: ${challan.date}`, 130, y);

    y += 5;
    doc.text(`Order No: ${challan.orderNumber}`, 130, y);

    y += 5;
    doc.text(`Vehicle No: ${challan.vehicleNumber || 'Factory Pickup'}`, 130, y);
    doc.text(`Driver: ${challan.driverName || 'N/A'}`, 14, y);

    y += 5;
    doc.text(`Delivery Address: ${challan.deliveryAddress}`, 14, y);

    // Table Header
    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Sr.', 16, y + 5.5);
    doc.text('Item / Product Description', 28, y + 5.5);
    doc.text('Order Qty', 115, y + 5.5, { align: 'right' });
    doc.text('Prev. Deliv.', 140, y + 5.5, { align: 'right' });
    doc.text('Dispatch Qty', 168, y + 5.5, { align: 'right' });
    doc.text('Balance Qty', 194, y + 5.5, { align: 'right' });

    // Table Rows
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    challan.items.forEach((item, index) => {
      const lineY = y + index * 8;
      doc.text((index + 1).toString(), 16, lineY + 5.5);
      doc.text(item.productName.substring(0, 40), 28, lineY + 5.5);
      doc.text(item.orderedQty.toLocaleString(), 115, lineY + 5.5, { align: 'right' });
      doc.text(item.previouslyDeliveredQty.toLocaleString(), 140, lineY + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(item.dispatchQty.toLocaleString(), 168, lineY + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(item.remainingQty.toLocaleString(), 194, lineY + 5.5, { align: 'right' });
      doc.setDrawColor(241, 245, 249);
      doc.line(14, lineY + 8, 196, lineY + 8);
    });

    const bottomY = y + challan.items.length * 8 + 15;

    // Receiver Acknowledgment Box
    doc.setFillColor(248, 250, 252);
    doc.rect(14, bottomY, 182, 45, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, bottomY, 182, 45, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('RECEIVER ACKNOWLEDGMENT & GOOD ORDER RECEIPT:', 18, bottomY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Received the above mentioned printed packaging materials in good order, exact count and sound condition.', 18, bottomY + 14);

    doc.text(`Received By: _____________________________________`, 18, bottomY + 28);
    doc.text(`CNIC / Phone: ___________________________________`, 18, bottomY + 36);
    doc.text(`Receiver Signature & Stamp: ________________________`, 108, bottomY + 36);

    // Factory Gate Pass Signatures
    const sigY = 245;
    doc.line(14, sigY, 64, sigY);
    doc.line(78, sigY, 128, sigY);
    doc.line(146, sigY, 196, sigY);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Warehouse Incharge', 14, sigY + 4);
    doc.text('Driver Signature', 78, sigY + 4);
    doc.text('Security / Gate Pass Out', 146, sigY + 4);

    this.drawFooter(doc, settings);
    doc.save(`${challan.challanNumber}.pdf`);
  }

  /**
   * Generates Quotation PDF
   */
  static generateQuotationPDF(quote: Quotation, settings: CompanySettings): void {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    this.drawHeader(doc, settings, 'Formal Quotation', quote.quotationNumber);

    let y = 46;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PREPARED FOR:', 14, y);
    doc.text('QUOTATION DETAILS:', 130, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(quote.customerName, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${quote.date}`, 130, y);

    y += 5;
    doc.text(`Valid Until: ${quote.validUntil}`, 130, y);
    doc.text(`Terms: ${quote.paymentTerms}`, 130, y + 5);

    // Items
    y += 15;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Sr.', 16, y + 5.5);
    doc.text('Specification & Finishing Details', 28, y + 5.5);
    doc.text('Qty', 125, y + 5.5, { align: 'right' });
    doc.text('Rate (PKR)', 155, y + 5.5, { align: 'right' });
    doc.text('Total (PKR)', 192, y + 5.5, { align: 'right' });

    y += 8;
    quote.items.forEach((item, index) => {
      const lineY = y;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text((index + 1).toString(), 16, lineY + 5);
      doc.text(item.productName, 28, lineY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Size: ${item.dimensions} | Material: ${item.paperBoardSpec} (${item.gsm} GSM)`, 28, lineY + 10);
      doc.text(`Print: ${item.printingRequirements} | Finishing: ${item.finishingRequirements}`, 28, lineY + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(item.quantity.toLocaleString(), 125, lineY + 5, { align: 'right' });
      doc.text(item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }), 155, lineY + 5, { align: 'right' });
      doc.text(item.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), 192, lineY + 5, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(14, lineY + 18, 196, lineY + 18);
      y += 19;
    });

    // Grand total
    const totalBoxY = Math.max(y + 6, 175);
    doc.setFillColor(248, 250, 252);
    doc.rect(120, totalBoxY, 76, 26, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(120, totalBoxY, 76, 26, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', 124, totalBoxY + 7);
    doc.text(`Rs. ${quote.subtotal.toLocaleString()}`, 192, totalBoxY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Grand Total:', 124, totalBoxY + 17);
    doc.text(`Rs. ${quote.grandTotal.toLocaleString()}`, 192, totalBoxY + 17, { align: 'right' });

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('General Printing & Delivery Conditions:', 14, totalBoxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('1. 50% advance along with finalized digital artwork approval.', 14, totalBoxY + 11);
    doc.text('2. 10% +/- tolerance in finished delivered quantity as per printing industry standards.', 14, totalBoxY + 16);
    doc.text('3. Dies & plates prepared remain custody of Puma Art Printers unless paid separately.', 14, totalBoxY + 21);

    this.drawFooter(doc, settings);
    doc.save(`${quote.quotationNumber}.pdf`);
  }

  /**
   * Generates Customer Statement PDF
   */
  static generateCustomerStatementPDF(customer: Customer, invoices: Invoice[], settings: CompanySettings): void {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    this.drawHeader(doc, settings, 'Customer Statement', customer.code);

    let y = 46;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ACCOUNT HOLDER:', 14, y);
    doc.text('STATEMENT SUMMARY:', 130, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(customer.name, 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 130, y);

    y += 5;
    doc.text(`Company: ${customer.company || customer.name}`, 14, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text(`Current Outstanding: Rs. ${customer.currentBalance.toLocaleString()}`, 130, y);

    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Invoice #', 16, y + 5.5);
    doc.text('Date', 50, y + 5.5);
    doc.text('Due Date', 80, y + 5.5);
    doc.text('Total (PKR)', 125, y + 5.5, { align: 'right' });
    doc.text('Paid (PKR)', 158, y + 5.5, { align: 'right' });
    doc.text('Balance (PKR)', 192, y + 5.5, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    invoices.forEach((inv) => {
      doc.text(inv.invoiceNumber, 16, y + 5.5);
      doc.text(inv.date, 50, y + 5.5);
      doc.text(inv.dueDate, 80, y + 5.5);
      doc.text(inv.grandTotal.toLocaleString(), 125, y + 5.5, { align: 'right' });
      doc.text(inv.paidAmount.toLocaleString(), 158, y + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(inv.balanceDue.toLocaleString(), 192, y + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 8, 196, y + 8);
      y += 8;
    });

    this.drawFooter(doc, settings);
    doc.save(`Statement_${customer.code}.pdf`);
  }

  /**
   * Generates Employee Monthly Payslip
   */
  static generatePayslipPDF(pay: PayrollRecord, settings: CompanySettings): void {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    this.drawHeader(doc, settings, 'Salary Payslip', pay.payrollNumber);

    let y = 48;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`EMPLOYEE: ${pay.employeeName.toUpperCase()}`, 14, y);
    doc.text(`MONTH / PERIOD: ${pay.month}`, 130, y);

    y += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 90, 8, 'F');
    doc.rect(106, y, 90, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EARNINGS', 18, y + 5.5);
    doc.text('DEDUCTIONS & ADJUSTMENTS', 110, y + 5.5);

    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    // Earnings
    doc.text('Basic Salary:', 18, y);
    doc.text(`Rs. ${pay.basicSalary.toLocaleString()}`, 95, y, { align: 'right' });
    doc.text('Allowances:', 18, y + 6);
    doc.text(`Rs. ${pay.allowances.toLocaleString()}`, 95, y + 6, { align: 'right' });
    doc.text(`Overtime (${pay.overtimeHours} hrs):`, 18, y + 12);
    doc.text(`Rs. ${pay.overtimeAmount.toLocaleString()}`, 95, y + 12, { align: 'right' });
    doc.text('Performance Bonus:', 18, y + 18);
    doc.text(`Rs. ${pay.bonus.toLocaleString()}`, 95, y + 18, { align: 'right' });

    // Deductions
    doc.text('Salary Advance Adjustment:', 110, y);
    doc.text(`Rs. ${pay.advanceDeductions.toLocaleString()}`, 190, y, { align: 'right' });
    doc.text('Other Deductions:', 110, y + 6);
    doc.text(`Rs. ${(pay.totalDeductions - pay.advanceDeductions).toLocaleString()}`, 190, y + 6, { align: 'right' });

    y += 30;
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 16, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, 182, 16, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('NET SALARY PAYABLE:', 18, y + 10);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${pay.netPayable.toLocaleString()}`, 190, y + 10, { align: 'right' });

    this.drawFooter(doc, settings);
    doc.save(`Payslip_${pay.employeeName.replace(/\s+/g, '_')}_${pay.month}.pdf`);
  }
}
