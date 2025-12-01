'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  Files, 
  Key, 
  Download, 
  TrendingUp,
  HardDrive,
  Activity,
  Clock
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, Badge, Skeleton } from '@/components/ui';
import { formatBytes, formatRelativeTime, getFileIcon } from '@/lib/utils';
import { DashboardStats } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  gradient: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-2">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">+{trend.value}%</span>
                <span className="text-sm text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Item Component
function ActivityItem({
  icon,
  title,
  description,
  time,
}: {
  icon: string;
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-4 py-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <p className="text-xs text-gray-500 whitespace-nowrap">{time}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.getDashboard();
      return response.data as DashboardStats;
    },
    refetchInterval: false, // Disable auto-refresh to avoid rate limiting
    retry: false, // Don't retry on error
  });

  // Mock chart data - in production, this would come from the API
  const chartData = [
    { name: 'Lun', downloads: 45 },
    { name: 'Mar', downloads: 52 },
    { name: 'Mer', downloads: 38 },
    { name: 'Jeu', downloads: 65 },
    { name: 'Ven', downloads: 72 },
    { name: 'Sam', downloads: 35 },
    { name: 'Dim', downloads: 28 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Vue d&apos;ensemble de votre CDN</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Fichiers"
          value={data?.files.total || 0}
          subtitle={formatBytes(data?.files.totalSize || 0)}
          icon={Files}
          gradient="from-indigo-500 to-purple-600"
        />
        <StatsCard
          title="Tokens Actifs"
          value={data?.tokens?.active || 0}
          subtitle={`${data?.tokens?.total || 0} total`}
          icon={Key}
          gradient="from-emerald-500 to-green-600"
        />
        <StatsCard
          title="Téléchargements"
          value={data?.access?.downloads || 0}
          subtitle={`${data?.access?.uniqueIPs || 0} IPs uniques`}
          icon={Download}
          gradient="from-amber-500 to-orange-600"
        />
        <StatsCard
          title="Stockage"
          value={formatBytes(data?.files.totalSize || 0)}
          subtitle={`${data?.files.total || 0} fichiers`}
          icon={HardDrive}
          gradient="from-pink-500 to-rose-600"
        />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Downloads Chart */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Téléchargements</h3>
                <p className="text-sm text-gray-500">7 derniers jours</p>
              </div>
              <Badge variant="success">
                <Activity className="w-3 h-3 mr-1" />
                En direct
              </Badge>
            </div>
            <div className="h-64 w-full" style={{ minHeight: '256px', minWidth: '200px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorDownloads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Activité récente</h3>
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <div className="divide-y divide-gray-800">
              {data?.recentActivity?.slice(0, 5).map((activity, index) => (
                <ActivityItem
                  key={activity.id || index}
                  icon={activity.action === 'download' ? '📥' : activity.action === 'upload' ? '📤' : '📄'}
                  title={activity.fileName || 'Fichier inconnu'}
                  description={activity.ipAddress || 'IP inconnue'}
                  time={formatRelativeTime(activity.createdAt)}
                />
              )) || (
                <p className="text-gray-500 text-center py-8">Aucune activité récente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Files */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fichiers populaires</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Fichier</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Téléchargements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data?.topFiles?.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📄</span>
                        <span className="text-white font-medium">
                          {item.original_name || 'Fichier inconnu'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">
                        {item.unique_visitors} visiteurs
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white font-semibold">{item.access_count}</span>
                      <span className="text-gray-500 ml-1">téléchargements</span>
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      Aucun fichier téléchargé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
