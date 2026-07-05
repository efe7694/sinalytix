import { create } from 'zustand';
import { api, coreApi } from '@/lib/api';

export interface LinkedPatient {
  patient_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  permission_level: 'view' | 'edit' | 'full';
  linked_at: string | null;
}

export interface SOSEvent {
  event_id: string;
  patient_id: string;
  created_at: string;
  status: 'active' | 'resolved';
}

interface PatientsState {
  patients: LinkedPatient[];
  selectedPatientId: string | null;
  activeSOS: SOSEvent | null;
  isLoading: boolean;

  fetchPatients: () => Promise<void>;
  selectPatient: (id: string) => void;
  fetchActiveSOS: (patientId: string) => Promise<void>;
  dismissSOS: () => void;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  selectedPatientId: null,
  activeSOS: null,
  isLoading: false,

  // The caller-scoped "my linked patients" roster (Faz 1 Slice 3) — returns
  // only active links for the authenticated family member, each joined with
  // the patient's display name (via core-api's cross-actor patient_profiles
  // read policy). Pending (unconfirmed) links are deliberately excluded until
  // the patient confirms.
  fetchPatients: async () => {
    set({ isLoading: true });
    try {
      const rows = await coreApi.get<LinkedPatient[]>('/family/my-links');
      const patients = rows.map((r) => ({ ...r, first_name: r.first_name ?? '', last_name: r.last_name ?? '' }));
      set({ patients });
      if (!get().selectedPatientId && patients.length > 0) {
        set({ selectedPatientId: patients[0].patient_id });
      }
    } catch {
      // offline or not-yet-linked — keep cached
    } finally {
      set({ isLoading: false });
    }
  },

  selectPatient: (id) => set({ selectedPatientId: id }),

  fetchActiveSOS: async (patientId) => {
    try {
      const sos = await api.get<SOSEvent | null>(`/family/patients/${patientId}/sos/active`);
      set({ activeSOS: sos });
    } catch {
      // ignore
    }
  },

  dismissSOS: () => set({ activeSOS: null }),
}));
