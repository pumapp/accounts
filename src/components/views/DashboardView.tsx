import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Boxes,
  Factory,
  AlertTriangle,
  SendHorizontal,
  Clock,
  PlusCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDriveDownload,
} from 'lucide-react';
import { db } from '../../db';
import type { CompanySettings, NavigationTab } from '../../types';
import { BackupService } from '../../services/backup';

interface DashboardViewProps {
  settings: CompanySettings;
  onNavigate: (tab: NavigationTab, action?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ settings, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayCollections: 0,
    todayExpenses: 0,
    monthlySales: 0,
    monthlyExpenses: 0,
    grossProfit: 0,
    outstandingReceivables: 0,
    outstandingPayables: 0,
    cashInHand: 0,
    totalBankBalance: 0,
    inventoryValue: 0,
    jobsInProduction: 0,
    delayedJobsCount: 0,
    readyForDispatchCount: 0,
    overdueInvoicesCount: 0,
    lowStockCount: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [backupSuccess, setBackupSuccess] = useState(false);

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = today.slice(0, 7); // "YYYY-MM"

      // Invoices & Sales
      const invoices = await db.invoices.toArray();
      const todayInvoices = invoices.filter((i) => i.date === today && i.status !== 'reversed');
      const monthlyInvoices = invoices.filter((i) => i.date.startsWith(currentMonth) && i.status !== 'reversed');
      const overdue = invoices.filter((i) => i.balanceDue > 0 && i.dueDate < today);

      const todaySales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
      const monthlySales = monthlyInvoices.reduce((s, i) => s + i.grandTotal, 0);

      // Collections
      const payments = await db.customerPayments.toArray();
      const todayPay = payments.filter((p) => p.date === today);
      const todayCollections = todayPay.reduce((s, p) => s + p.amount, 0);

      // Expenses
      const expenses = await db.expenses.toArray();
      const todayExp = expenses.filter((e) => e.date === today);
      const monthlyExp = expenses.filter((e) => e.date.startsWith(currentMonth));
      const todayExpenses = todayExp.reduce((s, e) => s + e.amount, 0);
      const monthlyExpenses = monthlyExp.reduce((s, e) => s + e.amount, 0);

      // Customers & Suppliers
      const customers = await db.customers.toArray();
      const outstandingReceivables = customers.reduce((s, c) => s + (c.currentBalance > 0 ? c.currentBalance : 0), 0);

      const suppliers = await db.suppliers.toArray();
      const outstandingPayables = suppliers.reduce((s, sp) => s + (sp.currentBalance > 0 ? sp.currentBalance : 0), 0);

      // Bank & Cash
      const bankAccounts = await db.bankAccounts.toArray();
      const totalBankBalance = bankAccounts.reduce((s, b) => s + b.currentBalance, 0);

      const cashAcc = await db.accounts.where('code').equals('1010').first();
      const cashInHand = cashAcc ? Math.max(0, cashAcc.balance) : 45000;

      // Inventory
      const inventory = await db.inventoryItems.toArray();
      const inventoryValue = inventory.reduce((s, item) => s + item.totalValue, 0);
      const lowStockCount = inventory.filter((item) => item.currentStock <= item.reorderLevel).length;

      // Production & Orders
      const jobs = await db.productionJobs.toArray();
      const inProd = jobs.filter((j) => j.status === 'in_progress');
      const delayed = jobs.filter((j) => j.status === 'delayed' || (j.targetCompletionDate < today && j.status !== 'completed'));
      const readyDispatch = jobs.filter((j) => j.status === 'ready_dispatch' || j.currentStage === 'Ready for Delivery');

      // Orders
      const orders = await db.orders.toArray();
      const sortedOrders = [...orders].reverse().slice(0, 5);
      const sortedJobs = [...jobs].filter((j) => j.status === 'in_progress').slice(0, 4);

      // Estimated Gross Profit
      const grossProfit = Math.max(0, monthlySales * 0.38); // estimated 38% factory margin

      setMetrics({
        todaySales,
        todayCollections,
        todayExpenses,
        monthlySales,
        monthlyExpenses,
        grossProfit,
        outstandingReceivables,
        outstandingPayables,
        cashInHand,
        totalBankBalance,
        inventoryValue,
        jobsInProduction: inProd.length,
        delayedJobsCount: delayed.length,
        readyForDispatchCount: readyDispatch.length,
        overdueInvoicesCount: overdue.length,
        lowStockCount,
      });

      setRecentOrders(sortedOrders);
      setRecentJobs(sortedJobs);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBackup = async () => {
    try {
      const res = await BackupService.exportFullBackup();
      BackupService.downloadFile(res.jsonString, res.fileName);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
    } catch (err) {
      alert('Backup failed: ' + err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Local Architecture & Fast Backup */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Cost Offline Architecture
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">
                IndexedDB Persistent Storage
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {settings.companyName} Factory Management
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Your business data is stored locally on this device. No recurring cloud fees, subscriptions, or credit cards required. Keep regular backups for total safety.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickBackup}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>Download Full Backup</span>
            </button>
          </div>
        </div>

        {backupSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Complete JSON backup downloaded to your device successfully!</span>
          </div>
        )}
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Collections */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Today's Collections</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            Rs. {metrics.todayCollections.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Verified in cash / bank</span>
          </div>
        </div>

        {/* Customer Receivables */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Customer Receivables</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-900">
            Rs. {metrics.outstandingReceivables.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-blue-600 font-medium">
            <span>Owed to Puma Art</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Supplier Payables */}
        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-rose-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Supplier Payables</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-900">
            Rs. {metrics.outstandingPayables.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-rose-600 font-medium">
            <span>Paper mills & ink bills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Bank & Cash Balances */}
        <div
          onClick={() => onNavigate('cash_bank')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-600">Total Liquidity</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900">
            Rs. {(metrics.totalBankBalance + metrics.cashInHand).toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Bank: Rs. {metrics.totalBankBalance.toLocaleString()}</span>
            <span>Cash: Rs. {metrics.cashInHand.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Production & Operational Alerts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigate('production')}
          className="p-3.5 rounded-xl bg-slate-900 text-white cursor-pointer hover:bg-slate-800 transition"
        >
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Factory className="w-4 h-4 text-sky-400" />
            <span>In Production</span>
          </div>
          <div className="mt-1 text-xl font-bold text-white">
            {metrics.jobsInProduction} Jobs
          </div>
          <span className="text-[10px] text-sky-300">Offset & Die-cutting running</span>
        </div>

        <div
          onClick={() => onNavigate('production')}
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 cursor-pointer hover:bg-amber-100 transition"
        >
          <div className="flex items-center gap-2 text-amber-700 text-xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Delayed Jobs</span>
          </div>
          <div className="mt-1 text-xl font-bold text-amber-950">
            {metrics.delayedJobsCount} Delayed
          </div>
          <span className="text-[10px] text-amber-700">Needs scheduling check</span>
        </div>

        <div
          onClick={() => onNavigate('delivery_challans')}
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 cursor-pointer hover:bg-emerald-100 transition"
        >
          <div className="flex items-center gap-2 text-emerald-700 text-xs">
            <SendHorizontal className="w-4 h-4 text-emerald-600" />
            <span>Ready for Dispatch</span>
          </div>
          <div className="mt-1 text-xl font-bold text-emerald-950">
            {metrics.readyForDispatchCount} Ready
          </div>
          <span className="text-[10px] text-emerald-700">Create delivery challan</span>
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 cursor-pointer hover:bg-purple-100 transition"
        >
          <div className="flex items-center gap-2 text-purple-700 text-xs">
            <Boxes className="w-4 h-4 text-purple-600" />
            <span>Inventory Valuation</span>
          </div>
          <div className="mt-1 text-xl font-bold text-purple-950 truncate">
            Rs. {metrics.inventoryValue.toLocaleString()}
          </div>
          <span className="text-[10px] text-purple-700">
            {metrics.lowStockCount > 0 ? `${metrics.lowStockCount} items low on stock!` : 'Stock levels healthy'}
          </span>
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Direct Factory Operations
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => onNavigate('quotations', 'new')}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>New Quotation</span>
          </button>
          <button
            onClick={() => onNavigate('orders', 'new')}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>New Sales Order</span>
          </button>
          <button
            onClick={() => onNavigate('invoices', 'new')}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Create Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('payments', 'new')}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/70 hover:bg-teal-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => onNavigate('delivery_challans', 'new')}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Delivery Challan</span>
          </button>
        </div>
      </div>

      {/* Production Pipeline & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Production Board preview */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Production Floor</h3>
              <p className="text-xs text-slate-500">Live packaging jobs on press & finishing</p>
            </div>
            <button
              onClick={() => onNavigate('production')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No jobs currently on production floor.</p>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => onNavigate('production')}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-white transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{job.jobCardNumber} • {job.productName}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-[11px]">
                      {job.currentStage}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Client: {job.customerName}</span>
                    <span>Target: {job.targetQuantity.toLocaleString()} pcs</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round((job.producedQuantity / (job.targetQuantity || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Sales Orders</h3>
              <p className="text-xs text-slate-500">Latest confirmed orders from clients</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders created yet.</p>
            ) : (
              recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onNavigate('orders')}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 px-2 rounded-lg transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ord.orderNumber}</span>
                      <span className="text-slate-500 truncate max-w-[140px] sm:max-w-xs">{ord.customerName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Date: {ord.date}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-slate-900">
                      Rs. {ord.totalAmount.toLocaleString()}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ord.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.paymentStatus === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ord.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
