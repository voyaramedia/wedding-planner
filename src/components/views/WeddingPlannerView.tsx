import React from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { CountdownCard } from '../dashboard/CountdownCard.tsx';
import {
  CalendarHeart,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Users,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { formatINR, formatDate, formatTime } from '../../lib/utils.ts';
import { ActivePage } from '../layout/Sidebar.tsx';

interface WeddingPlannerViewProps {
  setActivePage: (page: ActivePage) => void;
  onAddExpense: () => void;
  onAddTask: () => void;
  onEditEvent: (event: any) => void;
}

export const WeddingPlannerView: React.FC<WeddingPlannerViewProps> = ({
  setActivePage,
  onAddExpense,
  onAddTask,
  onEditEvent,
}) => {
  const { data, budgetMetrics, weddingTaskCompletionPercent, toggleTaskStatus } = useWeddingData();

  const couple = data?.coupleProfile;
  const weddingEvent = data?.events.find(e => e.type === 'wedding') || {
    id: 'evt_wed',
    title: 'Sacred Wedding Ceremony & Reception',
    type: 'wedding',
    dateTime: couple?.weddingDate || '',
    venue: couple?.weddingVenue || '',
    address: couple?.weddingAddress || '',
  };

  const allCeremonies = data?.events || [];
  const weddingTasks = (data?.tasks || []).filter(t => t.relatedEvent === 'wedding' || t.relatedEvent === 'all');
  const weddingVendors = (data?.vendors || []).filter(v => v.event === 'wedding' || v.event === 'all');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6D34] uppercase tracking-wider mb-1">
            <CalendarHeart className="w-4 h-4 text-[#D4AF37]" />
            <span>The Main Celebration Suite</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Wedding Ceremonies & Rituals Planner
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Complete coordination for Haldi, Mehendi, Sangeet, sacred Pheras, Baraat, and Reception
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddExpense}
            className="py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition"
          >
            + Wedding Expense
          </button>
          <button
            onClick={onAddTask}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition"
          >
            + Wedding Task
          </button>
        </div>
      </div>

      {/* Main Wedding Countdown & Venue Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
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

        <div className="lg:col-span-6 p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D34] px-2 py-0.5 rounded-full bg-[#FAF5EB] border border-[#E8DEC8]">
              Sacred Muhurat & Venue
            </span>
            <h3 className="font-serif font-bold text-xl text-[#2D2422] mt-2">
              {weddingEvent.title}
            </h3>
            <p className="text-xs text-[#7A6B68] mt-1">
              {weddingEvent.notes || 'Vintage royal baraat procession, water-dome mandap pheras, followed by sit-down royal feast under the stars.'}
            </p>

            <div className="mt-4 space-y-2 text-xs text-[#5C4E4B]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#B38F4D]" />
                <span>
                  <strong>Muhurat Time:</strong> {formatDate(weddingEvent.dateTime)} at {formatTime(weddingEvent.dateTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#B38F4D]" />
                <span>
                  <strong>Venue:</strong> {weddingEvent.venue}
                </span>
              </div>
              {weddingEvent.dressCode && (
                <div className="text-xs text-[#7A6B68]">
                  <strong>Dress Code:</strong> {weddingEvent.dressCode}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-[#F0E6D2] text-center">
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Wedding Budget</div>
              <div className="text-sm font-serif font-bold text-[#2D2422] mt-0.5">
                {formatINR(budgetMetrics.weddingBudget)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Committed</div>
              <div className="text-sm font-serif font-bold text-[#8C6D34] mt-0.5">
                {formatINR(budgetMetrics.weddingSpent)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD]">
              <div className="text-[10px] text-[#7A6B68] uppercase font-semibold">Vendors Booked</div>
              <div className="text-sm font-serif font-bold text-[#166534] mt-0.5">
                {weddingVendors.length} Agencies
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Rituals Itinerary Cards */}
      <div className="space-y-3">
        <h3 className="font-serif font-bold text-lg text-[#2D2422]">
          Full Celebration Itinerary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCeremonies.map(c => (
            <div
              key={c.id}
              onClick={() => onEditEvent(c)}
              className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition cursor-pointer shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8C6D34] px-2 py-0.5 rounded-full bg-[#FAF5EB] border border-[#E8DEC8]">
                  {c.type}
                </span>
                <span className="text-xs text-[#7A6B68] font-medium">
                  {formatDate(c.dateTime)}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-[#2D2422]">
                {c.title}
              </h4>
              <div className="text-xs text-[#5C4E4B] flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#B38F4D] shrink-0" />
                <span className="truncate">{c.venue}</span>
              </div>
              {c.dressCode && (
                <div className="text-[11px] text-[#8C7E7A] line-clamp-1">
                  Theme: {c.dressCode}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wedding Tasks Readiness */}
      <div className="p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-serif font-bold text-base text-[#2D2422]">
              Wedding Preparation Tasks ({weddingTasks.length})
            </h4>
            <p className="text-xs text-[#7A6B68]">
              Critical milestones for baraat, decor, mandap, and reception
            </p>
          </div>
          <span className="text-xs font-semibold text-[#8C6D34]">
            {weddingTaskCompletionPercent}% Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
          {weddingTasks.map(t => (
            <div
              key={t.id}
              className="p-3 rounded-2xl border border-[#EFE8DD] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
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
                <div className="min-w-0">
                  <div className={`font-semibold truncate ${t.status === 'completed' ? 'line-through text-[#8C7E7A]' : 'text-[#2D2422]'}`}>
                    {t.title}
                  </div>
                  <div className="text-[10px] text-[#7A6B68]">
                    Assigned: {t.assignedToName}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#7A6B68] shrink-0 font-medium">
                Due {formatDate(t.dueDate)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
