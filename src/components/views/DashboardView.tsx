import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { CountdownCard } from '../dashboard/CountdownCard.tsx';
import {
  Sparkles,
  Heart,
  Plus,
  Calendar,
  Wallet,
  CheckCircle2,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  ExternalLink,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  FolderLock,
  CheckSquare,
} from 'lucide-react';
import { formatINR, formatDate, formatTime } from '../../lib/utils.ts';
import { ActivePage } from '../layout/Sidebar.tsx';

interface DashboardViewProps {
  setActivePage: (page: ActivePage) => void;
  onQuickAction: (action: 'add_expense' | 'add_task' | 'add_event' | 'add_guest') => void;
  onEditEvent: (event: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActivePage,
  onQuickAction,
  onEditEvent,
}) => {
  const { user } = useAuth();
  const {
    data,
    budgetMetrics,
    engagementTaskCompletionPercent,
    weddingTaskCompletionPercent,
    overallTaskCompletionPercent,
    toggleTaskStatus,
  } = useWeddingData();

  const couple = data?.coupleProfile;
  const groom = couple?.groom;
  const bride = couple?.bride;
  const weddingId = data?.weddingId || couple?.weddingId || '';

  const [copiedWeddingId, setCopiedWeddingId] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const copyWeddingId = () => {
    if (!weddingId) return;
    navigator.clipboard.writeText(weddingId);
    setCopiedWeddingId(true);
    setTimeout(() => setCopiedWeddingId(false), 2000);
  };

  // Find next upcoming event
  const events = data?.events || [];
  const now = new Date().getTime();
  const sortedUpcomingEvents = [...events]
    .filter(e => e.dateTime && new Date(e.dateTime).getTime() >= now - 1000 * 60 * 60 * 24)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const nextEvent = sortedUpcomingEvents[0];

  // Specific engagement and wedding events for countdowns
  const engagementEvent = events.find(e => e.type === 'engagement') || {
    id: 'evt_eng',
    title: 'Ring Ceremony & Engagement',
    type: 'engagement',
    dateTime: couple?.engagementDate || '',
    venue: couple?.engagementVenue || '',
    address: couple?.engagementAddress || '',
    mapLink: couple?.engagementMapLink || '',
  };

  const weddingEvent = events.find(e => e.type === 'wedding') || {
    id: 'evt_wed',
    title: 'Sacred Wedding Ceremony & Reception',
    type: 'wedding',
    dateTime: couple?.weddingDate || '',
    venue: couple?.weddingVenue || '',
    address: couple?.weddingAddress || '',
    mapLink: couple?.weddingMapLink || '',
  };

  // Tasks
  const pendingTasks = (data?.tasks || [])
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Shared Guest aggregate cards
  const guestStats = data?.sharedGuestStats || {
    groomSide: { totalPax: 0, attendingPax: 0, pendingPax: 0, declinedPax: 0, invitationsSent: 0 },
    brideSide: { totalPax: 0, attendingPax: 0, pendingPax: 0, declinedPax: 0, invitationsSent: 0 },
    mutualSide: { totalPax: 0, attendingPax: 0, pendingPax: 0, declinedPax: 0, invitationsSent: 0 },
  };

  const totalAllGuests = guestStats.groomSide.totalPax + guestStats.brideSide.totalPax + guestStats.mutualSide.totalPax;
  const totalAttendingGuests = guestStats.groomSide.attendingPax + guestStats.brideSide.attendingPax + guestStats.mutualSide.attendingPax;

  const isUserGroom = user?.role === 'groom';
  const isUserBride = user?.role === 'bride';
  const isUserAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Couple Profile Header with Master Wedding ID & Map Links */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#FFFDF9] via-[#FAF5EB] to-[#FFF8F0] border border-[#E8DEC8] p-4 sm:p-6 md:p-8 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-[#EEDB96]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Master Wedding ID Badge */}
              <div className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-white border border-[#D4AF37] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#8C6D34]">Wedding ID:</span>
                <span className="font-mono text-xs font-bold text-[#2D2422]">{weddingId}</span>
                <button
                  type="button"
                  onClick={copyWeddingId}
                  className="text-[#8C6D34] hover:text-[#5C4E4B] transition p-0.5 cursor-pointer"
                  title="Copy Master Wedding ID"
                >
                  {copiedWeddingId ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <span className="text-[11px] font-semibold text-[#8C6D34] uppercase tracking-wider">
                · {todayStr}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-[#2D2422] tracking-tight">
              Welcome, {user?.name || 'Honored Family'}!
            </h2>

            <p className="text-xs md:text-sm text-[#7A6B68] max-w-xl font-light leading-relaxed">
              {groom?.name || bride?.name ? (
                <>
                  Managing wedding preparations for{' '}
                  <strong className="font-semibold text-[#5C4E4B]">
                    {groom?.name || 'Groom'} & {bride?.name || 'Bride'}
                  </strong>
                  {couple?.hashtag ? ` (${couple.hashtag})` : ''}. Master couple registration with independent private workspaces.
                </>
              ) : (
                <>
                  Manage all engagement and wedding preparations, budgets, vendors, and guests in one centralized dashboard.
                </>
              )}
            </p>

            {/* Venue & Map Links Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(engagementEvent.mapLink || couple?.engagementMapLink) && (
                <a
                  href={engagementEvent.mapLink || couple?.engagementMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 py-1 px-3 rounded-xl bg-white border border-[#E8DEC8] text-[11px] font-medium text-[#5C4E4B] hover:text-[#8C6D34] hover:border-[#D4AF37] shadow-2xs transition"
                >
                  <MapPin className="w-3 h-3 text-[#C5A059]" />
                  <span>Engagement Venue Map</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#AAA09D]" />
                </a>
              )}

              {(weddingEvent.mapLink || couple?.weddingMapLink) && (
                <a
                  href={weddingEvent.mapLink || couple?.weddingMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 py-1 px-3 rounded-xl bg-white border border-[#E8DEC8] text-[11px] font-medium text-[#5C4E4B] hover:text-[#8C6D34] hover:border-[#D4AF37] shadow-2xs transition"
                >
                  <MapPin className="w-3 h-3 text-[#C5A059]" />
                  <span>Wedding Venue Map</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#AAA09D]" />
                </a>
              )}

              {nextEvent && (
                <div className="inline-flex items-center gap-1.5 py-1 px-3 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] text-[11px] text-[#5C4E4B]">
                  <Calendar className="w-3 h-3 text-[#B38F4D]" />
                  <span>Next: <strong>{nextEvent.title}</strong> ({formatDate(nextEvent.dateTime)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Couple Side-by-Side Portraits */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <div className="flex -space-x-3 hover:-space-x-1 transition-all">
              <div className="relative group">
                {groom?.photoUrl ? (
                  <img
                    src={groom.photoUrl}
                    alt={groom?.name || 'Groom'}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-[#D4AF37]/50"
                  />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#FAF5EB] to-[#EEDB96] border-2 border-white shadow-md ring-2 ring-[#D4AF37]/50 flex items-center justify-center text-sm font-bold text-[#8C6D34]">
                    {groom?.name ? groom.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#D4AF37] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                  G
                </span>
              </div>

              <div className="relative group">
                {bride?.photoUrl ? (
                  <img
                    src={bride.photoUrl}
                    alt={bride?.name || 'Bride'}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-[#F0C9CD]"
                  />
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#FDF2F4] to-[#F5CBD1] border-2 border-white shadow-md ring-2 ring-[#F0C9CD] flex items-center justify-center text-sm font-bold text-[#A63A50]">
                    {bride?.name ? bride.name.charAt(0).toUpperCase() : 'B'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#E8A5AC] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                  B
                </span>
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="font-serif font-bold text-sm text-[#2D2422]">
                {groom?.name && bride?.name
                  ? `${groom.name.split(' ')[0]} & ${bride.name.split(' ')[0]}`
                  : (groom?.name || bride?.name || 'Our Wedding')}
              </div>
              <button
                onClick={() => setActivePage('couple')}
                className="text-[11px] text-[#B38F4D] hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
              >
                <span>Couple Journal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons Row */}
        <div className="mt-5 pt-4 border-t border-[#EFE8DD] flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#7A6B68] mr-1">Quick Actions:</span>

          <button
            onClick={() => onQuickAction('add_expense')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E8DEC8] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF5EB] hover:text-[#8C6D34] hover:border-[#D4AF37] transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#B38F4D]" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => onQuickAction('add_task')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E8DEC8] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF5EB] hover:text-[#8C6D34] hover:border-[#D4AF37] transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#B38F4D]" />
            <span>Create Task</span>
          </button>

          <button
            onClick={() => onQuickAction('add_event')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E8DEC8] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF5EB] hover:text-[#8C6D34] hover:border-[#D4AF37] transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#B38F4D]" />
            <span>Add Ceremony</span>
          </button>

          <button
            onClick={() => onQuickAction('add_guest')}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E8DEC8] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF5EB] hover:text-[#8C6D34] hover:border-[#D4AF37] transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-[#B38F4D]" />
            <span>Invite Guest</span>
          </button>
        </div>
      </div>

      {/* 2. PROMINENT WORKSPACE ACCESS PANELS (Groom Section & Bride Section) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#2D2422]">
              Couple Workspaces & Privacy Controls
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Independent, encrypted workspaces for Groom and Bride under one wedding registration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Groom Section Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFFDF9] to-[#FAF5EB] border border-[#D4AF37]/40 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {groom?.photoUrl ? (
                  <img
                    src={groom.photoUrl}
                    alt={groom.name || 'Groom'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#D4AF37] shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF5EB] border-2 border-[#D4AF37] flex items-center justify-center font-serif text-lg font-bold text-[#8C6D34] shadow-sm">
                    {groom?.name?.charAt(0) || 'G'}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D34] bg-white px-2 py-0.5 rounded-md border border-[#E8DEC8]">
                    Groom's Private Domain
                  </span>
                  <h4 className="font-serif font-bold text-base text-[#2D2422] mt-0.5">
                    {groom?.name || 'Groom'}
                  </h4>
                  <div className="text-[11px] text-[#7A6B68]">Mobile: {groom?.mobile || 'Not set'}</div>
                </div>
              </div>

              {isUserGroom || isUserAdmin ? (
                <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase text-[#8C7E7A] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E8DEC8] flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Protected
                </span>
              )}
            </div>

            {/* Content visible only if user is Groom or Admin */}
            {isUserGroom || isUserAdmin ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-[#E8DEC8]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Groom Budget</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {formatINR(budgetMetrics.groomSpent)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#E8DEC8]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Checklists</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {(data?.checklists || []).filter(c => c.owner === 'groom').length} Items
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#E8DEC8]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Side Guests</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {guestStats.groomSide.totalPax} Pax
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActivePage('groom_workspace' as any)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2D2422] text-white text-xs font-semibold hover:bg-[#433532] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FolderLock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Enter Groom's Personal Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/70 border border-[#E8DEC8] text-xs text-[#7A6B68] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#8C6D34]">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>Private Groom Information Shielded</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Groom's private budget records, wardrobe files, personal checklists, and guest contact numbers are strictly secured and invisible from Bride's session.
                </p>
              </div>
            )}
          </div>

          {/* Bride Section Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFFDF9] to-[#FFF5F6] border border-[#F0C9CD] shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                {bride?.photoUrl ? (
                  <img
                    src={bride.photoUrl}
                    alt={bride.name || 'Bride'}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-[#F0C9CD] shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF5F6] border-2 border-[#F0C9CD] flex items-center justify-center font-serif text-lg font-bold text-[#A63A50] shadow-sm">
                    {bride?.name?.charAt(0) || 'B'}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A63A50] bg-white px-2 py-0.5 rounded-md border border-[#F0C9CD]">
                    Bride's Private Domain
                  </span>
                  <h4 className="font-serif font-bold text-base text-[#2D2422] mt-0.5">
                    {bride?.name || 'Bride'}
                  </h4>
                  <div className="text-[11px] text-[#7A6B68]">Mobile: {bride?.mobile || 'Not set'}</div>
                </div>
              </div>

              {isUserBride || isUserAdmin ? (
                <span className="text-[10px] font-bold uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  Unlocked
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase text-[#8C7E7A] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E8DEC8] flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Protected
                </span>
              )}
            </div>

            {/* Content visible only if user is Bride or Admin */}
            {isUserBride || isUserAdmin ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-[#F0C9CD]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Bride Budget</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {formatINR(budgetMetrics.brideSpent)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#F0C9CD]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Checklists</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {(data?.checklists || []).filter(c => c.owner === 'bride').length} Items
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#F0C9CD]">
                    <div className="text-[10px] text-[#8C7E7A] uppercase font-semibold">Side Guests</div>
                    <div className="text-xs font-serif font-bold text-[#2D2422] mt-0.5">
                      {guestStats.brideSide.totalPax} Pax
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActivePage('bride_workspace' as any)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2D2422] text-white text-xs font-semibold hover:bg-[#433532] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FolderLock className="w-3.5 h-3.5 text-[#E8A5AC]" />
                  <span>Enter Bride's Personal Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/70 border border-[#F0C9CD] text-xs text-[#7A6B68] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#A63A50]">
                  <ShieldCheck className="w-4 h-4 text-[#A63A50]" />
                  <span>Private Bride Information Shielded</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Bride's private lehenga designs, heirloom jewellery, personal checklists, and family guest numbers are strictly secured and invisible from Groom's session.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. SEPARATE INDEPENDENT COUNTDOWN WIDGETS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#2D2422]">
              Celebration Countdowns
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Live independent timers for engagement and sacred wedding vows
            </p>
          </div>
          <button
            onClick={() => setActivePage('calendar')}
            className="text-xs font-semibold text-[#B38F4D] hover:underline flex items-center gap-1"
          >
            <span>View All Schedules</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CountdownCard
            title={engagementEvent.title}
            eventType="engagement"
            targetDate={couple?.engagementDate || engagementEvent.dateTime}
            venue={couple?.engagementVenue || engagementEvent.venue}
            budgetSpent={budgetMetrics.engagementSpent}
            budgetAllocated={budgetMetrics.engagementBudget}
            taskCompletionPercent={engagementTaskCompletionPercent}
            accentColor="rose"
            onEdit={() => onEditEvent(engagementEvent)}
          />

          <CountdownCard
            title={weddingEvent.title}
            eventType="wedding"
            targetDate={couple?.weddingDate || weddingEvent.dateTime}
            venue={couple?.weddingVenue || weddingEvent.venue}
            budgetSpent={budgetMetrics.weddingSpent}
            budgetAllocated={budgetMetrics.weddingBudget}
            taskCompletionPercent={weddingTaskCompletionPercent}
            accentColor="gold"
            onEdit={() => onEditEvent(weddingEvent)}
          />
        </div>
      </div>

      {/* 4. SHARED GUEST OVERVIEW: TWO SEPARATE AGGREGATE CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="font-serif font-bold text-lg text-[#2D2422]">
              Shared Guest Headcount & RSVP Overview
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Aggregate numbers from both sides without revealing private personal details
            </p>
          </div>
          <button
            onClick={() => setActivePage('guests')}
            className="text-xs font-semibold text-[#B38F4D] hover:underline flex items-center gap-1"
          >
            <span>Manage Guest Lists</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Groom's Side Aggregate Card */}
          <div className="p-5 rounded-3xl bg-white border border-[#E8DEC8] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#FAF5EB] border border-[#D4AF37] text-[#8C6D34] flex items-center justify-center font-bold text-xs">
                  G
                </span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#2D2422]">Groom's Side Guests</h4>
                  <div className="text-[11px] text-[#8C7E7A]">Sharma Family & Relatives</div>
                </div>
              </div>
              <span className="text-base font-serif font-bold text-[#2D2422]">
                {guestStats.groomSide.totalPax} <span className="text-xs font-normal text-[#8C7E7A]">Pax</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F5EFE6] text-center">
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#166534] font-bold">Attending</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.groomSide.attendingPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#8C6D34] font-bold">Pending</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.groomSide.pendingPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#A63A50] font-bold">Declined</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.groomSide.declinedPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#3B82F6] font-bold">Sent</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.groomSide.invitationsSent}</div>
              </div>
            </div>
          </div>

          {/* Bride's Side Aggregate Card */}
          <div className="p-5 rounded-3xl bg-white border border-[#F0C9CD] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#FFF5F6] border border-[#F0C9CD] text-[#A63A50] flex items-center justify-center font-bold text-xs">
                  B
                </span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#2D2422]">Bride's Side Guests</h4>
                  <div className="text-[11px] text-[#8C7E7A]">Verma Family & Relatives</div>
                </div>
              </div>
              <span className="text-base font-serif font-bold text-[#2D2422]">
                {guestStats.brideSide.totalPax} <span className="text-xs font-normal text-[#8C7E7A]">Pax</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#F5EFE6] text-center">
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#166534] font-bold">Attending</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.brideSide.attendingPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#8C6D34] font-bold">Pending</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.brideSide.pendingPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#A63A50] font-bold">Declined</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.brideSide.declinedPax}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF8F5]">
                <div className="text-[10px] text-[#3B82F6] font-bold">Sent</div>
                <div className="text-xs font-bold text-[#2D2422] mt-0.5">{guestStats.brideSide.invitationsSent}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. High-Level Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Spent */}
        <div
          onClick={() => setActivePage('expenses')}
          className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs hover:border-[#D4AF37] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7A6B68] mb-2">
            <span className="text-xs font-medium">Budget Committed</span>
            <Wallet className="w-4 h-4 text-[#B38F4D]" />
          </div>
          <div className="text-xl md:text-2xl font-serif font-bold text-[#2D2422]">
            {formatINR(budgetMetrics.totalActual)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C7E7A] mt-2">
            <span>Allocated: {formatINR(budgetMetrics.totalPlanned)}</span>
            <span className="font-semibold text-[#8C6D34]">
              {budgetMetrics.utilizationPercent}% used
            </span>
          </div>
          <div className="w-full h-1 bg-[#E8DEC8]/50 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetMetrics.utilizationPercent > 90 ? 'bg-[#A63A50]' : 'bg-[#D4AF37]'
              }`}
              style={{ width: `${Math.min(100, budgetMetrics.utilizationPercent)}%` }}
            />
          </div>
        </div>

        {/* Task Completion */}
        <div
          onClick={() => setActivePage('tasks')}
          className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs hover:border-[#D4AF37] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7A6B68] mb-2">
            <span className="text-xs font-medium">Preparation Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-[#166534]" />
          </div>
          <div className="text-xl md:text-2xl font-serif font-bold text-[#2D2422]">
            {overallTaskCompletionPercent}% Done
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8C7E7A] mt-2">
            <span>
              {data?.tasks.filter(t => t.status === 'completed').length || 0} of {data?.tasks.length || 0} completed
            </span>
            <span className="text-[#A63A50] font-medium">
              {pendingTasks.length} pending
            </span>
          </div>
        </div>

        {/* Guest RSVP Headcount */}
        <div
          onClick={() => setActivePage('guests')}
          className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs hover:border-[#D4AF37] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7A6B68] mb-2">
            <span className="text-xs font-medium">Guest Headcount</span>
            <Users className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-xl md:text-2xl font-serif font-bold text-[#2D2422]">
            {totalAttendingGuests} <span className="text-sm font-sans font-normal text-[#8C7E7A]">/ {totalAllGuests} Pax</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2 truncate">
            {guestStats.groomSide.invitationsSent + guestStats.brideSide.invitationsSent} e-invitations dispatched
          </div>
        </div>

        {/* Outstanding Vendor Balance */}
        <div
          onClick={() => setActivePage('vendors')}
          className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs hover:border-[#D4AF37] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#7A6B68] mb-2">
            <span className="text-xs font-medium">Pending Payments</span>
            <AlertTriangle className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-xl md:text-2xl font-serif font-bold text-[#A63A50]">
            {formatINR(budgetMetrics.totalPending)}
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            {data?.vendors.filter(v => v.balanceDue > 0).length || 0} vendors with balance due
          </div>
        </div>
      </div>

      {/* 6. Two-Column Action Section: Urgent Tasks & Ceremony Itinerary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Urgent Tasks (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Upcoming Deadlines & Tasks
              </h3>
              <p className="text-xs text-[#7A6B68]">
                Click checkmark to complete or mark progress
              </p>
            </div>
            <button
              onClick={() => setActivePage('tasks')}
              className="text-xs font-semibold text-[#B38F4D] hover:underline flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8C7E7A]">
                All scheduled tasks are completed! ✨
              </div>
            ) : (
              pendingTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#EFE8DD] bg-[#FAF8F5]/60 hover:bg-[#FAF5EB] transition gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleTaskStatus(t.id)}
                      className="w-5 h-5 rounded-lg border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-white text-transparent flex items-center justify-center transition shrink-0 cursor-pointer"
                      title="Mark task as complete"
                    >
                      ✓
                    </button>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#2D2422] truncate">
                        {t.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#7A6B68] mt-0.5">
                        <span className="capitalize">{t.relatedEvent}</span>
                        <span>·</span>
                        <span>Assigned to {t.assignedToName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-[11px] font-semibold ${
                      new Date(t.dueDate).getTime() < now ? 'text-[#A63A50]' : 'text-[#5C4E4B]'
                    }`}>
                      Due {formatDate(t.dueDate)}
                    </div>
                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      t.priority === 'urgent'
                        ? 'bg-[#FDF2F4] text-[#A63A50]'
                        : t.priority === 'high'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-[#F3F4F6] text-[#6B7280]'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ceremonies Timeline Itinerary (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Ceremonies Itinerary
              </h3>
              <p className="text-xs text-[#7A6B68]">Chronological celebration order</p>
            </div>
            <button
              onClick={() => onQuickAction('add_event')}
              className="text-xs font-semibold text-[#B38F4D] hover:underline"
            >
              + Add Ceremony
            </button>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#E8DEC8] before:content-['']">
            {events.map((e) => {
              const isPast = new Date(e.dateTime).getTime() < now;
              return (
                <div key={e.id} className="relative flex items-start gap-3 pl-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 text-[10px] font-bold ${
                    isPast
                      ? 'bg-[#166534] text-white'
                      : e.type === 'wedding'
                      ? 'bg-[#D4AF37] text-white ring-4 ring-[#FAF5EB]'
                      : 'bg-[#FFFDF9] border-2 border-[#D4AF37] text-[#8C6D34]'
                  }`}>
                    {isPast ? '✓' : e.title.charAt(0)}
                  </div>

                  <div
                    onClick={() => onEditEvent(e)}
                    className="flex-1 p-2.5 rounded-xl border border-[#EFE8DD] bg-[#FAF8F5]/60 hover:bg-[#FAF5EB] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#2D2422] truncate">
                        {e.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[#8C6D34]">
                        {e.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-[#7A6B68] mt-1">
                      <Clock className="w-3 h-3 text-[#B38F4D]" />
                      <span>{formatDate(e.dateTime)} · {formatTime(e.dateTime)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 text-[10px] text-[#8C7E7A] mt-1">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#C5A059] shrink-0" />
                        <span className="truncate">{e.venue}</span>
                      </div>
                      {e.mapLink && (
                        <a
                          href={e.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          className="text-[#8C6D34] hover:underline shrink-0 flex items-center gap-0.5"
                        >
                          <span>Map</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
