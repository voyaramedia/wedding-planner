import React, { useState } from 'react';
import { useWeddingData } from '../../context/WeddingDataContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { GalleryItem, GalleryCategory, PhotoAlbum, RecordOwner } from '../../types/index.ts';
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
  FolderPlus,
  Folder,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Upload,
  RefreshCw,
  AlertCircle,
  FolderEdit,
} from 'lucide-react';
import { fileToDataUrl, formatDate } from '../../lib/utils.ts';
import { api } from '../../lib/api.ts';
import { useToast } from '../../context/ToastContext.tsx';

interface MultiUploadFile {
  file: File;
  preview: string;
  title: string;
  caption: string;
}

export const GalleryView: React.FC = () => {
  const {
    data,
    addGalleryPhoto,
    batchUploadPhotos,
    updateGalleryPhoto,
    deleteGalleryPhoto,
    addAlbum,
    updateAlbum,
    deleteAlbum,
  } = useWeddingData();
  const { user, canEditEvents } = useAuth();
  const { showToast, confirm } = useToast();

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Modal states
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null>(null);

  // Multi-upload state
  const [uploadAlbumId, setUploadAlbumId] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<GalleryCategory>('ceremony');
  const [uploadFiles, setUploadFiles] = useState<MultiUploadFile[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Create / Edit Album Form State
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumCategory, setAlbumCategory] = useState<any>('custom');
  const [albumOwner, setAlbumOwner] = useState<RecordOwner>('shared');
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);

  // Edit Photo Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editAlbumId, setEditAlbumId] = useState('');
  const [editCategory, setEditCategory] = useState<GalleryCategory>('ceremony');
  const [editDate, setEditDate] = useState('');
  const [replacePreview, setReplacePreview] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const gallery = data?.gallery || [];
  const albums = data?.albums || [];
  const couple = data?.coupleProfile;

  // Filter albums by user privacy permissions
  const authorizedAlbums = albums.filter((alb) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'groom' && alb.owner === 'bride') return false;
    if (user?.role === 'bride' && alb.owner === 'groom') return false;
    return true;
  });

  // Filter photos by selected album and privacy
  const authorizedPhotos = gallery.filter((photo) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'groom' && photo.owner === 'bride') return false;
    if (user?.role === 'bride' && photo.owner === 'groom') return false;
    return true;
  });

  const displayedPhotos = authorizedPhotos.filter((photo) => {
    if (selectedAlbumId === 'all') return true;
    return photo.albumId === selectedAlbumId;
  });

  // Count photos per album
  const getAlbumCount = (albumId: string) => {
    return authorizedPhotos.filter((p) => p.albumId === albumId).length;
  };

  // MULTI-PHOTO FILE SELECTION
  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const newItems: MultiUploadFile[] = [];

    for (const f of files) {
      if (!validExtensions.includes(f.type.toLowerCase())) {
        showToast(`Skipped "${f.name}": Only JPG, PNG, and WEBP are supported`, 'error');
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        showToast(`Skipped "${f.name}": Exceeds 10MB limit`, 'error');
        continue;
      }

      const preview = URL.createObjectURL(f);
      const titleName = f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      newItems.push({
        file: f,
        preview,
        title: titleName,
        caption: '',
      });
    }

    setUploadFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveUploadItem = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateUploadItem = (index: number, field: 'title' | 'caption', val: string) => {
    setUploadFiles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // SUBMIT MULTI-PHOTO BATCH
  const handleBatchUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) {
      showToast('Please select at least one photo to upload', 'error');
      return;
    }

    try {
      setIsUploadingBatch(true);
      setUploadProgress(10);

      const uploadedPayload: Array<{
        url: string;
        title: string;
        category?: string;
        albumId?: string;
        caption?: string;
        owner?: string;
      }> = [];

      let step = 0;
      for (const item of uploadFiles) {
        const dataUrl = await fileToDataUrl(item.file);
        const res = await api.uploadFile(dataUrl, item.file.name);

        uploadedPayload.push({
          url: res.url,
          title: item.title.trim() || 'Wedding Memory',
          albumId: uploadAlbumId || undefined,
          category: uploadCategory,
          caption: item.caption.trim() || undefined,
          owner: user?.role === 'bride' ? 'bride' : user?.role === 'groom' ? 'groom' : 'shared',
        });

        step++;
        setUploadProgress(Math.min(90, Math.round((step / uploadFiles.length) * 80) + 10));
      }

      await batchUploadPhotos(uploadedPayload);
      setUploadProgress(100);
      showToast(`Uploaded ${uploadedPayload.length} photos successfully!`, 'success');

      setIsMultiUploadOpen(false);
      setUploadFiles([]);
      setUploadProgress(0);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photos', 'error');
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // CREATE OR EDIT ALBUM
  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) {
      showToast('Please enter an album name', 'error');
      return;
    }

    try {
      setIsSavingAlbum(true);
      if (editingAlbum) {
        await updateAlbum(editingAlbum.id, {
          name: albumName.trim(),
          description: albumDescription.trim() || undefined,
          category: albumCategory,
          owner: albumOwner,
        });
        showToast(`Album "${albumName}" updated successfully!`, 'success');
      } else {
        await addAlbum({
          name: albumName.trim(),
          description: albumDescription.trim() || undefined,
          category: albumCategory,
          owner: albumOwner,
        });
        showToast(`Album "${albumName}" created successfully!`, 'success');
      }

      setIsCreateAlbumOpen(false);
      setEditingAlbum(null);
      setAlbumName('');
      setAlbumDescription('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save album', 'error');
    } finally {
      setIsSavingAlbum(false);
    }
  };

  const handleOpenEditAlbum = (alb: PhotoAlbum, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAlbum(alb);
    setAlbumName(alb.name);
    setAlbumDescription(alb.description || '');
    setAlbumCategory(alb.category);
    setAlbumOwner(alb.owner);
    setIsCreateAlbumOpen(true);
  };

  const handleDeleteAlbumClick = async (alb: PhotoAlbum, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Photo Album?',
      message: `Are you sure you want to delete album "${alb.name}"? Photos assigned to this album will remain safely preserved in the general gallery.`,
      confirmLabel: 'Delete Album',
      isDestructive: true,
    });

    if (ok) {
      try {
        await deleteAlbum(alb.id);
        if (selectedAlbumId === alb.id) {
          setSelectedAlbumId('all');
        }
        showToast(`Album "${alb.name}" deleted (photos safely preserved)`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete album', 'error');
      }
    }
  };

  // EDIT PHOTO DETAILS
  const handleOpenEditPhoto = (photo: GalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPhoto(photo);
    setEditTitle(photo.title);
    setEditCaption(photo.caption || '');
    setEditAlbumId(photo.albumId || '');
    setEditCategory(photo.category);
    setEditDate(photo.date || new Date().toISOString().split('T')[0]);
    setReplacePreview(null);
    setReplaceFile(null);
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/jpeg') && !file.type.includes('image/png') && !file.type.includes('image/webp')) {
      showToast('Please select a JPG, PNG, or WEBP image', 'error');
      return;
    }
    setReplaceFile(file);
    const reader = new FileReader();
    reader.onload = () => setReplacePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;

    try {
      setIsSavingPhoto(true);
      let finalUrl = editingPhoto.imageUrl;

      if (replaceFile && replacePreview) {
        const uploadRes = await api.uploadFile(replacePreview, replaceFile.name);
        finalUrl = uploadRes.url;
      }

      await updateGalleryPhoto(editingPhoto.id, {
        title: editTitle.trim() || 'Wedding Photo',
        caption: editCaption.trim() || undefined,
        albumId: editAlbumId || undefined,
        category: editCategory,
        date: editDate,
        imageUrl: finalUrl,
      });

      showToast('Photo details updated successfully!', 'success');
      setEditingPhoto(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update photo', 'error');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeletePhotoClick = async (photo: GalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Permanently Delete Photo?',
      message: `Are you sure you want to permanently delete "${photo.title}"?`,
      confirmLabel: 'Delete Photo',
      isDestructive: true,
    });

    if (ok) {
      try {
        await deleteGalleryPhoto(photo.id);
        if (selectedPhotoIndex !== null) setSelectedPhotoIndex(null);
        showToast('Photo permanently deleted', 'success');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete photo', 'error');
      }
    }
  };

  // LIGHTBOX CONTROLS
  const activePhoto = selectedPhotoIndex !== null ? displayedPhotos[selectedPhotoIndex] : null;

  const handleNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < displayedPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else {
      setSelectedPhotoIndex(0);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else {
      setSelectedPhotoIndex(displayedPhotos.length - 1);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DEC8] text-xs font-semibold text-[#8C6D34] mb-1">
            <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Royal Photo Albums & Memory Vault</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2D2422]">
            Wedding Photo Albums & Gallery
          </h2>
          <p className="text-xs text-[#7A6B68] mt-0.5">
            Organized high-resolution albums with role-based access, multi-photo batch upload, and full-screen viewer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEditEvents && (
            <>
              <button
                onClick={() => {
                  setEditingAlbum(null);
                  setAlbumName('');
                  setAlbumDescription('');
                  setAlbumCategory('custom');
                  setAlbumOwner(user?.role === 'bride' ? 'bride' : user?.role === 'groom' ? 'groom' : 'shared');
                  setIsCreateAlbumOpen(true);
                }}
                className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl border border-[#E8DEC8] bg-white text-xs font-semibold text-[#5C4E4B] hover:bg-[#FAF5EB] transition cursor-pointer shadow-2xs"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#B38F4D]" />
                <span>Create Album</span>
              </button>

              <button
                onClick={() => {
                  setUploadAlbumId(selectedAlbumId !== 'all' ? selectedAlbumId : (albums[0]?.id || ''));
                  setUploadFiles([]);
                  setIsMultiUploadOpen(true);
                }}
                className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-semibold shadow hover:brightness-105 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photos</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ALBUMS CAROUSEL / GRID SELECTOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C6D34] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Select Album</span>
          </span>
          <span className="text-[11px] text-[#8C7E7A]">
            {authorizedAlbums.length} albums configured
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* "All Photos" Card */}
          <div
            onClick={() => setSelectedAlbumId('all')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
              selectedAlbumId === 'all'
                ? 'bg-[#FAF5EB] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-sm'
                : 'bg-[#FFFDF9] border-[#E8DEC8] hover:border-[#D4AF37]/60'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-[#FAF5EB] border border-[#E8DEC8] flex items-center justify-center text-[#8C6D34] mb-2">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-xs text-[#2D2422] truncate">All Memories</h4>
              <p className="text-[10px] text-[#8C7E7A] mt-0.5">{authorizedPhotos.length} photos</p>
            </div>
          </div>

          {/* User Authorized Albums */}
          {authorizedAlbums.map((alb) => {
            const count = getAlbumCount(alb.id);
            const isSelected = selectedAlbumId === alb.id;

            return (
              <div
                key={alb.id}
                onClick={() => setSelectedAlbumId(alb.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#FAF5EB] border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-sm'
                    : 'bg-[#FFFDF9] border-[#E8DEC8] hover:border-[#D4AF37]/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-amber-800">
                    <Folder className="w-4 h-4" />
                  </div>

                  {canEditEvents && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => handleOpenEditAlbum(alb, e)}
                        className="p-1 text-stone-500 hover:text-stone-900 rounded-md hover:bg-white"
                        title="Edit Album"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteAlbumClick(alb, e)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-white"
                        title="Delete Album"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-serif font-bold text-xs text-[#2D2422] truncate" title={alb.name}>
                    {alb.name}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-[#8C7E7A] mt-0.5">
                    <span>{count} photos</span>
                    <span className="uppercase text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                      {alb.owner}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHOTO GALLERY GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#7A6B68]">
            Showing <strong>{displayedPhotos.length}</strong> photo{displayedPhotos.length === 1 ? '' : 's'}
          </span>
        </div>

        {displayedPhotos.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#FFFDF9] border border-[#E8DEC8] text-xs text-[#8C7E7A] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#B38F4D]">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="font-serif text-sm font-semibold text-[#2D2422]">No photos found in this album</p>
            <p className="max-w-xs mx-auto text-[11px] text-stone-500">
              Upload multi-photo highlights from your ceremonies or family portraits.
            </p>
            {canEditEvents && (
              <button
                onClick={() => {
                  setUploadAlbumId(selectedAlbumId !== 'all' ? selectedAlbumId : (albums[0]?.id || ''));
                  setIsMultiUploadOpen(true);
                }}
                className="px-4 py-2 bg-[#FAF5EB] border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] rounded-xl hover:bg-[#F3EAD5]"
              >
                Upload First Photo
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
            {displayedPhotos.map((photo, index) => {
              const albumObj = albums.find((a) => a.id === photo.albumId);

              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="group relative rounded-2xl overflow-hidden bg-[#FFFDF9] border border-[#E8DEC8] hover:border-[#D4AF37] transition shadow-2xs cursor-pointer aspect-4/3 flex flex-col justify-end"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition" />

                  {/* Quick Edit button for authorized users */}
                  {canEditEvents && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                      <button
                        onClick={(e) => handleOpenEditPhoto(photo, e)}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs"
                        title="Edit photo details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePhotoClick(photo, e)}
                        className="p-1.5 rounded-lg bg-black/50 hover:bg-rose-600 text-white backdrop-blur-xs"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Caption & Title */}
                  <div className="relative p-3 text-white z-10">
                    <p className="font-serif font-bold text-xs truncate">{photo.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-amber-200/90 mt-0.5">
                      <span className="truncate">{albumObj?.name || photo.category}</span>
                      <span>{photo.date ? formatDate(photo.date) : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL-SCREEN LIGHTBOX VIEWER */}
      {activePhoto && (
        <div
          onClick={() => setSelectedPhotoIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6 animate-in fade-in"
        >
          {/* Lightbox Header */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
            <div>
              <h3 className="font-serif font-bold text-base md:text-lg">{activePhoto.title}</h3>
              <p className="text-xs text-stone-300">
                Photo {selectedPhotoIndex! + 1} of {displayedPhotos.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEditEvents && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditPhoto(activePhoto);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Details</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhotoClick(activePhoto);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Prev Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrevPhoto();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/30 text-white transition z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNextPhoto();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/30 text-white transition z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Photo Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[80vh] flex flex-col items-center justify-center"
          >
            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.title}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
            />
            {activePhoto.caption && (
              <p className="mt-3 text-center text-xs text-stone-200 max-w-lg italic font-serif bg-black/40 px-4 py-1.5 rounded-xl backdrop-blur-xs">
                "{activePhoto.caption}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* MULTI-PHOTO BATCH UPLOAD MODAL */}
      {isMultiUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E8DEC8] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2D2422]">
                  Upload Photos to Gallery
                </h3>
                <p className="text-xs text-[#7A6B68]">Select multiple photos from your mobile or laptop</p>
              </div>
              <button
                onClick={() => setIsMultiUploadOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBatchUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                    Assign to Album *
                  </label>
                  <select
                    value={uploadAlbumId}
                    onChange={(e) => setUploadAlbumId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    {authorizedAlbums.map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.name} ({alb.owner} side)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                    Category Tag
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="ceremony">Ceremony (Pheras, Ring Ceremony)</option>
                    <option value="engagement">Engagement</option>
                    <option value="pre-wedding">Pre-Wedding & Candid</option>
                    <option value="reception">Reception</option>
                    <option value="bride">Bride's Moments</option>
                    <option value="groom">Groom's Moments</option>
                    <option value="family">Family & Elders</option>
                  </select>
                </div>
              </div>

              {/* Multi-file Input Box */}
              <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#D4AF37]/60 bg-[#FAF8F5] hover:bg-[#F3EAD5] transition cursor-pointer text-center">
                <Upload className="w-8 h-8 text-[#D4AF37] mb-2" />
                <span className="font-serif font-bold text-sm text-[#2D2422]">
                  Choose Multiple Photos to Upload
                </span>
                <span className="text-xs text-[#8C7E7A] mt-1">
                  Supports JPG, JPEG, PNG, WEBP (Max 10MB each)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleMultiFileSelect}
                  className="hidden"
                />
              </label>

              {/* Upload Queue Preview Grid */}
              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>Selected Photos ({uploadFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => setUploadFiles([])}
                      className="text-rose-600 text-[11px] hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {uploadFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E8DEC8]"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-stone-200">
                          <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateUploadItem(idx, 'title', e.target.value)}
                            placeholder="Title..."
                            className="w-full px-2 py-1 rounded-lg border border-stone-200 text-xs font-medium text-stone-800 outline-none"
                          />
                          <input
                            type="text"
                            value={item.caption}
                            onChange={(e) => handleUpdateUploadItem(idx, 'caption', e.target.value)}
                            placeholder="Caption or memory note (optional)..."
                            className="w-full px-2 py-0.5 rounded-lg border border-stone-100 text-[11px] text-stone-600 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadItem(idx)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploadingBatch && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
                    <span>Uploading photos to cloud storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DEC8]">
                <button
                  type="button"
                  onClick={() => setIsMultiUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingBatch || uploadFiles.length === 0}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-bold shadow hover:brightness-105 disabled:opacity-50"
                >
                  {isUploadingBatch ? 'Uploading...' : `Upload ${uploadFiles.length} Photos`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ALBUM MODAL */}
      {isCreateAlbumOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8DEC8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
              <h3 className="font-serif font-bold text-lg text-[#2D2422]">
                {editingAlbum ? 'Rename / Edit Album' : 'Create New Photo Album'}
              </h3>
              <button
                onClick={() => setIsCreateAlbumOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlbum} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Album Name *
                </label>
                <input
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="e.g. Sangeet Celebrations / Royal Portraits"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Description / Memory Note
                </label>
                <textarea
                  rows={2}
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  placeholder="Memories and highlights..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                    Category
                  </label>
                  <select
                    value={albumCategory}
                    onChange={(e) => setAlbumCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="engagement">Engagement</option>
                    <option value="wedding">Wedding</option>
                    <option value="pre-wedding">Pre-Wedding</option>
                    <option value="family">Family</option>
                    <option value="reception">Reception</option>
                    <option value="custom">Custom Album</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                    Privacy Authorization
                  </label>
                  <select
                    value={albumOwner}
                    onChange={(e) => setAlbumOwner(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                  >
                    <option value="shared">Shared (Both Sides)</option>
                    <option value="groom">Groom's Side Only</option>
                    <option value="bride">Bride's Side Only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DEC8]">
                <button
                  type="button"
                  onClick={() => setIsCreateAlbumOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlbum}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  {isSavingAlbum ? 'Saving...' : editingAlbum ? 'Save Changes' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PHOTO DETAILS MODAL WITH REPLACEMENT PHOTO UPLOAD */}
      {editingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8DEC8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DEC8]">
              <h3 className="font-serif font-bold text-lg text-[#2D2422]">
                Edit Photo Details & Album
              </h3>
              <button
                onClick={() => setEditingPhoto(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Photo Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Move to Album
                </label>
                <select
                  value={editAlbumId}
                  onChange={(e) => setEditAlbumId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none"
                >
                  <option value="">General Gallery (No Album)</option>
                  {authorizedAlbums.map((alb) => (
                    <option key={alb.id} value={alb.id}>
                      {alb.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Caption / Note
                </label>
                <textarea
                  rows={2}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DFD7] text-xs text-[#2D2422] outline-none resize-none"
                />
              </div>

              {/* Replace Image Option */}
              <div>
                <label className="block text-xs font-semibold text-[#5C4E4B] mb-1">
                  Replace Photo File
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                    <img
                      src={replacePreview || editingPhoto.imageUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="px-3 py-1.5 rounded-xl border border-[#D4AF37] text-xs font-semibold text-[#8C6D34] hover:bg-[#FAF5EB] cursor-pointer flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload Replacement</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleReplaceFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DEC8]">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhoto}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-white text-xs font-bold shadow hover:brightness-105"
                >
                  {isSavingPhoto ? 'Saving...' : 'Save Photo Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
