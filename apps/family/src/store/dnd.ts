import { create } from 'zustand';
import { api } from '@/lib/api';

interface DndState {
  dnd: boolean;
  isUpdating: boolean;

  fetchDnd: (patientId: string) => Promise<void>;
  toggleDnd: (patientId: string) => Promise<void>;
}

export const useDndStore = create<DndState>((set, get) => ({
  dnd: false,
  isUpdating: false,

  fetchDnd: async (patientId) => {
    try {
      const data = await api.get<{ dnd: boolean }>(`/family/availability/${patientId}`);
      set({ dnd: data.dnd });
    } catch {
      // ignore
    }
  },

  toggleDnd: async (patientId) => {
    const newDnd = !get().dnd;
    set({ dnd: newDnd, isUpdating: true });
    try {
      await api.post(`/family/availability/${patientId}`, { dnd: newDnd });
    } catch {
      set({ dnd: !newDnd }); // rollback on error
    } finally {
      set({ isUpdating: false });
    }
  },
}));
