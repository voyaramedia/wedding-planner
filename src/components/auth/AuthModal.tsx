import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Eye,
  EyeOff,
  Heart,
  Lock,
  Phone,
  User as UserIcon,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  Globe,
  Upload,
  Copy,
  Check,
} from 'lucide-react';
import { UserRole } from '../../types/index.ts';
import { fireCelebrationConfetti } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const { login, registerCouple, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'couple_register' | 'family_register' | 'forgot'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Single Master Couple Registration State
  const [groomName, setGroomName] = useState('');
  const [groomMobile, setGroomMobile] = useState('');
  const [groomEmail, setGroomEmail] = useState('');
  const [groomPassword, setGroomPassword] = useState('');
  const [groomPhotoUrl, setGroomPhotoUrl] = useState('');
  const [showGroomPass, setShowGroomPass] = useState(false);

  const [brideName, setBrideName] = useState('');
  const [brideMobile, setBrideMobile] = useState('');
  const [brideEmail, setBrideEmail] = useState('');
  const [bridePassword, setBridePassword] = useState('');
  const [bridePhotoUrl, setBridePhotoUrl] = useState('');
  const [showBridePass, setShowBridePass] = useState(false);

  const [weddingTitle, setWeddingTitle] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [preferredTimeZone, setPreferredTimeZone] = useState('Asia/Kolkata (IST)');

  const [engagementDate, setEngagementDate] = useState('');
  const [engagementTime, setEngagementTime] = useState('');
  const [engagementVenue, setEngagementVenue] = useState('');
  const [engagementAddress, setEngagementAddress] = useState('');
  const [engagementMapLink, setEngagementMapLink] = useState('');

  const [weddingDate, setWeddingDate] = useState('');
  const [weddingTime, setWeddingTime] = useState('');
  const [weddingVenue, setWeddingVenue] = useState('');
  const [weddingAddress, setWeddingAddress] = useState('');
  const [weddingMapLink, setWeddingMapLink] = useState('');

  // Family Member Register State
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('family');
  const [regRelation, setRegRelation] = useState('');

  // Forgot Password State
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Success Confirmation with Wedding ID
  const [createdWeddingId, setCreatedWeddingId] = useState<string | null>(null);
  const [copiedWeddingId, setCopiedWeddingId] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your mobile number, email, or username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(identifier.trim(), password);
      fireCelebrationConfetti();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCoupleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groomName.trim() || !groomMobile.trim() || !groomPassword) {
      setError("Please provide Groom's full name, mobile number, and password.");
      return;
    }
    if (!brideName.trim() || !brideMobile.trim() || !bridePassword) {
      setError("Please provide Bride's full name, mobile number, and password.");
      return;
    }
    if (groomPassword.length < 6 || bridePassword.length < 6) {
      setError('Both Groom and Bride passwords must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await registerCouple({
        groomName: groomName.trim(),
        groomMobile: groomMobile.trim(),
        groomEmail: groomEmail.trim() || `${groomMobile.trim()}@groom.wedding`,
        groomPassword,
        groomPhotoUrl: groomPhotoUrl.trim() || undefined,

        brideName: brideName.trim(),
        brideMobile: brideMobile.trim(),
        brideEmail: brideEmail.trim() || `${brideMobile.trim()}@bride.wedding`,
        bridePassword,
        bridePhotoUrl: bridePhotoUrl.trim() || undefined,

        weddingTitle: weddingTitle.trim() || (groomName && brideName ? `${groomName.trim()} & ${brideName.trim()}'s Wedding` : 'Our Wedding'),
        preferredLanguage,
        preferredTimeZone,

        engagementDate: engagementDate || '',
        engagementTime: engagementTime || '',
        engagementVenue: engagementVenue.trim() || '',
        engagementAddress: engagementAddress.trim() || undefined,
        engagementMapLink: engagementMapLink.trim() || undefined,

        weddingDate: weddingDate || '',
        weddingTime: weddingTime || '',
        weddingVenue: weddingVenue.trim() || '',
        weddingAddress: weddingAddress.trim() || undefined,
        weddingMapLink: weddingMapLink.trim() || undefined,
      });

      setCreatedWeddingId(res.weddingId);
      fireCelebrationConfetti();
      setTimeout(() => {
        onSuccess?.();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Couple registration failed. Mobile number might already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regMobile.trim() || !regPassword) {
      setError('Full name, mobile number, and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register({
        name: regName.trim(),
        mobile: regMobile.trim(),
        email: regEmail.trim() || undefined,
        password: regPassword,
        role: regRole,
        relation: regRelation.trim() || 'Family Member',
      });
      fireCelebrationConfetti();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Mobile or email might already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim() || !forgotNewPassword) {
      setError('Please provide your mobile number or email and a new password.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.forgotPassword(forgotIdentifier.trim(), forgotNewPassword);
      setForgotSuccess(res.message || 'Password has been reset successfully!');
      setTimeout(() => {
        setMode('login');
        setIdentifier(forgotIdentifier);
        setPassword(forgotNewPassword);
        setForgotSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'groom' | 'bride') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const res = await api.uploadFile(dataUrl, file.name);
        if (target === 'groom') {
          setGroomPhotoUrl(res.url);
        } else {
          setBridePhotoUrl(res.url);
        }
      } catch (err: any) {
        setError('Failed to upload profile photo: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };


  const copyWeddingId = () => {
    if (!createdWeddingId) return;
    navigator.clipboard.writeText(createdWeddingId);
    setCopiedWeddingId(true);
    setTimeout(() => setCopiedWeddingId(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] border border-[#D4AF37]/40 rounded-3xl shadow-2xl p-5 sm:p-7 md:p-9 my-auto max-h-[94vh] flex flex-col overflow-hidden">
        {/* Soft Background Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-[#EEDB96]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-[#F8E7E9]/50 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center relative z-10 mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FAF5EB] border border-[#D4AF37]/50 text-[#B38F4D] mb-2.5 shadow-inner">
            <Heart className="w-6 h-6 fill-[#D4AF37]/30" />
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2422] tracking-tight">
            Our Wedding Planner
          </h2>
          <p className="text-xs md:text-sm text-[#7A6B68] mt-1 font-light">
            Single Master Registration · Independent Workspaces · Shared Celebration
          </p>

          {/* Mode Navigation Tabs */}
          <div className="flex items-center justify-center gap-1 mt-4 p-1 bg-[#F5EFE6]/80 rounded-xl max-w-md mx-auto border border-[#E8DEC8]">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#2D2422] shadow-sm font-semibold'
                  : 'text-[#7A6B68] hover:text-[#2D2422]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('couple_register'); setError(null); }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'couple_register'
                  ? 'bg-white text-[#8C6D34] shadow-sm font-semibold'
                  : 'text-[#7A6B68] hover:text-[#2D2422]'
              }`}
            >
              Couple Registration
            </button>
            <button
              type="button"
              onClick={() => { setMode('family_register'); setError(null); }}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'family_register'
                  ? 'bg-white text-[#2D2422] shadow-sm font-semibold'
                  : 'text-[#7A6B68] hover:text-[#2D2422]'
              }`}
            >
              Family Member
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#F0C9CD] text-[#A63A50] text-xs flex items-start gap-2.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#A63A50]" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {forgotSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs flex items-start gap-2.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#166534]" />
            <span className="leading-relaxed">{forgotSuccess}</span>
          </div>
        )}

        {/* Wedding ID Generated Celebration Banner */}
        {createdWeddingId && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#FAF5EB] to-[#FFF8F0] border-2 border-[#D4AF37] text-center shrink-0">
            <Sparkles className="w-6 h-6 text-[#D4AF37] mx-auto mb-1 animate-bounce" />
            <div className="text-xs font-semibold uppercase tracking-wider text-[#8C6D34]">
              Wedding Registration Created Successfully!
            </div>
            <div className="text-sm text-[#5C4E4B] mt-1">
              Your Master Wedding Identification Code:
            </div>
            <div className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-white rounded-xl border border-[#D4AF37] shadow-sm">
              <span className="font-mono text-base font-bold text-[#8C6D34] tracking-widest">
                {createdWeddingId}
              </span>
              <button
                type="button"
                onClick={copyWeddingId}
                className="p-1 text-[#8C6D34] hover:text-[#5C4E4B] cursor-pointer"
                title="Copy Wedding ID"
              >
                {copiedWeddingId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#7A6B68] mt-2 font-light">
              Groom and Bride accounts are now active and linked to this ID. Redirecting to your dashboard...
            </p>
          </div>
        )}

        {/* 1. SIGN IN MODE */}
        {mode === 'login' && !createdWeddingId && (
          <form onSubmit={handleLogin} className="space-y-4 relative z-10 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1.5">
                Mobile Number, Email, or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9811223344 or voyaramedia"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5DFD7] text-sm text-[#2D2422] placeholder:text-[#AAA09D] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                />
                <Phone className="w-4 h-4 text-[#9C8F8B] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[#5C4E4B]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); }}
                  className="text-xs text-[#B38F4D] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-[#E5DFD7] text-sm text-[#2D2422] placeholder:text-[#AAA09D] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                />
                <Lock className="w-4 h-4 text-[#9C8F8B] absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#9C8F8B] hover:text-[#5C4E4B]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B38F4D] text-white font-medium text-sm tracking-wide shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        )}

        {/* 2. SINGLE MASTER REGISTRATION FOR EACH COUPLE */}
        {mode === 'couple_register' && !createdWeddingId && (
          <form onSubmit={handleCoupleRegister} className="space-y-4 relative z-10 overflow-y-auto pr-1">
            <div className="p-3 bg-[#FAF5EB] rounded-2xl border border-[#E8DEC8] text-xs text-[#6D5220] leading-relaxed">
              <span className="font-bold">One Master Registration:</span> Creates a single unique Wedding ID for the couple, along with separate login credentials and independent private workspaces for both Groom and Bride.
            </div>

            {/* Wedding Title & General Info */}
            <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-[#E8DEC8]">
              <div className="text-xs font-bold text-[#8C6D34] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                1. Wedding Title & Preferences
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">
                  Wedding Display Name / Title
                </label>
                <input
                  type="text"
                  value={weddingTitle}
                  onChange={(e) => setWeddingTitle(e.target.value)}
                  placeholder="e.g. Our Royal Wedding Celebration"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Time Zone</label>
                  <select
                    value={preferredTimeZone}
                    onChange={(e) => setPreferredTimeZone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  >
                    <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="America/New_York (EST)">America/New_York (EST)</option>
                    <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                    <option value="Asia/Dubai (GST)">Asia/Dubai (GST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Groom Details Card */}
            <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-[#D4AF37]/30 shadow-2xs">
              <div className="text-xs font-bold text-[#8C6D34] flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                  2. Groom Account Credentials
                </span>
                <span className="text-[10px] font-normal text-[#8C7E7A] bg-[#FAF5EB] px-2 py-0.5 rounded-md">
                  Independent Workspace
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Groom's Full Name *</label>
                  <input
                    type="text"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    placeholder="e.g. Groom's Name"
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Groom's Mobile *</label>
                  <input
                    type="tel"
                    value={groomMobile}
                    onChange={(e) => setGroomMobile(e.target.value)}
                    placeholder="e.g. 9811223344"
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Groom's Email</label>
                  <input
                    type="email"
                    value={groomEmail}
                    onChange={(e) => setGroomEmail(e.target.value)}
                    placeholder="groom@example.com"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Groom's Password *</label>
                  <div className="relative">
                    <input
                      type={showGroomPass ? 'text' : 'password'}
                      value={groomPassword}
                      onChange={(e) => setGroomPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full px-3 pr-8 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGroomPass(!showGroomPass)}
                      className="absolute right-2.5 top-2 text-[#9C8F8B]"
                    >
                      {showGroomPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Groom Photo Upload */}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-[#FAF5EB] border border-[#E8DEC8] text-[11px] text-[#8C6D34] hover:bg-[#F3EAD5] cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload Groom Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'groom')}
                    className="hidden"
                  />
                </label>
                {groomPhotoUrl && <span className="text-[10px] text-green-700">✓ Photo attached</span>}
              </div>
            </div>

            {/* Bride Details Card */}
            <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-[#F0C9CD] shadow-2xs">
              <div className="text-xs font-bold text-[#A63A50] flex items-center justify-between">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Heart className="w-3.5 h-3.5 text-[#A63A50]" />
                  3. Bride Account Credentials
                </span>
                <span className="text-[10px] font-normal text-[#8C7E7A] bg-[#FDF2F4] px-2 py-0.5 rounded-md">
                  Independent Workspace
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bride's Full Name *</label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    placeholder="e.g. Bride's Name"
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bride's Mobile *</label>
                  <input
                    type="tel"
                    value={brideMobile}
                    onChange={(e) => setBrideMobile(e.target.value)}
                    placeholder="e.g. 9899887766"
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bride's Email</label>
                  <input
                    type="email"
                    value={brideEmail}
                    onChange={(e) => setBrideEmail(e.target.value)}
                    placeholder="ananya@example.com"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bride's Password *</label>
                  <div className="relative">
                    <input
                      type={showBridePass ? 'text' : 'password'}
                      value={bridePassword}
                      onChange={(e) => setBridePassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full px-3 pr-8 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422] focus:border-[#D4AF37] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBridePass(!showBridePass)}
                      className="absolute right-2.5 top-2 text-[#9C8F8B]"
                    >
                      {showBridePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bride Photo Upload */}
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-[#FAF5EB] border border-[#E8DEC8] text-[11px] text-[#8C6D34] hover:bg-[#F3EAD5] cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Upload Bride Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, 'bride')}
                    className="hidden"
                  />
                </label>
                {bridePhotoUrl && <span className="text-[10px] text-green-700">✓ Photo attached</span>}
              </div>
            </div>

            {/* Engagement Details */}
            <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-[#E8DEC8]">
              <div className="text-xs font-bold text-[#8C6D34] flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                4. Engagement Ceremony Details
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Engagement Date</label>
                  <input
                    type="date"
                    value={engagementDate}
                    onChange={(e) => setEngagementDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Engagement Time</label>
                  <input
                    type="time"
                    value={engagementTime}
                    onChange={(e) => setEngagementTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#7A6B68] mb-0.5">Venue Name</label>
                <input
                  type="text"
                  value={engagementVenue}
                  onChange={(e) => setEngagementVenue(e.target.value)}
                  placeholder="e.g. The Leela Palace Courtyard, Udaipur"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Venue Address</label>
                  <input
                    type="text"
                    value={engagementAddress}
                    onChange={(e) => setEngagementAddress(e.target.value)}
                    placeholder="Lake Pichola, Udaipur"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Google Maps Link</label>
                  <input
                    type="url"
                    value={engagementMapLink}
                    onChange={(e) => setEngagementMapLink(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
              </div>
            </div>

            {/* Wedding Ceremony Details */}
            <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-[#E8DEC8]">
              <div className="text-xs font-bold text-[#8C6D34] flex items-center gap-1.5 uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-[#D4AF37]" />
                5. Sacred Wedding Ceremony Details
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Wedding Date</label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Wedding Time</label>
                  <input
                    type="time"
                    value={weddingTime}
                    onChange={(e) => setWeddingTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#7A6B68] mb-0.5">Venue Name</label>
                <input
                  type="text"
                  value={weddingVenue}
                  onChange={(e) => setWeddingVenue(e.target.value)}
                  placeholder="e.g. Taj Lake Palace Royal Gardens, Udaipur"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Venue Address</label>
                  <input
                    type="text"
                    value={weddingAddress}
                    onChange={(e) => setWeddingAddress(e.target.value)}
                    placeholder="Pichola, Udaipur, Rajasthan"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7A6B68] mb-0.5">Google Maps Link</label>
                  <input
                    type="url"
                    value={weddingMapLink}
                    onChange={(e) => setWeddingMapLink(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5DFD7] text-xs text-[#2D2422]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B38F4D] text-white font-medium text-xs tracking-wide shadow-md hover:brightness-105 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? 'Creating Master Wedding & Generating Wedding ID...' : 'Complete Couple Registration & Open Dashboard'}
            </button>
          </form>
        )}

        {/* 3. FAMILY MEMBER REGISTRATION */}
        {mode === 'family_register' && !createdWeddingId && (
          <form onSubmit={handleFamilyRegister} className="space-y-3.5 relative z-10 overflow-y-auto pr-1">
            <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#E8DEC8] text-xs text-[#6D5220]">
              Register as an authorized family member to access shared celebration schedules, RSVP lists, and assigned tasks.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5C4E4B] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4E4B] mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="e.g. 9822334455"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#5C4E4B] mb-1">Email</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="family@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4E4B] mb-1">Relation / Role *</label>
                <input
                  type="text"
                  value={regRelation}
                  onChange={(e) => setRegRelation(e.target.value)}
                  placeholder="e.g. Groom's Father, Bride's Sister"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">Password *</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B38F4D] text-white font-medium text-xs tracking-wide shadow hover:brightness-105 transition disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              {loading ? 'Registering...' : 'Register as Family Member'}
            </button>
          </form>
        )}

        {/* 4. FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 relative z-10">
            <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#E8DEC8] text-xs text-[#6D5220]">
              Enter the mobile number, email, or username registered with your account, along with your new password.
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                Registered Mobile Number or Email
              </label>
              <input
                type="text"
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="e.g. 9811223344 or voyaramedia@gmail.com"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4E4B] mb-1">
                New Secure Password
              </label>
              <input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="flex-1 py-2.5 rounded-xl border border-[#E5DFD7] text-[#5C4E4B] text-xs font-medium hover:bg-[#FAF8F5] transition"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-white text-xs font-medium hover:brightness-105 transition disabled:opacity-60"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
