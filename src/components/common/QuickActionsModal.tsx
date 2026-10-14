import React from 'react';
import {
  X,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  ShoppingBag,
  SendHorizontal,
  Receipt,
  Factory,
  Boxes,
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (tab: NavigationTab, action?: string) => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      title: 'New Quotation',
      desc: 'Estimate paper, plate, die & finishing specs for client',
      icon: FileSpreadsheet,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
      tab: 'quotations' as NavigationTab,
      action: 'new',
    },
    {
      title: 'New Sales Order',
      desc: 'Book confirmed printing or packaging job',
      icon: ShoppingCart,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      tab: 'orders' as NavigationTab,
      action: 'new',
    },
    {
      title: 'Create Invoice',
      desc: 'Bill client with auto double-entry posting',
      icon: Receipt,
      color: 'bg-purple-500/10 text-purple-600 border-purple-200',
      tab: 'invoices' as NavigationTab,
      action: 'new',
    },
    {
      title: 'Record Payment',
      desc: 'Receipt cash or bank transfer from customer',
      icon: CreditCard,
      color: 'bg-teal-500/10 text-teal-600 border-teal-200',
      tab: 'payments' as NavigationTab,
      action: 'new',
    },
    {
      title: 'New Delivery Challan',
      desc: 'Generate dispatch note with driver & vehicle #',
      icon: SendHorizontal,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      tab: 'delivery_challans' as NavigationTab,
      action: 'new',
    },
    {
      title: 'Add Factory Expense',
      desc: 'Record LESCO bill, rent, machine repair or fuel',
      icon: Wallet,
      color: 'bg-rose-500/10 text-rose-600 border-rose-200',
      tab: 'expenses' as NavigationTab,
      action: 'new',
    },
    {
      title: 'New Customer',
      desc: 'Add pharmaceutical, food or retail brand',
      icon: Users,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
      tab: 'customers' as NavigationTab,
      action: 'new',
    },
    {
      title: 'Receive Inventory',
      desc: 'Purchase paper sheets, CTP plates or inks',
      icon: Boxes,
      color: 'bg-sky-500/10 text-sky-600 border-sky-200',
      tab: 'inventory' as NavigationTab,
      action: 'new',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold">Quick Factory Action</h3>
            <p className="text-[11px] text-slate-400">Launch standard production or accounting transactions</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded-lg p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  onSelectAction(act.tab, act.action);
                  onClose();
                }}
                className="flex items-start gap-3 p-3 text-left rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md bg-white hover:bg-slate-50 transition cursor-pointer group"
              >
                <div className={`p-2.5 rounded-xl border ${act.color} shrink-0 group-hover:scale-105 transition`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {act.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {act.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
