'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast, activity } from './notifications';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface RealtimeEvent {
  type: 'file_uploaded' | 'file_deleted' | 'token_created' | 'token_used' | 'download' | 'stats_update';
  data: Record<string, unknown>;
  timestamp: Date;
}

interface UseRealtimeOptions {
  onEvent?: (event: RealtimeEvent) => void;
  enablePolling?: boolean;
  pollInterval?: number;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onEvent, enablePolling = true, pollInterval = 30000 } = options;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Simulate real-time events with polling
  const checkForUpdates = useCallback(async () => {
    try {
      // Invalidate and refetch dashboard data
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLastUpdate(new Date());
      setStatus('connected');
    } catch (error) {
      console.error('Realtime update failed:', error);
      setStatus('error');
    }
  }, [queryClient]);

  // Set up polling
  useEffect(() => {
    if (!enablePolling) return;

    // Initial check
    setStatus('connected');
    setLastUpdate(new Date());

    const interval = setInterval(checkForUpdates, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [enablePolling, pollInterval, checkForUpdates]);

  // Simulate event emission
  const emitEvent = useCallback((event: Omit<RealtimeEvent, 'timestamp'>) => {
    const fullEvent = { ...event, timestamp: new Date() };
    
    // Update activity feed based on event type
    switch (event.type) {
      case 'file_uploaded':
        activity.upload(event.data.filename as string, event.data.size as string);
        toast.success('Nouveau fichier', `${event.data.filename} a été uploadé`);
        break;
      case 'file_deleted':
        activity.delete(event.data.filename as string);
        break;
      case 'token_created':
        activity.tokenCreated(event.data.tokenName as string);
        break;
      case 'download':
        activity.download(event.data.filename as string, event.data.by as string);
        break;
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['logs'] });

    // Call custom handler
    onEvent?.(fullEvent);
  }, [queryClient, onEvent]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setStatus('connecting');
    await checkForUpdates();
    toast.info('Données actualisées', 'Les données ont été mises à jour');
  }, [checkForUpdates]);

  return {
    status,
    lastUpdate,
    emitEvent,
    refresh,
  };
}

// Connection status indicator component
export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const statusConfig = {
    connected: {
      color: 'bg-emerald-500',
      pulse: true,
      label: 'Connecté',
    },
    connecting: {
      color: 'bg-amber-500',
      pulse: true,
      label: 'Connexion...',
    },
    disconnected: {
      color: 'bg-zinc-500',
      pulse: false,
      label: 'Déconnecté',
    },
    error: {
      color: 'bg-red-500',
      pulse: true,
      label: 'Erreur',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      <span className="text-xs text-zinc-400">{config.label}</span>
    </div>
  );
}
