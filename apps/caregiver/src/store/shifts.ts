import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Shift {
  shift_id: string;
  caregiver_id: string;
  patient_id: string;
  shift_active: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  check_out_reason: string | null;
  shift_note: string | null;
  duration_minutes: number | null;
  timezone_iana: string | null;
  alert_24h_sent: boolean;
}

interface ShiftHistoryItem {
  shift_id: string;
  patient_id: string;
  patient_name: string;
  checked_in_at: string;
  checked_out_at: string | null;
  duration_minutes: number | null;
  shift_note: string | null;
}

interface ShiftsState {
  activeShift: Shift | null;
  history: ShiftHistoryItem[];
  isLoading: boolean;
  error: string | null;

  fetchActiveShift: () => Promise<void>;
  checkIn: (patientId: string, timezoneIana?: string) => Promise<void>;
  checkOut: (note?: string) => Promise<void>;
  switchPatient: (patientId: string, timezoneIana?: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  elapsedSeconds: () => number;
}

export const useShiftsStore = create<ShiftsState>((set, get) => ({
  activeShift: null,
  history: [],
  isLoading: false,
  error: null,

  fetchActiveShift: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ has_active_shift: boolean; active_shift: Shift | null }>(
        '/shifts/active',
      );
      set({ activeShift: res.active_shift });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  checkIn: async (patientId, timezoneIana = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await api.post<Shift>('/shifts/checkin', {
        patient_id: patientId,
        timezone_iana: timezoneIana,
      });
      set({ activeShift: shift });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  checkOut: async (note) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await api.post<Shift>('/shifts/checkout', { shift_note: note ?? null });
      set({ activeShift: null });
      // Prepend to history
      if (shift) {
        set((s) => ({
          history: [
            {
              shift_id: shift.shift_id,
              patient_id: shift.patient_id,
              patient_name: '',
              checked_in_at: shift.checked_in_at!,
              checked_out_at: shift.checked_out_at,
              duration_minutes: shift.duration_minutes,
              shift_note: shift.shift_note,
            },
            ...s.history,
          ],
        }));
      }
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  switchPatient: async (patientId, timezoneIana = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await api.post<Shift>('/shifts/switch', {
        patient_id: patientId,
        timezone_iana: timezoneIana,
      });
      set({ activeShift: shift });
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHistory: async () => {
    try {
      const history = await api.get<ShiftHistoryItem[]>('/shifts/history');
      set({ history });
    } catch {
      // non-fatal
    }
  },

  elapsedSeconds: () => {
    const shift = get().activeShift;
    if (!shift?.checked_in_at) return 0;
    return Math.floor((Date.now() - new Date(shift.checked_in_at).getTime()) / 1000);
  },
}));
