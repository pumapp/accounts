import { db } from '../db';
import type { Account, JournalEntry, JournalLine } from '../types';

/**
 * Ensures currency amounts are rounded safely to 2 decimal places
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export interface PostJournalParams {
  date: string;
  description: string;
  referenceType?: 'invoice' | 'payment' | 'purchase' | 'supplier_payment' | 'expense' | 'payroll' | 'manual';
  referenceId?: number;
  debits: { accountCode: string; amount: number }[];
  credits: { accountCode: string; amount: number }[];
}

export class AccountingEngine {
  /**
   * Generates the next sequential Journal Entry number
   */
  static async getNextEntryNumber(): Promise<string> {
    const count = await db.journalEntries.count();
    const currentYear = new Date().getFullYear().toString().slice(-2);
    return `JE-${currentYear}-${(count + 1).toString().padStart(5, '0')}`;
  }

  /**
   * Posts a balanced double-entry journal entry to the General Ledger
   */
  static async postJournalEntry(params: PostJournalParams): Promise<JournalEntry> {
    const totalDebit = roundCurrency(params.debits.reduce((sum, d) => sum + d.amount, 0));
    const totalCredit = roundCurrency(params.credits.reduce((sum, c) => sum + c.amount, 0));

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry rule violation: Debits (Rs. ${totalDebit}) do not equal Credits (Rs. ${totalCredit})`);
    }

    if (totalDebit <= 0) {
      throw new Error('Journal entry total amount must be greater than zero.');
    }

    // Resolve accounts
    const resolvedDebits: JournalLine[] = [];
    for (const d of params.debits) {
      const acc = await db.accounts.where('code').equals(d.accountCode).first();
      if (!acc || !acc.id) {
        throw new Error(`Account code '${d.accountCode}' not found in Chart of Accounts`);
      }
      resolvedDebits.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: roundCurrency(d.amount),
      });

      // Update account running balance:
      // Asset & Expense increase with Debit
      // Liability, Equity & Income decrease with Debit
      const multiplier = acc.category === 'asset' || acc.category === 'expense' || acc.category === 'cogs' ? 1 : -1;
      await db.accounts.update(acc.id, {
        balance: roundCurrency(acc.balance + d.amount * multiplier),
      });
    }

    const resolvedCredits: JournalLine[] = [];
    for (const c of params.credits) {
      const acc = await db.accounts.where('code').equals(c.accountCode).first();
      if (!acc || !acc.id) {
        throw new Error(`Account code '${c.accountCode}' not found in Chart of Accounts`);
      }
      resolvedCredits.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: roundCurrency(c.amount),
      });

      // Update account running balance:
      // Asset & Expense decrease with Credit
      // Liability, Equity & Income increase with Credit
      const multiplier = acc.category === 'asset' || acc.category === 'expense' || acc.category === 'cogs' ? -1 : 1;
      await db.accounts.update(acc.id, {
        balance: roundCurrency(acc.balance + c.amount * multiplier),
      });
    }

    const entryNumber = await this.getNextEntryNumber();
    const entry: JournalEntry = {
      entryNumber,
      date: params.date,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      debits: resolvedDebits,
      credits: resolvedCredits,
      totalAmount: totalDebit,
      createdAt: new Date().toISOString(),
    };

    const id = await db.journalEntries.add(entry);
    return { ...entry, id };
  }

  /**
   * Reverses an existing posted journal entry with a full audit trail
   */
  static async reverseJournalEntry(entryId: number, reason: string): Promise<JournalEntry> {
    const original = await db.journalEntries.get(entryId);
    if (!original) throw new Error('Original journal entry not found');
    if (original.isReversed) throw new Error('This journal entry has already been reversed');

    // Create inverted entry
    const debits = original.credits.map((c) => ({ accountCode: c.accountCode, amount: c.amount }));
    const credits = original.debits.map((d) => ({ accountCode: d.accountCode, amount: d.amount }));

    const reversal = await this.postJournalEntry({
      date: new Date().toISOString().split('T')[0],
      description: `REVERSAL of ${original.entryNumber}: ${reason}`,
      referenceType: 'manual',
      referenceId: entryId,
      debits,
      credits,
    });

    // Mark original as reversed
    await db.journalEntries.update(entryId, { isReversed: true });
    return reversal;
  }

  /**
   * Generates a balanced Trial Balance
   */
  static async getTrialBalance(): Promise<{
    rows: { code: string; name: string; category: string; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  }> {
    const accounts = await db.accounts.toArray();
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = accounts.map((acc) => {
      let debit = 0;
      let credit = 0;

      // In double entry:
      // Asset & Expense normal balance is Debit
      // Liability, Equity, Income normal balance is Credit
      if (acc.category === 'asset' || acc.category === 'expense' || acc.category === 'cogs') {
        if (acc.balance >= 0) {
          debit = acc.balance;
        } else {
          credit = Math.abs(acc.balance);
        }
      } else {
        if (acc.balance >= 0) {
          credit = acc.balance;
        } else {
          debit = Math.abs(acc.balance);
        }
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        debit: roundCurrency(debit),
        credit: roundCurrency(credit),
      };
    });

    totalDebit = roundCurrency(totalDebit);
    totalCredit = roundCurrency(totalCredit);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05;

    return { rows, totalDebit, totalCredit, isBalanced };
  }

  /**
   * Generates Profit & Loss Statement
   */
  static async getProfitAndLoss(startDate?: string, endDate?: string): Promise<{
    incomeAccounts: { code: string; name: string; amount: number }[];
    totalIncome: number;
    cogsAccounts: { code: string; name: string; amount: number }[];
    totalCogs: number;
    grossProfit: number;
    expenseAccounts: { code: string; name: string; amount: number }[];
    totalExpenses: number;
    netProfit: number;
  }> {
    const accounts = await db.accounts.toArray();

    const incomeAccounts = accounts
      .filter((a) => a.category === 'income')
      .map((a) => ({ code: a.code, name: a.name, amount: roundCurrency(a.balance) }));
    const totalIncome = roundCurrency(incomeAccounts.reduce((sum, a) => sum + a.amount, 0));

    const cogsAccounts = accounts
      .filter((a) => a.category === 'cogs')
      .map((a) => ({ code: a.code, name: a.name, amount: roundCurrency(a.balance) }));
    const totalCogs = roundCurrency(cogsAccounts.reduce((sum, a) => sum + a.amount, 0));

    const grossProfit = roundCurrency(totalIncome - totalCogs);

    const expenseAccounts = accounts
      .filter((a) => a.category === 'expense')
      .map((a) => ({ code: a.code, name: a.name, amount: roundCurrency(a.balance) }));
    const totalExpenses = roundCurrency(expenseAccounts.reduce((sum, a) => sum + a.amount, 0));

    const netProfit = roundCurrency(grossProfit - totalExpenses);

    return {
      incomeAccounts,
      totalIncome,
      cogsAccounts,
      totalCogs,
      grossProfit,
      expenseAccounts,
      totalExpenses,
      netProfit,
    };
  }

  /**
   * Generates Balance Sheet
   */
  static async getBalanceSheet(): Promise<{
    assets: { code: string; name: string; subcategory: string; amount: number }[];
    totalAssets: number;
    liabilities: { code: string; name: string; subcategory: string; amount: number }[];
    totalLiabilities: number;
    equity: { code: string; name: string; subcategory: string; amount: number }[];
    retainedEarnings: number;
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  }> {
    const accounts = await db.accounts.toArray();
    const pnl = await this.getProfitAndLoss();

    const assets = accounts
      .filter((a) => a.category === 'asset')
      .map((a) => ({ code: a.code, name: a.name, subcategory: a.subcategory, amount: roundCurrency(a.balance) }));
    const totalAssets = roundCurrency(assets.reduce((sum, a) => sum + a.amount, 0));

    const liabilities = accounts
      .filter((a) => a.category === 'liability')
      .map((a) => ({ code: a.code, name: a.name, subcategory: a.subcategory, amount: roundCurrency(a.balance) }));
    const totalLiabilities = roundCurrency(liabilities.reduce((sum, a) => sum + a.amount, 0));

    const equity = accounts
      .filter((a) => a.category === 'equity')
      .map((a) => ({ code: a.code, name: a.name, subcategory: a.subcategory, amount: roundCurrency(a.balance) }));
    
    // Net profit transfers to retained earnings
    const baseEquity = equity.reduce((sum, a) => sum + a.amount, 0);
    const retainedEarnings = pnl.netProfit;
    const totalEquity = roundCurrency(baseEquity + retainedEarnings);

    const totalLiabilitiesAndEquity = roundCurrency(totalLiabilities + totalEquity);
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.05;

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      retainedEarnings,
      totalEquity,
      totalLiabilitiesAndEquity,
      isBalanced,
    };
  }
}
