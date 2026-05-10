import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export type NotificationType =
  | 'daily_report'
  | 'new_message'
  | 'task_reminder'
  | 'caregiver_connected'
  | 'caregiver_disconnected'
  | 'ec_verification_reminder'
  | 'symptom_report_sent';

export type RedirectTarget = 'task_list' | 'inbox' | 'settings_privacy';

export interface AppNotification {
  notification_id: string;
  type: NotificationType;
  title: string;
  redirect_target: RedirectTarget;
  redirect_params: { conversation_id?: string } | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at_ui: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
}

interface NotificationsActions {
  loadNotifications(): Promise<void>;
  markAllRead(): Promise<void>;
  unreadCount(): number;
}

export const useNotificationsStore = create<NotificationsState & NotificationsActions>(
  (set, get) => ({
    notifications: [],
    loading: false,
    error: null,

    loadNotifications: async () => {
      set({ loading: true, error: null });
      try {
        const now = new Date().toISOString();
        const all = await api.get<AppNotification[]>('/api/v1/notifications');
        // Only show notifications within 30-day UI retention window
        const visible = all.filter((n) => n.expires_at_ui > now);
        set({ notifications: visible, loading: false });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof ApiError ? err.message : 'Bildirimler yüklenemedi.',
        });
      }
    },

    markAllRead: async () => {
      const now = new Date().toISOString();
      // Optimistic — mark all visible as read immediately
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.is_read ? n : { ...n, is_read: true, read_at: now },
        ),
      }));
      try {
        await api.post('/api/v1/notifications/read-all', {});
      } catch {
        // Non-critical — badge will reconcile on next load
      }
    },

    unreadCount: () => {
      const now = new Date().toISOString();
      return get().notifications.filter(
        (n) => !n.is_read && n.expires_at_ui > now,
      ).length;
    },
  }),
);
