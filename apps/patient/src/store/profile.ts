import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  locale: string;
  auth_method: string | null;
}

export interface AccountDeletionRequest {
  request_id: string;
  scheduled_deletion_at: string;
  status: 'pending' | 'cancelled' | 'executed';
}

interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  deletionRequest: AccountDeletionRequest | null;
}

interface ProfileActions {
  loadProfile(): Promise<void>;
  updateProfile(patch: Partial<Pick<UserProfile, 'display_name' | 'email' | 'locale'>>): Promise<void>;
  requestDataExport(): Promise<void>;
  requestAccountDeletion(): Promise<AccountDeletionRequest>;
  cancelAccountDeletion(requestId: string): Promise<void>;
}

export const useProfileStore = create<ProfileState & ProfileActions>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,
  error: null,
  deletionRequest: null,

  loadProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await api.get<UserProfile>('/api/v1/users/me');
      set({ profile, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : 'Profil yüklenemedi.' });
    }
  },

  updateProfile: async (patch) => {
    const previous = get().profile;
    if (previous) {
      set({ profile: { ...previous, ...patch } });
    }

    set({ saving: true, error: null });
    try {
      const updated = await api.post<UserProfile>('/api/v1/users/me', patch);
      set({ profile: updated, saving: false });
    } catch (err) {
      set({ profile: previous, saving: false, error: err instanceof ApiError ? err.message : 'Profil güncellenemedi.' });
    }
  },

  requestDataExport: async () => {
    set({ error: null });
    try {
      await api.post('/api/v1/users/me/export', {});
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Dışa aktarma isteği gönderilemedi.' });
    }
  },

  requestAccountDeletion: async () => {
    set({ error: null });
    try {
      const result = await api.post<AccountDeletionRequest>('/api/v1/users/me/delete-request', {});
      set({ deletionRequest: result });
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Hesap silme isteği gönderilemedi.';
      set({ error: message });
      throw err;
    }
  },

  cancelAccountDeletion: async (requestId) => {
    set({ error: null });
    try {
      await api.post(`/api/v1/users/me/delete-request/${requestId}/cancel`, {});
      set({ deletionRequest: null });
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : 'Hesap silme isteği iptal edilemedi.' });
    }
  },
}));
