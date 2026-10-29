import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';
import {
  Settings as SettingsIcon,
  Heart,
  Lock,
  User as UserIcon,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { data, updateCoupleProfile } = useWeddingData();
  const { user } = useAuth();
  const { showToast } = useToast();

  const couple = data?.coupleProfile;
  const weddingId = data?.weddingId || couple?.weddingId || '';

  // Couple names, title, and dates state
  const [weddingTitle, setWeddingTitle] = useState(couple?.weddingTitle || '');
  const [groomName, setGroomName] = useState(couple?.groom?.name || '');
  const [brideName, setBrideName] = useState(couple?.bride?.name || '');
  const [hashtag, setHashtag] = useState(couple?.hashtag || '');

  const [engagementDate, setEngagementDate] = useState(couple?.engagementDate?.slice(0, 16) || '');
  const [engagementVenue, setEngagementVenue] = useState(couple?.engagementVenue || '');
  const [engagementAddress, setEngagementAddress] = useState(couple?.engagementAddress || '');
  const [engagementMapLink, setEngagementMapLink] = useState(couple?.engagementMapLink || '');

  const [weddingDate, setWeddingDate] = useState(couple?.weddingDate?.slice(0, 16) || '');
  const [weddingVenue, setWeddingVenue] = useState(couple?.weddingVenue || '');
  const [weddingAddress, setWeddingAddress] = useState(couple?.weddingAddress || '');
  const [weddingMapLink, setWeddingMapLink] = useState(couple?.weddingMapLink || '');

  const [coupleSuccess, setCoupleSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  const copyWeddingId = () => {
    navigator.clipboard.writeText(weddingId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveCoupleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCoupleProfile({
        weddingTitle: weddingTitle.trim() || `${groomName.trim()} & ${brideName.trim()}'s Wedding`,
        hashtag: hashtag.trim(),
        engagementDate: new Date(engagementDate).toISOString(),
        engagementVenue: engagementVenue.trim(),
        engagementAddress: engagementAddress.trim(),
        engagementMapLink: engagementMapLink.trim(),
        weddingDate: new Date(weddingDate).toISOString(),
        weddingVenue: weddingVenue.trim(),
        weddingAddress: weddingAddress.trim(),
        weddingMapLink: weddingMapLink.trim(),
        groom: {
          ...couple?.groom!,
          name: groomName.trim(),
        },
        bride: {
          ...couple?.bride!,
          name: brideName.trim(),
        },
      });

      setCoupleSuccess('Wedding registration details & venues updated successfully!');
      showToast('Wedding settings saved successfully!', 'success');
      setTimeout(() => setCoupleSuccess(''), 4000);
    } catch (err: any) {
      showToast(err.message || 'Failed to update wedding settings', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match. Please re-enter.');
      return;
    }

    try {
      setSavingPass(true);
      setPassError(null);
      const res = await api.changePassword(currentPassword, newPassword);
      setPassSuccess(res.message || 'Password successfully updated! You can now use your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(null), 5000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2422]">
            Wedding Settings & Master Registration
          </h2>
          <p className="text-xs text-[#7A6B68]">
            Configure couple identity, venues, Google Maps location links, and account security
          </p>
        </div>

        {/* Master Wedding ID Display */}
        <div className="inline-flex items-center gap-2 py-1.5 px-3.5 rounded-2xl bg-white border border-[#D4AF37] shadow-2xs self-start">
          <span className="text-[10px] uppercase font-bold text-[#8C6D34]">Master Wedding ID:</span>
          <span className="font-mono text-xs font-bold text-[#2D2422]">{weddingId}</span>
          <button
            type="button"
            onClick={copyWeddingId}
            className="text-[#8C6D34] hover:text-[#5C4E4B] transition p-0.5 cursor-pointer"
            title="Copy Wedding ID"
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 1. Couple & Event Dates Settings */}
      <form
        onSubmit={handleSaveCoupleSettings}
        className="p-6 md:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-[#F0E6D2]">
          <Heart className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="font-serif font-bold text-base text-[#2D2422]">
            Couple Identity & Wedding Title
          </h3>
        </div>

        {coupleSuccess && (
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{coupleSuccess}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
            Wedding Title / Display Name
          </label>
          <input
            type="text"
            value={weddingTitle}
            onChange={(e) => setWeddingTitle(e.target.value)}
            placeholder="e.g. Our Royal Wedding Celebration"
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Groom's Full Name *
            </label>
            <input
              type="text"
              value={groomName}
              onChange={(e) => setGroomName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Bride's Full Name *
            </label>
            <input
              type="text"
              value={brideName}
              onChange={(e) => setBrideName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
            Wedding Hashtag
          </label>
          <input
            type="text"
            value={hashtag}
            onChange={(e) => setHashtag(e.target.value)}
            placeholder="#OurForeverStory"
            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none focus:border-[#D4AF37]"
          />
        </div>

        {/* Engagement Date, Venue & Google Maps link */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] space-y-3">
          <div className="text-xs font-bold text-[#8C6D34] uppercase tracking-wider flex items-center justify-between">
            <span>Engagement Ring Ceremony Settings</span>
            {engagementMapLink && (
              <a
                href={engagementMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-normal text-[#B38F4D] hover:underline flex items-center gap-1"
              >
                <span>Test Map Link</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Engagement Date & Time
              </label>
              <input
                type="datetime-local"
                value={engagementDate}
                onChange={(e) => setEngagementDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Engagement Venue
              </label>
              <input
                type="text"
                value={engagementVenue}
                onChange={(e) => setEngagementVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Engagement Address
              </label>
              <input
                type="text"
                value={engagementAddress}
                onChange={(e) => setEngagementAddress(e.target.value)}
                placeholder="Lake Pichola, Udaipur"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Engagement Google Maps Link
              </label>
              <input
                type="url"
                value={engagementMapLink}
                onChange={(e) => setEngagementMapLink(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Wedding Date, Venue & Google Maps link */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] space-y-3">
          <div className="text-xs font-bold text-[#8C6D34] uppercase tracking-wider flex items-center justify-between">
            <span>Main Wedding (Pheras) Settings</span>
            {weddingMapLink && (
              <a
                href={weddingMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-normal text-[#B38F4D] hover:underline flex items-center gap-1"
              >
                <span>Test Map Link</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Wedding Date & Time
              </label>
              <input
                type="datetime-local"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Wedding Venue
              </label>
              <input
                type="text"
                value={weddingVenue}
                onChange={(e) => setWeddingVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Wedding Address
              </label>
              <input
                type="text"
                value={weddingAddress}
                onChange={(e) => setWeddingAddress(e.target.value)}
                placeholder="Pichola, Udaipur, Rajasthan"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Wedding Google Maps Link
              </label>
              <input
                type="url"
                value={weddingMapLink}
                onChange={(e) => setWeddingMapLink(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Wedding Settings</span>
          </button>
        </div>
      </form>

      {/* 2. Password Changer */}
      <form
        onSubmit={handleChangePassword}
        className="p-6 md:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-serif font-bold text-base text-[#2D2422]">
              Change Password & Security
            </h3>
          </div>
          <span className="text-[11px] text-[#8C6D34] font-medium">
            Account: {user?.email || user?.mobile} ({user?.role})
          </span>
        </div>

        {passError && (
          <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F0C9CD] text-xs text-[#A63A50] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        {passSuccess && (
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#E8DEC8] text-xs text-[#6D5220]">
            Super Admin voyaramedia / voyaramedia@gmail.com initial password: <strong className="font-mono">Mayur@2107</strong>. You can change it securely here anytime.
          </div>
        )}

        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              New Password * (Min 6 characters)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={savingPass}
            className="py-2.5 px-5 rounded-xl bg-[#2D2422] hover:bg-[#433532] text-white text-xs font-medium shadow transition disabled:opacity-60 cursor-pointer"
          >
            {savingPass ? 'Updating Password...' : 'Update Password Securely'}
          </button>
        </div>
      </form>
    </div>
  );
};
