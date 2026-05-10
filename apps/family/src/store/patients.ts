import { create } from 'zustand';
import { api } from '@/lib/api';

export interface LinkedPatient {
  patient_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  permission_level: 'view' | 'edit' | 'full';
  linked_at: string;
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

  fetchPatients: async () => {
    set({ isLoading: true });
    try {
      const patients = await api.get<LinkedPatient[]>('/family/patients');
      set({ patients });
      if (!get().selectedPatientId && patients.length > 0) {
        set({ selectedPatientId: patients[0].patient_id });
      }
    } catch {
      // offline — keep cached
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
