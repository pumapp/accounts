import React, { useEffect, useState } from 'react';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { BankAccount, CompanySettings, JournalEntry } from '../../types';
import { AccountingEngine } from '../../services/accounting';

interface CashBankViewProps {
  settings: CompanySettings;
}

export const CashBankView: React.FC<CashBankViewProps> = ({ settings }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  // Transfer Form
  const [transferType, setTransferType] = useState<'cash_to_bank' | 'bank_to_cash'>('cash_to_bank');
  const [selectedBankId, setSelectedBankId] = useState<number>(1);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');

  // New Bank Account Form
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('Meezan Bank Ltd');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');
  const [branchName, setBranchName] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const banks = await db.bankAccounts.toArray();
    setBankAccounts(banks);
    if (banks.length > 0 && selectedBankId === 0) {
      setSelectedBankId(banks[0].id || 1);
    }

    const cashAcc = await db.accounts.where('code').equals('1010').first();
    setCashBalance(cashAcc ? cashAcc.balance : 0);

    // Load recent cash & bank journals
    const jList = await db.journalEntries.toArray();
    const cashBankJournals = jList
      .filter((j) => {
        const hasCashOrBank =
          j.debits.some((d) => d.accountCode.startsWith('101') || d.accountCode.startsWith('102')) ||
          j.credits.some((c) => c.accountCode.startsWith('101') || c.accountCode.startsWith('102'));
        return hasCashOrBank;
      })
      .reverse()
      .slice(0, 20);

    setJournals(cashBankJournals);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      alert('Transfer amount must be greater than zero.');
      return;
    }

    const bank = bankAccounts.find((b) => b.id === selectedBankId);
    if (!bank) {
      alert('Please select a valid bank account.');
      return;
    }

    try {
      if (transferType === 'cash_to_bank') {
        // Debit Bank (1020), Credit Cash in Hand (1010)
        // Rule: NOT income or expense! Pure asset reallocation
        await AccountingEngine.postJournalEntry({
          date: transferDate,
          description: `Internal Transfer: Cash deposited into ${bank.bankName} (${bank.accountNumber})`,
          referenceType: 'manual',
          debits: [{ accountCode: '1020', amount: amt }],
          credits: [{ accountCode: '1010', amount: amt }],
        });

        // Update bank account currentBalance
        await db.bankAccounts.update(bank.id!, {
          currentBalance: bank.currentBalance + amt,
        });
      } else {
        // Bank to Cash (Withdrawal): Debit Cash (1010), Credit Bank (1020)
        await AccountingEngine.postJournalEntry({
          date: transferDate,
          description: `Internal Transfer: Cash withdrawn from ${bank.bankName} into Cash Drawer`,
          referenceType: 'manual',
          debits: [{ accountCode: '1010', amount: amt }],
          credits: [{ accountCode: '1020', amount: amt }],
        });

        await db.bankAccounts.update(bank.id!, {
          currentBalance: Math.max(0, bank.currentBalance - amt),
        });
      }

      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferNotes('');
      await loadData();
      alert(`Transfer completed! Cash and bank accounts updated with zero income/expense misclassification.`);
    } catch (err) {
      alert('Transfer failed: ' + err);
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountNumber.trim()) {
      alert('Account name and number are required.');
      return;
    }

    try {
      await db.bankAccounts.add({
        accountName,
        bankName,
        accountNumber,
        iban,
        branchName,
        openingBalance: Number(openingBalance) || 0,
        currentBalance: Number(openingBalance) || 0,
      });

      setIsAddAccountModalOpen(false);
      setAccountName('');
      setAccountNumber('');
      setIban('');
      setBranchName('');
      setOpeningBalance(0);
      await loadData();
    } catch (err) {
      alert('Failed to add bank account: ' + err);
    }
  };

  const totalBankBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Cash & Bank Treasury</h2>
          <p className="text-xs text-slate-500">Meezan, HBL & factory cash drawer liquidity with strict asset-transfer isolation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Fund Transfer</span>
          </button>
          <button
            onClick={() => setIsAddAccountModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank</span>
          </button>
        </div>
      </div>

      {/* Primary Liquidity Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cash in Hand */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Cash in Hand (Drawer)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">
            Rs. {cashBalance.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            General Ledger Acct 1010 • Physical drawer
          </p>
        </div>

        {/* Bank Balances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Bank Balances</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">
            Rs. {totalBankBalance.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {bankAccounts.length} verified commercial bank accounts
          </p>
        </div>

        {/* Total Available Treasury */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-5 rounded-2xl text-white shadow-md border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-300">Total Liquid Funds</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">
            Rs. {(cashBalance + totalBankBalance).toLocaleString()}
          </div>
          <p className="text-[11px] text-sky-300 mt-1">
            Immediate liquid working capital for factory operations
          </p>
        </div>
      </div>

      {/* Bank Accounts List */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Commercial Bank Accounts ({bankAccounts.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{b.bankName}</h4>
                  <p className="text-[11px] text-slate-500">{b.accountName}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Balance</span>
                  <div className="font-black text-base text-slate-900">
                    Rs. {b.currentBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-[11px] text-slate-600 font-mono">
                <div>Acc #: {b.accountNumber}</div>
                {b.iban && <div>IBAN: {b.iban}</div>}
                {b.branchName && <div className="font-sans text-slate-500">Branch: {b.branchName}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cashbook / Bankbook Ledger Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Recent Cashbook & Bankbook Entries
          </h3>
          <span className="text-[11px] text-slate-400">Auditable Double-Entry Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Entry #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Debits</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No cash/bank journal transactions found.
                  </td>
                </tr>
              ) : (
                journals.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{j.entryNumber}</td>
                    <td className="py-3 px-4 text-slate-500">{j.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{j.description}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {j.debits.map((d) => `${d.accountName} (${d.accountCode})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {j.credits.map((c) => `${c.accountName} (${c.accountCode})`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      Rs. {j.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fund Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Transfer Funds (Cash & Bank)</h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <strong>Accounting Rule:</strong> Internal transfers between cash and bank are classified as pure asset shifts. They will NOT impact your profit or loss statement.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Transfer Direction *</label>
                <select
                  value={transferType}
                  onChange={(e) => setTransferType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-bold"
                >
                  <option value="cash_to_bank">Deposit Cash in Hand → Into Bank Account</option>
                  <option value="bank_to_cash">Withdraw from Bank → Into Cash in Hand Drawer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Account *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountName} (Balance: Rs. {b.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Transfer Amount (PKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50 font-black text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Transfer Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Add New Bank Account</h3>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBankAccount} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Meezan Bank Ltd"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Title *</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Puma Art Printers Operations"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 02010103456789"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="PK55MEZN000201..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Saggian Bypass Branch, Lahore"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
