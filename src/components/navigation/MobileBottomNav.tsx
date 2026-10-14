import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Factory,
  Receipt,
  Menu,
} from 'lucide-react';
import type { NavigationTab } from '../../types';

interface MobileBottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
}) => {
  const tabs: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                isActive ? 'text-blue-400 font-bold' : 'hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More Menu */}
        <button
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center gap-1 hover:text-slate-200 transition"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] leading-tight">All (20)</span>
        </button>
      </div>
    </nav>
  );
};
