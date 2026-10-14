import React from 'react';
import {
  LayoutDashboard,
  Users,
  Truck,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  CreditCard,
  Wallet,
  Landmark,
  Boxes,
  ShoppingBag,
  Factory,
  Calculator,
  SendHorizontal,
  UserCheck,
  BadgeDollarSign,
  BookOpenCheck,
  BarChart3,
  HardDriveDownload,
  Settings,
  X,
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavSection {
  title: string;
  items: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const NAV_GROUPS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'SALES & COMMERCIAL',
    items: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
      { id: 'orders', label: 'Sales Orders', icon: ShoppingCart },
      { id: 'invoices', label: 'Invoices', icon: Receipt },
      { id: 'payments', label: 'Customer Payments', icon: CreditCard },
      { id: 'delivery_challans', label: 'Delivery Challans', icon: SendHorizontal },
    ],
  },
  {
    title: 'PRODUCTION & FACTORY',
    items: [
      { id: 'production', label: 'Production Tracking', icon: Factory },
      { id: 'job_costing', label: 'Job Costing', icon: Calculator },
      { id: 'inventory', label: 'Inventory & Materials', icon: Boxes },
    ],
  },
  {
    title: 'SUPPLY & PURCHASES',
    items: [
      { id: 'suppliers', label: 'Suppliers', icon: Truck },
      { id: 'purchases', label: 'Purchases (PO & Bills)', icon: ShoppingBag },
    ],
  },
  {
    title: 'FINANCE & ACCOUNTS',
    items: [
      { id: 'expenses', label: 'Expenses', icon: Wallet },
      { id: 'cash_bank', label: 'Cash & Bank', icon: Landmark },
      { id: 'accounting', label: 'Accounting (Double-Entry)', icon: BookOpenCheck },
      { id: 'reports', label: 'Reports & Statements', icon: BarChart3 },
    ],
  },
  {
    title: 'HUMAN RESOURCES & ADMIN',
    items: [
      { id: 'employees', label: 'Employees', icon: UserCheck },
      { id: 'payroll', label: 'Payroll & Payslips', icon: BadgeDollarSign },
      { id: 'backups', label: 'Backups & Portability', icon: HardDriveDownload },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const content = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 w-64 select-none">
      {/* Mobile close bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 text-white">
        <span className="font-bold text-sm tracking-wide">Puma ERP Menu</span>
        <button
          onClick={onCloseMobile}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links Scrollable */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs font-medium">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom local storage badge */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Zero-Cost Local DB</span>
        </div>
        <p className="text-[10px] text-slate-500">IndexedDB Active • No Cloud Fee</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile drawer modal */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
