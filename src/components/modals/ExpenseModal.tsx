import React, { useState, useEffect } from 'react';
import { Expense, EventType, Vendor } from '../../types/index.ts';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { fileToDataUrl, formatINR } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<Expense>) => Promise<void>;
  expense?: Expense | null;
  vendors?: Vendor[];
  defaultEvent?: EventType;
}

const CATEGORIES = [
  'Venue and decoration',
  'Catering and food',
  'Photography and videography',
  'Outfits and accessories',
  'Jewellery',
  'Makeup and grooming',
  'Invitations and printing',
  'Gifts and return gifts',
  'Travel and accommodation',
  'Entertainment and music',
  'Rituals and ceremonies',
  'Miscellaneous expenses',
];

const PAYMENT_METHODS = [
  'UPI (Google Pay / PhonePe)',
  'Bank Transfer (NEFT / RTGS)',
  'Credit / Debit Card',
  'Cash',
  'Cheque',
  'Other',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expense,
  vendors = [],
  defaultEvent = 'wedding',
}) => {
  const [title, setTitle] = useState('');
  const [event, setEvent] = useState<EventType>(defaultEvent);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [plannedAmount, setPlannedAmount] = useState<number>(0);
  const [actualAmount, setActualAmount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'partially_paid' | 'paid'>('pending');
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setTitle(expense.title || '');
      setEvent(expense.event || 'wedding');
      setCategory(expense.category || CATEGORIES[0]);
      setPlannedAmount(expense.plannedAmount || 0);
      setActualAmount(expense.actualAmount || 0);
      setAmountPaid(expense.amountPaid || 0);
      setPaymentStatus(expense.paymentStatus || 'pending');
      setVendorId(expense.vendorId || '');
      setVendorName(expense.vendorName || '');
      setPaymentDate(expense.paymentDate ? expense.paymentDate.split('T')[0] : '');
      setPaymentMethod(expense.paymentMethod || PAYMENT_METHODS[0]);
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receiptUrl || '');
      setResponsiblePerson(expense.responsiblePerson || '');
    } else {
      setTitle('');
      setEvent(defaultEvent);
      setCategory(CATEGORIES[0]);
      setPlannedAmount(0);
      setActualAmount(0);
      setAmountPaid(0);
      setPaymentStatus('pending');
      setVendorId('');
      setVendorName('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setNotes('');
      setReceiptUrl('');
      setResponsiblePerson('');
    }
  }, [expense, defaultEvent, isOpen]);

  // Handle amount paid changes to auto-update payment status
  const handleAmountPaidChange = (val: number) => {
    setAmountPaid(val);
    const target = actualAmount || plannedAmount;
    if (val >= target && target > 0) {
      setPaymentStatus('paid');
    } else if (val > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  };

  const handleVendorSelect = (vId: string) => {
    setVendorId(vId);
    if (!vId) {
      setVendorName('');
      return;
    }
    const found = vendors.find(v => v.id === vId);
    if (found) {
      setVendorName(found.name);
      if (!actualAmount) setActualAmount(found.agreedAmount || found.quotedAmount);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReceipt(true);
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadImage(dataUrl, file.name);
      setReceiptUrl(res.url);
    } catch (err: any) {
      alert(err.message || 'Receipt upload failed');
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (!isOpen) return null;

  const remaining = Math.max(0, (actualAmount || plannedAmount) - amountPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter an expense title.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        title: title.trim(),
        event,
        category,
        plannedAmount: Number(plannedAmount) || 0,
        actualAmount: Number(actualAmount) || Number(plannedAmount) || 0,
        amountPaid: Number(amountPaid) || 0,
        remainingAmount: remaining,
        paymentStatus,
        vendorId: vendorId || undefined,
        vendorName: vendorName.trim() || undefined,
        paymentDate: paymentDate || undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        responsiblePerson: responsiblePerson.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D2]">
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            {expense ? 'Edit Expense Record' : 'Log New Expense'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Expense Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Wedding Mandap Decor Advance"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Event Ceremony
              </label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value as EventType)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="engagement">Engagement</option>
                <option value="wedding">Wedding</option>
                <option value="haldi">Haldi</option>
                <option value="mehendi">Mehendi</option>
                <option value="sangeet">Sangeet</option>
                <option value="reception">Reception</option>
                <option value="other">Other Ceremony</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Expense Category
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
          </div>

          {/* Amount Calculation Trio */}
          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EFE8DD] grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Planned Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={plannedAmount || ''}
                onChange={(e) => setPlannedAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Actual Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={actualAmount || ''}
                onChange={(e) => setActualAmount(Number(e.target.value))}
                placeholder="0"
                required
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none font-semibold text-[#8C6D34]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5C4E4B] mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                value={amountPaid || ''}
                onChange={(e) => handleAmountPaidChange(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div className="col-span-3 pt-2 border-t border-[#E8DEC8]/60 flex items-center justify-between text-xs">
              <span className="text-[#7A6B68]">Remaining Outstanding:</span>
              <span className={`font-semibold ${remaining > 0 ? 'text-[#A63A50]' : 'text-[#166534]'}`}>
                {formatINR(remaining)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Link to Registered Vendor
              </label>
              <select
                value={vendorId}
                onChange={(e) => handleVendorSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              >
                <option value="">None / Independent Payee</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Payee / Vendor Name
              </label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Vendor or recipient"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Person Responsible
              </label>
              <input
                type="text"
                value={responsiblePerson}
                onChange={(e) => setResponsiblePerson(e.target.value)}
                placeholder="e.g. Groom / Bride / Father of Groom"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
              />
            </div>
          </div>

          {/* Receipt / Invoice Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Receipt or Invoice Image (JPG, PNG, WebP)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-[#E5DFD7] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#5C4E4B] cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-[#B38F4D]" />
                <span>{uploadingReceipt ? 'Uploading...' : 'Choose File'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>

              {receiptUrl && (
                <div className="flex items-center gap-1.5 text-xs text-[#166534]">
                  <CheckCircle2 className="w-4 h-4" />
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">
                    Receipt uploaded
                  </a>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Notes & Inclusions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Milestone payments, GST invoice number, items included..."
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
              {loading ? 'Saving...' : 'Save Expense Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
