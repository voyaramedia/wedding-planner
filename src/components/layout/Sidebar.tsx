import React from 'react';
import {
  LayoutDashboard,
  CalendarHeart,
  Gem,
  CheckSquare,
  Wallet,
  Users,
  Store,
  Calendar,
  Image,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
  Sparkles,
  FolderLock,
  UserCheck,
  Heart,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';

export type ActivePage =
  | 'dashboard'
  | 'groom_workspace'
  | 'bride_workspace'
  | 'engagement'
  | 'wedding'
  | 'tasks'
  | 'expenses'
  | 'guests'
  | 'vendors'
  | 'calendar'
  | 'couple'
  | 'gallery'
  | 'family'
  | 'reports'
  | 'settings'
  | 'superadmin';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  onClose,
}) => {
  const { user, logout, canManageUsers } = useAuth();
  const { data } = useWeddingData();

  const groomName = data?.coupleProfile?.groom?.name || 'Groom';
  const brideName = data?.coupleProfile?.bride?.name || 'Bride';
  const hashtag = data?.coupleProfile?.hashtag || '#OurWedding';
  const weddingId = data?.weddingId || data?.coupleProfile?.weddingId || '';

  const isGroomOrAdmin = user?.role === 'groom' || user?.role === 'admin';
  const isBrideOrAdmin = user?.role === 'bride' || user?.role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Main Shared Dashboard', icon: LayoutDashboard },
    ...(isGroomOrAdmin
      ? [{ id: 'groom_workspace', label: "Groom's Workspace", icon: UserCheck, privateTag: true }]
      : []),
    ...(isBrideOrAdmin
      ? [{ id: 'bride_workspace', label: "Bride's Workspace", icon: Heart, privateTag: true }]
      : []),
    { id: 'engagement', label: 'Engagement Planner', icon: Gem },
    { id: 'wedding', label: 'Wedding Planner', icon: CalendarHeart },
    { id: 'tasks', label: 'Tasks & Checklist', icon: CheckSquare },
    { id: 'expenses', label: 'Expenses & Budget', icon: Wallet },
    { id: 'guests', label: 'Guests & E-Invites', icon: Users },
    { id: 'vendors', label: 'Vendors Directory', icon: Store },
    { id: 'calendar', label: 'Calendar & Schedule', icon: Calendar },
    { id: 'gallery', label: 'Photo Gallery & Albums', icon: Image },
    { id: 'couple', label: 'Couple Profile & Story', icon: Sparkles },
    ...(canManageUsers || user?.role === 'admin'
      ? [{ id: 'family', label: 'Family & Permissions', icon: ShieldCheck }]
      : []),
    ...(user?.role === 'admin'
      ? [{ id: 'superadmin', label: 'Super Admin Console', icon: ShieldAlert }]
      : []),
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { id: 'settings', label: 'Wedding Settings', icon: Settings },
  ];

  const handleSelect = (id: ActivePage) => {
    setActivePage(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#2D2422]/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-[280px] sm:w-72 max-w-[85vw] bg-[#FFFDF9] border-r border-[#E8DEC8]/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#F0E6D2] relative">
          <button
            onClick={onClose}
            className="md:hidden absolute right-4 top-5 p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EEDB96] to-[#C5A059] flex items-center justify-center text-[#2D2422] shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-[#2D2422] leading-tight">
                Our Wedding
              </h1>
              <span className="text-[10px] uppercase tracking-wider text-[#B38F4D] font-bold">
                Planner Suite
              </span>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-[#F5EFE6]">
            <div className="flex items-center justify-between">
              <div className="font-serif text-xs font-semibold text-[#5C4E4B] truncate max-w-[150px]">
                {groomName} & {brideName}
              </div>
              <span className="font-mono text-[10px] font-bold text-[#8C6D34] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#E8DEC8]">
                {weddingId || 'Not Set'}
              </span>
            </div>
            <div className="text-[10px] text-[#A89A96] tracking-wide mt-0.5 truncate">
              {hashtag}
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id as ActivePage)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group ${
                  isActive
                    ? 'bg-[#FAF5EB] text-[#8C6D34] font-semibold border border-[#E8DEC8] shadow-xs'
                    : 'text-[#6D5E5A] hover:bg-[#FAF8F5] hover:text-[#2D2422]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#C5A059]' : 'text-[#A89A96] group-hover:text-[#6D5E5A]'
                  }`}
                />
                <span className="truncate">{item.label}</span>

                {item.privateTag && (
                  <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold uppercase text-[#B38F4D] bg-[#FFF8EC] px-1.5 py-0.5 rounded border border-[#E8DEC8]">
                    <Lock className="w-2.5 h-2.5" />
                    Private
                  </span>
                )}

                {isActive && !item.privateTag && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-4 border-t border-[#F0E6D2] bg-[#FAF8F5]/80">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#EEDB96]/40 border border-[#D4AF37]/30 flex items-center justify-center font-serif font-bold text-xs text-[#8C6D34]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#2D2422] truncate">
                {user?.name}
              </div>
              <div className="text-[11px] text-[#8C6D34] capitalize truncate">
                {user?.role === 'admin' ? 'Super Administrator' : user?.relation || user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#E5DFD7] text-xs font-medium text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] hover:border-[#F0C9CD] transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
