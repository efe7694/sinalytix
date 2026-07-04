/**
 * Typed API clients for the Sinalytix backend.
 *
 * Two clients during the Faz 1+ migration (see DEVIATIONS.md — Faz 1 Slice 0):
 * - `api` — legacy Python backend (`services/api`), unchanged. Every screen
 *   still calls this until its own domain slice rewires it to `coreApi`.
 * - `coreApi` — new TS backend (`services/core-api`), Module 2 contract:
 *   `X-App-Context` (§1.3) + `Idempotency-Key` on mutating calls (§6.1) on
 *   every request, RFC 7807 error shape (§1.4).
 *
 * Both share the same 401-refresh-and-retry logic and `ApiError` shape.
 */

import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth';

const APP_CONTEXT = 'patient';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
export const CORE_API_BASE_URL = `${process.env.EXPO_PUBLIC_CORE_API_URL ?? 'http://localhost:8080'}/v1`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Idempotency-Key is a client-chosen correlation token (Module 2 §6.1),
 * not a secret — Math.random() is adequate, no crypto dependency needed. */
function randomUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

interface ClientConfig {
  baseUrl: string;
  /** core-api requires X-App-Context + Idempotency-Key; the legacy backend
   * doesn't read either, so this is off for the `api` client. */
  sendCoreApiHeaders: boolean;
  refreshPath: string;
}

function createClient(config: ClientConfig) {
  async function doFetch(path: string, options: RequestInit, token: string | null, isFormData = false): Promise<Response> {
    const method = (options.method ?? 'GET').toUpperCase();
    return fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        // FormData uploads must NOT set Content-Type — fetch sets it with the multipart boundary
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(config.sendCoreApiHeaders ? { 'X-App-Context': APP_CONTEXT } : {}),
        ...(config.sendCoreApiHeaders && MUTATING_METHODS.has(method) ? { 'Idempotency-Key': randomUuidV4() } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  async function attemptRefresh(): Promise<boolean> {
    const { refreshToken, userId, setTokens } = useAuthStore.getState();
    if (!refreshToken || !userId) return false;

    try {
      const resp = await fetch(`${config.baseUrl}${config.refreshPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.sendCoreApiHeaders ? { 'X-App-Context': APP_CONTEXT } : {}),
        },
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
      const retryAfter = resp.headers.get('Retry-After');
      throw new ApiError(resp.status, body.detail ?? 'Request failed', retryAfter ? Number(retryAfter) : undefined);
    }

    if (resp.status === 204) return undefined as T;
    return resp.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    upload: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }, true),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export const api = createClient({ baseUrl: BASE_URL, sendCoreApiHeaders: false, refreshPath: '/api/v1/auth/refresh' });
export const coreApi = createClient({ baseUrl: CORE_API_BASE_URL, sendCoreApiHeaders: true, refreshPath: '/auth/refresh' });
