'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Search, 
  Download,
  Eye,
  Clock,
  Globe
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, Badge, Skeleton, EmptyState } from '@/components/ui';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface AccessLog {
  id: string;
  file_id: string;
  token_id: string | null;
  ip_address: string;
  user_agent: string;
  action: string;
  created_at: string;
  file?: {
    original_name: string;
  };
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page],
    queryFn: async () => {
      const response = await api.getAccessLogs({ page, limit: 50 });
      return response;
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'download':
        return { variant: 'success' as const, icon: Download, label: 'Download' };
      case 'view':
        return { variant: 'info' as const, icon: Eye, label: 'View' };
      default:
        return { variant: 'default' as const, icon: Activity, label: action };
    }
  };

  // Filter logs based on search
  const filteredLogs = data?.data?.filter((log: AccessLog) => {
    if (!search) return true;
    return (
      log.file?.original_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.ip_address.includes(search) ||
      log.action.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Logs d&apos;accès</h1>
        <p className="text-gray-400 mt-1">Historique des téléchargements et accès</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher par fichier, IP, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">
            {data?.pagination?.total || 0} entrée(s)
          </h3>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredLogs?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Action</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Fichier</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">IP</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredLogs.map((log: AccessLog) => {
                  const { variant, icon: Icon, label } = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <Badge variant={variant}>
                          <Icon className="w-3 h-3 mr-1" />
                          {label}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-white">
                          {log.file?.original_name || log.file_id.slice(0, 8) + '...'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300 font-mono text-sm">{log.ip_address}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-300" title={formatDate(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Activity className="w-8 h-8 text-gray-600" />}
              title="Aucun log"
              description="Les logs d'accès apparaîtront ici"
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
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
