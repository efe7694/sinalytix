import { create } from 'zustand';
import { coreApi } from '@/lib/api';

export interface LinkedPatient {
  patient_id: string;
  first_name: string;
  last_name: string;
  primary_condition: string | null;
  link_id: string;
  linked_at: string | null;
}

/** core-api /caregiver/my-patients + /caregiver-links/redeem shape. */
interface CaregiverLinkRow {
  link_id: string;
  patient_id: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  linked_at: string | null;
}

function toLinkedPatient(r: CaregiverLinkRow): LinkedPatient {
  return {
    patient_id: r.patient_id,
    first_name: r.first_name ?? '',
    last_name: r.last_name ?? '',
    primary_condition: null, // clinical data is a later CareTeam-phase concern (Faz 1: link only)
    link_id: r.link_id,
    linked_at: r.linked_at,
  };
}

interface PatientsState {
  patients: LinkedPatient[];
  selectedPatientId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchPatients: () => Promise<void>;
  selectPatient: (patientId: string) => void;
  selectedPatient: () => LinkedPatient | null;
  linkPatient: (linkCode: string) => Promise<LinkedPatient>;
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  selectedPatientId: null,
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const rows = await coreApi.get<CaregiverLinkRow[]>('/caregiver/my-patients');
      const patients = rows.map(toLinkedPatient);
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

  // Redeems a patient's caregiver code (Faz 1 Slice 4). Sends a JSON body
  // {code} — fixes the pre-existing legacy bug where the frontend sent a body
  // but the endpoint expected a query param. The server uppercases at lookup,
  // but the LINK_01 screen already uppercases too.
  linkPatient: async (linkCode) => {
    const linked = await coreApi.post<CaregiverLinkRow>('/caregiver-links/redeem', { code: linkCode });
    await get().fetchPatients();
    set({ selectedPatientId: linked.patient_id });
    return toLinkedPatient(linked);
  },
}));
