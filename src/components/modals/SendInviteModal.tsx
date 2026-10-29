import React, { useState, useEffect } from 'react';
import { Guest, InvitationCard, InvitationType } from '../../types/index.ts';
import {
  X,
  Upload,
  Send,
  MessageCircle,
  Mail,
  Check,
  Users,
  Sparkles,
  Image as ImageIcon,
  Calendar,
  MapPin,
  ExternalLink,
  Info,
  CheckCircle2,
  Share2,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  connectGmail,
  disconnectGmail,
  getGmailUser,
  isGmailConnected,
  subscribeGmailAuth,
  buildInvitationEmailContent,
  sendGmailMessage,
} from '../../services/gmailService.ts';

interface SendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  guests: Guest[];
  invitationCards: InvitationCard[];
  onUploadCard: (card: { title: string; imageUrl: string; event: string; messageTemplate?: string }) => Promise<any>;
  onSend: (payload: {
    guestIds: string[];
    invitationCardId?: string;
    channel?: string;
    customMessage?: string;
    invitationType?: string;
    customFunctionName?: string;
  }) => Promise<any>;
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
  const { showToast, confirm } = useToast();

  const [invitationType, setInvitationType] = useState<InvitationType>('wedding');
  const [customFunctionName, setCustomFunctionName] = useState('Haldi & Mehendi');
  const [selectedCardId, setSelectedCardId] = useState<string>(invitationCards[0]?.id || '');
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'digital'>('whatsapp');
  const [filterSide, setFilterSide] = useState<'all' | 'groom' | 'bride' | 'mutual'>('all');

  // Gmail connection state
  const [gmailUser, setGmailUser] = useState<any>(getGmailUser());
  const [isGmailReady, setIsGmailReady] = useState<boolean>(isGmailConnected());
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailProgress, setEmailProgress] = useState<{ current: number; total: number; guestName: string } | null>(null);

  // Upload card state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // Subscribe to Gmail Auth updates
  useEffect(() => {
    const unsubscribe = subscribeGmailAuth((user, token) => {
      setGmailUser(user);
      setIsGmailReady(Boolean(user && token));
    });
    return unsubscribe;
  }, []);

  const couple = data?.coupleProfile;
  const groomName = couple?.groom?.name || 'Groom';
  const brideName = couple?.bride?.name || 'Bride';
  const engagementDate = couple?.engagementDate ? formatDate(couple.engagementDate) : 'Upcoming Ceremony';
  const engagementVenue = couple?.engagementVenue || 'Ceremony Venue';
  const engagementAddress = couple?.engagementAddress || couple?.engagementVenue || 'Ceremony Venue Location';
  const engagementMapLink = couple?.engagementMapLink || '';
  const weddingDate = couple?.weddingDate ? formatDate(couple.weddingDate) : 'Upcoming Wedding Day';
  const weddingVenue = couple?.weddingVenue || 'Grand Royal Hall';
  const weddingAddress = couple?.weddingAddress || couple?.weddingVenue || 'Grand Royal Hall Location';
  const weddingMapLink = couple?.weddingMapLink || '';

  // Dynamic template generator based on ceremony type
  useEffect(() => {
    let msg = '';
    if (invitationType === 'engagement') {
      msg = `With great joy, we invite you to celebrate the engagement ceremony of ${brideName} and ${groomName} on ${engagementDate} at ${engagementVenue}. Your presence will make this occasion even more special.`;
    } else if (invitationType === 'wedding') {
      msg = `With the blessings of our families, we warmly invite you to the wedding ceremony of ${brideName} and ${groomName} on ${weddingDate} at ${weddingVenue}. We look forward to celebrating this special day with you.`;
    } else if (invitationType === 'reception') {
      msg = `We cordially invite you to the wedding reception of ${brideName} and ${groomName} on ${weddingDate} at ${weddingVenue}. Your presence and blessings are sincerely appreciated.`;
    } else {
      msg = `We cordially invite you to celebrate the ${customFunctionName} ceremony of ${brideName} and ${groomName} on ${weddingDate} at ${weddingVenue}. Your presence and blessings are sincerely appreciated.`;
    }
    setCustomMessage(msg);
  }, [invitationType, customFunctionName, brideName, groomName, weddingDate, weddingVenue, engagementDate, engagementVenue]);

  if (!isOpen) return null;

  const currentCard = invitationCards.find((c) => c.id === selectedCardId) || invitationCards[0];

  const filteredGuests = guests.filter((g) => {
    if (filterSide === 'all') return true;
    return g.side === filterSide;
  });

  const handleSelectAll = () => {
    if (selectedGuestIds.length === filteredGuests.length) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(filteredGuests.map((g) => g.id));
    }
  };

  const toggleGuest = (id: string) => {
    setSelectedGuestIds((prev) =>
      prev.includes(id) ? prev.filter((gId) => gId !== id) : [...prev, id]
    );
  };

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const res = await connectGmail();
      showToast(`Connected to Gmail as ${res.user.email}!`, 'success');
    } catch (err: any) {
      console.error('Gmail connection error:', err);
      showToast(err.message || 'Failed to connect Gmail. Please try again.', 'error');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGmail();
      showToast('Gmail disconnected successfully.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect', 'error');
    }
  };

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png') && !file.type.includes('image/webp')) {
      showToast('Please upload a valid JPG, JPEG, PNG, or WebP image.', 'error');
      return;
    }

    try {
      setUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const uploadRes = await api.uploadImage(dataUrl, file.name);

      const newCard = await onUploadCard({
        title: uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: uploadRes.url,
        event: invitationType,
        messageTemplate: customMessage,
      });

      setSelectedCardId(newCard.id);
      setUploadTitle('');
      showToast('Invitation card uploaded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload card', 'error');
    } finally {
      setUploading(false);
    }
  };

  const cDate = invitationType === 'engagement' ? engagementDate : weddingDate;
  const cVenue = invitationType === 'engagement' ? engagementVenue : weddingVenue;
  const cLocation = invitationType === 'engagement' ? engagementAddress : weddingAddress;
  const cMapLink = invitationType === 'engagement' ? engagementMapLink : weddingMapLink;
  const cardUrl = currentCard ? `${window.location.origin}${currentCard.imageUrl}` : '';

  // Quick test email to authenticated organizer's Gmail
  const handleSendTestEmail = async () => {
    if (!isGmailReady || !gmailUser?.email) {
      await handleConnectGmail();
      return;
    }

    try {
      setSendingTestEmail(true);
      const { subject, html, text } = buildInvitationEmailContent({
        toEmail: gmailUser.email,
        guestName: 'Preview Guest (You)',
        weddingTitle: couple?.weddingTitle || `${groomName} & ${brideName}`,
        groomName,
        brideName,
        invitationType,
        customFunctionName,
        ceremonyDate: cDate,
        ceremonyVenue: cVenue,
        ceremonyLocation: cLocation,
        ceremonyMapLink: cMapLink,
        customMessage,
        digitalCardUrl: cardUrl,
      });

      await sendGmailMessage({
        toEmail: gmailUser.email,
        subject: `[TEST PREVIEW] ${subject}`,
        html,
        text,
      });

      showToast(`Test invitation email sent to ${gmailUser.email}! Check your inbox.`, 'success');
    } catch (err: any) {
      console.error('Test email error:', err);
      showToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Main Dispatch Handler
  const handleDispatch = async () => {
    if (selectedGuestIds.length === 0) {
      showToast('Please select at least one guest from the list below', 'error');
      return;
    }

    const selectedGuests = guests.filter((g) => selectedGuestIds.includes(g.id));

    // Channel 1: EMAIL (Gmail API)
    if (channel === 'email') {
      if (!isGmailReady) {
        showToast('Please connect your Gmail account first to dispatch email invitations.', 'info');
        await handleConnectGmail();
        return;
      }

      const guestsWithEmail = selectedGuests.filter((g) => g.email && g.email.includes('@'));
      if (guestsWithEmail.length === 0) {
        showToast('None of the selected guests have an email address. Please update guest emails first.', 'error');
        return;
      }

      // Explicit user confirmation before dispatching via Workspace API
      const confirmed = await confirm({
        title: 'Dispatch Invitations via Gmail?',
        message: `You are about to send personalized ${invitationType.toUpperCase()} invitation emails to ${guestsWithEmail.length} guest(s) from your connected Gmail account (${gmailUser?.email}). Are you sure you wish to proceed?`,
        confirmLabel: `Send ${guestsWithEmail.length} Emails via Gmail`,
        isDestructive: false,
      });

      if (!confirmed) return;

      try {
        setSending(true);
        let sentCount = 0;
        const failedNames: string[] = [];

        for (let i = 0; i < guestsWithEmail.length; i++) {
          const guest = guestsWithEmail[i];
          setEmailProgress({
            current: i + 1,
            total: guestsWithEmail.length,
            guestName: guest.name,
          });

          try {
            const { subject, html, text } = buildInvitationEmailContent({
              toEmail: guest.email!.trim(),
              guestName: guest.name,
              weddingTitle: couple?.weddingTitle || `${groomName} & ${brideName}`,
              groomName,
              brideName,
              invitationType,
              customFunctionName,
              ceremonyDate: cDate,
              ceremonyVenue: cVenue,
              ceremonyLocation: cLocation,
              ceremonyMapLink: cMapLink,
              customMessage,
              digitalCardUrl: cardUrl,
            });

            await sendGmailMessage({
              toEmail: guest.email!.trim(),
              subject,
              html,
              text,
            });

            // Update guest record on server
            await api.updateGuest(guest.id, {
              invitationSent: true,
              invitationSentAt: new Date().toISOString(),
              invitationMethod: 'email',
            });

            sentCount++;
          } catch (err: any) {
            console.error(`Failed to email ${guest.name}:`, err);
            failedNames.push(guest.name);
          }
        }

        // Record batch invitation on server
        await onSend({
          guestIds: guestsWithEmail.map((g) => g.id),
          invitationCardId: selectedCardId,
          channel: 'Gmail Dispatch',
          customMessage,
          invitationType,
          customFunctionName: invitationType === 'other' ? customFunctionName : undefined,
        });

        if (failedNames.length === 0) {
          showToast(`Success! Sent ${sentCount} invitation emails directly via Gmail.`, 'success');
        } else {
          showToast(
            `Sent ${sentCount} emails. (${failedNames.length} failed: ${failedNames.join(', ')})`,
            'info'
          );
        }
        onClose();
      } catch (err: any) {
        showToast(err.message || 'Failed to dispatch email invitations', 'error');
      } finally {
        setSending(false);
        setEmailProgress(null);
      }
      return;
    }

    // Channel 2: WhatsApp or Digital
    try {
      setSending(true);
      const res = await onSend({
        guestIds: selectedGuestIds,
        invitationCardId: selectedCardId,
        channel: channel === 'whatsapp' ? 'WhatsApp Direct' : 'Digital Portal',
        customMessage,
        invitationType,
        customFunctionName: invitationType === 'other' ? customFunctionName : undefined,
      });

      showToast(`Success! Invitations recorded for ${res.sentCount} guests.`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch invitations', 'error');
    } finally {
      setSending(false);
    }
  };

  // Preview guest for WhatsApp quick link
  const previewGuest = guests.find((g) => selectedGuestIds.includes(g.id)) || guests[0];
  const cleanNumber = (previewGuest?.mobile || '').replace(/\D/g, '');
  const waPhone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
  const ceremonyTitle =
    invitationType === 'engagement'
      ? `Engagement Invitation: ${groomName} & ${brideName} 💍`
      : invitationType === 'reception'
      ? `Wedding Reception: ${groomName} & ${brideName} ✨`
      : invitationType === 'other'
      ? `${customFunctionName} Ceremony: ${groomName} & ${brideName} 🎊`
      : `Wedding Invitation: ${groomName} & ${brideName} 🌸`;

  const waFullText =
    `*${ceremonyTitle}*\n\n` +
    `Dear ${previewGuest?.name || 'Guest'},\n\n` +
    `${customMessage}\n\n` +
    `📅 *Date:* ${cDate}\n` +
    `📍 *Venue:* ${cVenue}\n` +
    `🗺️ *Venue Location:* ${cLocation}\n` +
    (cMapLink ? `🧭 *Map Location:* ${cMapLink}\n` : '') +
    `\n` +
    (cardUrl ? `💌 *Digital Card:*\n${cardUrl}\n\n` : '') +
    `We eagerly await your gracious presence and blessings!\n\n` +
    `Warm regards,\n*${couple?.weddingTitle || `${groomName} & ${brideName}`}*`;
  const directWaUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waFullText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#F0E6D2]">
          <div>
            <h3 className="font-serif font-bold text-lg md:text-xl text-[#2D2422]">
              Send Event Invitations
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Targeted templates for Engagement, Wedding, Reception, and ceremonies with WhatsApp & Gmail dispatch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {/* Step 1: Select Invitation Type */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] space-y-2.5">
            <label className="block text-xs font-bold text-[#8C6D34] uppercase tracking-wider">
              1. Invitation Ceremony Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'wedding', label: 'Wedding Invitation' },
                { type: 'engagement', label: 'Engagement Ceremony' },
                { type: 'reception', label: 'Reception Ceremony' },
                { type: 'other', label: 'Other Function...' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setInvitationType(item.type as any)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                    invitationType === item.type
                      ? 'bg-[#FAF5EB] border-[#D4AF37] text-[#8C6D34] ring-2 ring-[#D4AF37]/20 shadow-2xs'
                      : 'bg-[#FAF8F5] border-[#E5DFD7] text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {invitationType === 'other' && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Custom Function Name (e.g. Haldi, Mehendi, Sangeet, Pooja)
                </label>
                <input
                  type="text"
                  value={customFunctionName}
                  onChange={(e) => setCustomFunctionName(e.target.value)}
                  placeholder="e.g. Sangeet & Musical Night"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:border-[#D4AF37] outline-none"
                />
              </div>
            )}
          </div>

          {/* Step 2: Dynamic Template Preview & Live Editor */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8C6D34] uppercase tracking-wider">
                2. Personalized Invitation Message (Live Preview & Edit)
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                Auto-populated from Event Details
              </span>
            </div>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-stone-300 bg-[#FAF8F5] text-xs text-stone-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none leading-relaxed"
            />
            <div className="text-[11px] text-stone-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>📅 <strong>Date:</strong> {cDate}</span>
              <span>📍 <strong>Venue:</strong> {cVenue}</span>
              <span>🗺️ <strong>Venue Location:</strong> {cLocation}</span>
            </div>
          </div>

          {/* Step 3: Invitation Card Attachment */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] space-y-2.5">
            <label className="block text-xs font-bold text-[#8C6D34] uppercase tracking-wider">
              3. Select or Upload Digital Invitation Card
            </label>

            <div className="flex flex-wrap items-center gap-3">
              {invitationCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition ${
                    selectedCardId === card.id
                      ? 'bg-[#FAF5EB] border-[#D4AF37] ring-2 ring-[#D4AF37]/30'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-stone-300">
                    <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-medium text-stone-800 max-w-[120px] truncate">
                    {card.title}
                  </span>
                </div>
              ))}

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#D4AF37] text-xs font-semibold text-[#8C6D34] bg-[#FAF8F5] hover:bg-[#F3EAD5] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload New Card'}</span>
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

          {/* Step 4: Dispatch Channel & Safe Preview */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#8C6D34] uppercase tracking-wider">
                4. Select Dispatch Channel
              </label>
              {previewGuest && channel === 'whatsapp' && (
                <a
                  href={directWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test WhatsApp Preview with {previewGuest.name}</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Direct</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  channel === 'email'
                    ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span>Gmail Invitation</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('digital')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  channel === 'digital'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <span>Digital E-Card</span>
              </button>
            </div>

            {/* Gmail Integration Section */}
            {channel === 'email' && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-50/50 to-amber-50/30 border border-red-200/80 space-y-2.5 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                      {/* Google G Logo */}
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    </div>
                    <div>
                      {isGmailReady && gmailUser ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-900">{gmailUser.email}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Invitations will be sent as royal HTML cards directly from your Gmail.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-stone-900">Connect Your Gmail Account</p>
                          <p className="text-[11px] text-stone-600">
                            Send authentic royal email invitations directly to guests' personal inboxes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isGmailReady && gmailUser ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSendTestEmail}
                          disabled={sendingTestEmail}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-[11px] font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition"
                          title="Send a sample email to yourself to preview formatting"
                        >
                          <Mail className="w-3 h-3 text-red-600" />
                          <span>{sendingTestEmail ? 'Sending...' : 'Test to Myself'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectGmail}
                          className="text-[11px] text-stone-400 hover:text-stone-700 underline"
                        >
                          Switch
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        disabled={isConnectingGmail}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>{isConnectingGmail ? 'Connecting...' : 'Sign in with Google'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {emailProgress && (
                  <div className="pt-2 border-t border-red-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
                      <span>Sending via Gmail ({emailProgress.current} of {emailProgress.total})...</span>
                      <span className="text-stone-500">{emailProgress.guestName}</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-red-600 h-1.5 transition-all duration-300"
                        style={{ width: `${(emailProgress.current / emailProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 5: Recipient Guest Selection */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E8DEC8] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#8C6D34] uppercase tracking-wider">
                  5. Select Recipients ({selectedGuestIds.length} of {filteredGuests.length})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-[#8C6D34] hover:underline cursor-pointer"
                >
                  {selectedGuestIds.length === filteredGuests.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-stone-100">
              {filteredGuests.map((guest) => {
                const isSelected = selectedGuestIds.includes(guest.id);
                const hasValidEmail = Boolean(guest.email && guest.email.includes('@'));
                return (
                  <div
                    key={guest.id}
                    onClick={() => toggleGuest(guest.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                      isSelected ? 'bg-amber-50/60' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                      />
                      <div>
                        <p className="text-xs font-semibold text-stone-900">{guest.name}</p>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {guest.mobile ? `📱 ${guest.mobile}` : ''}
                          {guest.email ? ` · ✉️ ${guest.email}` : ''} · {guest.side} side
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {channel === 'email' && !hasValidEmail && (
                        <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-medium">
                          No email
                        </span>
                      )}
                      <span className="text-[10px] text-stone-500">
                        {guest.headcount} Pax · {guest.rsvpStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#F0E6D2] flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Selected: <strong>{selectedGuestIds.length} guests</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDispatch}
              disabled={sending || selectedGuestIds.length === 0}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold shadow hover:brightness-105 disabled:opacity-50 transition cursor-pointer ${
                channel === 'email'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600'
                  : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37]'
              }`}
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {channel === 'email'
                      ? `Send ${selectedGuestIds.length} Gmail Invites`
                      : `Send ${selectedGuestIds.length} Invitations`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
