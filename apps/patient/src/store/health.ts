import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export interface HealthProfile {
  profile_id: string;
  conditions: string[];
  allergies: string[];
  allergy_notes: string | null;
  declared_confidence: 'high' | 'medium' | 'low' | null;
}

export interface MedicationRecord {
  medication_id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  start_date: string | null;
  status: 'active' | 'discontinued' | 'archived';
  data_source: 'manual' | 'ocr_extracted' | 'integrated_portal';
}

export interface CreateMedicationInput {
  name: string;
  dose?: string;
  frequency?: string;
  start_date?: string;
}

interface HealthState {
  profile: HealthProfile | null;
  medications: MedicationRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

interface HealthActions {
  loadHealthProfile(): Promise<void>;
  updateConditions(conditionIds: string[]): Promise<void>;
  updateAllergies(allergyIds: string[], notes: string | null): Promise<void>;
  addMedication(input: CreateMedicationInput): Promise<void>;
  archiveMedication(medicationId: string): Promise<void>;
  activeMedications(): MedicationRecord[];
}

export const useHealthStore = create<HealthState & HealthActions>((set, get) => ({
  profile: null,
  medications: [],
  loading: false,
  saving: false,
  error: null,

  loadHealthProfile: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ profile: HealthProfile; medications: MedicationRecord[] }>(
        '/api/v1/health-profile',
      );
      set({ profile: data.profile, medications: data.medications, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof ApiError ? err.message : 'Sağlık profili yüklenemedi.',
      });
    }
  },

  updateConditions: async (conditionIds) => {
    const prev = get().profile;
    if (prev) {
      set({ profile: { ...prev, conditions: conditionIds } });
    }
    set({ saving: true, error: null });
    try {
      const updated = await api.post<HealthProfile>('/api/v1/health-profile/conditions', {
        conditions: conditionIds,
      });
      set({ profile: updated, saving: false });
    } catch (err) {
      if (prev) {
        set({ profile: prev });
      }
      set({
        saving: false,
        error: err instanceof ApiError ? err.message : 'Koşullar güncellenemedi.',
      });
    }
  },

  updateAllergies: async (allergyIds, notes) => {
    const prev = get().profile;
    if (prev) {
      set({ profile: { ...prev, allergies: allergyIds, allergy_notes: notes } });
    }
    set({ saving: true, error: null });
    try {
      const updated = await api.post<HealthProfile>('/api/v1/health-profile/allergies', {
        allergies: allergyIds,
        allergy_notes: notes,
      });
      set({ profile: updated, saving: false });
    } catch (err) {
      if (prev) {
        set({ profile: prev });
      }
      set({
        saving: false,
        error: err instanceof ApiError ? err.message : 'Alerjiler güncellenemedi.',
      });
    }
  },

  addMedication: async (input) => {
    set({ saving: true, error: null });
    try {
      const medication = await api.post<MedicationRecord>(
        '/api/v1/health-profile/medications',
        input,
      );
      set((s) => ({ medications: [...s.medications, medication], saving: false }));
    } catch (err) {
      set({
        saving: false,
        error: err instanceof ApiError ? err.message : 'İlaç eklenemedi.',
      });
    }
  },

  archiveMedication: async (medicationId) => {
    const prev = get().medications;
    set((s) => ({
      medications: s.medications.map((m) =>
        m.medication_id === medicationId ? { ...m, status: 'archived' } : m,
      ),
    }));
    set({ saving: true, error: null });
    try {
      const updated = await api.post<MedicationRecord>(
        `/api/v1/health-profile/medications/${medicationId}/archive`,
        {},
      );
      set((s) => ({
        medications: s.medications.map((m) =>
          m.medication_id === medicationId ? updated : m,
        ),
        saving: false,
      }));
    } catch (err) {
      set({
        medications: prev,
        saving: false,
        error: err instanceof ApiError ? err.message : 'İlaç arşivlenemedi.',
      });
    }
  },

  activeMedications: () => get().medications.filter((m) => m.status === 'active'),
}));
