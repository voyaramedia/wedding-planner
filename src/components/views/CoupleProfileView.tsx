import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Heart,
  Upload,
  Camera,
  Trash2,
  Calendar,
  Phone,
  Sparkles,
  Edit3,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';
import { GalleryCategory } from '../../types/index.ts';

export const CoupleProfileView: React.FC = () => {
  const { data, updateCoupleProfile, addGalleryPhoto, deleteGalleryPhoto } = useWeddingData();
  const { canEditEvents } = useAuth();

  const couple = data?.coupleProfile;
  const groom = couple?.groom;
  const bride = couple?.bride;

  const [isEditingGroom, setIsEditingGroom] = useState(false);
  const [isEditingBride, setIsEditingBride] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);

  // Groom Form
  const [groomName, setGroomName] = useState(groom?.name || '');
  const [groomNickname, setGroomNickname] = useState(groom?.nickname || '');
  const [groomDob, setGroomDob] = useState(groom?.dob || '');
  const [groomMobile, setGroomMobile] = useState(groom?.mobile || '');
  const [groomBio, setGroomBio] = useState(groom?.bio || '');

  // Bride Form
  const [brideName, setBrideName] = useState(bride?.name || '');
  const [brideNickname, setBrideNickname] = useState(bride?.nickname || '');
  const [brideDob, setBrideDob] = useState(bride?.dob || '');
  const [brideMobile, setBrideMobile] = useState(bride?.mobile || '');
  const [brideBio, setBrideBio] = useState(bride?.bio || '');

  // Story & Cover Form
  const [story, setStory] = useState(couple?.story || '');
  const [hashtag, setHashtag] = useState(couple?.hashtag || '');

  // Memory Gallery Upload Form
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCategory, setPhotoCategory] = useState<GalleryCategory>('bride');
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  // Photo uploads
  const handlePhotoUpload = async (file: File, type: 'groom' | 'bride' | 'cover') => {
    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png') && !file.type.includes('image/webp')) {
      alert('Please upload a valid JPG, JPEG, PNG, or WebP image.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadImage(dataUrl, file.name);

      if (type === 'groom') {
        await updateCoupleProfile({ groom: { ...groom!, photoUrl: res.url } });
      } else if (type === 'bride') {
        await updateCoupleProfile({ bride: { ...bride!, photoUrl: res.url } });
      } else {
        await updateCoupleProfile({ coverPhotoUrl: res.url });
      }
    } catch (err: any) {
      alert(err.message || 'Photo upload failed');
    }
  };

  const handleSaveGroom = async () => {
    try {
      await updateCoupleProfile({
        groom: {
          ...groom!,
          name: groomName.trim(),
          nickname: groomNickname.trim() || undefined,
          dob: groomDob || undefined,
          mobile: groomMobile.trim(),
          bio: groomBio.trim(),
        },
      });
      setIsEditingGroom(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update groom profile');
    }
  };

  const handleSaveBride = async () => {
    try {
      await updateCoupleProfile({
        bride: {
          ...bride!,
          name: brideName.trim(),
          nickname: brideNickname.trim() || undefined,
          dob: brideDob || undefined,
          mobile: brideMobile.trim(),
          bio: brideBio.trim(),
        },
      });
      setIsEditingBride(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update bride profile');
    }
  };

  const handleSaveStory = async () => {
    try {
      await updateCoupleProfile({
        story: story.trim(),
        hashtag: hashtag.trim(),
      });
      setIsEditingStory(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update story');
    }
  };

  const handleUploadGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingGallery(true);
      const dataUrl = await fileToDataUrl(file);
      const res = await api.uploadImage(dataUrl, file.name);

      await addGalleryPhoto({
        title: photoTitle.trim() || 'Wedding Memory',
        imageUrl: res.url,
        category: photoCategory,
        caption: photoCaption.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
      });

      setIsAddingPhoto(false);
      setPhotoTitle('');
      setPhotoCaption('');
    } catch (err: any) {
      alert(err.message || 'Failed to upload memory photo');
    } finally {
      setUploadingGallery(false);
    }
  };

  const gallery = data?.gallery || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Cover Header */}
      <div className="relative rounded-3xl overflow-hidden border border-[#E8DEC8] shadow-sm">
        <div className="h-64 sm:h-80 w-full relative">
          {couple?.coverPhotoUrl ? (
            <img
              src={couple.coverPhotoUrl}
              alt="Royal Wedding Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#2D2422] via-[#4A3B32] to-[#2D2422]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 md:p-8 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#EEDB96] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{couple?.hashtag || '#OurWedding'}</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mt-1 tracking-tight">
              {groom?.name && bride?.name
                ? `${groom.name} & ${bride.name}`
                : (groom?.name || bride?.name || 'Our Wedding Journey')}
            </h2>
            <p className="text-xs md:text-sm text-white/90 max-w-2xl mt-2 italic font-serif">
              "{couple?.story || 'Write and cherish your unique love story and journey together.'}"
            </p>
          </div>

          {canEditEvents && (
            <label className="absolute top-4 right-4 py-1.5 px-3 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition">
              <Camera className="w-3.5 h-3.5" />
              <span>Change Cover</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f, 'cover');
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Side-by-Side Couple Profile Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groom Profile Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="relative group">
                {groom?.photoUrl ? (
                  <img
                    src={groom.photoUrl}
                    alt={groom?.name || 'Groom'}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#D4AF37]/50 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#FAF5EB] to-[#EEDB96] border-2 border-[#D4AF37]/50 shadow-md flex items-center justify-center text-3xl font-serif font-bold text-[#8C6D34]">
                    {groom?.name ? groom.name.charAt(0).toUpperCase() : 'G'}
                  </div>
                )}
                {canEditEvents && (
                  <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <Camera className="w-6 h-6" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f, 'groom');
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D34] px-2 py-0.5 rounded-full bg-[#FAF5EB] border border-[#E8DEC8]">
                  The Royal Groom
                </span>
                <h3 className="text-xl md:text-2xl font-serif font-bold text-[#2D2422] mt-1.5">
                  {groom?.name || 'Groom Details'}
                </h3>
                {groom?.nickname && (
                  <div className="text-xs text-[#7A6B68]">
                    Pet Name: <strong className="text-[#5C4E4B] font-serif">"{groom.nickname}"</strong>
                  </div>
                )}
              </div>

              {canEditEvents && (
                <button
                  onClick={() => setIsEditingGroom(!isEditingGroom)}
                  className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition"
                  title="Edit groom profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Groom Bio & Details */}
            {isEditingGroom ? (
              <div className="mt-4 space-y-3 pt-4 border-t border-[#F0E6D2]">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Nickname</label>
                    <input
                      type="text"
                      value={groomNickname}
                      onChange={(e) => setGroomNickname(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={groomDob}
                      onChange={(e) => setGroomDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Personal Bio / Description</label>
                  <textarea
                    rows={3}
                    value={groomBio}
                    onChange={(e) => setGroomBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingGroom(false)}
                    className="py-1.5 px-3 rounded-lg border border-[#E5DFD7] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGroom}
                    className="py-1.5 px-3 rounded-lg bg-[#D4AF37] text-white text-xs font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 pt-4 border-t border-[#F0E6D2] text-xs text-[#5C4E4B]">
                <p className="leading-relaxed italic">
                  "{groom?.bio}"
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-[#7A6B68]">
                  {groom?.dob && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#B38F4D]" />
                      <span>Born: {formatDate(groom.dob)}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>{groom?.mobile} (Private)</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bride Profile Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="relative group">
                {bride?.photoUrl ? (
                  <img
                    src={bride.photoUrl}
                    alt={bride?.name || 'Bride'}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#F0C9CD] shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[#FDF2F4] to-[#F5CBD1] border-2 border-[#F0C9CD] shadow-md flex items-center justify-center text-3xl font-serif font-bold text-[#A63A50]">
                    {bride?.name ? bride.name.charAt(0).toUpperCase() : 'B'}
                  </div>
                )}
                {canEditEvents && (
                  <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <Camera className="w-6 h-6" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f, 'bride');
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A63A50] px-2 py-0.5 rounded-full bg-[#FDF2F4] border border-[#F0C9CD]">
                  The Royal Bride
                </span>
                <h3 className="text-xl md:text-2xl font-serif font-bold text-[#2D2422] mt-1.5">
                  {bride?.name || 'Bride Details'}
                </h3>
                {bride?.nickname && (
                  <div className="text-xs text-[#7A6B68]">
                    Pet Name: <strong className="text-[#5C4E4B] font-serif">"{bride.nickname}"</strong>
                  </div>
                )}
              </div>

              {canEditEvents && (
                <button
                  onClick={() => setIsEditingBride(!isEditingBride)}
                  className="p-1.5 rounded-lg text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition"
                  title="Edit bride profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bride Bio & Details */}
            {isEditingBride ? (
              <div className="mt-4 space-y-3 pt-4 border-t border-[#F0E6D2]">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Nickname</label>
                    <input
                      type="text"
                      value={brideNickname}
                      onChange={(e) => setBrideNickname(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={brideDob}
                      onChange={(e) => setBrideDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Personal Bio / Description</label>
                  <textarea
                    rows={3}
                    value={brideBio}
                    onChange={(e) => setBrideBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingBride(false)}
                    className="py-1.5 px-3 rounded-lg border border-[#E5DFD7] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBride}
                    className="py-1.5 px-3 rounded-lg bg-[#D4AF37] text-white text-xs font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 pt-4 border-t border-[#F0E6D2] text-xs text-[#5C4E4B]">
                <p className="leading-relaxed italic">
                  "{bride?.bio}"
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-[#7A6B68]">
                  {bride?.dob && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#B38F4D]" />
                      <span>Born: {formatDate(bride.dob)}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#B38F4D]" />
                    <span>{bride?.mobile} (Private)</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wedding Memories Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-xl text-[#2D2422]">
              Wedding & Engagement Memories
            </h3>
            <p className="text-xs text-[#7A6B68]">
              Cherished moments from proposals, fittings, ceremonies, and family gatherings
            </p>
          </div>

          <button
            onClick={() => setIsAddingPhoto(!isAddingPhoto)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#D4AF37] bg-[#FAF5EB] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Memory Photo</span>
          </button>
        </div>

        {/* Memory Uploader Form Drawer */}
        {isAddingPhoto && (
          <div className="p-5 rounded-3xl bg-[#FAF5EB] border border-[#E8DEC8] space-y-3 max-w-xl">
            <h4 className="font-serif font-bold text-sm text-[#2D2422]">
              Upload Memory to Wedding Album
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Moment Title</label>
                <input
                  type="text"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="e.g. Haldi Sunshine Smiles"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Category</label>
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value as GalleryCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="bride">Bride's Side</option>
                  <option value="groom">Groom's Side</option>
                  <option value="family">Family Gathering</option>
                  <option value="pre-wedding">Pre-Wedding</option>
                  <option value="engagement">Engagement</option>
                  <option value="wedding">Wedding Vivah</option>
                  <option value="reception">Reception</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Story Caption</label>
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="A short note remembering this day..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-medium cursor-pointer shadow hover:brightness-105 transition">
                <span>{uploadingGallery ? 'Uploading...' : 'Choose Photo from Device (JPG/PNG)'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUploadGalleryPhoto}
                  disabled={uploadingGallery}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsAddingPhoto(false)}
                className="text-xs text-[#7A6B68] hover:text-[#2D2422]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {gallery.map(item => (
            <div
              key={item.id}
              className="group relative rounded-3xl overflow-hidden border border-[#E8DEC8] bg-white shadow-xs flex flex-col"
            >
              <div className="relative h-56 w-full overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-[#8C6D34] shadow-xs">
                  {item.category}
                </span>

                {canEditEvents && (
                  <button
                    onClick={async () => {
                      if (confirm(`Remove photo "${item.title}"?`)) {
                        await deleteGalleryPhoto(item.id);
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 hover:bg-[#A63A50] text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#2D2422]">
                    {item.title}
                  </h4>
                  {item.caption && (
                    <p className="text-xs text-[#7A6B68] mt-1 line-clamp-2">
                      {item.caption}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#A89A96] mt-3 pt-2 border-t border-[#F0E6D2]">
                  <span>By: {item.uploadedBy}</span>
                  <span>{formatDate(item.date)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
