import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Guest, GuestSide, RSVPStatus } from '../../types/index.ts';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Send,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  MessageCircle,
  Edit3,
  Trash2,
  Sparkles,
  Upload,
  FileText,
  ExternalLink,
  Eye,
  Check,
  Share2,
} from 'lucide-react';
import { downloadCSV, fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';

interface GuestsViewProps {
  onAddGuest: () => void;
  onEditGuest: (guest: Guest) => void;
  onOpenSendInvite: () => void;
}

export const GuestsView: React.FC<GuestsViewProps> = ({
  onAddGuest,
  onEditGuest,
  onOpenSendInvite,
}) => {
  const { data, deleteGuest, updateGuest, uploadInvitationCard } = useWeddingData();
  const { canManageGuests } = useAuth();

  const [search, setSearch] = useState('');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterRsvp, setFilterRsvp] = useState<string>('all');
  const [uploadingCard, setUploadingCard] = useState(false);
  const [previewCardModal, setPreviewCardModal] = useState<string | null>(null);
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  const guests = data?.guests || [];
  const invitationCards = data?.invitationCards || [];
  const primaryCard = invitationCards[0];
  const couple = data?.coupleProfile;

  const groomName = couple?.groom?.name || 'Groom';
  const brideName = couple?.bride?.name || 'Bride';
  const weddingTitle = couple?.weddingTitle || 'Our Royal Wedding';
  const weddingDate = couple?.weddingDate ? formatDate(couple.weddingDate) : 'Upcoming Ceremony';
  const weddingVenue = couple?.weddingVenue || 'Wedding Venue';

  const filteredGuests = guests.filter((g) => {
    if (filterSide !== 'all' && g.side !== filterSide) return false;
    if (filterRsvp !== 'all' && g.rsvpStatus !== filterRsvp) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchMobile = (g.mobile || '').includes(q);
      const matchEmail = (g.email || '').toLowerCase().includes(q);
      const matchRelation = (g.relation || '').toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchEmail && !matchRelation) return false;
    }
    return true;
  });

  // Calculate metrics
  const totalGuestsCount = guests.length;
  const totalHeadcount = guests.reduce((sum, g) => sum + (g.headcount || 1), 0);
  const attendingPax = guests
    .filter((g) => g.rsvpStatus === 'attending')
    .reduce((sum, g) => sum + (g.headcount || 1), 0);
  const pendingPax = guests
    .filter((g) => g.rsvpStatus === 'pending')
    .reduce((sum, g) => sum + (g.headcount || 1), 0);
  const invitationsSentCount = guests.filter((g) => g.invitationSent).length;

  const handleExportCSV = () => {
    const headers = [
      'Guest Name',
      'Side',
      'Relation',
      'Mobile Number',
      'Email',
      'Headcount (Pax)',
      'RSVP Status',
      'Dietary Preference',
      'Events Invited',
      'Invitation Sent',
      'Sent At',
      'Dispatch Channel',
      'Notes',
    ];

    const rows = filteredGuests.map((g) => [
      g.name,
      g.side,
      g.relation || '',
      g.mobile,
      g.email || '',
      g.headcount,
      g.rsvpStatus,
      g.dietary || '',
      g.eventsInvited?.join(', ') || '',
      g.invitationSent ? 'Yes' : 'No',
      g.invitationSentAt || '',
      g.invitationMethod || '',
      g.notes || '',
    ]);

    downloadCSV(`wedding_guest_rsvp_list_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // Upload invitation card (Image or PDF)
  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCard(true);
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadFile(dataUrl, file.name);

      await uploadInvitationCard({
        title: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: res.url,
        event: 'wedding',
        messageTemplate: `Namaste! With divine blessings, ${groomName} & ${brideName} cordially invite you to our wedding celebrations.`,
      });

      setDispatchAlert('Invitation card uploaded successfully! Ready for WhatsApp & Email dispatch.');
      setTimeout(() => setDispatchAlert(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload invitation card');
    } finally {
      setUploadingCard(false);
    }
  };

  // 1-Click WhatsApp Invite Dispatch
  const handleSendWhatsApp = async (guest: Guest) => {
    if (!guest.mobile || !guest.mobile.trim()) {
      alert(`No mobile number registered for guest ${guest.name}. Please edit guest details.`);
      return;
    }

    const cleanNumber = guest.mobile.replace(/\D/g, '');
    const phone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    const cardLink = primaryCard
      ? `${window.location.origin}${primaryCard.imageUrl}`
      : `${window.location.origin}`;

    const text =
      `*Wedding Invitation: ${groomName} & ${brideName}* 🌸\n\n` +
      `Dear ${guest.name},\n\n` +
      `With immense joy, we cordially invite you and your family to celebrate our wedding ceremony!\n\n` +
      `📅 *Date:* ${weddingDate}\n` +
      `📍 *Venue:* ${weddingVenue}\n` +
      `👥 *Allocated Seats:* ${guest.headcount} Pax\n\n` +
      `💌 *Digital Invitation Card Link:*\n${cardLink}\n\n` +
      `We eagerly await your gracious presence and blessings!\n\n` +
      `Warm regards,\n*${weddingTitle}*`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');

    try {
      await updateGuest(guest.id, {
        invitationSent: true,
        invitationSentAt: new Date().toISOString(),
        invitationMethod: 'whatsapp',
      });
      setDispatchAlert(`WhatsApp invite dispatched to ${guest.name}!`);
      setTimeout(() => setDispatchAlert(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Email Invite Dispatch
  const handleSendEmail = async (guest: Guest) => {
    if (!guest.email || !guest.email.trim()) {
      alert(`No email address registered for guest ${guest.name}. Please edit guest details.`);
      return;
    }

    const cardLink = primaryCard
      ? `${window.location.origin}${primaryCard.imageUrl}`
      : `${window.location.origin}`;

    const subject = `Wedding Invitation: ${groomName} & ${brideName} - Royal Celebration`;
    const body =
      `Dear ${guest.name},\n\n` +
      `With immense joy and happiness in our hearts, ${groomName} and ${brideName} cordially invite you and your family to celebrate our wedding ceremony.\n\n` +
      `Event: ${weddingTitle}\n` +
      `Date: ${weddingDate}\n` +
      `Venue: ${weddingVenue}\n` +
      `Allocated Seats: ${guest.headcount} Pax\n\n` +
      `Please view our digital invitation card here:\n${cardLink}\n\n` +
      `We look forward to celebrating this special day together and receiving your blessings!\n\n` +
      `Warm regards,\n${groomName} & ${brideName}\n${weddingTitle}`;

    const mailtoUrl = `mailto:${guest.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    try {
      await updateGuest(guest.id, {
        invitationSent: true,
        invitationSentAt: new Date().toISOString(),
        invitationMethod: 'email',
      });
      setDispatchAlert(`Email invitation prepared for ${guest.name}!`);
      setTimeout(() => setDispatchAlert(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Alert toast */}
      {dispatchAlert && (
        <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 text-green-600" />
          <span>{dispatchAlert}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] mb-1">
            <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Digital E-Cards & Guest Roster</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2422]">
            Guest List & E-Invitations
          </h2>
          <p className="text-xs text-[#7A6B68] mt-0.5">
            Manage RSVP counts, upload invitation cards, and send digital invitations via WhatsApp & Email
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#5C4E4B] hover:bg-[#FAF5EB] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#B38F4D]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenSendInvite}
            className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#FAF5EB] border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Bulk Send Invites</span>
          </button>

          {canManageGuests && (
            <button
              onClick={onAddGuest}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guest</span>
            </button>
          )}
        </div>
      </div>

      {/* Invitation Card Upload & Dispatch Center Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF6ED] to-[#FFF8F0] border border-[#D4AF37]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#8C6D34] bg-white px-2.5 py-0.5 rounded-full border border-[#E8DEC8]">
                Digital Invitation Dispatch Center
              </span>
              {primaryCard && (
                <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Card Ready</span>
                </span>
              )}
            </div>

            <h3 className="font-serif font-bold text-lg md:text-xl text-[#2D2422]">
              {primaryCard ? primaryCard.title : 'Upload Wedding Invitation Card / PDF'}
            </h3>
            <p className="text-xs text-[#7A6B68] leading-relaxed">
              Upload your high-resolution invitation card (JPG, PNG, WebP, or PDF). Once uploaded, you can dispatch personalized invitations to every guest on WhatsApp and Email with a single click.
            </p>
          </div>

          {/* Right Action: Card Preview or Upload */}
          <div className="flex items-center gap-3 shrink-0">
            {primaryCard ? (
              <div className="flex items-center gap-2.5">
                <div
                  onClick={() => setPreviewCardModal(primaryCard.imageUrl)}
                  className="w-16 h-20 rounded-xl overflow-hidden border-2 border-[#D4AF37] shadow-sm cursor-pointer group relative bg-black/10"
                >
                  <img
                    src={primaryCard.imageUrl}
                    alt={primaryCard.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewCardModal(primaryCard.imageUrl)}
                    className="block text-xs font-semibold text-[#8C6D34] hover:underline cursor-pointer"
                  >
                    Preview Card
                  </button>

                  <label className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-[#D4AF37] bg-white hover:bg-[#FAF5EB] text-[11px] font-semibold text-[#8C6D34] cursor-pointer shadow-2xs transition">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingCard ? 'Uploading...' : 'Replace Card'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleCardUpload}
                      disabled={uploadingCard}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow-md hover:brightness-105 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{uploadingCard ? 'Uploading...' : 'Upload Invitation Card (JPG/PNG)'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleCardUpload}
                  disabled={uploadingCard}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Headcount Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Total Invited Headcount</div>
          <div className="text-2xl font-serif font-bold text-[#2D2422] mt-1">
            {totalHeadcount} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Pax ({totalGuestsCount} cards)</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Groom & Bride extended circles
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Confirmed Attending</div>
          <div className="text-2xl font-serif font-bold text-[#166534] mt-1">
            {attendingPax} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Pax</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Catering & seating headcount locked
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Awaiting RSVP Response</div>
          <div className="text-2xl font-serif font-bold text-[#B38F4D] mt-1">
            {pendingPax} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Pax</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Follow-up reminders recommended
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8]">
          <div className="text-xs text-[#7A6B68]">Invitations Dispatched</div>
          <div className="text-2xl font-serif font-bold text-[#3B82F6] mt-1">
            {invitationsSentCount} <span className="text-xs font-sans font-normal text-[#8C7E7A]">/ {totalGuestsCount}</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-2">
            Via Digital Card & WhatsApp
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by guest name, mobile, email, or relation..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#9C8F8B] absolute left-3 top-2.5" />
        </div>

        <select
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All Sides</option>
          <option value="groom">Groom's Side</option>
          <option value="bride">Bride's Side</option>
          <option value="mutual">Mutual Friends & Colleagues</option>
        </select>

        <select
          value={filterRsvp}
          onChange={(e) => setFilterRsvp(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
        >
          <option value="all">All RSVP Statuses</option>
          <option value="attending">Attending (Confirmed)</option>
          <option value="pending">Pending Response</option>
          <option value="tentative">Tentative / Maybe</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {/* Guest Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuests.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#8C7E7A] bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8]">
            No guests found matching the selected filters.
          </div>
        ) : (
          filteredGuests.map((g) => (
            <div
              key={g.id}
              className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37]/60 transition shadow-2xs flex flex-col justify-between space-y-3.5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#2D2422]">
                      {g.name}
                    </h4>
                    <div className="text-[11px] text-[#8C6D34] font-medium capitalize mt-0.5">
                      {g.side} side {g.relation && `· ${g.relation}`}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                      g.rsvpStatus === 'attending'
                        ? 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                        : g.rsvpStatus === 'pending'
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                        : 'bg-[#FDF2F4] text-[#A63A50] border-[#F0C9CD]'
                    }`}
                  >
                    {g.rsvpStatus}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-[#5C4E4B]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span className="font-mono">{g.mobile}</span>
                  </div>
                  {g.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#B38F4D]" />
                      <span className="truncate">{g.email}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-[#7A6B68]">
                    Headcount: <strong className="text-[#2D2422]">{g.headcount} Pax</strong> · Meal: {g.dietary || 'Standard'}
                  </div>
                </div>

                {/* Events Invited Badges */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {g.eventsInvited?.map((ev) => (
                    <span
                      key={ev}
                      className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-md bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: WhatsApp & Email 1-Click Dispatch & Edit Actions */}
              <div className="pt-3 border-t border-[#F0E6D2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    {g.invitationSent ? (
                      <span className="text-[10px] font-semibold text-[#166534] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span>
                          {g.invitationMethod === 'whatsapp'
                            ? 'WhatsApp Sent'
                            : g.invitationMethod === 'email'
                            ? 'Email Sent'
                            : 'Invite Sent'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#A63A50] flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>Not Sent Yet</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canManageGuests && (
                      <>
                        <button
                          onClick={() => onEditGuest(g)}
                          className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition"
                          title="Edit guest details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Remove guest "${g.name}"?`)) {
                              await deleteGuest(g.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] transition"
                          title="Delete guest"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 1-Click Action Dispatch Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(g)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-[11px] font-semibold transition cursor-pointer"
                    title="Send WhatsApp Invitation to this guest"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendEmail(g)}
                    disabled={!g.email}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#FAF5EB] hover:bg-[#F3EAD5] border border-[#D4AF37] text-[#8C6D34] text-[11px] font-semibold transition cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    title="Send Email Invitation to this guest"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Card Lightbox Preview Modal */}
      {previewCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/80 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-4 shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base text-[#2D2422]">
                Wedding Invitation Digital Card
              </h3>
              <button
                type="button"
                onClick={() => setPreviewCardModal(null)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                ✕
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewCardModal}
                alt="Invitation Card"
                className="max-h-[65vh] max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
