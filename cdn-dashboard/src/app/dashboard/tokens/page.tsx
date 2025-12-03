'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  Search, 
  Trash2, 
  Copy, 
  Clock,
  Download,
  CheckCircle,
  Plus
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnimatedCard, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton, PageTransition } from '@/components/ui';
import { formatDate, formatRelativeTime, copyToClipboard, generateDownloadUrl } from '@/lib/utils';
import { AccessToken } from '@/types';
import { motion } from 'framer-motion';
import { toast, activity } from '@/lib/notifications';

export default function TokensPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fileIdForToken, setFileIdForToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState(24);
  const [maxDownloads, setMaxDownloads] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['tokens', page, search],
    queryFn: async () => {
      const response = await api.getTokens({ page, limit: 20 });
      return response;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.revokeToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      toast.success('Token révoqué');
    },
    onError: () => {
      toast.error('Erreur lors de la révocation');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { fileId: string; expiresInHours: number; maxDownloads: number }) =>
      api.createToken(data),
    onSuccess: (response) => {
      setIsCreateModalOpen(false);
      setFileIdForToken('');
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      const downloadUrl = generateDownloadUrl(response.data.token);
      copyToClipboard(downloadUrl);
      toast.success('Token créé et URL copiée!');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });

  const handleDelete = (token: AccessToken) => {
    if (window.confirm(`Révoquer ce token ?`)) {
      deleteMutation.mutate(token.id);
    }
  };

  const handleCopyUrl = (token: AccessToken) => {
    const downloadUrl = generateDownloadUrl(token.token);
    copyToClipboard(downloadUrl);
    toast.success('URL copiée!');
  };

  const getTokenStatus = (token: AccessToken) => {
    const now = new Date();
    const expiry = new Date(token.expiresAt);
    
    if (token.isRevoked) {
      return { status: 'revoked', label: 'Révoqué', variant: 'danger' as const };
    }
    if (token.downloadCount >= token.maxDownloads) {
      return { status: 'exhausted', label: 'Épuisé', variant: 'warning' as const };
    }
    if (expiry < now || token.isExpired) {
      return { status: 'expired', label: 'Expiré', variant: 'danger' as const };
    }
    return { status: 'active', label: 'Actif', variant: 'success' as const };
  };

  const submitCreateToken = () => {
    if (!fileIdForToken.trim()) {
      toast.error('Veuillez entrer un ID de fichier');
      return;
    }
    createMutation.mutate({
      fileId: fileIdForToken.trim(),
      expiresInHours: tokenExpiry,
      maxDownloads,
    });
  };

  // Filter tokens based on search
  const filteredTokens = data?.data?.filter((token: AccessToken) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      token.token?.toLowerCase().includes(searchLower) ||
      token.fileId?.toLowerCase().includes(searchLower) ||
      token.fileName?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <PageTransition className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Tokens d&apos;accès</h1>
          <p className="text-sm text-zinc-500 mt-1">Gérez les tokens de téléchargement</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nouveau token</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <AnimatedCard delay={0.1}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
              />
            </div>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Tokens List */}
      <AnimatedCard delay={0.2}>
        <CardHeader>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-100">
            {data?.pagination?.total || 0} token(s)
          </h3>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredTokens?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Token</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Téléchargements</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Expiration</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Créé</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filteredTokens.map((token: AccessToken, index: number) => {
                  const { label, variant } = getTokenStatus(token);
                  return (
                    <motion.tr 
                      key={token.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.03 }}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20">
                            <Key className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-zinc-200 font-mono text-sm">
                              {token.token?.slice(0, 16) || 'N/A'}...
                            </p>
                            <p className="text-sm text-zinc-600">
                              {token.fileName || `Fichier: ${token.fileId?.slice(0, 8) || 'N/A'}...`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-zinc-600" />
                          <span className="text-zinc-200">{token.downloadCount ?? 0}</span>
                          <span className="text-zinc-600">/ {token.maxDownloads ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-600" />
                          <span className="text-zinc-400 text-sm">
                            {formatRelativeTime(token.expiresAt)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-zinc-400 text-sm">
                        {formatDate(token.createdAt, false)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyUrl(token)}
                            title="Copier l'URL"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(token)}
                            title="Révoquer"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Key className="w-8 h-8 text-zinc-600" />}
              title="Aucun token"
              description="Créez un token pour partager un fichier"
              action={
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau token
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

      {/* Create Token Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un token d'accès"
      >
        <div className="space-y-4">
          <Input
            type="text"
            label="ID du fichier"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={fileIdForToken}
            onChange={(e) => setFileIdForToken(e.target.value)}
          />

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

          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/30">
                <CheckCircle className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">
                  Le token sera valide pendant <strong className="text-zinc-100">{tokenExpiry} heures</strong> et 
                  permettra <strong className="text-zinc-100">{maxDownloads} téléchargements</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={submitCreateToken}
              isLoading={createMutation.isPending}
            >
              <Key className="w-4 h-4 mr-2" />
              Créer le token
            </Button>
          </div>
        </div>
      </Modal>
    </PageTransition>
  );
}
