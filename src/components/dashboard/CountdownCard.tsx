import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Wallet, CheckCircle2, Edit3, Clock, Sparkles } from 'lucide-react';
import { calculateCountdown, CountdownState, formatINR, formatDateTime } from '../../lib/utils.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface CountdownCardProps {
  title: string;
  eventType: 'engagement' | 'wedding' | 'other';
  targetDate: string;
  venue: string;
  budgetSpent: number;
  budgetAllocated: number;
  taskCompletionPercent: number;
  onEdit?: () => void;
  accentColor?: 'gold' | 'rose' | 'amber';
}

export const CountdownCard: React.FC<CountdownCardProps> = ({
  title,
  eventType,
  targetDate,
  venue,
  budgetSpent,
  budgetAllocated,
  taskCompletionPercent,
  onEdit,
  accentColor = 'gold',
}) => {
  const { canEditEvents } = useAuth();
  const [countdown, setCountdown] = useState<CountdownState>(() => calculateCountdown(targetDate));

  useEffect(() => {
    // Immediate calculation
    setCountdown(calculateCountdown(targetDate));

    // Update every second
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const borderStyles =
    accentColor === 'rose'
      ? 'border-[#F0C9CD] hover:border-[#E8A5AC]'
      : 'border-[#E8DEC8] hover:border-[#D4AF37]/50';

  const headerGradient =
    accentColor === 'rose'
      ? 'from-[#FDF2F4] to-[#FFFDF9]'
      : 'from-[#FAF5EB] to-[#FFFDF9]';

  const badgeColor =
    accentColor === 'rose'
      ? 'text-[#A63A50] bg-[#FDF2F4] border-[#F0C9CD]'
      : 'text-[#8C6D34] bg-[#FAF5EB] border-[#E8DEC8]';

  return (
    <div
      className={`relative bg-[#FFFDF9] rounded-2xl border ${borderStyles} shadow-sm overflow-hidden transition-all duration-300 flex flex-col`}
    >
      {/* Top Header */}
      <div className={`p-4 md:p-5 bg-gradient-to-r ${headerGradient} border-b border-[#F0E6D2] flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DEC8] flex items-center justify-center text-[#B38F4D] shadow-2xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-[#7A6B68]">
              <Clock className="w-3 h-3 text-[#B38F4D]" />
              <span>{formatDateTime(targetDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor} uppercase tracking-wider`}>
            {eventType}
          </span>
          {canEditEvents && onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-[#8C7E7A] hover:text-[#2D2422] hover:bg-white border border-transparent hover:border-[#E8DEC8] transition cursor-pointer"
              title="Edit event date & venue"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="p-5 md:p-6 text-center border-b border-[#F5EFE6]">
        {!countdown.isSet ? (
          <div className="py-4 px-3 bg-[#FAF5EB]/50 rounded-xl border border-dashed border-[#D4AF37]/50 text-center">
            <Calendar className="w-6 h-6 text-[#B38F4D] mx-auto mb-1.5 opacity-80" />
            <div className="font-serif font-bold text-sm text-[#2D2422]">
              Date & Venue Not Scheduled Yet
            </div>
            <p className="text-xs text-[#7A6B68] mt-0.5">
              Set ceremony date, time, and venue whenever you are ready
            </p>
            {onEdit && (
              <button
                onClick={onEdit}
                className="mt-2.5 px-3 py-1 rounded-lg bg-[#D4AF37] text-white text-[11px] font-semibold hover:brightness-105 transition cursor-pointer inline-flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>Schedule Ceremony</span>
              </button>
            )}
          </div>
        ) : countdown.isPassed ? (
          <div className="py-4 px-3 bg-[#FAF5EB]/60 rounded-xl border border-[#E8DEC8] text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#EEDB96]/30 text-[#8C6D34] mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-serif font-bold text-lg text-[#2D2422]">
              Happily Celebrated!
            </div>
            <p className="text-xs text-[#7A6B68] mt-0.5">
              This beautiful chapter was joyfully marked on {formatDateTime(targetDate)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 md:gap-3">
            <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] flex flex-col items-center shadow-2xs">
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#2D2422] tracking-tight">
                {String(countdown.days).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#8C7E7A] tracking-wider mt-0.5">
                Days
              </span>
            </div>

            <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] flex flex-col items-center shadow-2xs">
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#2D2422] tracking-tight">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#8C7E7A] tracking-wider mt-0.5">
                Hours
              </span>
            </div>

            <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] flex flex-col items-center shadow-2xs">
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#2D2422] tracking-tight">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#8C7E7A] tracking-wider mt-0.5">
                Mins
              </span>
            </div>

            <div className="p-2 sm:p-2.5 md:p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] flex flex-col items-center shadow-2xs">
              <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#B38F4D] tracking-tight animate-pulse">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-[#8C7E7A] tracking-wider mt-0.5">
                Secs
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Details Footer: Venue, Budget, Tasks */}
      <div className="p-4 md:p-5 space-y-3 bg-[#FFFDF9] flex-1 flex flex-col justify-between text-xs">
        {/* Venue */}
        <div className="flex items-start gap-2 text-[#5C4E4B]">
          <MapPin className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
          <span className="font-medium line-clamp-1">{venue || 'Venue to be confirmed'}</span>
        </div>

        {/* Budget Summary */}
        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EFE8DD] space-y-1.5">
          <div className="flex items-center justify-between text-[#7A6B68]">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#B38F4D]" />
              <span>Budget Spent</span>
            </span>
            <span className="font-semibold text-[#2D2422]">
              {formatINR(budgetSpent)} / {formatINR(budgetAllocated)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#E8DEC8]/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetAllocated > 0 && budgetSpent > budgetAllocated
                  ? 'bg-[#A63A50]'
                  : 'bg-gradient-to-r from-[#D4AF37] to-[#B38F4D]'
              }`}
              style={{
                width: `${budgetAllocated > 0 ? Math.min(100, Math.round((budgetSpent / budgetAllocated) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Task Completion Percentage */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[#7A6B68] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
            <span>Task Readiness</span>
          </span>
          <span className="font-semibold text-[#2D2422]">
            {taskCompletionPercent}% Completed
          </span>
        </div>
      </div>
    </div>
  );
};
