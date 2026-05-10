import { create } from 'zustand';
import { api } from '@/lib/api';

export interface LinkedPatient {
  patient_id: string;
  first_name: string;
  last_name: string;
  primary_condition: string | null;
  link_id: string;
  linked_at: string;
}

interface PatientsState {
  patients: LinkedPatient[];
  selectedPatientId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchPatients: () => Promise<void>;
  selectPatient: (patientId: string) => void;
  selectedPatient: () => LinkedPatient | null;
  linkPatient: (linkCode: string) => Promise<void>;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  selectedPatientId: null,
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const patients = await api.get<LinkedPatient[]>('/caregiver/patients');
      set({ patients });
      // Auto-select first patient if none selected
      if (!get().selectedPatientId && patients.length > 0) {
        set({ selectedPatientId: patients[0].patient_id });
      }
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  selectPatient: (patientId) => set({ selectedPatientId: patientId }),

  selectedPatient: () => {
    const { patients, selectedPatientId } = get();
    return patients.find((p) => p.patient_id === selectedPatientId) ?? null;
  },

  linkPatient: async (linkCode) => {
    await api.post('/caregiver/patients/link', { link_code: linkCode });
    await get().fetchPatients();
  },
}));
