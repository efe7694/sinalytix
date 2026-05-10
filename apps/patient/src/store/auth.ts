/**
 * Auth store — tokens, user identity, login/logout/delete.
 *
 * Tokens are persisted to SecureStore.
 * accessToken is kept in memory (Zustand state); refreshToken lives in SecureStore.
 * The API client reads accessToken via getState() — no React hook needed.
 */

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEYS = {
  ACCESS: 'auth_access_token',
  REFRESH: 'auth_refresh_token',
  USER_ID: 'auth_user_id',
} as const;

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: string | null;
}

interface AuthActions {
  /** Persist tokens after login/register. */
  setTokens(access: string, refresh: string, userId: string): Promise<void>;
  /** Load tokens from SecureStore on app launch (call once in _layout). */
  hydrate(): Promise<boolean>;
  /** Clear all auth state + SecureStore. Does NOT call the API. */
  clearAuth(): Promise<void>;
  /** Full logout: revoke refresh token on server + clear local state. */
  logout(baseUrl: string): Promise<void>;
  /** DEV ONLY — bypass auth without a real backend. */
  setDevSession(): Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,

  setTokens: async (access, refresh, userId) => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS, access),
      SecureStore.setItemAsync(KEYS.REFRESH, refresh),
      SecureStore.setItemAsync(KEYS.USER_ID, userId),
    ]);
    set({ accessToken: access, refreshToken: refresh, userId });
  },

  hydrate: async () => {
    const [access, refresh, userId] = await Promise.all([
      SecureStore.getItemAsync(KEYS.ACCESS),
      SecureStore.getItemAsync(KEYS.REFRESH),
      SecureStore.getItemAsync(KEYS.USER_ID),
    ]);
    if (refresh && userId) {
      set({ accessToken: access, refreshToken: refresh, userId });
      return true;
    }
    return false;
  },

  clearAuth: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS),
      SecureStore.deleteItemAsync(KEYS.REFRESH),
      SecureStore.deleteItemAsync(KEYS.USER_ID),
    ]);
    set({ accessToken: null, refreshToken: null, userId: null });
  },

  setDevSession: async () => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS, 'dev_access_token'),
      SecureStore.setItemAsync(KEYS.REFRESH, 'dev_refresh_token'),
      SecureStore.setItemAsync(KEYS.USER_ID, 'dev_user_001'),
      SecureStore.setItemAsync('onboarding_completed', 'true'),
    ]);
    set({
      accessToken: 'dev_access_token',
      refreshToken: 'dev_refresh_token',
      userId: 'dev_user_001',
    });
  },

  logout: async (baseUrl: string) => {
    const { refreshToken, accessToken, clearAuth } = get();
    try {
      await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refresh_token: refreshToken ?? '' }),
      });
    } catch {
      // Logout is best-effort — always clear local state
    }
    await clearAuth();
  },
}));
