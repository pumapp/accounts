import React, { useEffect, useState } from 'react';
import type { NavigationTab, CompanySettings } from './types';
import { db, initializeDatabase, seedDemoData, DEFAULT_COMPANY_SETTINGS } from './db';

// Navigation Components
import { Header } from './components/navigation/Header';
import { Sidebar } from './components/navigation/Sidebar';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';

// Common Modals & Helpers
import { AIAssistantModal } from './components/common/AIAssistantModal';
import { QuickActionsModal } from './components/common/QuickActionsModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// 20 Core Factory & Accounting Views
import { DashboardView } from './components/views/DashboardView';
import { CustomersView } from './components/views/CustomersView';
import { SuppliersView } from './components/views/SuppliersView';
import { QuotationsView } from './components/views/QuotationsView';
import { SalesOrdersView } from './components/views/SalesOrdersView';
import { InvoicesView } from './components/views/InvoicesView';
import { CustomerPaymentsView } from './components/views/CustomerPaymentsView';
import { ExpensesView } from './components/views/ExpensesView';
import { CashBankView } from './components/views/CashBankView';
import { InventoryView } from './components/views/InventoryView';
import { PurchasesView } from './components/views/PurchasesView';
import { ProductionView } from './components/views/ProductionView';
import { JobCostingView } from './components/views/JobCostingView';
import { DeliveryChallansView } from './components/views/DeliveryChallansView';
import { EmployeesView } from './components/views/EmployeesView';
import { PayrollView } from './components/views/PayrollView';
import { AccountingView } from './components/views/AccountingView';
import { ReportsView } from './components/views/ReportsView';
import { BackupsView } from './components/views/BackupsView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [tabAction, setTabAction] = useState<string | undefined>(undefined);
  const [targetRecordId, setTargetRecordId] = useState<number | undefined>(undefined);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        await initializeDatabase();
        await seedDemoData();
        const storedSettings = await db.settings.get(1);
        if (storedSettings) {
          setSettings(storedSettings);
        }
      } catch (err) {
        console.error('Database initialization error:', err);
      } finally {
        setIsDbReady(true);
      }
    }
    boot();
  }, []);

  const handleNavigate = (tab: NavigationTab, action?: string, recordId?: number) => {
    setActiveTab(tab);
    setTabAction(action);
    setTargetRecordId(recordId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-lg border border-blue-400/40 animate-pulse mb-3">
          P
        </div>
        <h1 className="text-base font-bold tracking-tight">Puma Art Printers ERP</h1>
        <p className="text-xs text-slate-400 mt-1">Initializing local IndexedDB...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenQuickActions={() => setIsQuickActionsOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body with Desktop Sidebar and Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar (Desktop + Mobile Slide Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => handleNavigate(tab)}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* View Content Area */}
        <main className="flex-1 p-3 sm:p-6 pb-20 md:pb-8 max-w-full overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView settings={settings} onNavigate={handleNavigate} />
          )}

          {activeTab === 'customers' && (
            <CustomersView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'quotations' && (
            <QuotationsView
              settings={settings}
              initialAction={tabAction}
              onNavigateToOrder={(orderId) => handleNavigate('orders', undefined, orderId)}
            />
          )}

          {activeTab === 'orders' && (
            <SalesOrdersView
              settings={settings}
              initialAction={tabAction}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              settings={settings}
              initialAction={tabAction}
              onNavigateToPayment={(invId) => handleNavigate('payments', 'new', invId)}
            />
          )}

          {activeTab === 'payments' && (
            <CustomerPaymentsView
              settings={settings}
              initialAction={tabAction}
              initialInvoiceId={targetRecordId}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'cash_bank' && (
            <CashBankView settings={settings} />
          )}

          {activeTab === 'inventory' && (
            <InventoryView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'production' && (
            <ProductionView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'job_costing' && (
            <JobCostingView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'delivery_challans' && (
            <DeliveryChallansView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'employees' && (
            <EmployeesView settings={settings} initialAction={tabAction} />
          )}

          {activeTab === 'payroll' && (
            <PayrollView settings={settings} />
          )}

          {activeTab === 'accounting' && (
            <AccountingView settings={settings} />
          )}

          {activeTab === 'reports' && (
            <ReportsView settings={settings} />
          )}

          {activeTab === 'backups' && (
            <BackupsView
              settings={settings}
              onRefreshData={async () => {
                const s = await db.settings.get(1);
                if (s) setSettings(s);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Local AI / Deterministic Assistant Modal */}
      <AIAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onNavigate={(tab) => handleNavigate(tab)}
      />

      {/* Quick Actions Modal */}
      <QuickActionsModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onSelectAction={(tab, action) => handleNavigate(tab, action)}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />
    </div>
  );
}
