'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Download,
  Upload,
  Eye,
  Clock,
  Globe,
  Filter,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Monitor,
  FileDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnimatedCard, CardContent, CardHeader, Badge, Skeleton, EmptyState, PageTransition, Button } from '@/components/ui';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { toast } from '@/lib/notifications';

interface AccessLog {
  id: string;
  file_id: string;
  token_id: string | null;
  ip_address: string;
  user_agent: string;
  action: string;
  status_code?: number;
  response_time_ms?: number;
  created_at: string;
  file_name?: string;
  file?: {
    original_name: string;
  };
}

type ActionFilter = 'all' | 'download' | 'upload' | 'view' | 'delete';
type StatusFilter = 'all' | 'success' | 'error';

const ACTION_FILTERS: { value: ActionFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tous', icon: <Activity className="w-4 h-4" /> },
  { value: 'download', label: 'Téléchargements', icon: <Download className="w-4 h-4" /> },
  { value: 'upload', label: 'Uploads', icon: <Upload className="w-4 h-4" /> },
  { value: 'view', label: 'Vues', icon: <Eye className="w-4 h-4" /> },
  { value: 'delete', label: 'Suppressions', icon: <Trash2 className="w-4 h-4" /> },
];

const STATUS_FILTERS: { value: StatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tous', icon: <Activity className="w-4 h-4" /> },
  { value: 'success', label: 'Succès', icon: <CheckCircle className="w-4 h-4" /> },
  { value: 'error', label: 'Erreurs', icon: <XCircle className="w-4 h-4" /> },
];

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = 'Inconnu';
  let os = 'Inconnu';
  
  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('curl')) browser = 'cURL';
  else if (ua.includes('python')) browser = 'Python';
  else if (ua.includes('node')) browser = 'Node.js';
  
  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  
  return { browser, os };
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
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
      case 'upload':
        return { variant: 'info' as const, icon: Upload, label: 'Upload' };
      case 'view':
        return { variant: 'default' as const, icon: Eye, label: 'View' };
      case 'delete':
        return { variant: 'danger' as const, icon: Trash2, label: 'Delete' };
      default:
        return { variant: 'default' as const, icon: Activity, label: action };
    }
  };

  const getStatusBadge = (statusCode: number | undefined) => {
    if (!statusCode) return null;
    if (statusCode >= 200 && statusCode < 300) {
      return { variant: 'success' as const, icon: CheckCircle, label: statusCode.toString() };
    }
    if (statusCode >= 400) {
      return { variant: 'danger' as const, icon: XCircle, label: statusCode.toString() };
    }
    return { variant: 'warning' as const, icon: AlertTriangle, label: statusCode.toString() };
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.filter((log: AccessLog) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = (
          log.file_name?.toLowerCase().includes(searchLower) ||
          log.file?.original_name?.toLowerCase().includes(searchLower) ||
          log.ip_address.includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        const isSuccess = log.status_code && log.status_code >= 200 && log.status_code < 300;
        if (statusFilter === 'success' && !isSuccess) return false;
        if (statusFilter === 'error' && isSuccess) return false;
      }
      
      return true;
    });
  }, [data?.data, search, actionFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!data?.data) return { downloads: 0, uploads: 0, errors: 0, uniqueIPs: 0 };
    
    const logs = data.data as AccessLog[];
    const uniqueIPs = new Set(logs.map((l) => l.ip_address)).size;
    const downloads = logs.filter((l) => l.action === 'download').length;
    const uploads = logs.filter((l) => l.action === 'upload').length;
    const errors = logs.filter((l) => l.status_code && l.status_code >= 400).length;
    
    return { downloads, uploads, errors, uniqueIPs };
  }, [data?.data]);

  return (
    <PageTransition className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">Logs d&apos;accès</h1>
          <p className="text-sm text-zinc-500 mt-1">Historique des téléchargements et accès</p>
        </div>
        <div className="flex items-center gap-2">
          {filteredLogs.length > 0 && (
            <div className="relative group">
              <Button variant="secondary">
                <FileDown className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-1 min-w-32">
                  <button
                    onClick={() => {
                      api.exportToCSV(filteredLogs.map((l: AccessLog) => ({
                        id: l.id,
                        action: l.action,
                        file: l.file_name || l.file?.original_name || l.file_id,
                        ip: l.ip_address,
                        status: l.status_code,
                        response_time: l.response_time_ms,
                        date: l.created_at
                      })), 'access_logs');
                      toast.success('Export CSV téléchargé');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700 rounded"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      api.exportToJSON(filteredLogs.map((l: AccessLog) => ({
                        id: l.id,
                        action: l.action,
                        file: l.file_name || l.file?.original_name || l.file_id,
                        ip: l.ip_address,
                        user_agent: l.user_agent,
                        status: l.status_code,
                        response_time: l.response_time_ms,
                        date: l.created_at
                      })), 'access_logs');
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
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <AnimatedCard delay={0}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-100">{stats.downloads}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">Téléchargements</p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-100">{stats.uploads}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">Uploads</p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.1}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-100">{stats.errors}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">Erreurs</p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
        <AnimatedCard delay={0.15}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-100">{stats.uniqueIPs}</p>
                <p className="text-[10px] sm:text-xs text-zinc-500">IPs uniques</p>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Search & Filters */}
      <AnimatedCard delay={0.2}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
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
            
            {/* Toggle Filters */}
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-indigo-500/20 border-indigo-500/30' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-zinc-800/50 space-y-4"
            >
              {/* Action Filter */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">Type d&apos;action</p>
                <div className="flex flex-wrap gap-2">
                  {ACTION_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setActionFilter(filter.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        actionFilter === filter.value
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      {filter.icon}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <p className="text-sm text-zinc-400 mb-2">Statut</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === filter.value
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/50'
                      }`}
                    >
                      {filter.icon}
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Logs Table */}
      <AnimatedCard delay={0.25}>
        <CardHeader className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">
            {filteredLogs.length} entrée(s)
          </h3>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Action</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fichier</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">IP / Client</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Temps</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {filteredLogs.map((log: AccessLog, index: number) => {
                  const { variant, icon: Icon, label } = getActionBadge(log.action);
                  const statusBadge = getStatusBadge(log.status_code);
                  const { browser, os } = parseUserAgent(log.user_agent || '');
                  
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.3 }}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <Badge variant={variant}>
                          <Icon className="w-3 h-3 mr-1" />
                          {label}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-zinc-200 font-medium group-hover:text-zinc-100 transition-colors">
                          {log.file_name || log.file?.original_name || (log.file_id ? log.file_id.slice(0, 8) + '...' : 'N/A')}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-zinc-600" />
                            <span className="text-zinc-300 font-mono text-sm">{log.ip_address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Monitor className="w-3 h-3" />
                            <span>{browser} • {os}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {statusBadge ? (
                          <Badge variant={statusBadge.variant}>
                            <statusBadge.icon className="w-3 h-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {log.response_time_ms ? (
                          <span className={`text-sm font-mono ${
                            log.response_time_ms < 100 ? 'text-emerald-400' :
                            log.response_time_ms < 500 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {log.response_time_ms}ms
                          </span>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-600" />
                          <span className="text-zinc-400 text-sm" title={formatDate(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Activity className="w-8 h-8 text-zinc-600" />}
              title="Aucun log"
              description={search || actionFilter !== 'all' || statusFilter !== 'all' 
                ? 'Aucun résultat pour ces filtres'
                : 'Les logs d\'accès apparaîtront ici'}
              action={
                (search || actionFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setActionFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )
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
    </PageTransition>
  );
}
