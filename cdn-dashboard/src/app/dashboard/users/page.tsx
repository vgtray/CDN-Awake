'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Search, 
  Trash2, 
  Shield, 
  UserPlus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Card, CardContent, Button, Badge, Input, Modal, EmptyState, Skeleton } from '@/components/ui';
import { formatDate, getInitials } from '@/lib/utils';
import { AdminUser } from '@/types';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Form state for new user
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'superadmin'>('admin');

  // Check authorization - only superadmin can access
  const isAuthorized = currentUser?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.getUsers();
      return response;
    },
    enabled: isAuthorized,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string; role: string }) =>
      api.createUser(data),
    onSuccess: () => {
      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('admin');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.updateUser(id, { role }),
    onSuccess: () => {
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Rôle modifié');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });

  const handleDelete = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    if (window.confirm(`Supprimer l'utilisateur "${user.username}" ?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleRoleChange = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const submitRoleChange = (newRole: 'admin' | 'superadmin') => {
    if (selectedUser) {
      updateRoleMutation.mutate({ id: selectedUser.id, role: newRole });
    }
  };

  const submitCreateUser = () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate({
      username: newUsername.trim(),
      email: newEmail.trim(),
      password: newPassword,
      role: newRole,
    });
  };

  // Filter users based on search
  const filteredUsers = data?.data?.filter((user: AdminUser) => {
    if (!search) return true;
    return (
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-400 mt-1">Gérez les administrateurs du CDN</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredUsers?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user: AdminUser) => (
            <Card key={user.id} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {getInitials(user.username)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{user.username}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  {user.id === currentUser?.id && (
                    <Badge variant="info">Vous</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Rôle</span>
                    <Badge variant={user.role === 'superadmin' ? 'primary' : 'default'}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Statut</span>
                    <Badge variant={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Actif
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactif
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Créé le</span>
                    <span className="text-sm text-gray-300">
                      {formatDate(user.created_at, false)}
                    </span>
                  </div>
                </div>

                {user.id !== currentUser?.id && (
                  <div className="mt-4 pt-4 border-t border-gray-800 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRoleChange(user)}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Rôle
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(user)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Users className="w-8 h-8 text-gray-600" />}
            title="Aucun utilisateur"
            description="Créez votre premier administrateur"
            action={
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Nouvel utilisateur
              </Button>
            }
          />
        </Card>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouvel utilisateur"
      >
        <div className="space-y-4">
          <Input
            type="text"
            label="Nom d'utilisateur"
            placeholder="john_doe"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />

          <Input
            type="email"
            label="Email"
            placeholder="john@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <Input
            type="password"
            label="Mot de passe"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Rôle</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNewRole('admin')}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  newRole === 'admin'
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Shield className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setNewRole('superadmin')}
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  newRole === 'superadmin'
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Shield className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm">Super Admin</span>
              </button>
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
              onClick={submitCreateUser}
              isLoading={createMutation.isPending}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Créer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Role Change Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Modifier le rôle"
      >
        <div className="space-y-4">
          {selectedUser && (
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {getInitials(selectedUser.username)}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedUser.username}</p>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-400">Sélectionnez le nouveau rôle:</p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => submitRoleChange('admin')}
              disabled={selectedUser?.role === 'admin' || updateRoleMutation.isPending}
              className={`flex-1 p-4 rounded-xl border transition-all ${
                selectedUser?.role === 'admin'
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              } disabled:opacity-50`}
            >
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <span className="block font-medium">Admin</span>
              <span className="text-xs text-gray-500">Accès standard</span>
            </button>
            <button
              type="button"
              onClick={() => submitRoleChange('superadmin')}
              disabled={selectedUser?.role === 'superadmin' || updateRoleMutation.isPending}
              className={`flex-1 p-4 rounded-xl border transition-all ${
                selectedUser?.role === 'superadmin'
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              } disabled:opacity-50`}
            >
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <span className="block font-medium">Super Admin</span>
              <span className="text-xs text-gray-500">Accès complet</span>
            </button>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setIsRoleModalOpen(false)}
          >
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}
