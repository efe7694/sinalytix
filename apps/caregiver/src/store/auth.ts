import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { coreApi } from '@/lib/api';

const TOKEN_KEY = 'caregiver_access_token';
const PROFILE_CACHE_KEY = 'caregiver_profile_cache';

interface CaregiverProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  status: string;
  onboarding_completed_at: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: CaregiverProfile | null;
  accessToken: string | null;

  setTokens: (access: string) => Promise<void>;
  loadSession: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  logout: () => Promise<void>;
  setDevSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  profile: null,
  accessToken: null,

  setTokens: async (access) => {
    await SecureStore.setItemAsync('caregiver_access_token', access);
    set({ accessToken: access, isAuthenticated: true });
    await get().fetchProfile();
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ accessToken: token, isAuthenticated: true });
        // Restore cached profile immediately so routing doesn't flicker
        const cached = await SecureStore.getItemAsync(PROFILE_CACHE_KEY);
        if (cached) set({ profile: JSON.parse(cached) });
        // Then refresh from server (best-effort — keeps cache if offline)
        await get().fetchProfile();
      }
    } catch {
      // token missing or expired — stay unauthenticated
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    try {
      // core-api /me returns { user, profile }; profile is the caregiver_profiles row.
      const me = await coreApi.get<{
        user: { user_id: string; phone_e164: string | null; email: string | null; status: string };
        profile: { first_name?: string | null; last_name?: string | null; role?: string | null } | null;
      }>('/me');
      const profile: CaregiverProfile = {
        user_id: me.user.user_id,
        first_name: me.profile?.first_name ?? '',
        last_name: me.profile?.last_name ?? '',
        phone: me.user.phone_e164,
        email: me.user.email,
        role: me.profile?.role ?? null,
        status: me.user.status,
        onboarding_completed_at: me.user.status === 'active' ? new Date().toISOString() : null,
      };
      await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(profile));
      set({ profile });
    } catch {
      // offline or mid-onboarding — keep cached profile, don't clear it
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PROFILE_CACHE_KEY);
    set({ isAuthenticated: false, accessToken: null, profile: null });
  },

  setDevSession: async () => {
    const profile: CaregiverProfile = {
      user_id: 'dev_user_001',
      first_name: 'Dev',
      last_name: 'Bakıcı',
      phone: null,
      email: 'dev@sinalytix.com',
      role: 'psw',
      status: 'active',
      onboarding_completed_at: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(TOKEN_KEY, 'dev_access_token');
    await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(profile));
    set({ isAuthenticated: true, isLoading: false, accessToken: 'dev_access_token', profile });
  },
}));
