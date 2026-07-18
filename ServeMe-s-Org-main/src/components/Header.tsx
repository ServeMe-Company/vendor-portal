import React from 'react';
import { LayoutDashboard, UtensilsCrossed, Warehouse, BarChart3, QrCode } from 'lucide-react';

interface HeaderProps {
  storeActive: boolean;
  setStoreActive: (active: boolean) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Header({ storeActive, setStoreActive, currentTab, setCurrentTab }: HeaderProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catalog', icon: UtensilsCrossed },
    { id: 'inventory', label: 'Inventory', icon: Warehouse },
    { id: 'reports', label: 'Report', icon: BarChart3 },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-8 h-16 bg-white border-b border-slate-200 select-none">
      {/* Brand logo and Vendor badge */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            serve<span className="text-orange-500">Me</span>
          </span>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200/60">
            Vendor
          </span>
        </div>

        {/* Desktop horizontal navigation */}
        <nav className="hidden md:flex items-center h-16">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`h-16 flex items-center gap-1.5 px-4 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-orange-500 text-slate-900 font-bold text-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 font-medium text-sm'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Store Active indicator / toggle button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setStoreActive(!storeActive)}
          className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all shadow-sm cursor-pointer border ${
            storeActive
              ? 'bg-[#f97316] hover:bg-[#ea580c] text-white border-transparent'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {storeActive ? 'Store Active' : 'Store Inactive'}
        </button>
      </div>
    </header>
  );
}
