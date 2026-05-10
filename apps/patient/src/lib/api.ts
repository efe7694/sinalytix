/**
 * Typed API client for the Sinalytix backend.
 *
 * - Attaches Bearer token from auth store on every request
 * - On 401: attempts one token refresh, then retries
 * - On second 401: clears auth and throws ApiError(401)
 * - Callers receive typed responses or ApiError
 */

import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function doFetch(
  path: string,
  options: RequestInit,
  token: string | null,
  isFormData = false,
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      // FormData uploads must NOT set Content-Type — fetch sets it with the multipart boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

async function attemptRefresh(): Promise<boolean> {
  const { refreshToken, userId, setTokens } = useAuthStore.getState();
  if (!refreshToken || !userId) return false;

  try {
    const resp = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    await setTokens(data.access_token, data.refresh_token, userId);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, isFormData = false): Promise<T> {
  const store = useAuthStore.getState();
  let token = store.accessToken;

  let resp = await doFetch(path, options, token, isFormData);

  if (resp.status === 401) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      token = useAuthStore.getState().accessToken;
      resp = await doFetch(path, options, token, isFormData);
    }

    if (resp.status === 401) {
      await store.clearAuth();
      router.replace('/(auth)/login');
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!resp.ok) {
    const body: { detail?: string } = await resp.json().catch(() => ({}));
    throw new ApiError(resp.status, body.detail ?? 'Request failed');
  }

  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }, true),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
