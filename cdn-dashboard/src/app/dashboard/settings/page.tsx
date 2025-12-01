'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, Button, Badge, Input, Modal, EmptyState, Skeleton } from '@/components/ui';
import { formatDate, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

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

export default function SettingsPage() {
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
    enabled: isSuperadmin,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 mt-1">Configuration du CDN</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Profil</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Nom d&apos;utilisateur</label>
                <p className="text-white font-medium mt-1">{user?.username}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <p className="text-white font-medium mt-1">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Rôle</label>
                <div className="mt-1">
                  <Badge variant={user?.role === 'superadmin' ? 'primary' : 'default'}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Membre depuis</label>
                <p className="text-white font-medium mt-1">
                  {user?.created_at ? formatDate(user.created_at, false) : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Section - Superadmin only */}
      {isSuperadmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-semibold text-white">Clés API</h3>
              <Button size="sm" onClick={() => setIsCreateKeyModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle clé
              </Button>
            </div>
          </CardHeader>
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
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Nom</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Préfixe</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Permissions</th>
                    <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Expiration</th>
                    <th className="text-right py-3 px-6 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {apiKeysData.data.map((apiKey: APIKey) => (
                    <tr key={apiKey.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                            <Key className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{apiKey.name}</p>
                            <p className="text-sm text-gray-500">
                              Créée le {formatDate(apiKey.created_at, false)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="px-2 py-1 bg-gray-800 rounded text-gray-300 text-sm">
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
                        {apiKey.expires_at ? (
                          <span className="text-gray-300">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                icon={<Key className="w-8 h-8 text-gray-600" />}
                title="Aucune clé API"
                description="Créez une clé pour permettre l'accès programmatique"
                action={
                  <Button onClick={() => setIsCreateKeyModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle clé
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Informations système</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-gray-400 text-sm">Statut</span>
              </div>
              <p className="text-white font-medium">Opérationnel</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Version</span>
              </div>
              <p className="text-white font-medium">CDN Dashboard v2.0</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm text-gray-400">
                Copiez cette clé maintenant. Elle ne sera plus affichée.
              </p>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={createdKey}
                readOnly
                className="w-full px-4 py-3 pr-24 rounded-xl bg-gray-800/50 border border-gray-700 text-white font-mono text-sm"
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
              <label className="text-sm font-medium text-gray-300">Permissions</label>
              <div className="flex gap-2 flex-wrap">
                {['read', 'upload', 'delete', 'admin'].map((perm) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePermission(perm)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                      newKeyPermissions.includes(perm)
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {perm}
                  </button>
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
    </div>
  );
}
