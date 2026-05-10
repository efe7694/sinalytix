/**
 * Task store for caregiver app.
 * Reuses the same backend task endpoints as the patient app,
 * scoped to the selected patient context.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

// Aligned to backend TodayTaskOut schema
export interface TaskOccurrence {
  occurrence_id: string;
  task_id: string;
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype: 'standard' | 'medication';
  status: 'todo' | 'done' | 'skipped';
  time_of_day_local: string | null;
  target_per_day: number | null;
  progress_count: number | null;
  created_by_actor_type: string;
  date_local: string;
}

interface UndoEntry {
  occurrenceId: string;
  previousStatus: TaskOccurrence['status'];
  previousCounter: number | null;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface TasksState {
  tasks: TaskOccurrence[];
  isLoading: boolean;
  error: string | null;
  pendingUndo: UndoEntry | null;

  fetchTodayTasks: (patientId: string) => Promise<void>;
  createTask: (patientId: string, payload: CreateTaskPayload) => Promise<void>;
  completeTask: (occurrenceId: string, patientId: string) => Promise<void>;
  incrementCounter: (occurrenceId: string, patientId: string) => Promise<void>;
  skipTask: (occurrenceId: string, patientId: string) => Promise<void>;
  undoLast: () => Promise<void>;
  dismissUndo: () => void;
}

const UNDO_WINDOW_MS = 5000;

export interface CreateTaskPayload {
  title: string;
  type: 'one_time' | 'recurring' | 'counter';
  subtype: 'standard' | 'medication';
  target_per_day?: number;
  frequency?: 'daily' | 'weekly';
  days_of_week?: string[];
  due_date_local?: string;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  pendingUndo: null,

  fetchTodayTasks: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tasks = await api.get<TaskOccurrence[]>(
        `/tasks/occurrences?patient_id=${patientId}&date=${today}`,
      );
      set({ tasks });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (patientId, payload) => {
    await api.post('/tasks', { ...payload, patient_id: patientId, actor: 'caregiver' });
    await get().fetchTodayTasks(patientId);
  },

  completeTask: async (occurrenceId, patientId) => {
    const prev = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!prev) return;

    // Optimistic update
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.occurrence_id === occurrenceId ? { ...t, status: 'done' } : t,
      ),
    }));

    // Clear previous undo
    get().dismissUndo();

    const timeoutId = setTimeout(async () => {
      try {
        await api.post(`/tasks/occurrences/${occurrenceId}/complete`, {
          patient_id: patientId,
          actor: 'caregiver',
        });
      } catch {
        // revert on failure
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.occurrence_id === occurrenceId ? { ...t, status: prev.status } : t,
          ),
        }));
      }
      set({ pendingUndo: null });
    }, UNDO_WINDOW_MS);

    set({
      pendingUndo: {
        occurrenceId,
        previousStatus: prev.status,
        previousCounter: prev.progress_count,
        timeoutId,
      },
    });
  },

  incrementCounter: async (occurrenceId, patientId) => {
    const task = get().tasks.find((t) => t.occurrence_id === occurrenceId);
    if (!task) return;
    const newCount = (task.progress_count ?? 0) + 1;
    const isDone = task.target_per_day !== null && newCount >= task.target_per_day;

    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.occurrence_id === occurrenceId
          ? { ...t, progress_count: newCount, status: isDone ? 'done' : t.status }
          : t,
      ),
    }));

    get().dismissUndo();
    const timeoutId = setTimeout(async () => {
      try {
        await api.post(`/tasks/occurrences/${occurrenceId}/increment`, {
          patient_id: patientId,
          actor: 'caregiver',
        });
      } catch {
        // revert
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.occurrence_id === occurrenceId
              ? { ...t, progress_count: task.progress_count, status: task.status }
              : t,
          ),
        }));
      }
      set({ pendingUndo: null });
    }, UNDO_WINDOW_MS);

    set({
      pendingUndo: {
        occurrenceId,
        previousStatus: task.status,
        previousCounter: task.progress_count,
        timeoutId,
      },
    });
  },

  skipTask: async (occurrenceId, patientId) => {
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.occurrence_id === occurrenceId ? { ...t, status: 'skipped' } : t,
      ),
    }));
    try {
      await api.post(`/tasks/occurrences/${occurrenceId}/skip`, {
        patient_id: patientId,
        actor: 'caregiver',
      });
    } catch {
      // revert
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.occurrence_id === occurrenceId ? { ...t, status: 'todo' } : t,
        ),
      }));
    }
  },

  undoLast: async () => {
    const undo = get().pendingUndo;
    if (!undo) return;
    clearTimeout(undo.timeoutId);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.occurrence_id === undo.occurrenceId
          ? { ...t, status: undo.previousStatus, progress_count: undo.previousCounter }
          : t,
      ),
      pendingUndo: null,
    }));
  },

  dismissUndo: () => {
    const undo = get().pendingUndo;
    if (undo) clearTimeout(undo.timeoutId);
    set({ pendingUndo: null });
  },
}));
