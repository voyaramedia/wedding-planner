import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Wallet,
  Users,
  Menu,
} from 'lucide-react';
import { ActivePage } from './Sidebar.tsx';

interface MobileBottomNavProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  setActivePage,
  onOpenMoreMenu,
}) => {
  const tabs = [
    { id: 'dashboard' as ActivePage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks' as ActivePage, label: 'Tasks', icon: CheckSquare },
    { id: 'expenses' as ActivePage, label: 'Budget', icon: Wallet },
    { id: 'guests' as ActivePage, label: 'Guests', icon: Users },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E8DEC8] flex items-center justify-around px-2 py-2 md:hidden shadow-[0_-4px_16px_rgba(45,36,34,0.06)] safe-area-bottom"
      aria-label="Mobile Bottom Navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activePage === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              isActive
                ? 'text-[#8C6D34] font-semibold'
                : 'text-[#8C7E7A] hover:text-[#2D2422]'
            }`}
          >
            <div className={`p-1 rounded-lg transition ${isActive ? 'bg-[#FAF5EB]' : ''}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#C5A059]' : 'text-[#8C7E7A]'}`} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* 5th Button: Open More Menu / Drawer */}
      <button
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-[#8C7E7A] hover:text-[#2D2422] transition-all cursor-pointer min-h-[44px]"
        aria-label="Open More Menu"
      >
        <div className="p-1 rounded-lg hover:bg-[#FAF5EB]">
          <Menu className="w-5 h-5 text-[#8C7E7A]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">More</span>
      </button>
    </nav>
  );
};
