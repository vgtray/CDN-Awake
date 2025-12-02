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
import { Card, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton } from '@/components/ui';
import { formatBytes, formatDate, getFileIcon, copyToClipboard } from '@/lib/utils';
import { CDNFile } from '@/types';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fichiers</h1>
          <p className="text-gray-400 mt-1">Gérez vos fichiers uploadés</p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher un fichier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">
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
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Fichier</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Taille</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.data.map((file: CDNFile) => (
                  <tr key={file.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(file.mime_type || file.mimeType)}</span>
                        <div>
                          <p className="text-white font-medium">{file.original_name || file.originalName}</p>
                          <p className="text-sm text-gray-500">{file.filename || file.storedName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant="default">{(file.mime_type || file.mimeType)?.split('/')[1] || 'unknown'}</Badge>
                    </td>
                    <td className="py-4 px-6 text-gray-300">{formatBytes(file.size)}</td>
                    <td className="py-4 px-6 text-gray-300">{formatDate(file.created_at || file.createdAt || new Date().toISOString())}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Upload className="w-8 h-8 text-gray-600" />}
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
          <div className="p-4 border-t border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
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
      </Card>

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
              : 'border-gray-700 hover:border-gray-600'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-gray-500 mb-4" />
          {isDragActive ? (
            <p className="text-white">Déposez les fichiers ici...</p>
          ) : (
            <>
              <p className="text-white mb-2">Glissez-déposez vos fichiers ici</p>
              <p className="text-sm text-gray-500">ou cliquez pour sélectionner</p>
            </>
          )}
        </div>

        {uploadingFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">Upload en cours...</p>
              <p className="text-sm text-white">{Math.round(uploadProgress)}%</p>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                style={{ width: `${uploadProgress}%` }}
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
          <div className="p-4 bg-gray-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {selectedFile && getFileIcon(selectedFile.mime_type || selectedFile.mimeType)}
              </span>
              <div>
                <p className="text-white font-medium">{selectedFile?.original_name || selectedFile?.originalName}</p>
                <p className="text-sm text-gray-500">
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
    </div>
  );
}
