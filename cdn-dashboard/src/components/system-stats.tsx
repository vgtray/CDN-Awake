'use client';

import { motion } from 'framer-motion';
import { Activity, Server, Clock, Zap, Database, Cpu } from 'lucide-react';
import { AnimatedCard, AnimatedNumber } from './ui';

interface SystemMetrics {
  uptime: number; // in hours
  responseTime: number; // in ms
  requests: number;
  errors: number;
  cacheHitRate: number; // percentage
}

interface SystemStatsProps {
  metrics?: SystemMetrics;
  isLoading?: boolean;
}

const defaultMetrics: SystemMetrics = {
  uptime: 99.9,
  responseTime: 45,
  requests: 1250,
  errors: 2,
  cacheHitRate: 94.5,
};

export function SystemStats({ metrics = defaultMetrics, isLoading = false }: SystemStatsProps) {
  if (isLoading) {
    return (
      <AnimatedCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-800 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-zinc-800 rounded" />
            ))}
          </div>
        </div>
      </AnimatedCard>
    );
  }

  const stats = [
    {
      icon: Clock,
      label: 'Uptime',
      value: metrics.uptime,
      suffix: '%',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: Zap,
      label: 'Temps de réponse',
      value: metrics.responseTime,
      suffix: 'ms',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Activity,
      label: 'Requêtes/h',
      value: metrics.requests,
      suffix: '',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Database,
      label: 'Cache hit',
      value: metrics.cacheHitRate,
      suffix: '%',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-zinc-800">
          <Server className="w-4 h-4 text-zinc-400" />
        </div>
        <h3 className="font-semibold text-zinc-100">Santé du système</h3>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-400 font-medium">Opérationnel</span>
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} rounded-xl p-4 border border-zinc-800/50`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-zinc-400">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              <AnimatedNumber value={stat.value} />
              <span className="text-sm ml-0.5">{stat.suffix}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Progress Bar for Overall Health */}
      <div className="mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">Score de santé global</span>
          <span className="text-xs font-medium text-emerald-400">98/100</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '98%' }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          />
        </div>
      </div>
    </AnimatedCard>
  );
}

// Quick Actions Component
interface QuickAction {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <AnimatedCard className="p-6">
      <h3 className="font-semibold text-zinc-100 mb-4">Actions rapides</h3>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group text-left"
          >
            <div className={`p-2 rounded-lg ${action.color}`}>
              <action.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 group-hover:text-white transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-zinc-500 truncate">{action.description}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                className="w-4 h-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    </AnimatedCard>
  );
}

// Storage Usage Component
interface StorageUsageProps {
  used: number;
  total: number;
  breakdown?: {
    label: string;
    size: number;
    color: string;
  }[];
}

export function StorageUsage({ used, total, breakdown = [] }: StorageUsageProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-100">Stockage</h3>
        <span className="text-sm text-zinc-400">
          {formatSize(used)} / {formatSize(total)}
        </span>
      </div>

      <div className="mb-4">
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              percentage > 90
                ? 'bg-red-500'
                : percentage > 70
                ? 'bg-amber-500'
                : 'bg-indigo-500'
            }`}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          {percentage.toFixed(1)}% utilisé
        </p>
      </div>

      {breakdown.length > 0 && (
        <div className="space-y-2">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-zinc-400 flex-1">{item.label}</span>
              <span className="text-xs text-zinc-500">{formatSize(item.size)}</span>
            </div>
          ))}
        </div>
      )}
    </AnimatedCard>
  );
}
