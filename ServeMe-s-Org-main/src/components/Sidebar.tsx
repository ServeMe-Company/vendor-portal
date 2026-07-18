import React from 'react';
import { LayoutDashboard, UtensilsCrossed, BarChart3, QrCode, HelpCircle, Warehouse } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catalog', icon: UtensilsCrossed },
    { id: 'inventory', label: 'Inventory', icon: Warehouse },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[260px] z-40 bg-surface border-r border-outline-variant pt-4 pb-4 select-none">
      <div className="px-6 pt-6 pb-8">
        <span className="text-2xl font-bold text-primary-container tracking-tight font-display-lg">
          ServeMe
        </span>
        <p className="text-[11px] text-on-surface-variant uppercase tracking-wider mt-1 font-label-sm">
          Kitchen Console v1.2
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-left transition-all relative ${
                isActive
                  ? 'text-primary bg-primary/10 font-bold border-l-4 border-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span className="text-sm font-medium font-label-md">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto">
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-xl">
          <p className="text-xs text-on-surface-variant mb-2.5 font-label-sm flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-primary-container" />
            Kitchen Support
          </p>
          <a
            href="mailto:support@serveme.com"
            className="block w-full text-center bg-secondary text-on-secondary py-2 rounded text-xs font-semibold hover:opacity-90 transition-opacity font-label-md"
          >
            Contact Support
          </a>
        </div>
      </div>
    </aside>
  );
}
