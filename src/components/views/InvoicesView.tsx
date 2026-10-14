import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  FileDown,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Share2,
} from 'lucide-react';
import { db } from '../../db';
import type { Invoice, InvoiceItem, CompanySettings, Customer, NavigationTab } from '../../types';
import { PDFGenerator } from '../../services/pdf';
import { AccountingEngine } from '../../services/accounting';

interface InvoicesViewProps {
  settings: CompanySettings;
  initialAction?: string;
  onNavigateToPayment?: (invoiceId: number) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  settings,
  initialAction,
  onNavigateToPayment,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      productName: '',
      quantity: 10000,
      unitPrice: 12,
      lineTotal: 120000,
    },
  ]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    setDueDate(defaultDue.toISOString().split('T')[0]);
  }, []);

  const loadData = async () => {
    const invList = await db.invoices.toArray();
    const custList = await db.customers.toArray();
    setInvoices(invList.reverse());
    setCustomers(custList);
    if (custList.length > 0 && selectedCustomerId === 0) {
      setSelectedCustomerId(custList[0].id || 0);
    }
    if (invList.length > 0 && !selectedInvoice) {
      setSelectedInvoice(invList[0]);
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : updated[index].quantity;
      const p = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
      updated[index].lineTotal = Math.round(q * p * 100) / 100;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productName: '',
        quantity: 5000,
        unitPrice: 8,
        lineTotal: 40000,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  const grandTotal = subtotal + taxAmount;

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === Number(selectedCustomerId));
    if (!cust) {
      alert('Please select a customer.');
      return;
    }
    if (items.some((i) => !i.productName.trim())) {
      alert('Please provide product names for all invoice items.');
      return;
    }

    try {
      const count = await db.invoices.count();
      const invoiceNumber = `${settings.invoicePrefix}${(count + 1).toString().padStart(4, '0')}`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Auto Double-Entry Accounting Posting:
      // Debit Accounts Receivable (1050) -> Rs. grandTotal
      // Credit Carton Packaging Revenue (4010) -> Rs. grandTotal
      const je = await AccountingEngine.postJournalEntry({
        date: todayStr,
        description: `Sales Invoice ${invoiceNumber} issued to ${cust.name}`,
        referenceType: 'invoice',
        debits: [{ accountCode: '1050', amount: grandTotal }],
        credits: [{ accountCode: '4010', amount: grandTotal }],
      });

      const newInv: Invoice = {
        invoiceNumber,
        customerId: cust.id!,
        customerName: cust.name,
        date: todayStr,
        dueDate,
        items,
        subtotal,
        discount: 0,
        taxRate: Number(taxRate) || 0,
        taxAmount,
        grandTotal,
        paidAmount: 0,
        balanceDue: grandTotal,
        status: 'issued',
        notes,
        journalEntryId: je.id,
        createdAt: new Date().toISOString(),
      };

      const id = await db.invoices.add(newInv);

      // Update customer balance (Debit increases customer's outstanding balance)
      await db.customers.update(cust.id!, {
        currentBalance: cust.currentBalance + grandTotal,
        updatedAt: new Date().toISOString(),
      });

      setIsModalOpen(false);
      await loadData();
      setSelectedInvoice({ ...newInv, id });
      alert(`Invoice ${invoiceNumber} created! Double-entry Journal Entry ${je.entryNumber} posted to General Ledger.`);
    } catch (err) {
      alert('Failed to save invoice: ' + err);
    }
  };

  const handleReverseInvoice = async (inv: Invoice) => {
    if (!inv.id) return;
    if (inv.status === 'reversed') {
      alert('This invoice has already been reversed.');
      return;
    }

    const reason = window.prompt('Enter reason for reversing this invoice (creates an auditable reversal journal entry):');
    if (!reason) return;

    try {
      if (inv.journalEntryId) {
        await AccountingEngine.reverseJournalEntry(inv.journalEntryId, reason);
      }

      // Mark invoice as reversed
      await db.invoices.update(inv.id, {
        status: 'reversed',
        balanceDue: 0,
        notes: `${inv.notes || ''} [REVERSED on ${new Date().toLocaleDateString('en-GB')}: ${reason}]`,
      });

      // Reduce customer balance
      const cust = await db.customers.get(inv.customerId);
      if (cust && cust.id) {
        await db.customers.update(cust.id, {
          currentBalance: Math.max(0, cust.currentBalance - inv.grandTotal),
        });
      }

      await loadData();
      alert(`Invoice ${inv.invoiceNumber} reversed with full audit trail!`);
    } catch (err) {
      alert('Failed to reverse invoice: ' + err);
    }
  };

  const filtered = invoices.filter(
    (i) =>
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Sales Invoices & Billing</h2>
          <p className="text-xs text-slate-500">Commercial invoices, tax calculations, PDF print and double-entry ledger integration</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Grid: Left List, Right Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2 max-h-[700px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No invoices created yet. Click "+ New Invoice" to bill a client.
            </div>
          ) : (
            filtered.map((inv) => {
              const isSelected = selectedInvoice?.id === inv.id;
              const isOverdue = inv.balanceDue > 0 && inv.dueDate < new Date().toISOString().split('T')[0];
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{inv.invoiceNumber}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            inv.status === 'reversed'
                              ? 'bg-slate-200 text-slate-700 line-through'
                              : inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status === 'reversed' ? 'REVERSED' : isOverdue ? 'OVERDUE' : inv.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[200px]">
                        {inv.customerName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        Rs. {inv.grandTotal.toLocaleString()}
                      </div>
                      <span className={`text-[10px] font-bold ${inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {inv.balanceDue > 0 ? `Due: Rs. ${inv.balanceDue.toLocaleString()}` : 'Settled'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Issued: {inv.date}</span>
                    <span>Due: {inv.dueDate}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Invoice Full Detail */}
        <div className="lg:col-span-7">
          {selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {selectedInvoice.invoiceNumber}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedInvoice.customerName}</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoice Date: {selectedInvoice.date} • Due Date: {selectedInvoice.dueDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedInvoice.balanceDue > 0 && selectedInvoice.status !== 'reversed' && onNavigateToPayment && (
                    <button
                      onClick={() => onNavigateToPayment(selectedInvoice.id!)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  <button
                    onClick={() => PDFGenerator.generateInvoicePDF(selectedInvoice, settings)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
                    title="Download Official PDF Invoice"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  {selectedInvoice.status !== 'reversed' && (
                    <button
                      onClick={() => handleReverseInvoice(selectedInvoice)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition cursor-pointer"
                      title="Reverse Invoice with Audit Trail"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Billed Products ({selectedInvoice.items.length})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/50 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <span className="text-[11px] text-slate-500">
                          {item.quantity.toLocaleString()} pcs @ Rs. {item.unitPrice} / pc
                        </span>
                      </div>
                      <div className="font-black text-slate-900">
                        Rs. {item.lineTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700">Audit Reference: </span>
                  <span className="text-slate-600">JE #{selectedInvoice.journalEntryId || 'Manual'}</span>
                  {selectedInvoice.notes && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Notes: {selectedInvoice.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1 text-right sm:w-52">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>Rs. {selectedInvoice.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedInvoice.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax ({selectedInvoice.taxRate}%):</span>
                      <span>Rs. {selectedInvoice.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>Rs. {selectedInvoice.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Paid to Date:</span>
                    <span>Rs. {selectedInvoice.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-rose-700 pt-1 border-t border-slate-200">
                    <span>Balance Due:</span>
                    <span>Rs. {selectedInvoice.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-400 text-xs">
              Select an invoice from the left to view breakdown, download PDF, or record customer payment.
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Create Sales Invoice</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Client *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || 'Client'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((it, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Line #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Product Description *</label>
                        <input
                          type="text"
                          required
                          value={it.productName}
                          onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                          placeholder="e.g. Cough Syrup 120ml Outer Box"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Quantity (pcs)</label>
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Unit Price (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-xs">Total Invoice Amount:</span>
                <span className="text-base font-black text-sky-400">Rs. {grandTotal.toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Post & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
