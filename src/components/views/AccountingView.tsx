import React, { useEffect, useState } from 'react';
import {
  BookOpenCheck,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { db } from '../../db';
import type { Account, JournalEntry, CompanySettings } from '../../types';
import { AccountingEngine } from '../../services/accounting';

interface AccountingViewProps {
  settings: CompanySettings;
}

export const AccountingView: React.FC<AccountingViewProps> = ({ settings }) => {
  const [activeSubTab, setActiveSubTab] = useState<'trial_balance' | 'pnl' | 'balance_sheet' | 'journals' | 'chart_of_accounts'>('trial_balance');

  // Data states
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<any>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Journal Entry Modal
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalDesc, setJournalDesc] = useState('');
  const [debitAccountCode, setDebitAccountCode] = useState('1010');
  const [creditAccountCode, setCreditAccountCode] = useState('4010');
  const [journalAmount, setJournalAmount] = useState<number>(0);

  useEffect(() => {
    loadAccountingData();
  }, [activeSubTab]);

  const loadAccountingData = async () => {
    setLoading(true);
    try {
      const tb = await AccountingEngine.getTrialBalance();
      const pnl = await AccountingEngine.getProfitAndLoss();
      const bs = await AccountingEngine.getBalanceSheet();
      const jList = await db.journalEntries.toArray();
      const aList = await db.accounts.toArray();

      setTrialBalanceData(tb);
      setPnlData(pnl);
      setBalanceSheetData(bs);
      setJournals(jList.reverse());
      setAccounts(aList);
    } catch (err) {
      console.error('Accounting load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(journalAmount);
    if (!amt || amt <= 0) {
      alert('Amount must be greater than zero.');
      return;
    }
    if (debitAccountCode === creditAccountCode) {
      alert('Debit and Credit cannot be the same account.');
      return;
    }

    try {
      await AccountingEngine.postJournalEntry({
        date: journalDate,
        description: journalDesc || 'Manual Adjustment Entry',
        referenceType: 'manual',
        debits: [{ accountCode: debitAccountCode, amount: amt }],
        credits: [{ accountCode: creditAccountCode, amount: amt }],
      });

      setIsJournalModalOpen(false);
      setJournalDesc('');
      setJournalAmount(0);
      await loadAccountingData();
      alert('Manual Journal Entry posted and balances updated!');
    } catch (err) {
      alert('Failed to post journal entry: ' + err);
    }
  };

  const handleReverseJournal = async (entry: JournalEntry) => {
    if (!entry.id) return;
    if (entry.isReversed) {
      alert('This entry has already been reversed.');
      return;
    }

    const reason = window.prompt(`Reverse ${entry.entryNumber}? Enter reason:`);
    if (!reason) return;

    try {
      await AccountingEngine.reverseJournalEntry(entry.id, reason);
      await loadAccountingData();
      alert(`Reversal posted with full audit trail!`);
    } catch (err) {
      alert('Failed to reverse entry: ' + err);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Double-Entry Accounting Engine</h2>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Auditable Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Strict debit=credit balancing, General Ledger, Trial Balance, P&L, and Balance Sheet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Post Journal Entry</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
        <button
          onClick={() => setActiveSubTab('trial_balance')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            activeSubTab === 'trial_balance' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveSubTab('pnl')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            activeSubTab === 'pnl' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveSubTab('balance_sheet')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            activeSubTab === 'balance_sheet' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveSubTab('journals')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            activeSubTab === 'journals' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          General Journal Entries ({journals.length})
        </button>
        <button
          onClick={() => setActiveSubTab('chart_of_accounts')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            activeSubTab === 'chart_of_accounts' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Chart of Accounts ({accounts.length})
        </button>
      </div>

      {/* 1. Trial Balance */}
      {activeSubTab === 'trial_balance' && trialBalanceData && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Trial Balance as of {new Date().toLocaleDateString('en-GB')}</h3>
              <p className="text-xs text-slate-500">Every recorded debit matches credit in the general ledger</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Balanced (Debits = Credits)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Debit (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Credit (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalanceData.rows
                  .filter((r: any) => r.debit > 0 || r.credit > 0)
                  .map((r: any) => (
                    <tr key={r.code} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{r.code}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.name}</td>
                      <td className="py-2 px-3 uppercase text-[10px] text-slate-500">{r.category}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {r.debit > 0 ? `Rs. ${r.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">
                        {r.credit > 0 ? `Rs. ${r.credit.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-3">TOTAL BALANCES</td>
                  <td className="py-3 px-3 text-right text-sky-400">
                    Rs. {trialBalanceData.totalDebit.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-sky-400">
                    Rs. {trialBalanceData.totalCredit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Profit & Loss Statement */}
      {activeSubTab === 'pnl' && pnlData && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Statement of Profit & Loss</h3>
              <p className="text-xs text-slate-500">Printing revenue minus manufacturing COGS and operating overheads</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Net Profit</span>
              <div className={`text-xl font-black ${pnlData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                Rs. {pnlData.netProfit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Revenue */}
            <div>
              <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                <span>1. OPERATING REVENUE (INCOME)</span>
                <span>Rs. {pnlData.totalIncome.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 pt-1">
                {pnlData.incomeAccounts.map((a: any) => (
                  <div key={a.code} className="flex justify-between py-1.5 text-slate-700">
                    <span>{a.name} ({a.code})</span>
                    <span className="font-semibold">Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COGS */}
            <div>
              <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                <span>2. COST OF GOODS SOLD (COGS)</span>
                <span>Rs. {pnlData.totalCogs.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 pt-1">
                {pnlData.cogsAccounts.map((a: any) => (
                  <div key={a.code} className="flex justify-between py-1.5 text-slate-700">
                    <span>{a.name} ({a.code})</span>
                    <span className="font-semibold">Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gross Profit Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between font-black text-sm text-blue-900">
              <span>GROSS PROFIT</span>
              <span>Rs. {pnlData.grossProfit.toLocaleString()}</span>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                <span>3. FACTORY & ADMINISTRATIVE EXPENSES</span>
                <span>Rs. {pnlData.totalExpenses.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100 pt-1">
                {pnlData.expenseAccounts.map((a: any) => (
                  <div key={a.code} className="flex justify-between py-1.5 text-slate-700">
                    <span>{a.name} ({a.code})</span>
                    <span className="font-semibold">Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Net Profit Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between font-black text-base">
              <span>NET OPERATING PROFIT</span>
              <span className="text-emerald-400">Rs. {pnlData.netProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Balance Sheet */}
      {activeSubTab === 'balance_sheet' && balanceSheetData && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Balance Sheet</h3>
              <p className="text-xs text-slate-500">Assets = Liabilities + Owner Equity</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Statement In Balance</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 text-sm">
                <span>TOTAL ASSETS</span>
                <span className="text-blue-700">Rs. {balanceSheetData.totalAssets.toLocaleString()}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {balanceSheetData.assets.map((a: any) => (
                  <div key={a.code} className="flex justify-between py-1.5 text-slate-700">
                    <span>{a.name} ({a.code})</span>
                    <span className="font-semibold">Rs. {a.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 text-sm">
                  <span>LIABILITIES</span>
                  <span className="text-rose-700">Rs. {balanceSheetData.totalLiabilities.toLocaleString()}</span>
                </div>
                <div className="divide-y divide-slate-100 pt-1">
                  {balanceSheetData.liabilities.map((l: any) => (
                    <div key={l.code} className="flex justify-between py-1.5 text-slate-700">
                      <span>{l.name} ({l.code})</span>
                      <span className="font-semibold">Rs. {l.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 text-sm">
                  <span>OWNER EQUITY</span>
                  <span className="text-emerald-700">Rs. {balanceSheetData.totalEquity.toLocaleString()}</span>
                </div>
                <div className="divide-y divide-slate-100 pt-1">
                  {balanceSheetData.equity.map((e: any) => (
                    <div key={e.code} className="flex justify-between py-1.5 text-slate-700">
                      <span>{e.name} ({e.code})</span>
                      <span className="font-semibold">Rs. {e.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 text-emerald-800 font-bold">
                    <span>Retained Earnings (Current Period Profit)</span>
                    <span>Rs. {balanceSheetData.retainedEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between font-bold text-xs">
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span className="text-sky-300">Rs. {balanceSheetData.totalLiabilitiesAndEquity.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Journal Entries */}
      {activeSubTab === 'journals' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Entry #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Debit Side</th>
                  <th className="py-2.5 px-3">Credit Side</th>
                  <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                  <th className="py-2.5 px-3 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journals.map((j) => (
                  <tr key={j.id} className={`hover:bg-slate-50/80 ${j.isReversed ? 'opacity-50' : ''}`}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {j.entryNumber}
                      {j.isReversed && (
                        <span className="block text-[9px] text-rose-600 font-sans font-bold">REVERSED</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{j.date}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{j.description}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {j.debits.map((d) => (
                        <div key={d.accountCode}>
                          {d.accountName} ({d.accountCode}): Rs. {d.amount.toLocaleString()}
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {j.credits.map((c) => (
                        <div key={c.accountCode}>
                          {c.accountName} ({c.accountCode}): Rs. {c.amount.toLocaleString()}
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      Rs. {j.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!j.isReversed && (
                        <button
                          onClick={() => handleReverseJournal(j)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-amber-700 cursor-pointer"
                          title="Reverse this journal entry"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Chart of Accounts */}
      {activeSubTab === 'chart_of_accounts' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Account Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Subcategory</th>
                  <th className="py-2.5 px-4 text-right">Current Ledger Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{a.code}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{a.name}</td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-500">{a.category}</td>
                    <td className="py-2.5 px-4 text-slate-500">{a.subcategory}</td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900">
                      Rs. {a.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Manual Journal Modal */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">Post Double-Entry Journal Entry</h3>
              <button
                onClick={() => setIsJournalModalOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualJournal} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <strong>Balancing Enforced:</strong> The debit amount exactly matches the credit amount. All account balances will update automatically.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Narration *</label>
                <input
                  type="text"
                  required
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  placeholder="e.g. Month-end depreciation adjustment on offset press"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Debit Account (Increase Asset/Expense) *</label>
                  <select
                    value={debitAccountCode}
                    onChange={(e) => setDebitAccountCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Account (Increase Liab/Income) *</label>
                  <select
                    value={creditAccountCode}
                    onChange={(e) => setCreditAccountCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  >
                    {accounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={journalAmount}
                    onChange={(e) => setJournalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm"
                >
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
