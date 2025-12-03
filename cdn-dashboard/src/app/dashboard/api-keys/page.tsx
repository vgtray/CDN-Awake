'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
  CheckCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton, PageTransition } from '@/components/ui';
import { formatDate, copyToClipboard } from '@/lib/utils';
import { toast } from '@/lib/notifications';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export default function APIKeysPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState(365);
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read', 'upload']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const isSuperadmin = user?.role === 'superadmin';

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.getAPIKeys();
      return response;
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[]; expiresInDays?: number }) =>
      api.createAPIKey(data),
    onSuccess: (response) => {
      if (response.data?.key) {
        setCreatedKey(response.data.key);
      }
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Clé API créée');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => api.revokeAPIKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('Clé API révoquée');
    },
    onError: () => {
      toast.error('Erreur lors de la révocation');
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }
    createKeyMutation.mutate({
      name: newKeyName.trim(),
      permissions: newKeyPermissions,
      expiresInDays: newKeyExpiry,
    });
  };

  const handleCopyKey = () => {
    if (createdKey) {
      copyToClipboard(createdKey);
      toast.success('Clé copiée!');
    }
  };

  const handleCloseKeyModal = () => {
    setIsCreateKeyModalOpen(false);
    setCreatedKey(null);
    setNewKeyName('');
    setNewKeyExpiry(365);
    setNewKeyPermissions(['read', 'upload']);
  };

  const togglePermission = (perm: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  // Non-superadmin users can't see this page
  if (!isSuperadmin) {
    return (
      <PageTransition className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clés API</h1>
          <p className="text-zinc-400 mt-1">Gestion des clés d&apos;accès</p>
        </div>
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<Shield className="w-8 h-8 text-zinc-600" />}
              title="Accès restreint"
              description="Seuls les super administrateurs peuvent gérer les clés API"
            />
          </CardContent>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clés API</h1>
          <p className="text-zinc-400 mt-1">Gérez vos clés d&apos;accès programmatique</p>
        </div>
        <Button onClick={() => setIsCreateKeyModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle clé
        </Button>
      </div>

      {/* API Keys Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : apiKeysData?.data?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-6 text-sm font-medium text-zinc-400">Nom</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-zinc-400">Préfixe</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-zinc-400">Permissions</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-zinc-400">Dernière utilisation</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-zinc-400">Expiration</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {apiKeysData.data.map((apiKey: APIKey, index: number) => (
                  <motion.tr
                    key={apiKey.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                          <Key className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{apiKey.name}</p>
                          <p className="text-sm text-zinc-500">
                            Créée le {formatDate(apiKey.created_at, false)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <code className="px-2 py-1 bg-zinc-800 rounded text-zinc-300 text-sm">
                        {apiKey.key_prefix}...
                      </code>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1 flex-wrap">
                        {apiKey.permissions.map((perm) => (
                          <Badge key={perm} variant="default" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {apiKey.last_used_at ? (
                        <span className="text-zinc-300">
                          {formatDate(apiKey.last_used_at, false)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">Jamais</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {apiKey.expires_at ? (
                        <span className="text-zinc-300">
                          {formatDate(apiKey.expires_at, false)}
                        </span>
                      ) : (
                        <Badge variant="success">Jamais</Badge>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm('Révoquer cette clé API ?')) {
                              revokeKeyMutation.mutate(apiKey.id);
                            }
                          }}
                          title="Révoquer"
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
            <div className="p-12">
              <EmptyState
                icon={<Key className="w-8 h-8 text-zinc-600" />}
                title="Aucune clé API"
                description="Créez une clé pour permettre l'accès programmatique à votre CDN"
                action={
                  <Button onClick={() => setIsCreateKeyModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une clé
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </Card>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              À propos des clés API
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <h4 className="font-medium text-white mb-2">Permissions disponibles</h4>
                <ul className="space-y-1 text-zinc-400">
                  <li><Badge variant="default" className="mr-2">read</Badge> Lecture des fichiers</li>
                  <li><Badge variant="default" className="mr-2">upload</Badge> Upload de fichiers</li>
                  <li><Badge variant="default" className="mr-2">delete</Badge> Suppression de fichiers</li>
                  <li><Badge variant="default" className="mr-2">admin</Badge> Accès administrateur</li>
                </ul>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-xl">
                <h4 className="font-medium text-white mb-2">Bonnes pratiques</h4>
                <ul className="space-y-1 text-zinc-400">
                  <li>• Utilisez des clés distinctes par application</li>
                  <li>• Définissez une date d&apos;expiration</li>
                  <li>• Limitez les permissions au strict nécessaire</li>
                  <li>• Révoquée les clés inutilisées</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create API Key Modal */}
      <Modal
        isOpen={isCreateKeyModalOpen}
        onClose={handleCloseKeyModal}
        title={createdKey ? 'Clé API créée' : 'Nouvelle clé API'}
      >
        {createdKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-400 font-medium">Clé créée avec succès</p>
              </div>
              <p className="text-sm text-zinc-400">
                Copiez cette clé maintenant. Elle ne sera plus affichée.
              </p>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={createdKey}
                readOnly
                className="w-full px-4 py-3 pr-24 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyKey}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={handleCloseKeyModal}>
              Fermer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              type="text"
              label="Nom de la clé"
              placeholder="Ex: Production API"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />

            <Input
              type="number"
              label="Expiration (jours)"
              value={newKeyExpiry}
              onChange={(e) => setNewKeyExpiry(Number(e.target.value))}
              min={1}
              max={3650}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Permissions</label>
              <div className="flex gap-2 flex-wrap">
                {['read', 'upload', 'delete', 'admin'].map((perm) => (
                  <motion.button
                    key={perm}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => togglePermission(perm)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      newKeyPermissions.includes(perm)
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {perm}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleCloseKeyModal}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateKey}
                isLoading={createKeyMutation.isPending}
              >
                <Key className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
