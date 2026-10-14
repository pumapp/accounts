import React from 'react';
import {
  Sparkles,
  PlusCircle,
  Database,
  Menu,
  ShieldCheck,
  Building2,
  Printer,
} from 'lucide-react';
import type { CompanySettings, NavigationTab } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HeaderProps {
  settings: CompanySettings;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenAssistant: () => void;
  onOpenQuickActions: () => void;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeTab,
  onSelectTab,
  onOpenAssistant,
  onOpenQuickActions,
  onToggleMobileMenu,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-hidden"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center shadow-md border border-sky-400/30 group-hover:scale-105 transition">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-sky-300 transition">
                  {settings.companyName}
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 border border-sky-700/60 text-sky-300">
                  ERP & ACCOUNTS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block truncate max-w-xs">
                {settings.location} • {settings.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Local Intelligence Assistant */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700/50 text-indigo-200 text-xs font-medium transition cursor-pointer shadow-xs"
            title="Ask questions about sales, receivables, overdue invoices, stock without any API key"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden md:inline">Factory Assistant</span>
            <span className="md:hidden text-[11px]">Ask</span>
          </button>

          {/* Quick Action + */}
          <button
            onClick={onOpenQuickActions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {/* Backup Button / Quick Alert */}
          <button
            onClick={() => onSelectTab('backups')}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="Download complete JSON backup to your computer or phone"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup</span>
          </button>

          {/* PWA Install */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
