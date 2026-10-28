import React, { useState } from 'react';
import { Menu, Plus, Heart, Wallet, CheckSquare, Users, CalendarPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onQuickAction: (action: 'add_expense' | 'add_task' | 'add_event' | 'add_guest') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, onQuickAction }) => {
  const { user } = useAuth();
  const { data } = useWeddingData();
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);

  const groomName = data?.coupleProfile?.groom?.name || 'Groom';
  const brideName = data?.coupleProfile?.bride?.name || 'Bride';

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleMobileAction = (action: 'add_expense' | 'add_task' | 'add_event' | 'add_guest') => {
    setShowMobileActionMenu(false);
    onQuickAction(action);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DEC8]/80 px-3.5 sm:px-6 md:px-8 py-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Mobile Menu Button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2.5 rounded-xl text-[#5C4E4B] hover:bg-[#FAF5EB] transition border border-[#E8DEC8] shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-serif font-bold text-sm sm:text-base md:text-lg text-[#2D2422] truncate max-w-[170px] sm:max-w-none">
                {groomName} & {brideName}
              </span>
              <Heart className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]/30 shrink-0" />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#8C7E7A] truncate">
              <span>{todayStr}</span>
              <span aria-hidden="true">·</span>
              <span className="italic font-serif text-[#B38F4D] truncate">
                "Two souls, one royal celebration"
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Desktop & Tablet buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onQuickAction('add_expense')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
            <button
              onClick={() => onQuickAction('add_task')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => onQuickAction('add_guest')}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Guest</span>
            </button>
          </div>

          {/* Mobile Quick Action Dropdown Trigger */}
          <div className="relative md:hidden">
            <button
              onClick={() => setShowMobileActionMenu(!showMobileActionMenu)}
              className="flex items-center gap-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow-xs min-h-[40px] cursor-pointer"
              aria-label="Add new item"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[11px]">Add</span>
            </button>

            {/* Mobile Dropdown Popover */}
            {showMobileActionMenu && (
              <>
                <div
                  onClick={() => setShowMobileActionMenu(false)}
                  className="fixed inset-0 z-40 bg-transparent"
                />
                <div className="absolute right-0 top-11 z-50 w-48 bg-[#FFFDF9] border border-[#E8DEC8] rounded-2xl shadow-xl py-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => handleMobileAction('add_expense')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#2D2422] hover:bg-[#FAF5EB] text-left transition"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>Log Expense</span>
                  </button>
                  <button
                    onClick={() => handleMobileAction('add_task')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#2D2422] hover:bg-[#FAF5EB] text-left transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>Create Task</span>
                  </button>
                  <button
                    onClick={() => handleMobileAction('add_event')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#2D2422] hover:bg-[#FAF5EB] text-left transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>Add Ceremony</span>
                  </button>
                  <button
                    onClick={() => handleMobileAction('add_guest')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#2D2422] hover:bg-[#FAF5EB] text-left transition"
                  >
                    <Users className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>Invite Guest</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User Avatar & Status */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#EFE8DD]">
            <div className="text-right hidden lg:block">
              <div className="text-xs font-semibold text-[#2D2422] leading-tight truncate max-w-[120px]">
                {user?.name}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#B38F4D] font-bold">
                {user?.role}
              </div>
            </div>
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#EEDB96] to-[#C5A059] flex items-center justify-center font-serif font-bold text-xs text-white shadow-xs shrink-0"
              title={`${user?.name} (${user?.role})`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
