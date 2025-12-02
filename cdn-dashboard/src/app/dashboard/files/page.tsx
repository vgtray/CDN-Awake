'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  Search, 
  Trash2, 
  Copy, 
  Key as KeyIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnimatedCard, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton, PageTransition } from '@/components/ui';
import { formatBytes, formatDate, getFileIcon, copyToClipboard } from '@/lib/utils';
import { CDNFile } from '@/types';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

export default function FilesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<CDNFile | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(10);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['files', page, search],
    queryFn: async () => {
      const response = await api.getFiles({ page, limit: 20, search: search || undefined });
      return response;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Fichier supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: (data: { fileId: string; expiresInHours: number; maxDownloads: number }) =>
      api.createToken(data),
    onSuccess: (response) => {
      setIsTokenModalOpen(false);
      const downloadUrl = `${window.location.origin}/download/${response.data.token}`;
      copyToClipboard(downloadUrl);
      toast.success('Token créé et URL copiée!');
    },
    onError: () => {
      toast.error('Erreur lors de la création du token');
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadingFiles(acceptedFiles);
    setUploadProgress(0);

    for (let i = 0; i < acceptedFiles.length; i++) {
      try {
        await api.uploadFile(acceptedFiles[i]);
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);
      } catch {
        toast.error(`Erreur lors de l'upload de ${acceptedFiles[i].name}`);
      }
    }

    setUploadingFiles([]);
    setIsUploadModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['files'] });
    toast.success('Upload terminé!');
  }, [queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'audio/*': [],
      'application/pdf': [],
      'application/zip': [],
      'text/*': [],
    },
  });

  const handleDelete = (file: CDNFile) => {
    if (window.confirm(`Supprimer "${file.original_name || file.originalName}" ?`)) {
      deleteMutation.mutate(file.id);
    }
  };

  const handleCreateToken = (file: CDNFile) => {
    setSelectedFile(file);
    setIsTokenModalOpen(true);
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

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Fichiers</h1>
          <p className="text-zinc-500 mt-1">Gérez vos fichiers uploadés</p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Search & Filters */}
      <AnimatedCard delay={0.1}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un fichier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Files List */}
      <AnimatedCard delay={0.2}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-zinc-100">
            {data?.pagination?.total || 0} fichier(s)
          </h3>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : data?.data?.length > 0 ? (
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
                {data.data.map((file: CDNFile, index: number) => (
                  <motion.tr 
                    key={file.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">{getFileIcon(file.mime_type || file.mimeType)}</span>
                        <div>
                          <p className="text-zinc-200 font-medium group-hover:text-zinc-100 transition-colors">{file.original_name || file.originalName}</p>
                          <p className="text-xs text-zinc-600">{file.filename || file.storedName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="default">{(file.mime_type || file.mimeType)?.split('/')[1] || 'unknown'}</Badge>
                    </td>
                    <td className="py-4 px-6 text-zinc-400 text-sm">{formatBytes(file.size)}</td>
                    <td className="py-4 px-6 text-zinc-400 text-sm">{formatDate(file.created_at || file.createdAt || new Date().toISOString())}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCreateToken(file)}
                          title="Créer un token"
                        >
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Upload className="w-8 h-8 text-zinc-600" />}
              title="Aucun fichier"
              description="Uploadez votre premier fichier pour commencer"
              action={
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              }
            />
          )}
        </div>

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
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload de fichiers"
        size="lg"
      >
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-700/50 hover:border-zinc-600/50 hover:bg-zinc-800/30'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
          {isDragActive ? (
            <p className="text-zinc-100">Déposez les fichiers ici...</p>
          ) : (
            <>
              <p className="text-zinc-200 mb-2">Glissez-déposez vos fichiers ici</p>
              <p className="text-sm text-zinc-500">ou cliquez pour sélectionner</p>
            </>
          )}
        </div>

        {uploadingFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-500">Upload en cours...</p>
              <p className="text-sm text-zinc-100">{Math.round(uploadProgress)}%</p>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600"
              />
            </div>
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
              <span className="text-xl opacity-70">
                {selectedFile && getFileIcon(selectedFile.mime_type || selectedFile.mimeType)}
              </span>
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
    </PageTransition>
  );
}
