import React, { useState, useEffect } from 'react';
import { Guest, GuestSide, RSVPStatus } from '../../types/index.ts';
import { X, Users, Phone, Mail, Utensils } from 'lucide-react';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guest: Partial<Guest>) => Promise<void>;
  guest?: Guest | null;
}

const CEREMONIES = [
  { id: 'engagement', label: 'Engagement' },
  { id: 'haldi', label: 'Haldi' },
  { id: 'mehendi', label: 'Mehendi' },
  { id: 'sangeet', label: 'Sangeet' },
  { id: 'wedding', label: 'Wedding (Pheras)' },
  { id: 'reception', label: 'Reception' },
];

export const GuestModal: React.FC<GuestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  guest,
}) => {
  const [name, setName] = useState('');
  const [side, setSide] = useState<GuestSide>('groom');
  const [relation, setRelation] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [headcount, setHeadcount] = useState<number>(2);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>('pending');
  const [dietary, setDietary] = useState('Vegetarian');
  const [eventsInvited, setEventsInvited] = useState<string[]>(['engagement', 'wedding']);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (guest) {
      setName(guest.name || '');
      setSide(guest.side || 'groom');
      setRelation(guest.relation || '');
      setMobile(guest.mobile || '');
      setEmail(guest.email || '');
      setHeadcount(guest.headcount || 1);
      setRsvpStatus(guest.rsvpStatus || 'pending');
      setDietary(guest.dietary || 'Vegetarian');
      setEventsInvited(guest.eventsInvited || ['engagement', 'wedding']);
      setNotes(guest.notes || '');
    } else {
      setName('');
      setSide('groom');
      setRelation('');
      setMobile('');
      setEmail('');
      setHeadcount(2);
      setRsvpStatus('pending');
      setDietary('Vegetarian');
      setEventsInvited(['wedding', 'reception']);
      setNotes('');
    }
  }, [guest, isOpen]);

  if (!isOpen) return null;

  const toggleEvent = (eventId: string) => {
    setEventsInvited(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      alert('Guest name and mobile number are required.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        name: name.trim(),
        side,
        relation: relation.trim() || undefined,
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        headcount: Number(headcount) || 1,
        rsvpStatus,
        dietary: dietary.trim() || 'Vegetarian',
        eventsInvited,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D2]">
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            {guest ? 'Edit Guest Details' : 'Add Guest to List'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Guest / Family Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Rajesh & Sunita Verma"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Side *
              </label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as GuestSide)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="groom">Groom's Side</option>
                <option value="bride">Bride's Side</option>
                <option value="mutual">Mutual Friends & Colleagues</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Relation / Circle
              </label>
              <input
                type="text"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Maternal Uncle, College Friend"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9820011223"
                  required
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                />
                <Phone className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Headcount (Pax) *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none font-semibold text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                RSVP Status
              </label>
              <select
                value={rsvpStatus}
                onChange={(e) => setRsvpStatus(e.target.value as RSVPStatus)}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="pending">Awaiting (Pending)</option>
                <option value="attending">Attending (Confirmed)</option>
                <option value="tentative">Maybe (Tentative)</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Dietary
              </label>
              <select
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Jain Meal">Jain Meal</option>
                <option value="Non-Vegetarian">Non-Veg</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>
          </div>

          {/* Ceremonies Invited Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1.5">
              Events & Ceremonies Invited
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CEREMONIES.map(c => {
                const isChecked = eventsInvited.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleEvent(c.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs text-left transition ${
                      isChecked
                        ? 'bg-[#FAF5EB] border-[#D4AF37] text-[#8C6D34] font-medium'
                        : 'bg-white border-[#E5DFD7] text-[#7A6B68] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                      isChecked ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : 'border-[#AAA09D]'
                    }`}>
                      {isChecked && <span className="text-[10px] leading-none">✓</span>}
                    </div>
                    <span className="truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Accommodation & Special Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Room preference, flight arrival timings, pick-up needed..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#F0E6D2]">
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
              {loading ? 'Saving...' : 'Save Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
