'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  Files, 
  Key, 
  Download, 
  TrendingUp,
  HardDrive,
  Activity,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnimatedCard, AnimatedNumber, Badge, Skeleton } from '@/components/ui';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { DashboardStats } from '@/types';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Animated Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  gradient,
  delay = 0,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  gradient: string;
  delay?: number;
}) {
  return (
    <AnimatedCard delay={delay} glow="indigo">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-400">{title}</p>
            <div className="text-3xl font-bold text-zinc-100">
              <AnimatedNumber value={value} />
            </div>
            {subtitle && (
              <p className="text-sm text-zinc-500">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">+{trend.value}%</span>
                </div>
                <span className="text-xs text-zinc-500">{trend.label}</span>
              </div>
            )}
          </div>
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
            style={{ boxShadow: `0 8px 24px -8px ${gradient.includes('indigo') ? 'rgba(99,102,241,0.4)' : gradient.includes('emerald') ? 'rgba(16,185,129,0.4)' : gradient.includes('amber') ? 'rgba(245,158,11,0.4)' : 'rgba(236,72,153,0.4)'}` }}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
        </div>
      </div>
    </AnimatedCard>
  );
}

// Activity Item Component
function ActivityItem({
  icon,
  title,
  description,
  time,
  index = 0,
}: {
  icon: string;
  title: string;
  description: string;
  time: string;
  index?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-4 py-3 group"
    >
      <div className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100 transition-colors">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{description}</p>
      </div>
      <p className="text-[10px] text-zinc-600 whitespace-nowrap font-medium">{time}</p>
    </motion.div>
  );
}

// Format day name from date
function formatDayName(dateStr: string): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const date = new Date(dateStr);
  return days[date.getDay()];
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

  // Transform daily stats to chart data
  const chartData = data?.dailyStats?.map(stat => ({
    name: formatDayName(stat.date),
    downloads: stat.downloads,
    uploads: stat.uploads
  })) || [];

  // Calculate total downloads from the week for trend
  const weeklyDownloads = chartData.reduce((sum, day) => sum + day.downloads, 0);

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Vue d&apos;ensemble de votre CDN</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Fichiers"
          value={data?.files.total || 0}
          subtitle={formatBytes(data?.files.totalSize || 0)}
          icon={Files}
          gradient="from-indigo-500 to-violet-600"
          delay={0}
        />
        <StatsCard
          title="Tokens Actifs"
          value={data?.tokens?.active || 0}
          subtitle={`${data?.tokens?.total || 0} total`}
          icon={Key}
          gradient="from-emerald-500 to-teal-600"
          delay={0.05}
        />
        <StatsCard
          title="Téléchargements"
          value={data?.access?.downloads || 0}
          subtitle={`${data?.access?.uniqueIPs || 0} IPs uniques`}
          icon={Download}
          gradient="from-amber-500 to-orange-600"
          delay={0.1}
        />
        <StatsCard
          title="Stockage"
          value={data?.files.total || 0}
          subtitle={formatBytes(data?.files.totalSize || 0)}
          icon={HardDrive}
          gradient="from-pink-500 to-rose-600"
          delay={0.15}
        />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Downloads Chart */}
        <AnimatedCard delay={0.2} className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Activité</h3>
                <p className="text-sm text-zinc-500">
                  {weeklyDownloads > 0 
                    ? `${weeklyDownloads} téléchargements cette semaine` 
                    : '7 derniers jours'}
                </p>
              </div>
              <Badge variant="success" className="animate-pulse-glow">
                <Activity className="w-3 h-3 mr-1" />
                En direct
              </Badge>
            </div>
            <div className="h-64 w-full" style={{ minHeight: '256px', minWidth: '200px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 11 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(24, 24, 27, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'downloads' ? 'Téléchargements' : 'Uploads'
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="downloads"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorDownloads)"
                      name="downloads"
                    />
                    <Area
                      type="monotone"
                      dataKey="uploads"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorUploads)"
                      name="uploads"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Aucune activité enregistrée</p>
                    <p className="text-sm text-zinc-600 mt-1">Les statistiques apparaîtront ici</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </AnimatedCard>

        {/* Recent Activity */}
        <AnimatedCard delay={0.25}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Activité récente</h3>
              <Clock className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="divide-y divide-zinc-800/50">
              {data?.recentActivity?.slice(0, 5).map((activity, index) => (
                <ActivityItem
                  key={activity.id || index}
                  icon={activity.action === 'download' ? '📥' : activity.action === 'upload' ? '📤' : '📄'}
                  title={activity.fileName || 'Fichier inconnu'}
                  description={activity.ipAddress || 'IP inconnue'}
                  time={formatRelativeTime(activity.createdAt)}
                  index={index}
                />
              )) || (
                <p className="text-zinc-500 text-center py-8">Aucune activité récente</p>
              )}
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Top Files */}
      <AnimatedCard delay={0.3}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Fichiers populaires</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fichier</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Téléchargements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {data?.topFiles?.map((item, index) => (
                  <motion.tr 
                    key={item.id || index} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">📄</span>
                        <span className="text-zinc-200 font-medium group-hover:text-zinc-100 transition-colors">
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
                      <span className="text-zinc-100 font-semibold">{item.access_count}</span>
                      <span className="text-zinc-500 ml-1 text-sm">téléchargements</span>
                    </td>
                  </motion.tr>
                )) || (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-500">
                      Aucun fichier téléchargé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedCard>
    </motion.div>
  );
}
