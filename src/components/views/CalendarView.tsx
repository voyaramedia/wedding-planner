import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { WeddingEvent } from '../../types/index.ts';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDate, formatTime } from '../../lib/utils.ts';

interface CalendarViewProps {
  onAddEvent: () => void;
  onEditEvent: (event: WeddingEvent) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onAddEvent,
  onEditEvent,
}) => {
  const { data, deleteEvent } = useWeddingData();
  const { canEditEvents } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');

  const events = data?.events || [];
  const tasks = data?.tasks || [];
  const vendors = data?.vendors || [];

  const filteredEvents = events.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    return true;
  }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Celebration Calendar & Schedules
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Complete ceremony timeline, task milestones, and vendor settlement dates
          </p>
        </div>

        {canEditEvents && (
          <button
            onClick={onAddEvent}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ceremony Schedule</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E8DEC8] rounded-2xl overflow-x-auto text-xs max-w-xl">
        {['all', 'engagement', 'haldi', 'mehendi', 'sangeet', 'wedding', 'reception'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`py-1.5 px-3 rounded-xl capitalize transition shrink-0 ${
              filterType === type
                ? 'bg-[#FAF5EB] font-semibold text-[#8C6D34] shadow-2xs border border-[#E8DEC8]'
                : 'text-[#7A6B68] hover:text-[#2D2422]'
            }`}
          >
            {type === 'all' ? 'All Ceremonies' : type}
          </button>
        ))}
      </div>

      {/* Timeline Itinerary Cards */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8C7E7A] bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8]">
            No ceremonies scheduled in this category.
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const dateObj = new Date(evt.dateTime);
            const isPast = dateObj.getTime() < Date.now();
            return (
              <div
                key={evt.id}
                className="p-5 md:p-6 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37]/50 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-16 h-16 rounded-2xl bg-[#FAF5EB] border border-[#E8DEC8] flex flex-col items-center justify-center shrink-0 text-center shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#8C6D34]">
                      {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span className="font-serif text-2xl font-bold text-[#2D2422] leading-none">
                      {dateObj.getDate()}
                    </span>
                    <span className="text-[9px] text-[#A89A96]">
                      {dateObj.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                        {evt.title}
                      </h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                        {evt.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C4E4B]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#B38F4D]" />
                        <span>{formatTime(evt.dateTime)} {evt.endDateTime ? `– ${formatTime(evt.endDateTime)}` : ''}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>{evt.venue}</span>
                      </span>
                    </div>

                    {evt.dressCode && (
                      <div className="text-xs text-[#7A6B68]">
                        <strong className="text-[#5C4E4B]">Dress Code:</strong> {evt.dressCode}
                      </div>
                    )}

                    {evt.notes && (
                      <p className="text-xs text-[#7A6B68] italic line-clamp-2">
                        "{evt.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {canEditEvents && (
                    <>
                      <button
                        onClick={() => onEditEvent(evt)}
                        className="py-1.5 px-3 rounded-xl border border-[#E5DFD7] text-xs font-semibold text-[#5C4E4B] hover:bg-[#FAF8F5] transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`Delete ceremony "${evt.title}"?`)) {
                            await deleteEvent(evt.id);
                          }
                        }}
                        className="p-1.5 rounded-xl border border-[#E5DFD7] text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
