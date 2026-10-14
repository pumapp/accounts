import { db } from '../db';
import type { Customer, Invoice, InventoryItem, ProductionJob } from '../types';

export interface AssistantAnswer {
  query: string;
  category: string;
  summary: string;
  details: { label: string; value: string; secondary?: string; highlight?: boolean }[];
  actionTab?: string;
}

export class LocalBusinessAssistant {
  /**
   * Deterministic questions answered directly from local IndexedDB
   */
  static getSuggestedQuestions(): string[] {
    return [
      'How much money did we collect today?',
      'Which customers owe us the most?',
      'Which invoices are overdue?',
      'Which jobs have the highest estimated profit?',
      'Which materials need reordering?',
      'How much do we owe suppliers?',
      'Which orders or production jobs are delayed?',
      'What are our total cash and bank balances?',
      'What is our total inventory valuation?',
    ];
  }

  static async answerQuery(rawQuery: string): Promise<AssistantAnswer> {
    const q = rawQuery.toLowerCase().trim();

    // 1. Collections today
    if (q.includes('collect') || q.includes('collection') || q.includes('received today')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const payments = await db.customerPayments.toArray();
      const todayPayments = payments.filter((p) => p.date === todayStr);
      const total = todayPayments.reduce((s, p) => s + p.amount, 0);

      return {
        query: rawQuery,
        category: 'Cash Collections',
        summary: `Today's verified customer collections total Rs. ${total.toLocaleString()} from ${todayPayments.length} recorded receipt(s).`,
        details: todayPayments.length
          ? todayPayments.map((p) => ({
              label: p.customerName,
              value: `Rs. ${p.amount.toLocaleString()}`,
              secondary: `Ref: ${p.referenceNumber || 'N/A'} via ${p.paymentMethod.replace('_', ' ')}`,
            }))
          : [{ label: 'No collections recorded for today yet', value: 'Rs. 0' }],
        actionTab: 'payments',
      };
    }

    // 2. Customers who owe the most (Receivables)
    if (q.includes('customer') && (q.includes('owe') || q.includes('receivable') || q.includes('balance') || q.includes('debt'))) {
      const customers = await db.customers.toArray();
      const debtors = customers.filter((c) => c.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
      const totalReceivable = debtors.reduce((s, c) => s + c.currentBalance, 0);

      return {
        query: rawQuery,
        category: 'Customer Receivables',
        summary: `Total outstanding customer receivables are Rs. ${totalReceivable.toLocaleString()} across ${debtors.length} customer account(s).`,
        details: debtors.slice(0, 5).map((c) => ({
          label: c.name,
          value: `Rs. ${c.currentBalance.toLocaleString()}`,
          secondary: `Company: ${c.company || 'Direct'} | Terms: ${c.paymentTerms}`,
          highlight: c.currentBalance > 200000,
        })),
        actionTab: 'customers',
      };
    }

    // 3. Overdue invoices
    if (q.includes('overdue') || q.includes('unpaid invoice')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const invoices = await db.invoices.toArray();
      const overdue = invoices.filter((i) => i.balanceDue > 0 && i.dueDate < todayStr);
      const totalOverdue = overdue.reduce((s, i) => s + i.balanceDue, 0);

      return {
        query: rawQuery,
        category: 'Overdue Invoices',
        summary: `There are ${overdue.length} overdue invoice(s) with total delinquent balance of Rs. ${totalOverdue.toLocaleString()}.`,
        details: overdue.length
          ? overdue.map((i) => ({
              label: `${i.invoiceNumber} - ${i.customerName}`,
              value: `Rs. ${i.balanceDue.toLocaleString()}`,
              secondary: `Due Date: ${i.dueDate} (Originally Rs. ${i.grandTotal.toLocaleString()})`,
              highlight: true,
            }))
          : [{ label: 'All customer invoices are within due dates', value: '0 Overdue' }],
        actionTab: 'invoices',
      };
    }

    // 4. Job profitability / Highest profit
    if (q.includes('profit') || q.includes('margin') || q.includes('costing')) {
      const costings = await db.jobCostings.toArray();
      const sorted = [...costings].sort((a, b) => b.actualGrossProfit - a.actualGrossProfit);

      return {
        query: rawQuery,
        category: 'Job Profitability',
        summary: `Calculated from ${costings.length} job costing records. Highest gross profit jobs:`,
        details: sorted.slice(0, 5).map((c) => ({
          label: `${c.productName} (${c.jobCardNumber || 'Job'})`,
          value: `Gross Profit: Rs. ${c.actualGrossProfit.toLocaleString()}`,
          secondary: `Margin: ${c.profitMarginPercent.toFixed(1)}% | Revenue: Rs. ${c.sellingPrice.toLocaleString()} | Actual Cost: Rs. ${c.actualTotalCost.toLocaleString()}`,
          highlight: c.profitMarginPercent > 35,
        })),
        actionTab: 'job_costing',
      };
    }

    // 5. Materials reorder / Low stock
    if (q.includes('reorder') || q.includes('material') || q.includes('stock') || q.includes('inventory')) {
      const items = await db.inventoryItems.toArray();
      const lowStock = items.filter((i) => i.currentStock <= i.reorderLevel);
      const totalVal = items.reduce((s, i) => s + i.totalValue, 0);

      return {
        query: rawQuery,
        category: 'Inventory Reorder Status',
        summary: `${lowStock.length} item(s) have fallen below safety reorder threshold. Total inventory valuation is Rs. ${totalVal.toLocaleString()}.`,
        details: lowStock.length
          ? lowStock.map((i) => ({
              label: `${i.name} (${i.itemCode})`,
              value: `Stock: ${i.currentStock} ${i.unit}`,
              secondary: `Reorder Level: ${i.reorderLevel} ${i.unit} | Location: ${i.location || 'Warehouse'}`,
              highlight: true,
            }))
          : [{ label: 'All inventory stock levels are currently above reorder limits', value: 'Healthy' }],
        actionTab: 'inventory',
      };
    }

    // 6. Supplier payables
    if (q.includes('supplier') || q.includes('we owe') || q.includes('payable')) {
      const suppliers = await db.suppliers.toArray();
      const payables = suppliers.filter((s) => s.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
      const totalPayable = payables.reduce((s, p) => s + p.currentBalance, 0);

      return {
        query: rawQuery,
        category: 'Supplier Payables',
        summary: `Total outstanding payable to paper mills & chemical suppliers is Rs. ${totalPayable.toLocaleString()}.`,
        details: payables.map((s) => ({
          label: s.name,
          value: `Rs. ${s.currentBalance.toLocaleString()}`,
          secondary: `Contact: ${s.contactPerson} | Terms: ${s.paymentTerms}`,
          highlight: s.currentBalance > 100000,
        })),
        actionTab: 'suppliers',
      };
    }

    // 7. Delayed production jobs
    if (q.includes('delay') || q.includes('production') || q.includes('job status')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const jobs = await db.productionJobs.toArray();
      const delayed = jobs.filter((j) => j.status === 'delayed' || (j.targetCompletionDate < todayStr && j.status !== 'completed'));

      return {
        query: rawQuery,
        category: 'Production Timelines',
        summary: `Found ${delayed.length} delayed packaging job(s) requiring management attention.`,
        details: delayed.length
          ? delayed.map((j) => ({
              label: `${j.jobCardNumber} - ${j.productName}`,
              value: `Target: ${j.targetCompletionDate}`,
              secondary: `Current Stage: ${j.currentStage} | Responsible: ${j.responsiblePerson} | Priority: ${j.priority}`,
              highlight: true,
            }))
          : [{ label: 'All active printing jobs are running on schedule', value: 'On Track' }],
        actionTab: 'production',
      };
    }

    // 8. Cash & Bank balances
    if (q.includes('bank') || q.includes('cash in hand') || q.includes('liquidity')) {
      const banks = await db.bankAccounts.toArray();
      const totalBank = banks.reduce((s, b) => s + b.currentBalance, 0);

      return {
        query: rawQuery,
        category: 'Cash & Bank Position',
        summary: `Total available liquidity across all accounts is Rs. ${totalBank.toLocaleString()}.`,
        details: banks.map((b) => ({
          label: `${b.bankName} - ${b.accountName}`,
          value: `Rs. ${b.currentBalance.toLocaleString()}`,
          secondary: `Acc #: ${b.accountNumber} | Branch: ${b.branchName || 'Lahore'}`,
        })),
        actionTab: 'cash_bank',
      };
    }

    // Default fallback
    return {
      query: rawQuery,
      category: 'Local Search',
      summary: `Deterministic local search result for "${rawQuery}". Choose from the standard factory financial and production inquiries below for exact calculated metrics.`,
      details: [
        { label: 'Try asking:', value: '"Which customers owe us the most?"' },
        { label: 'Try asking:', value: '"Which materials need reordering?"' },
        { label: 'Try asking:', value: '"How much money did we collect today?"' },
      ],
      actionTab: 'dashboard',
    };
  }
}
