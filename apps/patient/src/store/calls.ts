import { api, ApiError } from '@/lib/api';
import { create } from 'zustand';

export interface CallAvailability {
  caregiver_available: boolean;
  caregiver_phone: string | null;
  caregiver_name: string | null;
  family_available: boolean;
  family_phone: string | null;
  family_name: string | null;
  ec_primary: { ec_id: string; phone: string; name: string } | null;
}

export interface LogCallInput {
  call_type: 'sos' | 'regular';
  target_type: 'family' | 'caregiver' | 'emergency_services';
  target_id?: string;
  status: 'initiated' | 'cancelled' | 'completed';
  cancel_stage?: 'pre_family_10s' | 'pre_911_30s' | 'regular_modal_timeout' | 'regular_user_cancelled';
}

interface CallsState {
  availability: CallAvailability | null;
  loading: boolean;
  error: string | null;
}

interface CallsActions {
  loadAvailability(): Promise<void>;
  logCall(input: LogCallInput): Promise<void>;
}

export const useCallsStore = create<CallsState & CallsActions>((set) => ({
  availability: null,
  loading: false,
  error: null,

  loadAvailability: async () => {
    set({ loading: true, error: null });
    try {
      const availability = await api.get<CallAvailability>('/api/v1/calls/availability');
      set({ availability, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof ApiError ? err.message : 'Müsaitlik durumu alınamadı.',
      });
    }
  },

  logCall: async (input) => {
    try {
      await api.post('/api/v1/calls/log', input);
    } catch {
      // Logging is best-effort; never block the call flow on failure
    }
  },
}));
