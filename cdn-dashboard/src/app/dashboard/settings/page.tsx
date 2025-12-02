'use client';

import { 
  Shield,
  Clock,
  CheckCircle,
  User,
  Server,
  Database
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { Card, CardContent, CardHeader, Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 mt-1">Configuration et informations du compte</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Profil
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <label className="text-sm text-gray-400">Nom d&apos;utilisateur</label>
                <p className="text-white font-medium mt-1 text-lg">{user?.username || '-'}</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <label className="text-sm text-gray-400">Email</label>
                <p className="text-white font-medium mt-1 text-lg">{user?.email || '-'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <label className="text-sm text-gray-400">Rôle</label>
                <div className="mt-2">
                  <Badge variant={user?.role === 'superadmin' ? 'primary' : 'default'} className="text-base px-3 py-1">
                    <Shield className="w-4 h-4 mr-2" />
                    {user?.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                  </Badge>
                </div>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <label className="text-sm text-gray-400">Membre depuis</label>
                <p className="text-white font-medium mt-1 text-lg">
                  {user?.created_at ? formatDate(user.created_at, false) : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Informations système
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-gray-400 text-sm">Statut</span>
              </div>
              <p className="text-white font-medium text-lg">Opérationnel</p>
              <p className="text-xs text-gray-500 mt-1">Tous les services sont actifs</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-400 text-sm">Version</span>
              </div>
              <p className="text-white font-medium text-lg">CDN v2.0</p>
              <p className="text-xs text-gray-500 mt-1">Dashboard Next.js</p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-purple-400" />
                <span className="text-gray-400 text-sm">Base de données</span>
              </div>
              <p className="text-white font-medium text-lg">PostgreSQL 16</p>
              <p className="text-xs text-gray-500 mt-1">Connexion active</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Vos permissions
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white font-medium">Fichiers</p>
              <p className="text-xs text-gray-400">Lecture & Upload</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white font-medium">Tokens</p>
              <p className="text-xs text-gray-400">Création & Gestion</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white font-medium">Logs</p>
              <p className="text-xs text-gray-400">Consultation</p>
            </div>
            {user?.role === 'superadmin' ? (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-center">
                <CheckCircle className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                <p className="text-sm text-white font-medium">Admin</p>
                <p className="text-xs text-gray-400">Accès complet</p>
              </div>
            ) : (
              <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-center opacity-50">
                <Shield className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Admin</p>
                <p className="text-xs text-gray-500">Non disponible</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
