/**
 * Typed API clients for the Sinalytix backend.
 *
 * Two clients during the Faz 1+ migration (see DEVIATIONS.md — Faz 1 Slice 0):
 * - `api` — legacy Python backend (`services/api`), unchanged. Every screen
 *   still calls this until its own domain slice rewires it to `coreApi`.
 * - `coreApi` — new TS backend (`services/core-api`), Module 2 contract:
 *   `X-App-Context` + `X-Idempotency-Key` on mutating calls (§1.2) +
 *   `Accept-Language`, and the canonical `{error:{code,message,...}}` shape
 *   (§1.3 — was RFC 7807 until DEVIATIONS D15/B1).
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
    /** Canonical wire code from core-api (Modül 2 §1.3), e.g.
     * `CONSENT_REQUIRED`. Branch on THIS, never on `message` — the message is
     * localized and will change wording. Undefined for legacy-backend calls. */
    public readonly code?: string,
    public readonly body?: { detail?: string } & Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The app's UI language. Sent as `Accept-Language` so core-api can localize
 * `error.message` (Modül 2 §1.2/§1.3) — before this, every error arrived in
 * Turkish regardless of the user. Hard-coded for now because the UI itself is
 * single-language; when a locale switcher lands this reads from it, and the
 * server side already handles en/fr/tr.
 */
const UI_LOCALE = 'tr';

/**
 * core-api's error envelope (Modül 2 §1.3):
 * `{ error: { code, message, details, request_id } }`. The legacy Python
 * backend returns `{ detail }` instead, so parsing branches on which client
 * this is — reading `message` off a legacy body (or `detail` off a core-api
 * one) silently produces "undefined" in the UI.
 *
 * `code` is what screens should branch on; `message` is display-only.
 */
function parseErrorBody(
  body: unknown,
  isCoreApi: boolean,
  fallback: string,
): { message: string; code?: string } {
  if (isCoreApi) {
    const envelope = body as { error?: { code?: string; message?: string } } | null;
    return { message: envelope?.error?.message ?? fallback, code: envelope?.error?.code };
  }
  return { message: (body as { detail?: string } | null)?.detail ?? fallback };
}

/** X-Idempotency-Key is a client-chosen correlation token (Modül 2 §1.2),
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
      ...(sendCoreApiHeaders ? { 'X-App-Context': APP_CONTEXT, 'Accept-Language': UI_LOCALE } : {}),
      ...(sendCoreApiHeaders && MUTATING_METHODS.has(method) ? { 'X-Idempotency-Key': randomUuidV4() } : {}),
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const retryAfter = res.headers.get('Retry-After');
      const { message, code } = parseErrorBody(body, sendCoreApiHeaders, res.statusText);
      throw new ApiError(res.status, message, retryAfter ? Number(retryAfter) : undefined, code, body);
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
