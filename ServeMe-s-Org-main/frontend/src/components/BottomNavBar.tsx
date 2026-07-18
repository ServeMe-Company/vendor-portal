import React from 'react';
import { LayoutDashboard, UtensilsCrossed, BarChart3, Warehouse } from 'lucide-react';

interface BottomNavBarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function BottomNavBar({ currentTab, setCurrentTab }: BottomNavBarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'catalog', label: 'Items', icon: UtensilsCrossed },
    { id: 'inventory', label: 'Stock', icon: Warehouse },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-3 pt-2 border-t border-outline-variant bg-surface select-none">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-transform scale-95 active:scale-90 ${
              isActive
                ? 'bg-primary-container/20 text-primary font-bold'
                : 'text-on-surface-variant'
            }`}
          >
            <IconComponent className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium leading-tight font-label-sm">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
