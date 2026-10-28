import React, { useState, useEffect } from 'react';
import { Vendor, EventType, VendorStatus } from '../../types/index.ts';
import { X, Upload, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { fileToDataUrl, formatINR } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendor: Partial<Vendor>) => Promise<void>;
  vendor?: Vendor | null;
}

const CATEGORIES = [
  'Venue & Banquet',
  'Decor & Production',
  'Catering & Beverage',
  'Photography & Cinema',
  'Outfits & Wardrobe',
  'Jewellery',
  'Makeup & Styling',
  'Invitations & Gifts',
  'Music & Entertainment',
  'Hospitality & Transport',
  'Pandit & Rituals',
  'Event Management',
];

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vendor,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [quotedAmount, setQuotedAmount] = useState<number>(0);
  const [agreedAmount, setAgreedAmount] = useState<number>(0);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [event, setEvent] = useState<EventType | 'all'>('wedding');
  const [bookingStatus, setBookingStatus] = useState<VendorStatus>('in_discussion');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name || '');
      setCategory(vendor.category || CATEGORIES[0]);
      setContactPerson(vendor.contactPerson || '');
      setMobile(vendor.mobile || '');
      setEmail(vendor.email || '');
      setQuotedAmount(vendor.quotedAmount || 0);
      setAgreedAmount(vendor.agreedAmount || 0);
      setAdvancePaid(vendor.advancePaid || 0);
      setAmountPaid(vendor.amountPaid || 0);
      setEvent(vendor.event || 'wedding');
      setBookingStatus(vendor.bookingStatus || 'in_discussion');
      setAttachmentUrl(vendor.attachmentUrl || '');
      setNotes(vendor.notes || '');
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setContactPerson('');
      setMobile('');
      setEmail('');
      setQuotedAmount(0);
      setAgreedAmount(0);
      setAdvancePaid(0);
      setAmountPaid(0);
      setEvent('wedding');
      setBookingStatus('in_discussion');
      setAttachmentUrl('');
      setNotes('');
    }
  }, [vendor, isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadImage(dataUrl, file.name);
      setAttachmentUrl(res.url);
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const targetAgreed = agreedAmount || quotedAmount;
  const balanceDue = Math.max(0, targetAgreed - amountPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a vendor business name.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        name: name.trim(),
        category,
        contactPerson: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        quotedAmount: Number(quotedAmount) || 0,
        agreedAmount: Number(agreedAmount) || Number(quotedAmount) || 0,
        advancePaid: Number(advancePaid) || 0,
        amountPaid: Number(amountPaid) || Number(advancePaid) || 0,
        balanceDue,
        event,
        bookingStatus,
        attachmentUrl: attachmentUrl || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D2]">
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            {vendor ? 'Edit Vendor Directory' : 'Add New Vendor'}
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
              Vendor / Agency Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MemoryCanvas Studios / Virasat Decor"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Service Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Manager / Proprietor"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9819922334"
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
                  placeholder="vendor@example.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Pricing & Advance Details */}
          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EFE8DD] grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Quoted Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={quotedAmount || ''}
                onChange={(e) => setQuotedAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Agreed Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={agreedAmount || ''}
                onChange={(e) => setAgreedAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none font-semibold text-[#8C6D34]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Total Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div className="col-span-3 pt-2 border-t border-[#E8DEC8]/60 flex items-center justify-between text-xs">
              <span className="text-[#7A6B68]">Outstanding Balance:</span>
              <span className={`font-semibold ${balanceDue > 0 ? 'text-[#A63A50]' : 'text-[#166534]'}`}>
                {formatINR(balanceDue)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Booking Status
              </label>
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value as VendorStatus)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="in_discussion">In Discussion</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="booked">Booked (Confirmed)</option>
                <option value="completed">Completed / Settled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Associated Event
              </label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="wedding">Wedding</option>
                <option value="engagement">Engagement</option>
                <option value="haldi">Haldi</option>
                <option value="mehendi">Mehendi</option>
                <option value="sangeet">Sangeet</option>
                <option value="reception">Reception</option>
                <option value="all">Entire Celebration</option>
              </select>
            </div>
          </div>

          {/* Contract / Quotation Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Contract or Quotation File
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-[#E5DFD7] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#5C4E4B] cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[#B38F4D]" />
                <span>{uploading ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {attachmentUrl && (
                <div className="flex items-center gap-1.5 text-xs text-[#166534]">
                  <CheckCircle2 className="w-4 h-4" />
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">
                    Contract attached
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Deliverables & Agreement Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms of payment, hours of service, cancellation policy..."
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
              {loading ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
