'use client';

import { create } from 'zustand';

// ===== NOTIFICATION TYPES =====
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
}

// ===== NOTIFICATION STORE =====
interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  maxNotifications: 5,

  addNotification: (notification) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      duration: notification.duration ?? 5000,
    };

    set((state) => {
      // Garder seulement les dernières notifications (max - 1) + la nouvelle
      const existingNotifications = state.notifications.slice(
        -(state.maxNotifications - 1)
      );
      return {
        notifications: [...existingNotifications, newNotification],
      };
    });

    // Auto-remove après duration (sauf si 0)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

// ===== NOTIFICATION HELPERS =====
export const toast = {
  success: (title: string, message?: string, options?: Partial<Notification>) => {
    return useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      ...options,
    });
  },

  error: (title: string, message?: string, options?: Partial<Notification>) => {
    return useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Errors stay longer
      ...options,
    });
  },

  warning: (title: string, message?: string, options?: Partial<Notification>) => {
    return useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      ...options,
    });
  },

  info: (title: string, message?: string, options?: Partial<Notification>) => {
    return useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      ...options,
    });
  },

  custom: (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    return useNotificationStore.getState().addNotification(notification);
  },

  dismiss: (id: string) => {
    useNotificationStore.getState().removeNotification(id);
  },

  dismissAll: () => {
    useNotificationStore.getState().clearAll();
  },
};

// ===== ACTIVITY FEED TYPES =====
export type ActivityType = 'upload' | 'download' | 'delete' | 'login' | 'token_created' | 'token_revoked' | 'settings_changed';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

// ===== ACTIVITY FEED STORE =====
interface ActivityState {
  activities: Activity[];
  unreadCount: number;
  maxActivities: number;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  unreadCount: 0,
  maxActivities: 50,

  addActivity: (activity) => {
    const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newActivity: Activity = {
      ...activity,
      id,
      timestamp: new Date(),
      read: false,
    };

    set((state) => ({
      activities: [newActivity, ...state.activities].slice(0, state.maxActivities),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) => {
    set((state) => {
      const activity = state.activities.find((a) => a.id === id);
      if (!activity || activity.read) return state;

      return {
        activities: state.activities.map((a) =>
          a.id === id ? { ...a, read: true } : a
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      activities: state.activities.map((a) => ({ ...a, read: true })),
      unreadCount: 0,
    }));
  },

  clearActivities: () => {
    set({ activities: [], unreadCount: 0 });
  },
}));

// ===== ACTIVITY HELPERS =====
export const activity = {
  upload: (filename: string, size?: string) => {
    useActivityStore.getState().addActivity({
      type: 'upload',
      title: 'Fichier uploadé',
      description: filename,
      metadata: { size },
    });
  },

  download: (filename: string, by?: string) => {
    useActivityStore.getState().addActivity({
      type: 'download',
      title: 'Fichier téléchargé',
      description: filename,
      metadata: { by },
    });
  },

  delete: (filename: string) => {
    useActivityStore.getState().addActivity({
      type: 'delete',
      title: 'Fichier supprimé',
      description: filename,
    });
  },

  login: (username: string) => {
    useActivityStore.getState().addActivity({
      type: 'login',
      title: 'Connexion',
      description: `${username} s'est connecté`,
    });
  },

  tokenCreated: (tokenName: string) => {
    useActivityStore.getState().addActivity({
      type: 'token_created',
      title: 'Token créé',
      description: tokenName,
    });
  },

  tokenRevoked: (tokenName: string) => {
    useActivityStore.getState().addActivity({
      type: 'token_revoked',
      title: 'Token révoqué',
      description: tokenName,
    });
  },
};
