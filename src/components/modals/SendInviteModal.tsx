import React, { useState } from 'react';
import { Guest, InvitationCard } from '../../types/index.ts';
import { X, Upload, Send, MessageCircle, Check, Users, Sparkles, Image as ImageIcon } from 'lucide-react';
import { fileToDataUrl } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';

interface SendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  guests: Guest[];
  invitationCards: InvitationCard[];
  onUploadCard: (card: { title: string; imageUrl: string; event: string; messageTemplate?: string }) => Promise<any>;
  onSend: (payload: { guestIds: string[]; invitationCardId?: string; channel?: string; customMessage?: string }) => Promise<any>;
}

export const SendInviteModal: React.FC<SendInviteModalProps> = ({
  isOpen,
  onClose,
  guests,
  invitationCards,
  onUploadCard,
  onSend,
}) => {
  const { data } = useWeddingData();
  const [selectedCardId, setSelectedCardId] = useState<string>(invitationCards[0]?.id || '');
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState(
    'Namaste! With joy in our hearts, we cordially invite you to celebrate our wedding. Your presence and blessings will make our special day truly memorable.'
  );
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'digital'>('whatsapp');
  const [filterSide, setFilterSide] = useState<'all' | 'groom' | 'bride' | 'mutual'>('all');

  // New card upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentCard = invitationCards.find(c => c.id === selectedCardId) || invitationCards[0];

  const filteredGuests = guests.filter(g => {
    if (filterSide === 'all') return true;
    return g.side === filterSide;
  });

  const handleSelectAll = () => {
    if (selectedGuestIds.length === filteredGuests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(filteredGuests.map(g => g.id));
    }
  };

  const toggleGuest = (id: string) => {
    setSelectedGuestIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png') && !file.type.includes('image/webp')) {
      alert('Please upload a valid JPG, JPEG, PNG, or WebP invitation card image.');
      return;
    }

    try {
      setUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const uploadRes = await api.uploadImage(dataUrl, file.name);

      const newCard = await onUploadCard({
        title: uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: uploadRes.url,
        event: 'wedding',
        messageTemplate: customMessage,
      });

      setSelectedCardId(newCard.id);
      setUploadTitle('');
      setStatusMessage('Invitation card uploaded successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload card');
    } finally {
      setUploading(false);
    }
  };

  const handleDispatch = async () => {
    if (selectedGuestIds.length === 0) {
      alert('Please select at least one guest to receive the invitation.');
      return;
    }

    try {
      setSending(true);
      const res = await onSend({
        guestIds: selectedGuestIds,
        invitationCardId: selectedCardId,
        channel: channel === 'whatsapp' ? 'WhatsApp & SMS' : channel === 'email' ? 'Email Dispatch' : 'Digital Portal',
        customMessage,
      });

      alert(`Success! Invitations dispatched to ${res.sentCount} guests.`);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch invitations');
    } finally {
      setSending(false);
    }
  };

  // WhatsApp quick link for first selected guest
  const previewGuest = guests.find(g => selectedGuestIds.includes(g.id)) || guests[0];
  const groomName = data?.coupleProfile?.groom?.name || 'Groom';
  const brideName = data?.coupleProfile?.bride?.name || 'Bride';
  const weddingDate = data?.coupleProfile?.weddingDate ? new Date(data.coupleProfile.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const venue = data?.coupleProfile?.weddingVenue || '';

  const waText = encodeURIComponent(
    `*Wedding Invitation: ${groomName} & ${brideName}*\n\nDear ${previewGuest?.name || 'Guest'},\n\n${customMessage}\n\n*Date:* ${weddingDate}\n*Venue:* ${venue}\n\nView Card: ${window.location.origin}${currentCard?.imageUrl || ''}`
  );
  const waUrl = previewGuest?.mobile ? `https://wa.me/91${previewGuest.mobile.replace(/\D/g, '')}?text=${waText}` : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#F0E6D2]">
          <div>
            <h3 className="font-serif font-bold text-lg md:text-xl text-[#2D2422]">
              Send Wedding Invitations
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Upload your custom invitation card (JPG/PNG) & dispatch to selective or all guests
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
            {statusMessage}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Left Column: Card Selection & Upload (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1.5">
                Upload New Invitation Card (JPG/PNG)
              </label>
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-dashed border-[#D4AF37]/50 text-center">
                <input
                  type="text"
                  placeholder="Card Title (e.g. Royal Gold Invitation)"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full mb-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
                <label className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Processing Image...' : 'Choose JPG / PNG from Device'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCardUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Existing Cards Selector */}
            {invitationCards.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1.5">
                  Select Card Design Template
                </label>
                <div className="space-y-2">
                  {invitationCards.map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedCardId(c.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition ${
                        selectedCardId === c.id
                          ? 'border-[#D4AF37] bg-[#FAF5EB] shadow-2xs'
                          : 'border-[#E5DFD7] bg-white hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <img
                        src={c.imageUrl}
                        alt={c.title}
                        className="w-12 h-12 rounded-lg object-cover border border-[#E8DEC8]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#2D2422] truncate">{c.title}</div>
                        <div className="text-[10px] text-[#8C7E7A] uppercase">{c.event} card</div>
                      </div>
                      {selectedCardId === c.id && (
                        <div className="w-5 h-5 rounded-full bg-[#D4AF37] text-white flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Live Preview */}
            {currentCard && (
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E8DEC8]">
                <div className="text-[11px] font-semibold text-[#8C6D34] mb-1.5">
                  Invitation Preview
                </div>
                <div className="relative rounded-xl overflow-hidden shadow-xs border border-[#E8DEC8]">
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                    <div className="text-[11px] tracking-wider uppercase font-semibold text-[#EEDB96]">
                      Cordially Invited
                    </div>
                    <div className="text-xs font-bold truncate">
                      {previewGuest?.name || 'Honored Guest'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Guest Picker & Dispatch Options (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {/* Filter & Select All toolbar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#5C4E4B]">
                  Select Guests ({selectedGuestIds.length} of {filteredGuests.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-[#B38F4D] hover:underline"
                >
                  {selectedGuestIds.length === filteredGuests.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#FAF5EB] rounded-xl border border-[#E8DEC8] mb-2 text-xs">
                {(['all', 'groom', 'bride', 'mutual'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFilterSide(s)}
                    className={`flex-1 py-1 px-2 rounded-lg capitalize transition ${
                      filterSide === s ? 'bg-white font-semibold text-[#2D2422] shadow-2xs' : 'text-[#7A6B68]'
                    }`}
                  >
                    {s === 'all' ? 'All' : `${s} side`}
                  </button>
                ))}
              </div>

              {/* Guest Checkbox List */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white rounded-xl border border-[#E5DFD7]">
                {filteredGuests.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#8C7E7A]">
                    No guests found in this category.
                  </div>
                ) : (
                  filteredGuests.map(g => {
                    const isSelected = selectedGuestIds.includes(g.id);
                    return (
                      <div
                        key={g.id}
                        onClick={() => toggleGuest(g.id)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isSelected ? 'bg-[#FAF5EB] border-[#D4AF37]' : 'border-[#F0E6D2] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-[#D4AF37] w-3.5 h-3.5"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-[#2D2422]">{g.name}</span>
                            <span className="text-[10px] text-[#7A6B68] ml-2">({g.headcount} pax · {g.mobile})</span>
                          </div>
                        </div>

                        {g.invitationSent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#166534] font-medium border border-[#BBF7D0]">
                            Sent
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Custom Invitation Message */}
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                Custom Invitation Message
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none resize-none"
              />
            </div>

            {/* Channel Options */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  channel === 'whatsapp' ? 'bg-[#FAF5EB] border-[#D4AF37] font-semibold text-[#8C6D34]' : 'bg-white border-[#E5DFD7] text-[#7A6B68]'
                }`}
              >
                <MessageCircle className="w-4 h-4 mx-auto mb-1 text-[#25D366]" />
                <div className="text-xs">WhatsApp & SMS</div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  channel === 'email' ? 'bg-[#FAF5EB] border-[#D4AF37] font-semibold text-[#8C6D34]' : 'bg-white border-[#E5DFD7] text-[#7A6B68]'
                }`}
              >
                <Send className="w-4 h-4 mx-auto mb-1 text-[#3B82F6]" />
                <div className="text-xs">Email Invite</div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('digital')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  channel === 'digital' ? 'bg-[#FAF5EB] border-[#D4AF37] font-semibold text-[#8C6D34]' : 'bg-white border-[#E5DFD7] text-[#7A6B68]'
                }`}
              >
                <Sparkles className="w-4 h-4 mx-auto mb-1 text-[#D4AF37]" />
                <div className="text-xs">Digital Portal</div>
              </button>
            </div>

            {/* One-Click WhatsApp Direct Share */}
            {previewGuest && previewGuest.mobile && (
              <div className="p-2.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#166534]">Direct WhatsApp Link</div>
                  <div className="text-[11px] text-[#15803D]">
                    Open WhatsApp for {previewGuest.name} ({previewGuest.mobile})
                  </div>
                </div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1 px-3 rounded-lg bg-[#25D366] text-white font-medium hover:brightness-105 transition"
                >
                  Open WhatsApp
                </a>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-[#F0E6D2]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#E5DFD7] text-xs font-medium text-[#5C4E4B] hover:bg-[#FAF8F5] transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={sending || selectedGuestIds.length === 0}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Dispatching...' : `Send to ${selectedGuestIds.length} Guests`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
