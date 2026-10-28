import React from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { CountdownCard } from '../dashboard/CountdownCard.tsx';
import {
  Gem,
  MapPin,
  Calendar,
  Wallet,
  CheckCircle2,
  Users,
  Plus,
  Clock,
} from 'lucide-react';
import { formatINR, formatDate, formatTime } from '../../lib/utils.ts';
import { ActivePage } from '../layout/Sidebar.tsx';

interface EngagementPlannerViewProps {
  setActivePage: (page: ActivePage) => void;
  onAddExpense: () => void;
  onAddTask: () => void;
  onEditEvent: (event: any) => void;
}

export const EngagementPlannerView: React.FC<EngagementPlannerViewProps> = ({
  setActivePage,
  onAddExpense,
  onAddTask,
  onEditEvent,
}) => {
  const { data, budgetMetrics, engagementTaskCompletionPercent, toggleTaskStatus } = useWeddingData();

  const couple = data?.coupleProfile;
  const engagementEvent = data?.events.find(e => e.type === 'engagement') || {
    id: 'evt_eng',
    title: 'Ring Ceremony & Engagement',
    type: 'engagement',
    dateTime: couple?.engagementDate || '',
    venue: couple?.engagementVenue || '',
    address: couple?.engagementAddress || '',
  };

  const engagementTasks = (data?.tasks || []).filter(t => t.relatedEvent === 'engagement');
  const engagementExpenses = (data?.expenses || []).filter(e => e.event === 'engagement');
  const engagementGuests = (data?.guests || []).filter(g => g.eventsInvited?.includes('engagement'));
  const attendingGuests = engagementGuests.filter(g => g.rsvpStatus === 'attending');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6D34] uppercase tracking-wider mb-1">
            <Gem className="w-4 h-4 text-[#D4AF37]" />
            <span>Dedicated Ceremony Suite</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Engagement & Ring Ceremony Planner
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Manage the engagement countdown, banquet venue, rings, outfits, guest RSVPs, and expenses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddExpense}
            className="py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition"
          >
            + Engagement Expense
          </button>
          <button
            onClick={onAddTask}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition"
          >
            + Engagement Task
          </button>
        </div>
      </div>

      {/* Main Countdown & Venue Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
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
        </div>

        <div className="lg:col-span-6 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A63A50] px-2 py-0.5 rounded-full bg-[#FDF2F4] border border-[#F0C9CD]">
              Ceremony Overview
            </span>
            <h3 className="font-serif font-bold text-xl text-[#2D2422] mt-2">
              {engagementEvent.title}
            </h3>
            <p className="text-xs text-[#7A6B68] mt-1">
              {engagementEvent.notes || 'Ring exchange ceremony followed by champagne toast, musical performance, and royal banquet dinner.'}
            </p>

            <div className="mt-4 space-y-2 text-xs text-[#5C4E4B]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B38F4D]" />
                <span>
                  <strong>Date & Time:</strong> {formatDate(engagementEvent.dateTime)} at {formatTime(engagementEvent.dateTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B38F4D]" />
                <span>
                  <strong>Venue:</strong> {engagementEvent.venue} {engagementEvent.address && `(${engagementEvent.address})`}
                </span>
              </div>
              {engagementEvent.dressCode && (
                <div className="text-xs text-[#7A6B68]">
                  <strong>Dress Code:</strong> {engagementEvent.dressCode}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-[#F0E6D2] text-center">
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Allocated Budget</div>
              <div className="text-sm font-serif font-bold text-[#2D2422] mt-0.5">
                {formatINR(budgetMetrics.engagementBudget)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Spent So Far</div>
              <div className="text-sm font-serif font-bold text-[#8C6D34] mt-0.5">
                {formatINR(budgetMetrics.engagementSpent)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Guests Attending</div>
              <div className="text-sm font-serif font-bold text-[#166534] mt-0.5">
                {attendingGuests.reduce((s, g) => s + g.headcount, 0)} Pax
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Specific Tasks & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-base text-[#2D2422]">
              Engagement Tasks ({engagementTasks.length})
            </h4>
            <span className="text-xs font-semibold text-[#8C6D34]">
              {engagementTaskCompletionPercent}% Completed
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {engagementTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8C7E7A]">
                No engagement tasks recorded yet.
              </div>
            ) : (
              engagementTasks.map(t => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl border border-[#EFE8DD] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleTaskStatus(t.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                        t.status === 'completed'
                          ? 'bg-[#166534] border-[#166534] text-white'
                          : 'border-[#D4AF37] text-transparent'
                      }`}
                    >
                      ✓
                    </button>
                    <span className={`font-semibold truncate ${t.status === 'completed' ? 'line-through text-[#8C7E7A]' : 'text-[#2D2422]'}`}>
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#7A6B68] shrink-0 font-medium">
                    Due {formatDate(t.dueDate)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expenses */}
        <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-bold text-base text-[#2D2422]">
              Engagement Expenses ({engagementExpenses.length})
            </h4>
            <span className="text-xs font-semibold text-[#8C6D34]">
              Total: {formatINR(budgetMetrics.engagementSpent)}
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {engagementExpenses.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8C7E7A]">
                No expenses logged for engagement yet.
              </div>
            ) : (
              engagementExpenses.map(e => (
                <div
                  key={e.id}
                  className="p-3 rounded-xl border border-[#EFE8DD] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#2D2422] truncate">{e.title}</div>
                    <div className="text-[10px] text-[#7A6B68]">{e.category} · {e.vendorName || 'Payee'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#2D2422]">{formatINR(e.actualAmount)}</div>
                    <div className="text-[10px] text-[#166534]">{formatINR(e.amountPaid)} paid</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
