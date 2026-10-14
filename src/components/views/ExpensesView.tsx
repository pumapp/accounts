import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Search,
  Plus,
  Landmark,
  Calendar,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { Expense, CompanySettings, BankAccount } from '../../types';
import { AccountingEngine } from '../../services/accounting';

interface ExpensesViewProps {
  settings: CompanySettings;
  initialAction?: string;
}

const EXPENSE_CATEGORIES = [
  { name: 'Electricity & Utilities', accountCode: '6020' },
  { name: 'Factory Rent', accountCode: '6010' },
  { name: 'Office Salaries & Admin Wages', accountCode: '6030' },
  { name: 'Printing Press Repairs & Maintenance', accountCode: '6040' },
  { name: 'Transportation, Loading & Fuel', accountCode: '6050' },
  { name: 'Packaging Straps, Tape & Shink Wrap', accountCode: '6060' },
  { name: 'Staff Tea, Mess & Welfare', accountCode: '6070' },
  { name: 'Marketing, Website & Samples', accountCode: '6080' },
  { name: 'Misc Expense', accountCode: '6090' },
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({ settings, initialAction }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(initialAction === 'new');

  // Form State
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'cheque'>('cash');
  const [selectedBankId, setSelectedBankId] = useState<number>(1);
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const expList = await db.expenses.toArray();
    const bankList = await db.bankAccounts.toArray();
    setExpenses(expList.reverse());
    setBankAccounts(bankList);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const expAmt = Number(amount);
    if (!title.trim()) {
      alert('Expense title is required.');
      return;
    }
    if (!expAmt || expAmt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      const count = await db.expenses.count();
      const expenseNumber = `EXP-26-${(count + 1).toString().padStart(4, '0')}`;

      // Find matching account code for category
      const catObj = EXPENSE_CATEGORIES.find((c) => c.name === category);
      const debitAccountCode = catObj ? catObj.accountCode : '6090';

      // Credit account: Cash (1010) or Bank (1020)
      const creditAccountCode = paymentMethod === 'cash' ? '1010' : '1020';

      // Auto Double-Entry:
      // Debit Expense Account -> Rs. expAmt
      // Credit Cash/Bank -> Rs. expAmt
      const je = await AccountingEngine.postJournalEntry({
        date,
        description: `Expense: ${title} (${category}) paid to ${paidTo || 'Vendor'}`,
        referenceType: 'expense',
        debits: [{ accountCode: debitAccountCode, amount: expAmt }],
        credits: [{ accountCode: creditAccountCode, amount: expAmt }],
      });

      const newExp: Expense = {
        expenseNumber,
        category: category as any,
        title,
        date,
        amount: expAmt,
        paymentMethod,
        bankAccountId: paymentMethod !== 'cash' ? selectedBankId : undefined,
        paidTo,
        description,
        journalEntryId: je.id,
        createdAt: new Date().toISOString(),
      };

      await db.expenses.add(newExp);

      // Deduct from bank if paid via bank
      if (paymentMethod !== 'cash') {
        const bank = await db.bankAccounts.get(selectedBankId);
        if (bank && bank.id) {
          await db.bankAccounts.update(bank.id, {
            currentBalance: Math.max(0, bank.currentBalance - expAmt),
          });
        }
      }

      setIsModalOpen(false);
      setTitle('');
      setAmount(0);
      setPaidTo('');
      setDescription('');
      await loadData();
      alert(`Expense ${expenseNumber} recorded! Journal Entry ${je.entryNumber} posted.`);
    } catch (err) {
      alert('Failed to record expense: ' + err);
    }
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.paidTo.toLowerCase().includes(search.toLowerCase()) ||
      e.expenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalExpenseFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Factory Operating Expenses</h2>
          <p className="text-xs text-slate-500">Rent, LESCO electricity, machine repairs, transport & administrative overheads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-right shrink-0">
          <span className="text-slate-500">Filtered Total: </span>
          <span className="font-black text-slate-900 text-sm">Rs. {totalExpenseFiltered.toLocaleString()}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Paid To</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No expense records found. Click "+ Add Expense" to record factory overhead.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{e.expenseNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{e.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{e.title}</div>
                      {e.description && (
                        <div className="text-[11px] text-slate-400 font-normal">{e.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{e.paidTo || 'N/A'}</td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {e.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-700 text-sm">
                      Rs. {e.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Add Factory Operating Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} (Acct #{c.accountCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Expense Title / Reason *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. LESCO Electricity Bill for Saggian Factory"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount (PKR) *</label>
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
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
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
                    <option value="cash">Cash in Hand (Drawer)</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Paid To (Vendor / Person)</label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. LESCO / Shell Pump"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              {paymentMethod !== 'cash' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Source Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountName} (Balance: Rs. {b.currentBalance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Bill Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
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
                  Post Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
