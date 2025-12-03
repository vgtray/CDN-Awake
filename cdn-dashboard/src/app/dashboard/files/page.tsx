'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Search, 
  Trash2, 
  Copy, 
  Key as KeyIcon,
  X,
  FileIcon,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Archive,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  Check,
  AlertCircle,
  Download,
  FileDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnimatedCard, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton, PageTransition } from '@/components/ui';
import { formatBytes, formatDate, copyToClipboard } from '@/lib/utils';
import { CDNFile } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, activity } from '@/lib/notifications';
import { useDropzone } from 'react-dropzone';

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  preview?: string;
  error?: string;
}

type SortField = 'created_at' | 'original_name' | 'size';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';
type FileTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive';

const FILE_TYPE_FILTERS: { value: FileTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tous', icon: <FileIcon className="w-4 h-4" /> },
  { value: 'image', label: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'video', label: 'Vidéos', icon: <Film className="w-4 h-4" /> },
  { value: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
  { value: 'document', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { value: 'archive', label: 'Archives', icon: <Archive className="w-4 h-4" /> },
];

function getFileTypeFromMime(mimeType: string | undefined): FileTypeFilter {
  if (!mimeType) return 'all';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z')) return 'archive';
  return 'all';
}

function getFileIcon(mimeType: string | undefined): React.ReactNode {
  const type = getFileTypeFromMime(mimeType);
  const iconClass = "w-5 h-5";
  switch (type) {
    case 'image': return <ImageIcon className={`${iconClass} text-emerald-400`} />;
    case 'video': return <Film className={`${iconClass} text-violet-400`} />;
    case 'audio': return <Music className={`${iconClass} text-amber-400`} />;
    case 'document': return <FileText className={`${iconClass} text-blue-400`} />;
    case 'archive': return <Archive className={`${iconClass} text-orange-400`} />;
    default: return <FileIcon className={`${iconClass} text-zinc-400`} />;
  }
}

export default function FilesPage() {
  const queryClient = useQueryClient();
  
  // Search & Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  
  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CDNFile | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(10);
  
  // Upload state
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch files
  const { data, isLoading } = useQuery({
    queryKey: ['files', page, search, sortField, sortOrder],
    queryFn: async () => {
      const response = await api.getFiles({ 
        page, 
        limit: 20, 
        search: search || undefined,
      });
      return response;
    },
  });

  // Filter files by type on client side
  const filteredFiles = useMemo(() => {
    if (!data?.data) return [];
    let files = [...data.data];
    
    // Type filter
    if (typeFilter !== 'all') {
      files = files.filter((file: CDNFile) => {
        const mimeType = file.mime_type || file.mimeType;
        return getFileTypeFromMime(mimeType) === typeFilter;
      });
    }
    
    // Sort
    files.sort((a: CDNFile, b: CDNFile) => {
      let aVal: string | number, bVal: string | number;
      switch (sortField) {
        case 'original_name':
          aVal = (a.original_name || a.originalName || '').toLowerCase();
          bVal = (b.original_name || b.originalName || '').toLowerCase();
          break;
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        default:
          aVal = new Date(a.created_at || a.createdAt || 0).getTime();
          bVal = new Date(b.created_at || b.createdAt || 0).getTime();
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    
    return files;
  }, [data?.data, typeFilter, sortField, sortOrder]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Fichier supprimé', 'Le fichier a été supprimé avec succès');
      activity.delete(`Fichier ID: ${id.slice(0, 8)}...`);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression', 'Impossible de supprimer le fichier');
    },
  });

  // Create token mutation
  const createTokenMutation = useMutation({
    mutationFn: (data: { fileId: string; expiresInHours: number; maxDownloads: number }) =>
      api.createToken(data),
    onSuccess: (response) => {
      setIsTokenModalOpen(false);
      const downloadUrl = `${window.location.origin}/download/${response.data.token}`;
      copyToClipboard(downloadUrl);
      toast.success('Token créé!', 'URL de téléchargement copiée dans le presse-papier');
      activity.tokenCreated(`Token pour ${selectedFile?.original_name || 'fichier'}`);
    },
    onError: () => {
      toast.error('Erreur lors de la création du token', 'Veuillez réessayer');
    },
  });

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
      status: 'pending' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setUploadingFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
      'application/pdf': [],
      'application/zip': [],
      'application/x-rar-compressed': [],
      'text/*': [],
      'application/json': [],
    },
  });

  // Start upload
  const startUpload = async () => {
    setIsUploading(true);
    
    for (const uploadFile of uploadingFiles) {
      if (uploadFile.status !== 'pending') continue;
      
      // Update status to uploading
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f
        )
      );

      try {
        await api.uploadFile(uploadFile.file, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, progress } : f
            )
          );
        });

        // Success
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'success' as const, progress: 100 } : f
          )
        );
      } catch {
        // Error
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error' as const, error: 'Échec de l\'upload' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['files'] });
    
    // Check if all succeeded
    setTimeout(() => {
      setUploadingFiles((prev) => {
        const hasErrors = prev.some((f) => f.status === 'error');
        const successCount = prev.filter((f) => f.status === 'success').length;
        if (!hasErrors && prev.every((f) => f.status === 'success')) {
          toast.success('Upload terminé!', `${successCount} fichier(s) uploadé(s) avec succès`);
          // Log activity for uploads
          prev.forEach((f) => {
            if (f.status === 'success') {
              activity.upload(f.file.name, formatBytes(f.file.size));
            }
          });
          return [];
        }
        return prev;
      });
      setIsUploadModalOpen(false);
    }, 1000);
  };

  // Remove file from upload queue
  const removeUploadFile = (id: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Clear completed uploads
  const clearCompleted = () => {
    setUploadingFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const handleDelete = (file: CDNFile) => {
    if (window.confirm(`Supprimer "${file.original_name || file.originalName}" ?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const handleCreateToken = (file: CDNFile) => {
    setSelectedFile(file);
    setIsTokenModalOpen(true);
  };

  const handlePreview = (file: CDNFile) => {
    setSelectedFile(file);
    setIsPreviewModalOpen(true);
  };

  const submitCreateToken = () => {
    if (selectedFile) {
      createTokenMutation.mutate({
        fileId: selectedFile.id,
        expiresInHours: tokenExpiry,
        maxDownloads,
      });
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const canPreview = (file: CDNFile) => {
    const mimeType = file.mime_type || file.mimeType;
    return (
      mimeType?.startsWith('image/') ||
      mimeType?.startsWith('video/') ||
      mimeType?.startsWith('audio/')
    );
  };

  return (
    <PageTransition className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Fichiers</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez vos fichiers uploadés</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredFiles.length > 0 && (
            <div className="relative group">
              <Button variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 min-w-32">
                  <button
                    onClick={() => {
                      api.exportToCSV(filteredFiles.map(f => ({
                        id: f.id,
                        name: f.original_name || f.originalName,
                        type: f.mime_type || f.mimeType,
                        size: f.size,
                        created: f.created_at || f.createdAt
                      })), 'files');
                      toast.success('Export CSV téléchargé');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      api.exportToJSON(filteredFiles.map(f => ({
                        id: f.id,
                        name: f.original_name || f.originalName,
                        type: f.mime_type || f.mimeType,
                        size: f.size,
                        created: f.created_at || f.createdAt
                      })), 'files');
                      toast.success('Export JSON téléchargé');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
            </div>
          )}
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <AnimatedCard delay={0.1}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un fichier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm sm:text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              {/* Type Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-1 px-1">
                {FILE_TYPE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setTypeFilter(filter.value)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                      typeFilter === filter.value
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                    }`}
                  >
                    {filter.icon}
                    <span className="hidden sm:inline">{filter.label}</span>
                  </button>
                ))}
              </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Files */}
      <AnimatedCard delay={0.2}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-100">
            {filteredFiles.length} fichier(s)
          </h3>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 overflow-x-auto">
            <Filter className="w-4 h-4 hidden sm:block" />
            <span className="hidden sm:inline">Trier par:</span>
            <button
              onClick={() => toggleSort('created_at')}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                sortField === 'created_at' ? 'text-indigo-400' : 'hover:text-zinc-300'
              }`}
            >
              Date
              {sortField === 'created_at' && (
                sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => toggleSort('original_name')}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                sortField === 'original_name' ? 'text-indigo-400' : 'hover:text-zinc-300'
              }`}
            >
              Nom
              {sortField === 'original_name' && (
                sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => toggleSort('size')}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                sortField === 'size' ? 'text-indigo-400' : 'hover:text-zinc-300'
              }`}
            >
              Taille
              {sortField === 'size' && (
                sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />
              )}
            </button>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : filteredFiles.length > 0 ? (
          viewMode === 'list' ? (
            /* List View */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fichier</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Taille</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {filteredFiles.map((file: CDNFile, index: number) => {
                    const mimeType = file.mime_type || file.mimeType;
                    const isImage = mimeType?.startsWith('image/');
                    
                    return (
                      <motion.tr 
                        key={file.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className="hover:bg-zinc-800/30 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center overflow-hidden">
                              {isImage ? (
                                <img
                                  src={`/api/files/${file.id}/preview`}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                getFileIcon(mimeType)
                              )}
                            </div>
                            <div>
                              <p className="text-zinc-200 font-medium group-hover:text-zinc-100 transition-colors">
                                {file.original_name || file.originalName}
                              </p>
                              <p className="text-xs text-zinc-600">{file.filename || file.storedName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="default">{mimeType?.split('/')[1] || 'unknown'}</Badge>
                        </td>
                        <td className="py-4 px-6 text-zinc-400 text-sm">{formatBytes(file.size)}</td>
                        <td className="py-4 px-6 text-zinc-400 text-sm">{formatDate(file.created_at || file.createdAt || new Date().toISOString())}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1">
                            {canPreview(file) && (
                              <Button variant="ghost" size="icon" onClick={() => handlePreview(file)} title="Prévisualiser">
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleCreateToken(file)} title="Créer un token">
                              <KeyIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                copyToClipboard(file.id);
                                toast.success('ID copié!');
                              }}
                              title="Copier l'ID"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(file)} title="Supprimer">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filteredFiles.map((file: CDNFile, index: number) => {
                const mimeType = file.mime_type || file.mimeType;
                const isImage = mimeType?.startsWith('image/');
                
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.03 * index }}
                    className="group relative bg-zinc-800/30 rounded-xl border border-zinc-700/50 overflow-hidden hover:border-zinc-600/50 transition-all"
                  >
                    {/* Preview */}
                    <div 
                      className="aspect-square bg-zinc-900/50 flex items-center justify-center cursor-pointer overflow-hidden"
                      onClick={() => canPreview(file) && handlePreview(file)}
                    >
                      {isImage ? (
                        <img
                          src={`/api/files/${file.id}/preview`}
                          alt={file.original_name || file.originalName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="scale-150">${getFileIcon(mimeType)}</div>`;
                          }}
                        />
                      ) : (
                        <div className="scale-150">
                          {getFileIcon(mimeType)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm text-zinc-200 font-medium truncate">
                        {file.original_name || file.originalName}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatBytes(file.size)}
                      </p>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPreview(file) && (
                        <button
                          onClick={() => handlePreview(file)}
                          className="p-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCreateToken(file)}
                        className="p-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                      >
                        <KeyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1.5 bg-zinc-900/80 backdrop-blur-sm rounded-lg text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <EmptyState
            icon={<Upload className="w-8 h-8 text-zinc-600" />}
            title="Aucun fichier"
            description={typeFilter !== 'all' ? 'Aucun fichier de ce type' : 'Uploadez votre premier fichier pour commencer'}
            action={
              typeFilter !== 'all' ? (
                <Button variant="secondary" onClick={() => setTypeFilter('all')}>
                  Voir tous les fichiers
                </Button>
              ) : (
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              )
            }
          />
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800/50 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Page {page} sur {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload de fichiers"
        size="lg"
      >
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-700/50 hover:border-zinc-600/50 hover:bg-zinc-800/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
          {isDragActive ? (
            <p className="text-zinc-100">Déposez les fichiers ici...</p>
          ) : (
            <>
              <p className="text-zinc-200 mb-1">Glissez-déposez vos fichiers ici</p>
              <p className="text-sm text-zinc-500">ou cliquez pour sélectionner</p>
            </>
          )}
        </div>

        {/* Upload Queue */}
        <AnimatePresence>
          {uploadingFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 max-h-64 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-zinc-400">
                  {uploadingFiles.length} fichier(s) en attente
                </p>
                {uploadingFiles.some((f) => f.status === 'success') && (
                  <button
                    onClick={clearCompleted}
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Effacer terminés
                  </button>
                )}
              </div>

              {uploadingFiles.map((uploadFile) => (
                <motion.div
                  key={uploadFile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                >
                  {/* Preview */}
                  {uploadFile.preview ? (
                    <img
                      src={uploadFile.preview}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                      {getFileIcon(uploadFile.file.type)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{uploadFile.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-zinc-500">{formatBytes(uploadFile.file.size)}</p>
                      {uploadFile.status === 'uploading' && (
                        <span className="text-xs text-indigo-400">{uploadFile.progress}%</span>
                      )}
                      {uploadFile.status === 'error' && (
                        <span className="text-xs text-red-400">{uploadFile.error}</span>
                      )}
                    </div>
                    
                    {/* Progress bar */}
                    {uploadFile.status === 'uploading' && (
                      <div className="w-full h-1 bg-zinc-700 rounded-full mt-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadFile.progress}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Status / Remove */}
                  {uploadFile.status === 'success' ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : uploadFile.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : uploadFile.status === 'pending' ? (
                    <button
                      onClick={() => removeUploadFile(uploadFile.id)}
                      className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {uploadingFiles.length > 0 && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                uploadingFiles.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
                setUploadingFiles([]);
              }}
              disabled={isUploading}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={startUpload}
              isLoading={isUploading}
              disabled={uploadingFiles.every((f) => f.status !== 'pending')}
            >
              <Upload className="w-4 h-4 mr-2" />
              Uploader ({uploadingFiles.filter((f) => f.status === 'pending').length})
            </Button>
          </div>
        )}
      </Modal>

      {/* Create Token Modal */}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        title="Créer un token d'accès"
      >
        <div className="space-y-4">
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex items-center gap-3">
              {getFileIcon(selectedFile?.mime_type || selectedFile?.mimeType)}
              <div>
                <p className="text-zinc-200 font-medium">{selectedFile?.original_name || selectedFile?.originalName}</p>
                <p className="text-sm text-zinc-500">
                  {selectedFile && formatBytes(selectedFile.size)}
                </p>
              </div>
            </div>
          </div>

          <Input
            type="number"
            label="Expiration (heures)"
            value={tokenExpiry}
            onChange={(e) => setTokenExpiry(Number(e.target.value))}
            min={1}
            max={8760}
          />

          <Input
            type="number"
            label="Téléchargements max"
            value={maxDownloads}
            onChange={(e) => setMaxDownloads(Number(e.target.value))}
            min={1}
            max={1000}
          />

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsTokenModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={submitCreateToken}
              isLoading={createTokenMutation.isPending}
            >
              <KeyIcon className="w-4 h-4 mr-2" />
              Créer le token
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={selectedFile?.original_name || selectedFile?.originalName || 'Prévisualisation'}
        size="xl"
      >
        {selectedFile && (
          <div className="flex flex-col items-center">
            <div className="w-full bg-zinc-900/50 rounded-lg flex items-center justify-center overflow-hidden">
              {(selectedFile.mime_type || selectedFile.mimeType)?.startsWith('image/') ? (
                <img
                  src={`/api/files/${selectedFile.id}/preview`}
                  alt={selectedFile.original_name || selectedFile.originalName}
                  className="max-w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<p class="text-zinc-500 p-8">Impossible de charger la prévisualisation</p>';
                  }}
                />
              ) : (selectedFile.mime_type || selectedFile.mimeType)?.startsWith('video/') ? (
                <video
                  src={`/api/files/${selectedFile.id}/preview`}
                  controls
                  className="max-w-full max-h-[60vh]"
                >
                  Votre navigateur ne supporte pas la lecture vidéo
                </video>
              ) : (selectedFile.mime_type || selectedFile.mimeType)?.startsWith('audio/') ? (
                <div className="p-8">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Music className="w-16 h-16 text-amber-400" />
                  </div>
                  <audio
                    src={`/api/files/${selectedFile.id}/preview`}
                    controls
                    className="w-full"
                  >
                    Votre navigateur ne supporte pas la lecture audio
                  </audio>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-zinc-800 flex items-center justify-center">
                    {getFileIcon(selectedFile.mime_type || selectedFile.mimeType)}
                  </div>
                  <p className="text-zinc-400">Prévisualisation non disponible pour ce type de fichier</p>
                </div>
              )}
            </div>
            
            {/* File Info */}
            <div className="w-full mt-4 p-4 bg-zinc-800/30 rounded-lg grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Taille</p>
                <p className="text-zinc-200">{formatBytes(selectedFile.size)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Type</p>
                <p className="text-zinc-200">{selectedFile.mime_type || selectedFile.mimeType}</p>
              </div>
              <div>
                <p className="text-zinc-500">Uploadé le</p>
                <p className="text-zinc-200">{formatDate(selectedFile.created_at || selectedFile.createdAt || '')}</p>
              </div>
              <div>
                <p className="text-zinc-500">Téléchargements</p>
                <p className="text-zinc-200">{selectedFile.download_count || 0}</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => handleCreateToken(selectedFile)}>
                <KeyIcon className="w-4 h-4 mr-2" />
                Créer un token
              </Button>
              <Button
                onClick={() => {
                  copyToClipboard(selectedFile.id);
                  toast.success('ID copié!');
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier l'ID
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
