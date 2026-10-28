import React, { useState, useEffect } from 'react';
import { WeddingEvent, EventType } from '../../types/index.ts';
import { X, Calendar, MapPin, Clock, AlignLeft, User, Trash2, AlertCircle } from 'lucide-react';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<WeddingEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  event?: WeddingEvent | null;
  defaultType?: EventType;
}

function toSafeIso(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString();
  
  // Parse formats like DD-MM-YYYY HH:mm or DD/MM/YYYY HH:mm
  const m = val.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const h = m[4] ? parseInt(m[4], 10) : 0;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    const parsed = new Date(year, month, day, h, min);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return val;
}

function toInputDateTime(val?: string): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
  } catch (e) {}
  return val.slice(0, 16);
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  defaultType = 'wedding',
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>(defaultType);
  const [dateTime, setDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [personResponsible, setPersonResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || (event.type === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony'));
      setType(event.type || 'wedding');
      setDateTime(toInputDateTime(event.dateTime));
      setEndDateTime(toInputDateTime(event.endDateTime));
      setVenue(event.venue || '');
      setAddress(event.address || '');
      setDressCode(event.dressCode || '');
      setPersonResponsible(event.personResponsible || '');
      setNotes(event.notes || '');
    } else {
      setTitle(defaultType === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Vivah');
      setType(defaultType);
      setDateTime('');
      setEndDateTime('');
      setVenue('');
      setAddress('');
      setDressCode('');
      setPersonResponsible('');
      setNotes('');
    }
    setError(null);
  }, [event, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const safeTitle = title.trim() || (type === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony');
    if (!dateTime || !venue.trim()) {
      setError('Please provide ceremony date & time and venue name.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        title: safeTitle,
        type,
        dateTime: toSafeIso(dateTime),
        endDateTime: endDateTime ? toSafeIso(endDateTime) : undefined,
        venue: venue.trim(),
        address: address.trim() || undefined,
        dressCode: dressCode.trim() || undefined,
        personResponsible: personResponsible.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving ceremony:', err);
      setError(err.message || 'Failed to save event. Please check the date and details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${title || event.title}"?`)) return;

    try {
      setDeleting(true);
      setError(null);
      await onDelete(event.id);
      onClose();
    } catch (err: any) {
      console.error('Error deleting ceremony:', err);
      setError(err.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            {event ? 'Edit Ceremony / Event' : 'Add New Ceremony'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-[#FDF2F4] border border-[#F0C9CD] text-[#A63A50] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#A63A50]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Ceremony / Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ring Ceremony, Sangeet Night, Reception"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Event Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="engagement">Engagement</option>
                <option value="wedding">Wedding (Pheras)</option>
                <option value="haldi">Haldi</option>
                <option value="mehendi">Mehendi</option>
                <option value="sangeet">Sangeet</option>
                <option value="reception">Reception</option>
                <option value="other">Other Ceremony</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Responsible Person
              </label>
              <input
                type="text"
                value={personResponsible}
                onChange={(e) => setPersonResponsible(e.target.value)}
                placeholder="e.g. Family or Coordinator"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Venue Name *
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Palace Courtyard, Royal Gardens"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Full Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Lake Pichola, Udaipur"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Dress Code / Theme
            </label>
            <input
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="e.g. Traditional Gold & Pastel"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Notes & Special Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Muhurat details, coordinator contact, seating plans..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-[#F0E6D2]">
            {event && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="py-2 px-3 rounded-xl border border-[#F0C9CD] text-xs font-medium text-[#A63A50] hover:bg-[#FDF2F4] transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-[#E5DFD7] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF8F5] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Ceremony'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
