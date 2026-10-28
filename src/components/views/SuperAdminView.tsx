import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Calendar,
  Image as ImageIcon,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  MapPin,
  ExternalLink,
  Upload,
  Camera,
  Heart,
  User as UserIcon,
  Save,
  X,
  Database,
  Download,
  Eye,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { User, UserRole, WeddingEvent, EventType, GalleryItem, GalleryCategory } from '../../types/index.ts';
import { formatDate, fileToDataUrl } from '../../lib/utils.ts';

function toSafeIso(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString();
  
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

export const SuperAdminView: React.FC = () => {
  const { user } = useAuth();
  const {
    data,
    updateCoupleProfile,
    addEvent,
    updateEvent,
    deleteEvent,
    addGalleryPhoto,
    updateGalleryPhoto,
    deleteGalleryPhoto,
    adminDeletePhoto,
    refreshData,
  } = useWeddingData();

  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'couple' | 'photos' | 'security'>('users');
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Master Couple & Wedding Profile State
  const [adminWeddingTitle, setAdminWeddingTitle] = useState('');
  const [adminHashtag, setAdminHashtag] = useState('');
  const [adminGroomName, setAdminGroomName] = useState('');
  const [adminGroomMobile, setAdminGroomMobile] = useState('');
  const [adminGroomEmail, setAdminGroomEmail] = useState('');
  const [adminGroomBio, setAdminGroomBio] = useState('');
  const [adminBrideName, setAdminBrideName] = useState('');
  const [adminBrideMobile, setAdminBrideMobile] = useState('');
  const [adminBrideEmail, setAdminBrideEmail] = useState('');
  const [adminBrideBio, setAdminBrideBio] = useState('');
  const [savingCouple, setSavingCouple] = useState(false);

  // User Management State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserMobile, setEditUserMobile] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('family');
  const [editUserRelation, setEditUserRelation] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserPermissions, setEditUserPermissions] = useState({
    canEditBudget: false,
    canManageVendors: false,
    canManageTasks: true,
    canManageGuests: true,
    canEditEvents: false,
    canManageUsers: false,
  });

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('family');
  const [newUserRelation, setNewUserRelation] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Event (Date & Place) Management State
  const [editingEvent, setEditingEvent] = useState<WeddingEvent | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('wedding');
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventEndDateTime, setEventEndDateTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventMapLink, setEventMapLink] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [eventDressCode, setEventDressCode] = useState('');

  // Photo Management State
  const [photoFilter, setPhotoFilter] = useState<'all' | 'groom' | 'bride' | 'family' | 'ceremony'>('all');
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null>(null);
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCategory, setPhotoCategory] = useState<GalleryCategory>('ceremony');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDate, setPhotoDate] = useState('');

  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState<GalleryCategory>('family');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Security / Admin Password Form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const couple = data?.coupleProfile;
  const events = data?.events || [];
  const gallery = data?.gallery || [];
  const activityLogs = data?.activityLogs || [];

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.getUsers();
      setUsersList(res);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setActionAlert({ type, message });
    setTimeout(() => setActionAlert(null), 4000);
  };

  // -------------------------------------------------------------
  // USER ACCESS HANDLERS
  // -------------------------------------------------------------
  const openEditUser = (target: User) => {
    setEditingUser(target);
    setEditUserName(target.name);
    setEditUserMobile(target.mobile);
    setEditUserEmail(target.email || '');
    setEditUserRole(target.role);
    setEditUserRelation(target.relation || '');
    setEditUserPassword('');
    setEditUserPermissions({
      canEditBudget: !!target.permissions?.canEditBudget,
      canManageVendors: !!target.permissions?.canManageVendors,
      canManageTasks: !!target.permissions?.canManageTasks,
      canManageGuests: !!target.permissions?.canManageGuests,
      canEditEvents: !!target.permissions?.canEditEvents,
      canManageUsers: !!target.permissions?.canManageUsers,
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const payload: any = {
        name: editUserName.trim(),
        mobile: editUserMobile.trim(),
        email: editUserEmail.trim() || undefined,
        role: editUserRole,
        relation: editUserRelation.trim(),
        permissions: editUserPermissions,
      };

      if (editUserPassword && editUserPassword.length >= 6) {
        payload.password = editUserPassword;
      }

      await api.updateUser(editingUser.id, payload);
      showAlert(`User access & permissions updated for ${editUserName}!`);
      setEditingUser(null);
      await loadUsers();
      await refreshData();
    } catch (err: any) {
      showAlert(err.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (target: User) => {
    if (target.username === 'voyaramedia' || target.id === user?.id) {
      showAlert('Cannot delete Master Super Administrator voyaramedia!', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete user account "${target.name}" (${target.mobile})?`)) {
      return;
    }

    try {
      await api.deleteUser(target.id);
      showAlert(`User "${target.name}" has been deleted.`);
      await loadUsers();
      await refreshData();
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserMobile.trim() || !newUserPassword) {
      showAlert('Name, mobile number, and password are required', 'error');
      return;
    }

    try {
      await api.addUser({
        name: newUserName.trim(),
        mobile: newUserMobile.trim(),
        email: newUserEmail.trim() || undefined,
        password: newUserPassword,
        role: newUserRole,
        relation: newUserRelation.trim() || 'Family Member',
      });

      showAlert(`User "${newUserName}" created successfully!`);
      setIsAddUserModalOpen(false);
      setNewUserName('');
      setNewUserMobile('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRelation('');
      await loadUsers();
      await refreshData();
    } catch (err: any) {
      showAlert(err.message || 'Failed to add user', 'error');
    }
  };

  // -------------------------------------------------------------
  // MASTER COUPLE PROFILE HANDLER
  // -------------------------------------------------------------
  useEffect(() => {
    if (couple) {
      setAdminWeddingTitle(couple.weddingTitle || '');
      setAdminHashtag(couple.hashtag || '');
      setAdminGroomName(couple.groom?.name || '');
      setAdminGroomMobile(couple.groom?.mobile || '');
      setAdminGroomEmail(couple.groom?.email || '');
      setAdminGroomBio(couple.groom?.bio || '');
      setAdminBrideName(couple.bride?.name || '');
      setAdminBrideMobile(couple.bride?.mobile || '');
      setAdminBrideEmail(couple.bride?.email || '');
      setAdminBrideBio(couple.bride?.bio || '');
    }
  }, [couple]);

  const handleSaveCoupleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingCouple(true);
      await updateCoupleProfile({
        weddingTitle: adminWeddingTitle.trim() || 'Our Wedding',
        hashtag: adminHashtag.trim() || undefined,
        groom: {
          ...(couple?.groom || { nickname: '', dob: '', photoUrl: '' }),
          name: adminGroomName.trim(),
          mobile: adminGroomMobile.trim(),
          email: adminGroomEmail.trim(),
          bio: adminGroomBio.trim(),
        },
        bride: {
          ...(couple?.bride || { nickname: '', dob: '', photoUrl: '' }),
          name: adminBrideName.trim(),
          mobile: adminBrideMobile.trim(),
          email: adminBrideEmail.trim(),
          bio: adminBrideBio.trim(),
        },
      });
      showAlert('Master couple profile and wedding titles saved successfully!');
    } catch (err: any) {
      showAlert(err.message || 'Failed to save couple profile', 'error');
    } finally {
      setSavingCouple(false);
    }
  };

  // -------------------------------------------------------------
  // CEREMONY DATES & PLACES HANDLERS
  // -------------------------------------------------------------
  const openEditEvent = (evt: WeddingEvent) => {
    setEditingEvent(evt);
    setEventTitle(evt.title || (evt.type === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony'));
    setEventType(evt.type || 'wedding');
    setEventDateTime(toInputDateTime(evt.dateTime));
    setEventEndDateTime(toInputDateTime(evt.endDateTime));
    setEventVenue(evt.venue || '');
    setEventAddress(evt.address || '');
    setEventMapLink(evt.mapLink || '');
    setEventNotes(evt.notes || '');
    setEventDressCode(evt.dressCode || '');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    if (!eventDateTime || !eventVenue.trim()) {
      showAlert('Ceremony Date & Time and Venue name are required.', 'error');
      return;
    }

    const safeTitle = eventTitle.trim() || (eventType === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony');

    try {
      await updateEvent(editingEvent.id, {
        title: safeTitle,
        type: eventType,
        dateTime: toSafeIso(eventDateTime),
        endDateTime: eventEndDateTime ? toSafeIso(eventEndDateTime) : undefined,
        venue: eventVenue.trim(),
        address: eventAddress.trim() || undefined,
        mapLink: eventMapLink.trim() || undefined,
        notes: eventNotes.trim() || undefined,
        dressCode: eventDressCode.trim() || undefined,
      });

      showAlert(`Ceremony "${safeTitle}" date & place saved successfully!`);
      setEditingEvent(null);
    } catch (err: any) {
      showAlert(err.message || 'Failed to update ceremony details', 'error');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDateTime || !eventVenue.trim()) {
      showAlert('Ceremony Date & Time and Venue name are required.', 'error');
      return;
    }

    const safeTitle = eventTitle.trim() || (eventType === 'engagement' ? 'Ring Ceremony & Engagement' : 'Wedding Ceremony');

    try {
      await addEvent({
        title: safeTitle,
        type: eventType,
        dateTime: toSafeIso(eventDateTime),
        endDateTime: eventEndDateTime ? toSafeIso(eventEndDateTime) : undefined,
        venue: eventVenue.trim(),
        address: eventAddress.trim() || undefined,
        mapLink: eventMapLink.trim() || undefined,
        notes: eventNotes.trim() || undefined,
        dressCode: eventDressCode.trim() || undefined,
        owner: 'shared',
      });

      showAlert(`Ceremony "${safeTitle}" created and saved!`);
      setIsAddEventModalOpen(false);
      setEventTitle('');
      setEventDateTime('');
      setEventEndDateTime('');
      setEventVenue('');
      setEventAddress('');
      setEventMapLink('');
      setEventNotes('');
      setEventDressCode('');
    } catch (err: any) {
      showAlert(err.message || 'Failed to create event', 'error');
    }
  };

  const handleDeleteEvent = async (evt: WeddingEvent) => {
    if (!confirm(`Are you sure you want to delete ceremony "${evt.title}"?`)) return;

    try {
      await deleteEvent(evt.id);
      showAlert(`Ceremony "${evt.title}" has been deleted.`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete ceremony', 'error');
    }
  };

  // -------------------------------------------------------------
  // MASTER MEDIA & PHOTO MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleDeleteProfilePhoto = async (target: 'groom' | 'bride' | 'cover') => {
    const label = target === 'groom' ? "Groom's photo" : target === 'bride' ? "Bride's photo" : 'Cover photo';
    if (!confirm(`Delete and reset ${label}?`)) return;

    try {
      await adminDeletePhoto(`${target}_photo`);
      showAlert(`${label} has been removed.`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete photo', 'error');
    }
  };

  const handleUploadProfilePhoto = async (file: File, target: 'groom' | 'bride' | 'cover') => {
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadFile(dataUrl, file.name);

      const groomObj = couple?.groom || { name: '', nickname: '', dob: '', mobile: '', email: '', bio: '', photoUrl: '' };
      const brideObj = couple?.bride || { name: '', nickname: '', dob: '', mobile: '', email: '', bio: '', photoUrl: '' };

      if (target === 'groom') {
        await updateCoupleProfile({ groom: { ...groomObj, photoUrl: res.url } });
      } else if (target === 'bride') {
        await updateCoupleProfile({ bride: { ...brideObj, photoUrl: res.url } });
      } else {
        await updateCoupleProfile({ coverPhotoUrl: res.url });
      }

      showAlert(`${target.toUpperCase()} photo updated successfully!`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to upload photo', 'error');
    }
  };

  const handleAddPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoFile || !newPhotoPreview) {
      showAlert('Please choose a photo file to upload', 'error');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const res = await api.uploadFile(newPhotoPreview, newPhotoFile.name);

      await addGalleryPhoto({
        title: newPhotoTitle.trim() || 'Wedding Memory',
        imageUrl: res.url,
        category: newPhotoCategory,
        caption: newPhotoCaption.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      });

      showAlert('Photo added to wedding gallery successfully!');
      setIsAddPhotoModalOpen(false);
      setNewPhotoTitle('');
      setNewPhotoCaption('');
      setNewPhotoPreview(null);
      setNewPhotoFile(null);
    } catch (err: any) {
      showAlert(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const openEditPhoto = (photo: GalleryItem) => {
    setEditingPhoto(photo);
    setPhotoTitle(photo.title);
    setPhotoCategory(photo.category);
    setPhotoCaption(photo.caption || '');
    setPhotoDate(photo.date || new Date().toISOString().split('T')[0]);
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      await updateGalleryPhoto(editingPhoto.id, {
        title: photoTitle.trim(),
        category: photoCategory,
        caption: photoCaption.trim() || undefined,
        date: photoDate,
      });

      showAlert(`Photo details updated for "${photoTitle}"!`);
      setEditingPhoto(null);
    } catch (err: any) {
      showAlert(err.message || 'Failed to update photo', 'error');
    }
  };

  const handleDeleteGalleryPhoto = async (photo: GalleryItem) => {
    if (!confirm(`Delete photo "${photo.title}" from gallery?`)) return;

    try {
      await deleteGalleryPhoto(photo.id);
      showAlert(`Photo "${photo.title}" deleted.`);
    } catch (err: any) {
      showAlert(err.message || 'Failed to delete photo', 'error');
    }
  };

  // -------------------------------------------------------------
  // PASSWORD & BACKUP HANDLERS
  // -------------------------------------------------------------
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      showAlert('New password must be at least 6 characters.', 'error');
      return;
    }

    try {
      await api.changePassword(currentPass, newPass);
      showAlert('Super Admin voyaramedia password updated successfully!');
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      showAlert(err.message || 'Failed to update password', 'error');
    }
  };

  const handleExportDatabase = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter gallery photos
  const filteredGallery = gallery.filter((p) => {
    if (photoFilter === 'all') return true;
    if (photoFilter === 'groom') return p.category === 'groom';
    if (photoFilter === 'bride') return p.category === 'bride';
    if (photoFilter === 'family') return p.category === 'family';
    if (photoFilter === 'ceremony') {
      return (
        p.category === 'ceremony' ||
        p.category === 'engagement' ||
        p.category === 'wedding' ||
        p.category === 'pre-wedding' ||
        p.category === 'reception'
      );
    }
    return true;
  });

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-xs text-[#A63A50] bg-[#FDF2F4] rounded-2xl border border-[#F0C9CD] max-w-md mx-auto my-12">
        <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#A63A50]" />
        <div className="font-bold text-sm">Access Restricted</div>
        <div className="mt-1">
          This console is reserved exclusively for the platform Super Administrator (voyaramedia).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {actionAlert && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in ${
            actionAlert.type === 'success'
              ? 'bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]'
              : 'bg-[#FDF2F4] border border-[#F0C9CD] text-[#A63A50]'
          }`}
        >
          {actionAlert.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#A63A50] shrink-0" />
          )}
          <span>{actionAlert.message}</span>
        </div>
      )}

      {/* Super Admin Top Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#2D2422] via-[#3A2E2C] to-[#2D2422] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#EEDB96] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>Platform Super Administrator Console · voyaramedia</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-tight">
              Master Control & Configuration
            </h2>
            <p className="text-xs md:text-sm text-[#DDD4CE] max-w-xl font-light leading-relaxed">
              Full administrative authority to view, edit, save, or delete any user access, ceremony date, venue/place, and uploaded photo across the entire application.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#EEDB96]">Users</div>
              <div className="text-2xl font-serif font-bold text-white">{usersList.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#EEDB96]">Ceremonies</div>
              <div className="text-2xl font-serif font-bold text-white">{events.length}</div>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
              <div className="text-[10px] uppercase tracking-wider text-[#EEDB96]">Photos</div>
              <div className="text-2xl font-serif font-bold text-white">{gallery.length}</div>
            </div>
          </div>
        </div>

        {/* Master Tab Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#D4AF37] text-[#2D2422] shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. User Access & Permissions ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'events'
                ? 'bg-[#D4AF37] text-[#2D2422] shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Ceremony Dates & Places ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('couple')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'couple'
                ? 'bg-[#D4AF37] text-[#2D2422] shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>3. Couple & Wedding Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-[#D4AF37] text-[#2D2422] shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>4. Photos & Media ({gallery.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#D4AF37] text-[#2D2422] shadow-sm'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>5. Security & Audit Logs</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: MASTER USER ACCESS & PERMISSIONS */}
      {/* ============================================================= */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2D2422]">
                Platform User Accounts & Access Control
              </h3>
              <p className="text-xs text-[#7A6B68]">
                Edit roles, override passwords, customize individual permissions, or delete any account
              </p>
            </div>

            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5C4E4B]">
              <thead className="bg-[#FAF8F5] text-[#8C7E7A] uppercase text-[10px] tracking-wider border-y border-[#E8DEC8]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact (Mobile / Email)</th>
                  <th className="py-3 px-4">Permissions Active</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF8F5] transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#2D2422]">{u.name}</div>
                      <div className="text-[11px] text-[#8C7E7A]">{u.relation || u.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          u.role === 'admin'
                            ? 'bg-[#2D2422] text-white border-[#2D2422]'
                            : u.role === 'groom'
                            ? 'bg-[#FAF5EB] text-[#8C6D34] border-[#E8DEC8]'
                            : u.role === 'bride'
                            ? 'bg-[#FFF5F6] text-[#A63A50] border-[#F0C9CD]'
                            : 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px]">{u.mobile}</div>
                      <div className="text-[11px] text-[#8C7E7A] truncate max-w-[180px]">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.permissions?.canEditBudget && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Budget
                          </span>
                        )}
                        {u.permissions?.canManageVendors && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Vendors
                          </span>
                        )}
                        {u.permissions?.canManageTasks && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Tasks
                          </span>
                        )}
                        {u.permissions?.canManageGuests && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Guests
                          </span>
                        )}
                        {u.permissions?.canEditEvents && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Events
                          </span>
                        )}
                        {u.permissions?.canManageUsers && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#8C6D34] border border-[#E8DEC8]">
                            Users
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition cursor-pointer"
                          title="Edit user access & permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {u.username !== 'voyaramedia' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] transition cursor-pointer"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: MASTER CEREMONY DATES & PLACES */}
      {/* ============================================================= */}
      {activeTab === 'events' && (
        <div className="p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2D2422]">
                Ceremony Dates, Venues & Maps Management
              </h3>
              <p className="text-xs text-[#7A6B68]">
                Edit, save, or delete any ceremony date, time, venue address, and Google Maps pin
              </p>
            </div>

            <button
              onClick={() => {
                setEventTitle('');
                setEventType('wedding');
                setEventDateTime('');
                setEventVenue('');
                setEventAddress('');
                setEventMapLink('');
                setEventNotes('');
                setEventDressCode('');
                setIsAddEventModalOpen(true);
              }}
              className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ceremony</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const allCeremonies: WeddingEvent[] = [...events];
              if (!allCeremonies.some(e => e.type === 'engagement')) {
                allCeremonies.unshift({
                  id: 'evt_eng',
                  weddingId: couple?.weddingId || '',
                  title: 'Ring Ceremony & Engagement',
                  type: 'engagement',
                  dateTime: couple?.engagementDate || '',
                  venue: couple?.engagementVenue || '',
                  address: couple?.engagementAddress || '',
                  mapLink: couple?.engagementMapLink || '',
                  owner: 'shared',
                });
              }
              if (!allCeremonies.some(e => e.type === 'wedding')) {
                allCeremonies.push({
                  id: 'evt_wed',
                  weddingId: couple?.weddingId || '',
                  title: 'Sacred Wedding Vivah & Reception',
                  type: 'wedding',
                  dateTime: couple?.weddingDate || '',
                  venue: couple?.weddingVenue || '',
                  address: couple?.weddingAddress || '',
                  mapLink: couple?.weddingMapLink || '',
                  owner: 'shared',
                });
              }

              return allCeremonies.map((evt) => (
                <div
                  key={evt.id}
                  className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#8C6D34] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#E8DEC8]">
                        {evt.type}
                      </span>
                      <h4 className="font-serif font-bold text-base text-[#2D2422] mt-1.5">
                        {evt.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditEvent(evt)}
                        className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition cursor-pointer"
                        title="Edit ceremony date & venue"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt)}
                        className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#A63A50] hover:bg-[#FDF2F4] transition cursor-pointer"
                        title="Delete ceremony"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#5C4E4B]">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#B38F4D] shrink-0" />
                      <span className="font-medium">
                        {evt.dateTime ? formatDate(evt.dateTime) : 'Date Not Set'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#B38F4D] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-[#2D2422]">{evt.venue || 'Venue Not Set'}</div>
                        {evt.address && <div className="text-[11px] text-[#7A6B68]">{evt.address}</div>}
                      </div>
                    </div>

                    {evt.mapLink && (
                      <div className="pt-1">
                        <a
                          href={evt.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-[#8C6D34] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open Google Maps Pin</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: MASTER COUPLE & WEDDING PROFILE */}
      {/* ============================================================= */}
      {activeTab === 'couple' && (
        <form onSubmit={handleSaveCoupleProfile} className="p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0E6D2] pb-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#2D2422]">
                Master Couple Profile & Wedding Settings
              </h3>
              <p className="text-xs text-[#7A6B68]">
                Super Admin control to update groom and bride details, contact information, and wedding title
              </p>
            </div>

            <button
              type="submit"
              disabled={savingCouple}
              className="flex items-center gap-1.5 py-2 px-5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 transition disabled:opacity-60 cursor-pointer shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCouple ? 'Saving...' : 'Save Couple Profile'}</span>
            </button>
          </div>

          {/* Wedding Title & Hashtag */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Wedding Display Title</label>
              <input
                type="text"
                value={adminWeddingTitle}
                onChange={(e) => setAdminWeddingTitle(e.target.value)}
                placeholder="e.g. Royal Wedding Celebration"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-xs text-[#2D2422] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Wedding Hashtag</label>
              <input
                type="text"
                value={adminHashtag}
                onChange={(e) => setAdminHashtag(e.target.value)}
                placeholder="e.g. #OurRoyalVivah"
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] text-xs text-[#2D2422] outline-none"
              />
            </div>
          </div>

          {/* Groom & Bride Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Groom's Information */}
            <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#8C6D34] flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-[#D4AF37]" />
                <span>Groom's Details</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminGroomName}
                  onChange={(e) => setAdminGroomName(e.target.value)}
                  placeholder="Groom full name"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={adminGroomMobile}
                    onChange={(e) => setAdminGroomMobile(e.target.value)}
                    placeholder="Mobile number"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Email</label>
                  <input
                    type="email"
                    value={adminGroomEmail}
                    onChange={(e) => setAdminGroomEmail(e.target.value)}
                    placeholder="groom@example.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bio / Story</label>
                <textarea
                  rows={2}
                  value={adminGroomBio}
                  onChange={(e) => setAdminGroomBio(e.target.value)}
                  placeholder="Short groom bio..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>
            </div>

            {/* Bride's Information */}
            <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#F0C9CD] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#A63A50] flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#A63A50]" />
                <span>Bride's Details</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Full Name</label>
                <input
                  type="text"
                  value={adminBrideName}
                  onChange={(e) => setAdminBrideName(e.target.value)}
                  placeholder="Bride full name"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={adminBrideMobile}
                    onChange={(e) => setAdminBrideMobile(e.target.value)}
                    placeholder="Mobile number"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Email</label>
                  <input
                    type="email"
                    value={adminBrideEmail}
                    onChange={(e) => setAdminBrideEmail(e.target.value)}
                    placeholder="bride@example.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#5C4E4B] mb-1">Bio / Story</label>
                <textarea
                  rows={2}
                  value={adminBrideBio}
                  onChange={(e) => setAdminBrideBio(e.target.value)}
                  placeholder="Short bride bio..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ============================================================= */}
      {/* TAB 4: MASTER PHOTOS & MEDIA MANAGEMENT */}
      {/* ============================================================= */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Top Profile Photos Master Card */}
          <div className="p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
            <h3 className="text-lg font-serif font-bold text-[#2D2422]">
              Profile Photographs & Cover Banner
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Manage main avatars for Groom, Bride, and Dashboard cover header
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {/* Groom Photo Card */}
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-col items-center text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#8C6D34]">
                  Groom Profile Photo
                </div>
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#D4AF37] bg-[#FAF5EB] flex items-center justify-center">
                  {couple?.groom?.photoUrl ? (
                    <img src={couple.groom.photoUrl} alt="Groom" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-[#B38F4D]" />
                  )}
                </div>
                <div className="text-xs font-semibold text-[#2D2422]">{couple?.groom?.name || 'Groom'}</div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="py-1 px-3 rounded-lg bg-[#FAF5EB] border border-[#D4AF37] text-[11px] font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] cursor-pointer">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadProfilePhoto(e.target.files[0], 'groom')}
                      className="hidden"
                    />
                  </label>
                  {couple?.groom?.photoUrl && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfilePhoto('groom')}
                      className="py-1 px-2.5 rounded-lg border border-[#F0C9CD] text-[11px] text-[#A63A50] hover:bg-[#FDF2F4] cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Bride Photo Card */}
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#F0C9CD] flex flex-col items-center text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#A63A50]">
                  Bride Profile Photo
                </div>
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#F0C9CD] bg-[#FFF5F6] flex items-center justify-center">
                  {couple?.bride?.photoUrl ? (
                    <img src={couple.bride.photoUrl} alt="Bride" className="w-full h-full object-cover" />
                  ) : (
                    <Heart className="w-8 h-8 text-[#A63A50]" />
                  )}
                </div>
                <div className="text-xs font-semibold text-[#2D2422]">{couple?.bride?.name || 'Bride'}</div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="py-1 px-3 rounded-lg bg-[#FFF5F6] border border-[#F0C9CD] text-[11px] font-semibold text-[#A63A50] hover:bg-[#FDE8EB] cursor-pointer">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadProfilePhoto(e.target.files[0], 'bride')}
                      className="hidden"
                    />
                  </label>
                  {couple?.bride?.photoUrl && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfilePhoto('bride')}
                      className="py-1 px-2.5 rounded-lg border border-[#F0C9CD] text-[11px] text-[#A63A50] hover:bg-[#FDF2F4] cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Cover Banner Card */}
              <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E8DEC8] flex flex-col items-center text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#5C4E4B]">
                  Cover Banner Photograph
                </div>
                <div className="w-full h-24 rounded-2xl overflow-hidden border-2 border-[#E8DEC8] bg-[#FAF8F5] flex items-center justify-center">
                  {couple?.coverPhotoUrl ? (
                    <img src={couple.coverPhotoUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] text-[#8C7E7A]">No Banner Set</span>
                  )}
                </div>
                <div className="text-xs text-[#7A6B68]">Top Dashboard Banner</div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="py-1 px-3 rounded-lg bg-[#FAF5EB] border border-[#D4AF37] text-[11px] font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] cursor-pointer">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleUploadProfilePhoto(e.target.files[0], 'cover')}
                      className="hidden"
                    />
                  </label>
                  {couple?.coverPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProfilePhoto('cover')}
                      className="py-1 px-2.5 rounded-lg border border-[#F0C9CD] text-[11px] text-[#A63A50] hover:bg-[#FDF2F4] cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Master Gallery Grid */}
          <div className="p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#2D2422]">
                  Master Gallery & Album Photos
                </h3>
                <p className="text-xs text-[#7A6B68]">
                  View, edit details, or permanently delete any photo in the entire celebration gallery
                </p>
              </div>

              <button
                onClick={() => {
                  setNewPhotoTitle('');
                  setNewPhotoCaption('');
                  setNewPhotoPreview(null);
                  setNewPhotoFile(null);
                  setIsAddPhotoModalOpen(true);
                }}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium shadow hover:brightness-105 transition cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New Photo</span>
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {(['all', 'groom', 'bride', 'family', 'ceremony'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPhotoFilter(filter)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer capitalize ${
                    photoFilter === filter
                      ? 'bg-[#2D2422] text-white'
                      : 'bg-[#FAF8F5] text-[#7A6B68] hover:bg-[#F3EAD5]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              {filteredGallery.length === 0 ? (
                <div className="col-span-full py-10 text-center text-xs text-[#8C7E7A] bg-[#FAF8F5] rounded-2xl border border-[#E8DEC8]">
                  No photos found in this category.
                </div>
              ) : (
                filteredGallery.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden bg-white border border-[#E8DEC8] hover:border-[#D4AF37] shadow-xs flex flex-col"
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-[#FAF8F5]">
                      <img src={photo.imageUrl} alt={photo.title} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-[#8C6D34] shadow-2xs">
                        {photo.category}
                      </span>
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => openEditPhoto(photo)}
                          className="p-1 rounded-lg bg-black/60 hover:bg-white hover:text-[#2D2422] text-white transition cursor-pointer"
                          title="Edit details"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryPhoto(photo)}
                          className="p-1 rounded-lg bg-black/60 hover:bg-[#A63A50] text-white transition cursor-pointer"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-xs text-[#2D2422] truncate">
                          {photo.title}
                        </h4>
                        {photo.caption && (
                          <p className="text-[11px] text-[#7A6B68] mt-0.5 line-clamp-1">
                            {photo.caption}
                          </p>
                        )}
                      </div>
                      <div className="text-[10px] text-[#A89A96] mt-2 pt-1 border-t border-[#F5EFE6]">
                        {photo.date ? formatDate(photo.date) : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: SECURITY & PLATFORM AUDIT LOGS */}
      {/* ============================================================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C6D34]">
              <Key className="w-4 h-4 text-[#D4AF37]" />
              <span>Update Admin Credentials</span>
            </div>
            <h3 className="font-serif font-bold text-base text-[#2D2422]">
              Change voyaramedia Password
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  New Secure Password
                </label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#2D2422] text-white font-medium text-xs hover:bg-black transition cursor-pointer"
              >
                Update Password
              </button>
            </form>

            <div className="pt-4 border-t border-[#F0E6D2]">
              <div className="text-xs font-semibold text-[#5C4E4B] mb-2">Database Backup</div>
              <button
                type="button"
                onClick={handleExportDatabase}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#D4AF37] bg-[#FAF5EB] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Database JSON</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-2 p-6 rounded-3xl bg-white border border-[#E8DEC8] shadow-xs space-y-4">
            <h3 className="text-base font-serif font-bold text-[#2D2422]">
              Platform Activity & Audit Trail
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Immutable audit log of user actions, logins, ceremony changes, and media uploads
            </p>

            <div className="divide-y divide-[#F5EFE6] max-h-96 overflow-y-auto pr-1">
              {activityLogs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#2D2422]">{log.action}</div>
                    <div className="text-[11px] text-[#8C7E7A]">
                      By {log.userName} · Category: <span className="font-medium text-[#8C6D34]">{log.category}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#A89A96] whitespace-nowrap">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT USER MODAL */}
      {/* ============================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 sm:p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Edit User Access & Permissions
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">User Role *</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none capitalize"
                  >
                    <option value="groom">Groom</option>
                    <option value="bride">Bride</option>
                    <option value="family">Family Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={editUserMobile}
                    onChange={(e) => setEditUserMobile(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="Enter new password to override"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="pt-2 border-t border-[#F0E6D2]">
                <div className="text-xs font-bold text-[#8C6D34] mb-2 uppercase tracking-wider">
                  Granted Access Permissions
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#5C4E4B]">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canEditBudget}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canEditBudget: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Edit Budgets & Expenses</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canManageVendors}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canManageVendors: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Manage Vendors</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canManageTasks}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canManageTasks: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Manage Tasks</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canManageGuests}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canManageGuests: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Manage Guests & RSVPs</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canEditEvents}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canEditEvents: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Edit Dates & Places</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#E8DEC8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editUserPermissions.canManageUsers}
                      onChange={(e) =>
                        setEditUserPermissions({ ...editUserPermissions, canManageUsers: e.target.checked })
                      }
                      className="rounded text-[#D4AF37]"
                    />
                    <span>Manage Other Users</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* ADD NEW USER MODAL */}
      {/* ============================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 sm:p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base text-[#2D2422]">
                Create User Account
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={newUserMobile}
                    onChange={(e) => setNewUserMobile(e.target.value)}
                    placeholder="9822110033"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="family">Family Member</option>
                    <option value="groom">Groom</option>
                    <option value="bride">Bride</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Password *</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT CEREMONY DATE & PLACE MODAL */}
      {/* ============================================================= */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 sm:p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Edit Ceremony Date, Place & Maps
              </h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Ceremony Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Ceremony Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="engagement">Engagement Ceremony</option>
                    <option value="wedding">Wedding Vivah / Pheras</option>
                    <option value="haldi">Haldi Ceremony</option>
                    <option value="mehendi">Mehendi Ceremony</option>
                    <option value="sangeet">Sangeet & Cocktail</option>
                    <option value="reception">Reception Celebration</option>
                    <option value="other">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Venue Name *</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. The Taj Palace Grand Ballroom"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Venue Address / Place</label>
                <input
                  type="text"
                  value={eventAddress}
                  onChange={(e) => setEventAddress(e.target.value)}
                  placeholder="e.g. Sardar Patel Marg, Diplomatic Enclave, New Delhi"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Google Maps Location Link</label>
                <input
                  type="url"
                  value={eventMapLink}
                  onChange={(e) => setEventMapLink(e.target.value)}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105"
                >
                  Save Date & Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* ADD CEREMONY MODAL */}
      {/* ============================================================= */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 sm:p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Add New Ceremony
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEventModalOpen(false)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Ceremony Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Royal Vivah & Pheras"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Ceremony Type *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="engagement">Engagement</option>
                    <option value="haldi">Haldi</option>
                    <option value="mehendi">Mehendi</option>
                    <option value="sangeet">Sangeet</option>
                    <option value="reception">Reception</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Venue Name *</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. The Taj Palace"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Address / Place</label>
                <input
                  type="text"
                  value={eventAddress}
                  onChange={(e) => setEventAddress(e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Google Maps Link</label>
                <input
                  type="url"
                  value={eventMapLink}
                  onChange={(e) => setEventMapLink(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105"
                >
                  Create Ceremony
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT PHOTO MODAL */}
      {/* ============================================================= */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base text-[#2D2422]">
                Edit Photo Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Title</label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Category</label>
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="groom">Groom's Side</option>
                  <option value="bride">Bride's Side</option>
                  <option value="family">Family & Relatives</option>
                  <option value="ceremony">Ceremonies</option>
                  <option value="pre-wedding">Pre-Wedding</option>
                  <option value="reception">Reception</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Story Caption</label>
                <textarea
                  rows={2}
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105"
                >
                  Save Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* ADD NEW PHOTO MODAL (SUPER ADMIN) */}
      {/* ============================================================= */}
      {isAddPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-md bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base text-[#2D2422]">
                Upload Photo to Gallery
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPhotoModalOpen(false)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Album Category *</label>
                <select
                  value={newPhotoCategory}
                  onChange={(e) => setNewPhotoCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="groom">Groom's Side Album</option>
                  <option value="bride">Bride's Side Album</option>
                  <option value="family">Family & Relatives Album</option>
                  <option value="ceremony">Ceremonies (Vivah, Ring, Haldi)</option>
                  <option value="pre-wedding">Pre-Wedding Shoot</option>
                  <option value="reception">Reception Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Photo Title *</label>
                <input
                  type="text"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="e.g. Sangeet Celebration"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Short memory description..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Select Photo File *</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setNewPhotoFile(f);
                    const reader = new FileReader();
                    reader.onload = () => setNewPhotoPreview(reader.result as string);
                    reader.readAsDataURL(f);
                  }}
                  required
                  className="w-full text-xs text-[#5C4E4B] file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF5EB] file:text-[#8C6D34]"
                />
                {newPhotoPreview && (
                  <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-[#E8DEC8]">
                    <img src={newPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPhotoModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPhoto || !newPhotoFile}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 disabled:opacity-50"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
