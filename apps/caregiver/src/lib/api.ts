/**
 * Typed API clients for the Sinalytix backend.
 *
 * Two clients during the Faz 1+ migration (see DEVIATIONS.md — Faz 1 Slice 0):
 * - `api` — legacy Python backend (`services/api`), unchanged. Every screen
 *   still calls this until its own domain slice rewires it to `coreApi`.
 * - `coreApi` — new TS backend (`services/core-api`), Module 2 contract:
 *   `X-App-Context` (§1.3) + `Idempotency-Key` on mutating calls (§6.1) on
 *   every request, RFC 7807 error shape (§1.4).
 */

import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const APP_CONTEXT = 'caregiver';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:8000';
const CORE_API_BASE_URL = `${Constants.expoConfig?.extra?.coreApiUrl ?? 'http://localhost:8080'}/v1`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds?: number,
    public readonly body?: { detail?: string } & Record<string, unknown>,
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

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('caregiver_access_token');
}

function createClient(baseUrl: string, sendCoreApiHeaders: boolean) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const method = (options.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(sendCoreApiHeaders ? { 'X-App-Context': APP_CONTEXT } : {}),
      ...(sendCoreApiHeaders && MUTATING_METHODS.has(method) ? { 'Idempotency-Key': randomUuidV4() } : {}),
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const retryAfter = res.headers.get('Retry-After');
      throw new ApiError(res.status, body.detail ?? res.statusText, retryAfter ? Number(retryAfter) : undefined, body);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export const api = createClient(BASE_URL, false);
export const coreApi = createClient(CORE_API_BASE_URL, true);
