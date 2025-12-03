'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Bell,
  Upload,
  Download,
  Trash2,
  LogIn,
  Key,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useNotificationStore, 
  useActivityStore,
  type NotificationType,
  type ActivityType,
  type Activity 
} from '@/lib/notifications';
import { useState } from 'react';

// ===== NOTIFICATION TOAST COMPONENT =====
const notificationIcons: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <XCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

const notificationStyles: Record<NotificationType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-400',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
};

const notificationProgressColors: Record<NotificationType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export function NotificationToast() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ 
              duration: 0.3,
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            className={cn(
              'relative overflow-hidden rounded-xl border backdrop-blur-md shadow-lg pointer-events-auto',
              notificationStyles[notification.type]
            )}
          >
            {/* Progress bar */}
            {notification.duration && notification.duration > 0 && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: notification.duration / 1000, ease: "linear" }}
                className={cn(
                  'absolute top-0 left-0 right-0 h-1 origin-left',
                  notificationProgressColors[notification.type]
                )}
              />
            )}

            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {notificationIcons[notification.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{notification.title}</p>
                {notification.message && (
                  <p className="mt-1 text-sm opacity-80">{notification.message}</p>
                )}
                {notification.action && (
                  <button
                    onClick={() => {
                      notification.action?.onClick();
                      removeNotification(notification.id);
                    }}
                    className="mt-2 text-sm font-medium underline underline-offset-4 hover:no-underline"
                  >
                    {notification.action.label}
                  </button>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ===== ACTIVITY ICON MAPPING =====
const activityIcons: Record<ActivityType, React.ReactNode> = {
  upload: <Upload className="w-4 h-4 text-emerald-400" />,
  download: <Download className="w-4 h-4 text-blue-400" />,
  delete: <Trash2 className="w-4 h-4 text-red-400" />,
  login: <LogIn className="w-4 h-4 text-indigo-400" />,
  token_created: <Key className="w-4 h-4 text-amber-400" />,
  token_revoked: <Key className="w-4 h-4 text-zinc-400" />,
  settings_changed: <Settings className="w-4 h-4 text-violet-400" />,
};

const activityBgColors: Record<ActivityType, string> = {
  upload: 'bg-emerald-500/10',
  download: 'bg-blue-500/10',
  delete: 'bg-red-500/10',
  login: 'bg-indigo-500/10',
  token_created: 'bg-amber-500/10',
  token_revoked: 'bg-zinc-500/10',
  settings_changed: 'bg-violet-500/10',
};

// ===== ACTIVITY PANEL COMPONENT =====
interface ActivityPanelProps {
  className?: string;
}

export function ActivityPanel({ className }: ActivityPanelProps) {
  const { activities, unreadCount, markAsRead, markAllAsRead } = useActivityStore();

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
    return `Il y a ${Math.floor(seconds / 86400)}j`;
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-400" />
          <span className="font-medium text-zinc-100">Activité récente</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-400 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto max-h-96">
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400">Aucune activité récente</p>
            </motion.div>
          ) : (
            activities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity}
                onRead={() => markAsRead(activity.id)}
                formatTimeAgo={formatTimeAgo}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== ACTIVITY ITEM =====
interface ActivityItemProps {
  activity: Activity;
  onRead: () => void;
  formatTimeAgo: (date: Date) => string;
  index: number;
}

function ActivityItem({ activity, onRead, formatTimeAgo, index }: ActivityItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onRead}
      className={cn(
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        'hover:bg-zinc-800/30',
        !activity.read && 'bg-indigo-500/5 border-l-2 border-indigo-500'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
        activityBgColors[activity.type]
      )}>
        {activityIcons[activity.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm',
          activity.read ? 'text-zinc-300' : 'text-zinc-100 font-medium'
        )}>
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-xs text-zinc-500 truncate">{activity.description}</p>
        )}
      </div>

      {/* Time */}
      <span className="flex-shrink-0 text-xs text-zinc-500">
        {formatTimeAgo(activity.timestamp)}
      </span>
    </motion.div>
  );
}

// ===== ACTIVITY DROPDOWN =====
export function ActivityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useActivityStore();

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 bottom-12 z-[9999] w-80 rounded-xl border border-zinc-800/50 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
              <ActivityPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== NOTIFICATION BELL WITH BADGE =====
export function NotificationBell() {
  const { unreadCount } = useActivityStore();

  return (
    <div className="relative">
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </div>
  );
}
