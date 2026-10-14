import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Users,
  Boxes,
  Factory,
  CreditCard,
  FileText,
} from 'lucide-react';
import { db } from '../../db';
import type { CompanySettings } from '../../types';
import { BackupService } from '../../services/backup';

interface ReportsViewProps {
  settings: CompanySettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ settings }) => {
  const [reportType, setReportType] = useState<
    'sales' | 'expenses' | 'receivables' | 'payables' | 'inventory' | 'job_profit' | 'payroll'
  >('sales');

  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportRows, setReportRows] = useState<any[]>([]);
  const [totalMetric, setTotalMetric] = useState<number>(0);

  useEffect(() => {
    generateReport();
  }, [reportType, startDate, endDate]);

  const generateReport = async () => {
    if (reportType === 'sales') {
      const invoices = await db.invoices.toArray();
      const filtered = invoices.filter((i) => i.date >= startDate && i.date <= endDate && i.status !== 'reversed');
      setReportRows(filtered);
      setTotalMetric(filtered.reduce((s, i) => s + i.grandTotal, 0));
    } else if (reportType === 'expenses') {
      const exp = await db.expenses.toArray();
      const filtered = exp.filter((e) => e.date >= startDate && e.date <= endDate);
      setReportRows(filtered);
      setTotalMetric(filtered.reduce((s, e) => s + e.amount, 0));
    } else if (reportType === 'receivables') {
      const cust = await db.customers.toArray();
      const filtered = cust.filter((c) => c.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
      setReportRows(filtered);
      setTotalMetric(filtered.reduce((s, c) => s + c.currentBalance, 0));
    } else if (reportType === 'payables') {
      const sup = await db.suppliers.toArray();
      const filtered = sup.filter((s) => s.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
      setReportRows(filtered);
      setTotalMetric(filtered.reduce((s, sp) => s + sp.currentBalance, 0));
    } else if (reportType === 'inventory') {
      const inv = await db.inventoryItems.toArray();
      setReportRows(inv);
      setTotalMetric(inv.reduce((s, i) => s + i.totalValue, 0));
    } else if (reportType === 'job_profit') {
      const costs = await db.jobCostings.toArray();
      setReportRows(costs);
      setTotalMetric(costs.reduce((s, c) => s + c.actualGrossProfit, 0));
    } else if (reportType === 'payroll') {
      const pay = await db.payroll.toArray();
      setReportRows(pay);
      setTotalMetric(pay.reduce((s, p) => s + p.netPayable, 0));
    }
  };

  const handleExportCSV = () => {
    BackupService.exportTableToCSV(reportRows, `${reportType}_report`);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Executive Management Reports</h2>
          <p className="text-xs text-slate-500">Sales, expenses, receivables aging, inventory valuation & job margins with CSV export</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Type Pills */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 text-xs">
        <button
          onClick={() => setReportType('sales')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'sales' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sales Register
        </button>
        <button
          onClick={() => setReportType('expenses')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'expenses' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Expense Register
        </button>
        <button
          onClick={() => setReportType('receivables')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'receivables' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Customer Receivables
        </button>
        <button
          onClick={() => setReportType('payables')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'payables' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Supplier Payables
        </button>
        <button
          onClick={() => setReportType('inventory')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'inventory' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Inventory Valuation
        </button>
        <button
          onClick={() => setReportType('job_profit')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'job_profit' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Job Profitability
        </button>
        <button
          onClick={() => setReportType('payroll')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
            reportType === 'payroll' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Payroll Summary
        </button>
      </div>

      {/* Date Filter Bar & Metric Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50"
          />
          <span className="font-bold text-slate-700">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50"
          />
        </div>

        <div className="text-right">
          <span className="text-slate-500 text-[11px] font-bold uppercase">Report Aggregated Total: </span>
          <span className="text-base font-black text-blue-900">Rs. {totalMetric.toLocaleString()}</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {reportType === 'sales' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Grand Total (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.invoiceNumber}</td>
                    <td className="py-2 px-3 text-slate-500">{r.date}</td>
                    <td className="py-2 px-3 font-medium text-slate-800">{r.customerName}</td>
                    <td className="py-2 px-3 text-right text-slate-600">Rs. {r.subtotal.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">Rs. {r.grandTotal.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-rose-700 font-bold">Rs. {r.balanceDue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'expenses' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Expense</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Paid To</th>
                  <th className="py-2.5 px-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.expenseNumber}</td>
                    <td className="py-2 px-3 text-slate-500">{r.date}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.title}</td>
                    <td className="py-2 px-3 text-slate-600">{r.category}</td>
                    <td className="py-2 px-3 text-slate-600">{r.paidTo || 'N/A'}</td>
                    <td className="py-2 px-3 text-right font-black text-rose-700">Rs. {r.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'receivables' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Payment Terms</th>
                  <th className="py-2.5 px-3">Credit Limit</th>
                  <th className="py-2.5 px-3 text-right">Outstanding (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="py-2 px-3 text-slate-500">{r.company}</td>
                    <td className="py-2 px-3 text-slate-600">{r.paymentTerms}</td>
                    <td className="py-2 px-3 text-slate-600">Rs. {r.creditLimit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-black text-rose-700">Rs. {r.currentBalance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'job_profit' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Job Card #</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-right">Actual Cost</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.jobCardNumber}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.productName}</td>
                    <td className="py-2 px-3 text-slate-500">{r.customerName}</td>
                    <td className="py-2 px-3 text-right text-slate-700">Rs. {r.sellingPrice.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-slate-700">Rs. {r.actualTotalCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-800">Rs. {r.actualGrossProfit.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700">{r.profitMarginPercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'inventory' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Material Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total Valuation (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{r.itemCode}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="py-2 px-3 text-slate-500 uppercase text-[10px]">{r.category}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{r.currentStock.toLocaleString()} {r.unit}</td>
                    <td className="py-2 px-3 text-right text-slate-700">Rs. {r.unitCost}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-800">Rs. {r.totalValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
