import React, { useState, useEffect, useRef } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Guest, GuestSide, RSVPStatus, InvitationType } from '../../types/index.ts';
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
  Table,
  Grid,
  Save,
  Clipboard,
  AlertTriangle,
  Link2,
  Unlink,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';
import { downloadCSV, fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';
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

interface GuestsViewProps {
  onAddGuest: () => void;
  onEditGuest: (guest: Guest) => void;
  onOpenSendInvite: () => void;
}

interface EditableGuestRow extends Partial<Guest> {
  _tempId?: string;
  _isNew?: boolean;
  _isDirty?: boolean;
  _error?: string;
}

export const GuestsView: React.FC<GuestsViewProps> = ({
  onAddGuest,
  onEditGuest,
  onOpenSendInvite,
}) => {
  const { data, deleteGuest, updateGuest, batchSaveGuests, matchSharedGuest, uploadInvitationCard } = useWeddingData();
  const { canManageGuests, user } = useAuth();
  const { showToast, confirm } = useToast();

  const [viewMode, setViewMode] = useState<'spreadsheet' | 'cards'>('spreadsheet');
  const [search, setSearch] = useState('');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterRsvp, setFilterRsvp] = useState<string>('all');
  const [filterInviteType, setFilterInviteType] = useState<string>('all');

  const [uploadingCard, setUploadingCard] = useState(false);
  const [previewCardModal, setPreviewCardModal] = useState<string | null>(null);
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  // Spreadsheet local state
  const [spreadsheetRows, setSpreadsheetRows] = useState<EditableGuestRow[]>([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [showDedupModal, setShowDedupModal] = useState(false);

  // Gmail connection state
  const [gmailUser, setGmailUser] = useState<any>(getGmailUser());
  const [isGmailReady, setIsGmailReady] = useState<boolean>(isGmailConnected());
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);

  useEffect(() => {
    const unsub = subscribeGmailAuth((u, token) => {
      setGmailUser(u);
      setIsGmailReady(Boolean(u && token));
    });
    return unsub;
  }, []);

  const guests = data?.guests || [];
  const sharedStats = data?.sharedGuestStats;
  const invitationCards = data?.invitationCards || [];
  const primaryCard = invitationCards[0];
  const couple = data?.coupleProfile;

  const groomName = couple?.groom?.name || 'Groom';
  const brideName = couple?.bride?.name || 'Bride';
  const weddingTitle = couple?.weddingTitle || 'Our Royal Wedding';

  const engagementEvent = data?.events?.find(e => e.type === 'engagement');
  const weddingEvent = data?.events?.find(e => e.type === 'wedding');

  const weddingDate = weddingEvent?.dateTime ? formatDate(weddingEvent.dateTime) : (couple?.weddingDate ? formatDate(couple.weddingDate) : 'Upcoming Ceremony');
  const weddingVenue = weddingEvent?.venue || couple?.weddingVenue || 'Wedding Venue';
  const weddingAddress = weddingEvent?.address || couple?.weddingAddress || weddingVenue;
  const weddingMapLink = couple?.weddingMapLink || '';

  const engagementDate = engagementEvent?.dateTime ? formatDate(engagementEvent.dateTime) : (couple?.engagementDate ? formatDate(couple.engagementDate) : weddingDate);
  const engagementVenue = engagementEvent?.venue || couple?.engagementVenue || weddingVenue;
  const engagementAddress = engagementEvent?.address || couple?.engagementAddress || engagementVenue;
  const engagementMapLink = couple?.engagementMapLink || '';

  // Sync server guests into spreadsheet rows on initial load / refresh
  useEffect(() => {
    // Preserve any existing unsaved new rows while syncing existing rows
    const newRows = spreadsheetRows.filter((r) => r._isNew);
    const serverRows: EditableGuestRow[] = guests.map((g, idx) => ({
      ...g,
      srNo: idx + 1,
      _isDirty: false,
      _isNew: false,
    }));
    setSpreadsheetRows([...serverRows, ...newRows]);
  }, [guests]);

  // Find cross-side duplicates (matching phone or email across groom and bride sides)
  const duplicatePairs = React.useMemo(() => {
    const pairs: Array<{ groomGuest: Guest; brideGuest: Guest; reason: string }> = [];
    const groomGuests = guests.filter((g) => g.side === 'groom');
    const brideGuests = guests.filter((g) => g.side === 'bride');

    const cleanNum = (num?: string) => (num || '').replace(/\D/g, '').slice(-10);

    groomGuests.forEach((gg) => {
      brideGuests.forEach((bg) => {
        const phoneMatch = cleanNum(gg.mobile) && cleanNum(gg.mobile) === cleanNum(bg.mobile);
        const emailMatch =
          gg.email &&
          bg.email &&
          gg.email.trim().toLowerCase() === bg.email.trim().toLowerCase();

        if (phoneMatch || emailMatch) {
          pairs.push({
            groomGuest: gg,
            brideGuest: bg,
            reason: phoneMatch ? `Matching Mobile (${gg.mobile})` : `Matching Email (${gg.email})`,
          });
        }
      });
    });

    return pairs;
  }, [guests]);

  // Filtered rows for display
  const filteredRows = spreadsheetRows.filter((g) => {
    if (filterSide !== 'all' && g.side !== filterSide) return false;
    if (filterRsvp !== 'all' && g.rsvpStatus !== filterRsvp) return false;
    if (filterInviteType !== 'all' && (g.invitationType || 'wedding') !== filterInviteType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (g.name || '').toLowerCase().includes(q);
      const matchMobile = (g.mobile || '').includes(q);
      const matchEmail = (g.email || '').toLowerCase().includes(q);
      const matchRelation = (g.relation || '').toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchEmail && !matchRelation) return false;
    }
    return true;
  });

  // Calculate metrics
  const totalGuestsCount = guests.length;
  const groomPax = sharedStats?.groomSide?.totalPax ?? guests.filter(g => g.side === 'groom').reduce((s, g) => s + (g.headcount || 1), 0);
  const bridePax = sharedStats?.brideSide?.totalPax ?? guests.filter(g => g.side === 'bride').reduce((s, g) => s + (g.headcount || 1), 0);
  const mutualPax = sharedStats?.mutualSide?.totalPax ?? guests.filter(g => g.side === 'mutual').reduce((s, g) => s + (g.headcount || 1), 0);
  
  // Deduplicated combined event headcount from backend analytics
  const combinedEventPax = sharedStats?.combinedEventPax ?? (groomPax + bridePax + mutualPax);
  const duplicateGroupCount = sharedStats?.duplicateGroupCount ?? duplicatePairs.length;
  const invitationsSentCount = guests.filter((g) => g.invitationSent).length;
  const attendingPax = guests.filter((g) => g.rsvpStatus === 'attending').reduce((sum, g) => sum + (g.headcount || 1), 0);

  // Add new empty row to spreadsheet
  const handleAddRow = () => {
    const nextSrNo = spreadsheetRows.length + 1;
    const defaultSide: GuestSide = user?.role === 'groom' ? 'groom' : user?.role === 'bride' ? 'bride' : 'groom';
    const newRow: EditableGuestRow = {
      _tempId: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      srNo: nextSrNo,
      name: '',
      mobile: '',
      email: '',
      headcount: 1,
      side: defaultSide,
      relation: '',
      rsvpStatus: 'pending',
      invitationType: 'wedding',
      eventsInvited: ['wedding'],
      invitationSent: false,
      _isNew: true,
      _isDirty: true,
    };
    setSpreadsheetRows((prev) => [...prev, newRow]);
  };

  // Update field in an editable row
  const handleFieldChange = (index: number, field: keyof EditableGuestRow, value: any) => {
    setSpreadsheetRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value, _isDirty: true };

      // Validation
      if (field === 'headcount') {
        const num = parseInt(value, 10);
        target.headcount = isNaN(num) || num < 1 ? 1 : num;
      }

      updated[index] = target;
      return updated;
    });
  };

  // Save all modified or new rows in bulk
  const handleBulkSave = async () => {
    const dirtyRows = spreadsheetRows.filter((r) => r._isDirty);
    if (dirtyRows.length === 0) {
      showToast('No unsaved changes in the spreadsheet', 'info');
      return;
    }

    // Validate rows
    for (const r of dirtyRows) {
      if (!r.name || !r.name.trim()) {
        showToast('Please enter a guest name for all modified rows', 'error');
        return;
      }
      if (r.mobile && r.mobile.replace(/\D/g, '').length < 8) {
        showToast(`Invalid phone number for guest "${r.name}"`, 'error');
        return;
      }
      if (r.email && r.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
        showToast(`Invalid email format for guest "${r.name}"`, 'error');
        return;
      }
    }

    try {
      setIsSavingBulk(true);
      const payload: Partial<Guest>[] = dirtyRows.map((r, idx) => ({
        id: r.id,
        name: r.name!.trim(),
        mobile: r.mobile?.trim() || '',
        email: r.email?.trim() || '',
        headcount: Number(r.headcount) || 1,
        side: r.side || 'groom',
        relation: r.relation?.trim() || '',
        rsvpStatus: r.rsvpStatus || 'pending',
        invitationType: r.invitationType || 'wedding',
        eventsInvited: r.eventsInvited || ['wedding'],
        srNo: idx + 1,
      }));

      const res = await batchSaveGuests(payload);
      showToast(`Saved ${res.added} new and updated ${res.updated} guests successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save spreadsheet rows', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Paste from Excel / Google Sheets
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      showToast('Please paste tab-separated rows from your spreadsheet', 'error');
      return;
    }

    const lines = pastedText.trim().split(/\r\n|\n|\r/);
    const parsedRows: EditableGuestRow[] = [];
    let startSr = spreadsheetRows.length + 1;

    for (const line of lines) {
      if (!line.trim()) continue;
      // Split on tabs (Excel / Google Sheets default clipboard) or commas
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length === 0) continue;

      const name = parts[0]?.trim();
      if (!name || name.toLowerCase() === 'name' || name.toLowerCase() === 'sr. no.') {
        // Skip header
        continue;
      }

      const mobile = parts[1]?.trim() || '';
      const email = parts[2]?.trim() || '';
      const pax = parseInt(parts[3]?.trim(), 10) || 1;
      const rawSide = parts[4]?.trim().toLowerCase();
      const side: GuestSide = rawSide === 'bride' ? 'bride' : rawSide === 'mutual' ? 'mutual' : 'groom';
      const rawInviteType = parts[5]?.trim().toLowerCase();
      const inviteType: InvitationType =
        rawInviteType === 'engagement' ? 'engagement' :
        rawInviteType === 'reception' ? 'reception' :
        rawInviteType === 'other' ? 'other' : 'wedding';

      parsedRows.push({
        _tempId: 'temp_paste_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        srNo: startSr++,
        name,
        mobile,
        email,
        headcount: pax,
        side,
        rsvpStatus: 'pending',
        invitationType: inviteType,
        eventsInvited: ['wedding'],
        invitationSent: false,
        _isNew: true,
        _isDirty: true,
      });
    }

    if (parsedRows.length === 0) {
      showToast('No valid rows found to import. Format: Name [tab] Mobile [tab] Email [tab] Pax', 'error');
      return;
    }

    setSpreadsheetRows((prev) => [...prev, ...parsedRows]);
    setShowPasteModal(false);
    setPastedText('');
    showToast(`Pasted ${parsedRows.length} guest rows into spreadsheet. Click "Save All" to commit.`, 'success');
  };

  // Delete guest with confirmed modal
  const handleDeleteRow = async (row: EditableGuestRow, index: number) => {
    if (row._isNew) {
      // Just remove from local state
      setSpreadsheetRows((prev) => prev.filter((_, idx) => idx !== index));
      showToast('Draft row removed', 'info');
      return;
    }

    if (!row.id) return;

    const ok = await confirm({
      title: 'Permanently Remove Guest?',
      message: `Are you sure you want to delete "${row.name}" and remove their attendance allocation?`,
      confirmLabel: 'Delete Guest',
      isDestructive: true,
    });

    if (ok) {
      try {
        await deleteGuest(row.id);
        showToast(`Guest "${row.name}" removed successfully`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete guest', 'error');
      }
    }
  };

  // 1-Click WhatsApp Invite Dispatch
  const handleSendWhatsApp = async (guest: Partial<Guest>) => {
    if (!guest.mobile || !guest.mobile.trim()) {
      showToast(`No mobile number registered for guest ${guest.name}. Please edit guest details.`, 'error');
      return;
    }

    const cleanNumber = guest.mobile.replace(/\D/g, '');
    const phone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;

    const cardLink = primaryCard
      ? `${window.location.origin}${primaryCard.imageUrl}`
      : `${window.location.origin}`;

    const inviteType = guest.invitationType || 'wedding';
    let titleHeader = '';
    let bodyIntro = '';
    let ceremonyDate = weddingDate;
    let ceremonyVenue = weddingVenue;
    let ceremonyLocation = weddingAddress;
    let ceremonyMapLink = weddingMapLink;

    if (inviteType === 'engagement') {
      titleHeader = `*Engagement Invitation: ${groomName} & ${brideName}* 💍`;
      bodyIntro = `With immense joy, we cordially invite you and your family to celebrate our engagement ceremony!`;
      ceremonyDate = engagementDate;
      ceremonyVenue = engagementVenue;
      ceremonyLocation = engagementAddress;
      ceremonyMapLink = engagementMapLink;
    } else if (inviteType === 'reception') {
      titleHeader = `*Wedding Reception Invitation: ${groomName} & ${brideName}* ✨`;
      bodyIntro = `We cordially invite you and your family to celebrate the wedding reception of ${groomName} & ${brideName}!`;
      ceremonyDate = weddingDate;
      ceremonyVenue = weddingVenue;
      ceremonyLocation = weddingAddress;
      ceremonyMapLink = weddingMapLink;
    } else if (inviteType === 'other') {
      titleHeader = `*Ceremony Invitation: ${groomName} & ${brideName}* 🎊`;
      bodyIntro = `With great joy, we cordially invite you and your family to join us for our special family celebration!`;
      ceremonyDate = weddingDate;
      ceremonyVenue = weddingVenue;
      ceremonyLocation = weddingAddress;
      ceremonyMapLink = weddingMapLink;
    } else {
      titleHeader = `*Wedding Invitation: ${groomName} & ${brideName}* 🌸`;
      bodyIntro = `With immense joy and the blessings of our families, we cordially invite you and your family to celebrate our wedding ceremony!`;
      ceremonyDate = weddingDate;
      ceremonyVenue = weddingVenue;
      ceremonyLocation = weddingAddress;
      ceremonyMapLink = weddingMapLink;
    }

    const text =
      `${titleHeader}\n\n` +
      `Dear ${guest.name},\n\n` +
      `${bodyIntro}\n\n` +
      `📅 *Date:* ${ceremonyDate}\n` +
      `📍 *Venue:* ${ceremonyVenue}\n` +
      `🗺️ *Venue Location:* ${ceremonyLocation || ceremonyVenue}\n` +
      (ceremonyMapLink ? `🧭 *Map Location:* ${ceremonyMapLink}\n` : '') +
      `\n💌 *Digital Invitation Card Link:*\n${cardLink}\n\n` +
      `We eagerly await your gracious presence and blessings!\n\n` +
      `Warm regards,\n*${weddingTitle}*`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    if (guest.id) {
      try {
        await updateGuest(guest.id, {
          invitationSent: true,
          invitationSentAt: new Date().toISOString(),
          invitationMethod: 'whatsapp',
        });
        showToast(`WhatsApp invite prepared for ${guest.name}!`, 'success');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    try {
      const res = await connectGmail();
      showToast(`Connected to Gmail as ${res.user.email}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to connect Gmail', 'error');
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleSendGmailSingle = async (guest: EditableGuestRow | Partial<Guest>) => {
    if (!guest.email || !guest.email.includes('@')) {
      showToast(`No valid email registered for ${guest.name}. Please edit guest details and add their email address.`, 'error');
      return;
    }

    if (!isGmailReady) {
      showToast('Please connect your Gmail account to send invitation emails.', 'info');
      await handleConnectGmail();
      return;
    }

    const inviteType = guest.invitationType || 'wedding';
    const targetDate = inviteType === 'engagement' ? engagementDate : weddingDate;
    const targetVenue = inviteType === 'engagement' ? engagementVenue : weddingVenue;
    const targetLocation = inviteType === 'engagement' ? engagementAddress : weddingAddress;
    const targetMapLink = inviteType === 'engagement' ? engagementMapLink : weddingMapLink;

    let ceremonyMsg = '';
    if (inviteType === 'engagement') {
      ceremonyMsg = `With great joy, we invite you to celebrate the engagement ceremony of ${brideName} and ${groomName} on ${targetDate} at ${targetVenue}. Your presence will make this occasion even more special.`;
    } else if (inviteType === 'reception') {
      ceremonyMsg = `We cordially invite you to the wedding reception of ${brideName} and ${groomName} on ${targetDate} at ${targetVenue}. Your presence and blessings are sincerely appreciated.`;
    } else if (inviteType === 'other') {
      ceremonyMsg = `We cordially invite you to celebrate our special ceremony with ${brideName} and ${groomName} on ${targetDate} at ${targetVenue}. Your presence and blessings are sincerely appreciated.`;
    } else {
      ceremonyMsg = `With the blessings of our families, we warmly invite you to the wedding ceremony of ${brideName} and ${groomName} on ${targetDate} at ${targetVenue}. We look forward to celebrating this special day with you.`;
    }

    const cardLink = primaryCard ? `${window.location.origin}${primaryCard.imageUrl}` : `${window.location.origin}`;

    const confirmed = await confirm({
      title: 'Send Invitation via Gmail?',
      message: `Send ${inviteType.toUpperCase()} invitation email to ${guest.name} (${guest.email}) from your Gmail account (${gmailUser?.email})?`,
      confirmLabel: 'Send Email via Gmail',
      isDestructive: false,
    });

    if (!confirmed) return;

    try {
      const { subject, html, text } = buildInvitationEmailContent({
        toEmail: guest.email.trim(),
        guestName: guest.name || 'Guest',
        weddingTitle,
        groomName,
        brideName,
        invitationType: inviteType,
        ceremonyDate: targetDate,
        ceremonyVenue: targetVenue,
        ceremonyLocation: targetLocation,
        ceremonyMapLink: targetMapLink,
        customMessage: ceremonyMsg,
        digitalCardUrl: cardLink,
      });

      await sendGmailMessage({
        toEmail: guest.email.trim(),
        subject,
        html,
        text,
      });

      if (guest.id) {
        await updateGuest(guest.id, {
          invitationSent: true,
          invitationSentAt: new Date().toISOString(),
          invitationMethod: 'email',
        });
      }

      showToast(`Invitation email successfully sent to ${guest.name} (${guest.email}) via Gmail!`, 'success');
    } catch (err: any) {
      console.error('Failed to send email:', err);
      showToast(err.message || 'Failed to dispatch email via Gmail', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Sr. No.',
      'Guest Name',
      'Side',
      'Mobile Number',
      'Email',
      'Headcount (Pax)',
      'Invitation Type',
      'RSVP Status',
      'Invitation Sent',
      'Sent At',
      'Channel',
    ];

    const rows = filteredRows.map((g, i) => [
      i + 1,
      g.name || '',
      g.side || 'groom',
      g.mobile || '',
      g.email || '',
      g.headcount || 1,
      g.invitationType || 'wedding',
      g.rsvpStatus || 'pending',
      g.invitationSent ? 'Yes' : 'No',
      g.invitationSentAt || '',
      g.invitationMethod || '',
    ]);

    downloadCSV(`wedding_guest_roster_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const hasUnsavedChanges = spreadsheetRows.some((r) => r._isDirty);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] mb-1">
            <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Digital E-Cards & Guest Roster</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2422]">
            Guest List Management
          </h2>
          <p className="text-xs text-[#7A6B68] mt-0.5">
            Fast spreadsheet-style direct data entry, cross-side deduplication, and 1-click WhatsApp invitations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'spreadsheet'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-[#B38F4D]" />
              <span>Spreadsheet</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'cards'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-[#B38F4D]" />
              <span>Cards</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#5C4E4B] hover:bg-[#FAF5EB] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#B38F4D]" />
            <span>Export CSV</span>
          </button>

          {/* Gmail Connect / Status Button */}
          {isGmailReady && gmailUser ? (
            <div
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-stone-300 text-xs shadow-2xs"
              title={`Gmail connected as ${gmailUser.email}. Click to reconnect if needed.`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="font-semibold text-stone-700 max-w-[120px] sm:max-w-[150px] truncate">
                {gmailUser.email}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            </div>
          ) : (
            <button
              onClick={handleConnectGmail}
              disabled={isConnectingGmail}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
              title="Connect Gmail to dispatch official wedding invitations via email"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{isConnectingGmail ? 'Connecting...' : 'Connect Gmail'}</span>
            </button>
          )}

          <button
            onClick={onOpenSendInvite}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#FAF5EB] border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Send Invites</span>
          </button>

          {canManageGuests && (
            <>
              <button
                onClick={() => setShowPasteModal(true)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] transition cursor-pointer"
                title="Paste copied rows from Excel or Google Sheets"
              >
                <Clipboard className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Paste from Excel</span>
                <span className="sm:hidden">Paste</span>
              </button>

              <button
                onClick={handleAddRow}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Headcount Stat Highlights with Cross-Side Deduplication Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Deduplicated Event Pax</div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#2D2422] mt-1">
            {combinedEventPax} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Seats</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-1.5 flex items-center justify-between">
            <span>Bride: <strong>{bridePax}</strong></span>
            <span>Groom: <strong>{groomPax}</strong></span>
            <span>Mutual: <strong>{mutualPax}</strong></span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Confirmed Attending</div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#166534] mt-1">
            {attendingPax} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Pax</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-1.5">
            Locked for catering & table arrangements
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Invitations Dispatched</div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#3B82F6] mt-1">
            {invitationsSentCount} <span className="text-xs font-sans font-normal text-[#8C7E7A]">/ {totalGuestsCount}</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-1.5">
            Via Digital Card & WhatsApp
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-2xs">
          <div className="text-xs text-[#7A6B68]">Cross-Side Matches</div>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-700 mt-1">
            {duplicatePairs.length} <span className="text-xs font-sans font-normal text-[#8C7E7A]">Pairs</span>
          </div>
          <div className="text-[11px] text-[#8C7E7A] mt-1.5 flex items-center justify-between">
            <span>Deduplication active</span>
            {duplicatePairs.length > 0 && (
              <button
                onClick={() => setShowDedupModal(true)}
                className="text-amber-800 font-semibold underline hover:text-amber-900"
              >
                Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cross-Side Deduplication Warning Banner if duplicates exist */}
      {duplicatePairs.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/60 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-950">
                {duplicatePairs.length} Cross-Side Guest {duplicatePairs.length === 1 ? 'Match' : 'Matches'} Detected
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Guests with identical mobile numbers or emails appear on both Bride and Groom rosters. The system automatically deduplicates attendance for the combined event ({combinedEventPax} Pax).
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDedupModal(true)}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition"
          >
            Review & Link Attendance
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by guest name, mobile, email..."
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
            <option value="mutual">Mutual Friends</option>
          </select>

          <select
            value={filterInviteType}
            onChange={(e) => setFilterInviteType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          >
            <option value="all">All Invitation Types</option>
            <option value="engagement">Engagement Invitation</option>
            <option value="wedding">Wedding Invitation</option>
            <option value="reception">Reception Invitation</option>
            <option value="other">Other Function</option>
          </select>

          <select
            value={filterRsvp}
            onChange={(e) => setFilterRsvp(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
          >
            <option value="all">All RSVP Statuses</option>
            <option value="attending">Attending</option>
            <option value="pending">Pending</option>
            <option value="tentative">Tentative</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {/* Bulk Save Indicator in Spreadsheet Mode */}
        {viewMode === 'spreadsheet' && canManageGuests && (
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                Unsaved spreadsheet changes
              </span>
            )}
            <button
              onClick={handleBulkSave}
              disabled={isSavingBulk || !hasUnsavedChanges}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                hasUnsavedChanges
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isSavingBulk ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SPREADSHEET VIEW (DIRECT DATA ENTRY TABLE) */}
      {viewMode === 'spreadsheet' ? (
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF5EB] border-b border-[#E8DEC8] text-[#8C6D34] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-14 text-center">Sr. No.</th>
                  <th className="py-3 px-3 min-w-[170px]">Guest Name *</th>
                  <th className="py-3 px-3 min-w-[140px]">Phone Number *</th>
                  <th className="py-3 px-3 min-w-[160px]">Email Address</th>
                  <th className="py-3 px-3 w-24 text-center">Head Count *</th>
                  <th className="py-3 px-3 min-w-[120px]">Owning Side</th>
                  <th className="py-3 px-3 min-w-[140px]">Invitation Type</th>
                  <th className="py-3 px-3 min-w-[120px]">RSVP Status</th>
                  <th className="py-3 px-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E6D2]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-[#8C7E7A]">
                      No guest records found. Click <strong className="text-[#8C6D34]">"Add Row"</strong> or <strong className="text-[#8C6D34]">"Paste from Excel"</strong> to enter guests.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr
                      key={row.id || row._tempId || idx}
                      className={`hover:bg-[#FAF8F5] transition ${
                        row._isDirty ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Sr. No. */}
                      <td className="py-2.5 px-3 text-center text-stone-500 font-mono font-medium">
                        {idx + 1}
                      </td>

                      {/* Guest Name */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.name || ''}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Ramesh Patel"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-stone-900 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
                        />
                      </td>

                      {/* Phone Number */}
                      <td className="py-2 px-3">
                        <input
                          type="tel"
                          value={row.mobile || ''}
                          onChange={(e) => handleFieldChange(idx, 'mobile', e.target.value)}
                          placeholder="e.g. 9811223344"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-stone-900 font-mono text-[11px] focus:border-[#D4AF37] outline-none"
                        />
                      </td>

                      {/* Email */}
                      <td className="py-2 px-3">
                        <input
                          type="email"
                          value={row.email || ''}
                          onChange={(e) => handleFieldChange(idx, 'email', e.target.value)}
                          placeholder="e.g. guest@email.com"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-stone-900 text-[11px] focus:border-[#D4AF37] outline-none"
                        />
                      </td>

                      {/* Head Count */}
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={row.headcount || 1}
                          onChange={(e) => handleFieldChange(idx, 'headcount', e.target.value)}
                          className="w-16 px-2 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-center font-bold text-stone-900 focus:border-[#D4AF37] outline-none"
                        />
                      </td>

                      {/* Owning Side */}
                      <td className="py-2 px-3">
                        <select
                          value={row.side || 'groom'}
                          onChange={(e) => handleFieldChange(idx, 'side', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-stone-800 text-[11px] font-medium focus:border-[#D4AF37] outline-none"
                        >
                          <option value="groom">Groom's Side</option>
                          <option value="bride">Bride's Side</option>
                          <option value="mutual">Mutual Friends</option>
                        </select>
                      </td>

                      {/* Invitation Type */}
                      <td className="py-2 px-3">
                        <select
                          value={row.invitationType || 'wedding'}
                          onChange={(e) => handleFieldChange(idx, 'invitationType', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DFD7] bg-white text-stone-800 text-[11px] focus:border-[#D4AF37] outline-none"
                        >
                          <option value="engagement">Engagement</option>
                          <option value="wedding">Wedding</option>
                          <option value="reception">Reception</option>
                          <option value="other">Other Function</option>
                        </select>
                      </td>

                      {/* RSVP Status */}
                      <td className="py-2 px-3">
                        <select
                          value={row.rsvpStatus || 'pending'}
                          onChange={(e) => handleFieldChange(idx, 'rsvpStatus', e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold outline-none ${
                            row.rsvpStatus === 'attending'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : row.rsvpStatus === 'declined'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="attending">Attending</option>
                          <option value="pending">Pending</option>
                          <option value="tentative">Tentative</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(row)}
                            title="Send WhatsApp Invitation"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendGmailSingle(row)}
                            title={row.email ? `Send Gmail invitation to ${row.email}` : 'No email added for this guest'}
                            className={`p-1.5 rounded-lg border transition ${
                              row.email
                                ? 'text-red-700 hover:bg-red-50 border-red-200 cursor-pointer'
                                : 'text-stone-300 border-stone-200 cursor-not-allowed opacity-40'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          {canManageGuests && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row, idx)}
                              title="Delete Row"
                              className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Quick Actions */}
          {canManageGuests && (
            <div className="p-3.5 bg-[#FAF5EB] border-t border-[#E8DEC8] flex items-center justify-between">
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1.5 text-xs font-bold text-[#8C6D34] hover:text-[#5C4E4B] transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>

              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">
                  Total Rows: <strong>{filteredRows.length}</strong>
                </span>
                <button
                  onClick={handleBulkSave}
                  disabled={isSavingBulk || !hasUnsavedChanges}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    hasUnsavedChanges
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRows.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-[#8C7E7A] bg-[#FFFDF9] rounded-3xl border border-[#E8DEC8]">
              No guests found matching the selected filters.
            </div>
          ) : (
            filteredRows.map((g) => (
              <div
                key={g.id || g._tempId}
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
                      <span className="font-mono">{g.mobile || 'No phone'}</span>
                    </div>
                    {g.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#B38F4D]" />
                        <span className="truncate">{g.email}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-[#7A6B68]">
                      Headcount: <strong className="text-[#2D2422]">{g.headcount || 1} Pax</strong> · Invite: {g.invitationType || 'wedding'}
                    </div>
                  </div>
                </div>

                {/* Card Footer: WhatsApp & Email 1-Click Dispatch & Edit Actions */}
                <div className="pt-3 border-t border-[#F0E6D2] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      {g.invitationSent ? (
                        <span className="text-[10px] font-semibold text-[#166534] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span>Invite Sent</span>
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
                          {g.id && (
                            <button
                              onClick={() => onEditGuest(g as Guest)}
                              className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition"
                              title="Edit guest details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRow(g, 0)}
                            className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] transition"
                            title="Delete guest"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(g)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#166534] text-xs font-semibold hover:bg-[#25D366]/20 transition cursor-pointer"
                      title="Send WhatsApp Invitation"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendGmailSingle(g)}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        g.email
                          ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
                          : 'bg-stone-50 border-stone-200 text-stone-400 opacity-60'
                      }`}
                      title={g.email ? `Send Gmail invitation to ${g.email}` : 'No email added for this guest'}
                    >
                      <Mail className="w-3.5 h-3.5 text-red-600" />
                      <span>Gmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSendInvite()}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] text-[#8C6D34] text-xs font-semibold hover:bg-[#F3EAD5] transition cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-[#B38F4D]" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Paste from Excel / Google Sheets Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Paste from Excel or Sheets</h3>
                  <p className="text-xs text-stone-500">Fast bulk import via clipboard</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-200">
              <p className="font-semibold text-stone-800">Expected Column Order (copied tab-delimited cells):</p>
              <p className="font-mono text-[11px] text-amber-900">
                Name [Tab] Phone Number [Tab] Email [Tab] Head Count [Tab] Side (Bride/Groom)
              </p>
            </div>

            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste cells directly here..."
              className="w-full p-3 rounded-xl border border-stone-300 text-xs font-mono text-stone-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPastedText}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-bold shadow hover:brightness-105"
              >
                Import Rows to Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Side Deduplication Reconciliation Modal */}
      {showDedupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Cross-Side Guest Synchronization</h3>
                  <p className="text-xs text-stone-500">
                    Eliminate duplicate invitations and verify combined seating headcount.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDedupModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Attendance Headcount Rule:</strong> When a guest is invited by both sides, their individual records remain distinct in Bride and Groom workspaces, but the <strong>Combined Event Headcount</strong> counts their attendance group only <strong>ONCE</strong> so you never overpay for catering or seating.
            </div>

            <div className="space-y-3">
              {duplicatePairs.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-500">
                  No cross-side duplicate contacts currently detected.
                </div>
              ) : (
                duplicatePairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-stone-900">{pair.groomGuest.name}</span>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full font-semibold">
                          {pair.reason}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 flex items-center gap-3">
                        <span>Groom side: <strong>{pair.groomGuest.headcount} Pax</strong></span>
                        <span>·</span>
                        <span>Bride side: <strong>{pair.brideGuest.headcount} Pax</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          await matchSharedGuest(pair.groomGuest.id, pair.brideGuest.id, 'link');
                          showToast('Attendance group linked! Combined headcount deduplicated.', 'success');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Link Group</span>
                      </button>
                      <button
                        onClick={async () => {
                          await matchSharedGuest(pair.groomGuest.id, pair.brideGuest.id, 'unlink');
                          showToast('Attendance records treated independently.', 'info');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Keep Independent</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDedupModal(false)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Preview Modal */}
      {previewCardModal && (
        <div
          onClick={() => setPreviewCardModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-serif font-bold text-stone-900">Digital Invitation Card</h3>
              <button
                onClick={() => setPreviewCardModal(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-stone-100 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewCardModal}
                alt="Invitation Card"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
