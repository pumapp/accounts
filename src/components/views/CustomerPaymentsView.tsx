import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Landmark,
  Wallet,
  Receipt,
  CheckCircle2,
  Trash2,
  X,
  Share2,
} from 'lucide-react';
import { db } from '../../db';
import type { CustomerPayment, CompanySettings, Customer, Invoice, BankAccount } from '../../types';
import { AccountingEngine } from '../../services/accounting';

interface CustomerPaymentsViewProps {
  settings: CompanySettings;
  initialAction?: string;
  initialInvoiceId?: number;
}

export const CustomerPaymentsView: React.FC<CustomerPaymentsViewProps> = ({
  settings,
  initialAction,
  initialInvoiceId,
}) => {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new' || !!initialInvoiceId);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(initialInvoiceId || 0);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque'>('bank_transfer');
  const [selectedBankId, setSelectedBankId] = useState<number>(1);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [initialInvoiceId]);

  const loadData = async () => {
    const pList = await db.customerPayments.toArray();
    const cList = await db.customers.toArray();
    const iList = await db.invoices.toArray();
    const bList = await db.bankAccounts.toArray();

    setPayments(pList.reverse());
    setCustomers(cList);
    setInvoices(iList.filter((i) => i.balanceDue > 0 && i.status !== 'reversed'));
    setBankAccounts(bList);

    if (initialInvoiceId) {
      const inv = iList.find((i) => i.id === initialInvoiceId);
      if (inv) {
        setSelectedInvoiceId(inv.id!);
        setSelectedCustomerId(inv.customerId);
        setAmount(inv.balanceDue);
      }
    } else if (cList.length > 0 && selectedCustomerId === 0) {
      setSelectedCustomerId(cList[0].id || 0);
    }
  };

  const handleCustomerChange = (custId: number) => {
    setSelectedCustomerId(custId);
    // Find customer's pending invoices
    const custInvs = invoices.filter((i) => i.customerId === custId);
    if (custInvs.length > 0) {
      setSelectedInvoiceId(custInvs[0].id!);
      setAmount(custInvs[0].balanceDue);
    } else {
      setSelectedInvoiceId(0);
      setAmount(0);
    }
  };

  const handleInvoiceChange = (invId: number) => {
    setSelectedInvoiceId(invId);
    const inv = invoices.find((i) => i.id === invId);
    if (inv) {
      setAmount(inv.balanceDue);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) {
      alert('Please select a customer.');
      return;
    }
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      const count = await db.customerPayments.count();
      const paymentNumber = `PAY-26-${(count + 1).toString().padStart(4, '0')}`;

      // Determine Debit Account: Cash in Hand (1010) or Bank (1020)
      const debitAccountCode = paymentMethod === 'cash' ? '1010' : '1020';

      // Auto Double-Entry:
      // Debit Cash/Bank -> Rs. payAmt
      // Credit Accounts Receivable (1050) -> Rs. payAmt
      const je = await AccountingEngine.postJournalEntry({
        date,
        description: `Customer payment received from ${cust.name} (${paymentMethod})`,
        referenceType: 'payment',
        debits: [{ accountCode: debitAccountCode, amount: payAmt }],
        credits: [{ accountCode: '1050', amount: payAmt }],
      });

      const inv = invoices.find((i) => i.id === selectedInvoiceId);

      const newPay: CustomerPayment = {
        paymentNumber,
        invoiceId: inv ? inv.id : undefined,
        invoiceNumber: inv ? inv.invoiceNumber : undefined,
        customerId: cust.id!,
        customerName: cust.name,
        date,
        amount: payAmt,
        paymentMethod,
        referenceNumber,
        bankAccountId: paymentMethod !== 'cash' ? selectedBankId : undefined,
        notes,
        journalEntryId: je.id,
        createdAt: new Date().toISOString(),
      };

      await db.customerPayments.add(newPay);

      // Reduce Customer's outstanding balance
      await db.customers.update(cust.id!, {
        currentBalance: Math.max(0, cust.currentBalance - payAmt),
        updatedAt: new Date().toISOString(),
      });

      // Update invoice if linked
      if (inv && inv.id) {
        const newPaid = inv.paidAmount + payAmt;
        const newBal = Math.max(0, inv.grandTotal - newPaid);
        await db.invoices.update(inv.id, {
          paidAmount: newPaid,
          balanceDue: newBal,
          status: newBal <= 0 ? 'paid' : 'partial',
        });
      }

      // Update Bank Account balance if paid via bank
      if (paymentMethod !== 'cash') {
        const bank = await db.bankAccounts.get(selectedBankId);
        if (bank && bank.id) {
          await db.bankAccounts.update(bank.id, {
            currentBalance: bank.currentBalance + payAmt,
          });
        }
      }

      setIsModalOpen(false);
      await loadData();
      alert(`Payment receipt ${paymentNumber} recorded! Customer balance updated & Journal Entry ${je.entryNumber} posted.`);
    } catch (err) {
      alert('Failed to record payment: ' + err);
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Customer Collections & Receipts</h2>
          <p className="text-xs text-slate-500">Bank deposits, cheques, cash receipts and auto double-entry accounts receivable settlement</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt #, customer, cheque..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Payment Receipts List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice Ref</th>
                <th className="py-3 px-4">Method & Transaction Ref</th>
                <th className="py-3 px-4 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No payment receipts found. Click "+ Record Payment" to receipt customer collections.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.paymentNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{p.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.customerName}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {p.invoiceNumber ? (
                        <span className="font-bold text-blue-600">{p.invoiceNumber}</span>
                      ) : (
                        <span className="text-slate-400">General Advance</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="capitalize font-bold text-slate-800">
                          {p.paymentMethod.replace('_', ' ')}
                        </span>
                        {p.referenceNumber && (
                          <span className="text-[11px] text-slate-400 font-mono">({p.referenceNumber})</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      Rs. {p.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Record Customer Payment</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Client *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Outstanding: Rs. {c.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Apply to Invoice (Optional)</label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  <option value={0}>General Advance / On Account Payment</option>
                  {invoices
                    .filter((i) => i.customerId === selectedCustomerId)
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - Due: Rs. {inv.balanceDue.toLocaleString()} (Total: Rs. {inv.grandTotal.toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Amount (PKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-black text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="bank_transfer">Online Bank Transfer</option>
                    <option value="cheque">Cheque Deposit</option>
                    <option value="cash">Cash in Hand (Drawer)</option>
                  </select>
                </div>

                {paymentMethod !== 'cash' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Deposit To Bank Account</label>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cash Drawer Location</label>
                    <input
                      type="text"
                      disabled
                      value="Factory Office Cash Drawer (1010)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. Meezan Ref 094827 / HBL Cheque # 1489201"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Advance for Cough Syrup cartons run"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
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
                  Record & Post Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
