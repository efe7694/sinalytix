import { api, ApiError, coreApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { create } from 'zustand';

export interface EmergencyContact {
  ec_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
  phone_verified: boolean;
  sort_order: number;
  invite_status: 'pending' | 'accepted_app_user' | 'accepted_phone_only';
}

export interface CreateECInput {
  first_name: string;
  last_name: string;
  relationship: string;
  phone: string;
}

export interface CaregiverLink {
  link_id: string;
  link_code: string;
  qr_payload: string;
  expires_at: string;
  status: 'pending' | 'linked' | 'expired' | 'unlinked';
  caregiver_name?: string | null;
}

export interface FamilyConnection {
  connection_id: string;
  family_user_id: string;
  family_name: string;
  relationship: string;
  connected_at: string;
}

export interface UserPreferences {
  wakeword_enabled: boolean;
  sos_audio_enabled: boolean;
}

interface PrivacyState {
  emergencyContacts: EmergencyContact[];
  caregiverLink: CaregiverLink | null;
  familyConnections: FamilyConnection[];
  preferences: UserPreferences;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** ec_id currently mid phone-verify (request or confirm in flight). */
  verifyingEcId: string | null;
  verifyError: string | null;
  /** Set from ApiError.retryAfterSeconds on a 429 — lets the UI show a countdown. */
  verifyRetryAfterSeconds: number | null;
}

interface PrivacyActions {
  loadPrivacyData(): Promise<void>;
  addEmergencyContact(input: CreateECInput): Promise<void>;
  removeEmergencyContact(ecId: string): Promise<void>;
  reorderEmergencyContacts(orderedIds: string[]): Promise<void>;
  requestPhoneVerification(ecId: string): Promise<void>;
  confirmPhoneVerification(ecId: string, code: string): Promise<void>;
  cancelPhoneVerification(): void;
  inviteEmergencyContact(ecId: string): Promise<{ code: string; expires_at: string }>;
  generateCaregiverCode(): Promise<void>;
  unlinkCaregiver(): Promise<void>;
  disconnectFamily(connectionId: string): Promise<void>;
  updatePreferences(patch: Partial<UserPreferences>): Promise<void>;
}

function patientId(): string {
  const { userId } = useAuthStore.getState();
  if (!userId) throw new Error('patientId() called with no authenticated user');
  return userId;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  wakeword_enabled: false,
  sos_audio_enabled: true,
};

export const usePrivacyStore = create<PrivacyState & PrivacyActions>((set, get) => ({
  emergencyContacts: [],
  caregiverLink: null,
  familyConnections: [],
  preferences: DEFAULT_PREFERENCES,
  loading: false,
  saving: false,
  error: null,
  verifyingEcId: null,
  verifyError: null,
  verifyRetryAfterSeconds: null,

  loadPrivacyData: async () => {
    set({ loading: true, error: null });

    const [ecResult, linkResult, familyResult, prefsResult] = await Promise.allSettled([
      coreApi.get<EmergencyContact[]>(`/patients/${patientId()}/emergency-contacts`),
      api.get<CaregiverLink | null>('/api/v1/caregiver/link'),
      api.get<FamilyConnection[]>('/api/v1/family-connections'),
      api.get<UserPreferences>('/api/v1/users/me/preferences'),
    ]);

    const next: Partial<PrivacyState> = { loading: false };

    if (ecResult.status === 'fulfilled') {
      next.emergencyContacts = ecResult.value;
    } else {
      console.error('[privacy] emergency-contacts failed:', ecResult.reason);
    }

    if (linkResult.status === 'fulfilled') {
      next.caregiverLink = linkResult.value;
    } else {
      console.error('[privacy] caregiver/link failed:', linkResult.reason);
    }

    if (familyResult.status === 'fulfilled') {
      next.familyConnections = familyResult.value;
    } else {
      console.error('[privacy] family-connections failed:', familyResult.reason);
    }

    if (prefsResult.status === 'fulfilled') {
      next.preferences = prefsResult.value;
    } else {
      console.error('[privacy] preferences failed:', prefsResult.reason);
    }

    set(next);
  },

  addEmergencyContact: async (input) => {
    set({ saving: true, error: null });
    try {
      const created = await coreApi.post<EmergencyContact>(`/patients/${patientId()}/emergency-contacts`, input);
      set((s) => ({
        emergencyContacts: [...s.emergencyContacts, created],
        saving: false,
      }));
    } catch (err) {
      set({
        saving: false,
        error: err instanceof ApiError ? err.message : 'Acil kişi eklenemedi.',
      });
      throw err;
    }
  },

  removeEmergencyContact: async (ecId) => {
    const previous = get().emergencyContacts;
    set((s) => ({
      emergencyContacts: s.emergencyContacts.filter((ec) => ec.ec_id !== ecId),
    }));

    try {
      await coreApi.delete(`/emergency-contacts/${ecId}`);
    } catch (err) {
      set({ emergencyContacts: previous });
      throw err;
    }
  },

  reorderEmergencyContacts: async (orderedIds) => {
    const previous = get().emergencyContacts;
    set((s) => ({
      emergencyContacts: s.emergencyContacts
        .map((ec) => {
          const idx = orderedIds.indexOf(ec.ec_id);
          return idx !== -1 ? { ...ec, sort_order: idx + 1 } : ec;
        })
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    try {
      await coreApi.post(`/patients/${patientId()}/emergency-contacts/reorder`, { ordered_ids: orderedIds });
    } catch (err) {
      set({ emergencyContacts: previous });
      throw err;
    }
  },

  requestPhoneVerification: async (ecId) => {
    set({ verifyingEcId: ecId, verifyError: null, verifyRetryAfterSeconds: null });
    try {
      await coreApi.post(`/emergency-contacts/${ecId}/verify-phone`, { action: 'request_code' });
    } catch (err) {
      // Guard against a late failure for a contact the user has since
      // switched away from (or closed the modal for) overwriting the
      // currently-open modal's error state.
      if (get().verifyingEcId === ecId) {
        set({
          verifyError: err instanceof ApiError ? err.message : 'Kod gönderilemedi.',
          verifyRetryAfterSeconds: err instanceof ApiError ? (err.retryAfterSeconds ?? null) : null,
        });
      }
      throw err;
    }
  },

  confirmPhoneVerification: async (ecId, code) => {
    set({ verifyError: null, verifyRetryAfterSeconds: null });
    try {
      const updated = await coreApi.post<EmergencyContact>(`/emergency-contacts/${ecId}/verify-phone`, {
        action: 'verify_code',
        code,
      });
      set((s) => ({
        emergencyContacts: s.emergencyContacts.map((ec) => (ec.ec_id === ecId ? updated : ec)),
        // Only close the modal if it's still open for this same contact —
        // a late success for a contact the user switched away from must not
        // force-close whichever modal is open now.
        verifyingEcId: s.verifyingEcId === ecId ? null : s.verifyingEcId,
      }));
    } catch (err) {
      if (get().verifyingEcId === ecId) {
        set({
          verifyError: err instanceof ApiError ? err.message : 'Kod hatalı.',
          verifyRetryAfterSeconds: err instanceof ApiError ? (err.retryAfterSeconds ?? null) : null,
        });
      }
      throw err;
    }
  },

  cancelPhoneVerification: () => {
    set({ verifyingEcId: null, verifyError: null, verifyRetryAfterSeconds: null });
  },

  // Generates a family-invite code for an existing emergency contact
  // (Faz 1 Slice 3 ec_invite path). Returns the 6-digit code for the patient
  // to hand to that contact, who redeems it in the Family app to link
  // instantly (no separate patient-confirm step, unlike a generic code).
  inviteEmergencyContact: async (ecId) => {
    const invite = await coreApi.post<{ code: string; expires_at: string }>(
      `/emergency-contacts/${ecId}/invite`,
      {},
    );
    return { code: invite.code, expires_at: invite.expires_at };
  },

  generateCaregiverCode: async () => {
    set({ saving: true, error: null });
    try {
      // Faz 1 Slice 4 → core-api. Response is {link_id, code, qr_payload,
      // expires_at}; map to the screen's CaregiverLink shape (a freshly
      // generated code is always 'pending' with no caregiver attached yet).
      const res = await coreApi.post<{ link_id: string; code: string; qr_payload: string; expires_at: string }>(
        `/patients/${patientId()}/caregiver-links`,
        {},
      );
      set({
        caregiverLink: {
          link_id: res.link_id,
          link_code: res.code,
          qr_payload: res.qr_payload,
          expires_at: res.expires_at,
          status: 'pending',
          caregiver_name: null,
        },
        saving: false,
      });
    } catch (err) {
      set({
        saving: false,
        error: err instanceof ApiError ? err.message : 'Bakıcı kodu oluşturulamadı.',
      });
      throw err;
    }
  },

  unlinkCaregiver: async () => {
    const previous = get().caregiverLink;
    if (previous) {
      set((s) =>
        s.caregiverLink ? { caregiverLink: { ...s.caregiverLink!, status: 'unlinked' } } : {},
      );
    }

    try {
      await api.post('/api/v1/caregiver/link/unlink', {});
    } catch (err) {
      set({ caregiverLink: previous });
      throw err;
    }
  },

  disconnectFamily: async (connectionId) => {
    const previous = get().familyConnections;
    set((s) => ({
      familyConnections: s.familyConnections.filter((fc) => fc.connection_id !== connectionId),
    }));

    try {
      await api.post(`/api/v1/family-connections/${connectionId}/disconnect`, {});
    } catch (err) {
      set({ familyConnections: previous });
      throw err;
    }
  },

  updatePreferences: async (patch) => {
    const previous = get().preferences;
    const merged: UserPreferences = { ...previous, ...patch };
    set({ preferences: merged });

    try {
      const updated = await api.post<UserPreferences>('/api/v1/users/me/preferences', merged);
      set({ preferences: updated });
    } catch (err) {
      set({ preferences: previous });
      throw err;
    }
  },
}));
