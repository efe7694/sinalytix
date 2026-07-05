import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { coreApi } from '@/lib/api';

const TOKEN_KEY = 'family_access_token';
const PROFILE_CACHE_KEY = 'family_profile_cache';

export interface FamilyProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  relationship: 'spouse' | 'child' | 'sibling' | 'parent' | 'other';
  locale: string;
  status: string;
  onboarding_completed_at: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: FamilyProfile | null;
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
    await SecureStore.setItemAsync(TOKEN_KEY, access);
    set({ accessToken: access, isAuthenticated: true });
    await get().fetchProfile();
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        set({ accessToken: token, isAuthenticated: true });
        const cached = await SecureStore.getItemAsync(PROFILE_CACHE_KEY);
        if (cached) set({ profile: JSON.parse(cached) });
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
      // core-api /me returns { user, profile } — profile is the family_profiles
      // row. `relationship` is deliberately absent: it's now per-link (a family
      // member can relate differently to each patient), so it lives on the
      // patient roster (/family/my-links), not on a single profile.
      const me = await coreApi.get<{
        user: { user_id: string; phone_e164: string | null; email: string | null; locale: string; status: string };
        profile: { first_name?: string | null; last_name?: string | null } | null;
      }>('/me');
      const profile: FamilyProfile = {
        user_id: me.user.user_id,
        first_name: me.profile?.first_name ?? '',
        last_name: me.profile?.last_name ?? '',
        phone: me.user.phone_e164,
        email: me.user.email,
        relationship: 'other',
        locale: me.user.locale,
        status: me.user.status,
        onboarding_completed_at: me.user.status === 'active' ? new Date().toISOString() : null,
      };
      await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(profile));
      set({ profile });
    } catch {
      // offline or mid-onboarding — keep cached profile
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PROFILE_CACHE_KEY);
    set({ isAuthenticated: false, accessToken: null, profile: null });
  },

  setDevSession: async () => {
    const profile: FamilyProfile = {
      user_id: 'dev_family_001',
      first_name: 'Dev',
      last_name: 'Aile',
      phone: null,
      email: 'dev@sinalytix.com',
      relationship: 'child',
      locale: 'tr',
      status: 'active',
      onboarding_completed_at: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(TOKEN_KEY, 'dev_access_token');
    await SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(profile));
    set({ isAuthenticated: true, isLoading: false, accessToken: 'dev_access_token', profile });
  },
}));
