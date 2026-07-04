import { create } from 'zustand';
import { api } from '@/lib/api';

export type NotificationType =
  | 'daily_report'
  | 'symptom'
  | 'new_message'
  | 'caregiver_checkin'
  | 'caregiver_checkout'
  | 'sos'
  | 'task_change'
  | 'approval_pending'
  | 'permission_change'
  | 'caregiver_link_change';

export interface InAppNotification {
  notification_id: string;
  type: NotificationType;
  title: string;
  body: string;
  deep_link: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsState {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: (patientId: string) => Promise<void>;
  markAllRead: (patientId: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  // Old backend's /api/v1/notifications is not patient-scoped — it returns the
  // signed-in user's own notifications across all linked patients. `patientId`
  // is kept in the signature to avoid touching call sites; real per-patient
  // scoping needs a backend change (Notification.patient_context_id, C21).
  fetchNotifications: async (_patientId) => {
    set({ isLoading: true });
    try {
      const notifications = await api.get<InAppNotification[]>('/api/v1/notifications');
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch {
      // offline
    } finally {
      set({ isLoading: false });
    }
  },

  markAllRead: async (_patientId) => {
    await api.post('/api/v1/notifications/read-all', {}).catch(() => {});
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },
}));
