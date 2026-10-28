import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { GalleryItem, GalleryCategory } from '../../types/index.ts';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Download,
  X,
  Filter,
  Sparkles,
  Heart,
  User,
  Users,
  Calendar,
  Eye,
  Camera,
  Check,
} from 'lucide-react';
import { fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';

export const GalleryView: React.FC = () => {
  const { data, addGalleryPhoto, updateGalleryPhoto, deleteGalleryPhoto } = useWeddingData();
  const { canEditEvents } = useAuth();

  const [activeFilter, setActiveFilter] = useState<'all' | 'groom' | 'bride' | 'family' | 'ceremony'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<GalleryCategory>('family');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<GalleryCategory>('family');
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const gallery = data?.gallery || [];
  const couple = data?.coupleProfile;

  // Filter gallery photos
  const filteredPhotos = gallery.filter((photo) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'groom') return photo.category === 'groom';
    if (activeFilter === 'bride') return photo.category === 'bride';
    if (activeFilter === 'family') return photo.category === 'family';
    if (activeFilter === 'ceremony') {
      return (
        photo.category === 'ceremony' ||
        photo.category === 'engagement' ||
        photo.category === 'wedding' ||
        photo.category === 'pre-wedding' ||
        photo.category === 'reception'
      );
    }
    return true;
  });

  // Album Counts
  const totalCount = gallery.length;
  const groomCount = gallery.filter((p) => p.category === 'groom').length;
  const brideCount = gallery.filter((p) => p.category === 'bride').length;
  const familyCount = gallery.filter((p) => p.category === 'family').length;
  const ceremonyCount = gallery.filter(
    (p) =>
      p.category === 'ceremony' ||
      p.category === 'engagement' ||
      p.category === 'wedding' ||
      p.category === 'pre-wedding' ||
      p.category === 'reception'
  ).length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png') && !file.type.includes('image/webp')) {
      alert('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    setUploadFileObj(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileObj || !uploadPreview) {
      alert('Please select an image file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.uploadFile(uploadPreview, uploadFileObj.name);

      await addGalleryPhoto({
        title: uploadTitle.trim() || 'Wedding Memory',
        imageUrl: res.url,
        category: uploadCategory,
        caption: uploadCaption.trim() || undefined,
        date: uploadDate || new Date().toISOString().split('T')[0],
      });

      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadCaption('');
      setUploadPreview(null);
      setUploadFileObj(null);
    } catch (err: any) {
      alert(err.message || 'Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (photo: GalleryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPhoto(photo);
    setEditTitle(photo.title);
    setEditCategory(photo.category);
    setEditCaption(photo.caption || '');
    setEditDate(photo.date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      setIsSavingEdit(true);
      await updateGalleryPhoto(editingPhoto.id, {
        title: editTitle.trim(),
        category: editCategory,
        caption: editCaption.trim() || undefined,
        date: editDate,
      });

      if (selectedPhoto && selectedPhoto.id === editingPhoto.id) {
        setSelectedPhoto({
          ...selectedPhoto,
          title: editTitle.trim(),
          category: editCategory,
          caption: editCaption.trim() || undefined,
          date: editDate,
        });
      }

      setEditingPhoto(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update photo details');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (photo: GalleryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Delete memory photo "${photo.title}"?`)) return;

    try {
      await deleteGalleryPhoto(photo.id);
      if (selectedPhoto?.id === photo.id) {
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete photo');
    }
  };

  const getCategoryBadgeClass = (category: GalleryCategory) => {
    switch (category) {
      case 'bride':
        return 'bg-[#FFF5F6] text-[#A63A50] border-[#F0C9CD]';
      case 'groom':
        return 'bg-[#FAF5EB] text-[#8C6D34] border-[#E8DEC8]';
      case 'family':
        return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
      default:
        return 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] mb-1">
            <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Royal Celebration Visual Memories</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2422]">
            Photo Gallery & Albums
          </h2>
          <p className="text-xs text-[#7A6B68] mt-0.5">
            Dedicated photo albums for Bride's side, Groom's side, Family & Relatives, and Ceremonies
          </p>
        </div>

        <button
          onClick={() => {
            setUploadPreview(null);
            setUploadFileObj(null);
            setUploadTitle('');
            setUploadCaption('');
            setIsUploadModalOpen(true);
          }}
          className="flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#B38F4D] text-white text-xs font-semibold shadow-md hover:brightness-105 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Memory Photo</span>
        </button>
      </div>

      {/* Album Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[#2D2422] text-white border-[#2D2422] shadow-sm'
              : 'bg-white text-[#5C4E4B] border-[#E8DEC8] hover:border-[#D4AF37]'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold tracking-wider opacity-80">All Photos</div>
          <div className="text-2xl font-serif font-bold mt-0.5">{totalCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('bride')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'bride'
              ? 'bg-[#A63A50] text-white border-[#A63A50] shadow-sm'
              : 'bg-white text-[#5C4E4B] border-[#E8DEC8] hover:border-[#F0C9CD]'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold tracking-wider text-[#A63A50] flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>Bride's Album</span>
          </div>
          <div className="text-2xl font-serif font-bold mt-0.5 text-[#A63A50]">{brideCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('groom')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'groom'
              ? 'bg-[#8C6D34] text-white border-[#8C6D34] shadow-sm'
              : 'bg-white text-[#5C4E4B] border-[#E8DEC8] hover:border-[#D4AF37]'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold tracking-wider text-[#8C6D34] flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Groom's Album</span>
          </div>
          <div className="text-2xl font-serif font-bold mt-0.5 text-[#8C6D34]">{groomCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('family')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'family'
              ? 'bg-[#166534] text-white border-[#166534] shadow-sm'
              : 'bg-white text-[#5C4E4B] border-[#E8DEC8] hover:border-[#BBF7D0]'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold tracking-wider text-[#166534] flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Family Album</span>
          </div>
          <div className="text-2xl font-serif font-bold mt-0.5 text-[#166534]">{familyCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('ceremony')}
          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
            activeFilter === 'ceremony'
              ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-sm'
              : 'bg-white text-[#5C4E4B] border-[#E8DEC8] hover:border-[#DDD6FE]'
          }`}
        >
          <div className="text-[11px] uppercase font-semibold tracking-wider text-[#6D28D9] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Ceremonies</span>
          </div>
          <div className="text-2xl font-serif font-bold mt-0.5 text-[#6D28D9]">{ceremonyCount}</div>
        </button>
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E8DEC8] space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] flex items-center justify-center text-[#B38F4D] mx-auto">
            <ImageIcon className="w-7 h-7 opacity-60" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[#2D2422]">
            No Photos in this Album Yet
          </h3>
          <p className="text-xs text-[#7A6B68] max-w-sm mx-auto">
            Upload photographs from ceremonies, wardrobe fittings, family blessings, and memorable moments.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#FAF5EB] border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] hover:bg-[#F3EAD5] transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload First Photo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative rounded-3xl overflow-hidden bg-white border border-[#E8DEC8] hover:border-[#D4AF37] shadow-xs hover:shadow-md transition cursor-pointer flex flex-col"
            >
              {/* Photo Preview Container */}
              <div className="relative aspect-4/3 w-full overflow-hidden bg-[#FAF8F5]">
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <span className="p-2 rounded-full bg-white/90 text-[#2D2422] shadow">
                    <Eye className="w-4 h-4" />
                  </span>
                </div>

                {/* Category Badge */}
                <span
                  className={`absolute top-3 left-3 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-xs ${getCategoryBadgeClass(
                    photo.category
                  )}`}
                >
                  {photo.category} side
                </span>

                {/* Edit & Delete Action Buttons */}
                {canEditEvents && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => openEditModal(photo, e)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-white hover:text-[#2D2422] text-white transition cursor-pointer"
                      title="Edit photo details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(photo, e)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-[#A63A50] text-white transition cursor-pointer"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Caption & Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#2D2422] group-hover:text-[#8C6D34] transition">
                    {photo.title}
                  </h4>
                  {photo.caption && (
                    <p className="text-xs text-[#7A6B68] mt-1 line-clamp-2 leading-relaxed">
                      {photo.caption}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#A89A96] mt-3 pt-2 border-t border-[#F5EFE6]">
                  <span>By: {photo.uploadedBy || 'Family'}</span>
                  <span>{photo.date ? formatDate(photo.date) : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#F0E6D2]">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                    selectedPhoto.category
                  )}`}
                >
                  {selectedPhoto.category}
                </span>
                <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422] truncate max-w-md">
                  {selectedPhoto.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={selectedPhoto.imageUrl}
                  download={selectedPhoto.title || 'wedding_photo'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition"
                  title="Download image"
                >
                  <Download className="w-4 h-4" />
                </a>

                {canEditEvents && (
                  <button
                    type="button"
                    onClick={(e) => openEditModal(selectedPhoto, e)}
                    className="p-2 rounded-xl text-[#7A6B68] hover:text-[#2D2422] hover:bg-[#FAF5EB] transition cursor-pointer"
                    title="Edit caption & category"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {canEditEvents && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedPhoto)}
                    className="p-2 rounded-xl text-[#A63A50] hover:bg-[#FDF2F4] transition cursor-pointer"
                    title="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-xl text-[#7A6B68] hover:bg-[#FAF5EB] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image View */}
            <div className="flex-1 bg-[#1A1412] flex items-center justify-center p-2 sm:p-4 overflow-hidden max-h-[60vh]">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            {/* Modal Footer Story & Metadata */}
            <div className="p-4 sm:p-5 bg-white border-t border-[#F0E6D2] space-y-2">
              {selectedPhoto.caption && (
                <p className="text-xs md:text-sm text-[#5C4E4B] italic leading-relaxed">
                  "{selectedPhoto.caption}"
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-[#8C7E7A] pt-1">
                <span>Uploaded by: <strong className="text-[#2D2422]">{selectedPhoto.uploadedBy}</strong></span>
                <span>Date: <strong className="text-[#2D2422]">{selectedPhoto.date ? formatDate(selectedPhoto.date) : 'N/A'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2422]/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-[#E8DEC8] rounded-3xl shadow-2xl p-5 sm:p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0E6D2]">
              <h3 className="font-serif font-bold text-base md:text-lg text-[#2D2422]">
                Upload Memory to Gallery
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-[#7A6B68] hover:bg-[#FAF5EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Album / Side Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="bride">Bride's Side (Lehenga, Mehendi, Bride Family)</option>
                  <option value="groom">Groom's Side (Sherwani, Safa, Groom Family)</option>
                  <option value="family">Family & Relatives (Mutual Blessings, Elders)</option>
                  <option value="ceremony">Ceremonies (Ring Ceremony, Vivah, Pheras)</option>
                  <option value="pre-wedding">Pre-Wedding Shoot & Candid</option>
                  <option value="reception">Reception Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Photo Title *
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Sangeet Family Dance / Haldi Glow"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Story Caption / Memory Note
                </label>
                <textarea
                  rows={2}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="A heartfelt line remembering this beautiful moment..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Date of Memory
                </label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              {/* File Picker & Preview */}
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Select Photo File (JPG, PNG, WebP) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  required
                  className="w-full text-xs text-[#5C4E4B] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FAF5EB] file:text-[#8C6D34] hover:file:bg-[#F3EAD5] cursor-pointer"
                />
                {uploadPreview && (
                  <div className="mt-2 relative w-full h-36 rounded-xl overflow-hidden border border-[#E8DEC8]">
                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFileObj}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Uploading...' : 'Upload to Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Photo Details Modal */}
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

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="bride">Bride's Side</option>
                  <option value="groom">Groom's Side</option>
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
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5DFD7] text-xs text-[#5C4E4B] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
